#!/usr/bin/env node

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mcpPublication from '../frontend/config/mcp-publication.json';
import { getMcpPublicationState } from '../frontend/lib/mcp-publication';
import { buildLlmsText } from '../frontend/lib/seo/llms-text';

const REQUIRED_URLS = [
  'https://videoai.omninodetech.com/',
  'https://videoai.omninodetech.com/pay-as-you-go-ai-video-generator',
  'https://videoai.omninodetech.com/pricing',
  'https://videoai.omninodetech.com/models',
  'https://videoai.omninodetech.com/examples',
  'https://videoai.omninodetech.com/ai-video-engines',
  'https://videoai.omninodetech.com/ai-video-engines/best-for',
  'https://videoai.omninodetech.com/blog',
  'https://videoai.omninodetech.com/docs',
  'https://videoai.omninodetech.com/models/veo-3-1',
  'https://videoai.omninodetech.com/models/kling-3-pro',
  'https://videoai.omninodetech.com/models/minimax-h3',
  'https://videoai.omninodetech.com/models/minimax-h3-max',
  'https://videoai.omninodetech.com/models/seedance-2-5',
  'https://videoai.omninodetech.com/legal/privacy',
  'https://videoai.omninodetech.com/legal/terms',
];

const MCP_SOURCE_URLS = [
  'https://videoai.omninodetech.com/mcp',
  'https://videoai.omninodetech.com/integrations/chatgpt',
  'https://videoai.omninodetech.com/integrations/claude',
  'https://videoai.omninodetech.com/integrations/codex',
  'https://videoai.omninodetech.com/docs/mcp',
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
  'https://videoai.omninodetech.com/models/veo-3-fast',
  'https://videoai.omninodetech.com/models/kling',
  'https://videoai.omninodetech.com/privacy',
  'https://videoai.omninodetech.com/terms',
  'https://videoai.omninodetech.com/models/sora-2',
  'https://videoai.omninodetech.com/models/sora-2-pro',
  'https://videoai.omninodetech.com/ai-video-engines/grok-imagine-video-1-5-vs-sora-2',
];

const FORBIDDEN_URL_PATTERNS = [
  /http:\/\/videoai\.omninodetech\.com(?:\/|\b)/,
  /https:\/\/www\.videoai\.omninodetech\.com(?:\/|\b)/,
  /https:\/\/api\.videoai\.omninodetech\.com(?:\/|\b)/,
];

const PRIVATE_PATH_PATTERNS = [
  /https:\/\/videoai\.omninodetech\.com\/api(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/admin(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/app(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/billing(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/settings(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/dashboard(?:\/|\b)/,
  /https:\/\/videoai\.omninodetech\.com\/jobs(?:\/|\b)/,
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
        url.startsWith('https://videoai.omninodetech.com/') || ALLOWED_EXTERNAL_URLS.has(url),
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
