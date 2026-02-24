import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setCurrentSchoolId, clearCurrentSchoolId } from '../infrastructure/supabaseClient';

// ============================================================================
// TENANT CONTEXT
// ============================================================================

const TenantContext = createContext(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

const extractSubdomain = (hostname) => {
  const params = new URLSearchParams(window.location.search);
  const schoolParam = params.get('school');
  
  if (schoolParam) return schoolParam;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    return null;
  }
  
  const parts = hostname.split('.');
  
  if (parts.length === 2) return null;
  if (parts.length === 3) {
    if (parts[0] === 'schoolhub' || parts[0] === 'www') return null;
    if (parts[0] === 'app') return 'app';
    return parts[0];
  }
  if (parts.length >= 4) {
    if (parts[0] === 'app') return 'app';
    if (parts[0] === 'www') return null;
    return parts[0];
  }
  
  return null;
};

export const TenantProvider = ({ children }) => {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const subdomain = extractSubdomain(window.location.hostname);
  
  const isOwnerDashboard = subdomain === 'app';
  const isMarketing = subdomain === null;
  const isSchool = subdomain !== null && subdomain !== 'app';
  
  useEffect(() => {
    const loadSchool = async () => {
      console.log('TenantContext: subdomain =', subdomain);
      console.log('TenantContext: isSchool =', isSchool, 'isMarketing =', isMarketing, 'isOwner =', isOwnerDashboard);
      
      clearCurrentSchoolId();
      
      if (isMarketing || isOwnerDashboard) {
        console.log('TenantContext: No school needed');
        setLoading(false);
        return;
      }
      
      if (isSchool) {
        try {
          console.log('TenantContext: Loading school:', subdomain);
          
          const { data, error: fetchError } = await supabase
            .from('schools')
            .select('*')
            .eq('slug', subdomain)
            .single();
          
          if (fetchError) {
            console.error('TenantContext: Error:', fetchError);
            setError(fetchError.code === 'PGRST116' ? `School "${subdomain}" not found` : fetchError.message);
            setSchool(null);
          } else {
            console.log('TenantContext: School loaded:', data);
            setSchool(data);
            setCurrentSchoolId(data.id);
            console.log('🔒 Tenant ID set:', data.id);
            
            if (data.primary_color) {
              document.documentElement.style.setProperty('--color-primary', data.primary_color);
            }
            if (data.secondary_color) {
              document.documentElement.style.setProperty('--color-secondary', data.secondary_color);
            }
            document.title = `${data.name} | SchoolHub`;
          }
        } catch (err) {
          console.error('TenantContext: Exception:', err);
          setError(err.message);
        }
      }
      
      setLoading(false);
    };
    
    loadSchool();
    return () => clearCurrentSchoolId();
  }, [subdomain, isSchool, isMarketing, isOwnerDashboard]);
  
  const value = {
    school,
    schoolId: school?.id || null,
    schoolSlug: subdomain,
    loading,
    error,
    isOwnerDashboard,
    isMarketing,
    isSchool,
    subdomain,
    primaryColor: school?.primary_color || '#10b981',
    secondaryColor: school?.secondary_color || '#0d9488',
    schoolName: school?.name || 'SchoolHub',
    logoUrl: school?.logo_url || null,
    refreshSchool: async () => {
      if (!isSchool) return;
      setLoading(true);
      const { data } = await supabase.from('schools').select('*').eq('slug', subdomain).single();
      if (data) {
        setSchool(data);
        setCurrentSchoolId(data.id);
      }
      setLoading(false);
    },
  };
  
  console.log('TenantContext value:', { loading, isMarketing, isSchool, isOwnerDashboard, subdomain, schoolId: school?.id });
  
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export default TenantContext;