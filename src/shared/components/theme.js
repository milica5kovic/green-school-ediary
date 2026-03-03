// ============================================================================
// THEME UTILITIES - Production-level theming system
// ============================================================================

/**
 * Convert hex color to RGB object
 */
export const hexToRgb = (hex) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (r, g, b) => {
  const toHex = (c) => Math.min(255, Math.max(0, Math.round(c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Adjust color brightness
 * @param hex - Hex color string
 * @param percent - Positive = lighter, Negative = darker
 */
export const adjustColor = (hex, percent) => {
  const rgb = hexToRgb(hex);
  const adjust = (c) => Math.min(255, Math.max(0, Math.round(c + (255 - c) * (percent / 100))));
  const darken = (c) => Math.min(255, Math.max(0, Math.round(c * (1 + percent / 100))));
  
  if (percent > 0) {
    return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b));
  } else {
    return rgbToHex(darken(rgb.r), darken(rgb.g), darken(rgb.b));
  }
};

/**
 * Get contrasting text color (black or white) for a background
 */
export const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Generate alpha variant of a color
 * @param hex - Hex color string
 * @param alpha - 0 to 1
 */
export const withAlpha = (hex, alpha) => {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

// ============================================================================
// STYLE GENERATORS - Generate consistent styles from branding
// ============================================================================

/**
 * Generate button styles based on variant and branding
 */
export const getButtonStyles = (primaryColor, variant = 'primary', size = 'md') => {
  const sizes = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-lg',
  };

  const base = `
    inline-flex items-center justify-center gap-2 
    font-medium rounded-lg transition-all duration-200 
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizes[size] || sizes.md}
  `.trim().replace(/\s+/g, ' ');

  const variants = {
    primary: {
      className: `${base} text-white shadow-sm hover:shadow-md`,
      style: {
        backgroundColor: primaryColor,
        '--tw-ring-color': withAlpha(primaryColor, 0.5),
      },
      hoverStyle: {
        backgroundColor: adjustColor(primaryColor, -10),
      },
    },
    secondary: {
      className: `${base} border`,
      style: {
        backgroundColor: withAlpha(primaryColor, 0.1),
        borderColor: withAlpha(primaryColor, 0.3),
        color: primaryColor,
        '--tw-ring-color': withAlpha(primaryColor, 0.5),
      },
      hoverStyle: {
        backgroundColor: withAlpha(primaryColor, 0.15),
      },
    },
    outline: {
      className: `${base} border-2 bg-transparent`,
      style: {
        borderColor: primaryColor,
        color: primaryColor,
        '--tw-ring-color': withAlpha(primaryColor, 0.5),
      },
      hoverStyle: {
        backgroundColor: withAlpha(primaryColor, 0.1),
      },
    },
    ghost: {
      className: `${base} bg-transparent`,
      style: {
        color: primaryColor,
        '--tw-ring-color': withAlpha(primaryColor, 0.5),
      },
      hoverStyle: {
        backgroundColor: withAlpha(primaryColor, 0.1),
      },
    },
    danger: {
      className: `${base} text-white bg-red-600 hover:bg-red-700 focus:ring-red-500`,
      style: {},
      hoverStyle: {},
    },
    white: {
      className: `${base} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`,
      style: {},
      hoverStyle: {},
    },
  };

  return variants[variant] || variants.primary;
};

/**
 * Generate input/select styles based on branding
 */
export const getInputStyles = (primaryColor, hasError = false) => {
  return {
    className: `
      w-full px-3 py-2 text-sm 
      border rounded-lg bg-white
      transition-all duration-200
      focus:outline-none focus:ring-2
      disabled:bg-gray-100 disabled:cursor-not-allowed
      ${hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'}
    `.trim().replace(/\s+/g, ' '),
    style: hasError ? {} : {
      '--tw-ring-color': withAlpha(primaryColor, 0.3),
    },
    focusStyle: hasError ? {} : {
      borderColor: primaryColor,
      boxShadow: `0 0 0 3px ${withAlpha(primaryColor, 0.15)}`,
    },
  };
};

/**
 * Generate card styles based on branding
 */
export const getCardStyles = (primaryColor, variant = 'default') => {
  const variants = {
    default: {
      className: 'bg-white rounded-2xl shadow-sm border border-gray-200',
      style: {},
    },
    elevated: {
      className: 'bg-white rounded-2xl shadow-lg border border-gray-100',
      style: {},
    },
    branded: {
      className: 'bg-white rounded-2xl shadow-sm border',
      style: {
        borderColor: withAlpha(primaryColor, 0.2),
      },
    },
    filled: {
      className: 'rounded-2xl border',
      style: {
        backgroundColor: withAlpha(primaryColor, 0.05),
        borderColor: withAlpha(primaryColor, 0.15),
      },
    },
  };

  return variants[variant] || variants.default;
};

/**
 * Generate badge/tag styles based on branding
 */
export const getBadgeStyles = (primaryColor, variant = 'default', color = null) => {
  // Predefined semantic colors
  const semanticColors = {
    success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    error: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    info: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    gray: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  };

  if (color && semanticColors[color]) {
    const c = semanticColors[color];
    return {
      className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      style: {
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      },
    };
  }

  const variants = {
    default: {
      className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      style: {
        backgroundColor: withAlpha(primaryColor, 0.1),
        color: primaryColor,
      },
    },
    solid: {
      className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white',
      style: {
        backgroundColor: primaryColor,
      },
    },
    outline: {
      className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      style: {
        borderColor: primaryColor,
        color: primaryColor,
      },
    },
  };

  return variants[variant] || variants.default;
};

/**
 * Generate tab styles based on branding
 */
export const getTabStyles = (primaryColor, isActive = false) => {
  if (isActive) {
    return {
      className: 'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
      style: {
        color: primaryColor,
        borderColor: primaryColor,
        backgroundColor: withAlpha(primaryColor, 0.05),
      },
    };
  }

  return {
    className: 'px-4 py-2.5 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:bg-gray-50 transition-colors',
    style: {},
  };
};

/**
 * Generate avatar styles based on branding
 */
export const getAvatarStyles = (primaryColor, size = 'md') => {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };

  return {
    className: `${sizes[size] || sizes.md} rounded-full flex items-center justify-center font-bold text-white`,
    style: {
      backgroundColor: primaryColor,
    },
  };
};

/**
 * Generate table header styles based on branding
 */
export const getTableStyles = (primaryColor) => {
  return {
    header: {
      className: 'text-left text-xs font-semibold text-gray-600 uppercase tracking-wider',
      style: {
        backgroundColor: withAlpha(primaryColor, 0.05),
      },
    },
    row: {
      className: 'border-b border-gray-100 transition-colors',
      hoverStyle: {
        backgroundColor: withAlpha(primaryColor, 0.03),
      },
    },
    cell: {
      className: 'px-4 py-3 text-sm text-gray-700',
    },
  };
};

/**
 * Generate alert styles based on type
 */
export const getAlertStyles = (type = 'info') => {
  const types = {
    info: {
      className: 'bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4',
      iconColor: 'text-blue-500',
    },
    success: {
      className: 'bg-green-50 border border-green-200 text-green-800 rounded-xl p-4',
      iconColor: 'text-green-500',
    },
    warning: {
      className: 'bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4',
      iconColor: 'text-amber-500',
    },
    error: {
      className: 'bg-red-50 border border-red-200 text-red-800 rounded-xl p-4',
      iconColor: 'text-red-500',
    },
  };

  return types[type] || types.info;
};

// ============================================================================
// CSS VARIABLE HELPERS
// ============================================================================

/**
 * Get CSS variable value
 */
export const getCssVar = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/**
 * Set CSS variable value
 */
export const setCssVar = (name, value) => {
  document.documentElement.style.setProperty(name, value);
};

// ============================================================================
// DEFAULT THEME
// ============================================================================

export const DEFAULT_THEME = {
  colors: {
    primary: '#10b981',
    secondary: '#0d9488',
    accent: '#f59e0b',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
};

export default {
  hexToRgb,
  rgbToHex,
  adjustColor,
  getContrastColor,
  withAlpha,
  getButtonStyles,
  getInputStyles,
  getCardStyles,
  getBadgeStyles,
  getTabStyles,
  getAvatarStyles,
  getTableStyles,
  getAlertStyles,
  getCssVar,
  setCssVar,
  DEFAULT_THEME,
};
