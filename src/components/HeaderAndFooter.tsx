import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Gift,
  Heart,
  Mail,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { HeaderNavOption, NavSubOption } from '../types/store';

export function SiteHeader() {
  const {
    route,
    navigate,
    theme,
    toggleTheme,
    currency,
    setCurrency,
    user,
    cart,
    wishlist,
    siteContent,
    setActiveShopCategory,
    setCartOpen,
    setWishOpen,
    setSearchOpen,
    setLoginOpen,
    setAccountPanelOpen,
  } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const bagCount = cart.items.reduce((s, i) => s + i.quantity, 0);
  const cleanRoute = route.split('?')[0] || '/';
  const navItems: HeaderNavOption[] = siteContent.headerNav || [];

  const handleNavClick = (item: {
    route: string;
    categoryFilter?: string;
  }) => {
    setOpenDropdownId(null);
    setMobileMenuOpen(false);
    if (item.categoryFilter) {
      setActiveShopCategory(item.categoryFilter);
    } else if (item.route === '/shop') {
      setActiveShopCategory(null);
    }
    navigate(item.route || '/');
  };

  return (
    <>
      <header className="mf-nav">
        <button
          type="button"
          className="mf-brand"
          onClick={() => handleNavClick({ route: '/' })}
        >
          <img
            src="/assets/aistudio/liorave_logo_transparent.png"
            alt="LIORAVÉ logo"
            className="mf-brand-logo"
          />
          <span>LIORAVÉ</span>
        </button>

        <nav className="mf-nav-links" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              cleanRoute === item.route ||
              (item.route === '/shop' && cleanRoute.startsWith('/product/'));
            if (item.type === 'dropdown' && item.subOptions && item.subOptions.length > 0) {
              const isOpen = openDropdownId === item.id;
              return (
                <div
                  key={item.id}
                  className="mf-nav-item"
                  onMouseEnter={() => setOpenDropdownId(item.id)}
                  onMouseLeave={() => setOpenDropdownId(null)}
                >
                  <button
                    type="button"
                    className={`mf-nav-link ${isActive ? 'active' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setOpenDropdownId(isOpen ? null : item.id)}
                  >
                    <span>{item.label}</span>
                    <ChevronDown size={13} />
                  </button>
                  {isOpen && (
                    <div className="mf-nav-dropdown">
                      {item.subOptions.map((sub: NavSubOption) => (
                        <button
                          key={sub.id}
                          type="button"
                          className="mf-nav-sublink"
                          onClick={() => handleNavClick(sub)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className={`mf-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mf-nav-actions">
          <div className="mf-currency-toggle" role="group" aria-label="Currency selector">
            <button
              type="button"
              className={`mf-currency-opt ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => setCurrency('USD')}
              title="Display prices in USD ($)"
            >
              $
            </button>
            <button
              type="button"
              className={`mf-currency-opt ${currency === 'INR' ? 'active' : ''}`}
              onClick={() => setCurrency('INR')}
              title="Display prices in INR (₹)"
            >
              ₹
            </button>
          </div>

          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Search catalog"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={15} />
          </button>

          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Wishlist"
            onClick={() => setWishOpen(true)}
          >
            <Heart size={15} />
            {wishlist.length > 0 && <span className="mf-badge">{wishlist.length}</span>}
          </button>

          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Open bag"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag size={15} />
            <span>Bag</span>
            <span className="mf-badge">{bagCount}</span>
          </button>

          <button
            type="button"
            className="mf-icon-btn"
            aria-label="Account"
            onClick={() =>
              user ? setAccountPanelOpen(true) : setLoginOpen(true)
            }
          >
            <User size={15} />
          </button>

          <button
            type="button"
            className="mf-icon-btn mf-burger"
            aria-label="Menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mf-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mf-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mf-drawer-head">
              <span className="mf-mono">Navigation</span>
              <button
                type="button"
                className="mf-icon-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mf-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {navItems.map((item) => (
                <div key={item.id}>
                  <button
                    type="button"
                    className="mf-btn mf-btn-outline mf-btn-block"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => handleNavClick(item)}
                  >
                    {item.label}
                  </button>
                  {item.type === 'dropdown' && item.subOptions.length > 0 && (
                    <div style={{ paddingLeft: '14px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.subOptions.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className="mf-btn mf-btn-outline mf-btn-sm mf-btn-block"
                          style={{ justifyContent: 'flex-start' }}
                          onClick={() => handleNavClick(sub)}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mf-btn mf-btn-primary mf-btn-block"
                style={{ marginTop: '12px' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (user) {
                    navigate('/account');
                  } else {
                    setLoginOpen(true);
                  }
                }}
              >
                {user ? `Account (${user.name})` : 'Sign In / Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SearchOverlay() {
  const { searchOpen, setSearchOpen, products, openProduct, formatPrice } =
    useStore();
  const [query, setQuery] = useState('');

  if (!searchOpen) return null;

  const q = query.trim().toLowerCase();
  const matched = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.category?.name.toLowerCase().includes(q) ||
          p.variants.some(
            (v) =>
              v.finishName.toLowerCase().includes(q) ||
              v.sizeLabel.toLowerCase().includes(q)
          )
      )
    : products.slice(0, 6);

  return (
    <div
      className="mf-overlay mf-overlay-center"
      onClick={() => setSearchOpen(false)}
    >
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <span className="mf-mono">Search LIORAVÉ</span>
          <button
            type="button"
            className="mf-icon-btn"
            onClick={() => setSearchOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <input
          autoFocus
          className="mf-input"
          placeholder="Search pieces, finishes, or editions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div
          style={{
            marginTop: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '360px',
            overflowY: 'auto',
          }}
        >
          {matched.length === 0 ? (
            <p className="mf-mono" style={{ padding: '20px 0', textAlign: 'center' }}>
              No pieces matched &ldquo;{query}&rdquo;
            </p>
          ) : (
            matched.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  openProduct(p.slug);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-elevated)',
                  textAlign: 'left',
                }}
              >
                <img
                  src={p.images[0]?.url || ''}
                  alt={p.name}
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                    background: 'var(--surface)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="mf-mono">{p.category?.name}</div>
                </div>
                <strong>{formatPrice(p.basePriceCents)}</strong>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateBagQty,
    removeFromBag,
    setGiftWrap,
    applyCoupon,
    removeCoupon,
    formatPrice,
    siteContent,
    navigate,
    showToast,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [giftWrapBusy, setGiftWrapBusy] = useState(false);

  if (!cartOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setBusy(true);
    try {
      await applyCoupon(couponInput.trim());
      setCouponInput('');
    } catch (err: any) {
      showToast(err.message || 'Invalid coupon');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mf-overlay" onClick={() => setCartOpen(false)}>
      <aside className="mf-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mf-drawer-head">
          <div>
            <span className="mf-mono">Your Bag</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              {cart.items.reduce((s, i) => s + i.quantity, 0)} Items
            </h2>
          </div>
          <button
            type="button"
            className="mf-icon-btn"
            onClick={() => setCartOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mf-drawer-body">
          {cart.items.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', marginBottom: '18px' }}>
                Your bag is currently empty.
              </p>
              <button
                type="button"
                className="mf-btn mf-btn-primary"
                onClick={() => navigate('/shop')}
              >
                Explore Catalog
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-elevated)',
                  }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    style={{
                      width: '68px',
                      height: '68px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                      {item.productName}
                    </div>
                    <div className="mf-mono" style={{ marginTop: '2px' }}>
                      {item.finishName} · {item.sizeLabel}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="mf-icon-btn"
                          style={{ height: '28px', padding: '0 9px' }}
                          onClick={() => updateBagQty(item.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mf-mono">{item.quantity}</span>
                        <button
                          type="button"
                          className="mf-icon-btn"
                          style={{ height: '28px', padding: '0 9px' }}
                          onClick={() => updateBagQty(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong>{formatPrice(item.priceCents * item.quantity)}</strong>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeFromBag(item.id)}
                          style={{ color: 'var(--ink-muted)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="mf-drawer-foot">
            {cart.couponCode ? (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--accent)',
                  background: 'var(--surface-elevated)',
                }}
              >
                <span className="mf-mono" style={{ color: 'var(--accent)' }}>
                  Coupon {cart.couponCode} (-{formatPrice(cart.discountCents)})
                </span>
                <button
                  type="button"
                  className="mf-mono"
                  onClick={() => removeCoupon()}
                >
                  Remove
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleApplyCoupon}
                style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}
              >
                <input
                  className="mf-input"
                  placeholder="Promo code (e.g. WELCOME10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="mf-btn mf-btn-outline mf-btn-sm"
                  disabled={busy}
                >
                  Apply
                </button>
              </form>
            )}

            {siteContent.giftWrapEnabled !== false && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '9px 12px',
                  marginBottom: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${cart.giftWrap ? 'var(--accent)' : 'var(--border)'}`,
                  background: 'var(--surface-elevated)',
                  cursor: giftWrapBusy ? 'wait' : 'pointer',
                  fontSize: '0.86rem',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(cart.giftWrap)}
                    disabled={giftWrapBusy}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      setGiftWrapBusy(true);
                      try {
                        await setGiftWrap(next);
                      } catch (err: any) {
                        showToast(err.message || 'Could not update gift wrap');
                      } finally {
                        setGiftWrapBusy(false);
                      }
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                  />
                  <Gift size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 500 }}>Gift Wrap</span>
                </span>
                <span className="mf-mono" style={{ color: 'var(--ink-muted)' }}>
                  +{formatPrice(siteContent.giftWrapPriceCents ?? 500)}
                </span>
              </label>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotalCents)}</span>
            </div>
            {cart.discountCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem', color: 'var(--success)' }}>
                <span>Discount</span>
                <span>-{formatPrice(cart.discountCents)}</span>
              </div>
            )}
            {cart.giftWrapCents > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span>Gift Wrap</span>
                <span>+{formatPrice(cart.giftWrapCents)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontWeight: 700, fontSize: '1rem' }}>
              <span>Total</span>
              <span>{formatPrice(cart.totalCents)}</span>
            </div>

            <button
              type="button"
              className="mf-btn mf-btn-primary mf-btn-block"
              onClick={() => navigate('/checkout')}
            >
              Proceed to COD Checkout
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export function WishlistDrawer() {
  const {
    wishOpen,
    setWishOpen,
    wishlist,
    toggleWishlist,
    quickAdd,
    openProduct,
    formatPrice,
    user,
    setLoginOpen,
  } = useStore();

  if (!wishOpen) return null;

  return (
    <div className="mf-overlay" onClick={() => setWishOpen(false)}>
      <aside className="mf-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mf-drawer-head">
          <div>
            <span className="mf-mono">Saved</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Wishlist</h2>
          </div>
          <button
            type="button"
            className="mf-icon-btn"
            onClick={() => setWishOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mf-drawer-body">
          {!user ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-muted)', marginBottom: '16px' }}>
                Sign in to sync your saved pieces across devices.
              </p>
              <button
                type="button"
                className="mf-btn mf-btn-primary"
                onClick={() => {
                  setWishOpen(false);
                  setLoginOpen(true);
                }}
              >
                Sign In
              </button>
            </div>
          ) : wishlist.length === 0 ? (
            <p style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-muted)' }}>
              No saved items yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {wishlist.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-elevated)',
                  }}
                >
                  <img
                    src={row.product.images?.[0]?.url || ''}
                    alt={row.product.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setWishOpen(false);
                      openProduct(row.product.slug);
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => {
                        setWishOpen(false);
                        openProduct(row.product.slug);
                      }}
                    >
                      {row.product.name}
                    </div>
                    <div className="mf-mono">
                      {formatPrice(row.product.basePriceCents)}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        className="mf-btn mf-btn-outline mf-btn-sm"
                        onClick={() => quickAdd(row.product)}
                      >
                        Add to Bag
                      </button>
                      <button
                        type="button"
                        className="mf-btn mf-btn-outline mf-btn-sm"
                        onClick={() => toggleWishlist(row.productId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export function AccountPanel() {
  const { user, accountPanelOpen, setAccountPanelOpen, navigate, logout } =
    useStore();

  if (!accountPanelOpen || !user) return null;

  return (
    <div className="mf-overlay" onClick={() => setAccountPanelOpen(false)}>
      <aside className="mf-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mf-drawer-head">
          <div>
            <span className="mf-mono">Signed In</span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{user.name}</h2>
          </div>
          <button
            type="button"
            className="mf-icon-btn"
            onClick={() => setAccountPanelOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div className="mf-drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="mf-spec-cell">
            <span className="mf-mono">{user.role}</span>
            <p style={{ marginTop: '4px', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
          <button
            type="button"
            className="mf-btn mf-btn-outline mf-btn-block"
            onClick={() => navigate('/account')}
          >
            Profile &amp; Saved Addresses
          </button>
          <button
            type="button"
            className="mf-btn mf-btn-outline mf-btn-block"
            onClick={() => navigate('/order-history')}
          >
            Order History
          </button>
          <button
            type="button"
            className="mf-btn mf-btn-outline mf-btn-block"
            onClick={() => navigate('/track-order')}
          >
            Track Order
          </button>
          <button
            type="button"
            className="mf-btn mf-btn-primary mf-btn-block"
            style={{ marginTop: '12px' }}
            onClick={() => logout()}
          >
            Sign Out
          </button>
        </div>
      </aside>
    </div>
  );
}

export function LoginModal() {
  const {
    loginOpen,
    setLoginOpen,
    googleLoginEnabled,
    googleClientId,
    loginWithGoogle,
    loginWithGoogleCredential,
    loginWithEmail,
    showToast,
  } = useStore();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const gsiContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loginOpen || !googleLoginEnabled || !googleClientId) return;

    let cancelled = false;
    const renderGsiButton = () => {
      if (cancelled || !gsiContainerRef.current) return;
      const g = (window as unknown as {
        google?: {
          accounts?: {
            id?: {
              initialize: (opts: {
                client_id: string;
                callback: (resp: { credential?: string }) => void;
              }) => void;
              renderButton: (
                el: HTMLElement,
                opts: Record<string, string | number>
              ) => void;
            };
          };
        };
      }).google;
      if (!g?.accounts?.id) return;

      gsiContainerRef.current.innerHTML = '';
      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp) => {
          if (!resp.credential) return;
          setError('');
          setBusy(true);
          try {
            await loginWithGoogleCredential(resp.credential);
            setLoginOpen(false);
            showToast('Signed in with Google');
          } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
          } finally {
            setBusy(false);
          }
        },
      });
      g.accounts.id.renderButton(gsiContainerRef.current, {
        theme: 'outline',
        size: 'large',
        width: '340',
        text: 'continue_with',
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if ((window as unknown as { google?: { accounts?: { id?: unknown } } }).google?.accounts?.id) {
      renderGsiButton();
    } else if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => renderGsiButton();
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener('load', renderGsiButton);
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', renderGsiButton);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [
    loginOpen,
    googleLoginEnabled,
    googleClientId,
    loginWithGoogleCredential,
    setLoginOpen,
    showToast,
  ]);

  if (!loginOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithGoogle();
      setLoginOpen(false);
      showToast('Signed in with Google');
    } catch (err: any) {
      setError(err.message || 'Google sign-in cancelled');
    } finally {
      setBusy(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setBusy(true);
    try {
      await loginWithEmail('demo@materialflask.com', 'Customer@1234');
      showToast('Signed in to demo account');
      setLoginOpen(false);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="mf-overlay mf-overlay-center"
      onClick={() => setLoginOpen(false)}
    >
      <div className="mf-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <div>
            <span className="mf-mono">LIORAVÉ Account</span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '4px' }}>
              Sign in to LIORAVÉ
            </h2>
          </div>
          <button
            type="button"
            className="mf-icon-btn"
            onClick={() => setLoginOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {googleLoginEnabled ? (
          googleClientId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div ref={gsiContainerRef} style={{ minHeight: '44px' }} />
              {busy && (
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                  Verifying Google session...
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="mf-btn mf-btn-primary mf-btn-block"
              disabled={busy}
              onClick={handleGoogleLogin}
            >
              {busy ? 'Connecting...' : 'Continue with Google'}
            </button>
          )
        ) : (
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--ink-muted)', marginBottom: '16px' }}>
              Sign in with the demo customer profile to save wishlists, addresses, and track your orders.
            </p>
            <button
              type="button"
              className="mf-btn mf-btn-primary mf-btn-block"
              disabled={busy}
              onClick={handleDemoLogin}
            >
              {busy ? 'Signing in...' : 'Demo Customer Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SiteFooter() {
  const { navigate } = useStore();
  return (
    <footer className="mf-footer">
      <div className="mf-container">
        <div className="mf-foot-grid">
          <div>
            <div className="mf-brand">
              <img
                src="/assets/aistudio/liorave_logo_transparent.png"
                alt="LIORAVÉ logo"
                className="mf-brand-logo mf-brand-logo-lg"
              />
              <span>LIORAVÉ</span>
            </div>
            <p style={{ marginTop: '12px', color: 'var(--ink-muted)', fontSize: '0.88rem', maxWidth: '300px' }}>
              Fine artificial jewellery, hand-finished for the woman who wears her own story.
            </p>
            <div className="mf-foot-connect">
              <a
                href="https://instagram.com/liorave"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LIORAVÉ on Instagram"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>Instagram</span>
              </a>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LIORAVÉ on WhatsApp"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>WhatsApp</span>
              </a>
              <a href="mailto:Demo@g.com" aria-label="Email Demo@g.com">
                <Mail size={14} aria-hidden="true" />
                <span>Demo@g.com</span>
              </a>
            </div>
          </div>
          <div>
            <span className="mf-mono">Catalog</span>
            <ul className="mf-foot-links">
              <li><button type="button" onClick={() => navigate('/shop')}>All Pieces</button></li>
              <li><button type="button" onClick={() => navigate('/collections')}>Collections</button></li>
              <li><button type="button" onClick={() => navigate('/track-order')}>Track Order</button></li>
            </ul>
          </div>
          <div>
            <span className="mf-mono">Company</span>
            <ul className="mf-foot-links">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/');
                    window.setTimeout(() => {
                      document
                        .getElementById('our-story')
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }, 80);
                  }}
                >
                  About Us
                </button>
              </li>
              <li><button type="button" onClick={() => navigate('/contact')}>Contact</button></li>
            </ul>
          </div>
          <div>
            <span className="mf-mono">Policies</span>
            <ul className="mf-foot-links">
              <li><button type="button" onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
              <li><button type="button" onClick={() => navigate('/terms')}>Terms &amp; Warranty</button></li>
              <li><button type="button" onClick={() => navigate('/account')}>My Account</button></li>
              <li><button type="button" onClick={() => navigate('/admin')}>Admin Studio</button></li>
            </ul>
          </div>
        </div>
        <div
          style={{
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span className="mf-mono">&copy; {new Date().getFullYear()} LIORAVÉ. All rights reserved.</span>
          <span className="mf-mono">Cash or Online Pay on Delivery</span>
        </div>
      </div>
    </footer>
  );
}
