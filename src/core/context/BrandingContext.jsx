import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTenant } from './TenantContext';

// ============================================================================
// BRANDING CONTEXT
// ============================================================================

const BrandingContext = createContext(null);

/**
 * DEFAULT_FEATURES — must stay in sync with DEFAULT_FEATURES in OwnerDashboard.jsx.
 * These are the fallback values used when a school's DB record is missing a key
 * (e.g. newly added features that existing rows haven't been migrated for yet).
 */
const DEFAULT_FEATURES = {
  // General
  home:               true,
  admin_dashboard:    true,
  // Teacher
  schedule:           true,
  calendar:           true,
  tasks:              true,
  homework:           true,
  grading:            true,
  daily_overview:     true,
  test_maker:         true,
  activity:           true,
  // Admin
  admin_calendar:     true,
  management:         true,
  admissions:         true,
  timetable:          true,
  reports:            true,
  report_cards:       true,
  // Parent portal
  parent_portal:      true,
  parent_grades:      true,
  parent_attendance:  true,
  parent_calendar:    true,
  parent_homework:    true,
  // Platform
  messaging:          false,
  custom_branding:    true,
  pdf_branding:       true,
};

const DEFAULT_BRANDING = {
  name:     'SchoolHub',
  tagline:  'School Management Platform',
  logoUrl:  '/Logo(1).png',
  faviconUrl: '/Logo(1).png',

  primaryColor:   '#10b981',
  secondaryColor: '#0d9488',
  accentColor:    '#f59e0b',

  term1Color: '#3b82f6',
  term2Color: '#ec4899',
  term3Color: '#f59e0b',
  term1Name:  'Winter',
  term2Name:  'Spring',
  term3Name:  'Summer',
  useTermColors: false,

  primaryRgb:   { r: 16,  g: 185, b: 129 },
  secondaryRgb: { r: 13,  g: 148, b: 136 },
  accentRgb:    { r: 245, g: 158, b: 11  },

  email:   'hello@akio.rs',
  phone:   '',
  website: 'https://akio.rs',
  address: 'Belgrade, Serbia',

  gradingSystem: 'cambridge',
  academicYear:  '2025-26',
  timezone:      'Europe/Belgrade',
  language:      'en',

  pdfHeaderText: 'SchoolHub',
  pdfFooterText: 'Powered by Akio',
  showLogoInPdf: true,

  features: DEFAULT_FEATURES,

  isCustomBranding: false,
  isLoading: true,
};

// ============================================================================
// HELPERS
// ============================================================================

const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
};

