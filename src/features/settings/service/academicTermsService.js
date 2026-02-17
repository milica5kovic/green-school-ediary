import { supabase } from '../../../core/infrastructure/supabaseClient';

// ─── FETCH ───────────────────────────────────────────────
const fetchAcademicTerms = async (academicYear = null) => {
  let query = supabase
    .from('academic_terms')
    .select('*')
    .order('term_number', { ascending: true });

  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

const fetchActiveTerm = async () => {
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

const fetchAcademicYears = async () => {
  const { data, error } = await supabase
    .from('academic_terms')
    .select('academic_year')
    .order('academic_year', { ascending: false });

  if (error) throw error;
  const years = [...new Set((data || []).map(t => t.academic_year))];
  return years;
};

// ─── CREATE ──────────────────────────────────────────────
const createAcademicTerms = async (terms) => {
  const { data, error } = await supabase
    .from('academic_terms')
    .insert(terms)
    .select();

  if (error) throw error;
  return data;
};

// ─── UPDATE ──────────────────────────────────────────────
const updateAcademicTerm = async (termId, updates) => {
  const { data, error } = await supabase
    .from('academic_terms')
    .update(updates)
    .eq('id', termId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── ACTIVATE TERM ───────────────────────────────────────
const setActiveTerm = async (termId, academicYear) => {
  const { error: deactivateError } = await supabase
    .from('academic_terms')
    .update({ is_active: false })
    .eq('academic_year', academicYear);

  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from('academic_terms')
    .update({ is_active: true })
    .eq('id', termId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── FINALIZE TERM ───────────────────────────────────────
const finalizeTerm = async (termId) => {
  const { data, error } = await supabase
    .from('academic_terms')
    .update({ is_finalized: true })
    .eq('id', termId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── DELETE ──────────────────────────────────────────────
const deleteAcademicYear = async (academicYear) => {
  const { error } = await supabase
    .from('academic_terms')
    .delete()
    .eq('academic_year', academicYear);

  if (error) throw error;
  return true;
};

// ─── AUTO-DETECT CURRENT TERM ────────────────────────────
const detectCurrentTerm = (terms) => {
  if (!terms || terms.length === 0) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (const term of terms) {
    if (todayStr >= term.start_date && todayStr <= term.end_date) {
      return term;
    }
  }

  const upcoming = terms
    .filter(t => t.start_date > todayStr)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  return upcoming[0] || terms[terms.length - 1];
};

// ─── VALIDATION ──────────────────────────────────────────
const validateTermDates = (terms) => {
  const errors = [];

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const label = `Term ${term.term_number} (${term.term_name})`;

    if (!term.start_date || !term.end_date) {
      errors.push(`${label}: Start and end dates are required.`);
      continue;
    }

    if (term.start_date >= term.end_date) {
      errors.push(`${label}: Start date must be before end date.`);
    }

    if (term.half_term_start && term.half_term_end) {
      if (term.half_term_start >= term.half_term_end) {
        errors.push(`${label}: Half-term start must be before half-term end.`);
      }
      if (term.half_term_start < term.start_date || term.half_term_end > term.end_date) {
        errors.push(`${label}: Half-term must fall within the term dates.`);
      }
    }

    for (let j = i + 1; j < terms.length; j++) {
      const other = terms[j];
      if (!other.start_date || !other.end_date) continue;

      if (term.start_date <= other.end_date && term.end_date >= other.start_date) {
        errors.push(`${label} overlaps with Term ${other.term_number} (${other.term_name}).`);
      }
    }
  }

  return errors;
};

export {
  fetchAcademicTerms,
  fetchActiveTerm,
  fetchAcademicYears,
  createAcademicTerms,
  updateAcademicTerm,
  setActiveTerm,
  finalizeTerm,
  deleteAcademicYear,
  detectCurrentTerm,
  validateTermDates
};