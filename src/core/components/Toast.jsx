import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// GLOBAL TOAST SYSTEM
// ════════════════════════════════════════════════════════════════════════════
// Usage (imperative — no hooks needed, works anywhere):
//   import { toast } from 'core/components/Toast';
//   toast.success('Saved!');
//   toast.error('Something went wrong');
//   toast.warning('Check this');
//   toast.info('PDF export coming soon');
// ════════════════════════════════════════════════════════════════════════════

// ── Module-level dispatch ref (bridges imperative ↔ React state) ───────────
let _dispatch = null;

// ── Strip common emoji prefixes teachers put in alerts ─────────────────────
const clean = (msg) =>
  String(msg ?? '').replace(/^[✅❌⚠️️\u{1F4A1}\u{1F514}⚠️✅❌💡🔔]\s*/u, '').trim();

// ── Public imperative API ──────────────────────────────────────────────────
export const toast = {
  success: (msg) => _dispatch?.({ msg: clean(msg), type: 'success' }),
  error:   (msg) => _dispatch?.({ msg: clean(msg), type: 'error'   }),
  info:    (msg) => _dispatch?.({ msg: clean(msg), type: 'info'    }),
  warning: (msg) => _dispatch?.({ msg: clean(msg), type: 'warning' }),
};

// ── Visual config per type ─────────────────────────────────────────────────
const CFG = {
  success: { Icon: CheckCircle,   color: '#10b981', bg: '#f0fdf4', border: '#86efac' },
  error:   { Icon: AlertCircle,   color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
  info:    { Icon: Info,          color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  warning: { Icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
};

// ── Single toast item ──────────────────────────────────────────────────────
const ToastItem = ({ id, msg, type, onDismiss }) => {
  const { Icon, color, bg, border } = CFG[type] || CFG.info;
  return (
    <div
      className="flex items-start rounded-2xl shadow-xl overflow-hidden pointer-events-auto"
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        minWidth: '260px',
        maxWidth: '380px',
        animation: 'toast-slide-in 0.22s cubic-bezier(.21,1.02,.73,1) both',
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
        <Icon size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{msg}</p>
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 p-2 mr-1 mt-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-black/5 transition-colors"
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ── Provider — mount once at the app root ──────────────────────────────────
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ msg, type }) => {
    const id = Date.now() + Math.random();
    // Keep max 5 visible at once
    setToasts(prev => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Register / unregister the global dispatch
  useEffect(() => {
    _dispatch = addToast;
    return () => { if (_dispatch === addToast) _dispatch = null; };
  }, [addToast]);

  return (
    <>
      {children}

      {/* Fixed overlay — pointer-events:none so it doesn't block clicks */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>

      {/* Keyframe — injected once */}
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(48px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)   scale(1);    }
        }
      `}</style>
    </>
  );
};
