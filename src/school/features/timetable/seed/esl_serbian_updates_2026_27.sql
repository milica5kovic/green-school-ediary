-- ============================================================
-- UPDATES: Y6 Serbian combined block · Julijana replaces Sofija ·
--          ESL moves to English teachers (not Snezana/Zoran)
-- Run in the Supabase SQL editor. Safe to re-run.
-- After running: Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_sofija UUID; t_julijana UUID; t_snezana UUID; t_zoran UUID;
  t_jelena UUID; t_tamara UUID;
  rec RECORD; eng_teacher UUID; new_teacher UUID; n INT;
BEGIN

-- ── 1. Y6a + Y6b: Serbian + Serbian (secondary) = ONE combined block ──
UPDATE teacher_assignments SET parallel_group = 'Y6-SRB'
WHERE school_id = sid AND class_name IN ('Y6a', 'Y6b')
  AND subject IN ('Serbian', 'Serbian (secondary)', 'Serbian secondary', 'Serbian sec');
GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'Y6-SRB combined block: % rows', n;

-- ── 2. Ms. Julijana Kapuran (insert only if she does not exist yet) ──
SELECT id INTO t_julijana FROM teachers WHERE school_id = sid AND full_name ILIKE '%Julijana Kapuran%';
IF t_julijana IS NULL THEN
  INSERT INTO teachers (id, school_id, full_name, email, role, created_at)
  VALUES (gen_random_uuid(), sid, 'Ms. Julijana Kapuran', 'julijana.kapuran@greenschool.edu', 'teacher', NOW())
  RETURNING id INTO t_julijana;
END IF;

SELECT id INTO t_sofija  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Sofija Brankovic';
SELECT id INTO t_snezana FROM teachers WHERE school_id = sid AND full_name = 'Ms. Snezana Cvijanovic';
SELECT id INTO t_zoran   FROM teachers WHERE school_id = sid AND full_name = 'Mr. Zoran Zivkovic';
SELECT id INTO t_jelena  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic';
SELECT id INTO t_tamara  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic';

-- ── 3. Everything Sofija had goes to Julijana; Sofija is removed ──
IF t_sofija IS NOT NULL THEN
  -- avoid unique-constraint clashes: drop Sofija rows that Julijana already has
  DELETE FROM teacher_assignments a
  WHERE a.school_id = sid AND a.teacher_id = t_sofija
    AND EXISTS (SELECT 1 FROM teacher_assignments b
                WHERE b.school_id = sid AND b.teacher_id = t_julijana
                  AND b.subject = a.subject AND b.class_name = a.class_name);
  UPDATE teacher_assignments SET teacher_id = t_julijana WHERE school_id = sid AND teacher_id = t_sofija;
  UPDATE timetable_entries   SET teacher_id = t_julijana WHERE school_id = sid AND teacher_id = t_sofija;
  UPDATE teacher_schedule    SET teacher_id = t_julijana WHERE school_id = sid AND teacher_id = t_sofija;
  DELETE FROM teacher_availability WHERE school_id = sid AND teacher_id = t_sofija;
  DELETE FROM teachers WHERE id = t_sofija;
  RAISE NOTICE 'Sofija Brankovic replaced by Julijana Kapuran';
END IF;

-- ── 4. Snezana and Zoran no longer teach ESL: their ESL classes go
--       to an ENGLISH teacher (never the one teaching English in that
--       same class — English and ESL run simultaneously), else Julijana ──
FOR rec IN
  SELECT ta.id, ta.class_name FROM teacher_assignments ta
  WHERE ta.school_id = sid AND ta.subject = 'ESL'
    AND ta.teacher_id IN (t_snezana, t_zoran)
LOOP
  SELECT teacher_id INTO eng_teacher FROM teacher_assignments
  WHERE school_id = sid AND class_name = rec.class_name AND subject = 'English' LIMIT 1;

  new_teacher := CASE
    WHEN t_jelena IS NOT NULL AND eng_teacher IS DISTINCT FROM t_jelena THEN t_jelena
    WHEN t_tamara IS NOT NULL AND eng_teacher IS DISTINCT FROM t_tamara THEN t_tamara
    ELSE t_julijana END;

  IF EXISTS (SELECT 1 FROM teacher_assignments x
             WHERE x.school_id = sid AND x.teacher_id = new_teacher
               AND x.subject = 'ESL' AND x.class_name = rec.class_name) THEN
    DELETE FROM teacher_assignments WHERE id = rec.id; -- target already covers it
  ELSE
    UPDATE teacher_assignments SET teacher_id = new_teacher WHERE id = rec.id;
  END IF;
END LOOP;
RAISE NOTICE 'Done. Clear Draft -> Auto-Generate.';

END $$;

-- Verification:
-- SELECT ta.class_name, ta.subject, t.full_name, ta.parallel_group
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND (ta.subject = 'ESL' OR ta.parallel_group = 'Y6-SRB')
-- ORDER BY ta.class_name, ta.subject;
