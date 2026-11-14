import React from 'react';
import { CurrencyCode, ProductItem, ShowcaseStageItem } from '../types/store';

export function formatMoney(
  usdCents: number,
  currency: CurrencyCode = 'USD',
  inrRate = 84
): string {
  const usd = usdCents / 100;
  if (currency === 'INR') {
    const inr = Math.round(usd * Math.max(1, inrRate));
    return '₹' + inr.toLocaleString('en-IN');
  }
  return (
    '$' +
    usd.toLocaleString('en-US', {
      minimumFractionDigits: usd % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export type FinishId = 'sage' | 'basalt' | 'glacier';
export type SizeLabel = '750 ml' | '950 ml' | '1.2 L';

export const FINISH_META: Record<FinishId, { name: string; dot: string }> = {
  sage: { name: 'Alpine Sage', dot: '#48634B' },
  basalt: { name: 'Basalt Black', dot: '#222624' },
  glacier: { name: 'Glacier Silver', dot: '#B4BDB8' },
};

export const SIZE_OPTIONS: { size: SizeLabel; priceCents: number; scale: number }[] = [
  { size: '750 ml', priceCents: 4200, scale: 0.94 },
  { size: '950 ml', priceCents: 4800, scale: 1.0 },
  { size: '1.2 L', priceCents: 5400, scale: 1.06 },
];

export const SHOWCASE_STAGES: ShowcaseStageItem[] = [
  {
    id: 'stage-1',
    src: 'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-studio.webp',
    alt: 'LIORAVÉ signature piece staged on honed dark basalt slate in an architectural studio',
    title: '01 — Refined Materials',
    sub: 'Thoughtfully selected materials. Distinctive finishes.',
  },
  {
    id: 'stage-2',
    src: 'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-river.webp',
    alt: 'LIORAVÉ studio collection resting on warm natural cedar beside clear water',
    title: '02 — Everyday Luxury',
    sub: 'Designed for effortless, everyday elegance.',
  },
  {
    id: 'stage-3',
    src: 'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-trail.webp',
    alt: 'LIORAVÉ architectural craft resting on sunlit stone overlooking golden meadows',
    title: '03 — Fine Detailing',
    sub: 'Every curve, contour and detail considered.',
  },
  {
    id: 'stage-4',
    src: 'https://www.gstatic.com/aistudio/starter-apps/flask-applet/flask-showcase-lake.webp',
    alt: 'LIORAVÉ silhouette at dusk overlooking calm water',
    title: '04 — Timeless Appeal',
    sub: 'Made to complement every moment, season and occasion.',
  },
];

export function ProductThumb({
  product,
}: {
  product?: Partial<ProductItem> | null;
}) {
  const imgUrl = product?.images?.[0]?.url || SHOWCASE_STAGES[0].src;
  return (
    <img
      src={imgUrl}
      alt={product?.name || 'LIORAVÉ'}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
}
