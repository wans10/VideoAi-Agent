#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mcpPublication from '../frontend/config/mcp-publication.json';
import { getMcpPublicationState } from '../frontend/lib/mcp-publication';
import { buildLlmsText } from '../frontend/lib/seo/llms-text';

const REQUIRED_URLS = [
  'https://app.keyvo.cn/',
  'https://app.keyvo.cn/pay-as-you-go-ai-video-generator',
  'https://app.keyvo.cn/pricing',
  'https://app.keyvo.cn/models',
  'https://app.keyvo.cn/examples',
  'https://app.keyvo.cn/ai-video-engines',
  'https://app.keyvo.cn/ai-video-engines/best-for',
  'https://app.keyvo.cn/blog',
  'https://app.keyvo.cn/docs',
  'https://app.keyvo.cn/models/veo-3-1',
  'https://app.keyvo.cn/models/kling-3-pro',
  'https://app.keyvo.cn/models/minimax-h3',
  'https://app.keyvo.cn/models/minimax-h3-max',
  'https://app.keyvo.cn/models/seedance-2-5',
  'https://app.keyvo.cn/legal/privacy',
  'https://app.keyvo.cn/legal/terms',
];

const MCP_SOURCE_URLS = [
  'https://app.keyvo.cn/mcp',
  'https://app.keyvo.cn/integrations/chatgpt',
  'https://app.keyvo.cn/integrations/claude',
  'https://app.keyvo.cn/integrations/codex',
  'https://app.keyvo.cn/docs/mcp',
];

const ENABLED_PUBLICATION = {
  publicMarketing: true,
  publicIndexing: true,
  transport: true,
  oauth: true,
  discovery: true,
  paidGeneration: true,
  trial: true,
  referenceUploads: true,
  montagePreparation: false,
};

const FORBIDDEN_EXACT_URLS = [
  'https://app.keyvo.cn/models/veo-3-fast',
  'https://app.keyvo.cn/models/kling',
  'https://app.keyvo.cn/privacy',
  'https://app.keyvo.cn/terms',
  'https://app.keyvo.cn/models/sora-2',
  'https://app.keyvo.cn/models/sora-2-pro',
  'https://app.keyvo.cn/ai-video-engines/grok-imagine-video-1-5-vs-sora-2',
];

const FORBIDDEN_URL_PATTERNS = [
  /http:\/\/app\.keyvo\.cn(?:\/|\b)/,
  /https:\/\/www\.app\.keyvo\.cn(?:\/|\b)/,
  /https:\/\/api\.app\.keyvo\.cn(?:\/|\b)/,
];

const PRIVATE_PATH_PATTERNS = [
  /https:\/\/app\.keyvo\.cn\/api(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/admin(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/app(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/billing(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/settings(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/dashboard(?:\/|\b)/,
  /https:\/\/app\.keyvo\.cn\/jobs(?:\/|\b)/,
];

const ALLOWED_EXTERNAL_URLS = new Set([
  'https://llmstxt.org/',
  'https://github.com/camgraphe/maxvideoai-plugin',
]);

export function validateLlmsSourceUrls(candidates: string[]): string[] {
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };

  for (const candidate of candidates) {
    for (const pattern of PRIVATE_PATH_PATTERNS) {
      assert(!pattern.test(candidate), `Private or app URL must not be listed in llms.txt: ${pattern}`);
    }
    for (const pattern of FORBIDDEN_URL_PATTERNS) {
      assert(!pattern.test(candidate), `Forbidden noncanonical llms.txt URL pattern found: ${pattern}`);
    }
    const listedUrls = (candidate.match(/https?:\/\/[^\s)]+/g) ?? []).map((url) => url.replace(/[.,;]+$/, ''));
    const listedUrlSet = new Set(listedUrls);
    for (const url of FORBIDDEN_EXACT_URLS) {
      assert(!listedUrlSet.has(url), `Forbidden stale llms.txt URL found: ${url}`);
    }
    for (const url of listedUrls) {
      assert(
        url.startsWith('https://app.keyvo.cn/') || ALLOWED_EXTERNAL_URLS.has(url),
        `External or noncanonical URL in llms.txt: ${url}`,
      );
    }
  }

  return errors;
}

export function collectLlmsGuardErrors(): string[] {
  const errors: string[] = [];
  const assert = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };

  const source = buildLlmsText(mcpPublication);
  const enabledSource = buildLlmsText(ENABLED_PUBLICATION);
  const sourceIsIndexable = getMcpPublicationState(mcpPublication).indexable;

  for (const url of REQUIRED_URLS) {
    assert(source.includes(url), `Missing required llms.txt URL: ${url}`);
  }
  for (const url of MCP_SOURCE_URLS) {
    const sourceCount = source.split(url).length - 1;
    assert(
      sourceIsIndexable ? sourceCount === 1 : sourceCount === 0,
      sourceIsIndexable
        ? `Published MCP source must appear exactly once: ${url}`
        : `Gated MCP source must be absent while indexable=false: ${url}`,
    );
    assert(enabledSource.split(url).length - 1 === 1, `Enabled MCP source must appear exactly once: ${url}`);
  }
  errors.push(...validateLlmsSourceUrls([source, enabledSource]));
  return errors;
}

function runLlmsGuard(): void {
  const errors = collectLlmsGuardErrors();
  if (errors.length) {
    console.error('llms-guard: FAILED');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('llms-guard: OK');
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) runLlmsGuard();
