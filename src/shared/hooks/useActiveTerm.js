import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../core/context/AppContext';

/**
 * useActiveTerm - Multi-tenant aware hook for academic terms
 * 
 * Returns:
 * - activeTerm: Current active term (is_current = true)
 * - allTerms: All terms for current academic year
 * - loading: Loading state
 * - error: Error state
 * - refetch: Function to refetch terms
 * 
 * @example
 * const { activeTerm, allTerms, loading } = useActiveTerm();
 * 
 * if (activeTerm) {
 *   console.log(`Current term: ${activeTerm.term_number}`);
 * }
 */
const useActiveTerm = () => {
  const { supabase } = useApp();
  
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTerms = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current academic year (August to July)
      const now = new Date();
      const currentMonth = now.getMonth(); // 0-11
      const currentYear = now.getFullYear();
      
      // Academic year starts in August (month 7)
      // If we're in Aug-Dec, academic year is currentYear-nextYear
      // If we're in Jan-Jul, academic year is prevYear-currentYear
      let academicYear;
      if (currentMonth >= 7) { // August onwards
        academicYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
      } else {
        academicYear = `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
      }

      // Fetch all terms for this academic year
      // Note: supabase from useApp() is already tenant-filtered via RLS
      const { data: terms, error: termsError } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('academic_year', academicYear)
        .order('term_number');

      if (termsError) throw termsError;

      setAllTerms(terms || []);

      // Find active term (is_current = true)
      const active = terms?.find(t => t.is_current);
      
      if (active) {
        setActiveTerm(active);
      } else {
        // Fallback: find term that contains today's date
        const today = now.toISOString().split('T')[0];
        const currentByDate = terms?.find(t => 
          t.start_date <= today && t.end_date >= today
        );
        
        if (currentByDate) {
          setActiveTerm(currentByDate);
        } else {
          // No current term found
          setActiveTerm(null);
        }
      }

    } catch (err) {
      console.error('Error fetching terms:', err);
      setError(err.message);
      setActiveTerm(null);
      setAllTerms([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  return {
    activeTerm,
    allTerms,
    loading,
    error,
    refetch: fetchTerms,
  };
};

export default useActiveTerm;