import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, ExternalLink } from 'lucide-react';

// ─── GDPR Consent Modal ───────────────────────────────────────────────────────
// Shown once per user on first login (or if consent version changes).
// Records consent to `user_consents` table.
// GDPR Article 7 — conditions for consent.
// ─────────────────────────────────────────────────────────────────────────────

const CONSENT_VERSION = '1.0'; // bump this to re-prompt all users after policy changes

const ConsentModal = ({ supabase, userId, onDone }) => {
  const [checked, setChecked]     = useState({ privacy: false, processing: false });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const allChecked = checked.privacy && checked.processing;

  const handleAccept = async () => {
    if (!allChecked) return;
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('user_consents')
        .upsert([{
          user_id:          userId,
          consent_version:  CONSENT_VERSION,
          privacy_policy:   true,
          data_processing:  true,
          consented_at:     new Date().toISOString(),
          ip_address:       null, // collected server-side only if needed
        }], { onConflict: 'user_id' });

      if (upsertError) throw upsertError;
      onDone();
    } catch (err) {
      console.error('Consent save failed:', err);
      setError('Could not save your consent. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(15,23,42,.24)' }}
      >
        {/* header */}
        <div
          className="px-6 py-5 text-white"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">Your Privacy Matters</h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Before you continue, please review and accept how Akio uses your data.
          </p>
        </div>

        {/* body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Akio Platform processes personal data on behalf of your school to manage attendance,
            grades, homework, and communication. Your data is:
          </p>

          <ul className="space-y-2">
            {[
              'Stored securely with AES-256 encryption',
              'Accessible only by authorised school staff and you',
              'Never sold or shared with third parties',
              'Retained only as long as legally required',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          {/* checkboxes */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setChecked(c => ({ ...c, privacy: !c.privacy }))}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${
                  checked.privacy
                    ? 'bg-slate-900 border-slate-900'
                    : 'border-slate-300 group-hover:border-slate-400'
                }`}
              >
                {checked.privacy && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-slate-700 leading-snug">
                I have read and agree to the{' '}
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Privacy Policy
                  <ExternalLink size={11} />
                </a>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setChecked(c => ({ ...c, processing: !c.processing }))}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors cursor-pointer ${
                  checked.processing
                    ? 'bg-slate-900 border-slate-900'
                    : 'border-slate-300 group-hover:border-slate-400'
                }`}
              >
                {checked.processing && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-slate-700 leading-snug">
                I consent to Akio processing my personal data for educational management purposes
                as described above (GDPR Article 6(1)(b))
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleAccept}
            disabled={!allChecked || saving}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'I Accept — Continue to Akio'}
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
            You can withdraw consent or request data deletion at any time via{' '}
            <strong className="text-slate-500">Privacy & Your Data</strong> in your account menu.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Consent Gate ─────────────────────────────────────────────────────────────
// Wrapper that checks consent status and conditionally renders the modal.
// Usage: wrap SchoolAppContent with <ConsentGate supabase={...} userId={...}>
// ─────────────────────────────────────────────────────────────────────────────
export const ConsentGate = ({ supabase, userId, children }) => {
  const [status, setStatus] = useState('checking'); // checking | needed | ok

  useEffect(() => {
    if (!supabase || !userId) return;

    const checkConsent = async () => {
      try {
        const { data } = await supabase
          .from('user_consents')
          .select('consent_version, privacy_policy, data_processing')
          .eq('user_id', userId)
          .single();

        if (
          data &&
          data.consent_version === CONSENT_VERSION &&
          data.privacy_policy &&
          data.data_processing
        ) {
          setStatus('ok');
        } else {
          setStatus('needed');
        }
      } catch {
        // If table doesn't exist or RLS error, skip consent modal
        // (fail open — don't block the user from accessing the app)
        setStatus('ok');
      }
    };

    checkConsent();
  }, [supabase, userId]);

  if (status === 'checking') return null; // brief flash while checking
  if (status === 'needed') {
    return (
      <>
        <ConsentModal
          supabase={supabase}
          userId={userId}
          onDone={() => setStatus('ok')}
        />
        {/* Render blurred children behind the modal */}
        <div className="pointer-events-none select-none filter blur-sm">
          {children}
        </div>
      </>
    );
  }

  return children;
};

export default ConsentModal;
