// ============================================================================
// ADMIN API - Secure user management via Edge Functions
// ============================================================================

import { supabase, tenantSupabase, getCurrentSchoolId } from './supabaseClient';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-user`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const callAdminFunction = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('You must be logged in to perform admin operations');
  }

  // Always include the current school — edge function enforces this
  const schoolId = getCurrentSchoolId();
  if (!schoolId) {
    throw new Error('No school context found. Please refresh and try again.');
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ ...payload, schoolId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Admin operation failed');
  }

  return data;
};

/**
 * Check if the current user has admin access to the current school
 */
export const checkAdminAccess = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { hasAccess: false, reason: 'Not logged in' };
    }

    const { data: teacher, error } = await tenantSupabase
      .from('teachers')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { hasAccess: false, reason: 'No teacher profile found for this user' };
      }
      return { hasAccess: false, reason: error.message };
    }

    const isAdminOrOwner = teacher?.role === 'admin' || teacher?.role === 'owner';

    return {
      hasAccess: isAdminOrOwner,
      reason: isAdminOrOwner ? 'OK' : `Your role is "${teacher?.role}". Admin or owner required.`,
      role: teacher?.role,
    };
  } catch (error) {
    console.error('[adminApi] checkAdminAccess error:', error);
    return { hasAccess: false, reason: error.message };
  }
};

/**
 * Atomically create an auth user + teacher record.
 * On DB insert failure the edge function rolls back the auth user.
 * Returns { user, teacher }.
 */
export const createTeacher = async ({ email, password, full_name, role, subjects, class_teacher_for }) => {
  return callAdminFunction({
    action: 'create_teacher',
    email, password, full_name, role,
    subjects: subjects || [],
    class_teacher_for: class_teacher_for || null,
  });
};

/**
 * Atomically create an auth user + parent record.
 * Returns { user, parent }.
 */
export const createParent = async ({ email, password, full_name, phone }) => {
  return callAdminFunction({
    action: 'create_parent',
    email, password, full_name,
    phone: phone || null,
  });
};

export const createUser = async (email, password, metadata = {}) => {
  const result = await callAdminFunction({ action: 'create', email, password, metadata });
  return result.user;
};

export const deleteUser = async (userId) => {
  return callAdminFunction({ action: 'delete', userId });
};

export const updateUser = async (userId, updates) => {
  const result = await callAdminFunction({ action: 'update', userId, ...updates });
  return result.user;
};

export const generateTempPassword = (schoolName = 'School') => {
  const prefix = schoolName.replace(/[^a-zA-Z]/g, '').substring(0, 5) || 'User';
  const number = Math.floor(1000 + Math.random() * 9000);
  const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
  return `${prefix}${number}${special}`;
};

export default { checkAdminAccess, createTeacher, createParent, createUser, deleteUser, updateUser, generateTempPassword };
