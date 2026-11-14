import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const allowlist = JSON.parse(readFileSync("frontend/config/keyvo-model-allowlist.json", "utf8")) as { engineTiers?: Record<string, string> };
const tiers = (allowlist.engineTiers ?? {}) as Record<string, string>;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

test("the allowlist classifies admin-tier engines", () => {
  assert.ok(Object.values(tiers).includes("admin"));
});

test("no admin-tier or hidden engine id is hard-coded in the Studio server code", () => {
  const adminIds = Object.entries(tiers).filter(([, tier]) => tier === "admin").map(([id]) => id);
  const hiddenIds = ["gpt-image-2", "gpt-image-2-5-sunburst", "gpt-image-2-6-flare", "gpt-image-2-6-sunburst", "gpt-image-2-5-flare"];
  const files = [...sources("frontend/src/server/studio"), ...sources("frontend/src/lib/studio")];
  const offenders: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const id of new Set([...adminIds, ...hiddenIds])) {
      if (new RegExp(`['"\`]${id}['"\`]`).test(text)) offenders.push(`${file}: ${id}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the Studio image conversation has a single engine resolver", () => {
  const service = readFileSync("frontend/src/server/studio/image-conversation-service.ts", "utf8");
  const request = readFileSync("frontend/src/server/studio/conversation-image-request.ts", "utf8");
  assert.match(service, /resolveStudioImageEngine/);
  assert.doesNotMatch(service, /engineId:\s*["']/);
  assert.match(request, /STUDIO_IMAGE_ENGINE_ORDER = \['seedream-5-0-pro', 'seedream-5-0-flash', 'qwen-image-3-0-pro'\]/);
});
