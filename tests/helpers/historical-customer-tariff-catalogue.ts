import { getRuntimeModelById } from '../../frontend/config/model-runtime';
import { getFalEngineById } from '../../frontend/src/config/falEngines';
import { withClosedKlingV4Release } from './kling-v4-release-profile';

/** Restores only Pika's historical selection and pricing identity in this test
 * process. Keep current native-price additions when auditing later cutovers. */
export async function withArchivedPikaPricingCatalogue<T>(run: () => T | Promise<T>): Promise<T> {
  const model = getRuntimeModelById('pika-text-to-video')!;
  const original = model.publication.app.published;
  try {
    model.publication.app.published = true;
    return await run();
  } finally {
    model.publication.app.published = original;
  }
}

/** Replays the pre-launch catalogue, not the new models' financial approval.
 * Nano21, GPT Image 2.6 and Kling V4 Flash have separate approved native prices and no historical percentage baseline.
 * Their added cells have dedicated price tests.
 * Seedream 5.0 Flash, Seedream 5.5 and Seedance 2.5 Flash are not closed here: Keyvo offers them (owner allowlist, 2026-11-22;
 * Seedream 5.5 and Flash priced from the Volcengine CNY list at x0.8) with unpublished or published model pages, so their
 * official-list cells are real checkpoints of the Keyvo cutover inventory (the upstream 1.5K/2K cells are Seedream 5.5-only).
 * Seedance 2.5's later 4K cells likewise have no historical customer amount;
 * their separate create-missing ×2 import is covered by the commercial admin tests.
 * Archived Pika retains its historical money checkpoints only inside this fixture;
 * normal current selection/public pricing stay closed. No provider is contacted. */
export async function withHistoricalCustomerTariffCatalogue<T>(run: () => T | Promise<T>): Promise<T> {
  return withClosedKlingV4Release(async () => {
    const models = ['nano-banana-2-1', 'kling-v4-flash', 'gpt-image-2-6-flare', 'gpt-image-2-6-sunburst']
      .map(id => getRuntimeModelById(id)!);
    const original = models.map(model => model.publication.app.published);
    const seedance = getFalEngineById('seedance-2-5')!;
    const resolutions = seedance.engine.resolutions;
    const modeResolutions = seedance.modes.map(mode => mode.ui.resolution);
    try {
      models.forEach(model => { model.publication.app.published = false; });
      seedance.engine.resolutions = resolutions.filter(resolution => resolution !== '4k');
      seedance.modes.forEach(mode => {
        mode.ui.resolution = mode.ui.resolution?.filter(resolution => resolution !== '4k');
      });
      return await withArchivedPikaPricingCatalogue(run);
    } finally {
      seedance.engine.resolutions = resolutions;
      seedance.modes.forEach((mode, index) => { mode.ui.resolution = modeResolutions[index]; });
      models.forEach((model, index) => { model.publication.app.published = original[index]; });
    }
  });
}
