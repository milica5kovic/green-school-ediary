import React, { useState } from 'react';
import { useAuth } from '../core/context/AuthContext';
import { useTenant } from '../core/context/TenantContext';
import { supabase } from '../core/infrastructure/supabaseClient';
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, 
  GraduationCap, ArrowLeft, CheckCircle, Send 
} from 'lucide-react';

// ============================================================================
// LOGIN PAGE - Multi-tenant with Forgot Password
// Location: src/auth/LoginPage.jsx
// ============================================================================

const LoginPage = () => {
  const { signIn, loading: authLoading, error: authError } = useAuth();
  const { school } = useTenant();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState(null);

  // School branding
  const schoolName = school?.name || 'School';
  const logoUrl = school?.logo_url;
  const primaryColor = school?.primary_color || '#10b981';
  const tagline = school?.tagline || 'Digital Learning Platform';

  // ─── Login Handler ─────────────────────────────────────
  const friendlyError = (msg = '') => {
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
      return 'Pogrešan email ili lozinka. Pokušajte ponovo.';
    }
    if (msg.includes('Email not confirmed')) {
      return 'Email adresa nije potvrđena. Proverite inbox.';
    }
    if (msg.includes('Too many requests') || msg.includes('rate limit')) {
      return 'Previše neuspelih pokušaja. Sačekajte nekoliko minuta.';
    }
    if (msg.includes('Nemate pristup') || msg.includes('school')) {
      return msg;
    }
    if (msg.includes('Network') || msg.includes('fetch')) {
      return 'Problem sa vezom. Proverite internet i pokušajte ponovo.';
    }
    return msg || 'Prijava nije uspela. Pokušajte ponovo.';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (!result.success) {
        setError(friendlyError(result.error));
      }
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password Handler ───────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetError(null);
    
    if (!resetEmail) {
      setResetError('Please enter your email address');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      setResetSent(true);
    } catch (err) {
      console.error('Reset password error:', err);
      // Don't reveal if email exists or not for security
      setResetError('If an account exists with this email, you will receive a reset link.');
    } finally {
      setResetLoading(false);
    }
  };

  // ─── Back to Login ─────────────────────────────────────
  const backToLogin = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
    setResetError(null);
  };

  // ═══════════════════════════════════════════════════════
  // FORGOT PASSWORD VIEW
  // ═══════════════════════════════════════════════════════
  if (showForgotPassword) {
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

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            {resetSent ? (
              // ─── Success State ─────────────────────────
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <CheckCircle size={32} style={{ color: primaryColor }} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-500 text-sm mb-6">
                  We've sent a password reset link to<br />
                  <span className="font-medium text-gray-700">{resetEmail}</span>
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Didn't receive the email? Check your spam folder or try again in a few minutes.
                </p>
                <button
                  onClick={backToLogin}
                  className="w-full py-3 text-white font-semibold rounded-xl transition-all hover:shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Back to Login
                </button>
              </div>
            ) : (
              // ─── Form State ────────────────────────────
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                {/* Error Alert */}
                {resetError && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700">{resetError}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                        autoFocus
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                        onFocus={(e) => {
                          e.target.style.boxShadow = `0 0 0 3px ${primaryColor}25`;
                          e.target.style.borderColor = primaryColor;
                        }}
                        onBlur={(e) => {
                          e.target.style.boxShadow = 'none';
                          e.target.style.borderColor = '#e5e7eb';
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail}
                    className="w-full py-3.5 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {resetLoading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Reset Link
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                  <button 
                    type="button"
                    onClick={backToLogin}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // LOGIN VIEW
  // ═══════════════════════════════════════════════════════
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo & School Name */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <div className="flex justify-center mb-4">
              <img 
                src={logoUrl} 
                alt={schoolName} 
                className="h-20 w-auto object-contain"
                style={{ maxWidth: '280px' }}
              />
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <GraduationCap size={40} className="text-white" />
              </div>
            </div>
          )}
          
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {schoolName}
          </h1>
          <p className="text-gray-500 text-sm">{tagline}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
          </div>

          {/* Error Alert */}
          {(error || authError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error || friendlyError(authError)}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
                  onFocus={(e) => {
                    e.target.style.boxShadow = `0 0 0 3px ${primaryColor}25`;
                    e.target.style.borderColor = primaryColor;
                  }}
                  onBlur={(e) => {
                    e.target.style.boxShadow = 'none';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              disabled={loading || authLoading || !email || !password}
              className="w-full py-3.5 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ 
                backgroundColor: primaryColor,
                boxShadow: `0 10px 30px -10px ${primaryColor}60`
              }}
            >
              {(loading || authLoading) ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setResetEmail(email); // Pre-fill with login email if entered
              }}
              className="text-sm hover:underline transition-colors"
              style={{ color: primaryColor }}
            >
              Forgot your password?
            </button>
          </div>
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

export default LoginPage;