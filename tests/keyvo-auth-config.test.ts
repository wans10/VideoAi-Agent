import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

test('Supabase site, callback allowlist and email subjects target the Keyvo deployment', () => {
  const config = readFileSync('supabase/config.toml', 'utf8');
  assert.match(config, /^site_url = "https:\/\/app\.keyvo\.cn"$/m);
  assert.match(config, /"https:\/\/app\.keyvo\.cn\/auth\/callback"/);
  assert.match(config, /"https:\/\/app\.keyvo\.cn\/auth\/reset-password"/);
  const subjects = [...config.matchAll(/^subject = "([^"]+)"$/gm)].map(match => match[1]);
  assert.equal(subjects.length, 3);
  for (const subject of subjects) assert.match(subject, /^Keyvo — /);
  assert.doesNotMatch(config, /https:\/\/maxvideoai\.com/);
  for (const name of readdirSync('supabase/templates')) {
    const template = readFileSync(`supabase/templates/${name}`, 'utf8');
    assert.doesNotMatch(template, /MaxVideoAI|VideoAI|videoai\.omninodetech\.com/);
  }
});
