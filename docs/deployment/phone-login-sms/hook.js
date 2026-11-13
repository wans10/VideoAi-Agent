'use strict';

/**
 * Keyvo SMS hook: Supabase Auth (GoTrue) "Send SMS" HTTP hook -> Alibaba Cloud SMS (Dysmsapi SendSms).
 *
 * GoTrue calls POST /send-sms with a Standard Webhooks signed body:
 *   { "user": { "id": "...", "phone": "8613812345678", ... }, "sms": { "otp": "123456" } }
 * On success the hook answers 200 {}. On failure it answers 200 with the Supabase hook error object
 *   { "error": { "http_code": 429, "message": "..." } }
 * because GoTrue only forwards http_code/message from a 200 response (other statuses become a generic 500).
 *
 * Configuration comes from process.env only (see README.md). Secrets and full phone numbers are never logged.
 */

const http = require('node:http');

const MAX_BODY_BYTES = 16 * 1024;
const ALIYUN_TIMEOUT_MS = 5000;

function intFromEnv(env, name, fallback) {
  const value = Number.parseInt(env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readConfig(env = process.env) {
  return {
    port: intFromEnv(env, 'PORT', 8787),
    host: env.HOST || '0.0.0.0',
    accessKeyId: env.ALI_AK || '',
    accessKeySecret: env.ALI_SK || '',
    signName: env.ALI_SIGN || '',
    templateCode: env.ALI_TPL || '',
    endpoint: env.ALI_SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
    hookSecret: env.HOOK_SECRET || '',
    limits: {
      phoneCooldownMs: intFromEnv(env, 'LIMIT_PHONE_COOLDOWN_SECONDS', 60) * 1000,
      phonePerHour: intFromEnv(env, 'LIMIT_PHONE_PER_HOUR', 5),
      phonePerDay: intFromEnv(env, 'LIMIT_PHONE_PER_DAY', 10),
      ipPerHour: intFromEnv(env, 'LIMIT_IP_PER_HOUR', 20),
      globalPerHour: intFromEnv(env, 'LIMIT_GLOBAL_PER_HOUR', 300),
    },
  };
}

function missingConfig(config) {
  return [
    ['ALI_AK', config.accessKeyId],
    ['ALI_SK', config.accessKeySecret],
    ['ALI_SIGN', config.signName],
    ['ALI_TPL', config.templateCode],
    ['HOOK_SECRET', config.hookSecret],
  ].filter(([, value]) => !value).map(([name]) => name);
}

/**
 * GoTrue stores E.164 digits without "+": a mainland number arrives as 8613812345678. The country code is
 * required, because a bare 11-digit value such as 14155550100 is a US number in E.164.
 * Returns the 11-digit local number Alibaba expects, or null.
 */
function normalizeMainlandPhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s-]/g, '').replace(/^\+/, '').replace(/^00/, '');
  const match = /^86(1[3-9]\d{9})$/.exec(digits);
  return match ? match[1] : null;
}

