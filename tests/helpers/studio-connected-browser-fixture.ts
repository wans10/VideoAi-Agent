import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  chromium,
  firefox,
  webkit,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  type Route,
} from '@playwright/test';
import {
  STUDIO_PRIVATE_MEDIA_HOST,
  serveStudioPrivateMediaRequest,
} from './studio-private-storage-fixture';

type AuthCookie = { name: string; value: string };
type BrowserContextFixtureOptions = Pick<
  BrowserContextOptions,
  'colorScheme' | 'locale' | 'reducedMotion' | 'viewport'
>;

export type StudioPrivateBrowserRequest = Readonly<{
  method: string;
  range: string | null;
  status: number;
  /** Query deliberately omitted so bearer-style object signatures never enter the journal. */
  url: string;
}>;

export type OwnedStudioBrowserContext = Readonly<{
  context: BrowserContext;
  page: Page;
  close(): Promise<void>;
}>;

type StudioBrowserRuntime<Session> = {
  origin: string;
  browserOrigin: string;
  auth: {
    origin: string;
    cookiesFor(session: Session): AuthCookie[];
  };
};

function exactOrigin(value: string): URL {
  const parsed = new URL(value);
  assert.ok(
    value === parsed.origin || value === `${parsed.origin}/`,
    'Browser fixture origins must not include credentials, paths, query or fragments.',
  );
  return parsed;
}

async function handleRequest(
  route: Route,
  allowedOrigins: ReadonlySet<string>,
  privateRequests: StudioPrivateBrowserRequest[],
  signatureClock: (url: string) => Date,
): Promise<void> {
  const request = route.request();
  const url = new URL(request.url());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    await route.continue();
    return;
  }

  if (url.protocol === 'https:' && url.host === STUDIO_PRIVATE_MEDIA_HOST) {
    const range = request.headers()['range'] ?? null;
    const response = await serveStudioPrivateMediaRequest({
      url: request.url(),
      method: request.method(),
      range,
      now: signatureClock(request.url()),
    });
    privateRequests.push(Object.freeze({
      method: request.method(),
      range,
      status: response.status,
      url: `${url.origin}${url.pathname}`,
    }));
    await route.fulfill({ status: response.status, headers: response.headers, body: response.body });
    return;
  }

  if (allowedOrigins.has(url.origin)) {
    await route.continue();
    return;
  }
  await route.abort('blockedbyclient');
}

/** Owns one non-persistent browser process and every fresh session context it creates. */
export async function startStudioConnectedBrowserFixture<Session>(options: {
  runtime: StudioBrowserRuntime<Session>;
  browserName?: 'chromium' | 'firefox' | 'webkit';
  signatureClock?: (url: string) => Date;
  headless?: boolean;
  /** When set, every context records a Playwright trace that is saved here as it closes. */
  traceDir?: string;
}) {
  assert.equal(process.versions.node.split('.')[0], '22', 'Use the project Node 22 runtime.');
  const app = exactOrigin(options.runtime.browserOrigin);
  const appIpv4 = exactOrigin(options.runtime.origin);
  const auth = exactOrigin(options.runtime.auth.origin);
  assert.equal(app.protocol, 'http:');
  assert.equal(app.hostname, 'localhost');
  assert.equal(appIpv4.protocol, 'http:');
  assert.equal(appIpv4.hostname, '127.0.0.1');
  assert.equal(app.port, appIpv4.port, 'Browser and IPv4 origins must identify the same owned app child.');
  assert.equal(auth.protocol, 'http:');
  assert.equal(auth.hostname, '127.0.0.1');

  const allowedOrigins = new Set([app.origin, appIpv4.origin, auth.origin]);
  const privateRequests: StudioPrivateBrowserRequest[] = [];
  const signatureClock = options.signatureClock ?? (() => new Date());
  const browserName = options.browserName ?? 'chromium';
  const browser = await ({chromium,firefox,webkit})[browserName].launch({
    headless: options.headless ?? true,
    args: browserName === 'chromium' ? [
      '--disable-background-networking',
      '--host-resolver-rules=MAP localhost 127.0.0.1',
    ] : [],
  });
  const contexts = new Set<BrowserContext>();
  let closing: Promise<void> | null = null;
  const retiring = new WeakMap<BrowserContext, Promise<void>>();
  let traceCount = 0;
  if (options.traceDir) mkdirSync(options.traceDir, { recursive: true });

  /**
   * Close a context without surfacing errors from page route handlers that are still awaiting
   * `route.fetch()`. Closing under them rejects with "Target page, context or browser has been
   * closed" and fails whichever test is running. The fixture's own context-level handler only
   * fulfils or continues, so it is left in place.
   */
  function retire(context: BrowserContext, traced: boolean): Promise<void> {
    let pending = retiring.get(context);
    if (!pending) {
      pending = (async () => {
        for (const page of context.pages()) await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => undefined);
        if (traced && options.traceDir) {
          const path = join(options.traceDir, `context-${String(++traceCount).padStart(2, '0')}.zip`);
          await context.tracing.stop({ path }).catch(() => undefined);
        }
        await context.close();
      })();
      retiring.set(context, pending);
    }
    return pending;
  }

  async function newContext(
    session: Session,
    contextOptions: BrowserContextFixtureOptions = {},
  ): Promise<OwnedStudioBrowserContext> {
    assert.equal(closing, null, 'Cannot create a context after browser fixture close started.');
    const context = await browser.newContext({
      ...contextOptions,
      baseURL: app.origin,
      serviceWorkers: 'block',
    });
    contexts.add(context);
    context.once('close', () => contexts.delete(context));
    const traced = Boolean(options.traceDir);
    try {
      if (traced) await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
      const cookies = options.runtime.auth.cookiesFor(session);
      assert.ok(cookies.length > 0, 'Authenticated browser context requires fixture cookies.');
      await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: app.origin })));
      await context.route('**/*', (route) => handleRequest(
        route,
        allowedOrigins,
        privateRequests,
        signatureClock,
      ));
      const page = await context.newPage();
      let contextClosing: Promise<void> | null = null;
      return Object.freeze({
        context,
        page,
        close() {
          contextClosing ??= retire(context, traced);
          return contextClosing;
        },
      });
    } catch (error) {
      await retire(context, traced).catch(() => undefined);
      throw error;
    }
  }

  async function close(): Promise<void> {
    closing ??= (async () => {
      try {
        await Promise.all([...contexts].map((context) => retire(context, Boolean(options.traceDir))));
      } finally {
        await browser.close();
      }
    })();
    return closing;
  }

  return Object.freeze({
    browser: browser as Browser,
    newContext,
    readPrivateRequests: () => privateRequests.map((entry) => ({ ...entry })),
    close,
  });
}
