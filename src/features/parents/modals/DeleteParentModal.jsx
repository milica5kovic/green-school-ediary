import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../../../core/infrastructure/supabaseClient';


const DeleteParentModal = ({ parent, onClose, onDelete }) => {
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    loadLinkedStudents();
  }, [parent.id]);

  const loadLinkedStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('student_parents')
        .select(`
          student:students(id, name, class_name)
        `)
        .eq('parent_id', parent.id);

      if (error) throw error;
      setLinkedStudents(data?.map(d => d.student) || []);
    } catch (error) {
      console.error('Error loading linked students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    try {
      setDeleting(true);

      // Step 1: Delete student-parent links
      const { error: linksError } = await supabase
        .from('student_parents')
        .delete()
        .eq('parent_id', parent.id);

      if (linksError) throw linksError;

      // Step 2: Delete parent record
      const { error: parentError } = await supabase
        .from('parents')
        .delete()
        .eq('id', parent.id);

      if (parentError) throw parentError;

      // Step 3: Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', parent.user_id);

      if (profileError) {
        console.warn('Profile delete failed:', profileError);
      }

      // Step 4: Delete auth user (optional - only if you want complete removal)
      // This requires admin API access
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/auth/v1/admin/users/${parent.user_id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY}`
            }
          }
        );

        if (!response.ok) {
          console.warn('Auth user delete failed');
        }
      } catch (authError) {
        console.warn('Could not delete auth user:', authError);
      }

      alert('✅ Parent deleted successfully!');
      onDelete();
    } catch (error) {
      console.error('Error deleting parent:', error);
      alert('Failed to delete parent: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Delete Parent</h3>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Parent Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-800">{parent.full_name}</p>
                <p className="text-sm text-gray-600">{parent.email}</p>
              </div>

              {/* Linked Students Warning */}
              {linkedStudents.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-semibold text-yellow-800 mb-2">
                    ⚠️ Warning: Linked Students
                  </p>
                  <p className="text-sm text-yellow-700 mb-2">
                    This parent is linked to {linkedStudents.length} student(s):
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {linkedStudents.map(student => (
                      <li key={student.id}>
                        • {student.name} ({student.class_name})
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-yellow-700 mt-2">
                    These links will be removed.
                  </p>
                </div>
              )}

              {/* What will be deleted */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-800 mb-2">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>✗ Parent account and profile</li>
                  <li>✗ Login credentials</li>
                  <li>✗ All student links</li>
                  <li>✗ All associated data</li>
                </ul>
              </div>

              {/* Confirmation Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting || loading || confirmText !== 'DELETE'}
            className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {deleting ? 'Deleting...' : 'Delete Parent'}
          </button>
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteParentModal;