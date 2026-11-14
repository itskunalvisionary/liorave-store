import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { SHOWCASE_STAGES } from '../lib/icons';

export function AboutPage() {
  const { siteContent, navigate } = useStore();
  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container">
        <span className="mf-mono">About LIORAVÉ</span>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, marginTop: '8px', maxWidth: '720px' }}>
          {siteContent.storyHeadline}
        </h1>

        <div className="mf-grid-2" style={{ marginTop: '36px', alignItems: 'center' }}>
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', aspectRatio: '4 / 3' }}>
            <img src={siteContent.aboutImage || SHOWCASE_STAGES[2].src} alt="LIORAVÉ architectural jewellery studio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)' }}>{siteContent.storyText}</p>
            <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', marginTop: '14px' }}>{siteContent.storyText2}</p>
            <button type="button" className="mf-btn mf-btn-primary" style={{ marginTop: '24px' }} onClick={() => navigate('/shop')}>
              Explore Collection
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { apiFetch, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, message }),
      });
      setName('');
      setEmail('');
      setMessage('');
      showToast('Message received — our team will reply shortly');
    } catch (err: any) {
      showToast(err.message || 'Could not send message');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container" style={{ maxWidth: '720px' }}>
        <span className="mf-mono">Contact</span>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, marginTop: '8px' }}>
          Reach Our Engineering &amp; Support Team
        </h1>

        <form onSubmit={handleSubmit} className="mf-spec-cell" style={{ marginTop: '28px', padding: '28px' }}>
          <div className="mf-field" style={{ marginTop: 0 }}>
            <label>Full Name</label>
            <input className="mf-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mf-field">
            <label>Email</label>
            <input type="email" className="mf-input" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mf-field">
            <label>Message</label>
            <textarea className="mf-textarea" rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button type="submit" className="mf-btn mf-btn-primary mf-btn-block" style={{ marginTop: '18px' }} disabled={busy}>
            {busy ? 'Sending...' : 'Send Inquiry'}
          </button>
        </form>
      </div>
    </main>
  );
}

export function BlogPage() {
  const posts = [
    {
      tag: 'Thermal Lab',
      title: 'Why Copper Lining Changes 36-Hour Cold Retention',
      body: 'A thin vapour-deposited copper shield around the inner 18/8 core reflects radiant infrared transfer inside the vacuum cavity, extending ice retention without thickening the outer wall.',
      image: SHOWCASE_STAGES[0].src,
    },
    {
      tag: 'Field Test',
      title: 'Machined 304 Collars Under Alpine Impact',
      body: 'Threads machined from bar stock resist cross-threading and drop deformation better than thin stamped lids when temperatures dip below freezing.',
      image: SHOWCASE_STAGES[2].src,
    },
    {
      tag: 'Materials',
      title: 'Powder Coat vs Raw Brushed Stainless',
      body: 'Matte Alpine Sage and Basalt Black finishes add wet-hand grip around river crossings, while Glacier Silver patinates honestly over decades of packs and camp stoves.',
      image: SHOWCASE_STAGES[3].src,
    },
  ];

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container">
        <span className="mf-mono">Field Notes</span>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, marginTop: '8px', marginBottom: '32px' }}>
          Materials, Thermal Testing &amp; Trail Logs
        </h1>
        <div className="mf-grid-3">
          {posts.map((p) => (
            <article key={p.title} className="mf-card">
              <div className="mf-prod-media" style={{ aspectRatio: '16 / 10', cursor: 'default' }}>
                <img src={p.image} alt={p.title} />
              </div>
              <div className="mf-prod-body">
                <span className="mf-mono">{p.tag}</span>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '6px' }}>{p.title}</h2>
                <p style={{ color: 'var(--ink-muted)', marginTop: '8px', fontSize: '0.9rem' }}>{p.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  const { siteContent } = useStore();
  const body =
    siteContent.privacyPolicyText ||
    'LIORAVÉ collects only the contact, shipping, and order details necessary to fulfill Cash on Delivery and Online Pay on Delivery shipments, manage warranty claims, and synchronize your wishlist when signed in. We never sell customer data to third parties.';

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container" style={{ maxWidth: '760px' }}>
        <span className="mf-mono">Legal</span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '8px' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: '16px', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
          {body}
        </p>
      </div>
    </main>
  );
}

export function TermsPage() {
  const { siteContent } = useStore();
  const body =
    siteContent.termsPolicyText ||
    'Every LIORAVÉ architectural piece carries a lifetime structural warranty against plating detachment and manufacturing defects under normal studio and daily wear. All orders settle exclusively via Cash on Delivery or Online Pay at Delivery.';

  return (
    <main style={{ paddingTop: '108px', paddingBottom: '88px' }}>
      <div className="mf-container" style={{ maxWidth: '760px' }}>
        <span className="mf-mono">Legal</span>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginTop: '8px' }}>Terms &amp; Lifetime Warranty</h1>
        <p style={{ color: 'var(--ink-muted)', marginTop: '16px', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
          {body}
        </p>
      </div>
    </main>
  );
}
