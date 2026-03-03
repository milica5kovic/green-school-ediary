import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Extract subdomain from current URL
// ═══════════════════════════════════════════════════════════════════════════
const getSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Check URL params first (for development)
  const params = new URLSearchParams(window.location.search);
  const schoolParam = params.get('school');
  if (schoolParam) return schoolParam;
  
  // For xxx.localhost format
  if (hostname.includes('.localhost')) {
    const parts = hostname.split('.');
    if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
      return parts[0]; // e.g., "greenschool" from "greenschool.localhost"
    }
  }
  
  // For production domains (xxx.schoolhub.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    if (sub !== 'www' && sub !== 'app') {
      return sub;
    }
  }
  
  return null;
};

export const AuthProvider = ({ children, supabase }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isSigningOut = useRef(false);
  const isMounted = useRef(true);
  const isLoadingAuth = useRef(false);
  const hasLoadedInitialUser = useRef(false);
  
  // ✅ Store subdomain on mount (before any logout can happen)
  const initialSubdomain = useRef(getSubdomain());

  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId || isSigningOut.current) return null;
    
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ Profile load error:', profileError);
        return null;
      }

      console.log('✅ Profile loaded:', data?.role);
      return data;
    } catch (err) {
      console.error('❌ Error loading profile:', err);
      return null;
    }
  }, [supabase]);

  const loadTeacher = useCallback(async (userId) => {
    if (!supabase || !userId || isSigningOut.current) return null;
    
    try {
      const { data, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (teacherError) {
        console.log('ℹ️ No teacher profile for user');
        return null;
      }

      console.log('✅ Teacher loaded');
      return data;
    } catch (err) {
      console.error('❌ Error loading teacher:', err);
      return null;
    }
  }, [supabase]);

  const clearAuthState = useCallback(() => {
    console.log('🔒 Clearing auth state');
    if (!isMounted.current) return;
    
    setUser(null);
    setProfile(null);
    setTeacher(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    isMounted.current = true;
    
    // Update subdomain ref on mount
    initialSubdomain.current = getSubdomain();
    console.log('🏫 Stored subdomain:', initialSubdomain.current);

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log('🔐 Initializing auth...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user && mounted && !isSigningOut.current) {
          console.log('✅ Session found');
          hasLoadedInitialUser.current = true;
          setUser(session.user);
          
          const profileData = await loadProfile(session.user.id);
          if (mounted) setProfile(profileData);
          
          if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
            const teacherData = await loadTeacher(session.user.id);
            if (mounted) setTeacher(teacherData);
          }
        } else {
          console.log('ℹ️ No session');
          if (mounted) clearAuthState();
        }
      } catch (err) {
        console.error('❌ Auth init error:', err);
        if (mounted) {
          setError(err.message);
          clearAuthState();
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event);
      
      if (!mounted) return;

      if (isLoadingAuth.current && event !== 'SIGNED_OUT') {
        console.log('⚠️ Auth already loading, skipping');
        return;
      }

      if (isSigningOut.current || event === 'SIGNED_OUT') {
        console.log('👋 Signed out');
        clearAuthState();
        setLoading(false);
        isSigningOut.current = false;
        isLoadingAuth.current = false;
        hasLoadedInitialUser.current = false;
        return;
      }

      if (event === 'SIGNED_IN') {
        if (hasLoadedInitialUser.current) {
          console.log('⚠️ Already loaded user, skipping duplicate SIGNED_IN event');
          return;
        }
        
        hasLoadedInitialUser.current = true;
        isLoadingAuth.current = true;
        
        if (session?.user) {
          console.log('🔐 Loading user data after SIGNED_IN (first time)');
          setUser(session.user);
          
          const profileData = await loadProfile(session.user.id);
          
          if (mounted) {
            setProfile(prev => {
              if (JSON.stringify(prev) === JSON.stringify(profileData)) return prev;
              return profileData;
            });
          }
          
          if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
            const teacherData = await loadTeacher(session.user.id);
            
            if (mounted) {
              setTeacher(prev => {
                if (!teacherData) return null;
                if (prev && 
                    prev.user_id === teacherData.user_id && 
                    prev.full_name === teacherData.full_name &&
                    prev.email === teacherData.email &&
                    JSON.stringify(prev.subjects) === JSON.stringify(teacherData.subjects)) {
                  return prev;
                }
                return teacherData;
              });
            }
          }
        }
        
        isLoadingAuth.current = false;
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed (keeping existing data, no reload)');
        if (session?.user && mounted) {
          setUser(session.user);
        }
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      console.log('🧹 Cleanup auth subscription');
      mounted = false;
      isMounted.current = false;
      subscription?.unsubscribe();
    };
  }, [supabase, loadProfile, loadTeacher, clearAuthState]);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      isSigningOut.current = false;
      hasLoadedInitialUser.current = false;

      console.log('🔐 Signing in...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      console.log('✅ Sign in successful');
      return { success: true };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  // ============================================================================
  // SIGN OUT - Preserves subdomain for localhost
  // ============================================================================
  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // ✅ Get subdomain BEFORE clearing anything
      const subdomain = initialSubdomain.current || getSubdomain();
      console.log('🏫 Subdomain to preserve:', subdomain);
      
      isSigningOut.current = true;
      hasLoadedInitialUser.current = false;
      
      clearAuthState();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('⚠️ Supabase sign out error:', error);
      }
      
      console.log('✅ Signed out');
      
      // ═══════════════════════════════════════════════════════════════════════
      // Reconstruct the correct URL with subdomain
      // ═══════════════════════════════════════════════════════════════════════
      
      const protocol = window.location.protocol; // "http:" or "https:"
      const port = window.location.port; // "3000" or ""
      
      let redirectUrl;
      
      if (subdomain) {
        // For localhost with subdomain: greenschool.localhost:3000
        if (window.location.hostname.includes('localhost') || window.location.hostname === 'localhost') {
          redirectUrl = `${protocol}//${subdomain}.localhost${port ? ':' + port : ''}/`;
        } else {
          // For production: greenschool.schoolhub.com
          const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
          redirectUrl = `${protocol}//${subdomain}.${baseDomain}${port ? ':' + port : ''}/`;
        }
      } else {
        // No subdomain - just go to current origin
        redirectUrl = `${protocol}//${window.location.hostname}${port ? ':' + port : ''}/`;
      }
      
      console.log('🔄 Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Fallback: just reload
      window.location.reload();
    }
  };

  const updatePassword = async (newPassword) => {
    setError(null);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      return { success: true };
    } catch (err) {
      console.error('❌ Password update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Permission helpers
  const isAdmin = () => profile?.role === 'admin';
  const isTeacher = () => profile?.role === 'teacher' || profile?.role === 'admin';
  const isParent = () => profile?.role === 'parent';
  const isClassTeacher = () => !!teacher?.class_teacher_for;
  const getClassTeacherFor = () => teacher?.class_teacher_for || null;
  const canManageStudents = () => profile?.role === 'admin';
  const canManageSettings = () => profile?.role === 'admin';
  const canAddGrades = () => profile?.role === 'teacher' || profile?.role === 'admin';
  const canMarkAttendance = () => profile?.role === 'teacher' || profile?.role === 'admin';
  const canCreateHomework = () => profile?.role === 'teacher' || profile?.role === 'admin';
  const canViewAllClasses = () => profile?.role === 'admin';
  const getTeacherSubjects = () => teacher?.subjects || [];
  const getTeacherId = () => teacher?.id || null;

  const value = {
    user,
    profile,
    teacher,
    loading,
    error,
    signIn,
    signOut,
    updatePassword,
    isAdmin,
    isTeacher,
    isParent,
    isClassTeacher,
    getClassTeacherFor,
    canManageStudents,
    canManageSettings,
    canAddGrades,
    canMarkAttendance,
    canCreateHomework,
    canViewAllClasses,
    getTeacherSubjects,
    getTeacherId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;