import entity from '@/config/legal-entity.json';

type RawLegalFact = { value: string; ownerStated?: boolean; note?: string };

export type LegalFactKey = Exclude<keyof typeof entity, '_readme'>;

const FACTS = entity as unknown as Record<LegalFactKey, RawLegalFact>;

/** The value of a fact the owner provided. Only facts listed in config/legal-entity.json can be printed. */
export function legalText(key: LegalFactKey): string {
  return FACTS[key].value;
}

/** Keys that start with an underscore (the _readme note) are documentation, not facts. */
export function listLegalFactKeys(): LegalFactKey[] {
  return (Object.keys(FACTS) as LegalFactKey[]).filter((key) => !String(key).startsWith('_'));
}

export function isOwnerStatedFact(key: LegalFactKey): boolean {
  return FACTS[key].ownerStated === true;
}