function maskPhone(raw) {
  const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
  if (digits.length < 7) return '***';
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

function log(level, message, fields = {}) {
  // One JSON line per event; fields are chosen by the caller and never include secrets, codes or full numbers.
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

/** Sliding-window counters kept in memory (one container; counters reset on restart). */
function createRateLimiter(limits, now = () => Date.now()) {
  const events = new Map(); // key -> timestamps (ms)
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  function recent(key, windowMs) {
    const list = events.get(key) ?? [];
    const cutoff = now() - windowMs;
    return list.filter((t) => t > cutoff);
  }

  function prune() {
    const cutoff = now() - DAY;
    for (const [key, list] of events) {
      const kept = list.filter((t) => t > cutoff);
      if (kept.length) events.set(key, kept);
      else events.delete(key);
    }
  }

  return {
    /** Returns null when allowed (and records the attempt) or the reason when refused. */
    take(phone, ip) {
      const t = now();
      const phoneKey = `phone:${phone}`;
      const phoneDay = recent(phoneKey, DAY);
      if (phoneDay.length && t - phoneDay[phoneDay.length - 1] < limits.phoneCooldownMs) return 'phone_cooldown';
      if (phoneDay.filter((x) => x > t - HOUR).length >= limits.phonePerHour) return 'phone_hourly';
      if (phoneDay.length >= limits.phonePerDay) return 'phone_daily';
      const ipKey = ip ? `ip:${ip}` : null;
      if (ipKey && recent(ipKey, HOUR).length >= limits.ipPerHour) return 'ip_hourly';
      if (recent('global', HOUR).length >= limits.globalPerHour) return 'global_hourly';
      events.set(phoneKey, [...phoneDay, t]);
      if (ipKey) events.set(ipKey, [...recent(ipKey, HOUR), t]);
      events.set('global', [...recent('global', HOUR), t]);
      if (events.size > 50_000) prune();
      return null;
    },
    prune,
    size: () => events.size,
  };
}

/** Standard Webhooks verification with the GoTrue secret "v1,whsec_<base64>". */
function createVerifier(hookSecret) {
  const { Webhook } = require('standardwebhooks');
  const webhook = new Webhook(hookSecret.replace(/^v1,/, ''));
  return (payload, headers) => webhook.verify(payload, {
    'webhook-id': String(headers['webhook-id'] ?? ''),
    'webhook-timestamp': String(headers['webhook-timestamp'] ?? ''),
    'webhook-signature': String(headers['webhook-signature'] ?? ''),
  });
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error('Alibaba Cloud SMS timed out'), { code: 'Timeout' })), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Alibaba Cloud SMS sender; returns { ok, code, requestId } and never throws for API-level failures. */
function createAliyunSender(config) {
  const Dysmsapi = require('@alicloud/dysmsapi20170525');
  const OpenApi = require('@alicloud/openapi-client');
  const client = new Dysmsapi.default(new OpenApi.Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    endpoint: config.endpoint,
    connectTimeout: 3000,
    readTimeout: ALIYUN_TIMEOUT_MS,
  }));
  return async (phone, otp) => {
    const request = new Dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName: config.signName,
      templateCode: config.templateCode,
      templateParam: JSON.stringify({ code: otp }),
    });
    const response = await withTimeout(client.sendSms(request), ALIYUN_TIMEOUT_MS);
    const body = response?.body ?? {};
    return { ok: body.code === 'OK', code: body.code || 'Unknown', requestId: body.requestId || null };
  };
}

/** Maps an Alibaba result code to the Supabase hook error returned to the browser. */
function hookErrorForAliyunCode(code) {
  if (code === 'isv.BUSINESS_LIMIT_CONTROL' || code === 'Throttling.User' || code === 'isv.DAY_LIMIT_CONTROL') {
    return { http_code: 429, message: 'Too many SMS requests for this number. Please try again later.' };
  }
  if (code === 'isv.MOBILE_NUMBER_ILLEGAL' || code === 'isv.MOBILE_COUNT_OVER_LIMIT') {
    return { http_code: 400, message: 'Invalid phone number.' };
  }
  return { http_code: 503, message: 'SMS provider unavailable. Please try again later.' };
}

function clientIp(headers) {
  // GoTrue does not forward the end user's address to hooks today; this only applies if a proxy adds it.
  const forwarded = headers['x-forwarded-for'];
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  const real = typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'].trim() : '';
  return first || real || null;
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) });
  res.end(payload);
}

function hookError(res, httpCode, message) {
  sendJson(res, 200, { error: { http_code: httpCode, message } });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const declared = Number.parseInt(req.headers['content-length'] ?? '', 10);
    if (Number.isFinite(declared) && declared > limit) {
      reject(Object.assign(new Error('Payload too large'), { status: 413 }));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Builds the HTTP server. Dependencies are injectable for tests:
 * verify(payload, headers) -> parsed body (throws when the signature is invalid);
 * send(phone, otp) -> { ok, code, requestId }.
 */
function createHookServer({ config = readConfig(), verify, send, limiter, now = () => Date.now() } = {}) {
  const verifyWebhook = verify ?? createVerifier(config.hookSecret);
  const sendSms = send ?? createAliyunSender(config);
  const limits = limiter ?? createRateLimiter(config.limits, now);
  const delivered = new Map(); // webhook-id -> time, so a GoTrue retry does not send a second SMS
  const inflight = new Map(); // webhook-id -> pending outcome while Alibaba is still answering
  const stats = { started: new Date(now()).toISOString(), sent: 0, failed: 0, limited: 0 };

  const server = http.createServer(async (req, res) => {
    const path = (req.url || '/').split('?')[0];
    if (req.method === 'GET' && (path === '/healthz' || path === '/health')) {
      sendJson(res, 200, { ok: true, started: stats.started, sent: stats.sent, failed: stats.failed, limited: stats.limited });
      return;
    }
    if (path !== '/send-sms') {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'method_not_allowed' });
      return;
    }

    let raw;
    try {
      raw = await readBody(req, MAX_BODY_BYTES);
    } catch (error) {
      log('warn', 'request body rejected', { reason: error.status === 413 ? 'too_large' : 'read_error' });
      sendJson(res, error.status === 413 ? 413 : 400, { error: error.status === 413 ? 'payload_too_large' : 'bad_request' });
      return;
    }

    let payload;
    try {
      payload = verifyWebhook(raw, req.headers);
    } catch {
      log('warn', 'signature verification failed');
      sendJson(res, 401, { error: 'invalid_signature' });
      return;
    }

    const webhookId = String(req.headers['webhook-id'] ?? '');
    const otp = payload?.sms?.otp;
    const phone = normalizeMainlandPhone(payload?.user?.phone);
    const masked = maskPhone(phone ?? payload?.user?.phone);
    if (!phone) {
      log('warn', 'rejected non-mainland or malformed phone', { phone: masked });
      hookError(res, 400, 'Invalid phone number: only mainland China mobile numbers are supported.');
      return;
    }
    if (typeof otp !== 'string' || !/^\d{4,10}$/.test(otp)) {
      log('warn', 'rejected payload without a numeric otp', { phone: masked });
      hookError(res, 400, 'Invalid hook payload.');
      return;
    }

    for (const [id, at] of delivered) if (now() - at > 10 * 60 * 1000) delivered.delete(id);
    if (webhookId && delivered.has(webhookId)) {
      log('info', 'duplicate webhook ignored', { phone: masked });
      sendJson(res, 200, {});
      return;
    }
    if (webhookId && inflight.has(webhookId)) {
      // GoTrue retried while the first attempt is still waiting for Alibaba: share its outcome.
      respond(res, await inflight.get(webhookId));
      return;
    }

    const refused = limits.take(phone, clientIp(req.headers));
    if (refused) {
      stats.limited += 1;
      log('warn', 'rate limited', { phone: masked, rule: refused });
      hookError(res, 429, 'Too many SMS requests. Please try again later.');
      return;
    }

    const attempt = deliver(phone, otp, masked, webhookId);
    if (webhookId) inflight.set(webhookId, attempt);
    try {
      respond(res, await attempt);
    } finally {
      if (webhookId) inflight.delete(webhookId);
    }
  });

  function respond(res, outcome) {
    if (outcome.ok) sendJson(res, 200, {});
    else hookError(res, outcome.error.http_code, outcome.error.message);
  }

  async function deliver(phone, otp, masked, webhookId) {
    const startedAt = now();
    try {
      const result = await sendSms(phone, otp);
      if (result.ok) {
        stats.sent += 1;
        if (webhookId) delivered.set(webhookId, now());
        log('info', 'sms sent', { phone: masked, requestId: result.requestId, ms: now() - startedAt });
        return { ok: true };
      }
      stats.failed += 1;
      log('error', 'aliyun rejected sms', { phone: masked, aliyunCode: result.code, requestId: result.requestId });
      return { ok: false, error: hookErrorForAliyunCode(result.code) };
    } catch (error) {
      stats.failed += 1;
      // SDK errors can embed request details; log only the code.
      const code = String(error?.code ?? error?.data?.Code ?? 'Error').slice(0, 80);
      log('error', 'aliyun call failed', { phone: masked, aliyunCode: code, ms: now() - startedAt });
      return { ok: false, error: hookErrorForAliyunCode(code) };
    }
  }

  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}

function start() {
  const config = readConfig();
  const missing = missingConfig(config);
  if (missing.length) {
    log('error', 'missing configuration', { missing });
    process.exit(1);
  }
  if (!/^v1,whsec_[A-Za-z0-9+/=]{20,}$/.test(config.hookSecret)) {
    log('error', 'HOOK_SECRET must look like v1,whsec_<base64>');
    process.exit(1);
  }
  const server = createHookServer({ config });
  server.listen(config.port, config.host, () => log('info', 'sms hook listening', { port: config.port }));

  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    log('info', 'shutting down', { signal });
    server.close(() => process.exit(0));
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = {
  createHookServer,
  createRateLimiter,
  hookErrorForAliyunCode,
  maskPhone,
  normalizeMainlandPhone,
  readConfig,
  missingConfig,
  withTimeout,
};

if (require.main === module) start();
