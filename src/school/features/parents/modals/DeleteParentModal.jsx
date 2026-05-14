import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, Users } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';

const DeleteParentModal = ({ parent, onClose, onDelete }) => {
  const { supabase } = useApp();
  const { primaryColor } = useBranding();
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadLinkedStudents(); }, [parent.id]);

  const loadLinkedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('student_parents')
        .select('student:students(id, name, class_name)')
        .eq('parent_id', parent.id);
      if (error) throw error;
      setLinkedStudents(data?.map(d => d.student).filter(Boolean) || []);
    } catch (err) {
      console.error('Error loading linked students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmed) {
      setError('Please confirm before deleting.');
      return;
    }
    try {
      setDeleting(true);
      setError('');

      await supabase.from('student_parents').delete().eq('parent_id', parent.id);
      const { error: parentError } = await supabase.from('parents').delete().eq('id', parent.id);
      if (parentError) throw parentError;

      onDelete();
    } catch (err) {
      setError(err.message || 'Failed to delete parent. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Delete Parent</h3>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* Parent info */}
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                  {parent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{parent.full_name}</p>
                  <p className="text-xs text-gray-500">{parent.email}</p>
                </div>
              </div>

              {/* Linked students warning */}
              {linkedStudents.length > 0 && (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <Users size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-700 mb-1">Linked to {linkedStudents.length} student{linkedStudents.length !== 1 ? 's' : ''}</p>
                    <p className="text-xs text-amber-600">
                      {linkedStudents.map(s => `${s.name} (${s.class_name})`).join(', ')} — all links will be removed.
                    </p>
                  </div>
                </div>
              )}

              {/* What gets deleted */}
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Will be permanently deleted:</p>
                <ul className="space-y-1">
                  {['Parent profile and record', 'All student links'].map(item => (
                    <li key={item} className="flex items-center gap-2 text-xs text-red-600">
                      <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => { setConfirmed(e.target.checked); setError(''); }}
                  className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-red-500"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors leading-snug">
                  I understand this will permanently delete <strong>{parent.full_name}</strong> and cannot be undone.
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || loading || !confirmed}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : 'Delete Parent'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteParentModal;
