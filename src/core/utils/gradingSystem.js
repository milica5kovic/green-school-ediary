// ============================================================================
// GRADING SYSTEMS - Multi-system support
// ============================================================================

/**
 * Grading Systems Configuration
 * 
 * Each system defines:
 * - name: Display name
 * - grades: Array of grade objects with value, label, minPercent, maxPercent, color
 * - getGrade: Function to convert percentage to grade
 * - getColor: Function to get color for a grade
 */

// ════════════════════════════════════════════════════════════════════════════
// CAMBRIDGE GRADING (Default)
// ════════════════════════════════════════════════════════════════════════════

const CAMBRIDGE_PRIMARY = [
  { value: 6, label: 'Band 6', minPercent: 90, maxPercent: 100, color: '#10b981', description: 'Outstanding' },
  { value: 5, label: 'Band 5', minPercent: 75, maxPercent: 89, color: '#22c55e', description: 'Very Good' },
  { value: 4, label: 'Band 4', minPercent: 60, maxPercent: 74, color: '#84cc16', description: 'Good' },
  { value: 3, label: 'Band 3', minPercent: 45, maxPercent: 59, color: '#eab308', description: 'Satisfactory' },
  { value: 2, label: 'Band 2', minPercent: 30, maxPercent: 44, color: '#f97316', description: 'Needs Support' },
  { value: 1, label: 'Band 1', minPercent: 0, maxPercent: 29, color: '#ef4444', description: 'Emerging' },
];

const CAMBRIDGE_IGCSE = [
  { value: 'A*', label: 'A*', minPercent: 90, maxPercent: 100, color: '#10b981', description: 'Outstanding' },
  { value: 'A', label: 'A', minPercent: 80, maxPercent: 89, color: '#22c55e', description: 'Excellent' },
  { value: 'B', label: 'B', minPercent: 70, maxPercent: 79, color: '#84cc16', description: 'Very Good' },
  { value: 'C', label: 'C', minPercent: 60, maxPercent: 69, color: '#eab308', description: 'Good' },
  { value: 'D', label: 'D', minPercent: 50, maxPercent: 59, color: '#f97316', description: 'Satisfactory' },
  { value: 'E', label: 'E', minPercent: 40, maxPercent: 49, color: '#fb923c', description: 'Pass' },
  { value: 'F', label: 'F', minPercent: 30, maxPercent: 39, color: '#ef4444', description: 'Weak' },
  { value: 'G', label: 'G', minPercent: 20, maxPercent: 29, color: '#dc2626', description: 'Very Weak' },
  { value: 'U', label: 'U', minPercent: 0, maxPercent: 19, color: '#991b1b', description: 'Ungraded' },
];

// ════════════════════════════════════════════════════════════════════════════
// SERBIAN GRADING (1-5)
// ════════════════════════════════════════════════════════════════════════════

const SERBIAN_GRADES = [
  { value: 5, label: 'Odličan (5)', minPercent: 90, maxPercent: 100, color: '#10b981', description: 'Excellent' },
  { value: 4, label: 'Vrlo dobar (4)', minPercent: 75, maxPercent: 89, color: '#22c55e', description: 'Very Good' },
  { value: 3, label: 'Dobar (3)', minPercent: 60, maxPercent: 74, color: '#eab308', description: 'Good' },
  { value: 2, label: 'Dovoljan (2)', minPercent: 50, maxPercent: 59, color: '#f97316', description: 'Sufficient' },
  { value: 1, label: 'Nedovoljan (1)', minPercent: 0, maxPercent: 49, color: '#ef4444', description: 'Insufficient' },
];

// ════════════════════════════════════════════════════════════════════════════
// US LETTER GRADES (A-F)
// ════════════════════════════════════════════════════════════════════════════

