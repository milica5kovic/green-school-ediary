-- ============================================================
-- SYNC: Serbian + Serbian (secondary) in the same periods (per class)
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- The class SPLITS during Serbian: native speakers take Serbian,
-- the rest take Serbian (secondary) — at the SAME time, two teachers.
-- Until now each consumed its own slot, inflating class demand
-- (this is why Y6a reported "class timetable is completely full").
--
-- Same mechanism as English/ESL: shared parallel_group '<class>-SRB'.
-- Only classes that have BOTH subjects get paired.
--
-- Safe to re-run. After running: Clear Draft → Auto-Generate
-- (a fresh generate is needed for the pairing to take effect).
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  n INT;
BEGIN

UPDATE teacher_assignments t
SET parallel_group = t.class_name || '-SRB'
WHERE t.school_id = sid
  AND t.subject IN ('Serbian', 'Serbian (secondary)', 'Serbian secondary', 'Serbian sec')
  AND EXISTS (
    SELECT 1 FROM teacher_assignments e
    WHERE e.school_id = sid AND e.class_name = t.class_name
      AND e.subject = 'Serbian'
  )
  AND EXISTS (
    SELECT 1 FROM teacher_assignments e
    WHERE e.school_id = sid AND e.class_name = t.class_name
      AND e.subject IN ('Serbian (secondary)', 'Serbian secondary', 'Serbian sec')
  );

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Paired % Serbian / Serbian (secondary) rows into per-class groups', n;

IF n = 0 THEN
  RAISE NOTICE '⚠ Nothing paired — check the subject names: SELECT DISTINCT subject FROM teacher_assignments WHERE subject ILIKE ''%%serbian%%'';';
END IF;

END $$;

-- ============================================================
-- Verification — Serbian pairs per class:
-- ============================================================
-- SELECT ta.class_name, ta.subject, t.full_name, ta.periods_per_week, ta.parallel_group
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND ta.subject ILIKE '%serbian%'
-- ORDER BY ta.class_name, ta.subject;
--
-- Per-class weekly demand (slots actually needed, counting each
-- parallel group once) — every class should be ≤ 30:
-- SELECT class_name,
--        SUM(periods_per_week) AS raw_periods,
--        SUM(CASE WHEN rn = 1 THEN periods_per_week ELSE 0 END) AS slots_needed
-- FROM (
--   SELECT class_name, periods_per_week, parallel_group,
--          ROW_NUMBER() OVER (
--            PARTITION BY class_name, COALESCE(parallel_group, id::text)
--            ORDER BY periods_per_week DESC
--          ) AS rn
--   FROM teacher_assignments
--   WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- ) x
-- GROUP BY class_name ORDER BY class_name;
