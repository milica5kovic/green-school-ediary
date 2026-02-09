import React, { useState, useEffect } from 'react';
import { supabase } from '../../../infrastructure/supabaseClient';

const EditParentModal = ({ parent, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: parent?.full_name || '',
    email: parent?.email || '',
    phone: parent?.phone || '',
    status: parent?.status || 'active'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Update parent record
      const { error: updateError } = await supabase
        .from('parents')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          status: formData.status
        })
        .eq('id', parent.id);

      if (updateError) throw updateError;

      // Also update profile table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name
        })
        .eq('id', parent.user_id);

      if (profileError) {
        console.warn('Profile update failed:', profileError);
      }

      alert('✅ Parent updated successfully!');
      onSave();
    } catch (err) {
      console.error('Error updating parent:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Edit Parent</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Changing email does not update login credentials
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="+381 60 123 4567"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Inactive parents cannot log in
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Update Parent'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditParentModal;