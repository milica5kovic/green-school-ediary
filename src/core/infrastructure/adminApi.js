// ============================================================================
// ADMIN API - Secure user management via Edge Functions
// ============================================================================

import { supabase, tenantSupabase } from './supabaseClient';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://uflalxwfxkuzyrijtqdo.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbGFseHdmeGt1enlyaWp0cWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzU2MTcsImV4cCI6MjA4NDY1MTYxN30.RMJ7QWLSzhLOAAhca0-suwQTX2hXi5XGa3e4YEL07qU';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-user`;

/**
 * Call the admin Edge Function
 */
const callAdminFunction = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('You must be logged in to perform admin operations');
  }

  console.log('🔐 Calling Edge Function:', EDGE_FUNCTION_URL);
  console.log('🔑 Using API Key (first 20):', SUPABASE_ANON_KEY?.substring(0, 20));
  console.log('🎫 Access Token (first 50):', session.access_token?.substring(0, 50));

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log('📥 Edge Function response:', response.status, data);

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Admin operation failed');
  }

  return data;
};

/**
 * Check if admin features are available
 */
export const checkAdminAccess = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ checkAdminAccess: No session');
      return { hasAccess: false, reason: 'Not logged in' };
    }

    console.log('🔍 checkAdminAccess: Checking role for user:', session.user.id);

    const { data: teacher, error } = await tenantSupabase
      .from('teachers')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    console.log('📋 Teacher data:', teacher);
    
    if (error) {
      console.log('❓ Query error:', error);
      if (error.code === 'PGRST116') {
        return { hasAccess: false, reason: 'No teacher profile found for this user' };
      }
      return { hasAccess: false, reason: error.message };
    }

    const isAdminOrOwner = teacher?.role === 'admin' || teacher?.role === 'owner';
    
    console.log('✅ checkAdminAccess result:', { role: teacher?.role, isAdminOrOwner });

    return { 
      hasAccess: isAdminOrOwner, 
      reason: isAdminOrOwner ? 'OK' : `Your role is "${teacher?.role}". Admin or owner required.`,
      role: teacher?.role
    };
  } catch (error) {
    console.error('❌ checkAdminAccess error:', error);
    return { hasAccess: false, reason: error.message };
  }
};

/**
 * Create a new user with email and password
 */
export const createUser = async (email, password, metadata = {}) => {
  console.log('🔐 Creating user via Edge Function...');
  
  const result = await callAdminFunction({
    action: 'create',
    email,
    password,
    metadata,
  });

  console.log('✅ User created:', result.user?.id);
  return result.user;
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (userId) => {
  console.log('🔐 Deleting user via Edge Function...');
  
  const result = await callAdminFunction({
    action: 'delete',
    userId,
  });

  console.log('✅ User deleted');
  return result;
};

/**
 * Update a user's email, password, or metadata
 */
export const updateUser = async (userId, updates) => {
  console.log('🔐 Updating user via Edge Function...');
  
  const result = await callAdminFunction({
    action: 'update',
    userId,
    ...updates,
  });

  console.log('✅ User updated:', result.user?.id);
  return result.user;
};

/**
 * Generate a secure temporary password
 */
export const generateTempPassword = (schoolName = 'School') => {
  const prefix = schoolName.replace(/[^a-zA-Z]/g, '').substring(0, 5) || 'User';
  const number = Math.floor(1000 + Math.random() * 9000);
  const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
  return `${prefix}${number}${special}`;
};

export default {
  checkAdminAccess,
  createUser,
  deleteUser,
  updateUser,
  generateTempPassword,
};