import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import YAML from 'yaml';

type Step = { name?: string; id?: string; run?: string; uses?: string; with?: Record<string, unknown> };
type Workflow = { on: { push?: { branches?: string[] } } & Record<string, unknown>; jobs: Record<string, { steps: Step[] }> };

const text = readFileSync(path.join(process.cwd(), '.github', 'workflows', 'docker-build-push.yml'), 'utf8');
const workflow = YAML.parse(text) as Workflow;

test('image builds are push-triggered from the pushed branch only', () => {
  // workflow_run and workflow_dispatch only run workflow files on the default branch, which carries no Keyvo images.
  assert.deepEqual(Object.keys(workflow.on), ['push']);
  assert.deepEqual(workflow.on.push?.branches, ['feat/white-label-keyvo', 'sandbox/**']);
  assert.doesNotMatch(text, /workflow_run|workflow_dispatch/);
});

test('published tags are immutable commit tags and never latest', () => {
  const tagValues = Object.values(workflow.jobs).flatMap((job) => job.steps)
    .filter((step) => step.uses?.startsWith('docker/metadata-action'))
    .map((step) => String(step.with?.tags ?? ''));
  assert.ok(tagValues.length >= 3, 'web, db-migrate and timeline worker each declare tags');
  for (const tags of tagValues) {
    assert.match(tags, /steps\.tag\.outputs\.value/);
    assert.doesNotMatch(tags, /latest/);
  }
  for (const step of Object.values(workflow.jobs).flatMap((job) => job.steps).filter((s) => s.uses?.startsWith('docker/metadata-action'))) {
    assert.equal(step.with?.flavor, 'latest=false');
  }
  const tagStep = Object.values(workflow.jobs).flatMap((job) => job.steps).find((step) => step.id === 'tag');
  assert.match(tagStep?.run ?? '', /sandbox-\$GITHUB_SHA/);
  assert.match(tagStep?.run ?? '', /feat\/white-label-keyvo/);
});

test('image builds do not deploy', () => {
  assert.doesNotMatch(text, /\bssh\b|docker compose|kubectl|vercel|deploy\s*:/i);
});
