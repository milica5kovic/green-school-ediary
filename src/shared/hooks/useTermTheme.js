import { useMemo } from 'react';
import { Snowflake, Flower2, Sun, Calendar } from 'lucide-react';
import { useBranding } from '../../core/context/BrandingContext';
import useActiveTerm from './useActiveTerm';

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Generate color variants from a hex color
// ════════════════════════════════════════════════════════════════════════════

const hexToRgb = (hex) => {
  if (!hex) return { r: 16, g: 185, b: 129 }; // default emerald
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

// Darken a color by percentage
const darken = (hex, percent) => {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
};

// Lighten a color by percentage
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
 * useTermTheme - Returns theme colors based on active term
 * 
 * Colors come from BrandingContext (which loads from schools table):
 * - term1Color, term2Color, term3Color
 * - Fallback to primaryColor if term colors not set
 * 
 * @returns {Object} Theme object with colors, gradients, and utilities
 * 
 * @example
 * const { color, gradient, bg, text, border, icon, name } = useTermTheme();
 * 
 * <div className={`bg-gradient-to-r ${gradient}`}>
 *   <Icon className={text} />
 *   <span className={text}>{name} Term</span>
 * </div>
 */
const useTermTheme = () => {
  const branding = useBranding();
  const { activeTerm } = useActiveTerm();

  const theme = useMemo(() => {
    // Get term number (1, 2, or 3)
    const termNumber = activeTerm?.term_number || 1;
    
    // Get color for this term from branding
    // Falls back to primaryColor if term color not set
    let termColor;
    let termName;
    
    switch (termNumber) {
      case 1:
        termColor = branding.term1Color || branding.primaryColor || '#3b82f6';
        termName = branding.term1Name || 'Winter';
        break;
      case 2:
        termColor = branding.term2Color || branding.primaryColor || '#ec4899';
        termName = branding.term2Name || 'Spring';
        break;
      case 3:
        termColor = branding.term3Color || branding.primaryColor || '#f59e0b';
        termName = branding.term3Name || 'Summer';
        break;
      default:
        termColor = branding.primaryColor || '#10b981';
        termName = 'Term';
    }

    const TermIcon = TERM_ICONS[termNumber] || Calendar;

    // Generate all color variants
    return {
      // Base color
      color: termColor,
      colorDark: darken(termColor, 15),
      colorLight: lighten(termColor, 40),
      
      // Term info
      termNumber,
      name: termName,
      icon: TermIcon,
      
      // Inline styles (for dynamic colors)
      styles: {
        color: termColor,
        backgroundColor: termColor,
        borderColor: termColor,
        backgroundLight: withAlpha(termColor, 0.1),
        backgroundMedium: withAlpha(termColor, 0.2),
      },
      
      // CSS gradient strings
      gradient: `${termColor}, ${darken(termColor, 20)}`,
      gradientStyle: { background: `linear-gradient(135deg, ${termColor} 0%, ${darken(termColor, 20)} 100%)` },
      
      // Tailwind-style class helpers (inline styles)
      bgStyle: { backgroundColor: withAlpha(termColor, 0.1) },
      bgMediumStyle: { backgroundColor: withAlpha(termColor, 0.2) },
      bgSolidStyle: { backgroundColor: termColor },
      textStyle: { color: termColor },
      borderStyle: { borderColor: withAlpha(termColor, 0.3) },
      
      // For progress bars, badges, etc.
      ringStyle: { boxShadow: `0 0 0 2px ${withAlpha(termColor, 0.3)}` },
      
      // Utility functions
      withAlpha: (alpha) => withAlpha(termColor, alpha),
      darken: (percent) => darken(termColor, percent),
      lighten: (percent) => lighten(termColor, percent),
      
      // Active term data
      activeTerm,
      hasActiveTerm: !!activeTerm,
      
      // Days remaining
      daysRemaining: activeTerm 
        ? Math.max(0, Math.ceil((new Date(activeTerm.end_date + 'T00:00:00') - new Date()) / 86400000))
        : 0,
      
      // Progress percentage
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

// ════════════════════════════════════════════════════════════════════════════
// ADDITIONAL EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export { withAlpha, darken, lighten, hexToRgb };