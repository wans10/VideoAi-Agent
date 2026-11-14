import { STUDIO_CONVERSATION_MAX_ATTACHMENTS } from '../frontend/lib/studio/conversation-creation-contract';
import assert from "node:assert/strict";
import test from "node:test";
import { getFalEngineById } from "../frontend/src/config/falEngines";
import {
  imageDraftSchema,
  imageTurnInputSchema,
} from "../frontend/src/lib/studio/image-conversation-contract";
import { imageRequestFromDraft } from "../frontend/src/server/studio/image-conversation-service";
import { STUDIO_IMAGE_ENGINE_ORDER, resolveStudioImageEngine } from "../frontend/src/server/studio/conversation-image-request";
import { validateCanonicalGenerationCapabilities } from "../frontend/src/server/agent-api/generation-capability-validation";
import { normalizeGenerationRequest } from "../frontend/src/server/agent-api/generation-normalization";
import { isWorkspaceModelCertifiedForBlock } from "../frontend/app/(core)/(workspace)/app/studio/_shared/_lib/models/workspace-model-certification";
import type { AgentPublicGenerationEngine } from "../frontend/src/server/agent-api/model-catalog";
const ADMIN_OR_HIDDEN_DEFAULTS = ["gpt-image-2", "gpt-image-2-5-flare", "gpt-image-2-6-sunburst", "gpt-image-2-6-flare", "nano-banana-2", "nano-banana-2-1", "nano-banana-lite"];
function catalogEntry(id: string): AgentPublicGenerationEngine {
  const entry = getFalEngineById(id);
  assert.ok(entry, id);
  return {
    engine: entry.engine,
    surface: "image",
    publicModes: ["t2i", "i2i"],
    modeCaps: Object.fromEntries(entry.modes.map((mode) => [mode.mode, mode.ui])),
  };
}
const turn = (references: string[]) => ({
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  message: "Crée cette image",
  references,
});
const errorCode = (code: string) => (error: { code?: string }) => error.code === code;

test("the Studio image conversation defaults to the domestic public engines, quality first", () => {
  assert.deepEqual([...STUDIO_IMAGE_ENGINE_ORDER], ["seedream-5-0-pro", "seedream-5-0-flash", "qwen-image-3-0-pro"]);
  const full = STUDIO_IMAGE_ENGINE_ORDER.map(catalogEntry);
  for (const mode of ["t2i", "i2i"]) {
    assert.equal(resolveStudioImageEngine(full, mode)?.engine.id, "seedream-5-0-pro");
    assert.equal(resolveStudioImageEngine(full.slice(1), mode)?.engine.id, "seedream-5-0-flash");
    assert.equal(resolveStudioImageEngine(full.slice(2), mode)?.engine.id, "qwen-image-3-0-pro");
  }
});

test("a catalogue holding only admin-tier or hidden image engines fails closed", () => {
  const catalog = ADMIN_OR_HIDDEN_DEFAULTS.flatMap((id) => (getFalEngineById(id) ? [catalogEntry(id)] : []));
  assert.ok(catalog.length > 0);
  assert.equal(resolveStudioImageEngine(catalog, "t2i"), undefined);
  for (const list of [[], catalog]) {
    assert.throws(
      () => imageRequestFromDraft({ reply: "Direction", image: { prompt: "A perfume", aspectRatio: "1:1" } }, turn([]), list),
      errorCode("ENGINE_UNAVAILABLE"),
    );
  }
});

test("a user-selected model is honoured only when the catalogue offers it for the mode", () => {
  const catalog = ["seedream-5-0-pro", "qwen-image-3-0-pro"].map(catalogEntry);
  const request = imageRequestFromDraft(
    { reply: "Direction", image: { prompt: "A perfume", aspectRatio: "1:1", modelId: "qwen-image-3-0-pro" } },
    turn([]),
    catalog,
  );
  assert.equal(request.engineId, "qwen-image-3-0-pro");
  assert.throws(
    () => imageRequestFromDraft({ reply: "Direction", image: { prompt: "A perfume", aspectRatio: "1:1", modelId: "gpt-image-2-6-sunburst" } }, turn([]), catalog),
    errorCode("ENGINE_UNAVAILABLE"),
  );
});

