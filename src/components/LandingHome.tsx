import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { ArrowRight, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { initHeroCanvas } from '../webgl/heroCanvas';
import { SHOWCASE_STAGES } from '../lib/icons';
import { ProductCard } from './ProductCard';

gsap.registerPlugin(ScrollTrigger);

export function LandingHome() {
  const {
    products,
    navigate,
    openProduct,
    addToBag,
    setCartOpen,
    siteContent,
    formatPrice,
    apiFetch,
    showToast,
  } = useStore();

  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeStage, setActiveStage] = useState(0);
  const [addingConfig, setAddingConfig] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterBusy, setNewsletterBusy] = useState(false);

  useEffect(() => {
    const cleanHero = heroCanvasRef.current
      ? initHeroCanvas(heroCanvasRef.current)
      : undefined;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
    });
    let rafId = 0;
    const onRaf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(onRaf);
    };
    rafId = requestAnimationFrame(onRaf);

    const ctx = gsap.context(() => {
      gsap.from('.mf-hero-anim', {
        y: 22,
        opacity: 0,
        duration: 0.75,
        stagger: 0.08,
        ease: 'power2.out',
        clearProps: 'all',
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      ctx.revert();
      if (cleanHero) cleanHero();
    };
  }, []);

  const flagshipProduct =
    products.find((p) => p.slug === 'material-flask-flagship') || products[0];

  const matchedVariant = flagshipProduct?.variants[0];

  const configPriceCents =
    matchedVariant?.priceCents ?? flagshipProduct?.basePriceCents ?? 4800;

  const goToTrendingProduct = () => {
    if (flagshipProduct) {
      openProduct(flagshipProduct.slug);
    } else {
      navigate('/shop');
    }
  };

  const handleAddConfigured = async () => {
    if (!flagshipProduct || !matchedVariant) {
      navigate('/shop');
      return;
    }
    setAddingConfig(true);
    try {
      await addToBag(flagshipProduct.id, matchedVariant.id, 1);
      setCartOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Could not add configured flask');
    } finally {
      setAddingConfig(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterBusy(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      setNewsletterEmail('');
      showToast('Subscribed — welcome to LIORAVÉ');
    } catch (err: any) {
      showToast(err.message || 'Subscription failed');
    } finally {
      setNewsletterBusy(false);
    }
  };

  const featuredProducts = products.slice(0, 4);

  const stages =
    siteContent.showcaseStages && siteContent.showcaseStages.length > 0
      ? siteContent.showcaseStages
      : SHOWCASE_STAGES;
  const safeStageIdx = Math.min(activeStage, stages.length - 1);

  return (
    <main>
      {/* FESTIVAL OF JEWELLERY GOLDEN GRADIENT BANNER */}
      {siteContent.festivalBannerEnabled !== false && (
        <div className="mf-festival-strip">
          {siteContent.festivalTitle?.trim() && (
            <span className="mf-mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {siteContent.festivalTitle}
            </span>
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--ink)' }}>
            {siteContent.festivalSubtitle || 'Let celebrate Chhath Puja with LIORAVÉ'}
          </span>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: 'var(--mono)',
              fontSize: '0.73rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            <span>{siteContent.festivalCtaLabel || 'Shop Festival Edit'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* HERO SECTION WITH GOLDEN GRADIENT GLOW & CONTOUR CANVAS */}
      <section
        className="mf-hero"
        style={
          siteContent.festivalBannerEnabled === false
            ? { marginTop: '72px' }
            : undefined
        }
      >
        <canvas ref={heroCanvasRef} className="mf-hero-canvas" aria-hidden="true" />
        <div className="mf-container">
          <div className="mf-hero-grid">
            <div>
              <span className="mf-mono mf-hero-anim" style={{ color: 'var(--accent)' }}>
                Festival of Jewellery · {siteContent.heroEyebrow}
              </span>
              <h1 className="mf-hero-anim">{siteContent.heroHeadline}</h1>
              <p className="mf-hero-sub mf-hero-anim">
                {siteContent.heroSubline}
              </p>
              <div className="mf-hero-ctas mf-hero-anim">
                <button
                  type="button"
                  className="mf-btn mf-btn-primary"
                  onClick={goToTrendingProduct}
                >
                  {siteContent.heroPrimaryCta}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="mf-btn mf-btn-outline"
                  onClick={() => navigate('/shop')}
                >
                  {siteContent.heroSecondaryCta}
                </button>
              </div>

              <div className="mf-hero-metrics mf-hero-anim">
                <div className="mf-hero-metric">
                  <b>{siteContent.metricCold}</b>
                  <span>{siteContent.metricColdLabel}</span>
                </div>
                <div className="mf-hero-metric">
                  <b>{siteContent.metricHot}</b>
                  <span>{siteContent.metricHotLabel}</span>
                </div>
                <div className="mf-hero-metric">
                  <b>{siteContent.metricSteel}</b>
                  <span>{siteContent.metricSteelLabel}</span>
                </div>
              </div>
            </div>

            <div
              className="mf-hero-card mf-hero-anim"
              style={{ borderColor: 'var(--gold-border)' }}
            >
              <img
                src={siteContent.heroImage || stages[0].src}
                alt="LIORAVÉ signature piece resting on honed dark basalt slate"
              />
              <div className="mf-hero-caption">
                <div>
                  <span className="mf-mono">Flagship Piece</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {flagshipProduct?.name || 'Signature Edition'}
                  </div>
                </div>
                <button
                  type="button"
                  className="mf-btn mf-btn-accent mf-btn-sm"
                  onClick={() =>
                    flagshipProduct
                      ? navigate(`/product/${flagshipProduct.slug}`)
                      : navigate('/shop')
                  }
                >
                  From {formatPrice(4200)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR STORY SHOWCASE */}
      <section id="our-story" className="mf-section">
        <div className="mf-container">
          <div style={{ marginBottom: '40px', maxWidth: '640px' }}>
            <span className="mf-mono">Our Story</span>
            <h2
              style={{
                fontSize: 'clamp(1.85rem, 3.5vw, 2.75rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginTop: '8px',
              }}
            >
              Every piece begins as a quiet act of devotion
            </h2>
          </div>

          <div className="mf-showcase-grid">
            <div className="mf-stage-list">
              {stages.map((stage, idx) => (
                <button
                  key={stage.title + idx}
                  type="button"
                  className={`mf-stage-btn ${safeStageIdx === idx ? 'active' : ''}`}
                  onClick={() => setActiveStage(idx)}
                >
                  {!/^\d{2}\s*[—-]/.test(stage.title) && (
                    <span className="mf-mono">0{idx + 1}</span>
                  )}
                  <h3>{stage.title}</h3>
                  <p>{stage.sub}</p>
                </button>
              ))}
            </div>

            <div className="mf-showcase-frame">
              <img
                src={stages[safeStageIdx].src}
                alt={stages[safeStageIdx].alt}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FINISH & SIZE CONFIGURATOR */}
      <section id="configurator" className="mf-section">
        <div className="mf-container">
          <div
            role="button"
            tabIndex={0}
            className="mf-festival-card"
            onClick={goToTrendingProduct}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToTrendingProduct();
              }
            }}
            style={{
              padding: 'clamp(24px, 4vw, 48px)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: '40px',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--surface)',
                aspectRatio: '4 / 3.4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
            >
              <img
                src={flagshipProduct?.images?.[0]?.url || SHOWCASE_STAGES[0].src}
                alt={flagshipProduct?.name || 'LIORAVÉ Trending Piece'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            <div>
              <span className="mf-mono">Trending Piece</span>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '8px' }}>
                {flagshipProduct?.name || 'LIORAVÉ Signature Piece'}
              </h2>
              <p style={{ color: 'var(--ink-muted)', marginTop: '8px' }}>
                {flagshipProduct?.subtitle ||
                  'Hand-finished piece crafted for effortless everyday wear with Cash or Online Pay on Delivery.'}
              </p>

              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <span className="mf-mono">Master Piece</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    {formatPrice(configPriceCents)}
                  </div>
                </div>
                <button
                  type="button"
                  className="mf-btn mf-btn-accent"
                  disabled={addingConfig}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddConfigured();
                  }}
                >
                  <Check size={16} />
                  {addingConfig ? 'Adding...' : 'Add Trending Flask to Bag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FESTIVAL OF JEWELLERY FEATURED CATALOG */}
      <section className="mf-section mf-festival-band">
        <div className="mf-container">
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
              <span className="mf-mono" style={{ color: 'var(--accent)' }}>
                Festive Edit
              </span>
              <h2
                className="mf-gold-text"
                style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.5rem)', fontWeight: 700, marginTop: '6px' }}
              >
                Festival of Jewellery
              </h2>
              <p style={{ color: 'var(--ink-muted)', marginTop: '6px', maxWidth: '520px', fontSize: '0.94rem' }}>
                Hand-finished heirloom silhouettes cast in luminous gold vermeil and sterling silver for festive gatherings and everyday brilliance.
              </p>
            </div>
            <button
              type="button"
              className="mf-btn mf-btn-accent"
              onClick={() => navigate('/shop')}
            >
              View All Products <ArrowRight size={15} />
            </button>
          </div>

          <div className="mf-grid-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mf-section">
        <div className="mf-container">
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface)',
              padding: 'clamp(28px, 4vw, 52px)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="mf-mono">Field Dispatch</span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '6px' }}>
                {siteContent.newsletterOffer}
              </h2>
              <p style={{ color: 'var(--ink-muted)', marginTop: '8px' }}>
                {siteContent.newsletterSubtext}
              </p>
            </div>
            <form
              onSubmit={handleNewsletterSubmit}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              <input
                type="email"
                required
                className="mf-input"
                style={{ flex: 1, minWidth: '210px' }}
                placeholder="you@domain.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button
                type="submit"
                className="mf-btn mf-btn-primary"
                disabled={newsletterBusy}
              >
                {newsletterBusy ? 'Joining...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
