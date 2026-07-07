-- ============================================================
-- ALIGN: French and German fonds inside every -LANG group
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Rule: German can never run without French (and vice versa) — they
-- share one slot as a split-class block. That only works when both
-- subjects have the SAME periods_per_week inside a group; any surplus
-- of one subject would have to run alone (this is where the solo
-- German lessons and the "daily limit" errors came from).
--
-- This script raises the smaller fond up to the group's maximum —
-- nothing is ever reduced. Covers Y3-LANG ... Y9-LANG and the
-- combined Y6-LANG (French+German × Y6a+Y6b).
--
-- Safe to re-run. After running: Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  n INT;
BEGIN

UPDATE teacher_assignments t
SET periods_per_week = g.max_p
FROM (
  SELECT parallel_group, MAX(periods_per_week) AS max_p
  FROM teacher_assignments
  WHERE school_id = sid AND parallel_group LIKE '%-LANG'
  GROUP BY parallel_group
) g
WHERE t.school_id = sid
  AND t.parallel_group = g.parallel_group
  AND t.periods_per_week < g.max_p;

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Raised % assignments to their group maximum (nothing reduced)', n;

END $$;

-- ============================================================
-- Verification — fonds must now match inside each group:
-- ============================================================
-- SELECT ta.parallel_group, ta.class_name, ta.subject, t.full_name, ta.periods_per_week
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND ta.parallel_group LIKE '%-LANG'
-- ORDER BY ta.parallel_group, ta.subject, ta.class_name;
