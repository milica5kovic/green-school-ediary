-- ============================================================
-- CLASS TEACHERS + CTC (Class Teacher class) 2026-27
-- Run in the Supabase SQL editor. Safe to re-run.
-- After running: refresh app -> Clear Draft -> Auto-Generate.
-- ============================================================
-- Class teachers:
--   Y5  Milica Petrovic · Y6a Jelena Milanovic · Y6b Snezana Cvijanovic
--   Y7  Tamara Stojancic · Y8  Milos Lazic     · Y9  Tijana Krsa
--
-- CTC = a Class Teacher class, 1 period/week with the class teacher.
--   Added as a NEW lesson only for Y7, Y8, Y9 (Tamara/Milos/Tijana).
--   Y5 & Y6 already run their CTC inside the existing weekly PD/PSHE slot
--   (rotates weekly), so no extra period is added for them here.
--
-- Load impact: +1 period each for Tamara (24->25), Milos, Tijana.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_milica_p UUID; t_jelena UUID; t_snezana UUID; t_tamara UUID; t_milos UUID; t_tijana UUID;
BEGIN

SELECT id INTO t_milica_p FROM teachers WHERE school_id = sid AND full_name = 'Ms. Milica Petrovic';
SELECT id INTO t_jelena   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic';
SELECT id INTO t_snezana  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Snezana Cvijanovic';
SELECT id INTO t_tamara   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic';
SELECT id INTO t_milos    FROM teachers WHERE school_id = sid AND full_name = 'Mr. Milos Lazic';
SELECT id INTO t_tijana   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tijana Krsa';

IF t_milica_p IS NULL OR t_tamara IS NULL OR t_milos IS NULL OR t_tijana IS NULL THEN
  RAISE EXCEPTION 'Missing a class teacher — check teacher names';
END IF;

-- ── Class-teacher pointers ───────────────────────────────────
-- Clear any stale pointers at these classes first (e.g. Y8 was Milica
-- Djukic, Y9 was Ashlie, Y5a/Y5b/Y6 from the pre-split seed).
UPDATE teachers SET class_teacher_for = NULL
  WHERE school_id = sid
    AND class_teacher_for IN ('Y5','Y5a','Y5b','Y6','Y6a','Y6b','Y7','Y8','Y9');

UPDATE teachers SET class_teacher_for = 'Y5'  WHERE id = t_milica_p;
UPDATE teachers SET class_teacher_for = 'Y6a' WHERE id = t_jelena;
UPDATE teachers SET class_teacher_for = 'Y6b' WHERE id = t_snezana;
UPDATE teachers SET class_teacher_for = 'Y7'  WHERE id = t_tamara;
UPDATE teachers SET class_teacher_for = 'Y8'  WHERE id = t_milos;
UPDATE teachers SET class_teacher_for = 'Y9'  WHERE id = t_tijana;

-- ── CTC lesson (1/week) for Y7, Y8, Y9 ───────────────────────
-- Y5 & Y6 keep using their existing PD/PSHE weekly slot for CTC.
DELETE FROM teacher_assignments WHERE school_id = sid AND subject = 'CTC';
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group) VALUES
  (sid, t_tamara, 'CTC', 'Y7', 1, NULL),
  (sid, t_milos,  'CTC', 'Y8', 1, NULL),
  (sid, t_tijana, 'CTC', 'Y9', 1, NULL);

RAISE NOTICE 'Class teachers set; CTC added for Y7/Y8/Y9. Clear Draft -> Auto-Generate.';
END $$;

-- ============================================================
-- Verification:
-- SELECT full_name, class_teacher_for FROM teachers
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND class_teacher_for IS NOT NULL ORDER BY class_teacher_for;
--
-- SELECT class_name, subject, periods_per_week FROM teacher_assignments
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920' AND subject = 'CTC';
-- ============================================================
