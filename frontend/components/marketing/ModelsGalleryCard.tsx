'use client';

import { ArrowRight, Images, Scale } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { EngineIcon } from '@/components/ui/EngineIcon';
import type {
  ModelGalleryCard,
  ModelsGalleryCardActionsCopy,
  ModelsGalleryCopy,
} from './models-gallery/models-gallery-types';
import {
  formatTemplate,
  getCapabilityIcon,
  normalizeCtaLabel,
} from './models-gallery-utils';

export function ModelCard({
  card,
  ctaLabel,
  cardActions,
  compareMode,
  compareLabel,
  compareTooltip,
  compareAria,
  strengthsLabel,
  statsLabels,
  capabilityTooltips,
  audioAvailableLabel,
  compareEnabled,
  selected,
  onToggle,
  onActivateCompare,
}: {
  card: ModelGalleryCard;
  ctaLabel: string;
  cardActions: ModelsGalleryCardActionsCopy;
  compareMode: boolean;
  compareLabel: string;
  compareTooltip: string;
  compareAria: string;
  strengthsLabel: string;
  statsLabels: Required<NonNullable<ModelsGalleryCopy['stats']>>;
  capabilityTooltips: Record<string, string>;
  audioAvailableLabel: string;
  compareEnabled: boolean;
  selected: boolean;
  onToggle: () => void;
  onActivateCompare: () => void;
}) {
  const router = useRouter();
  type RouterPushInput = Parameters<typeof router.push>[0];
  const normalizedCtaLabel = normalizeCtaLabel(ctaLabel);
  const ctaText = normalizedCtaLabel.replace(/\s*→\s*$/, '');
  const viewSpecsText = cardActions.viewSpecs || ctaText;
  const viewSpecsAria = formatTemplate(cardActions.viewSpecsAria, { engine: card.label });
  const compareActionAria = formatTemplate(cardActions.compareAria, { engine: card.label });
  const examplesAria = formatTemplate(cardActions.examplesAria, { engine: card.label });
  const canCompareCard = compareEnabled && !card.compareDisabled;
  const showCompareAction = canCompareCard && Boolean(card.compareHref);
  const showCompareModeAction = canCompareCard && !card.compareHref;
  const scoreValue = typeof card.overallScore === 'number' ? card.overallScore.toFixed(1) : null;
  const capabilityItems = [...(card.capabilities ?? [])];
  if (card.filterMeta?.lipSync && !capabilityItems.includes('Lip sync')) {
    capabilityItems.push('Lip sync');
  }
  if (card.audioAvailable && !capabilityItems.includes('Audio')) {
    capabilityItems.push('Audio');
  }
  const visibleCapabilities = capabilityItems.slice(0, 6);
  const handleCompareToggle = (event: React.MouseEvent | React.ChangeEvent) => {
    event.stopPropagation();
    if (!canCompareCard) return;
    if (!compareMode) {
      onActivateCompare();
    }
    onToggle();
  };
  const handleClick = () => {
    if (compareMode) {
      if (canCompareCard) onToggle();
      return;
    }
    router.push(card.href as RouterPushInput);
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (compareMode) {
        if (canCompareCard) onToggle();
        return;
      }
      router.push(card.href as RouterPushInput);
    }
  };
  return (
    <article className={`studio-model-record ${selected ? 'is-selected' : ''}`}
      tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}
      aria-label={`${normalizedCtaLabel} ${card.label}`}>
      <header className="studio-model-record-heading">
        <div className="studio-model-provider">
          <EngineIcon engine={{ id: card.engineId ?? card.id, label: card.label, brandId: card.brandId ?? undefined }} size={24} framed rounded="full" />
          <span>{card.provider}</span>
        </div>
        {scoreValue ? <p className="studio-model-score"><strong>{scoreValue}</strong><span>/ 10</span></p> : null}
      </header>
      <h3>{card.label}</h3>
      <p className="studio-model-description">{card.description}</p>
      {card.strengths?.length ? <p className="studio-model-strengths"><b>{strengthsLabel}</b> {card.strengths.join(' · ')}</p> : null}
      {card.stats ? <dl className="studio-model-specs">
        <div><dt>{statsLabels.from}</dt><dd>{card.stats.priceFrom ?? '—'}</dd></div>
        <div><dt>{card.statsLabels?.duration ? statsLabels.typeLong : statsLabels.maxDurLong}</dt><dd>{card.stats.maxDuration ?? '—'}</dd></div>
        <div><dt>{statsLabels.maxResLong}</dt><dd>{card.stats.maxResolution ?? '—'}</dd></div>
      </dl> : null}
      <div className="studio-model-capabilities">
        {visibleCapabilities.map((cap) => {
          const tooltip = cap === 'Audio' ? audioAvailableLabel : capabilityTooltips[cap] ?? cap;
          const CapabilityIcon = getCapabilityIcon(cap);
          return <span key={cap} title={tooltip} aria-label={tooltip}><CapabilityIcon size={14} aria-hidden />{tooltip}</span>;
        })}
      </div>
      {card.priceNote ? <p className="studio-model-note">{card.priceNoteHref ? <Link href={card.priceNoteHref} prefetch={false} onClick={event => event.stopPropagation()}>{card.priceNote}</Link> : card.priceNote}</p> : null}
      <footer className="studio-model-actions">
        {compareMode && canCompareCard ? <label title={compareTooltip} onClick={event => event.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={handleCompareToggle} onClick={event => event.stopPropagation()} aria-label={formatTemplate(compareAria, { engine: card.label })} />{compareLabel}
        </label> : null}
        <Link href={card.href} prefetch={false} aria-label={viewSpecsAria} onClick={event => event.stopPropagation()} className="studio-model-primary">
          {viewSpecsText}<span className="sr-only"> — {card.label}</span><ArrowRight size={16} aria-hidden />
        </Link>
        {!compareMode && showCompareAction ? <Link href={card.compareHref!} prefetch={false} aria-label={compareActionAria} onClick={event => event.stopPropagation()}><Scale size={16} aria-hidden />{cardActions.compare}</Link> : null}
        {!compareMode && showCompareModeAction ? <button type="button" aria-label={compareActionAria} onClick={handleCompareToggle}><Scale size={16} aria-hidden />{cardActions.compare}</button> : null}
        {!compareMode && card.examplesHref ? <Link href={card.examplesHref} prefetch={false} aria-label={examplesAria} onClick={event => event.stopPropagation()}><Images size={16} aria-hidden />{cardActions.examples}</Link> : null}
      </footer>
    </article>
  );
}