const US_LETTER_GRADES = [
  { value: 'A+', label: 'A+', minPercent: 97, maxPercent: 100, color: '#10b981', gpa: 4.0 },
  { value: 'A', label: 'A', minPercent: 93, maxPercent: 96, color: '#10b981', gpa: 4.0 },
  { value: 'A-', label: 'A-', minPercent: 90, maxPercent: 92, color: '#22c55e', gpa: 3.7 },
  { value: 'B+', label: 'B+', minPercent: 87, maxPercent: 89, color: '#84cc16', gpa: 3.3 },
  { value: 'B', label: 'B', minPercent: 83, maxPercent: 86, color: '#84cc16', gpa: 3.0 },
  { value: 'B-', label: 'B-', minPercent: 80, maxPercent: 82, color: '#a3e635', gpa: 2.7 },
  { value: 'C+', label: 'C+', minPercent: 77, maxPercent: 79, color: '#eab308', gpa: 2.3 },
  { value: 'C', label: 'C', minPercent: 73, maxPercent: 76, color: '#eab308', gpa: 2.0 },
  { value: 'C-', label: 'C-', minPercent: 70, maxPercent: 72, color: '#f59e0b', gpa: 1.7 },
  { value: 'D+', label: 'D+', minPercent: 67, maxPercent: 69, color: '#f97316', gpa: 1.3 },
  { value: 'D', label: 'D', minPercent: 63, maxPercent: 66, color: '#f97316', gpa: 1.0 },
  { value: 'D-', label: 'D-', minPercent: 60, maxPercent: 62, color: '#fb923c', gpa: 0.7 },
  { value: 'F', label: 'F', minPercent: 0, maxPercent: 59, color: '#ef4444', gpa: 0.0 },
];

// ════════════════════════════════════════════════════════════════════════════
// IB GRADES (1-7)
// ════════════════════════════════════════════════════════════════════════════

const IB_GRADES = [
  { value: 7, label: '7', minPercent: 90, maxPercent: 100, color: '#10b981', description: 'Excellent' },
  { value: 6, label: '6', minPercent: 80, maxPercent: 89, color: '#22c55e', description: 'Very Good' },
  { value: 5, label: '5', minPercent: 70, maxPercent: 79, color: '#84cc16', description: 'Good' },
  { value: 4, label: '4', minPercent: 55, maxPercent: 69, color: '#eab308', description: 'Satisfactory' },
  { value: 3, label: '3', minPercent: 40, maxPercent: 54, color: '#f97316', description: 'Mediocre' },
  { value: 2, label: '2', minPercent: 25, maxPercent: 39, color: '#ef4444', description: 'Poor' },
  { value: 1, label: '1', minPercent: 0, maxPercent: 24, color: '#991b1b', description: 'Very Poor' },
];

// ════════════════════════════════════════════════════════════════════════════
// PERCENTAGE (Simple)
// ════════════════════════════════════════════════════════════════════════════

const PERCENTAGE_GRADES = [
  { value: 'A', label: '90-100%', minPercent: 90, maxPercent: 100, color: '#10b981' },
  { value: 'B', label: '80-89%', minPercent: 80, maxPercent: 89, color: '#22c55e' },
  { value: 'C', label: '70-79%', minPercent: 70, maxPercent: 79, color: '#84cc16' },
  { value: 'D', label: '60-69%', minPercent: 60, maxPercent: 69, color: '#eab308' },
  { value: 'E', label: '50-59%', minPercent: 50, maxPercent: 59, color: '#f97316' },
  { value: 'F', label: '0-49%', minPercent: 0, maxPercent: 49, color: '#ef4444' },
];

// ════════════════════════════════════════════════════════════════════════════
// GRADING SYSTEMS REGISTRY
// ════════════════════════════════════════════════════════════════════════════

export const GRADING_SYSTEMS = {
  cambridge: {
    name: 'Cambridge International',
    description: 'Cambridge Primary (Band 1-6) and IGCSE (A*-U)',
    primary: CAMBRIDGE_PRIMARY,
    secondary: CAMBRIDGE_IGCSE,
    isPrimaryByYear: (yearGroup) => {
      // Years 1-6 use Primary bands, Years 7+ use IGCSE
      const year = parseInt(yearGroup?.replace(/\D/g, '') || '0');
      return year <= 6;
    },
  },
  serbian: {
    name: 'Serbian (1-5)',
    description: 'Serbian grading system: Odličan to Nedovoljan',
    grades: SERBIAN_GRADES,
  },
  us_letter: {
    name: 'US Letter Grades',
    description: 'American A-F grading with plus/minus',
    grades: US_LETTER_GRADES,
  },
  us_gpa: {
    name: 'US GPA',
    description: 'American GPA scale (0.0-4.0)',
    grades: US_LETTER_GRADES, // Same scale, different display
    displayAsGpa: true,
  },
  percentage: {
    name: 'Percentage',
    description: 'Simple percentage (0-100%)',
    grades: PERCENTAGE_GRADES,
    displayAsPercent: true,
  },
  ib: {
    name: 'IB (1-7)',
    description: 'International Baccalaureate grading',
    grades: IB_GRADES,
  },
};

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get grade for a percentage based on grading system
 * 
 * @param {number} percentage - Score as percentage (0-100)
 * @param {string} system - Grading system key
 * @param {string} yearGroup - Year group for Cambridge (optional)
 * @returns {Object} Grade object with value, label, color
 */
