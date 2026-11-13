import { readFileSync } from 'node:fs';

/**
 * Current Product offer (JSON-LD) customer cents of an engine re-priced by Keyvo's official list price rule
 * (2026-11-13), read from the reviewed public transition fixture. Undefined when the rule did not change the offer.
 */
const transition = JSON.parse(readFileSync('tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json', 'utf8')) as {
  retiredEngineIds: string[];
  changes: Array<{ current: { id: string; customerTotalCents?: number } }>;
};
const offers = new Map(transition.changes
  .filter((change) => change.current.id.startsWith('json-ld:') && change.current.id.endsWith(':offer'))
  .map((change) => [change.current.id.split(':')[1]!, change.current.customerTotalCents]));

export const KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS: readonly string[] = transition.retiredEngineIds;

export function officialListOfferCents(engineId: string): number | undefined {
  return offers.get(engineId);
}
