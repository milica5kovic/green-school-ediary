// ============================================================================
// VALIDATION ENGINE — Extensible rule-based comment validation
// ============================================================================
// Each validator(value, config, context) returns an error string or null.
// context: { studentName, existingComments }

const VALIDATORS = {
  word_count: (value, config) => {
    const words = (value || '').trim().split(/\s+/).filter(Boolean).length;
    if (config.min && words < config.min)
      return `Comment is too short — ${words} word${words !== 1 ? 's' : ''} (minimum ${config.min})`;
    if (config.max && words > config.max)
      return `Comment is too long — ${words} word${words !== 1 ? 's' : ''} (maximum ${config.max})`;
    return null;
  },

  required_fields: (value, config) => {
    if (!value || value.trim() === '')
      return config.message || 'This field is required';
    return null;
  },

  mentions_student_name: (value, config, context) => {
    if (!context?.studentName) return null;
    const firstName = context.studentName.split(' ')[0].toLowerCase();
    if (!(value || '').toLowerCase().includes(firstName))
      return `Consider mentioning the student's first name in the comment`;
    return null;
  },

  duplicate_comment_detection: (value, config, context) => {
    if (!context?.existingComments?.length) return null;
    const normalized = (value || '').trim().toLowerCase();
    if (!normalized) return null;
    if (context.existingComments.some(c => (c || '').trim().toLowerCase() === normalized))
      return "This comment appears identical to another student's — please personalise it";
    return null;
  },

  placeholder_text: (value, config) => {
    const patterns = config.patterns || ['[student]', '[name]', 'insert name', 'todo', 'tbc', 'n/a'];
    const lower = (value || '').toLowerCase();
    const found = patterns.find(p => lower.includes(p.toLowerCase()));
    if (found) return `Comment appears to contain placeholder text: "${found}"`;
    return null;
  },
};

/**
 * Run all active rules against a comment value.
 * Returns { hardErrors: string[], softWarnings: string[] }
 */
export function validateComment(value, rules, context = {}) {
  const hardErrors = [];
  const softWarnings = [];

  for (const rule of rules) {
    const validator = VALIDATORS[rule.rule_key];
    if (!validator) continue;
    const msg = validator(value, rule.config || {}, context);
    if (msg) {
      if (rule.severity === 'hard') hardErrors.push(msg);
      else softWarnings.push(msg);
    }
  }

  return { hardErrors, softWarnings };
}

/** Word count helper used by the live counter */
export function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}