const adjustColor = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const adj  = (c) => Math.min(255, Math.max(0, Math.round(c + (c * percent / 100))));
  const toHex = (c) => adj(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// ============================================================================
// BUILD BRANDING FROM SCHOOL ROW
// ============================================================================

const buildBrandingFromSchool = (school) => ({
  name:       school.name    || DEFAULT_BRANDING.name,
  tagline:    school.tagline || DEFAULT_BRANDING.tagline,
  logoUrl:    school.logo_url    || DEFAULT_BRANDING.logoUrl,
  faviconUrl: school.favicon_url || school.logo_url || DEFAULT_BRANDING.faviconUrl,

  primaryColor:   school.primary_color   || DEFAULT_BRANDING.primaryColor,
  secondaryColor: school.secondary_color || DEFAULT_BRANDING.secondaryColor,
  accentColor:    school.accent_color    || DEFAULT_BRANDING.accentColor,

  term1Color:    school.term1_color || DEFAULT_BRANDING.term1Color,
  term2Color:    school.term2_color || DEFAULT_BRANDING.term2Color,
  term3Color:    school.term3_color || DEFAULT_BRANDING.term3Color,
  term1Name:     school.term1_name  || DEFAULT_BRANDING.term1Name,
  term2Name:     school.term2_name  || DEFAULT_BRANDING.term2Name,
  term3Name:     school.term3_name  || DEFAULT_BRANDING.term3Name,
  useTermColors: school.use_term_colors === true,

  primaryRgb:   hexToRgb(school.primary_color   || DEFAULT_BRANDING.primaryColor),
  secondaryRgb: hexToRgb(school.secondary_color || DEFAULT_BRANDING.secondaryColor),
  accentRgb:    hexToRgb(school.accent_color    || DEFAULT_BRANDING.accentColor),
  primaryLight: adjustColor(school.primary_color || DEFAULT_BRANDING.primaryColor,  30),
  primaryDark:  adjustColor(school.primary_color || DEFAULT_BRANDING.primaryColor, -20),

  email:   school.email   || DEFAULT_BRANDING.email,
  phone:   school.phone   || DEFAULT_BRANDING.phone,
  website: school.website || DEFAULT_BRANDING.website,
  address: school.address || DEFAULT_BRANDING.address,

  gradingSystem: school.grading_system   || DEFAULT_BRANDING.gradingSystem,
  academicYear:  school.academic_year    || DEFAULT_BRANDING.academicYear,
  timezone:      school.timezone         || DEFAULT_BRANDING.timezone,
  language:      school.default_language || DEFAULT_BRANDING.language,

  pdfHeaderText: school.pdf_header_text || school.name || DEFAULT_BRANDING.pdfHeaderText,
  pdfFooterText: school.pdf_footer_text || DEFAULT_BRANDING.pdfFooterText,
  showLogoInPdf: school.show_logo_in_pdf ?? DEFAULT_BRANDING.showLogoInPdf,

  // Merge: DEFAULT_FEATURES supplies any keys the DB row doesn't have yet
  features: { ...DEFAULT_FEATURES, ...(school.features || {}) },

  isCustomBranding: school.features?.custom_branding ?? true,
  isLoading:  false,
  schoolId:   school.id,
  schoolSlug: school.slug,
});

// ============================================================================
// APPLY BRANDING TO DOCUMENT
// ============================================================================

const applyBrandingToDocument = (branding) => {
  document.title = `${branding.name} | SchoolHub`;

  let favicon = document.querySelector("link[rel~='icon']");
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  favicon.href = branding.faviconUrl;

  const root = document.documentElement;
  root.style.setProperty('--school-primary',     branding.primaryColor);
  root.style.setProperty('--school-secondary',   branding.secondaryColor);
  root.style.setProperty('--school-accent',      branding.accentColor);
  root.style.setProperty('--school-primary-light', branding.primaryLight);
  root.style.setProperty('--school-primary-dark',  branding.primaryDark);
  root.style.setProperty('--school-primary-rgb',
    `${branding.primaryRgb.r}, ${branding.primaryRgb.g}, ${branding.primaryRgb.b}`);
  root.style.setProperty('--school-term1', branding.term1Color);
  root.style.setProperty('--school-term2', branding.term2Color);
  root.style.setProperty('--school-term3', branding.term3Color);

  let metaTheme = document.querySelector("meta[name='theme-color']");
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = branding.primaryColor;
};

// ============================================================================
// PROVIDER
// ============================================================================

export const BrandingProvider = ({ children }) => {
  const { school, schoolId, isSchool, loading: tenantLoading, supabase } = useTenant();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  // Refetch — call after settings change to pull latest from DB
  const refetch = useCallback(async () => {
    if (!schoolId || !supabase) return;

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) {
      console.error('[BrandingContext] refetch error:', error);
      return;
    }

    if (data) {
      const updated = buildBrandingFromSchool(data);
      setBranding(updated);
      applyBrandingToDocument(updated);
    }
  }, [schoolId, supabase]);

  // Initial load — runs when tenant resolves
  useEffect(() => {
    if (tenantLoading) return;

    if (!isSchool || !school) {
      setBranding({ ...DEFAULT_BRANDING, isLoading: false });
      return;
    }

    const schoolBranding = buildBrandingFromSchool(school);
    setBranding(schoolBranding);
    applyBrandingToDocument(schoolBranding);
  }, [school, schoolId, isSchool, tenantLoading]);

  // Real-time preview update (called from SettingsPage color pickers, etc.)
  const updateBranding = (updates) => {
    setBranding(prev => {
      const root = document.documentElement;
      if (updates.primaryColor)   root.style.setProperty('--school-primary',   updates.primaryColor);
      if (updates.secondaryColor) root.style.setProperty('--school-secondary', updates.secondaryColor);
      if (updates.term1Color)     root.style.setProperty('--school-term1',     updates.term1Color);
      if (updates.term2Color)     root.style.setProperty('--school-term2',     updates.term2Color);
      if (updates.term3Color)     root.style.setProperty('--school-term3',     updates.term3Color);
      return { ...prev, ...updates };
    });
  };

  return (
    <BrandingContext.Provider value={{ ...branding, updateBranding, refetch }}>
      {children}
    </BrandingContext.Provider>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    console.warn('[useBranding] must be used within BrandingProvider');
    return DEFAULT_BRANDING;
  }
  return context;
};

/** Convenience hook — returns true/false for a single feature key. */
export const useFeature = (featureName) => {
  const { features } = useBranding();
  return features[featureName] ?? false;
};

export const useBrandColors = () => {
  const {
    primaryColor, secondaryColor, accentColor,
    primaryRgb, primaryLight, primaryDark,
    term1Color, term2Color, term3Color,
    useTermColors,
  } = useBranding();
  return {
    primaryColor, secondaryColor, accentColor,
    primaryRgb, primaryLight, primaryDark,
    term1Color, term2Color, term3Color,
    useTermColors,
  };
};

export const usePdfBranding = () => {
  const {
    name, logoUrl, pdfHeaderText, pdfFooterText, showLogoInPdf,
    primaryRgb, secondaryRgb, email, phone, website, address,
  } = useBranding();
  return {
    schoolName: name,
    logoUrl,
    headerText:  pdfHeaderText,
    footerText:  pdfFooterText,
    showLogo:    showLogoInPdf,
    primaryRgb,
    secondaryRgb,
    contact: { email, phone, website, address },
  };
};

export const useTermColors = () => {
  const {
    term1Color, term2Color, term3Color,
    term1Name,  term2Name,  term3Name,
    useTermColors,
  } = useBranding();
  return {
    term1: { color: term1Color, name: term1Name },
    term2: { color: term2Color, name: term2Name },
    term3: { color: term3Color, name: term3Name },
    isEnabled: useTermColors,
  };
};

export default BrandingContext;