import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { createUser, checkAdminAccess, generateTempPassword } from '../../../../core/infrastructure/adminApi';
import { useTenant } from '../../../../core/context/TenantContext';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { CheckCircle, Copy, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// ADD PARENT MODAL — no alert() calls, all feedback is inline
// ════════════════════════════════════════════════════════════════════════════

const AddParentModal = ({ onClose, onSave }) => {
  const { schoolId } = useTenant();
  const { supabase: tenantSupabase } = useApp();
  const { name: schoolName } = useBranding();

  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', student_id: '' });
  const [students, setStudents]         = useState([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [credentials, setCredentials]   = useState(null); // success state
  const [copied, setCopied]             = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adminStatus, setAdminStatus]   = useState({ checking: true, hasAccess: false });

  useEffect(() => {
    loadStudents();
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const status = await checkAdminAccess();
    setAdminStatus({ checking: false, ...status });
  };

  const loadStudents = async () => {
    const { data } = await tenantSupabase
      .from('students')
      .select('*')
      .eq('status', 'active')
      .order('class_name')
      .order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.full_name || !formData.email) {
      setError('Please fill in name and email.');
      return;
    }
    if (!adminStatus.hasAccess) {
      setError(`Admin access required: ${adminStatus.reason}`);
      return;
    }
    if (!schoolId) {
      setError('School context not loaded. Please refresh the page.');
      return;
    }

    try {
      setSaving(true);
      const tempPassword = generateTempPassword(schoolName);

      const authUser = await createUser(formData.email, tempPassword, {
        full_name: formData.full_name,
        role: 'parent',
      });
      if (!authUser?.id) throw new Error('Failed to create auth user');

      await new Promise(r => setTimeout(r, 500));

      const { data: parentData, error: parentInsertError } = await supabase
        .from('parents')
        .insert({
          user_id: authUser.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          status: 'active',
          school_id: schoolId,
        })
        .select()
        .single();

      if (parentInsertError) {
        // Auth user was created — show credentials with a warning
        setCredentials({ name: formData.full_name, email: formData.email, password: tempPassword, warning: 'Account created but database record had an issue. The parent can still log in.' });
        return;
      }

      // Link to student if selected
      let linkWarning = '';
      if (formData.student_id && parentData?.id) {
        const { error: linkError } = await supabase
          .from('student_parents')
          .insert({ student_id: formData.student_id, parent_id: parentData.id, relationship: 'parent', is_primary: true, school_id: schoolId });
        if (linkError) linkWarning = 'Parent created but student link failed — you can link manually later.';
      }

      setCredentials({ name: formData.full_name, email: formData.email, password: tempPassword, warning: linkWarning });
      onSave();

    } catch (err) {
      if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setError('This email is already registered. Please use a different email address.');
      } else if (err.message?.includes('permission') || err.message?.includes('Insufficient')) {
        setError('Permission denied. You need admin or owner role to create users.');
      } else {
        setError(err.message || 'Failed to create parent account. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin: ${window.location.origin}`
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
    .catch(() => setCopied(false));
  };

  const studentsByClass = students.reduce((acc, s) => {
    const cls = s.class_name || 'No Class';
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(s);
    return acc;
  }, {});

  // ── loading permissions ───────────────────────────────────────────────────
  if (adminStatus.checking) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Checking permissions…</p>
        </div>
      </div>
    );
  }

  // ── success: show credentials ─────────────────────────────────────────────
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="p-6 border-b bg-emerald-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={22} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Parent Account Created</h3>
              <p className="text-sm text-gray-500">Share these credentials securely</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            {credentials.warning && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                {credentials.warning}
              </div>
            )}

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2.5 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Name</span>
                <span className="text-gray-900">{credentials.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Email</span>
                <span className="text-gray-900">{credentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 tracking-wider">
                    {showPassword ? credentials.password : '••••••••'}
                  </span>
                  <button onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Login URL</span>
                <span className="text-gray-900 text-xs">{window.location.origin}</span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <Copy size={14} />
              {copied ? 'Copied to clipboard!' : 'Copy credentials'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              ⚠️ The parent must change their password after first login.
            </p>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── main form ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Add New Parent</h3>
            <p className="text-sm text-gray-500 mt-0.5">Create account and link to a student</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Permission warning */}
        {!adminStatus.hasAccess && (
          <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            <div>
              <strong>Limited access:</strong> {adminStatus.reason}
              <br /><span className="text-xs text-amber-600">Contact an admin to create parent accounts.</span>
            </div>
          </div>
        )}

        {/* Inline error */}
        {error && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="Jane Smith"
              required
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="jane.smith@email.com"
              required
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="+381 60 123 4567"
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link to Student (optional)</label>
            <select
              value={formData.student_id}
              onChange={e => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              disabled={!adminStatus.hasAccess}
            >
              <option value="">— Select student —</option>
              {Object.entries(studentsByClass).sort().map(([cls, classStudents]) => (
                <optgroup key={cls} label={cls}>
                  {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">You can link more children later via "Manage Children"</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
            A temporary password will be generated automatically. Share it securely with the parent.
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !adminStatus.hasAccess}
            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Creating…' : 'Create Parent Account'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddParentModal;
