import React, { useState, useEffect } from 'react';
import { useTenant } from '../core/context/TenantContext';
import { supabase } from '../core/infrastructure/supabaseClient';
import { 
  Lock, Eye, EyeOff, CheckCircle, AlertCircle, 
  GraduationCap, ArrowRight, ShieldCheck 
} from 'lucide-react';

// ============================================================================
// RESET PASSWORD PAGE
// Location: src/auth/ResetPasswordPage.jsx
// 
// This page handles the password reset flow when user clicks the link in email.
// URL format: /reset-password (Supabase handles the token automatically)
// ============================================================================

const ResetPasswordPage = () => {
  const { school } = useTenant();
  
  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // School branding
  const schoolName = school?.name || 'School';
  const logoUrl = school?.logo_url;
  const primaryColor = school?.primary_color || '#10b981';

  // ─── Check for valid reset session ─────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Supabase automatically handles the token from URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError('Invalid or expired reset link. Please request a new one.');
          setCheckingSession(false);
          return;
        }

        if (session) {
          console.log('✅ Valid reset session found');
          setSessionReady(true);
        } else {
          // Listen for auth state change (token might be processing)
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            if (event === 'PASSWORD_RECOVERY') {
              setSessionReady(true);
              setCheckingSession(false);
            }
          });

          // Give it a moment to process
          setTimeout(() => {
            if (!sessionReady) {
              setError('Invalid or expired reset link. Please request a new one.');
            }
            setCheckingSession(false);
          }, 2000);

          return () => subscription.unsubscribe();
        }
      } catch (err) {
        console.error('Check session error:', err);
        setError('Something went wrong. Please try again.');
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // ─── Password validation ───────────────────────────────
  const validatePassword = () => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return null;
  };

  // ─── Handle password reset ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      console.log('✅ Password updated successfully');
      setSuccess(true);

      // Sign out after password reset (user will need to login with new password)
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Redirect to login ─────────────────────────────────
  const goToLogin = () => {
    window.location.href = '/';
  };

  // ═══════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════
  if (checkingSession) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`
        }}
      >
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: `${primaryColor}30`, borderTopColor: primaryColor }}
          />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // SUCCESS STATE
  // ═══════════════════════════════════════════════════════
  if (success) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`
        }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            {logoUrl ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={logoUrl} 
                  alt={schoolName} 
                  className="h-16 w-auto object-contain"
                  style={{ maxWidth: '200px' }}
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <GraduationCap size={32} className="text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <ShieldCheck size={40} style={{ color: primaryColor }} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h2>
            <p className="text-gray-500 mb-6">
              Your password has been successfully changed.<br />
              You can now sign in with your new password.
            </p>

            <button
              onClick={goToLogin}
              className="w-full py-3.5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              style={{ backgroundColor: primaryColor }}
            >
              Go to Login
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ERROR STATE (Invalid/Expired Link)
  // ═══════════════════════════════════════════════════════
  if (error && !sessionReady) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`
        }}
      >
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            {logoUrl ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={logoUrl} 
                  alt={schoolName} 
                  className="h-16 w-auto object-contain"
                  style={{ maxWidth: '200px' }}
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <GraduationCap size={32} className="text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Error Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h2>
            <p className="text-gray-500 mb-6">
              {error}
            </p>

            <button
              onClick={goToLogin}
              className="w-full py-3.5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              style={{ backgroundColor: primaryColor }}
            >
              Back to Login
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // RESET FORM
  // ═══════════════════════════════════════════════════════
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt={schoolName} 
                className="h-16 w-auto object-contain"
                style={{ maxWidth: '200px' }}
              />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <GraduationCap size={32} className="text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Lock size={24} style={{ color: primaryColor }} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Password</h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter your new password below
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoFocus
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 3px ${primaryColor}25`;
                    e.target.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 3px ${primaryColor}25`;
                    e.target.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {/* Match indicator */}
              {confirmPassword && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-xs text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} className="text-red-500" />
                      <span className="text-xs text-red-600">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || password !== confirmPassword}
              className="w-full py-3.5 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Resetting...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a 
              href="https://schoolhub.rs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              SchoolHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;