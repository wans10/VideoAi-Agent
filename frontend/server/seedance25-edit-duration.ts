/** Customer quotes retain the integer tariff grid; the provider receives duration=-1.
 * Only server-verified source timing can select that grid cell, rounded upward.
 */
export function seedance25EditQuoteDuration(engineId: string, mode: string, sourceDurationSec: number | null | undefined): number | undefined {
  if (engineId !== 'seedance-2-5' || mode !== 'v2v') return undefined;
  if (typeof sourceDurationSec !== 'number' || !Number.isFinite(sourceDurationSec) || sourceDurationSec < 4 || sourceDurationSec > 30) {
    throw new Error('Seedance 2.5 editing requires a verified source video between 4 and 30 seconds.');
  }
  return Math.ceil(sourceDurationSec);
}
