import React, { useState } from 'react';
import { useAuth } from '../core/context/AuthContext';
import { useTenant } from '../core/context/TenantContext';
import { Sparkles, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage = ({ redirectTo = 'school' }) => {
  // ISPRAVKA: useAuth vraća signIn, ne login
  const { signIn, loading: authLoading, error: authError } = useAuth();
  const { school, primaryColor, schoolName, logoUrl, isSchool } = useTenant();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // ISPRAVKA: koristi signIn umesto login
      const result = await signIn(email, password);
      
      if (!result.success) {
        setError(result.error || 'Failed to login');
      }
      // Ako je uspešno, AuthContext će automatski update-ovati state
      // i App.jsx će renderovati SchoolApp umesto LoginPage
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // Boja zavisi od konteksta
  const accentColor = isSchool ? (primaryColor || '#10b981') : '#8b5cf6';

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            {isSchool ? (
              <div className="flex items-center justify-center gap-3 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={schoolName} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: accentColor }}
                  >
                    {schoolName?.charAt(0) || 'S'}
                  </div>
                )}
                <div className="text-left">
                  <h1 className="text-xl font-bold text-gray-900">{schoolName}</h1>
                  <p className="text-sm text-gray-500">SchoolHub</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-xl font-bold text-gray-900">SchoolHub</h1>
                  <p className="text-sm text-gray-500">by Akio</p>
                </div>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-2">Welcome back</h2>
            <p className="text-gray-600">
              {isSchool 
                ? 'Sign in to access your school dashboard'
                : 'Sign in to manage your schools'
              }
            </p>
          </div>

          {/* Error Alert */}
          {(error || authError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error || authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a 
                href="#forgot" 
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-4 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
              style={{ 
                backgroundColor: accentColor,
                boxShadow: `0 10px 30px -10px ${accentColor}50`
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
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Powered by{' '}
              <a href="/" className="font-medium text-violet-600 hover:underline">
                Akio
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36" />
        
        <div className="relative text-center text-white max-w-md">
          <h2 className="text-3xl font-bold mb-4">
            {isSchool 
              ? `Welcome to ${schoolName}`
              : 'Manage All Your Schools'
            }
          </h2>
          <p className="text-lg text-white/80 mb-8">
            {isSchool
              ? 'Access grades, attendance, homework, and more — all in one place.'
              : 'SchoolHub gives you complete control over all your school tenants.'
            }
          </p>
          
          {/* Feature list */}
          <div className="space-y-4 text-left">
            {(isSchool ? [
              'Track attendance in real-time',
              'Cambridge curriculum grading',
              'Parent communication portal',
            ] : [
              'Onboard new schools in minutes',
              'Monitor usage and analytics',
              'Manage subscriptions & billing',
            ]).map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;