test("each default engine builds valid settings for every ratio the Studio offers, in t2i and i2i", () => {
  for (const id of STUDIO_IMAGE_ENGINE_ORDER) {
    const candidate = catalogEntry(id);
    const supported = new Set<string>(candidate.engine.aspectRatios);
    for (const mode of ["t2i", "i2i"] as const) {
      if (id.startsWith("seedream")) {
        assert.equal(
          isWorkspaceModelCertifiedForBlock({
            modelId: id,
            presetId: mode === "t2i" ? "generate-image" : "modify-image",
            workflowType: mode === "t2i" ? "text_to_image" : "image_to_image",
          }),
          true,
        );
      }
      for (const aspectRatio of ["auto", "16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"] as const) {
        const refs = mode === "i2i" ? ["ma_" + "a".repeat(32)] : [];
        const build = () => imageRequestFromDraft({ reply: "Direction", image: { prompt: "Cinematic cobalt perfume", aspectRatio } }, turn(refs), [candidate]);
        if (aspectRatio !== "auto" && !supported.has(aspectRatio)) {
          assert.throws(build);
          continue;
        }
        const request = build();
        assert.deepEqual(normalizeGenerationRequest(request), request);
        validateCanonicalGenerationCapabilities(request, candidate, {
          resolvedReferences: refs.map((assetId) => ({
            assetId, role: "reference", mediaKind: "image",
            storageUrl: "https://cdn.maxvideoai.com/owned-reference.png",
            mimeType: "image/png", width: 1024, height: 1024, durationSec: null,
          })),
        });
        assert.equal(request.engineId, id);
        assert.equal(request.mode, mode);
        assert.equal(request.outputCount, 1);
        assert.ok(candidate.engine.resolutions.map((value) => String(value).toLowerCase()).includes(String(request.settings.resolution).toLowerCase()));
        // Never a GPT Image size string.
        assert.doesNotMatch(String(request.settings.resolution), /x|landscape|portrait|square/i);
        if (aspectRatio === "auto" && !supported.has("auto")) assert.equal(request.settings.aspectRatio, undefined);
        else assert.equal(request.settings.aspectRatio, aspectRatio);
      }
    }
  }
});

test("neither model output nor client input can authorize a payment or supply an account", () => {
  assert.throws(() =>
    imageDraftSchema.parse({ reply: "Do it", image: null, confirmed: true }),
  );
  assert.throws(() =>
    imageTurnInputSchema.parse({
      requestId: "123e4567-e89b-42d3-a456-426614174000",
      message: "Hi",
      references: [],
      userId: "foreign",
    }),
  );
});

test("turn input schema rejects blank/oversized messages, excess or malformed refs, and identity fields", () => {
  const valid = {
    requestId: "123e4567-e89b-42d3-a456-426614174000",
    message: "A valid image request",
    references: [] as string[],
  };

  assert.throws(() => imageTurnInputSchema.parse({ ...valid, message: "   " }));
  assert.throws(() =>
    imageTurnInputSchema.parse({ ...valid, message: "x".repeat(4001) }),
  );
  assert.throws(() =>
    imageTurnInputSchema.parse({
      ...valid,
      references: Array.from({ length: STUDIO_CONVERSATION_MAX_ATTACHMENTS+1 }, (_, index) =>
        `ma_${String(index).padStart(32, "a")}`,
      ),
    }),
  );
  assert.throws(() =>
    imageTurnInputSchema.parse({ ...valid, references: ["ma_not-an-asset"] }),
  );
  assert.throws(() =>
    imageTurnInputSchema.parse({ ...valid, userId: "foreign-account" }),
  );
});
