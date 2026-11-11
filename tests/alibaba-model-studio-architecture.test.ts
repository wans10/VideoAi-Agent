import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const providerDirectory = join(root, 'frontend/src/server/video-providers/alibaba-model-studio');
const submissionPath = join(root, 'frontend/app/api/generate/_lib/alibaba-model-studio-submission.ts');
const pollPath = join(root, 'frontend/server/alibaba-model-studio-poll.ts');
const providerAttemptsPath = join(root, 'frontend/src/server/video-providers/provider-attempts.ts');
const frontendDirectory = join(root, 'frontend');

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function frontendTypescriptFiles(): string[] {
  return readdirSync(frontendDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name) && !/(?:^|[\\/])(?:node_modules|\.next)(?:[\\/]|$)/u.test(entry.parentPath))
    .map((entry) => join(entry.parentPath, entry.name));
}

test('Alibaba direct video integration has one adapter, submission owner, and poll owner', () => {
  assert.ok(existsSync(providerDirectory));
  assert.deepEqual(readdirSync(providerDirectory).sort(), [
    'bailian-models.ts', 'bailian-payload.ts', 'bailian-routing.ts',
    'capacity.ts', 'client.ts', 'cost.ts', 'errors.ts', 'index.ts', 'media-access.ts', 'model-map.ts', 'payload.ts', 'response.ts', 'types.ts',
  ]);
  assert.ok(existsSync(submissionPath));
  assert.ok(existsSync(pollPath));

  const sources = frontendTypescriptFiles().map((path) => ({ path, contents: source(path) }));
  assert.deepEqual(
    sources.filter(({ contents }) => /export async function submitAlibabaModelStudioGenerateTask/u.test(contents))
      .map(({ path }) => relative(root, path)),
    ['frontend/app/api/generate/_lib/alibaba-model-studio-submission.ts'],
  );
  assert.deepEqual(
    sources.filter(({ contents }) => /export async function runAlibabaModelStudioPoll/u.test(contents))
      .map(({ path }) => relative(root, path)),
    ['frontend/server/alibaba-model-studio-poll.ts'],
  );
});

test('Alibaba submission and polling reuse shared attempts and durable media ownership', () => {
  const submission = source(submissionPath);
  const poll = source(pollPath);
  assert.match(submission, /video-providers\/provider-attempts/);
  assert.match(poll, /video-providers\/provider-attempts/);
  assert.match(poll, /provider-output-policy/);
  assert.match(poll, /ensureFastStartVideo/);
  assert.match(poll, /upsertLegacyJobOutputs/);
  assert.match(poll, /server\/alibaba-job-accounting/);
  assert.doesNotMatch(poll, /actualUnits - job.duration_sec/);
  assert.match(source(providerAttemptsPath), /sanitizeSnapshotValue/);
});

test('client components never import Alibaba provider server modules', () => {
  const clientImports = frontendTypescriptFiles()
    .filter((path) => path.endsWith('.client.tsx') || /^['"]use client['"];?/u.test(source(path).trimStart()))
    .filter((path) => /server\/video-providers\/alibaba-model-studio|server\/alibaba-model-studio-poll|server\/alibaba-job-accounting/u.test(source(path)))
    .map((path) => relative(root, path));
  assert.deepEqual(clientImports, []);
});

test('Alibaba submissions reserve documented capacity before the paid call and polling bounds UNKNOWN tasks', () => {
  const submission = source(submissionPath);
  const poll = source(pollPath);
  assert.match(submission, /reserveAlibabaVideoCapacity/);
  assert.ok(
    submission.indexOf('reserveAlibabaVideoCapacity)({') < submission.indexOf('.createVideo(transport.payload)'),
    'capacity must be reserved before the provider call',
  );
  assert.match(source(join(providerDirectory, 'capacity.ts')), /'qwen-image-3\.0-pro': \{ limit: 5, windowMs: 60_000 \}/);
  assert.match(poll, /evaluateAlibabaUnknownStatus/);
  assert.match(poll, /ALIBABA_TASK_UNKNOWN/);
});

test('Bailian-hosted Kling / MiniMax reuse the Alibaba submission and pick routes before any task exists', () => {
  const router = source(join(root, 'frontend/src/server/video-providers/router.ts'));
  const submission = source(submissionPath);
  const dispatcher = source(join(root, 'frontend/app/api/generate/_lib/video-provider-submission.ts'));
  assert.match(router, /applyBailianRouteOrder\(params, resolveVendorVideoProviderRoutingPlan\(params\)\)/);
  assert.match(source(join(providerDirectory, 'bailian-routing.ts')), /KLING_ROUTE_ORDER/);
  assert.match(source(join(providerDirectory, 'bailian-routing.ts')), /MINIMAX_H3_ROUTE_ORDER/);
  assert.match(submission, /shouldFallbackFromBailianSubmit\(\{ acceptedProviderJobId, error \}\)/);
  assert.match(source(join(root, 'frontend/app/api/generate/_lib/kling-direct-submission.ts')), /shouldFallbackFromKlingDirectToBailian/);
  assert.match(source(join(root, 'frontend/app/api/generate/_lib/llmhub-submission.ts')), /shouldFallbackFromMinimaxDirectToBailian/);
  assert.match(dispatcher, /submitDirectFallback/);
  assert.match(source(join(providerDirectory, 'capacity.ts')), /\[BAILIAN_MINIMAX_H3_MODEL\]: \{ limit: 300, windowMs: 60_000 \}/);
});
