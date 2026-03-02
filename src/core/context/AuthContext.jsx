import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, supabase }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Refs for state management
  const isSigningOut = useRef(false);
  const isMounted = useRef(true);
  const isLoadingAuth = useRef(false);
  const hasLoadedInitialUser = useRef(false);

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

  // Initialize auth on mount
  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    isMounted.current = true;

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
              if (JSON.stringify(prev) === JSON.stringify(profileData)) {
                return prev;
              }
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
  // SIGN OUT - Fixed to preserve subdomain
  // ============================================================================
  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      isSigningOut.current = true;
      hasLoadedInitialUser.current = false;
      
      clearAuthState();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('⚠️ Supabase sign out error:', error);
      }
      
      console.log('✅ Signed out');
      
      // ✅ FIX: Preserve subdomain on logout
      // Instead of window.location.href = '/' which loses subdomain,
      // redirect to current origin (which includes subdomain)
      const currentOrigin = window.location.origin;
      console.log('🔄 Redirecting to:', currentOrigin);
      window.location.href = currentOrigin;
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Even on error, redirect to current origin
      window.location.href = window.location.origin;
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