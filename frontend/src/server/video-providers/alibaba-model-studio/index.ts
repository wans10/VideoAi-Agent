import type { VideoProviderAdapter } from '../types';
import { AlibabaModelStudioClient, getAlibabaModelStudioClient } from './client';
import { estimateAlibabaProviderCost } from './cost';
import { classifyAlibabaModelStudioError } from './errors';
import { ALIBABA_MODEL_STUDIO_PROVIDER, resolveAlibabaModelRoute } from './model-map';
import { buildAlibabaRequestPayload } from './bailian-payload';
import { normalizeAlibabaTask } from './response';

export function getAlibabaModelStudioAdapter(
  client: AlibabaModelStudioClient = getAlibabaModelStudioClient()
): VideoProviderAdapter {
  return {
    key: ALIBABA_MODEL_STUDIO_PROVIDER,
    async submit(input) {
      const route = resolveAlibabaModelRoute(input.engineId, input.mode);
      if (!route) throw new Error(`Unsupported Alibaba Model Studio route: ${input.engineId}/${input.mode}`);
      const task = await client.createVideo(buildAlibabaRequestPayload({
        ...input,
        startImageUrl: input.imageUrl,
      }));
      return {
        provider: ALIBABA_MODEL_STUDIO_PROVIDER,
        providerJobId: task.providerJobId,
        providerModel: route.model,
        status: task.status,
        raw: task.raw,
      };
    },
    poll(input) {
      return client.getTask(input.providerJobId);
    },
    normalizeResult: normalizeAlibabaTask,
    normalizeError: classifyAlibabaModelStudioError,
    estimateCost: estimateAlibabaProviderCost,
  };
}

export { AlibabaModelStudioClient, getAlibabaModelStudioClient, normalizeAlibabaBaseUrl } from './client';
export { estimateAlibabaProviderCost } from './cost';
export {
  AlibabaModelStudioError,
  classifyAlibabaModelStudioError,
  shouldFallbackFromAlibabaSubmit,
} from './errors';
export {
  ALIBABA_MODEL_STUDIO_PROVIDER,
  isAlibabaDirectEngine,
  isAlibabaDirectModeSupported,
  isAlibabaFalFallbackCompatible,
  resolveAlibabaModelRoute,
} from './model-map';
export { buildAlibabaVideoPayload } from './payload';
export { buildAlibabaRequestPayload, buildBailianHostedPayload } from './bailian-payload';
export {
  isBailianHostedEngine,
  isBailianHostedModeSupported,
  resolveBailianHostedEngine,
} from './bailian-models';
export {
  isBailianHostedRequestCompatible,
  parseBailianRouteOrder,
  shouldFallbackFromBailianSubmit,
  shouldFallbackFromKlingDirectToBailian,
  shouldFallbackFromMinimaxDirectToBailian,
} from './bailian-routing';
export { normalizeAlibabaTask } from './response';
export type { AlibabaVideoPayloadInput } from './payload';
export type { AlibabaTaskResponse, AlibabaVideoPayload } from './types';
