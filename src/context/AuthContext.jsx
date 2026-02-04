import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

  // Load user profile from profiles table
  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null;
    
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile load error:', profileError);
        return null;
      }

      setProfile(data);
      console.log('Profile loaded:', data);
      return data;
    } catch (err) {
      console.error('Error loading profile:', err);
      return null;
    }
  }, [supabase]);

  // Load teacher info from teachers table
  const loadTeacher = useCallback(async (userId) => {
    if (!supabase || !userId) return null;
    
    try {
      const { data, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (teacherError) {
        console.error('Teacher load error:', teacherError);
        return null;
      }

      setTeacher(data);
      console.log('Teacher loaded:', data);
      return data;
    } catch (err) {
      console.error('Error loading teacher:', err);
      return null;
    }
  }, [supabase]);

  // Initialize auth on mount
  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user && mounted) {
          setUser(session.user);
          const profileData = await loadProfile(session.user.id);
          
          // Only load teacher if user is teacher or admin
          if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
            await loadTeacher(session.user.id);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      
      if (session?.user && mounted) {
        setUser(session.user);
        const profileData = await loadProfile(session.user.id);
        
        if (profileData?.role === 'teacher' || profileData?.role === 'admin') {
          await loadTeacher(session.user.id);
        }
      } else if (mounted) {
        setUser(null);
        setProfile(null);
        setTeacher(null);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase, loadProfile, loadTeacher]);

const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    setProfile(profileData);

    // Load teacher data if exists
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', data.user.id)
      .single();

    if (teacherData) {
      setTeacher(teacherData);
    }

    return { success: true };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

  const signOut = async () => {
    setError(null);
    
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) throw signOutError;

      setUser(null);
      setProfile(null);
      setTeacher(null);
      
      return { success: true };
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message);
      return { success: false, error: err.message };
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
      console.error('Password update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const isAdmin = () => {
  return profile?.role === 'admin';
};

const isTeacher = () => {
  return profile?.role === 'teacher' || profile?.role === 'admin';
};

const isParent = () => {
  return profile?.role === 'parent';
};

const isClassTeacher = () => {
  return teacher?.class_teacher_for !== null && teacher?.class_teacher_for !== undefined;
};

const getClassTeacherFor = () => {
  return teacher?.class_teacher_for || null;
};

// Permission checks
const canManageStudents = () => {
  return profile?.role === 'admin';
};

const canManageSettings = () => {
  return profile?.role === 'admin';
};

const canAddGrades = () => {
  return profile?.role === 'teacher' || profile?.role === 'admin';
};

const canMarkAttendance = () => {
  return profile?.role === 'teacher' || profile?.role === 'admin';
};

const canCreateHomework = () => {
  return profile?.role === 'teacher' || profile?.role === 'admin';
};

const canViewAllClasses = () => {
  return profile?.role === 'admin';
};

const getTeacherSubjects = () => {
  return teacher?.subjects || [];
};

const getTeacherId = () => {
  return teacher?.id || null;
};

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