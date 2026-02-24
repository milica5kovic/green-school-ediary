// ============================================================================
// SUPABASE CLIENT - KOMPLETNA VERZIJA SA SVIM FUNKCIJAMA
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY;

// Debug
console.log('🔍 Environment Check:');
console.log('  SUPABASE_URL:', supabaseUrl);
console.log('  ANON_KEY (first 20):', supabaseAnonKey?.substring(0, 20));
console.log('  SERVICE_KEY (first 20):', supabaseServiceKey?.substring(0, 20));
console.log('  SERVICE_KEY exists?', !!supabaseServiceKey);

// ============================================================================
// ORIGINAL CLIENTS
// ============================================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// ============================================================================
// ADMIN FUNKCIJE (originalne iz tvog fajla)
// ============================================================================

/**
 * Proveri da li imamo admin/service key pristup
 */
export const hasAdminAccess = () => {
  return !!supabaseServiceKey;
};

/**
 * Kreiraj korisnika sa admin API-jem
 */
export const createUserWithAdmin = async (email, password, metadata = {}) => {
  if (!hasAdminAccess()) {
    throw new Error('Admin access required to create users');
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating user with admin:', error);
    throw error;
  }
};

/**
 * Obriši korisnika sa admin API-jem
 */
export const deleteUserWithAdmin = async (userId) => {
  if (!hasAdminAccess()) {
    throw new Error('Admin access required to delete users');
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user with admin:', error);
    throw error;
  }
};

/**
 * Ažuriraj korisnika sa admin API-jem
 */
export const updateUserWithAdmin = async (userId, updates) => {
  if (!hasAdminAccess()) {
    throw new Error('Admin access required to update users');
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user with admin:', error);
    throw error;
  }
};

// ============================================================================
// TENANT STATE
// ============================================================================

let currentSchoolId = null;

export const setCurrentSchoolId = (schoolId) => {
  currentSchoolId = schoolId;
  console.log('🏫 Tenant set:', schoolId);
};

export const getCurrentSchoolId = () => currentSchoolId;

export const clearCurrentSchoolId = () => {
  currentSchoolId = null;
  console.log('🏫 Tenant cleared');
};

// ============================================================================
// TABELE KOJE TREBA FILTRIRATI PO SCHOOL_ID
// ============================================================================

const TENANT_TABLES = new Set([
  'students',
  'parents',
  'student_parents',
  'custom_classes',
  'custom_subjects',
  'academic_terms',
  'attendance',
  'grades',
  'homework',
  'student_homework',
  'classes',
  'teacher_profile',
  'teacher_schedule',
  'class_teachers',
  'teacher_todos',
  'scheduled_tests',
  'school_events',
  'subject_term_comments',
  'class_teacher_comments',
  'teacher_comments',
  'term_reports',
  'enrollment_applications',
  'archive_history',
]);

// ============================================================================
// TENANT-AWARE QUERY BUILDER
// ============================================================================

class TenantQueryBuilder {
  constructor(client, tableName) {
    this.client = client;
    this.tableName = tableName;
    this.shouldFilter = TENANT_TABLES.has(tableName);
    this._query = null;
  }

  _getBaseQuery() {
    return this.client.from(this.tableName);
  }

  _addTenantFilter(query) {
    if (this.shouldFilter && currentSchoolId) {
      return query.eq('school_id', currentSchoolId);
    }
    return query;
  }

  _addSchoolIdToData(data) {
    if (!this.shouldFilter || !currentSchoolId) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => ({ school_id: currentSchoolId, ...item }));
    }
    return { school_id: currentSchoolId, ...data };
  }

  select(columns = '*') {
    this._query = this._getBaseQuery().select(columns);
    this._query = this._addTenantFilter(this._query);
    return this;
  }

  insert(data) {
    const dataWithSchool = this._addSchoolIdToData(data);
    this._query = this._getBaseQuery().insert(dataWithSchool);
    return this;
  }

  update(data) {
    if (!this._query) {
      this._query = this._getBaseQuery().update(data);
      this._query = this._addTenantFilter(this._query);
    } else {
      this._query = this._query.update(data);
    }
    return this;
  }

  upsert(data) {
    const dataWithSchool = this._addSchoolIdToData(data);
    this._query = this._getBaseQuery().upsert(dataWithSchool);
    return this;
  }

  delete() {
    if (!this._query) {
      this._query = this._getBaseQuery().delete();
      this._query = this._addTenantFilter(this._query);
    } else {
      this._query = this._query.delete();
    }
    return this;
  }

  // Chainable filter methods
  eq(column, value) { this._query = this._query.eq(column, value); return this; }
  neq(column, value) { this._query = this._query.neq(column, value); return this; }
  gt(column, value) { this._query = this._query.gt(column, value); return this; }
  gte(column, value) { this._query = this._query.gte(column, value); return this; }
  lt(column, value) { this._query = this._query.lt(column, value); return this; }
  lte(column, value) { this._query = this._query.lte(column, value); return this; }
  like(column, value) { this._query = this._query.like(column, value); return this; }
  ilike(column, value) { this._query = this._query.ilike(column, value); return this; }
  is(column, value) { this._query = this._query.is(column, value); return this; }
  in(column, values) { this._query = this._query.in(column, values); return this; }
  contains(column, value) { this._query = this._query.contains(column, value); return this; }
  containedBy(column, value) { this._query = this._query.containedBy(column, value); return this; }
  or(filters) { this._query = this._query.or(filters); return this; }
  not(column, operator, value) { this._query = this._query.not(column, operator, value); return this; }
  filter(column, operator, value) { this._query = this._query.filter(column, operator, value); return this; }
  
  // Ordering and pagination
  order(column, options) { this._query = this._query.order(column, options); return this; }
  limit(count) { this._query = this._query.limit(count); return this; }
  range(from, to) { this._query = this._query.range(from, to); return this; }
  
  // Result modifiers
  single() { this._query = this._query.single(); return this; }
  maybeSingle() { this._query = this._query.maybeSingle(); return this; }
  
  // Execute
  then(resolve, reject) {
    return this._query.then(resolve, reject);
  }

  catch(reject) {
    return this._query.catch(reject);
  }
}

// ============================================================================
// TENANT-AWARE CLIENT WRAPPER
// ============================================================================

class TenantSupabaseClient {
  constructor(client) {
    this._client = client;
    this.auth = client.auth;
    this.storage = client.storage;
    this.realtime = client.realtime;
    this.functions = client.functions;
  }

  from(tableName) {
    return new TenantQueryBuilder(this._client, tableName);
  }

  rpc(fn, params) {
    return this._client.rpc(fn, params);
  }

  get raw() {
    return this._client;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Tenant-aware client
export const tenantSupabase = new TenantSupabaseClient(supabase);

// Log
console.log('🔐 Supabase initialized (single client)');
console.log('  URL: ✅');
console.log('  Anon Key: ✅');
console.log('  Service Key:', supabaseServiceKey ? '✅ (Admin API available)' : '❌ (Not set)');

// Default export
export default supabase;