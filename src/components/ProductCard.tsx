import React from 'react';
import { Heart } from 'lucide-react';
import { ProductItem } from '../types/store';
import { useStore } from '../context/StoreContext';
import { ProductThumb } from '../lib/icons';

export function ProductCard({ product }: { product: ProductItem }) {
  const { openProduct, quickAdd, toggleWishlist, isWishlisted, formatPrice } =
    useStore();
  const wished = isWishlisted(product.id);
  const firstVariant =
    product.variants.find((v) => v.isActive && v.stockQty > 0) ||
    product.variants[0];
  const minPriceCents = product.variants.length
    ? Math.min(...product.variants.map((v) => v.priceCents))
    : product.basePriceCents;
  const uniqueFinishes = Array.from(
    new Map(product.variants.map((v) => [v.finishName, v.finishHex])).entries()
  );

  return (
    <article className="mf-card">
      <div
        className="mf-prod-media"
        onClick={() => openProduct(product.slug)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openProduct(product.slug);
        }}
      >
        <ProductThumb product={product} />
        {product.tag && <span className="mf-prod-tag">{product.tag}</span>}
        <button
          type="button"
          className={`mf-prod-wish ${wished ? 'active' : ''}`}
          aria-label="Save to wishlist"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(product.id, firstVariant?.id);
          }}
        >
          <Heart size={15} fill={wished ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="mf-prod-body">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="mf-mono">
            {product.category?.name || 'Insulated Flask'}
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {uniqueFinishes.slice(0, 3).map(([name, hex]) => (
              <span
                key={name}
                title={name}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: hex,
                  border: '1px solid var(--border)',
                }}
              />
            ))}
          </div>
        </div>

        <h3
          className="mf-prod-title"
          onClick={() => openProduct(product.slug)}
        >
          {product.name}
        </h3>

        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--ink-muted)',
            marginTop: '4px',
            minHeight: '36px',
          }}
        >
          {product.subtitle}
        </p>

        <div className="mf-prod-price-row">
          <div>
            <strong>{formatPrice(minPriceCents)}</strong>
            {product.mrpCents && product.mrpCents > minPriceCents && (
              <span className="mf-strike">{formatPrice(product.mrpCents)}</span>
            )}
          </div>
          <button
            type="button"
            className="mf-btn mf-btn-outline mf-btn-sm"
            onClick={() => quickAdd(product)}
          >
            + Add
          </button>
        </div>
      </div>
    </article>
  );
}
