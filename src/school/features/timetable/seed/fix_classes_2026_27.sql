-- ============================================================
-- FIX: Clean up class list + clone Y1 assignments to Y1a/Y1b/Y1c
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Problems this fixes:
--   • custom_classes contains junk/duplicates (Y1A, Y1B, Y2A, Y2B,
--     Y5a, Y5b, Y6, ...) shown twice in dropdowns because Postgres
--     treats 'Y1A' and 'Y1a' as different values
--   • teacher_assignments for Y1 sit under an old name (Y1 / Y1A / Y1B)
--     so the generator finds NOTHING for Y1a, Y1b, Y1c
--
-- What it does (safe to re-run):
--   1. custom_classes → exactly these 12: Y1a Y1b Y1c Y2 Y3 Y4 Y5 Y6a Y6b Y7 Y8 Y9
--   2. teacher_assignments:
--        all Y1 variants  → one deduped set, cloned to Y1a + Y1b + Y1c
--        all Y2 variants  → merged into Y2
--        all Y5 variants  → merged into Y5
--        all Y6 variants  → one deduped set, cloned to Y6a + Y6b
--      Sections are SEPARATE entities: each section gets its own
--      periods with each teacher (ICT 1×/week for Y1 = 3 separate
--      periods: Y1a, Y1b, Y1c). Clones therefore get parallel_group
--      = NULL — they are NOT combined into one shared lesson.
--   3. Deletes stale timetable entries for classes that no longer exist
--
-- After running: Timetable Maker → regenerate the draft.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  canonical TEXT[] := ARRAY['Y1a','Y1b','Y1c','Y2','Y3','Y4','Y5','Y6a','Y6b','Y7','Y8','Y9'];
  n INT;
BEGIN

-- ============================================================
-- 1. CUSTOM CLASSES — keep exactly the 12 canonical classes
-- ============================================================
DELETE FROM custom_classes
WHERE school_id = sid AND NOT (class_name = ANY (canonical));

UPDATE custom_classes SET is_active = true
WHERE school_id = sid;

INSERT INTO custom_classes (school_id, class_name, is_active, max_students)
SELECT sid, v.class_name, true, 20
FROM unnest(canonical) AS v(class_name)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_classes c
  WHERE c.school_id = sid AND c.class_name = v.class_name
);

-- ============================================================
-- 2a. Y1 — consolidate every variant, clone to Y1a + Y1b + Y1c
--     (upper() matching catches Y1, Y1A, Y1B, Y1C, y1a, ...)
-- ============================================================
CREATE TEMP TABLE _y1 ON COMMIT DROP AS
SELECT DISTINCT ON (teacher_id, subject)
       teacher_id, subject, periods_per_week, parallel_group
FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y1','Y1A','Y1B','Y1C')
ORDER BY teacher_id, subject, periods_per_week DESC;

SELECT COUNT(*) INTO n FROM _y1;
RAISE NOTICE 'Y1 source assignments found: % (each cloned to Y1a, Y1b, Y1c)', n;

DELETE FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y1','Y1A','Y1B','Y1C');

-- parallel_group = NULL: each section is taught separately, so the
-- teacher gets 3 independent periods (one per section), never a
-- combined Y1a+Y1b+Y1c lesson in a single slot.
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid, s.teacher_id, s.subject, t.target, s.periods_per_week, NULL
FROM _y1 s
CROSS JOIN (VALUES ('Y1a'), ('Y1b'), ('Y1c')) AS t(target);

-- ============================================================
-- 2b. Y2 — merge every variant (Y2, Y2A, Y2B) into a single Y2
-- ============================================================
CREATE TEMP TABLE _y2 ON COMMIT DROP AS
SELECT DISTINCT ON (teacher_id, subject)
       teacher_id, subject, periods_per_week, parallel_group
FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y2','Y2A','Y2B')
ORDER BY teacher_id, subject, periods_per_week DESC;

DELETE FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y2','Y2A','Y2B');

INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid, teacher_id, subject, 'Y2', periods_per_week, parallel_group FROM _y2;

-- ============================================================
-- 2c. Y5 — merge every variant (Y5, Y5A, Y5B) into a single Y5
-- ============================================================
CREATE TEMP TABLE _y5 ON COMMIT DROP AS
SELECT DISTINCT ON (teacher_id, subject)
       teacher_id, subject, periods_per_week, parallel_group
FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y5','Y5A','Y5B')
ORDER BY teacher_id, subject, periods_per_week DESC;

DELETE FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y5','Y5A','Y5B');

INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid, teacher_id, subject, 'Y5', periods_per_week, parallel_group FROM _y5;

-- ============================================================
-- 2d. Y6 — consolidate every variant, clone to Y6a + Y6b
-- ============================================================
CREATE TEMP TABLE _y6 ON COMMIT DROP AS
SELECT DISTINCT ON (teacher_id, subject)
       teacher_id, subject, periods_per_week, parallel_group
FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y6','Y6A','Y6B')
ORDER BY teacher_id, subject, periods_per_week DESC;

DELETE FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y6','Y6A','Y6B');

-- parallel_group = NULL: Y6a and Y6b are separate entities too
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid, s.teacher_id, s.subject, t.target, s.periods_per_week, NULL
FROM _y6 s
CROSS JOIN (VALUES ('Y6a'), ('Y6b')) AS t(target);

-- ============================================================
-- 3. Purge timetable entries for classes outside the canonical set
-- ============================================================
DELETE FROM timetable_entries
WHERE school_id = sid AND NOT (class_name = ANY (canonical));

DELETE FROM teacher_schedule
WHERE school_id = sid AND NOT (class_name = ANY (canonical));

RAISE NOTICE 'Done. Open Timetable Maker → Assignments to verify, then regenerate.';

END $$;

-- ============================================================
-- Verification — assignments per class (should list only the 12 classes)
-- ============================================================
-- SELECT class_name, COUNT(*) AS assignments, SUM(periods_per_week) AS periods
-- FROM teacher_assignments
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY class_name ORDER BY class_name;
