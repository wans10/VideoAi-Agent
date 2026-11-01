import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { legalText, type LegalFactKey } from '@/lib/legal-entity';

/** Prints a legal fact from config/legal-entity.json. */
export function LegalFact({ k }: { k: LegalFactKey }) {
  return <>{legalText(k)}</>;
}

/** The contact mailbox from config/legal-entity.json, rendered the way the rest of the site obfuscates it. */
export function LegalContactEmail() {
  const [user, domain] = legalText('contactEmail').split('@');
  return <ObfuscatedEmailLink user={user} domain={domain} label={legalText('contactEmail')} placeholder={`${user} [at] ${domain}`} />;
}
