import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';

/** Bundles a route/server module with replaced `@/…` boundaries and returns its exports. */
export async function loadWithMocks<T>(entry: string, mocks: Record<string, string>): Promise<T> {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', tsconfig: 'frontend/tsconfig.json', logLevel: 'silent',
    plugins: [{ name: 'route-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: 'fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: mocks[args.path], loader: 'js' }));
    } }],
  });
  const module = { exports: {} as T };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, createRequire(resolve('frontend/package.json')));
  return module.exports;
}
