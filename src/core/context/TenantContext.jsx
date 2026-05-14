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
  // URL param override — for development/testing (?school=greenschool)
  const params = new URLSearchParams(window.location.search);
  const schoolParam = params.get('school');
  if (schoolParam) return schoolParam;

  // xxx.localhost (development)
  if (hostname.endsWith('.localhost') || hostname.includes('.localhost:')) {
    return hostname.split('.')[0];
  }

  // Plain localhost = marketing
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  const parts = hostname.split('.');

  // root domain (2 parts) = marketing
  if (parts.length === 2) return null;

  // xxx.example.com (3 parts) or more
  const sub = parts[0];
  if (sub === 'www' || sub === 'schoolhub') return null;
  if (sub === 'app') return 'app';
  return sub;
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
      clearCurrentSchoolId();

      if (isMarketing || isOwnerDashboard) {
        setLoading(false);
        return;
      }

      if (isSchool) {
        try {
          let data = null;
          let fetchError = null;

          // Try custom domain first, then slug
          if (customDomain) {
            const result = await supabase
              .from('schools')
              .select('*')
              .eq('domain', hostname)
              .single();
            data = result.data;
            fetchError = result.error;
          }

          if (!data && subdomain) {
            const result = await supabase
              .from('schools')
              .select('*')
              .eq('slug', subdomain)
              .single();
            data = result.data;
            fetchError = result.error;
          }

          if (fetchError || !data) {
            console.error('[TenantContext] School not found for:', hostname);
            setError(`School not found for "${hostname}"`);
            setSchool(null);
          } else {
            setSchool(data);
            setCurrentSchoolId(data.id);
            
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
          console.error('[TenantContext] Error:', err.message);
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
  
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export default TenantContext;