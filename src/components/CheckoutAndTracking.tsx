import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AddressItem, OrderRecord } from '../types/store';

export function CheckoutPage() {
  const {
    cart,
    user,
    apiFetch,
    refreshCart,
    formatPrice,
    navigate,
    showToast,
  } = useStore();

  const [paymentMethod, setPaymentMethod] = useState<'COD_CASH' | 'COD_ONLINE'>(
    'COD_CASH'
  );
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [savedAddresses, setSavedAddresses] = useState<AddressItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (user) {
      setFullName((v) => v || user.name);
      setEmail((v) => v || user.email);
      setPhone((v) => v || user.phone);
      apiFetch<AddressItem[]>('/api/addresses')
        .then((rows) => {
          setSavedAddresses(rows);
          const def = rows.find((a) => a.isDefault) || rows[0];
          if (def && !line1) {
            setFullName(def.fullName);
            setPhone(def.phone);
            setLine1(def.line1);
            setLine2(def.line2);
            setCity(def.city);
            setState(def.state);
            setPostalCode(def.postalCode);
            setCountry(def.country);
          }
        })
        .catch(() => {});
    }
  }, [user, apiFetch]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacing(true);
    try {
      const order = await apiFetch<OrderRecord>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod,
          couponCode: cart.couponCode,
          shippingAddress: {
            fullName,
            email,
            phone,
            line1,
            line2,
            city,
            state,
            postalCode,
            country,
          },
        }),
      });
      await refreshCart();
      setConfirmedOrder(order);
      showToast(`Order ${order.orderNumber} confirmed`);
    } catch (err: any) {
      showToast(err.message || 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  if (confirmedOrder) {
    return (
      <main style={{ paddingTop: '116px', paddingBottom: '88px' }}>
        <div className="mf-container" style={{ maxWidth: '720px' }}>
          <div className="mf-spec-cell" style={{ padding: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--success)' }}>
              <CheckCircle2 size={28} />
              <span className="mf-mono" style={{ color: 'var(--success)' }}>
                Order Confirmed
              </span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '12px' }}>
              Order {confirmedOrder.orderNumber}
            </h1>
            <p style={{ color: 'var(--ink-muted)', marginTop: '8px' }}>
              {confirmedOrder.paymentMethod === 'COD_ONLINE'
                ? 'Pay online via Card or Digital Wallet when our courier delivers to your doorstep.'
                : 'Pay in cash when your LIORAVÉ parcel arrives.'}
            </p>

            <div className="mf-spec-table" style={{ marginTop: '24px' }}>
              <div className="mf-spec-cell">
                <span className="mf-mono">Payment Method</span>
                <b>
                  {confirmedOrder.paymentMethod === 'COD_ONLINE'
                    ? 'COD · Pay Online at Doorstep'
                    : 'COD · Cash on Delivery'}
                </b>
              </div>
              <div className="mf-spec-cell">
                <span className="mf-mono">Total Due on Delivery</span>
                <b>{formatPrice(confirmedOrder.totalCents)}</b>
                {(confirmedOrder.giftWrapCents ?? 0) > 0 && (
                  <div className="mf-mono" style={{ marginTop: '4px', color: 'var(--ink-muted)' }}>
                    Includes Gift Wrap ({formatPrice(confirmedOrder.giftWrapCents ?? 0)})
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="mf-btn mf-btn-primary"
                onClick={() =>
                  navigate(
                    `/track-order?order=${encodeURIComponent(confirmedOrder.orderNumber)}`
                  )
                }
              >
                Track Order {confirmedOrder.orderNumber}
              </button>
              <button
                type="button"
                className="mf-btn mf-btn-outline"
                onClick={() => navigate('/shop')}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container">
        <span className="mf-mono">Checkout</span>
        <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, marginTop: '6px', marginBottom: '28px' }}>
          COD Checkout
        </h1>

        {cart.items.length === 0 ? (
          <div className="mf-spec-cell" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-muted)', marginBottom: '16px' }}>
              Your bag is empty. Add a piece before checking out.
            </p>
            <button
              type="button"
              className="mf-btn mf-btn-primary"
              onClick={() => navigate('/shop')}
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: '36px',
              alignItems: 'start',
            }}
          >
            <form onSubmit={handleSubmitOrder} className="mf-spec-cell" style={{ padding: '28px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Shipping Details</h2>

              {savedAddresses.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <span className="mf-mono">Saved Addresses</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        className="mf-swatch"
                        onClick={() => {
                          setFullName(addr.fullName);
                          setPhone(addr.phone);
                          setLine1(addr.line1);
                          setLine2(addr.line2);
                          setCity(addr.city);
                          setState(addr.state);
                          setPostalCode(addr.postalCode);
                          setCountry(addr.country);
                        }}
                      >
                        {addr.line1}, {addr.city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mf-grid-2">
                <div className="mf-field">
                  <label>Full Name</label>
                  <input className="mf-input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>Email</label>
                  <input type="email" className="mf-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="mf-field">
                <label>Phone Number</label>
                <input className="mf-input" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>

              <div className="mf-field">
                <label>Street Address</label>
                <input className="mf-input" required value={line1} onChange={(e) => setLine1(e.target.value)} />
              </div>

              <div className="mf-field">
                <label>Apartment / Suite (optional)</label>
                <input className="mf-input" value={line2} onChange={(e) => setLine2(e.target.value)} />
              </div>

              <div className="mf-grid-3">
                <div className="mf-field">
                  <label>City</label>
                  <input className="mf-input" required value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>State / Region</label>
                  <input className="mf-input" required value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>Postal Code</label>
                  <input className="mf-input" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <span className="mf-mono">Payment Method (COD Only)</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <label
                    className="mf-spec-cell"
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderColor: paymentMethod === 'COD_CASH' ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'COD_CASH'}
                      onChange={() => setPaymentMethod('COD_CASH')}
                    />
                    <div>
                      <strong>Cash on Delivery (COD)</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                        Pay cash directly when your order arrives at your door.
                      </div>
                    </div>
                  </label>

                  <label
                    className="mf-spec-cell"
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderColor: paymentMethod === 'COD_ONLINE' ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={paymentMethod === 'COD_ONLINE'}
                      onChange={() => setPaymentMethod('COD_ONLINE')}
                    />
                    <div>
                      <strong>Pay Online at Delivery (Card / Digital Wallet)</strong>
                      <div style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>
                        Settle digitally on the courier handheld terminal upon delivery.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="mf-btn mf-btn-primary mf-btn-block"
                style={{ marginTop: '24px' }}
                disabled={placing}
              >
                {placing
                  ? 'Confirming Order...'
                  : `Place Order (${formatPrice(cart.totalCents)})`}
              </button>
            </form>

            <div className="mf-spec-cell" style={{ padding: '28px' }}>
              <span className="mf-mono">Order Summary</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {cart.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.productName}</div>
                      <div className="mf-mono">
                        {item.finishName} · {item.sizeLabel} × {item.quantity}
                      </div>
                    </div>
                    <strong>{formatPrice(item.priceCents * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(cart.subtotalCents)}</span>
                </div>
                {cart.discountCents > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--success)' }}>
                    <span>Coupon ({cart.couponCode})</span>
                    <span>-{formatPrice(cart.discountCents)}</span>
                  </div>
                )}
                {cart.giftWrapCents > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Gift Wrap</span>
                    <span>+{formatPrice(cart.giftWrapCents)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Shipping</span>
                  <span>Complimentary</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '1.15rem', fontWeight: 700 }}>
                  <span>Due on Delivery</span>
                  <span>{formatPrice(cart.totalCents)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export function OrderTrackingPage() {
  const { route, apiFetch, formatPrice, showToast, subscribeRealtime } = useStore();
  const [query, setQuery] = useState(() => {
    const param = new URLSearchParams(window.location.search).get('order');
    return param ? param.trim() : '';
  });
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (orderNo: string, silent = false) => {
    if (!orderNo.trim()) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<OrderRecord>(
        `/api/orders/track/${encodeURIComponent(orderNo.trim())}`
      );
      setOrder(data);
    } catch (err: any) {
      if (!silent) {
        setOrder(null);
        showToast(err.message || 'Order not found');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const search = route.includes('?')
      ? route.split('?')[1]
      : window.location.search.slice(1);
    const param = new URLSearchParams(search).get('order')?.trim();
    if (param) {
      setQuery(param);
      void lookup(param);
    } else {
      setQuery('');
      setOrder(null);
    }
  }, [route]);

  useEffect(() => {
    const activeNo = (order?.orderNumber || query).trim().toUpperCase();
    if (!activeNo) return;
    return subscribeRealtime((ev) => {
      if (
        (ev.type === 'orders:updated' &&
          (!ev.orderNumber || ev.orderNumber.toUpperCase() === activeNo)) ||
        (ev.type === 'connected' && order?.orderNumber)
      ) {
        void lookup(activeNo, true);
      }
    });
  }, [order?.orderNumber, query, subscribeRealtime]);

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container" style={{ maxWidth: '860px' }}>
        <span className="mf-mono">Dispatch Tracking</span>
        <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, marginTop: '6px' }}>
          Track Your LIORAVÉ Order
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(query);
          }}
          style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}
        >
          <input
            className="mf-input"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder="Enter your order number (e.g. MF-10482)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="mf-btn mf-btn-primary"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Track Order'}
          </button>
        </form>

        {order && (
          <div className="mf-spec-cell" style={{ marginTop: '28px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="mf-mono">Order {order.orderNumber}</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px', textTransform: 'capitalize' }}>
                  Status: {order.status}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`mf-pill ${order.paymentStatus === 'paid_on_delivery' ? 'green' : 'amber'}`}>
                  {order.paymentMethod === 'COD_ONLINE' ? 'COD Online' : 'COD Cash'} ·{' '}
                  {order.paymentStatus === 'paid_on_delivery' ? 'Settled' : 'Pay on Delivery'}
                </span>
              </div>
            </div>

            <div style={{ marginTop: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.trackingNotes.map((ev, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                  }}
                >
                  <Truck size={16} style={{ marginTop: '3px', color: 'var(--accent)' }} />
                  <div>
                    <div className="mf-mono">
                      {ev.status} · {new Date(ev.timestamp).toLocaleDateString()}
                    </div>
                    <p style={{ fontSize: '0.92rem', marginTop: '2px' }}>{ev.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <span className="mf-mono">Items in Parcel</span>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    fontSize: '0.92rem',
                  }}
                >
                  <span>
                    {item.productName} ({item.variantLabel}) × {item.quantity}
                  </span>
                  <strong>{formatPrice(item.unitPriceCents * item.quantity)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontWeight: 700 }}>
                <span>Total</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export function OrderHistoryPage() {
  const { user, apiFetch, formatPrice, navigate, setLoginOpen, subscribeRealtime } =
    useStore();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchHistory = () =>
      apiFetch<OrderRecord[]>('/api/orders')
        .then(setOrders)
        .catch(() => {});

    fetchHistory().finally(() => setLoading(false));

    return subscribeRealtime((ev) => {
      if (ev.type === 'orders:updated' || ev.type === 'connected') {
        void fetchHistory();
      }
    });
  }, [user, apiFetch, subscribeRealtime]);

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container">
        <span className="mf-mono">Account</span>
        <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, marginTop: '6px', marginBottom: '28px' }}>
          Order History
        </h1>

        {!user ? (
          <div className="mf-spec-cell" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--ink-muted)', marginBottom: '16px' }}>
              Sign in to view your past orders and dispatch status.
            </p>
            <button type="button" className="mf-btn mf-btn-primary" onClick={() => setLoginOpen(true)}>
              Sign In
            </button>
          </div>
        ) : loading ? (
          <p className="mf-mono">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="mf-spec-cell" style={{ padding: '40px', textAlign: 'center' }}>
            <Package size={28} style={{ margin: '0 auto 12px', color: 'var(--ink-muted)' }} />
            <p style={{ color: 'var(--ink-muted)', marginBottom: '16px' }}>
              You haven&apos;t placed an order yet.
            </p>
            <button type="button" className="mf-btn mf-btn-primary" onClick={() => navigate('/shop')}>
              Shop LIORAVÉ
            </button>
          </div>
        ) : (
          <div className="mf-table-wrap">
            <table className="mf-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      navigate(`/track-order?order=${encodeURIComponent(o.orderNumber)}`)
                    }
                  >
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td><span className="mf-pill">{o.status}</span></td>
                    <td>{o.paymentMethod === 'COD_ONLINE' ? 'COD Online' : 'COD Cash'}</td>
                    <td><strong>{formatPrice(o.totalCents)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