export const getGrade = (percentage, system = 'cambridge', yearGroup = null) => {
  const pct = Math.round(percentage);
  const config = GRADING_SYSTEMS[system];
  
  if (!config) {
    console.warn(`Unknown grading system: ${system}`);
    return { value: pct, label: `${pct}%`, color: getPercentageColor(pct) };
  }

  // Cambridge has separate primary/secondary scales
  if (system === 'cambridge') {
    const isPrimary = config.isPrimaryByYear(yearGroup);
    const grades = isPrimary ? config.primary : config.secondary;
    const grade = grades.find(g => pct >= g.minPercent && pct <= g.maxPercent);
    return grade || grades[grades.length - 1];
  }

  // Other systems have single scale
  const grades = config.grades;
  const grade = grades.find(g => pct >= g.minPercent && pct <= g.maxPercent);
  
  if (!grade) {
    return grades[grades.length - 1]; // Return lowest grade
  }

  // GPA display
  if (config.displayAsGpa && grade.gpa !== undefined) {
    return {
      ...grade,
      displayValue: grade.gpa.toFixed(1),
      displayLabel: `${grade.gpa.toFixed(1)} GPA`,
    };
  }

  // Percentage display
  if (config.displayAsPercent) {
    return {
      ...grade,
      displayValue: `${pct}%`,
      displayLabel: `${pct}%`,
    };
  }

  return grade;
};

/**
 * Get color for percentage (fallback)
 */
export const getPercentageColor = (pct) => {
  if (pct >= 90) return '#10b981';
  if (pct >= 75) return '#22c55e';
  if (pct >= 60) return '#eab308';
  if (pct >= 50) return '#f97316';
  return '#ef4444';
};

/**
 * Get all grades for a system (for dropdowns, etc.)
 */
export const getGradesForSystem = (system = 'cambridge', yearGroup = null) => {
  const config = GRADING_SYSTEMS[system];
  
  if (!config) return [];

  if (system === 'cambridge') {
    const isPrimary = config.isPrimaryByYear(yearGroup);
    return isPrimary ? config.primary : config.secondary;
  }

  return config.grades || [];
};

/**
 * Format grade for display
 */
export const formatGrade = (grade, system = 'cambridge') => {
  if (!grade) return '-';
  
  if (typeof grade === 'number') {
    return grade.toString();
  }
  
  if (grade.displayLabel) {
    return grade.displayLabel;
  }
  
  return grade.label || grade.value?.toString() || '-';
};

/**
 * Get system display name
 */
export const getSystemName = (system) => {
  return GRADING_SYSTEMS[system]?.name || system;
};

/**
 * Check if grade is passing
 */
export const isPassingGrade = (percentage, system = 'cambridge') => {
  const config = GRADING_SYSTEMS[system];
  
  // Serbian: 2+ is passing (50%+)
  if (system === 'serbian') return percentage >= 50;
  
  // US: D- and above is passing (60%+)
  if (system === 'us_letter' || system === 'us_gpa') return percentage >= 60;
  
  // Cambridge/IB/Percentage: typically 50%+
  return percentage >= 50;
};

// ════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (for backwards compatibility)
// ════════════════════════════════════════════════════════════════════════════

// Keep old function name for compatibility
export const getCambridgeGrade = (percentage, yearGroup = null) => {
  return getGrade(percentage, 'cambridge', yearGroup);
};

export default {
  GRADING_SYSTEMS,
  getGrade,
  getGradesForSystem,
  formatGrade,
  getSystemName,
  isPassingGrade,
  getCambridgeGrade,
  getPercentageColor,
};