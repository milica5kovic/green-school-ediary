-- ============================================================
-- SYNC: English + ESL in the same periods (per class)
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Why: the class SPLITS during language periods — some kids take
-- English, others take ESL, nobody takes both. So English and ESL
-- for the same class must run in the SAME slot, with two teachers.
--
-- How: give English + ESL assignments of each class the same
-- parallel_group (e.g. 'Y6a-ENG'). The generator then schedules
-- them together, and conflict detection knows it's a split class,
-- not a double-booking.
--
-- Notes:
--   • Only classes that have BOTH English and ESL get the group.
--     A class with English only stays as a normal lesson.
--   • If ESL has fewer periods/week than English, the first ESL
--     periods pair up with English; the extra English periods are
--     normal whole-class lessons. That's exactly what you want.
--
-- Safe to re-run. After running: Clear Draft → Auto-Generate
-- (Fill Gaps won't MOVE already-placed entries, so a fresh
-- generate is needed for the pairing to take effect).
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  n INT;
BEGIN

UPDATE teacher_assignments t
SET parallel_group = t.class_name || '-ENG'
WHERE t.school_id = sid
  AND t.subject IN ('English', 'ESL')
  AND EXISTS (
    SELECT 1 FROM teacher_assignments e
    WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'English'
  )
  AND EXISTS (
    SELECT 1 FROM teacher_assignments e
    WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'ESL'
  );

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Paired % English/ESL assignments into per-class groups', n;

-- ============================================================
-- OPTIONAL: the same idea for French + German (language options —
-- kids take F or G, not both). Uncomment to pair them too:
-- ============================================================
-- UPDATE teacher_assignments t
-- SET parallel_group = t.class_name || '-LANG'
-- WHERE t.school_id = sid
--   AND t.subject IN ('French', 'German')
--   AND EXISTS (
--     SELECT 1 FROM teacher_assignments e
--     WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'French'
--   )
--   AND EXISTS (
--     SELECT 1 FROM teacher_assignments e
--     WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'German'
--   );

END $$;

-- ============================================================
-- Verification — English/ESL pairs per class:
-- ============================================================
-- SELECT ta.class_name, ta.subject, t.full_name, ta.periods_per_week, ta.parallel_group
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND ta.subject IN ('English','ESL')
-- ORDER BY ta.class_name, ta.subject;
