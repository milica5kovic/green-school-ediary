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

// ═══════════════════════════════════════════════════════════════════════════
// AUTH PROVIDER
// Props:
//   - supabase: Supabase client instance
//   - schoolId: Current school ID from TenantContext (for security checks)
// ═══════════════════════════════════════════════════════════════════════════
export const AuthProvider = ({ children, supabase, schoolId }) => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD TEACHER - With school security check!
  // ═══════════════════════════════════════════════════════════════════════════
  const loadTeacher = useCallback(async (userId) => {
    if (!supabase || !userId || isSigningOut.current) return null;
    
    try {
      let query = supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId);
      
      // ═══════════════════════════════════════════════════════════════════════
      // 🔒 SIGURNOSNA PROVERA: Ako smo na school tenant, filtriraj po school_id
      // Ovo sprečava da teacher iz škole A vidi podatke škole B
      // ═══════════════════════════════════════════════════════════════════════
      if (schoolId) {
        console.log('🔒 Filtering teacher by school_id:', schoolId);
        query = query.eq('school_id', schoolId);
      }
      
      const { data, error: teacherError } = await query.single();

      if (teacherError) {
        if (teacherError.code === 'PGRST116') {
          // No rows returned - teacher doesn't exist for this school
          console.log('ℹ️ No teacher profile for user in this school');
        } else {
          console.error('❌ Teacher load error:', teacherError);
        }
        return null;
      }

      console.log('✅ Teacher loaded for school:', data.school_id);
      return data;
    } catch (err) {
      console.error('❌ Error loading teacher:', err);
      return null;
    }
  }, [supabase, schoolId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD PARENT - With school security check!
  // ═══════════════════════════════════════════════════════════════════════════
  const loadParent = useCallback(async (userId) => {
    if (!supabase || !userId || isSigningOut.current) return null;
    
    try {
      let query = supabase
        .from('parents')
        .select('*')
        .eq('user_id', userId);
      
      // 🔒 SIGURNOSNA PROVERA
      if (schoolId) {
        console.log('🔒 Filtering parent by school_id:', schoolId);
        query = query.eq('school_id', schoolId);
      }
      
      const { data, error: parentError } = await query.single();

      if (parentError) {
        if (parentError.code === 'PGRST116') {
          console.log('ℹ️ No parent profile for user in this school');
        } else {
          console.error('❌ Parent load error:', parentError);
        }
        return null;
      }

      console.log('✅ Parent loaded for school:', data.school_id);
      return data;
    } catch (err) {
      console.error('❌ Error loading parent:', err);
      return null;
    }
  }, [supabase, schoolId]);

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
    console.log('🏫 School ID for auth:', schoolId);

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
            if (mounted) {
              if (teacherData) {
                setTeacher(teacherData);
              } else if (schoolId) {
                // ❌ User has session but doesn't belong to this school
                console.error('❌ User does not belong to this school - signing out');
                await supabase.auth.signOut();
                clearAuthState();
                setError("You don't have access to this school.");
              }
            }
          } else if (profileData?.role === 'parent') {
            const parentData = await loadParent(session.user.id);
            if (mounted && !parentData && schoolId) {
              // ❌ Parent doesn't belong to this school
              console.error('❌ Parent does not belong to this school - signing out');
              await supabase.auth.signOut();
              clearAuthState();
              setError("You don't have access to this school.");
            }
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
              if (teacherData) {
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
              } else if (schoolId) {
                // ❌ User signed in but doesn't belong to this school
                console.error('❌ User does not belong to this school');
                setError("You don't have access to this school.");
                await supabase.auth.signOut();
              }
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
  }, [supabase, schoolId, loadProfile, loadTeacher, loadParent, clearAuthState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGN IN - With school security check!
  // ═══════════════════════════════════════════════════════════════════════════
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      isSigningOut.current = false;
      hasLoadedInitialUser.current = false;

      console.log('🔐 Signing in...');
      console.log('🔐 School ID:', schoolId);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // ═══════════════════════════════════════════════════════════════════════
      // 🔒 KRITIČNA SIGURNOSNA PROVERA
      // Proveri da li user pripada OVOJ školi pre nego što ga pustiš!
      // ═══════════════════════════════════════════════════════════════════════
      if (schoolId && data.user) {
        console.log('🔒 Verifying user belongs to school:', schoolId);
        
        // Prvo proveri profil da vidimo ulogu
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
        
        let belongsToSchool = false;
        
        if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
          // Proveri teachers tabelu
          const { data: teacherData } = await supabase
            .from('teachers')
            .select('id, school_id')
            .eq('user_id', data.user.id)
            .eq('school_id', schoolId)
            .single();
          
          belongsToSchool = !!teacherData;
          console.log('🔒 Teacher check:', belongsToSchool ? '✅ Found' : '❌ Not found');
        } else if (profileData?.role === 'parent') {
          // Proveri parents tabelu
          const { data: parentData } = await supabase
            .from('parents')
            .select('id, school_id')
            .eq('user_id', data.user.id)
            .eq('school_id', schoolId)
            .single();
          
          belongsToSchool = !!parentData;
          console.log('🔒 Parent check:', belongsToSchool ? '✅ Found' : '❌ Not found');
        } else {
          // Nepoznata uloga - ne puštaj
          console.error('❌ Unknown role:', profileData?.role);
          belongsToSchool = false;
        }
        
        if (!belongsToSchool) {
          // ❌ User postoji ali NE pripada ovoj školi!
          console.error('❌ ACCESS DENIED: User does not belong to this school!');
          console.error('   User email:', email);
          console.error('   School ID:', schoolId);
          
          await supabase.auth.signOut();
          throw new Error("You don't have access to this school.");
        }
        
        console.log('✅ User verified for school:', schoolId);
      }

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
  // SIGN OUT
  // ============================================================================
  const signOut = () => {
    isSigningOut.current = true;
    hasLoadedInitialUser.current = false;
    clearAuthState();

    // Tell Supabase to invalidate the server session (fire & forget — don't await)
    try { supabase.auth.signOut().catch(() => {}); } catch (_) {}

    // Clear session from localStorage immediately so the next page load sees no session
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k));
    } catch (_) {}

    // Reload the page — localStorage is now clear so it will show the login screen
    window.location.reload();
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