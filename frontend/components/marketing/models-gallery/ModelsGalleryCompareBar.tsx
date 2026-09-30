import { Link } from '@/i18n/navigation';
import { formatTemplate } from '@/components/marketing/models-gallery-utils';
import type { ModelGalleryCard, ModelsGalleryCompareBarCopy, ModelsGalleryCompareHref } from './models-gallery-types';

type ModelsGalleryCompareBarProps = {
  compareBar: ModelsGalleryCompareBarCopy;
  compareHref: ModelsGalleryCompareHref | null;
  selectedCards: ModelGalleryCard[];
  onClear: () => void;
};

export function ModelsGalleryCompareBar({
  compareBar,
  compareHref,
  selectedCards,
  onClear,
}: ModelsGalleryCompareBarProps) {
  return (
    <div className="studio-model-compare-tray">
      <div className="relative flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="font-semibold text-text-primary">
          {selectedCards.length === 2
            ? formatTemplate(compareBar.selectedTemplate, {
                left: selectedCards[0]?.label ?? '',
                right: selectedCards[1]?.label ?? '',
              })
            : compareBar.selectTwo}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-text-secondary transition hover:border-text-muted hover:text-text-primary"
          >
            {compareBar.clear}
          </button>
          {compareHref ? (
            <Link
              href={compareHref}
              prefetch={false}
              className="rounded-full bg-text-primary px-4 py-1 text-xs font-semibold text-bg transition hover:opacity-90"
            >
              {compareBar.compare}
            </Link>
          ) : (
            <span className="rounded-full border border-hairline px-4 py-1 text-xs font-semibold text-text-muted">
              {compareBar.compare}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
