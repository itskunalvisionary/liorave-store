import React, { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  subscribeFooterNewsletter,
  validateNewsletterEmail,
} from '../lib/firestore-newsletter';

export function FooterNewsletter() {
  const { apiFetch, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscribedEmail, setSubscribedEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let validated: string;
    try {
      validated = validateNewsletterEmail(email);
    } catch (err: any) {
      setErrorMsg(err.message || 'Please enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: validated }),
      });
      void subscribeFooterNewsletter(validated).catch(() => {});
      setSubscribedEmail(validated);
      setEmail('');
      showToast('Subscribed to atelier dispatches');
    } catch {
      try {
        const savedEmail = await subscribeFooterNewsletter(validated);
        setSubscribedEmail(savedEmail);
        setEmail('');
        showToast('Subscribed to atelier dispatches');
      } catch {
        const fallback = 'Unable to save subscription right now. Please try again.';
        setErrorMsg(fallback);
        showToast(fallback);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '22px', maxWidth: '340px' }}>
      <span className="mf-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <Mail size={12} /> Atelier Newsletter
      </span>
      <p style={{ marginTop: '6px', color: 'var(--ink-muted)', fontSize: '0.84rem' }}>
        Receive private previews for small-batch 22K vermeil releases and craft notes.
      </p>

      {subscribedEmail ? (
        <div
          role="status"
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--accent)',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '0.84rem',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Check size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Subscribed ({subscribedEmail})
            </span>
          </span>
          <button
            type="button"
            className="mf-mono"
            style={{ flexShrink: 0, textDecoration: 'underline' }}
            onClick={() => {
              setSubscribedEmail(null);
              setErrorMsg(null);
            }}
          >
            Add another
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          style={{
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'stretch',
          }}
        >
          <input
            type="email"
            required
            aria-label="Newsletter email address"
            className="mf-input"
            placeholder="you@domain.com"
            maxLength={254}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            disabled={busy}
            style={{ flex: 1, minWidth: 0, padding: '9px 12px' }}
          />
          <button
            type="submit"
            className="mf-btn mf-btn-primary mf-btn-sm"
            disabled={busy}
            style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {busy ? 'Joining...' : 'Subscribe'}
          </button>
        </form>
      )}

      {errorMsg && (
        <p
          role="alert"
          style={{
            marginTop: '8px',
            fontSize: '0.8rem',
            color: 'var(--danger)',
          }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}
