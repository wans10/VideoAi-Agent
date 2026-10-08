import { Calculator } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TextLink } from '@/components/ui/TextLink';

type PricingPreviewSectionProps = {
  description: string;
  generatorHref: string;
  openGeneratorLabel: string;
  title: string;
};

export function PricingPreviewSection({
  description,
  generatorHref,
  openGeneratorLabel,
  title,
}: PricingPreviewSectionProps) {
  return (
    <section className="grid items-center gap-6 rounded-card border border-hairline bg-surface p-5 text-sm text-text-secondary shadow-card sm:p-6">
      <div className="flex gap-4">
        <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] border border-hairline bg-surface-3 text-text-secondary">
          <Calculator className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 max-w-2xl leading-6">{description}</p>
          <TextLink href={generatorHref} prefetch={false} className="mt-3 gap-1 text-sm text-text-primary" linkComponent={Link}>
            {openGeneratorLabel}
          </TextLink>
        </div>
      </div>
    </section>
  );
}
