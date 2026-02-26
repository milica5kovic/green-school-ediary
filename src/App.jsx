import React from 'react';
import { TenantProvider, useTenant } from './core/context/TenantContext';
import { AuthProvider, useAuth } from './core/context/AuthContext';
import { supabase } from './core/infrastructure/supabaseClient';
import SchoolApp from './school/SchoolApp';
import OwnerDashboard from './owner/OwnerDashboard';
import AkioLanding from './marketing/AkioLanding';
import LoginPage from './auth/LoginPage';
import Privacy from './marketing/Privacy';
import Terms from './marketing/Terms';

function App() {
  return (
    <TenantProvider>
      <AuthProvider supabase={supabase}>
        <AppRouter />
      </AuthProvider>
    </TenantProvider>
  );
}

const AppRouter = () => {
  const { isOwnerDashboard, isMarketing, isSchool, loading: tenantLoading, error } = useTenant();
  const { user, teacher, isParent, loading: authLoading } = useAuth();

  const path = window.location.pathname;
  if (path === '/privacy') return <Privacy />;
  if (path === '/terms') return <Terms />;

  if (tenantLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (isMarketing) {
    return <AkioLanding />;
  }

  if (isOwnerDashboard) {
    if (authLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }
    if (!user) {
      return <LoginPage redirectTo="owner" />;
    }
    return <OwnerDashboard />;
  }

  if (isSchool) {
    if (error) {
      return <SchoolNotFound error={error} />;
    }
    if (authLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }
    if (!user) {
      return <LoginPage redirectTo="school" />;
    }
    return <SchoolApp />;
  }

  return <AkioLanding />;
};

const LoadingScreen = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 animate-pulse" />
        <div className="absolute inset-2 rounded-xl bg-white flex items-center justify-center">
          <svg className="w-6 h-6 text-violet-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

const SchoolNotFound = ({ error }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center max-w-md mx-auto p-8">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">School Not Found</h1>
      <p className="text-gray-600 mb-6">{error}</p>
      <a 
        href="/" 
        className="inline-block px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Go to Home
      </a>
    </div>
  </div>
);

export default App;