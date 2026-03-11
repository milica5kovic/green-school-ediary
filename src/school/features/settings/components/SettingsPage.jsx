import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Lock, 
  Mail, 
  User, 
  Shield, 
  Key, 
  Eye, 
  EyeOff,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../../core/context/AuthContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ============================================================================
// SETTINGS PAGE - Multi-tenant with useTermTheme
// ============================================================================

const SettingsPage = () => {
  const { teacher, user, profile, updatePassword, isAdmin } = useAuth();
  const branding = useBranding();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  
  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    console.log('🔄 SettingsPage - Auth data updated');
    console.log('  User:', user?.email);
    console.log('  Profile:', profile?.role);
    console.log('  Teacher:', teacher?.full_name);
  }, [user, profile, teacher]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
        
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(result.error || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    const name = teacher?.full_name || profile?.full_name || user?.email || '';
    if (name.includes('@')) return name.charAt(0).toUpperCase();
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  // Get role display
  const getRoleDisplay = () => {
    const role = profile?.role || 'teacher';
    if (role === 'admin') return { label: 'Administrator', color: 'bg-purple-100 text-purple-700' };
    if (role === 'teacher') return { label: 'Teacher', color: 'bg-blue-100 text-blue-700' };
    return { label: role, color: 'bg-gray-100 text-gray-700' };
  };

  const roleInfo = getRoleDisplay();

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ 
            backgroundColor: theme.withAlpha(0.1),
            borderWidth: '1px',
            borderColor: theme.withAlpha(0.2)
          }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>
              {theme.name} Term
            </span>
            <span className="text-xs text-gray-500">
              {new Date(theme.activeTerm.start_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>
            {theme.daysRemaining} days left
          </span>
        </div>
      )}

      {/* ═══ PROFILE HEADER CARD ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border overflow-hidden"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        {/* Gradient Header */}
        <div 
          className="h-24 relative"
          style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.withAlpha(0.7)})` }}
        >
          <div className="absolute -bottom-10 left-6">
            <div 
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-white"
              style={{ backgroundColor: theme.color }}
            >
              {getInitials()}
            </div>
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="pt-14 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {teacher?.full_name || profile?.full_name || 'User'}
              </h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
              {teacher?.class_teacher_for && (
                <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                  Class Teacher: {teacher.class_teacher_for}
                </span>
              )}
            </div>
          </div>

          {/* Subjects */}
          {teacher?.subjects && teacher.subjects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Subjects</p>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((subject, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={{ 
                      backgroundColor: theme.withAlpha(0.1), 
                      color: theme.color 
                    }}
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ ACCOUNT DETAILS ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border p-6"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} style={{ color: theme.color }} />
          Account Details
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.1) }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.withAlpha(0.15) }}
              >
                <Mail size={18} style={{ color: theme.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                <p className="text-gray-800 font-medium">{user?.email || 'Not available'}</p>
              </div>
            </div>
          </div>

          <div 
            className="p-4 rounded-xl border"
            style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.1) }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.withAlpha(0.15) }}
              >
                <Shield size={18} style={{ color: theme.color }} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</p>
                <p className="text-gray-800 font-medium capitalize">{profile?.role || 'Teacher'}</p>
              </div>
            </div>
          </div>

          {branding.name && (
            <div 
              className="p-4 rounded-xl border sm:col-span-2"
              style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.1) }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: theme.withAlpha(0.15) }}
                >
                  <BookOpen size={18} style={{ color: theme.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">School</p>
                  <p className="text-gray-800 font-medium">{branding.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ SECURITY SECTION ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border p-6"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={20} style={{ color: theme.color }} />
          Security
        </h3>

        {/* Success Message */}
        {passwordSuccess && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
            <p className="text-sm text-emerald-700">{passwordSuccess}</p>
          </div>
        )}

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.withAlpha(0.15) }}
              >
                <Key size={18} style={{ color: theme.color }} />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div 
              className="p-4 rounded-xl border"
              style={{ backgroundColor: theme.withAlpha(0.03), borderColor: theme.withAlpha(0.1) }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all"
                      style={{ 
                        '--tw-ring-color': theme.withAlpha(0.3),
                      }}
                      onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${theme.withAlpha(0.2)}`}
                      onBlur={(e) => e.target.style.boxShadow = 'none'}
                      placeholder="Enter new password"
                      disabled={isUpdating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isUpdating}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all"
                      onFocus={(e) => e.target.style.boxShadow = `0 0 0 2px ${theme.withAlpha(0.2)}`}
                      onBlur={(e) => e.target.style.boxShadow = 'none'}
                      placeholder="Confirm new password"
                      disabled={isUpdating}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={isUpdating}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">{passwordError}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2.5 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: theme.color }}
              >
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordSection(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                }}
                disabled={isUpdating}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ═══ INFO NOTES ═══ */}
      {isAdmin() && (
        <div 
          className="rounded-xl p-4 border"
          style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.15) }}
        >
          <p className="text-sm" style={{ color: theme.color }}>
            <strong>💡 Admin Access:</strong> For school management features (Students, Classes, Subjects, Analytics, Parents, etc.), navigate to <strong>Management</strong> from the sidebar.
          </p>
        </div>
      )}

      {!isAdmin() && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Need to update your profile information or subjects? Please contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;