// Dependency-free preview: node docs/deployment/supabase-email/preview.mjs [outDir]
// Renders every template with sample values (GoTrue/Go-template placeholders only) into /tmp/keyvo-email-preview.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const VALID_VARS = ['ConfirmationURL', 'Data', 'Email', 'NewEmail', 'RedirectTo', 'SendingTo', 'SiteURL', 'Token', 'TokenHash'];
export const SAMPLE = {
  ConfirmationURL: 'https://supabase.keyvo.cn/auth/v1/verify?token=SAMPLE&type=signup&redirect_to=https%3A%2F%2Fapp.keyvo.cn%2Fauth%2Fcallback',
  Email: 'user@example.com', NewEmail: 'new@example.com', SendingTo: 'user@example.com',
  RedirectTo: 'https://app.keyvo.cn/auth/callback?lang=zh&next=%2Fapp', SiteURL: 'https://app.keyvo.cn',
  Token: '123456', TokenHash: 'SAMPLEHASH',
};

export function render(source) {
  return source.replace(/\{\{\s*\.(\w+)(\s*\|\s*urlquery)?\s*\}\}/g, (_, name, quoted) => {
    if (!VALID_VARS.includes(name)) throw new Error(`Unknown GoTrue variable: ${name}`);
    const value = SAMPLE[name] ?? '';
    return quoted ? encodeURIComponent(value) : value;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = new URL('./templates/', import.meta.url);
  const out = process.argv[2] ?? '/tmp/keyvo-email-preview';
  mkdirSync(out, { recursive: true });
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.html'))) {
    writeFileSync(join(out, name), render(readFileSync(new URL(name, dir), 'utf8')));
  }
  console.log(`Rendered to ${out}; open the .html files in a browser (toggle the OS dark mode to check dark styles).`);
}
