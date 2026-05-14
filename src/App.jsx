import React from 'react';
import { TenantProvider, useTenant } from './core/context/TenantContext';
import { AuthProvider, useAuth } from './core/context/AuthContext';
import { BrandingProvider } from './core/context/BrandingContext';
import { supabase } from './core/infrastructure/supabaseClient';
import SchoolApp from './school/SchoolApp';
import OwnerDashboard from './owner/OwnerDashboard';
import LoginPage from './auth/LoginPage';
import ResetPasswordPage from './auth/ResetPasswordPage';
import Privacy from './marketing/Privacy';
import Terms from './marketing/Terms';

function App() {
  return (
    <TenantProvider>
      <AppWithTenant />
    </TenantProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// APP WITH TENANT - Wrapper that passes schoolId to AuthProvider
// ═══════════════════════════════════════════════════════════════════════════
const AppWithTenant = () => {
  const { schoolId, loading: tenantLoading } = useTenant();
  
  // Wait for tenant to load before rendering AuthProvider
  // Important: AuthProvider needs schoolId from the start
  if (tenantLoading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  return (
    <AuthProvider supabase={supabase} schoolId={schoolId}>
      <BrandingProvider>
        <AppRouter />
      </BrandingProvider>
    </AuthProvider>
  );
};

const AppRouter = () => {
  const { isOwnerDashboard, isMarketing, isSchool, loading: tenantLoading, error } = useTenant();
  const { user, teacher, isParent, loading: authLoading, error: authError } = useAuth();
  
  const path = window.location.pathname;
  
  // ════════════════════════════════════════════════════════
  // STATIC PAGES (no auth required)
  // ════════════════════════════════════════════════════════
  if (path === '/privacy') return <Privacy />;
  if (path === '/terms') return <Terms />;
  if (path === '/reset-password') return <ResetPasswordPage />;
  
  // ════════════════════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════════════════════
  if (tenantLoading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  // ════════════════════════════════════════════════════════
  // MARKETING / LANDING PAGE
  // ════════════════════════════════════════════════════════
  if (isMarketing) {
    return <PlatformPage />;
  }
  
  // ════════════════════════════════════════════════════════
  // OWNER DASHBOARD (owner.schoolhub.rs)
  // ════════════════════════════════════════════════════════
  if (isOwnerDashboard) {
    if (authLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }
    if (!user) {
      return <LoginPage redirectTo="owner" />;
    }
    return <OwnerDashboard />;
  }
  
  // ════════════════════════════════════════════════════════
  // SCHOOL APP (school-slug.schoolhub.rs or custom domain)
  // ════════════════════════════════════════════════════════
  if (isSchool) {
    // School not found error
    if (error) {
      return <SchoolNotFound error={error} />;
    }
    
    if (authLoading) {
      return <LoadingScreen message="Checking authentication..." />;
    }
    
    // 🔒 Auth error (e.g., user doesn't belong to this school)
    if (authError) {
      return <AccessDenied error={authError} />;
    }
    
    if (!user) {
      return <LoginPage redirectTo="school" />;
    }
    
    return <SchoolApp />;
  }
  
  // ════════════════════════════════════════════════════════
  // DEFAULT FALLBACK
  // ════════════════════════════════════════════════════════
  return <PlatformPage />;
};

// ══════════════════════════════════════════════════════════
// LOADING SCREEN
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// SCHOOL NOT FOUND
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// ACCESS DENIED (user doesn't belong to this school)
// ══════════════════════════════════════════════════════════
const AccessDenied = ({ error }) => {
  const { school } = useTenant();
  const { signOut } = useAuth();

  const primaryColor = school?.primary_color || '#10b981';
  const logoUrl = school?.logo_url;
  const schoolName = school?.name || 'School';

  const handleSignOut = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}18 50%, ${primaryColor}08 100%)` }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-16 w-auto object-contain mx-auto" style={{ maxWidth: '200px' }} />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mx-auto" style={{ backgroundColor: primaryColor }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          )}
          <p className="text-gray-500 text-sm mt-3 font-medium">{schoolName}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-7">
            {error || "You don't have access to this school. Please contact your school administrator."}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: primaryColor, boxShadow: `0 8px 24px -8px ${primaryColor}60` }}
            >
              Sign out and try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 text-gray-500 font-medium rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
            >
              Refresh page
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by <span className="font-medium text-gray-500">SchoolHub</span>
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════
// PLATFORM PAGE — shown on main domain (not a school subdomain)
// ══════════════════════════════════════════════════════════
const PlatformPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
    <div className="text-center max-w-md mx-auto p-8">
      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-200">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">E-Diary</h1>
      <p className="text-gray-500 mb-6">School Management Platform</p>
      <p className="text-sm text-gray-400">Please access your school's portal using your school's address.</p>
    </div>
  </div>
);

export default App;