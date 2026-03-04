import { useMemo } from 'react';
import { useApp } from '../../core/context/AppContext';
import { useBranding } from '../../core/context/BrandingContext';

/**
 * useTenant - Convenience hook for tenant-related data
 * 
 * Combines data from TenantContext, AppContext, and BrandingContext
 * 
 * @example
 * const { 
 *   schoolId, 
 *   schoolName, 
 *   primaryColor,
 *   supabase,
 *   isLoading 
 * } = useTenant();
 */
const useTenant = () => {
  const { supabase, school, loading: appLoading } = useApp();
  const branding = useBranding();

  const tenant = useMemo(() => ({
    // School info
    schoolId: school?.id,
    schoolSlug: school?.slug,
    schoolName: branding.name || school?.name,
    
    // Branding
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    logoUrl: branding.logoUrl,
    faviconUrl: branding.faviconUrl,
    tagline: branding.tagline,
    
    // PDF branding
    pdfHeaderText: branding.pdfHeaderText,
    pdfFooterText: branding.pdfFooterText,
    showLogoInPdf: branding.showLogoInPdf,
    
    // Features
    features: branding.features || {},
    
    // Grading system
    gradingSystem: school?.grading_system || 'cambridge',
    
    // Plan & limits
    plan: school?.plan || 'free',
    maxStudents: school?.max_students,
    maxTeachers: school?.max_teachers,
    
    // Tenant-aware supabase client
    supabase,
    
    // Loading state
    isLoading: appLoading,
    
    // Raw school object
    school,
  }), [school, branding, supabase, appLoading]);

  return tenant;
};

export default useTenant;