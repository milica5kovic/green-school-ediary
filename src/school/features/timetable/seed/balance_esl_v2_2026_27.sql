-- ============================================================
-- BALANCE ESL v2: Ashlie + Jelena + Tamara + Julijana, evenly
-- Run in the Supabase SQL editor. Safe to re-run (recomputes fresh).
-- ============================================================
-- Rules:
--   • ESL pool = Ashlie Williams, Jelena Milanovic, Tamara Stojancic,
--     Julijana Kapuran
--   • a teacher NEVER gets ESL in a class where she teaches English
--     (they run at the same time)
--   • loads balanced counting the FULL weekly load (English + all
--     other subjects + assigned ESL): hard max 30, ideal ≤ 26
--   • one ESL row per class (extra level-group copies are merged,
--     keeping the highest fond)
-- ESL fond per class is NOT changed. After: Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  pool UUID[]; names TEXT[]; loads NUMERIC[];
  rec RECORD; eng UUID; best INT; i INT; v NUMERIC;
BEGIN

SELECT ARRAY[
  (SELECT id FROM teachers WHERE school_id = sid AND full_name = 'Ms. Ashlie Williams'),
  (SELECT id FROM teachers WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic'),
  (SELECT id FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic'),
  (SELECT id FROM teachers WHERE school_id = sid AND full_name ILIKE '%Julijana Kapuran%')
] INTO pool;
names := ARRAY['Ashlie', 'Jelena', 'Tamara', 'Julijana'];

IF pool[1] IS NULL OR pool[2] IS NULL OR pool[3] IS NULL OR pool[4] IS NULL THEN
  RAISE EXCEPTION 'A pool teacher is missing — run esl_serbian_updates_2026_27.sql first';
END IF;

-- One ESL row per class: keep the highest-fond row, drop extra copies
DELETE FROM teacher_assignments t
WHERE t.school_id = sid AND t.subject = 'ESL'
  AND t.id NOT IN (
    SELECT DISTINCT ON (class_name) id FROM teacher_assignments
    WHERE school_id = sid AND subject = 'ESL'
    ORDER BY class_name, periods_per_week DESC, id
  );

-- Starting load = everything each pool teacher teaches that is NOT ESL
loads := ARRAY[0, 0, 0, 0];
FOR i IN 1..4 LOOP
  SELECT COALESCE(SUM(periods_per_week), 0) INTO v
  FROM teacher_assignments WHERE school_id = sid AND teacher_id = pool[i] AND subject <> 'ESL';
  loads[i] := v;
END LOOP;

-- Greedy: biggest ESL classes first → eligible teacher with lowest total
FOR rec IN
  SELECT class_name, SUM(periods_per_week) AS fond
  FROM teacher_assignments
  WHERE school_id = sid AND subject = 'ESL'
  GROUP BY class_name
  ORDER BY SUM(periods_per_week) DESC, class_name
LOOP
  SELECT teacher_id INTO eng FROM teacher_assignments
  WHERE school_id = sid AND class_name = rec.class_name AND subject = 'English' LIMIT 1;

  best := NULL;
  FOR i IN 1..4 LOOP
    IF pool[i] = eng THEN CONTINUE; END IF; -- never own English class
    IF best IS NULL OR loads[i] < loads[best] THEN best := i; END IF;
  END LOOP;

  UPDATE teacher_assignments SET teacher_id = pool[best]
  WHERE school_id = sid AND subject = 'ESL' AND class_name = rec.class_name;
  loads[best] := loads[best] + rec.fond;
END LOOP;

FOR i IN 1..4 LOOP
  RAISE NOTICE '%: % periods/week total', names[i], loads[i];
  IF loads[i] > 30 THEN
    RAISE NOTICE '⚠ % is over the hard max 30 — reduce her non-ESL fond or add another ESL teacher', names[i];
  ELSIF loads[i] > 26 THEN
    RAISE NOTICE 'ℹ % is above the ideal 26 but within 30', names[i];
  END IF;
END LOOP;

END $$;

-- Verification:
-- SELECT t.full_name, SUM(ta.periods_per_week) AS weekly
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY t.full_name ORDER BY weekly DESC;
