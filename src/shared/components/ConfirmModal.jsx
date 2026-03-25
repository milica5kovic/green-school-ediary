import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * Reusable confirm dialog — replaces window.confirm() everywhere in the app.
 *
 * Usage:
 *   const [confirmAction, setConfirmAction] = useState(null);
 *
 *   // trigger:
 *   setConfirmAction({ message: 'Delete this grade?', onConfirm: () => handleDelete(id) });
 *
 *   // render at bottom of component:
 *   {confirmAction && (
 *     <ConfirmModal
 *       message={confirmAction.message}
 *       onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
 *       onCancel={() => setConfirmAction(null)}
 *     />
 *   )}
 */
export default function ConfirmModal({ message, confirmLabel = 'Delete', onConfirm, onCancel, danger = true }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            {danger
              ? <Trash2 size={18} className="text-red-600" />
              : <AlertTriangle size={18} className="text-amber-600" />}
          </div>
          <p className="text-gray-700 text-sm leading-relaxed mt-2">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
