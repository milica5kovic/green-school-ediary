// ============================================================================
// SUPABASE CLIENT - Multi-tenant aware
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Raw supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TENANT QUERY BUILDER - Auto-adds school_id filter
// ============================================================================

let currentSchoolId = null;

export const setCurrentSchoolId = (schoolId) => {
  currentSchoolId = schoolId;
};

export const getCurrentSchoolId = () => currentSchoolId;

export const clearCurrentSchoolId = () => {
  currentSchoolId = null;
};

// Tables that should be filtered by school_id
const TENANT_TABLES = [
  'students', 'teachers', 'parents', 'grades', 'attendance',
  'homework', 'classes', 'academic_terms', 'scheduled_tests',
  'school_events', 'student_parents', 'schedule', 'activity_logs',
  'custom_classes', 'custom_subjects', 'teacher_todos'
];

class TenantQueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.query = client.from(table);
    this.shouldFilter = TENANT_TABLES.includes(table);
  }

  select(columns = '*') {
    let q = this.query.select(columns);
    if (this.shouldFilter && currentSchoolId) {
      q = q.eq('school_id', currentSchoolId);
    }
    return q;
  }

  insert(data) {
    // Add school_id to inserted data if needed
    if (this.shouldFilter && currentSchoolId) {
      if (Array.isArray(data)) {
        data = data.map(item => ({ ...item, school_id: currentSchoolId }));
      } else {
        data = { ...data, school_id: currentSchoolId };
      }
    }
    return this.query.insert(data);
  }

  update(data) {
    let q = this.query.update(data);
    if (this.shouldFilter && currentSchoolId) {
      q = q.eq('school_id', currentSchoolId);
    }
    return q;
  }

  delete() {
    let q = this.query.delete();
    if (this.shouldFilter && currentSchoolId) {
      q = q.eq('school_id', currentSchoolId);
    }
    return q;
  }

  upsert(data, options) {
    if (this.shouldFilter && currentSchoolId) {
      if (Array.isArray(data)) {
        data = data.map(item => ({ ...item, school_id: currentSchoolId }));
      } else {
        data = { ...data, school_id: currentSchoolId };
      }
    }
    return this.query.upsert(data, options);
  }
}

// Tenant-aware supabase proxy
export const tenantSupabase = {
  from: (table) => new TenantQueryBuilder(supabase, table),
  auth: supabase.auth,
  storage: supabase.storage,
  rpc: (...args) => supabase.rpc(...args),
  channel: (...args) => supabase.channel(...args),
};

export default supabase;