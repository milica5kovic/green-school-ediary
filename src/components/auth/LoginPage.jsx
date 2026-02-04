import React, { useState } from 'react';
import { BookOpen, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../infrastructure/supabaseClient'; // ← ADD THIS LINE

const LoginPage = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      if (result.error?.includes('Invalid login credentials')) {
        setError('❌ Invalid email or password. Please try again.');
      } else if (result.error?.includes('Email not confirmed')) {
        setError('⚠️ Please check your email and confirm your account first.');
      } else {
        setError(`❌ Login failed: ${result.error}`);
      }
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = prompt('Enter your email address:');
    if (!email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      alert('✅ Password reset email sent!\n\nCheck your inbox for instructions.');
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BookOpen size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Green School E-Diary
          </h1>
          <p className="text-gray-600 mt-2">Digital Learning Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="your.email@greenschool.edu.rs"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="Enter your password"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center mt-4">
            <button
              onClick={handleForgotPassword}
              className="text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © 2026 Green School. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;