/**
 * Keyvo does not run on fal. These workspace features have no provider behind them on this
 * deployment (their only executors are fal endpoints), so they are hidden from every entry point
 * and refused at their routes and APIs. The code stays in place so upstream syncs do not conflict.
 * Flip this to false once a provider is wired. Typed as boolean so guarded code stays type-checked.
 */
export const KEYVO_FAL_FEATURES_HIDDEN: boolean = true;

const KEYVO_FAL_TOOL_IDS: ReadonlySet<string> = new Set([
  'upscale',
  'background-removal',
  'restore-video',
  'denoise',
  'fix-blur',
  'smooth-motion',
  'angle',
]);

export function isKeyvoToolDisabled(toolId: string | null | undefined): boolean {
  return KEYVO_FAL_FEATURES_HIDDEN && typeof toolId === 'string' && KEYVO_FAL_TOOL_IDS.has(toolId);
}

/**
 * The workspace model chooser already lists every model of a family (Seedance 2.0, Fast, Mini...), so the
 * separate Variant box repeated it with abbreviated labels. Hidden in the video and image workspaces only;
 * marketing selectors keep it. Flip to false to restore the box.
 */
export const KEYVO_WORKSPACE_VARIANT_HIDDEN: boolean = true;

/**
 * Google sign-in is unreachable from mainland China, so the "Continue with Google" button is not offered on the
 * login page. Email/password (and phone one-time code, once enabled) remain. Typed as boolean so guarded code stays
 * type-checked; flip to false to show the button again.
 */
export const KEYVO_GOOGLE_LOGIN_HIDDEN: boolean = true;

/**
 * Character Recast (Wan 3 Prime video-to-video character swap, "Recast" in Character Studio) cannot be bought on
 * the Keyvo CNY build yet: its quote is built in USD while the wallet is CNY (reserveWalletCharge refuses with
 * currency_mismatch), its estimate/submit paths require a USD quote, and CHARACTER_STUDIO_RECAST_LIVE_ENABLED is
 * not set in production. Until fixed, every customer-facing entry point (Character Studio tab/buttons, landing
 * and home links, pricing hub row, Recast APIs, MCP Recast tools, llms.txt line) is hidden or refused. All code and
 * data stay in place. To reopen: convert the Recast quote to the customer currency in quote-recast.ts, relax the
 * USD-only checks in the estimate route / CharacterStudioRecastTiming / recast-submit, set
 * CHARACTER_STUDIO_RECAST_LIVE_ENABLED=1, then flip this to false.
 */
export const KEYVO_RECAST_HIDDEN: boolean = true;

/** Rule used by guarded code. KEYVO_RECAST_FULL_UI=1 is for tests that exercise Recast itself; it is never set in production. */
export function isKeyvoRecastHidden(): boolean {
  try {
    if (process.env.KEYVO_RECAST_FULL_UI === '1') return false;
  } catch {
    // A plain browser bundle has no `process`; the constant applies.
  }
  return KEYVO_RECAST_HIDDEN;
}

export function isKeyvoAudioDisabled(): boolean {
  return KEYVO_FAL_FEATURES_HIDDEN;
}

/**
 * Voice over is the one audio feature with a mainland provider (MiniMax Speech through api.minimax.cn);
 * music, songs, effects and ambience still only exist on fal. While fal features are hidden, the audio
 * workspace is therefore reduced to MiniMax voice over, and only opens when that provider is configured.
 */
export const KEYVO_AUDIO_VOICE_ONLY: boolean = true;

/** Static part of the rule, safe for client code. */
export function isKeyvoAudioVoiceOnly(): boolean {
  // KEYVO_AUDIO_FULL_UI=1 is for tests that exercise the complete audio workspace; it is never set in production.
  try {
    if (process.env.KEYVO_AUDIO_FULL_UI === '1') return false;
  } catch {
    // A plain browser bundle has no `process`; the rule below applies.
  }
  return KEYVO_FAL_FEATURES_HIDDEN && KEYVO_AUDIO_VOICE_ONLY;
}

export function isMinimaxSpeechConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.MINIMAX_SPEECH_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.MINIMAX_API_KEY?.trim());
}

export function isSeedAudioConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.SEED_AUDIO_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.SEED_AUDIO_API_KEY?.trim());
}

/** The audio workspace, its routes and its APIs: hidden unless voice over is available. */
export function isKeyvoAudioWorkspaceDisabled(env: Record<string, string | undefined> = process.env): boolean {
  if (!KEYVO_FAL_FEATURES_HIDDEN) return false;
  return !(KEYVO_AUDIO_VOICE_ONLY && (isMinimaxSpeechConfigured(env) || isSeedAudioConfigured(env)));
}

