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
  
  // Track if we're in the middle of signing out
  const isSigningOut = useRef(false);
  const isMounted = useRef(true);

  // Load user profile from profiles table
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

  // Load teacher info from teachers table
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

  // Centralized state clearing function
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
          setUser(session.user);
          
          const profileData = await loadProfile(session.user.id);
          if (mounted) setProfile(profileData);
          
          // Only load teacher if user is teacher or admin
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

    // Handle auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth event:', event);
      
      if (!mounted) return;

      // If signing out, only clear state
      if (isSigningOut.current || event === 'SIGNED_OUT') {
        console.log('👋 Signed out');
        clearAuthState();
        setLoading(false);
        isSigningOut.current = false;
        return;
      }

      // Handle sign in and token refresh (keeps user logged in)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          console.log('🔐 Loading user data after', event);
          setUser(session.user);
          
          const profileData = await loadProfile(session.user.id);
          if (mounted) setProfile(profileData);
          
          if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
            const teacherData = await loadTeacher(session.user.id);
            if (mounted) setTeacher(teacherData);
          }
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

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Set flag to prevent reloading during sign out
      isSigningOut.current = true;
      
      // Clear state immediately
      clearAuthState();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('⚠️ Supabase sign out error:', error);
      }
      
      console.log('✅ Signed out');
      
      // Force redirect to login
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Even on error, redirect to login
      window.location.href = '/';
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