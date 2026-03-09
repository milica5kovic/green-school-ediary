import { useMemo } from 'react';
import { Snowflake, Flower2, Sun, Calendar } from 'lucide-react';
import { useBranding } from '../../core/context/BrandingContext';
import useActiveTerm from './useActiveTerm';

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Generate color variants from a hex color
// ════════════════════════════════════════════════════════════════════════════

const hexToRgb = (hex) => {
  if (!hex) return { r: 16, g: 185, b: 129 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 16, g: 185, b: 129 };
};

const withAlpha = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darken = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
};

const lighten = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  return `rgb(${Math.round(r + (255 - r) * factor)}, ${Math.round(g + (255 - g) * factor)}, ${Math.round(b + (255 - b) * factor)})`;
};

// ════════════════════════════════════════════════════════════════════════════
// TERM ICONS
// ════════════════════════════════════════════════════════════════════════════

const TERM_ICONS = {
  1: Snowflake,
  2: Flower2,
  3: Sun,
};

// ════════════════════════════════════════════════════════════════════════════
// useTermTheme HOOK
// ════════════════════════════════════════════════════════════════════════════

/**
 * useTermTheme - Returns theme colors based on admin settings
 * 
 * Reads `useTermColors` from BrandingContext:
 *   → useTermColors = false → Uses primaryColor (brand mode)
 *   → useTermColors = true  → Uses term1/2/3 color based on active term (seasonal mode)
 * 
 * @returns {Object} Theme object with colors, gradients, and utilities
 */
const useTermTheme = () => {
  const branding = useBranding();
  const { activeTerm } = useActiveTerm();

  // ═══ DEBUG ═══
  console.log('🎨 useTermTheme input:', { 
    useTermColors: branding.useTermColors, 
    termNumber: activeTerm?.term_number,
    primaryColor: branding.primaryColor,
    term1Color: branding.term1Color,
    term2Color: branding.term2Color,
  });

  const theme = useMemo(() => {
    const termNumber = activeTerm?.term_number || 1;
    
    // ═══ KEY LOGIC: Check useTermColors toggle ═══
    // If false (default) → use primaryColor everywhere
    // If true → use seasonal term colors
    const useSeasonalColors = branding.useTermColors === true;
    
    let activeColor;
    let termName;
    let TermIcon;
    
    if (useSeasonalColors && activeTerm) {
      // SEASONAL MODE - use term-specific colors
      switch (termNumber) {
        case 1:
          activeColor = branding.term1Color || '#3b82f6';
          termName = branding.term1Name || 'Winter';
          break;
        case 2:
          activeColor = branding.term2Color || '#ec4899';
          termName = branding.term2Name || 'Spring';
          break;
        case 3:
          activeColor = branding.term3Color || '#f59e0b';
          termName = branding.term3Name || 'Summer';
          break;
        default:
          activeColor = branding.primaryColor || '#10b981';
          termName = 'Term';
      }
      TermIcon = TERM_ICONS[termNumber] || Calendar;
    } else {
      // BRAND MODE - use primary color everywhere
      activeColor = branding.primaryColor || '#10b981';
      termName = activeTerm ? (branding[`term${termNumber}Name`] || `Term ${termNumber}`) : 'Term';
      TermIcon = activeTerm ? (TERM_ICONS[termNumber] || Calendar) : Calendar;
    }

    return {
      // Base color
      color: activeColor,
      colorDark: darken(activeColor, 15),
      colorLight: lighten(activeColor, 40),
      
      // Mode info
      isSeasonalMode: useSeasonalColors,
      
      // Term info
      termNumber,
      name: termName,
      icon: TermIcon,
      
      // Inline styles
      styles: {
        color: activeColor,
        backgroundColor: activeColor,
        borderColor: activeColor,
      },
      
      // Gradients - use same color for clean look (no gradient effect)
      gradient: `${activeColor}, ${darken(activeColor, 10)}`,
      gradientStyle: { 
        background: activeColor
      },
      
      // Style objects for common use cases
      bgStyle: { backgroundColor: withAlpha(activeColor, 0.1) },
      bgMediumStyle: { backgroundColor: withAlpha(activeColor, 0.2) },
      bgSolidStyle: { backgroundColor: activeColor },
      textStyle: { color: activeColor },
      borderStyle: { borderColor: withAlpha(activeColor, 0.3) },
      ringStyle: { boxShadow: `0 0 0 2px ${withAlpha(activeColor, 0.3)}` },
      
      // Utility functions
      withAlpha: (alpha) => withAlpha(activeColor, alpha),
      darken: (percent) => darken(activeColor, percent),
      lighten: (percent) => lighten(activeColor, percent),
      
      // Active term data
      activeTerm,
      hasActiveTerm: !!activeTerm,
      
      // Days remaining in term
      daysRemaining: activeTerm 
        ? Math.max(0, Math.ceil((new Date(activeTerm.end_date + 'T00:00:00') - new Date()) / 86400000))
        : 0,
      
      // Progress percentage through term
      progress: activeTerm
        ? Math.min(100, Math.max(0, 
            ((new Date() - new Date(activeTerm.start_date + 'T00:00:00')) / 
             (new Date(activeTerm.end_date + 'T00:00:00') - new Date(activeTerm.start_date + 'T00:00:00'))) * 100
          ))
        : 0,
    };
  }, [activeTerm, branding]);

  return theme;
};

export default useTermTheme;

export { withAlpha, darken, lighten, hexToRgb };