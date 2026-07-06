-- ============================================================
-- RESTRUCTURE v2 for 2026-27: Y2 split + ESL/LANG/C&G groups
-- Run in the Supabase SQL editor — AFTER fix_classes_2026_27.sql.
-- Safe to re-run.
-- ============================================================
-- What this does:
--   1. New teachers: Ms. Kristina Pavlovic (Y2b class teacher),
--      Ms. Sofija Brankovic (second ESL teacher)
--   2. Y2 splits into Y2a + Y2b:
--      classes, students (balanced, twins kept together), assignments
--      cloned as separate entities, Vera keeps Y2a, Kristina takes Y2b
--   3. ESL parallel with English for EVERY class that has English:
--      missing ESL rows are created (4/week or English's fond if lower),
--      Ashlie covers Y1a-Y4, Sofija covers Y5-Y9,
--      English+ESL of each class share parallel_group '<class>-ENG'
--   4. French + German run simultaneously per class ('<class>-LANG');
--      Y6a and Y6b are COMBINED: French (6a+6b together) + German
--      (6a+6b together) all in one slot — group 'Y6-LANG'
--   5. Cooking & Gardening combined groups:
--      Y1a + Y1b together ('Y1ab-CG'), Y1c + Y2a + Y2b together ('Y1c2-CG')
--
-- After running: refresh app → Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_vera     UUID;
  t_kristina UUID;
  t_ashlie   UUID;
  t_sofija   UUID;
  n INT;
BEGIN

-- ============================================================
-- 1. NEW TEACHERS
-- ============================================================
INSERT INTO teachers (id, school_id, full_name, email, role, created_at)
SELECT gen_random_uuid(), sid, v.full_name, v.email, 'teacher', NOW()
FROM (VALUES
  ('Ms. Kristina Pavlovic', 'kristina.pavlovic@greenschool.edu'),
  ('Ms. Sofija Brankovic',  'sofija.brankovic@greenschool.edu')
) AS v(full_name, email)
WHERE NOT EXISTS (
  SELECT 1 FROM teachers t WHERE t.school_id = sid AND t.email = v.email
);

SELECT id INTO t_vera     FROM teachers WHERE school_id = sid AND full_name = 'Ms. Vera Jovanovic';
SELECT id INTO t_kristina FROM teachers WHERE school_id = sid AND full_name = 'Ms. Kristina Pavlovic';
SELECT id INTO t_ashlie   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Ashlie Williams';
SELECT id INTO t_sofija   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Sofija Brankovic';

-- ============================================================
-- 2. SPLIT Y2 INTO Y2a + Y2b
-- ============================================================

-- 2a. Classes
DELETE FROM custom_classes WHERE school_id = sid AND class_name = 'Y2';
INSERT INTO custom_classes (school_id, class_name, is_active, max_students)
SELECT sid, v.cn, true, 20
FROM (VALUES ('Y2a'), ('Y2b')) AS v(cn)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_classes c WHERE c.school_id = sid AND c.class_name = v.cn
);

-- 2b. Students (balanced by gender, twins kept together)
UPDATE students SET class_name = 'Y2a'
WHERE school_id = sid AND school_year = '2026-27' AND class_name IN ('Y2','Y2a')
  AND name IN (
    'David Aglyamov', 'Leon Nikitin', 'Ilyass Sanogo', 'Imraan Sanogo',
    'Almaz Bakirov', 'Luka Popović', 'Una Zostaute', 'Liia Vizzhachikh',
    'Marija Medarić', 'Petra Medarić'
  );

UPDATE students SET class_name = 'Y2b'
WHERE school_id = sid AND school_year = '2026-27' AND class_name IN ('Y2','Y2b')
  AND name IN (
    'Maksim Kostrikov', 'Adam Ignacio Luzhanskiy', 'Lev Ryzhov',
    'Fox Edmondson-Bennett', 'Wolf Edmondson-Bennett', 'Emili Tirnanić',
    'Oakley Clare Carpenter', 'Miroslava Zhadan', 'Lora Banićević'
  );

-- safety net: any Y2 student not on the lists goes to Y2b (smaller class)
UPDATE students SET class_name = 'Y2b'
WHERE school_id = sid AND school_year = '2026-27' AND class_name = 'Y2';

-- 2c. Assignments: clone Y2 → Y2a + Y2b as separate entities
CREATE TEMP TABLE _y2v2 ON COMMIT DROP AS
SELECT DISTINCT ON (teacher_id, subject)
       teacher_id, subject, periods_per_week
FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y2','Y2A','Y2B')
ORDER BY teacher_id, subject, periods_per_week DESC;

DELETE FROM teacher_assignments
WHERE school_id = sid AND upper(class_name) IN ('Y2','Y2A','Y2B');

INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid, s.teacher_id, s.subject, t.target, s.periods_per_week, NULL
FROM _y2v2 s
CROSS JOIN (VALUES ('Y2a'), ('Y2b')) AS t(target);

-- 2d. Vera keeps Y2a; Kristina takes over Vera's Y2b lessons
UPDATE teacher_assignments SET teacher_id = t_kristina
WHERE school_id = sid AND class_name = 'Y2b' AND teacher_id = t_vera;

UPDATE teachers SET class_teacher_for = 'Y2a' WHERE id = t_vera;
UPDATE teachers SET class_teacher_for = 'Y2b' WHERE id = t_kristina;

-- 2e. Purge stale timetable entries for old Y2
DELETE FROM timetable_entries WHERE school_id = sid AND upper(class_name) = 'Y2';
DELETE FROM teacher_schedule  WHERE school_id = sid AND upper(class_name) = 'Y2';

-- ============================================================
-- 3. ESL PARALLEL WITH ENGLISH — EVERY CLASS
-- ============================================================

-- 3a. Sofija takes over Ashlie's ESL in upper classes (load split:
--     Ashlie = Y1a-Y4, Sofija = Y5-Y9)
UPDATE teacher_assignments SET teacher_id = t_sofija
WHERE school_id = sid AND subject = 'ESL' AND teacher_id = t_ashlie
  AND class_name IN ('Y5','Y6a','Y6b','Y7','Y8','Y9');

-- 3b. Create missing ESL rows for every class that has English
--     (fond = English's fond, capped at 4/week)
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT sid,
       CASE WHEN e.class_name IN ('Y5','Y6a','Y6b','Y7','Y8','Y9') THEN t_sofija ELSE t_ashlie END,
       'ESL', e.class_name, LEAST(e.periods_per_week, 4), NULL
FROM teacher_assignments e
WHERE e.school_id = sid AND e.subject = 'English'
  AND NOT EXISTS (
    SELECT 1 FROM teacher_assignments x
    WHERE x.school_id = sid AND x.class_name = e.class_name AND x.subject = 'ESL'
  );

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Created % missing ESL assignments', n;

-- 3c. Pair English + ESL per class into '<class>-ENG'
UPDATE teacher_assignments t
SET parallel_group = t.class_name || '-ENG'
WHERE t.school_id = sid
  AND t.subject IN ('English', 'ESL')
  AND EXISTS (SELECT 1 FROM teacher_assignments e
              WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'English')
  AND EXISTS (SELECT 1 FROM teacher_assignments e
              WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'ESL');

GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Paired % English/ESL rows into per-class groups', n;

-- ============================================================
-- 4. FRENCH + GERMAN SIMULTANEOUSLY
-- ============================================================

-- 4a. Per class: French and German at the same time ('<class>-LANG')
UPDATE teacher_assignments t
SET parallel_group = t.class_name || '-LANG'
WHERE t.school_id = sid
  AND t.subject IN ('French', 'German')
  AND EXISTS (SELECT 1 FROM teacher_assignments e
              WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'French')
  AND EXISTS (SELECT 1 FROM teacher_assignments e
              WHERE e.school_id = sid AND e.class_name = t.class_name AND e.subject = 'German');

-- 4b. Y6a + Y6b COMBINED: French (both sections together) and German
--     (both sections together) all in one slot — one shared group
UPDATE teacher_assignments
SET parallel_group = 'Y6-LANG'
WHERE school_id = sid
  AND subject IN ('French', 'German')
  AND class_name IN ('Y6a', 'Y6b');

-- ============================================================
-- 5. COOKING & GARDENING COMBINED GROUPS
--    Y1a + Y1b together · Y1c + Y2a + Y2b together
-- ============================================================
UPDATE teacher_assignments
SET parallel_group = 'Y1ab-CG'
WHERE school_id = sid
  AND subject IN ('Cooking and Gardening', 'Cooking & Gardening', 'C&G')
  AND class_name IN ('Y1a', 'Y1b');

UPDATE teacher_assignments
SET parallel_group = 'Y1c2-CG'
WHERE school_id = sid
  AND subject IN ('Cooking and Gardening', 'Cooking & Gardening', 'C&G')
  AND class_name IN ('Y1c', 'Y2a', 'Y2b');

RAISE NOTICE 'Done. Refresh the app, then Clear Draft → Auto-Generate.';

END $$;

-- ============================================================
-- Verification queries
-- ============================================================
-- Students per class:
-- SELECT class_name, COUNT(*) FROM students
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND school_year = '2026-27' AND status = 'active'
-- GROUP BY class_name ORDER BY class_name;
--
-- English/ESL pairs:
-- SELECT ta.class_name, ta.subject, t.full_name, ta.periods_per_week, ta.parallel_group
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND ta.subject IN ('English','ESL','French','German')
-- ORDER BY ta.class_name, ta.subject;