/** Voice over with MiniMax or Seed Audio (preset voices only; reference voices have no mainland executor). */
export function isKeyvoAudioRequestAllowed(request: {
  pack?: string | null;
  voiceModel?: string | null;
  hasReference?: boolean;
}): boolean {
  if (!isKeyvoAudioVoiceOnly()) return true;
  return request.pack === 'voice_only'
    && (request.voiceModel === 'minimax' || request.voiceModel === 'seed')
    && !request.hasReference;
}

/** True for a workspace or public path that belongs to a hidden tool or to the audio workspace. */
export function isKeyvoHiddenFeaturePath(href: string | null | undefined): boolean {
  if (typeof href !== 'string') return false;
  const path = href.split(/[?#]/)[0] ?? '';
  const tool = /^(?:\/[a-z]{2})?(?:\/app)?\/tools\/([a-z-]+)\/?$/.exec(path);
  if (tool) return isKeyvoToolDisabled(tool[1]);
  // Public navigation keeps audio out; only the in-app menu offers voice over (components/app/app-navigation.ts),
  // and the audio page and API answer 404 until MiniMax Speech is configured (isKeyvoAudioWorkspaceDisabled).
  return isKeyvoAudioDisabled() && /^(?:\/[a-z]{2})?\/app\/audio(?:\/|$)/.test(path);
}

/**
 * The public MCP server's included trial (the first paid-generation trial funded by the platform) is closed for
 * Keyvo: mainland users cannot use the Claude/Codex hosts the server serves, so the trial has no audience. While true,
 * trial eligibility is never offered, quotes never use trial funding, confirmation refuses trial funding before any
 * reservation, and no public copy claims a trial. Historical trial rows still read normally. MCP paid generation is
 * unaffected. Reopening needs a migration widening the funding CHECK guard plus a ceiling/financial decision; see
 * docs/engineering/keyvo-upstream-deviations.md.
 */
export const KEYVO_MCP_TRIAL_DISABLED: boolean = true;

/**
 * Keyvo does not offer MCP (Model Context Protocol assistants: ChatGPT, Claude, Codex, OpenClaw, n8n connectors) to
 * customers for now: mainland users cannot use the Claude/Codex hosts, and the MCP free trial is already closed. Every
 * customer-facing MCP surface is hidden: the marketing pages and docs (404), navigation/footer/app-menu links, sitemap,
 * route discovery, llms.txt, the Studio Milo dialog footer, the "Connected apps" settings tab and account page, the
 * Studio/Milo/tool marketing links, and the ChatGPT/Claude hand-off on example pages. This is a UI, marketing and
 * discovery hide only: the MCP server, its OAuth/discovery endpoints, tools, reviewed tool policy, publication JSON
 * (`config/mcp-publication.json`), database code and /admin pages are untouched, so internal testing keeps working.
 * To reopen: flip this to false (and set `publicMarketing`/`publicIndexing` in `config/mcp-publication.json`).
 */
export const KEYVO_MCP_UI_HIDDEN: boolean = true;

/** Rule used by guarded code. KEYVO_MCP_FULL_UI=1 is for tests that exercise the MCP surfaces; it is never set in production. */
export function isKeyvoMcpUiHidden(): boolean {
  try {
    if (process.env.KEYVO_MCP_FULL_UI === '1') return false;
  } catch {
    // A plain browser bundle has no `process`; the constant applies.
  }
  return KEYVO_MCP_UI_HIDDEN;
}

/**
 * The zh home page does not show the pricing teaser (kicker "制作预算 / 按镜头核算", the Wan 3 price demo) or the FAQ
 * section ("关于 AI 视频创作的常见问题"). Hidden means absent from the server HTML: no price read starts, the interactive
 * demo is not rendered (so its client chunk is not requested) and the FAQPage JSON-LD is dropped with its visible
 * questions. The /pricing route, the header nav item and all section components stay in place; flip the constants to
 * false to restore either section. Home sections are composed in `app/(localized)/[locale]/(marketing)/(home)/page.tsx`.
 */
export const KEYVO_HOME_PRICING_TEASER_HIDDEN: boolean = true;
export const KEYVO_HOME_FAQ_HIDDEN: boolean = true;

/** KEYVO_HOME_SECTIONS_FULL_UI=1 is for tests that exercise the two home sections; it is never set in production. */
function homeSectionsFullUi(): boolean {
  try {
    return process.env.KEYVO_HOME_SECTIONS_FULL_UI === '1';
  } catch {
    return false;
  }
}

export function isKeyvoHomePricingTeaserHidden(): boolean {
  return KEYVO_HOME_PRICING_TEASER_HIDDEN && !homeSectionsFullUi();
}

export function isKeyvoHomeFaqHidden(): boolean {
  return KEYVO_HOME_FAQ_HIDDEN && !homeSectionsFullUi();
}
