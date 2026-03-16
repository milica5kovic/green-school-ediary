import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, setCurrentSchoolId, clearCurrentSchoolId } from '../infrastructure/supabaseClient';

// ============================================================================
// TENANT CONTEXT - Multi-tenant school detection
// ============================================================================

const TenantContext = createContext(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════
// Extract subdomain from hostname
// Supports:
//   - greenschool.localhost:3000 → "greenschool"
//   - greenschool.schoolhub.com → "greenschool"  
//   - app.schoolhub.com → "app" (owner dashboard)
//   - localhost:3000 → null (marketing)
//   - schoolhub.com → null (marketing)
// ═══════════════════════════════════════════════════════════════════════════
const extractSubdomain = (hostname) => {
  // 1. Check URL params first (for development/testing)
  const params = new URLSearchParams(window.location.search);
  const schoolParam = params.get('school');
  if (schoolParam) {
    console.log('🔍 Subdomain from URL param:', schoolParam);
    return schoolParam;
  }
  
  // 2. Handle xxx.localhost format (development)
  //    e.g., "greenschool.localhost" → "greenschool"
  if (hostname.endsWith('.localhost') || hostname.includes('.localhost:')) {
    const parts = hostname.split('.');
    const subdomain = parts[0];
    console.log('🔍 Subdomain from .localhost:', subdomain);
    return subdomain;
  }
  
  // 3. Plain localhost = marketing/landing page
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🔍 Plain localhost - no subdomain');
    return null;
  }
  
  // 4. Production domains
  const parts = hostname.split('.');
  
  // example.com (2 parts) = marketing
  if (parts.length === 2) {
    console.log('🔍 Root domain - no subdomain');
    return null;
  }
  
  // xxx.example.com (3 parts)
  if (parts.length === 3) {
    const sub = parts[0];
    
    // www.example.com = marketing
    if (sub === 'www' || sub === 'schoolhub') {
      console.log('🔍 www/schoolhub - no subdomain');
      return null;
    }
    
    // app.example.com = owner dashboard
    if (sub === 'app') {
      console.log('🔍 Owner dashboard');
      return 'app';
    }
    
    // greenschool.example.com = school tenant
    console.log('🔍 School subdomain:', sub);
    return sub;
  }
  
  // xxx.yyy.example.com (4+ parts) - could be subdomain.region.domain.tld
  if (parts.length >= 4) {
    const sub = parts[0];
    if (sub === 'app') return 'app';
    if (sub === 'www') return null;
    console.log('🔍 School subdomain (4+ parts):', sub);
    return sub;
  }
  
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// Check if hostname is a custom domain (not a subdomain of schoolhub)
// Examples:
//   - portal.educa.school → true (custom domain)
//   - educa.schoolhub.rs → false (subdomain)
//   - greenschool.localhost → false (development)
// ═══════════════════════════════════════════════════════════════════════════
const isCustomDomain = (hostname) => {
  // Development environments
  if (hostname.includes('localhost')) return false;
  if (hostname.includes('127.0.0.1')) return false;
  
  // Our own domains
  if (hostname.includes('schoolhub.rs')) return false;
  if (hostname.includes('schoolhub.com')) return false;
  if (hostname.includes('vercel.app')) return false;
  
  // Everything else is a custom domain
  return true;
};

export const TenantProvider = ({ children }) => {
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const hostname = window.location.hostname;
  const subdomain = extractSubdomain(hostname);
  const customDomain = isCustomDomain(hostname);
  
  const isOwnerDashboard = subdomain === 'app';
  const isMarketing = subdomain === null && !customDomain;
  const isSchool = (subdomain !== null && subdomain !== 'app') || customDomain;
  
  useEffect(() => {
    const loadSchool = async () => {
      console.log('TenantContext: hostname =', hostname);
      console.log('TenantContext: subdomain =', subdomain);
      console.log('TenantContext: customDomain =', customDomain);
      console.log('TenantContext: isSchool =', isSchool, 'isMarketing =', isMarketing, 'isOwner =', isOwnerDashboard);
      
      // Always clear first
      clearCurrentSchoolId();
      
      // Marketing or Owner Dashboard - no school needed
      if (isMarketing || isOwnerDashboard) {
        console.log('TenantContext: No school needed');
        setLoading(false);
        return;
      }
      
      // School tenant - load school data
      if (isSchool) {
        try {
          let data = null;
          let fetchError = null;
          
          // ═══════════════════════════════════════════════════════════════════
          // KORAK 1: Ako je custom domen, traži po domain koloni
          // Npr: portal.educa.school → schools.domain = 'portal.educa.school'
          // ═══════════════════════════════════════════════════════════════════
          if (customDomain) {
            console.log('TenantContext: Trying custom domain lookup:', hostname);
            
            const result = await supabase
              .from('schools')
              .select('*')
              .eq('domain', hostname)
              .single();
            
            data = result.data;
            fetchError = result.error;
            
            if (data) {
              console.log('✅ TenantContext: Found school by custom domain:', data.name);
            }
          }
          
          // ═══════════════════════════════════════════════════════════════════
          // KORAK 2: Fallback na subdomen (slug)
          // Npr: educa.schoolhub.rs → schools.slug = 'educa'
          // ═══════════════════════════════════════════════════════════════════
          if (!data && subdomain) {
            console.log('TenantContext: Trying slug lookup:', subdomain);
            
            const result = await supabase
              .from('schools')
              .select('*')
              .eq('slug', subdomain)
              .single();
            
            data = result.data;
            fetchError = result.error;
            
            if (data) {
              console.log('✅ TenantContext: Found school by slug:', data.name);
            }
          }
          
          // ═══════════════════════════════════════════════════════════════════
          // Rezultat
          // ═══════════════════════════════════════════════════════════════════
          if (fetchError || !data) {
            console.error('❌ TenantContext: School not found');
            console.error('   Hostname:', hostname);
            console.error('   Subdomain:', subdomain);
            console.error('   Error:', fetchError);
            
            setError(`Škola nije pronađena za "${hostname}"`);
            setSchool(null);
          } else {
            console.log('✅ TenantContext: School loaded:', data.name);
            setSchool(data);
            setCurrentSchoolId(data.id);
            console.log('🔒 Tenant ID set:', data.id);
            
            // Set CSS variables for branding
            if (data.primary_color) {
              document.documentElement.style.setProperty('--color-primary', data.primary_color);
            }
            if (data.secondary_color) {
              document.documentElement.style.setProperty('--color-secondary', data.secondary_color);
            }
            if (data.accent_color) {
              document.documentElement.style.setProperty('--color-accent', data.accent_color);
            }
            
            // Set page title and favicon
            document.title = `${data.name} | SchoolHub`;
            
            if (data.favicon_url) {
              const favicon = document.querySelector("link[rel*='icon']") || document.createElement('link');
              favicon.type = 'image/x-icon';
              favicon.rel = 'shortcut icon';
              favicon.href = data.favicon_url;
              document.getElementsByTagName('head')[0].appendChild(favicon);
            }
          }
        } catch (err) {
          console.error('❌ TenantContext: Exception:', err);
          setError(err.message);
        }
      }
      
      setLoading(false);
    };
    
    loadSchool();
    
    // Cleanup on unmount
    return () => clearCurrentSchoolId();
  }, [hostname, subdomain, customDomain, isSchool, isMarketing, isOwnerDashboard]);
  
  const value = {
    // School data
    school,
    schoolId: school?.id || null,
    schoolSlug: school?.slug || subdomain,
    
    // Loading states
    loading,
    error,
    
    // Route detection
    isOwnerDashboard,
    isMarketing,
    isSchool,
    subdomain,
    customDomain,
    
    // Branding shortcuts
    primaryColor: school?.primary_color || '#10b981',
    secondaryColor: school?.secondary_color || '#0d9488',
    accentColor: school?.accent_color || '#7c3aed',
    schoolName: school?.name || 'SchoolHub',
    logoUrl: school?.logo_url || null,
    faviconUrl: school?.favicon_url || null,
    
    // Refresh function
    refreshSchool: async () => {
      if (!isSchool || !school?.id) return;
      setLoading(true);
      const { data } = await supabase.from('schools').select('*').eq('id', school.id).single();
      if (data) {
        setSchool(data);
        setCurrentSchoolId(data.id);
      }
      setLoading(false);
    },
  };
  
  console.log('TenantContext value:', { 
    loading, 
    isMarketing, 
    isSchool, 
    isOwnerDashboard, 
    subdomain,
    customDomain,
    schoolId: school?.id,
    schoolName: school?.name
  });
  
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export default TenantContext;