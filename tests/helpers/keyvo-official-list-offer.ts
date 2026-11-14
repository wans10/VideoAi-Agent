import { readFileSync } from 'node:fs';

type OfficialListTransition = {
  retiredEngineIds: string[];
  changes: Array<{ current: { id: string; customerTotalCents?: number } }>;
};

/**
 * Current Product offer (JSON-LD) customer cents of an engine re-priced by Keyvo's official list price rules,
 * read from the reviewed public transition fixtures: the 2026-11-13 official-list-80 rule and the later
 * 2026-11-14 official-list-100 correction for Nano Banana 2 / Lite, which wins where both change an offer.
 * Undefined when no rule changed the offer.
 */
const transition = JSON.parse(readFileSync('tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json', 'utf8')) as OfficialListTransition;
const transition100 = JSON.parse(readFileSync('tests/fixtures/keyvo-official-list-100-public-pricing-2026-11-14.json', 'utf8')) as OfficialListTransition;
const offers = new Map(
  [...transition.changes, ...transition100.changes]
    .filter((change) => change.current.id.startsWith('json-ld:') && change.current.id.endsWith(':offer'))
    .map((change) => [change.current.id.split(':')[1]!, change.current.customerTotalCents]),
);

export const KEYVO_OFFICIAL_LIST_RETIRED_ENGINE_IDS: readonly string[] = transition.retiredEngineIds;

export function officialListOfferCents(engineId: string): number | undefined {
  return offers.get(engineId);
}
