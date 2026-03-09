import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
}

// ============================================================================
// MAIN CLIENT (anon key only - respects RLS)
// ============================================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

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
// TENANT TABLES (all tables with school_id column)
// ============================================================================

const TENANT_TABLES = new Set([
  'students',
  'teachers',
  'parents',
  'student_parents',
  'custom_classes',
  'custom_subjects',
  'classes',
  'class_teachers',
  'academic_terms',
  'grades',
  'attendance',
  'homework',
  'student_homework',
  'teacher_schedule',
  'scheduled_tests',
  'school_events',
  'teacher_profile',
  'teacher_todos',
  'todos',
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
    if (this.shouldFilter && !currentSchoolId) {
      console.warn(`⚠️ No school_id set for tenant table: ${this.tableName}`);
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

  upsert(data, options) {
    const dataWithSchool = this._addSchoolIdToData(data);
    this._query = this._getBaseQuery().upsert(dataWithSchool, options);
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
  order(column, options) { this._query = this._query.order(column, options); return this; }
  limit(count) { this._query = this._query.limit(count); return this; }
  range(from, to) { this._query = this._query.range(from, to); return this; }
  single() { this._query = this._query.single(); return this; }
  maybeSingle() { this._query = this._query.maybeSingle(); return this; }
  textSearch(column, query, options) { this._query = this._query.textSearch(column, query, options); return this; }
  match(query) { this._query = this._query.match(query); return this; }
  csv() { this._query = this._query.csv(); return this; }
  
  then(resolve, reject) { return this._query.then(resolve, reject); }
  catch(reject) { return this._query.catch(reject); }
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
    const paramsWithSchool = currentSchoolId 
      ? { ...params, school_id: currentSchoolId }
      : params;
    return this._client.rpc(fn, paramsWithSchool);
  }

  get raw() { return this._client; }
  get hasTenant() { return !!currentSchoolId; }
  get tenantId() { return currentSchoolId; }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tenantSupabase = new TenantSupabaseClient(supabase);

console.log('🔐 Supabase initialized (secure mode)');

export default supabase;