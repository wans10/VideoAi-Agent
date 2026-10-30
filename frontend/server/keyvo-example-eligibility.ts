import visibleFamilies from '@/config/keyvo-visible-families.json';
import { resolveRuntimeEngineInput } from '@/config/model-runtime';

const VISIBLE_FAMILIES: ReadonlySet<string> = new Set<string>(visibleFamilies);

/**
 * Bundled examples Keyvo may present (the home works wall and its detail pages): work from the Chinese-vendor
 * families, made with a model a visitor can order today. Retired and deep-legacy versions and hidden-vendor models
 * are never shown, so nothing promises results the product cannot produce. This does not read
 * `isKeyvoVisibleFamily` because that helper is deliberately bypassed by the upstream-contract tooling.
 */
export function isShowcaseEngine(engineId: string): boolean {
  const model = resolveRuntimeEngineInput(engineId);
  return Boolean(
    model &&
      model.family &&
      VISIBLE_FAMILIES.has(model.family) &&
      model.publication.app.published &&
      model.lifecycle !== 'retired' &&
      model.lifecycle !== 'deep_legacy',
  );
}
