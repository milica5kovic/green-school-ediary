import React, { useState } from 'react';
import { BookOpen, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (!email || !password) {
      setLoginError('Please enter both email and password');
      return;
    }

    const result = await signIn(email, password, rememberMe);
    
    if (!result.success) {
      setLoginError(result.error || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Green School E-Diary
          </h1>
          <p className="text-gray-600 mt-2">Digital Learning Management</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="your.email@greenschool.edu.rs"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                  disabled={loading}
                />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
            </div>

            {/* Error Message */}
            {(loginError || error) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-red-700 flex-1">
                  {loginError || error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact your administrator
            </p>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © 2025 Green School. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;