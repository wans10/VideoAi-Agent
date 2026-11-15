import { isKeyvoRecastHidden } from '@/config/keyvo-disabled-features';
import type { CharacterBuilderLandingContent } from './character-builder-landing-assets';

/** Recast is hidden on Keyvo: drop FAQ entries that describe it (locale-neutral keyword match; copy stays in the dictionaries). */
export function withoutRecastFaq(content: CharacterBuilderLandingContent): CharacterBuilderLandingContent {
  if (!isKeyvoRecastHidden()) return content;
  return { ...content, faq: { ...content.faq, items: content.faq.items.filter(item => !/recast/i.test(`${item.question} ${item.answer}`)) } };
}
