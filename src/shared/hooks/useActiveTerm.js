import { useState, useEffect } from 'react';
import { supabase } from '../../core/infrastructure/supabaseClient';

const getTodayStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const useActiveTerm = () => {
  const [activeTerm, setActiveTerm] = useState(null);
  const [allTerms, setAllTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        // Get all terms, most recent year first
        const { data: terms, error } = await supabase
          .from('academic_terms')
          .select('*')
          .order('academic_year', { ascending: false })
          .order('term_number', { ascending: true });

        if (error) throw error;
        if (!terms || terms.length === 0) {
          setAllTerms([]);
          setActiveTerm(null);
          setLoading(false);
          return;
        }

        // Find the current academic year (the one with an active term, or the most recent)
        const activeRow = terms.find(t => t.is_active);
        const currentYear = activeRow?.academic_year || terms[0]?.academic_year;
        const yearTerms = terms
          .filter(t => t.academic_year === currentYear)
          .sort((a, b) => a.term_number - b.term_number);

        // Auto-activate: check if the right term is active based on today's date
        const today = getTodayStr();
        let correctTerm = null;

        for (const term of yearTerms) {
          if (today >= term.start_date && today <= term.end_date) {
            correctTerm = term;
            break;
          }
        }

        // If no term covers today, find the next upcoming one
        if (!correctTerm) {
          const upcoming = yearTerms.filter(t => t.start_date > today);
          correctTerm = upcoming[0] || yearTerms[yearTerms.length - 1];
        }

        // Auto-activate if the wrong term is active
        if (correctTerm && (!activeRow || activeRow.id !== correctTerm.id)) {
          console.log(`🔄 Auto-activating Term ${correctTerm.term_number} (${correctTerm.term_name})`);

          // Deactivate all terms for this year
          await supabase
            .from('academic_terms')
            .update({ is_active: false })
            .eq('academic_year', currentYear);

          // Activate the correct term
          await supabase
            .from('academic_terms')
            .update({ is_active: true })
            .eq('id', correctTerm.id);

          correctTerm.is_active = true;

          // Auto-finalize past terms that aren't finalized yet
          for (const term of yearTerms) {
            if (term.end_date < today && !term.is_finalized && term.id !== correctTerm.id) {
              console.log(`🔒 Auto-finalizing Term ${term.term_number} (${term.term_name})`);
              await supabase
                .from('academic_terms')
                .update({ is_finalized: true })
                .eq('id', term.id);
              term.is_finalized = true;
            }
          }
        }

        setAllTerms(yearTerms);
        setActiveTerm(correctTerm);
      } catch (err) {
        console.error('Failed to load active term:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { activeTerm, allTerms, loading };
};

export default useActiveTerm;