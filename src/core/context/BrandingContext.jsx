import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTenant } from './TenantContext';

// ============================================================================
// BRANDING CONTEXT - Centralized branding for entire app
// ============================================================================

const BrandingContext = createContext(null);

// Default branding (Akio/SchoolHub platform defaults)
const DEFAULT_BRANDING = {
  // Identity
  name: 'SchoolHub',
  tagline: 'School Management Platform',
  logoUrl: '/Logo(1).png',
  faviconUrl: '/Logo(1).png',
  
  // Colors
  primaryColor: '#10b981',
  secondaryColor: '#0d9488',
  accentColor: '#f59e0b',
  
  // Computed colors (will be calculated)
  primaryRgb: { r: 16, g: 185, b: 129 },
  secondaryRgb: { r: 13, g: 148, b: 136 },
  accentRgb: { r: 245, g: 158, b: 11 },
  
  // Contact
  email: 'hello@akio.rs',
  phone: '',
  website: 'https://akio.rs',
  address: 'Belgrade, Serbia',
  
  // Academic
  gradingSystem: 'cambridge',
  academicYear: '2025-26',
  timezone: 'Europe/Belgrade',
  language: 'en',
  
  // PDF
  pdfHeaderText: 'SchoolHub',
  pdfFooterText: 'Powered by Akio',
  showLogoInPdf: true,
  
  // Features
  features: {
    homework: true,
    attendance: true,
    parent_portal: true,
    admissions: true,
    report_cards: true,
    messaging: false,
    calendar: true,
    custom_branding: false,
    pdf_branding: false,
  },
  
  // Meta
  isCustomBranding: false,
  isLoading: true,
};

// Helper: Convert hex to RGB
const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Helper: Darken/Lighten color
const adjustColor = (hex, percent) => {
  const rgb = hexToRgb(hex);
  const adjust = (c) => Math.min(255, Math.max(0, Math.round(c + (c * percent / 100))));
  const toHex = (c) => adjust(c).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

export const BrandingProvider = ({ children }) => {
  const { school, schoolId, isSchool, isMarketing, loading: tenantLoading } = useTenant();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  useEffect(() => {
    if (tenantLoading) return;

    // If not a school context, use defaults
    if (!isSchool || !school) {
      setBranding({ ...DEFAULT_BRANDING, isLoading: false });
      return;
    }

    // Build branding from school data
    const schoolBranding = {
      // Identity
      name: school.name || DEFAULT_BRANDING.name,
      tagline: school.tagline || DEFAULT_BRANDING.tagline,
      logoUrl: school.logo_url || DEFAULT_BRANDING.logoUrl,
      faviconUrl: school.favicon_url || school.logo_url || DEFAULT_BRANDING.faviconUrl,
      
      // Colors
      primaryColor: school.primary_color || DEFAULT_BRANDING.primaryColor,
      secondaryColor: school.secondary_color || DEFAULT_BRANDING.secondaryColor,
      accentColor: school.accent_color || DEFAULT_BRANDING.accentColor,
      
      // Computed RGB (for PDF, canvas, etc.)
      primaryRgb: hexToRgb(school.primary_color || DEFAULT_BRANDING.primaryColor),
      secondaryRgb: hexToRgb(school.secondary_color || DEFAULT_BRANDING.secondaryColor),
      accentRgb: hexToRgb(school.accent_color || DEFAULT_BRANDING.accentColor),
      
      // Computed variations
      primaryLight: adjustColor(school.primary_color || DEFAULT_BRANDING.primaryColor, 30),
      primaryDark: adjustColor(school.primary_color || DEFAULT_BRANDING.primaryColor, -20),
      
      // Contact
      email: school.email || DEFAULT_BRANDING.email,
      phone: school.phone || DEFAULT_BRANDING.phone,
      website: school.website || DEFAULT_BRANDING.website,
      address: school.address || DEFAULT_BRANDING.address,
      
      // Academic
      gradingSystem: school.grading_system || DEFAULT_BRANDING.gradingSystem,
      academicYear: school.academic_year || DEFAULT_BRANDING.academicYear,
      timezone: school.timezone || DEFAULT_BRANDING.timezone,
      language: school.default_language || DEFAULT_BRANDING.language,
      
      // PDF
      pdfHeaderText: school.pdf_header_text || school.name || DEFAULT_BRANDING.pdfHeaderText,
      pdfFooterText: school.pdf_footer_text || DEFAULT_BRANDING.pdfFooterText,
      showLogoInPdf: school.show_logo_in_pdf ?? DEFAULT_BRANDING.showLogoInPdf,
      
      // Features
      features: {
        ...DEFAULT_BRANDING.features,
        ...(school.features || {}),
      },
      
      // Meta
      isCustomBranding: school.features?.custom_branding ?? true,
      isLoading: false,
      schoolId: school.id,
      schoolSlug: school.slug,
    };

    setBranding(schoolBranding);
    
    // Apply branding to document
    applyBrandingToDocument(schoolBranding);
    
    console.log('🎨 Branding applied:', schoolBranding.name);
    
  }, [school, schoolId, isSchool, tenantLoading]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};

// ============================================================================
// APPLY BRANDING TO DOCUMENT (Title, Favicon, CSS Variables)
// ============================================================================

const applyBrandingToDocument = (branding) => {
  // Set document title
  document.title = `${branding.name} | SchoolHub`;
  
  // Set favicon
  let favicon = document.querySelector("link[rel~='icon']");
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = branding.faviconUrl;
  
  // Set CSS variables on :root
  const root = document.documentElement;
  root.style.setProperty('--school-primary', branding.primaryColor);
  root.style.setProperty('--school-secondary', branding.secondaryColor);
  root.style.setProperty('--school-accent', branding.accentColor);
  root.style.setProperty('--school-primary-light', branding.primaryLight);
  root.style.setProperty('--school-primary-dark', branding.primaryDark);
  root.style.setProperty('--school-primary-rgb', `${branding.primaryRgb.r}, ${branding.primaryRgb.g}, ${branding.primaryRgb.b}`);
  
  // Set meta theme color (for mobile browsers)
  let metaTheme = document.querySelector("meta[name='theme-color']");
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = branding.primaryColor;
};

// ============================================================================
// HOOK
// ============================================================================

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    console.warn('useBranding must be used within BrandingProvider');
    return DEFAULT_BRANDING;
  }
  return context;
};

// ============================================================================
// HELPER HOOKS
// ============================================================================

// Check if a feature is enabled
export const useFeature = (featureName) => {
  const { features } = useBranding();
  return features[featureName] ?? false;
};

// Get colors for inline styles
export const useBrandColors = () => {
  const { primaryColor, secondaryColor, accentColor, primaryRgb, primaryLight, primaryDark } = useBranding();
  return { primaryColor, secondaryColor, accentColor, primaryRgb, primaryLight, primaryDark };
};

// Get PDF branding
export const usePdfBranding = () => {
  const { 
    name, logoUrl, pdfHeaderText, pdfFooterText, showLogoInPdf,
    primaryRgb, secondaryRgb, email, phone, website, address
  } = useBranding();
  
  return {
    schoolName: name,
    logoUrl,
    headerText: pdfHeaderText,
    footerText: pdfFooterText,
    showLogo: showLogoInPdf,
    primaryRgb,
    secondaryRgb,
    contact: { email, phone, website, address },
  };
};

export default BrandingContext;