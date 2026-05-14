import React, { useState, useEffect } from 'react';
import { createParent, generateTempPassword } from '../../../../core/infrastructure/adminApi';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { useTenant } from '../../../../core/context/TenantContext';
import {
  CheckCircle, Copy, AlertTriangle, X, Eye, EyeOff,
  UserPlus, Loader2, Mail, Users,
} from 'lucide-react';

const AddParentModal = ({ onClose, onSave }) => {
  const { supabase } = useApp();
  const { name: schoolName, primaryColor } = useBranding();
  const { schoolId } = useTenant();

  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', student_id: '' });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState({ creds: false, email: false });

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, name, class_name')
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

    try {
      setSaving(true);
      const tempPassword = generateTempPassword(schoolName);

      // Atomic: edge function creates auth user + parent record together
      const { parent: parentData } = await createParent({
        email: formData.email,
        password: tempPassword,
        full_name: formData.full_name,
        phone: formData.phone || null,
      });

      // Link to student if selected
      let linkWarning = '';
      if (formData.student_id && parentData?.id) {
        const { error: linkError } = await supabase
          .from('student_parents')
          .insert({ student_id: formData.student_id, parent_id: parentData.id, relationship: 'parent', is_primary: true });
        if (linkError) linkWarning = 'Parent created but student link failed — you can link them manually later.';
      }

      await onSave(); // refresh data in parent component
      setCredentials({ name: formData.full_name, email: formData.email, password: tempPassword, warning: linkWarning });

    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        setError('This email is already registered. Please use a different email address.');
      } else if (msg.includes('permission') || msg.includes('Insufficient') || msg.includes('staff record')) {
        setError('Permission denied. You need admin or owner role to create accounts.');
      } else {
        setError(msg || 'Failed to create parent account. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const emailTemplate = credentials ? `Subject: Your ${schoolName} parent portal access

Dear ${credentials.name},

Your parent account for ${schoolName} has been created. You can use the details below to log in to your parent portal.

🔗 Login page: ${window.location.origin}
📧 Email: ${credentials.email}
🔑 Password: ${credentials.password}

Please log in and change your password after your first login.

If you have any questions, please contact the school administration.

Best regards,
${schoolName}` : '';

  const handleCopyCreds = () => {
    navigator.clipboard.writeText(
      `Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin: ${window.location.origin}`
    ).then(() => {
      setCopied(c => ({ ...c, creds: true }));
      setTimeout(() => setCopied(c => ({ ...c, creds: false })), 2500);
    }).catch(() => {});
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailTemplate).then(() => {
      setCopied(c => ({ ...c, email: true }));
      setTimeout(() => setCopied(c => ({ ...c, email: false })), 2500);
    }).catch(() => {});
  };

  const studentsByClass = students.reduce((acc, s) => {
    const cls = s.class_name || 'No Class';
    if (!acc[cls]) acc[cls] = [];
    acc[cls].push(s);
    return acc;
  }, {});

  // ── Credentials screen ───────────────────────────────────
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Account Created!</h3>
                <p className="text-emerald-100 text-sm">Share login details with {credentials.name}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {credentials.warning && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                {credentials.warning}
              </div>
            )}

            {/* Credentials card */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {[
                { label: 'Name', value: credentials.name },
                { label: 'Email', value: credentials.email },
                { label: 'Login URL', value: window.location.origin },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className="text-sm text-gray-800 font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800 tracking-wider">
                    {showPassword ? credentials.password : '••••••••••'}
                  </span>
                  <button onClick={() => setShowPassword(v => !v)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Copy credentials */}
            <button
              onClick={handleCopyCreds}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                copied.creds ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied.creds ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied.creds ? 'Copied!' : 'Copy credentials'}
            </button>

            {/* Email template section */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Ready-to-send email</span>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied.email ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                >
                  {copied.email ? <CheckCircle size={12} /> : <Copy size={12} />}
                  {copied.email ? 'Copied!' : 'Copy email'}
                </button>
              </div>
              <pre className="p-4 text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed bg-white max-h-48 overflow-y-auto">
                {emailTemplate}
              </pre>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Ask the parent to change their password after first login.
            </p>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
              <UserPlus size={18} style={{ color: primaryColor }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Add Parent</h3>
              <p className="text-gray-400 text-xs mt-0.5">A login account will be created automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-shadow"
                placeholder="Jane Smith"
                required
                onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-shadow"
                placeholder="jane@email.com"
                required
                onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-shadow"
              placeholder="+381 60 123 4567"
              onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
              onBlur={e => e.target.style.boxShadow = 'none'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              <Users size={12} className="inline mr-1" />
              Link to Student (optional)
            </label>
            <select
              value={formData.student_id}
              onChange={e => setFormData(f => ({ ...f, student_id: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white cursor-pointer"
              onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
              onBlur={e => e.target.style.boxShadow = 'none'}
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

          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700">
            <Mail size={13} className="mt-0.5 flex-shrink-0" />
            A temporary password will be generated. After creating the account you'll get a ready-to-send email template.
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving ? 'Creating account...' : 'Create Parent Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddParentModal;
