import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Edit2, Upload, Download, User,
  Key, Shield, Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useTenant } from '../../../../core/context/TenantContext';

// ============================================================================
// HELPERS
// ============================================================================

const callEdgeFunction = async (supabase, action, body) => {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: { action, ...body },
  });
  if (error) throw new Error(error.message || 'Edge function error');
  if (data?.error) throw new Error(data.error);
  return data;
};

const roleChip = (role) => {
  const map = {
    admin:   'bg-purple-100 text-purple-700',
    owner:   'bg-red-100 text-red-700',
    teacher: 'bg-emerald-100 text-emerald-700',
  };
  return map[role] ?? 'bg-gray-100 text-gray-600';
};

// ============================================================================
// MAIN PAGE
// ============================================================================

const TeachersManagementPage = () => {
  const { supabase } = useApp();
  const { schoolId } = useTenant();

  const [teachers, setTeachers]               = useState([]);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [editingTeacher, setEditingTeacher]     = useState(null);
  const [changePwTeacher, setChangePwTeacher]   = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [toast, setToast]                       = useState(null); // { type, msg }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');
      if (error) throw error;
      setTeachers(data || []);
    } catch (err) {
      console.error('Error loading teachers:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (teacher) => {
    if (teacher.role === 'owner') {
      showToast('error', 'Cannot delete the school owner account.');
      return;
    }
    if (!window.confirm(`Delete ${teacher.full_name}? This will remove their login access.`)) return;

    try {
      if (teacher.user_id) {
        await callEdgeFunction(supabase, 'delete', { schoolId, userId: teacher.user_id });
      } else {
        // Fallback: no auth user linked, just remove the DB record
        const { error } = await supabase.from('teachers').delete().eq('id', teacher.id);
        if (error) throw error;
      }
      showToast('success', `${teacher.full_name} deleted.`);
      await loadTeachers();
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', err.message || 'Failed to delete.');
    }
  };

  // ── Download credentials CSV ─────────────────────────────────────────────
  const downloadCredentials = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Class Teacher For'],
      ...teachers.map(t => [
        t.full_name,
        t.email,
        t.role,
        t.class_teacher_for || '',
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'staff_credentials.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download CSV template ────────────────────────────────────────────────
  const downloadCSVTemplate = () => {
    const csv = `Full Name,Email,Password,Subjects (comma-separated),Role,Class Teacher For
John Smith,john.smith@school.com,Pass123!,"Math,Physics",teacher,Y7
Sarah Johnson,sarah.johnson@school.com,Pass123!,English,teacher,Y5A
Admin User,admin@school.com,Pass123!,,admin,`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle size={18} />
            : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
            <p className="text-gray-500 text-sm mt-1">Add, edit, manage staff accounts and passwords</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setEditingTeacher(null); setShowAddModal(true); }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus size={16} /> Add Staff
            </button>
            <button
              onClick={downloadCredentials}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Download size={16} /> Export Staff List
            </button>
            <button
              onClick={downloadCSVTemplate}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Download size={16} /> CSV Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-2xl font-bold text-blue-700">{teachers.length}</p>
            <p className="text-sm text-blue-600">Total Staff</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-2xl font-bold text-purple-700">
              {teachers.filter(t => t.role === 'admin' || t.role === 'owner').length}
            </p>
            <p className="text-sm text-purple-600">Admins</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-2xl font-bold text-emerald-700">
              {teachers.filter(t => t.class_teacher_for).length}
            </p>
            <p className="text-sm text-emerald-600">Class Teachers</p>
          </div>
        </div>
      </div>

      {/* ── CSV Upload ── */}
      <CSVUploadSection onUploadComplete={loadTeachers} schoolId={schoolId} />

      {/* ── Staff Table ── */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Staff</h3>

        {teachers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <User size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No staff yet. Add someone above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-700">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-700">Subjects</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-700">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-emerald-700">Class</th>
                  <th className="px-4 py-3 text-center font-semibold text-emerald-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{t.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.subjects?.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{s}</span>
                        ))}
                        {(t.subjects?.length ?? 0) > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{t.subjects.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${roleChip(t.role)}`}>
                        {t.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.class_teacher_for
                        ? <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">{t.class_teacher_for}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditingTeacher(t); setShowAddModal(true); }}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Change password */}
                        {t.user_id && (
                          <button
                            onClick={() => setChangePwTeacher(t)}
                            className="p-2 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                            title="Change password"
                          >
                            <Key size={15} />
                          </button>
                        )}

                        {/* Delete (blocked only for owner) */}
                        {t.role !== 'owner' && (
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddTeacherModal
          teacher={editingTeacher}
          schoolId={schoolId}
          onClose={() => { setShowAddModal(false); setEditingTeacher(null); }}
          onSave={async () => { await loadTeachers(); setShowAddModal(false); setEditingTeacher(null); }}
          onToast={showToast}
        />
      )}

      {changePwTeacher && (
        <ChangePasswordModal
          teacher={changePwTeacher}
          schoolId={schoolId}
          onClose={() => setChangePwTeacher(null)}
          onToast={showToast}
        />
      )}
    </div>
  );
};

// ============================================================================
// CHANGE PASSWORD MODAL
// ============================================================================

const ChangePasswordModal = ({ teacher, schoolId, onClose, onToast }) => {
  const { supabase } = useApp();
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [saving, setSaving]         = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      onToast('error', 'Password must be at least 6 characters.');
      return;
    }
    try {
      setSaving(true);
      await callEdgeFunction(supabase, 'update', {
        schoolId,
        userId: teacher.user_id,
        password,
      });
      onToast('success', `Password updated for ${teacher.full_name}.`);
      onClose();
    } catch (err) {
      console.error('Change password error:', err);
      onToast('error', err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Key size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
            <p className="text-sm text-gray-500">{teacher.full_name} · {teacher.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:outline-none bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !password}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {saving ? 'Saving…' : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// CSV UPLOAD
// ============================================================================

const CSVUploadSection = ({ onUploadComplete, schoolId }) => {
  const { supabase } = useApp();
  const [uploading, setUploading] = useState(false);
  const [results, setResults]     = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setResults(null);
      const text  = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const rows  = lines.slice(1); // skip header

      let ok = 0, fail = 0, errs = [];

      for (const line of rows) {
        const [fullName, email, password, subjectsStr, role, classTeacherFor] =
          line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));

        if (!fullName || !email) continue;

        try {
          await callEdgeFunction(supabase, 'create_teacher', {
            schoolId,
            email,
            password: password || 'ChangeMe123!',
            full_name: fullName,
            role: role || 'teacher',
            subjects: subjectsStr ? subjectsStr.split(';').map(s => s.trim()).filter(Boolean) : [],
            class_teacher_for: classTeacherFor || null,
          });
          ok++;
        } catch (err) {
          fail++;
          errs.push(`${email}: ${err.message}`);
        }
      }

      setResults({ ok, fail, errs });
      if (ok > 0) onUploadComplete();
    } catch (err) {
      console.error('CSV upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <Upload size={22} className="text-blue-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-800">Bulk Import via CSV</h3>
          <p className="text-sm text-gray-500">Upload CSV to import multiple staff at once</p>
        </div>
      </div>

      <label className="block">
        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
        <span className={`inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium cursor-pointer hover:shadow-lg transition-all text-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {uploading ? 'Importing…' : 'Choose CSV File'}
        </span>
      </label>
      <p className="text-xs text-gray-400 mt-2">
        Columns: Full Name, Email, Password, Subjects (semicolon-separated), Role, Class Teacher For
      </p>

      {results && (
        <div className={`mt-4 p-4 rounded-xl text-sm ${results.fail === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <p className="font-semibold">Import complete: {results.ok} added, {results.fail} failed</p>
          {results.errs.map((e, i) => <p key={i} className="text-xs mt-1 opacity-80">{e}</p>)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ADD / EDIT TEACHER MODAL
// ============================================================================

const AddTeacherModal = ({ teacher, schoolId, onClose, onSave, onToast }) => {
  const { supabase } = useApp();
  const isEdit = !!teacher;

  const [formData, setFormData] = useState({
    full_name:        teacher?.full_name        || '',
    email:            teacher?.email            || '',
    password:         '',
    subjects:         teacher?.subjects?.join(', ') || '',
    role:             teacher?.role             || 'teacher',
    class_teacher_for: teacher?.class_teacher_for || '',
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      onToast('error', 'Name and email are required.');
      return;
    }
    if (!isEdit && !formData.password) {
      onToast('error', 'Password is required when creating a new staff member.');
      return;
    }

    try {
      setSaving(true);
      const subjects = formData.subjects
        ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      if (isEdit) {
        // Update profile in teachers table
        const { error } = await supabase
          .from('teachers')
          .update({
            full_name:         formData.full_name,
            email:             formData.email,
            subjects,
            role:              formData.role,
            class_teacher_for: formData.class_teacher_for || null,
          })
          .eq('id', teacher.id);
        if (error) throw error;

        // Update password if provided
        if (formData.password && teacher.user_id) {
          await callEdgeFunction(supabase, 'update', {
            schoolId,
            userId: teacher.user_id,
            password: formData.password,
          });
        }
      } else {
        // Create new — uses Edge Function for proper auth user creation
        await callEdgeFunction(supabase, 'create_teacher', {
          schoolId,
          email:             formData.email,
          password:          formData.password,
          full_name:         formData.full_name,
          role:              formData.role,
          subjects,
          class_teacher_for: formData.class_teacher_for || null,
        });
      }

      onToast('success', isEdit ? 'Staff member updated.' : 'Staff member created.');
      onSave();
    } catch (err) {
      console.error('Save error:', err);
      onToast('error', err.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={formData[key]}
        onChange={e => update(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-gray-50 text-sm"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            {isEdit ? <Edit2 size={18} className="text-emerald-600" /> : <Plus size={18} className="text-emerald-600" />}
          </div>
          <h3 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {field('Full Name *', 'full_name', 'text', 'Marija Petrović')}
          {field('Email *', 'email', 'email', 'marija@school.com')}

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={formData.password}
                onChange={e => update('password', e.target.value)}
                placeholder={isEdit ? 'Leave blank to keep current password' : 'Min. 6 characters'}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-gray-50 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {field('Subjects (comma-separated)', 'subjects', 'text', 'Math, Physics')}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={formData.role}
                onChange={e => update('role', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-gray-50 text-sm"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {field('Class Teacher For', 'class_teacher_for', 'text', 'Y7')}
          </div>

          {!isEdit && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex gap-2">
              <Shield size={14} className="flex-shrink-0 mt-0.5" />
              The staff member will be able to log in immediately with these credentials.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create Account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeachersManagementPage;
