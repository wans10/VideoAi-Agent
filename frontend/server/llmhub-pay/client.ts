import { createSign, createVerify } from 'node:crypto';

const API_ORIGIN = 'https://payment.llmhub.com.cn';
const REQUEST_TIMEOUT_MS = 10_000;

export type LlmhubPayType = 'alipay' | 'wxpay';
export type SignedFields = Record<string, unknown>;

export type LlmhubPayConfig = {
  pid: string;
  merchantPrivateKey: string;
  platformPublicKey: string;
};

function pem(value: string, kind: 'PRIVATE KEY' | 'PUBLIC KEY'): string {
  const normalized = value.trim().replace(/\\n/g, '\n');
  if (normalized.startsWith('-----BEGIN ')) return normalized;
  const body = normalized.replace(/\s/g, '');
  return `-----BEGIN ${kind}-----\n${body.match(/.{1,64}/g)?.join('\n') ?? ''}\n-----END ${kind}-----`;
}

export function getLlmhubPayConfig(): LlmhubPayConfig | null {
  const pid = process.env.LLMHUB_PAY_PID?.trim() ?? '';
  const merchantPrivateKey = process.env.LLMHUB_PAY_MERCHANT_PRIVATE_KEY?.trim() ?? '';
  const platformPublicKey = process.env.LLMHUB_PAY_PLATFORM_PUBLIC_KEY?.trim() ?? '';
  if (!/^\d+$/.test(pid) || !merchantPrivateKey || !platformPublicKey) return null;
  return { pid, merchantPrivateKey: pem(merchantPrivateKey, 'PRIVATE KEY'), platformPublicKey: pem(platformPublicKey, 'PUBLIC KEY') };
}

export function getLlmhubPaySiteOrigin(): string | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '');
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function canonicalLlmhubPayFields(fields: SignedFields): string {
  return Object.entries(fields)
    .filter(([key, value]) => key !== 'sign' && key !== 'sign_type' && value !== null && value !== undefined && value !== '' && !Array.isArray(value) && typeof value !== 'object')
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('&');
}

export function signLlmhubPayFields(fields: SignedFields, privateKey: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(canonicalLlmhubPayFields(fields), 'utf8');
  signer.end();
  return signer.sign(privateKey, 'base64');
}

export function verifyLlmhubPayFields(fields: SignedFields, publicKey: string): boolean {
  if (fields.sign_type !== 'RSA' || typeof fields.sign !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(fields.sign)) return false;
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(canonicalLlmhubPayFields(fields), 'utf8');
    verifier.end();
    return verifier.verify(publicKey, fields.sign, 'base64');
  } catch {
    return false;
  }
}

export function signedFieldsFromUrl(url: URL): SignedFields | null {
  return signedFieldsFromParams(url.searchParams);
}

export function signedFieldsFromParams(params: URLSearchParams): SignedFields | null {
  const fields: Record<string, string> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(fields, key)) return null;
    fields[key] = value;
  }
  return fields;
}

function scalarFields(value: unknown): SignedFields | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([, item]) => item !== null && !['string', 'number'].includes(typeof item))) return null;
  return Object.fromEntries(entries);
}

async function postSigned(path: '/api/pay/create' | '/api/pay/query', fields: Record<string, string>, config: LlmhubPayConfig, fetchImpl: typeof fetch): Promise<SignedFields> {
  const payload = { ...fields, pid: config.pid, timestamp: String(Math.floor(Date.now() / 1000)) };
  const body = new URLSearchParams({ ...payload, sign: signLlmhubPayFields(payload, config.merchantPrivateKey), sign_type: 'RSA' });
  const response = await fetchImpl(`${API_ORIGIN}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`llmhub_http_${response.status}`);
  const data = scalarFields(await response.json());
  if (!data) throw new Error('llmhub_invalid_response');
  const rawCode = data.code;
  const code = (typeof rawCode === 'number' && Number.isSafeInteger(rawCode)) ||
    (typeof rawCode === 'string' && /^-?\d+$/.test(rawCode))
    ? Number(rawCode)
    : NaN;
  if (!Number.isSafeInteger(code)) throw new Error('llmhub_invalid_response');
  const hasSignature = data.sign !== undefined || data.sign_type !== undefined;
  if (hasSignature && !verifyLlmhubPayFields(data, config.platformPublicKey)) {
    throw new Error('llmhub_invalid_response_signature');
  }
  if (code !== 0) {
    // Some gateway business errors are unsigned. Their text is diagnostic only;
    // no unsigned response can create an order or credit the wallet.
    const detail = typeof data.msg === 'string' ? data.msg.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 160) : '';
    throw new Error(`llmhub_api_${code}${detail ? `: ${detail}` : ''}`);
  }
  if (!hasSignature) throw new Error('llmhub_invalid_response_signature');
  return data;
}

export async function createLlmhubPayOrder(input: {
  outTradeNo: string;
  type: LlmhubPayType;
  money: string;
  clientIp: string;
  notifyUrl: string;
  returnUrl: string;
}, config: LlmhubPayConfig, fetchImpl: typeof fetch = fetch): Promise<{ tradeNo: string; url: string }> {
  const result = await postSigned('/api/pay/create', {
    method: 'jump',
    type: input.type,
    out_trade_no: input.outTradeNo,
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    name: 'MaxVideoAI wallet credits',
    money: input.money,
    clientip: input.clientIp,
  }, config, fetchImpl);
  const tradeNo = typeof result.trade_no === 'string' ? result.trade_no : String(result.trade_no ?? '');
  const url = typeof result.pay_info === 'string' ? result.pay_info : '';
  if (!tradeNo || result.pay_type !== 'jump' || !url) throw new Error('llmhub_invalid_create_response');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('llmhub_insecure_redirect');
  return { tradeNo, url };
}

export async function queryLlmhubPayOrder(outTradeNo: string, config: LlmhubPayConfig, fetchImpl: typeof fetch = fetch): Promise<SignedFields> {
  return postSigned('/api/pay/query', { out_trade_no: outTradeNo }, config, fetchImpl);
}
