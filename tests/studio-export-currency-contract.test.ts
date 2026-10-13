import test from 'node:test';
import assert from 'node:assert/strict';
import { studioPreparedExportSchema, studioExportAcknowledgementSchema } from '../frontend/lib/studio/conversation-export-contract';
import { estimateTimelineExportPrice } from '../frontend/src/server/timeline-exports/pricing';

const quote = {
  quoteId: '11111111-1111-4111-8111-111111111111', exportId: `tlx_${'a'.repeat(64)}`,
  projectId: 'film', sequenceId: 'main', revision: 2, durationSec: 4, resolution: '720p',
  aspectRatio: '16:9', fps: 30, qualityPreset: 'draft', includeAudio: true,
  price: { amountCents: 0, currency: 'CNY', billingKind: 'free' },
  expiresAt: '2099-01-01T00:00:00.000Z', confirmationRequired: true,
};

for (const currency of ['CNY', 'USD']) {
  test(`${currency} quotes and recovered billing survive the shared wire contract`, () => {
    assert.equal(studioPreparedExportSchema.parse({ ...quote, price: { ...quote.price, currency } }).price.currency, currency);
    const result = studioExportAcknowledgementSchema.parse({ ok: true, result: {
      ok: true, reused: true, export: { id: quote.exportId, status: 'queued', progress: 0,
        message: null, artifact: null, billing: { amountCents: 64, currency, billingKind: 'paid' } },
    } });
    assert.equal(result.result.export.billing?.currency, currency);
  });
}
test('the configured export price is accepted without converting its amount or currency', () => {
  const price = estimateTimelineExportPrice({ durationSec: 4, resolution: '720p', fps: 30,
    qualityPreset: 'draft', freeExportsRemaining: 0 });
  const parsed = studioPreparedExportSchema.parse({ ...quote, price: {
    amountCents: price.amountCents, currency: price.currency, billingKind: price.billingKind,
  } });
  assert.equal(parsed.price.amountCents, price.amountCents);
  assert.equal(parsed.price.currency, price.currency);
  assert.throws(() => studioPreparedExportSchema.parse({ ...quote, price: { ...quote.price, currency: 'EUR' } }));
});
