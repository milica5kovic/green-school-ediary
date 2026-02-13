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
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../../core/context/AuthContext';

const SettingsPage = () => {
  const { teacher, user, profile, updatePassword, isAdmin } = useAuth();
  
  // Password Change State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ FIX: Force re-render when auth data changes
  useEffect(() => {
    console.log('🔄 SettingsPage - Auth data updated');
    console.log('  User:', user?.email);
    console.log('  Profile:', profile?.role);
    console.log('  Teacher:', teacher?.full_name);
  }, [user, profile, teacher]); // ✅ Re-render when auth changes

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
            <SettingsIcon size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        </div>
        <p className="text-gray-600 ml-13">Manage your account preferences</p>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={20} className="text-emerald-600" />
          Account Information
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <Mail size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-gray-900">{user?.email || 'Not available'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <User size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Full Name</p>
              <p className="text-gray-900">{teacher?.full_name || profile?.full_name || 'Not available'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <Shield size={20} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-gray-900 capitalize">{profile?.role || 'Teacher'}</p>
            </div>
          </div>

          {teacher?.subjects && teacher.subjects.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <BookOpen size={20} className="text-emerald-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Subjects</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {teacher.subjects.map((subject, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {teacher?.class_teacher_for && (
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <Shield size={20} className="text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Class Teacher For</p>
                <span className="inline-block mt-1 px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-medium">
                  {teacher.class_teacher_for}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Lock size={20} className="text-emerald-600" />
          Security
        </h3>

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Key size={18} />
            Change Password
          </button>
        ) : (
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Enter new password"
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isUpdating}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Confirm new password"
                  disabled={isUpdating}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isUpdating}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700 flex-1">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <p className="text-sm text-emerald-700 flex-1">{passwordSuccess}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  setPasswordSuccess('');
                }}
                disabled={isUpdating}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Info Note for Admins */}
      {isAdmin() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Admin Access:</strong> For school management features (Students, Classes, Subjects, Analytics, Parents, etc.), please navigate to <strong>Management</strong> from the sidebar.
          </p>
        </div>
      )}

      {/* Info Note for Teachers */}
      {!isAdmin() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Need to update your profile information or subjects? Please contact your administrator.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;