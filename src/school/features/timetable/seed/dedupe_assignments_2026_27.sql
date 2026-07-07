-- ============================================================
-- DEDUPE: remove duplicate teacher_assignments rows + prevent new ones
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Symptom: "daily limit for this subject reached" for C&G / German —
-- the same lesson exists 2-3× in teacher_assignments (leftovers from
-- scripts being run multiple times). The generator stacks two copies
-- on one day, the third hits the daily cap and stays unplaced.
--
-- What this does (safe to re-run):
--   1. For each (teacher, subject, class) keeps ONE row — the one with
--      the highest periods_per_week (nothing is reduced) — and deletes
--      the surplus copies.
--   2. Adds a UNIQUE constraint so duplicates can never sneak back in.
--
-- After running: Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  n INT;
BEGIN

-- 1. Keep one row per (teacher, subject, class) — highest fond wins
DELETE FROM teacher_assignments t
WHERE t.school_id = sid
  AND t.id NOT IN (
    SELECT DISTINCT ON (teacher_id, subject, class_name) id
    FROM teacher_assignments
    WHERE school_id = sid
    ORDER BY teacher_id, subject, class_name, periods_per_week DESC, id
  );

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Deleted % duplicate assignment rows', n;

END $$;

-- 2. Never again: one row per teacher+subject+class per school
ALTER TABLE teacher_assignments
  DROP CONSTRAINT IF EXISTS uq_teacher_assignment;
ALTER TABLE teacher_assignments
  ADD CONSTRAINT uq_teacher_assignment
  UNIQUE (school_id, teacher_id, subject, class_name);

-- ============================================================
-- Verification — must return ZERO rows now:
-- ============================================================
-- SELECT class_name, subject, COUNT(*)
-- FROM teacher_assignments
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY class_name, subject
-- HAVING COUNT(*) > 1;
