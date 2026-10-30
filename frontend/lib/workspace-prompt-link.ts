/**
 * Marketing surfaces open the workspace with a starting prompt: `/app?prompt=...`.
 * The link builder and the workspace request parser share these limits so a link we emit is always
 * accepted, and so the URL stays short enough to survive the login redirect (`/login?next=...`).
 */
export const WORKSPACE_PROMPT_PARAM = 'prompt';
/** The workspace accepts at most this many characters from the URL. */
export const WORKSPACE_PROMPT_MAX_CHARS = 2000;
/**
 * Links we emit stay below this percent-encoded length. CJK text expands about nine times, and the login
 * redirect (`/login?next=...`) encodes the link a second time (about fifteen characters per CJK character),
 * so this keeps even the redirected URL under the common 8 KB request-line limit.
 */
export const WORKSPACE_PROMPT_LINK_MAX_ENCODED = 3600;

// Keep tab and newline; drop every other control character.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SENTENCE_END = /[。.!?！？；;\n]/;
const WORD_BREAK = /[\s，,]/;

export function sanitizeWorkspacePrompt(
  raw: string | null | undefined,
  maxChars: number = WORKSPACE_PROMPT_MAX_CHARS,
): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/\r\n?/g, '\n').replace(CONTROL_CHARACTERS, '').trim();
  if (!cleaned) return null;
  const characters = Array.from(cleaned);
  return characters.length > maxChars ? cutAtBoundary(characters.slice(0, maxChars)) : cleaned;
}

/** Prefer ending on a sentence, then a word, boundary when one is close to the cut. */
function cutAtBoundary(kept: string[]): string {
  const floor = Math.floor(kept.length * 0.6);
  for (const boundary of [SENTENCE_END, WORD_BREAK]) {
    for (let index = kept.length - 1; index > floor; index -= 1) {
      if (boundary.test(kept[index])) return kept.slice(0, index + 1).join('').trim();
    }
  }
  return kept.join('').trim();
}

function fitEncodedLength(prompt: string, maxEncoded: number): string {
  if (encodeURIComponent(prompt).length <= maxEncoded) return prompt;
  let used = 0;
  const kept: string[] = [];
  for (const character of Array.from(prompt)) {
    const cost = encodeURIComponent(character).length;
    if (used + cost > maxEncoded) break;
    used += cost;
    kept.push(character);
  }
  return cutAtBoundary(kept);
}

/** `/app` when there is nothing to carry, otherwise `/app?prompt=<encoded, length-capped>`. */
export function buildWorkspacePromptHref(
  prompt: string | null | undefined,
  maxEncoded: number = WORKSPACE_PROMPT_LINK_MAX_ENCODED,
): string {
  const sanitized = sanitizeWorkspacePrompt(prompt);
  if (!sanitized) return '/app';
  const fitted = fitEncodedLength(sanitized, Math.min(maxEncoded, WORKSPACE_PROMPT_LINK_MAX_ENCODED));
  return fitted ? `/app?${WORKSPACE_PROMPT_PARAM}=${encodeURIComponent(fitted)}` : '/app';
}

/** The current route with the prompt parameter removed, so a refresh does not re-apply it. */
export function stripWorkspacePromptParam(base: string, searchString: string): string {
  const params = new URLSearchParams(searchString);
  params.delete(WORKSPACE_PROMPT_PARAM);
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}
