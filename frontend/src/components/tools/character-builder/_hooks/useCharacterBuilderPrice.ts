import useSWR from 'swr';
import { authFetch } from '@/lib/authFetch';
import { NANO21_ENGINE_ID } from '@/lib/nano-banana-2-1';
import { readCharacterBuilderEstimate } from '../_lib/character-builder-price';

export type CharacterPriceStatus = 'loading' | 'error' | 'ready';

export function useCharacterBuilderPrice(resolution: string, referenceCount: number) {
  const { data, error, isValidating, mutate } = useSWR(
    ['/api/images/estimate', NANO21_ENGINE_ID, resolution, referenceCount] as const,
    async ([url, engineId, size, refs]) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await authFetch(url, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ engineId, resolution: size, mode: refs ? 'i2i' : 't2i', referenceImageCount: refs, numImages: 1 }),
        });
        const estimate = readCharacterBuilderEstimate(await response.json().catch(() => null));
        if (!response.ok || !estimate) throw new Error('PRICE_UNAVAILABLE');
        return estimate;
      } finally { clearTimeout(timeout); }
    },
    { keepPreviousData: false, shouldRetryOnError: false },
  );
  const status: CharacterPriceStatus = isValidating ? 'loading' : error ? 'error' : data ? 'ready' : 'loading';
  // A previous amount must not enable generation while its replacement is pending or failed.
  return { displayedPrice: status === 'ready' ? data : undefined, status, refreshPrice: () => mutate().catch(() => undefined) };
}
