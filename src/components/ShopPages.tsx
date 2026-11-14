import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Gift, Heart, Ruler, Star, X, ZoomIn } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductItem } from '../types/store';
import { ProductCard } from './ProductCard';
import { formatMoney, SHOWCASE_STAGES } from '../lib/icons';

export function ShopPage() {
  const {
    products,
    categories,
    activeShopCategory,
    setActiveShopCategory,
    currency,
    siteContent,
  } = useStore();

  const inrRate = siteContent.inrRate || 84;
  const [searchTerm, setSearchTerm] = useState('');
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(100);
  const [sortBy, setSortBy] = useState<string>('featured');

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeShopCategory && activeShopCategory !== 'all') {
      list = list.filter(
        (p) =>
          p.category?.name.toLowerCase() === activeShopCategory.toLowerCase() ||
          p.category?.slug.toLowerCase() === activeShopCategory.toLowerCase()
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    list = list.filter((p) => p.basePriceCents <= maxPriceUsd * 100);

    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.basePriceCents - b.basePriceCents);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.basePriceCents - a.basePriceCents);
    } else if (sortBy === 'popularity') {
      list.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }
    return list;
  }, [products, activeShopCategory, searchTerm, maxPriceUsd, sortBy]);

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '80px' }}>
      <div className="mf-container">
        <div style={{ marginBottom: '36px' }}>
          <span className="mf-mono">Catalog</span>
          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 700,
              marginTop: '6px',
            }}
          >
            {activeShopCategory || 'All LIORAVÉ Pieces'}
          </h1>
        </div>

        <div className="mf-shop-layout">
          <aside className="mf-filters">
            <div className="mf-filter-group">
              <span className="mf-mono">Search</span>
              <input
                className="mf-input"
                style={{ marginTop: '8px' }}
                placeholder="Filter by keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="mf-filter-group">
              <span className="mf-mono">Category</span>
              <div style={{ marginTop: '8px' }}>
                <div
                  className="mf-filter-row"
                  onClick={() => setActiveShopCategory(null)}
                  style={{
                    fontWeight: !activeShopCategory ? 700 : 400,
                    color: !activeShopCategory ? 'var(--accent)' : 'inherit',
                  }}
                >
                  <span>All Products</span>
                  <span className="mf-mono">{products.length}</span>
                </div>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="mf-filter-row"
                    onClick={() => setActiveShopCategory(cat.name)}
                    style={{
                      fontWeight: activeShopCategory === cat.name ? 700 : 400,
                      color:
                        activeShopCategory === cat.name
                          ? 'var(--accent)'
                          : 'inherit',
                    }}
                  >
                    <span>{cat.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mf-filter-group">
              <span className="mf-mono">
                Max Price:{' '}
                {currency === 'INR'
                  ? `${formatMoney(maxPriceUsd * 100, 'INR', inrRate)} (${formatMoney(maxPriceUsd * 100, 'USD', inrRate)})`
                  : `${formatMoney(maxPriceUsd * 100, 'USD', inrRate)} (${formatMoney(maxPriceUsd * 100, 'INR', inrRate)})`}
              </span>
              <input
                type="range"
                min={15}
                max={100}
                value={maxPriceUsd}
                onChange={(e) => setMaxPriceUsd(Number(e.target.value))}
                style={{ width: '100%', marginTop: '10px', accentColor: 'var(--accent)' }}
              />
            </div>

            <button
              type="button"
              className="mf-btn mf-btn-outline mf-btn-sm mf-btn-block"
              style={{ marginTop: '12px' }}
              onClick={() => {
                setActiveShopCategory(null);
                setSearchTerm('');
                setMaxPriceUsd(100);
                setSortBy('featured');
              }}
            >
              Reset Filters
            </button>
          </aside>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '22px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <span className="mf-mono">{filtered.length} Pieces Found</span>
              <select
                className="mf-select"
                style={{ width: 'auto', minWidth: '180px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Sort: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popularity">Most Reviewed</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '56px 24px',
                  textAlign: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p style={{ color: 'var(--ink-muted)' }}>
                  No products matched the selected filters.
                </p>
              </div>
            ) : (
              <div className="mf-grid-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export function ShopNowPage() {
  return <ShopPage />;
}

export function CollectionsPage() {
  const { categories, shopByCategory } = useStore();

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '80px' }}>
      <div className="mf-container">
        <span className="mf-mono">Collections</span>
        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: 700,
            marginTop: '6px',
            marginBottom: '36px',
          }}
        >
          Engineered by Environment
        </h1>

        <div className="mf-grid-2">
          {categories.map((cat, idx) => (
            <article
              key={cat.id}
              className="mf-card"
              style={{ cursor: 'pointer' }}
              onClick={() => shopByCategory(cat.name)}
            >
              <div className="mf-prod-media" style={{ aspectRatio: '16 / 10' }}>
                <img
                  src={cat.imageUrl || SHOWCASE_STAGES[idx % SHOWCASE_STAGES.length].src}
                  alt={cat.name}
                />
              </div>
              <div className="mf-prod-body">
                <span className="mf-mono">Collection 0{idx + 1}</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
                  {cat.name}
                </h2>
                <p style={{ color: 'var(--ink-muted)', marginTop: '6px', fontSize: '0.92rem' }}>
                  {cat.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const {
    products,
    apiFetch,
    cart,
    addToBag,
    setGiftWrap,
    setCartOpen,
    toggleWishlist,
    isWishlisted,
    formatPrice,
    siteContent,
    navigate,
    user,
    showToast,
    subscribeRealtime,
  } = useStore();

  const [detail, setDetail] = useState<ProductItem | null>(() =>
    products.find((p) => p.slug === slug) || null
  );
  const [loading, setLoading] = useState(!detail);
  const [selectedFinish, setSelectedFinish] = useState('');
  const [qty, setQty] = useState(1);
  const [giftWrapSelected, setGiftWrapSelected] = useState(() => Boolean(cart.giftWrap));
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setQty(1);
    setActiveImageIdx(0);
    setIsZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setSizeGuideOpen(false);
    window.scrollTo(0, 0);
    apiFetch<ProductItem>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!active) return;
        setDetail(res);
        if (res.variants.length > 0) {
          setSelectedFinish(res.variants[0].finishName);
        }
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, apiFetch]);

  useEffect(() => {
    let active = true;
    return subscribeRealtime((ev) => {
      if (
        ev.type === 'catalog:updated' ||
        ev.type === 'connected'
      ) {
        if (
          ev.type === 'catalog:updated' &&
          ev.productId &&
          detail?.id &&
          ev.productId !== detail.id
        ) {
          return;
        }
        apiFetch<ProductItem>(`/api/products/${encodeURIComponent(slug)}`)
          .then((res) => {
            if (active) setDetail(res);
          })
          .catch(() => {});
      }
    });
  }, [slug, detail?.id, apiFetch, subscribeRealtime]);

  useEffect(() => {
    if (detail && detail.variants.length > 0 && !selectedFinish) {
      setSelectedFinish(detail.variants[0].finishName);
    }
  }, [detail, selectedFinish]);

  useEffect(() => {
    setGiftWrapSelected(Boolean(cart.giftWrap));
  }, [cart.giftWrap]);

  useEffect(() => {
    if (!sizeGuideOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSizeGuideOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sizeGuideOpen]);

  const relatedProducts = useMemo(() => {
    if (!detail) return [];
    const others = products.filter(
      (p) => p.id !== detail.id && p.isActive !== false
    );
    const sameCategory = others.filter(
      (p) =>
        (detail.categoryId != null && p.categoryId === detail.categoryId) ||
        (detail.category?.slug && p.category?.slug === detail.category.slug)
    );
    const remaining = others.filter(
      (p) => !sameCategory.some((sc) => sc.id === p.id)
    );
    return [...sameCategory, ...remaining].slice(0, 4);
  }, [products, detail]);

  if (loading && !detail) {
    return (
      <main style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <div className="mf-container">
          <p className="mf-mono">Loading product...</p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main style={{ paddingTop: '120px', paddingBottom: '80px' }}>
        <div className="mf-container">
          <h1>Product not found</h1>
          <button
            type="button"
            className="mf-btn mf-btn-outline"
            style={{ marginTop: '16px' }}
            onClick={() => navigate('/shop')}
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  const finishes = Array.from(
    new Map(detail.variants.map((v) => [v.finishName, v.finishHex])).entries()
  );

  const activeVariant =
    detail.variants.find((v) => v.finishName === selectedFinish) ||
    detail.variants[0];

  const priceCents = activeVariant?.priceCents ?? detail.basePriceCents;
  const wished = isWishlisted(detail.id);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBody.trim()) return;
    setSubmittingReview(true);
    try {
      await apiFetch(`/api/products/${detail.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          authorName: user?.name || reviewName.trim() || 'Verified Customer',
          rating: reviewRating,
          title: reviewTitle.trim(),
          body: reviewBody.trim(),
        }),
      });
      const updated = await apiFetch<ProductItem>(
        `/api/products/${encodeURIComponent(slug)}`
      );
      setDetail(updated);
      setReviewTitle('');
      setReviewBody('');
      showToast('Review submitted');
    } catch (err: any) {
      showToast(err.message || 'Could not save review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <main style={{ paddingTop: '104px', paddingBottom: '80px' }}>
      <div className="mf-container">
        <button
          type="button"
          className="mf-btn mf-btn-outline mf-btn-sm"
          style={{ marginBottom: '24px' }}
          onClick={() => navigate('/shop')}
        >
          <ArrowLeft size={14} /> Back to Shop
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '48px',
            alignItems: 'start',
          }}
        >
          <div>
            <div
              className={`mf-zoom-frame ${isZoomed ? 'is-zoomed' : ''}`}
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => {
                setIsZoomed(false);
                setZoomOrigin({ x: 50, y: 50 });
              }}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
                setZoomOrigin({ x, y });
                if (!isZoomed) setIsZoomed(true);
              }}
              onClick={() => setIsZoomed((z) => !z)}
              role="img"
              aria-label={`${detail.name} — hover or tap to zoom`}
            >
              <img
                src={
                  detail.images?.[activeImageIdx]?.url ||
                  detail.images?.[0]?.url ||
                  SHOWCASE_STAGES[0].src
                }
                alt={detail.images?.[activeImageIdx]?.altText || detail.name}
                className="mf-zoom-img"
                style={{
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                }}
              />
              <span className="mf-zoom-badge">
                <ZoomIn size={13} /> Hover to inspect
              </span>
            </div>

            {detail.images && detail.images.length > 1 && (
              <div className="mf-zoom-thumbs">
                {detail.images.map((img, idx) => (
                  <button
                    key={img.id || img.url + idx}
                    type="button"
                    className={`mf-zoom-thumb ${activeImageIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveImageIdx(idx);
                      setIsZoomed(false);
                    }}
                    aria-label={`View image ${idx + 1} of ${detail.name}`}
                  >
                    <img src={img.url} alt={img.altText || detail.name} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className="mf-mono">
              {detail.category?.name || 'LIORAVÉ'} · {detail.rating} ★ ({detail.reviewsCount} reviews)
            </span>
            <h1
              style={{
                fontSize: 'clamp(1.85rem, 3.5vw, 2.75rem)',
                fontWeight: 700,
                marginTop: '8px',
              }}
            >
              {detail.name}
            </h1>
            {detail.subtitle && (
              <p style={{ color: 'var(--ink-muted)', marginTop: '10px', fontSize: '1.02rem' }}>
                {detail.subtitle}
              </p>
            )}

            <div style={{ marginTop: '20px', fontSize: '1.75rem', fontWeight: 700 }}>
              {formatPrice(priceCents)}
              {detail.mrpCents && detail.mrpCents > priceCents && (
                <span className="mf-strike" style={{ fontSize: '1.05rem' }}>
                  {formatPrice(detail.mrpCents)}
                </span>
              )}
            </div>

            {finishes.length > 0 ? (
              <div style={{ marginTop: '24px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="mf-mono">
                    Color: {selectedFinish || activeVariant?.finishName}
                  </span>
                  {siteContent.sizeGuideEnabled !== false && (
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: 'var(--mono)',
                        fontSize: '0.74rem',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--accent)',
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      <Ruler size={14} />
                      <span>Size Guide</span>
                    </button>
                  )}
                </div>
                <div className="mf-swatches" style={{ marginTop: '10px' }}>
                  {finishes.map(([fname, hex]) => (
                    <button
                      key={fname}
                      type="button"
                      className={`mf-swatch ${selectedFinish === fname ? 'active' : ''}`}
                      onClick={() => setSelectedFinish(fname)}
                    >
                      <span className="mf-swatch-dot" style={{ background: hex }} />
                      {fname}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              siteContent.sizeGuideEnabled !== false && (
                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'var(--mono)',
                      fontSize: '0.74rem',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    <Ruler size={14} />
                    <span>Size Guide</span>
                  </button>
                </div>
              )
            )}

            {siteContent.giftWrapEnabled !== false && (
              <label
                className="mf-spec-cell"
                style={{
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  borderColor: giftWrapSelected ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <input
                  type="checkbox"
                  checked={giftWrapSelected}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setGiftWrapSelected(checked);
                    if (cart.items.length > 0) {
                      try {
                        await setGiftWrap(checked);
                      } catch {
                        // revert if request fails
                        setGiftWrapSelected(!checked);
                      }
                    }
                  }}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--accent)' }}
                />
                <Gift size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    Gift Wrap (+{formatPrice(siteContent.giftWrapPriceCents ?? 500)})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                    Add signature presentation box, satin ribbon &amp; keepsake note card.
                  </div>
                </div>
              </label>
            )}

            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--surface-elevated)',
                  padding: '4px',
                }}
              >
                <button
                  type="button"
                  className="mf-icon-btn"
                  style={{ border: 'none' }}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  -
                </button>
                <span className="mf-mono" style={{ padding: '0 10px' }}>
                  {qty}
                </span>
                <button
                  type="button"
                  className="mf-icon-btn"
                  style={{ border: 'none' }}
                  onClick={() =>
                    setQty((q) =>
                      Math.min(Math.max(1, activeVariant?.stockQty || 10), q + 1)
                    )
                  }
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="mf-btn mf-btn-primary"
                disabled={!activeVariant || activeVariant.stockQty <= 0}
                onClick={async () => {
                  if (!activeVariant) return;
                  await addToBag(
                    detail.id,
                    activeVariant.id,
                    qty,
                    siteContent.giftWrapEnabled !== false ? giftWrapSelected : undefined
                  );
                  setCartOpen(true);
                }}
              >
                {activeVariant && activeVariant.stockQty > 0
                  ? 'Add to Bag'
                  : 'Out of Stock'}
              </button>

              <button
                type="button"
                className="mf-btn mf-btn-accent"
                disabled={!activeVariant || activeVariant.stockQty <= 0}
                onClick={async () => {
                  if (!activeVariant) return;
                  await addToBag(
                    detail.id,
                    activeVariant.id,
                    qty,
                    siteContent.giftWrapEnabled !== false ? giftWrapSelected : undefined
                  );
                  navigate('/checkout');
                }}
              >
                COD Checkout
              </button>

              <button
                type="button"
                className="mf-icon-btn"
                style={{ height: '44px', padding: '0 16px' }}
                onClick={() => toggleWishlist(detail.id, activeVariant?.id)}
              >
                <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="mf-mono" style={{ marginTop: '14px' }}>
              {activeVariant
                ? `${activeVariant.stockQty} units ready to ship · Cash or Online Pay on Delivery`
                : ''}
            </div>

            <div className="mf-spec-table" style={{ marginTop: '28px' }}>
              <div className="mf-spec-cell">
                <span className="mf-mono">Color</span>
                <div
                  style={{
                    fontWeight: 600,
                    marginTop: '4px',
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {activeVariant?.finishHex && (
                    <span
                      className="mf-swatch-dot"
                      style={{ background: activeVariant.finishHex, flexShrink: 0 }}
                    />
                  )}
                  <span>
                    {selectedFinish ||
                      activeVariant?.finishName ||
                      detail.specs?.Color ||
                      detail.specs?.color ||
                      'Signature Finish'}
                  </span>
                </div>
              </div>

              <div className="mf-spec-cell">
                <span className="mf-mono">Material</span>
                <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '0.92rem' }}>
                  {detail.specs?.Material ||
                    detail.specs?.material ||
                    detail.specs?.Alloy ||
                    detail.stone ||
                    'Fine Artificial Jewellery'}
                </div>
              </div>

              {Object.entries(detail.specs || {})
                .filter(
                  ([k]) =>
                    ![
                      'color',
                      'material',
                      'alloy',
                      'insulation',
                      'hotretention',
                      'coldretention',
                    ].includes(k.toLowerCase())
                )
                .map(([k, v]) => (
                  <div key={k} className="mf-spec-cell">
                    <span className="mf-mono">{k}</span>
                    <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '0.92rem' }}>
                      {v}
                    </div>
                  </div>
                ))}
            </div>

            <div className="mf-spec-cell" style={{ marginTop: '16px' }}>
              <span className="mf-mono">Description</span>
              <p style={{ marginTop: '6px', fontSize: '0.9rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                {detail.description || detail.subtitle || 'Hand-finished piece crafted for effortless everyday wear.'}
              </p>
            </div>

            <div className="mf-spec-cell" style={{ marginTop: '16px' }}>
              <span className="mf-mono">Care Guide</span>
              <p style={{ marginTop: '6px', fontSize: '0.88rem', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                {detail.careGuide || 'Avoid contact with perfume and water. Store in the provided pouch. Polish gently with a soft cloth.'}
              </p>
            </div>
          </div>
        </div>

        {/* CUSTOMER REVIEWS */}
        <section className="mf-section" style={{ marginTop: '64px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '40px',
            }}
          >
            <div>
              <span className="mf-mono">Field Reviews</span>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 700, marginTop: '6px' }}>
                Verified Owner Reports ({detail.reviews?.length || 0})
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
                {(!detail.reviews || detail.reviews.length === 0) && (
                  <p style={{ color: 'var(--ink-muted)' }}>No reviews yet. Be the first to review this piece.</p>
                )}
                {detail.reviews?.map((rev) => (
                  <div key={rev.id} className="mf-spec-cell">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{rev.authorName}</strong>
                      <span className="mf-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={12} fill="currentColor" /> {rev.rating}/5
                      </span>
                    </div>
                    {rev.title && (
                      <div style={{ fontWeight: 600, marginTop: '6px' }}>{rev.title}</div>
                    )}
                    <p style={{ color: 'var(--ink-muted)', marginTop: '4px', fontSize: '0.9rem' }}>
                      {rev.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleReviewSubmit}
              className="mf-spec-cell"
              style={{ alignSelf: 'start' }}
            >
              <span className="mf-mono">Submit a Review</span>
              {!user && (
                <div className="mf-field">
                  <label>Your Name</label>
                  <input
                    className="mf-input"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                  />
                </div>
              )}
              <div className="mf-field">
                <label>Rating</label>
                <select
                  className="mf-select"
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                >
                  <option value={5}>5 — Exceptional</option>
                  <option value={4}>4 — Solid</option>
                  <option value={3}>3 — Fair</option>
                  <option value={2}>2 — Subpar</option>
                  <option value={1}>1 — Poor</option>
                </select>
              </div>
              <div className="mf-field">
                <label>Headline</label>
                <input
                  className="mf-input"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                />
              </div>
              <div className="mf-field">
                <label>Review</label>
                <textarea
                  className="mf-textarea"
                  rows={4}
                  required
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="mf-btn mf-btn-primary mf-btn-block"
                style={{ marginTop: '16px' }}
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>
        </section>

        {/* YOU MAY ALSO LOVE / RELATED PIECES */}
        {relatedProducts.length > 0 && (
          <section className="mf-section" style={{ marginTop: '64px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: '32px',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <span className="mf-mono">You May Also Love</span>
                <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '6px' }}>
                  Related Pieces
                </h2>
              </div>
              <button
                type="button"
                className="mf-btn mf-btn-outline"
                onClick={() => navigate('/shop')}
              >
                View All Products <ArrowRight size={15} />
              </button>
            </div>

            <div className="mf-grid-4">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>

      {sizeGuideOpen && siteContent.sizeGuideEnabled !== false && (
        <div
          className="mf-overlay mf-overlay-center"
          onClick={() => setSizeGuideOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-guide-modal-title"
        >
          <div
            className="mf-modal"
            style={{ width: 'min(660px, 95vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              <div>
                <span className="mf-mono">Fit &amp; Sizing</span>
                <h2
                  id="size-guide-modal-title"
                  style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}
                >
                  {siteContent.sizeGuideTitle || 'Ring Size Guide'}
                </h2>
              </div>
              <button
                type="button"
                className="mf-icon-btn"
                aria-label="Close Size Guide"
                onClick={() => setSizeGuideOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {siteContent.sizeGuideIntro && (
              <p
                style={{
                  color: 'var(--ink-muted)',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  marginBottom: '18px',
                }}
              >
                {siteContent.sizeGuideIntro}
              </p>
            )}

            <div className="mf-table-wrap">
              <table className="mf-table">
                <thead>
                  <tr>
                    <th>US / IN Size</th>
                    <th>UK / AU</th>
                    <th>Inside Diameter</th>
                    <th>Circumference</th>
                  </tr>
                </thead>
                <tbody>
                  {(siteContent.sizeGuideRows || []).map((row, idx) => (
                    <tr key={`${row.usSize}-${idx}`}>
                      <td style={{ fontWeight: 600 }}>{row.usSize}</td>
                      <td>{row.ukSize}</td>
                      <td className="mf-tabular">{row.diameterMm}</td>
                      <td className="mf-tabular">{row.circumferenceMm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(siteContent.sizeGuideTips || []).length > 0 && (
              <div className="mf-spec-cell" style={{ marginTop: '18px' }}>
                <span className="mf-mono">Measurement Tips</span>
                <ol
                  style={{
                    marginTop: '10px',
                    paddingLeft: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '0.88rem',
                    color: 'var(--ink-muted)',
                    lineHeight: 1.55,
                  }}
                >
                  {(siteContent.sizeGuideTips || []).map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ol>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button
                type="button"
                className="mf-btn mf-btn-primary mf-btn-sm"
                onClick={() => setSizeGuideOpen(false)}
              >
                Close Size Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
