// ============================================================================
// TENANT-AWARE SUPABASE CLIENT WRAPPER
// ============================================================================
// 
// This creates a wrapper around the Supabase client that automatically
// adds school_id filtering to all queries.
//
// Usage in AppContext:
// const tenantSupabase = createTenantClient(supabase, schoolId);
// 

/**
 * Creates a tenant-aware Supabase client wrapper
 * All queries are automatically filtered by school_id
 * 
 * @param {SupabaseClient} supabase - Original Supabase client
 * @param {string} schoolId - Current school ID
 * @returns {Object} Wrapped client with tenant filtering
 */
export const createTenantClient = (supabase, schoolId) => {
  if (!supabase) {
    console.warn('createTenantClient: No supabase client provided');
    return null;
  }

  if (!schoolId) {
    console.warn('createTenantClient: No schoolId provided, returning original client');
    return supabase;
  }

  // Create a proxy that intercepts .from() calls
  return new Proxy(supabase, {
    get(target, prop) {
      if (prop === 'from') {
        return (table) => {
          const query = target.from(table);
          
          // Return a proxy for the query builder
          return new Proxy(query, {
            get(queryTarget, queryProp) {
              const original = queryTarget[queryProp];
              
              // Intercept select, insert, update, delete
              if (queryProp === 'select') {
                return (...args) => {
                  return original.apply(queryTarget, args).eq('school_id', schoolId);
                };
              }
              
              if (queryProp === 'insert') {
                return (data, options) => {
                  // Add school_id to inserted data
                  const dataWithSchool = Array.isArray(data)
                    ? data.map(item => ({ ...item, school_id: schoolId }))
                    : { ...data, school_id: schoolId };
                  return original.call(queryTarget, dataWithSchool, options);
                };
              }
              
              if (queryProp === 'update') {
                return (data, options) => {
                  // Filter update by school_id
                  return original.call(queryTarget, data, options).eq('school_id', schoolId);
                };
              }
              
              if (queryProp === 'delete') {
                return () => {
                  // Filter delete by school_id
                  return original.call(queryTarget).eq('school_id', schoolId);
                };
              }
              
              if (queryProp === 'upsert') {
                return (data, options) => {
                  const dataWithSchool = Array.isArray(data)
                    ? data.map(item => ({ ...item, school_id: schoolId }))
                    : { ...data, school_id: schoolId };
                  return original.call(queryTarget, dataWithSchool, options);
                };
              }
              
              // For other methods, return as-is but maintain chain
              if (typeof original === 'function') {
                return original.bind(queryTarget);
              }
              
              return original;
            }
          });
        };
      }
      
      // For other properties (auth, storage, etc.), return original
      const value = target[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    }
  });
};

/**
 * Alternative: Simple query helper functions
 * Use these if the proxy approach causes issues
 */
export const tenantQuery = {
  /**
   * Select with automatic school_id filter
   */
  select: (supabase, table, columns = '*', schoolId) => {
    return supabase.from(table).select(columns).eq('school_id', schoolId);
  },

  /**
   * Insert with automatic school_id
   */
  insert: (supabase, table, data, schoolId) => {
    const dataWithSchool = Array.isArray(data)
      ? data.map(item => ({ ...item, school_id: schoolId }))
      : { ...data, school_id: schoolId };
    return supabase.from(table).insert(dataWithSchool);
  },

  /**
   * Update with automatic school_id filter
   */
  update: (supabase, table, data, schoolId) => {
    return supabase.from(table).update(data).eq('school_id', schoolId);
  },

  /**
   * Delete with automatic school_id filter
   */
  delete: (supabase, table, schoolId) => {
    return supabase.from(table).delete().eq('school_id', schoolId);
  },

  /**
   * Upsert with automatic school_id
   */
  upsert: (supabase, table, data, schoolId, options) => {
    const dataWithSchool = Array.isArray(data)
      ? data.map(item => ({ ...item, school_id: schoolId }))
      : { ...data, school_id: schoolId };
    return supabase.from(table).upsert(dataWithSchool, options);
  },
};

/**
 * Tables that should NOT be filtered by school_id
 */
export const GLOBAL_TABLES = [
  'schools',           // Schools table itself
  'school_owners',     // Owner-school mapping
  'schema_migrations', // Migration tracking
];

/**
 * Check if a table needs school_id filtering
 */
export const needsSchoolFilter = (tableName) => {
  return !GLOBAL_TABLES.includes(tableName);
};

export default createTenantClient;