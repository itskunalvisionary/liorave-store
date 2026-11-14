import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AddressItem } from '../types/store';

export function AccountDashboardPage() {
  const {
    user,
    authLoading,
    apiFetch,
    refreshUser,
    setLoginOpen,
    navigate,
    logout,
    showToast,
  } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [fullName, setFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setFullName(user.name);
      setAddrPhone(user.phone);
      apiFetch<AddressItem[]>('/api/addresses')
        .then(setAddresses)
        .catch(() => {});
    }
  }, [user, apiFetch]);

  if (authLoading) {
    return (
      <main style={{ paddingTop: '120px', paddingBottom: '88px' }}>
        <div className="mf-container">
          <p className="mf-mono">Loading account...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ paddingTop: '120px', paddingBottom: '88px' }}>
        <div className="mf-container" style={{ maxWidth: '520px' }}>
          <div className="mf-spec-cell" style={{ padding: '36px', textAlign: 'center' }}>
            <span className="mf-mono">Customer Portal</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px' }}>
              Sign in to LIORAVÉ
            </h1>
            <p style={{ color: 'var(--ink-muted)', marginTop: '8px', marginBottom: '20px' }}>
              Manage your profile, saved shipping addresses, wishlist, and order history.
            </p>
            <button
              type="button"
              className="mf-btn mf-btn-primary"
              onClick={() => setLoginOpen(true)}
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name, phone }),
      });
      await refreshUser();
      showToast('Profile updated');
    } catch (err: any) {
      showToast(err.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      await apiFetch('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          phone: addrPhone,
          line1,
          city,
          state,
          postalCode,
          country: 'United States',
          isDefault: addresses.length === 0,
        }),
      });
      const next = await apiFetch<AddressItem[]>('/api/addresses');
      setAddresses(next);
      setLine1('');
      setCity('');
      setState('');
      setPostalCode('');
      showToast('Address saved');
    } catch (err: any) {
      showToast(err.message || 'Could not save address');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    try {
      await apiFetch(`/api/addresses/${id}`, { method: 'DELETE' });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed');
    } catch {
      showToast('Could not remove address');
    }
  };

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
          <div>
            <span className="mf-mono">Account · {user.role}</span>
            <h1 style={{ fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)', fontWeight: 700, marginTop: '6px' }}>
              {user.name}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="mf-btn mf-btn-outline mf-btn-sm" onClick={() => navigate('/order-history')}>
              Order History
            </button>
            <button type="button" className="mf-btn mf-btn-outline mf-btn-sm" onClick={() => logout()}>
              Sign Out
            </button>
          </div>
        </div>

        <div className="mf-grid-2" style={{ alignItems: 'start' }}>
          <form onSubmit={handleSaveProfile} className="mf-spec-cell" style={{ padding: '26px' }}>
            <span className="mf-mono">Profile Settings</span>
            <div className="mf-field">
              <label>Email</label>
              <input className="mf-input" value={user.email} disabled />
            </div>
            <div className="mf-field">
              <label>Full Name</label>
              <input className="mf-input" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="mf-field">
              <label>Phone Number</label>
              <input className="mf-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button type="submit" className="mf-btn mf-btn-primary" style={{ marginTop: '18px' }} disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="mf-spec-cell" style={{ padding: '26px' }}>
            <span className="mf-mono">Saved Addresses</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
              {addresses.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.fullName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>
                      {a.line1}, {a.city}, {a.state} {a.postalCode}
                    </div>
                  </div>
                  <button type="button" aria-label="Delete address" onClick={() => handleDeleteAddress(a.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddAddress} style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <span className="mf-mono">Add New Address</span>
              <div className="mf-grid-2">
                <div className="mf-field">
                  <label>Recipient</label>
                  <input className="mf-input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>Phone</label>
                  <input className="mf-input" required value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} />
                </div>
              </div>
              <div className="mf-field">
                <label>Street Address</label>
                <input className="mf-input" required value={line1} onChange={(e) => setLine1(e.target.value)} />
              </div>
              <div className="mf-grid-3">
                <div className="mf-field">
                  <label>City</label>
                  <input className="mf-input" required value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>State</label>
                  <input className="mf-input" required value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="mf-field">
                  <label>Postal Code</label>
                  <input className="mf-input" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="mf-btn mf-btn-outline mf-btn-sm" style={{ marginTop: '16px' }} disabled={savingAddr}>
                {savingAddr ? 'Saving...' : 'Save Address'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
