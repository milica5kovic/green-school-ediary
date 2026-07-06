// Cambridge Primary (Y1-Y6): Bands 1-6
// IGCSE Secondary (Y7-Y9): A* to U

const PRIMARY_CLASSES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y5A', 'Y5B', 'Y6', 'Y6A', 'Y6B'];
const SECONDARY_CLASSES = ['Y7', 'Y7A', 'Y7B', 'Y8', 'Y8A', 'Y8B', 'Y9', 'Y9A', 'Y9B'];

const isPrimaryClass = (className) => {
  if (!className) return true;
  // Case-insensitive, strip section suffix (a/b/c) so Y1a, Y6B etc. match
  const upper = className.toUpperCase();
  const base = upper.replace(/[ABC]$/, '');
  return PRIMARY_CLASSES.includes(upper) || PRIMARY_CLASSES.includes(base);
};

// Cambridge Primary: percentage → Band 1-6
const getBand = (percentage) => {
  if (percentage >= 90) return { band: 6, label: 'Band 6', equivalent: 'A*', color: '#059669' };
  if (percentage >= 80) return { band: 5, label: 'Band 5', equivalent: 'A', color: '#10b981' };
  if (percentage >= 70) return { band: 4, label: 'Band 4', equivalent: 'B', color: '#3b82f6' };
  if (percentage >= 60) return { band: 3, label: 'Band 3', equivalent: 'C', color: '#f59e0b' };
  if (percentage >= 50) return { band: 2, label: 'Band 2', equivalent: 'D', color: '#f97316' };
  return { band: 1, label: 'Band 1', equivalent: 'E/F', color: '#ef4444' };
};

// IGCSE Secondary: percentage → letter grade
const getIGCSEGrade = (percentage) => {
  if (percentage >= 95) return { grade: 'A*', color: '#059669' };
  if (percentage >= 85) return { grade: 'A', color: '#10b981' };
  if (percentage >= 75) return { grade: 'B', color: '#3b82f6' };
  if (percentage >= 65) return { grade: 'C', color: '#0ea5e9' };
  if (percentage >= 55) return { grade: 'D', color: '#f59e0b' };
  if (percentage >= 45) return { grade: 'E', color: '#f97316' };
  if (percentage >= 35) return { grade: 'F', color: '#ef4444' };
  if (percentage >= 25) return { grade: 'G', color: '#dc2626' };
  return { grade: 'U', color: '#991b1b' };
};

// Main function: get Cambridge grade for any class
const getCambridgeGrade = (percentage, className) => {
  if (isPrimaryClass(className)) {
    const result = getBand(percentage);
    return {
      display: result.label,
      short: `B${result.band}`,
      color: result.color,
      isPrimary: true,
      band: result.band,
      equivalent: result.equivalent
    };
  } else {
    const result = getIGCSEGrade(percentage);
    return {
      display: result.grade,
      short: result.grade,
      color: result.color,
      isPrimary: false,
      band: null,
      equivalent: result.grade
    };
  }
};

// Get color for percentage (generic, no class needed)
const getPercentageColor = (percentage) => {
  if (percentage >= 80) return '#059669';
  if (percentage >= 60) return '#3b82f6';
  if (percentage >= 40) return '#f59e0b';
  return '#ef4444';
};

// ─── Config-aware grade lookup ────────────────────────────────────────────────
// Uses the school's saved grading_config ({ primary: {...}, secondary: {...} })
// Falls back to hardcoded Cambridge defaults if config is missing.

const getGradeFromConfig = (percentage, className, gradingConfig) => {
  const primary = isPrimaryClass(className);
  const tierConfig = primary
    ? gradingConfig?.primary
    : gradingConfig?.secondary;

  const grades = tierConfig?.grades;

  if (!grades?.length) {
    // Fallback: use hardcoded Cambridge/IGCSE
    return getCambridgeGrade(percentage, className);
  }

  // Find grade whose range contains this percentage
  const match = grades.find(
    g => g.min !== undefined && g.max !== undefined
      && percentage >= g.min && percentage <= g.max
  ) || grades[grades.length - 1]; // default to lowest grade

  return {
    display:     match.description ? match.label : match.label,
    short:       match.label,
    color:       match.color || '#6b7280',
    isPrimary:   primary,
    band:        null,
    equivalent:  match.label,
    description: match.description || '',
  };
};

export {
  getCambridgeGrade,
  getGradeFromConfig,
  getBand,
  getIGCSEGrade,
  isPrimaryClass,
  getPercentageColor,
  PRIMARY_CLASSES,
  SECONDARY_CLASSES
};