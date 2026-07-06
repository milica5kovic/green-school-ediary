-- ============================================================
-- BALANCE: split the ESL load fairly between Ashlie and Sofija
-- Run in the Supabase SQL editor — AFTER restructure_2026_27_v2.sql.
-- Safe to re-run (it recomputes the split from scratch every time).
-- ============================================================
-- IMPORTANT: this does NOT change periods_per_week anywhere.
-- The ESL fond per class stays exactly as it is. The script only
-- decides WHICH of the two teachers covers WHICH class, so the
-- weekly totals come out as even as possible.
--
-- Target: ideally ≤ 25 periods/week each, acceptable ≤ 28.
-- If both end up above that, the NOTICE will tell you — that's the
-- signal to add a third ESL teacher (someone else jumps in).
--
-- Method: classes sorted by ESL fond (largest first), each class
-- goes to whichever teacher currently has the smaller weekly total
-- (their NON-ESL lessons are counted in as the starting load).
-- English+ESL parallel groups are untouched — pairing stays.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_ashlie UUID;
  t_sofija UUID;
  base_a INT; base_s INT;
  load_a INT; load_s INT;
  rec RECORD;
BEGIN

SELECT id INTO t_ashlie FROM teachers WHERE school_id = sid AND full_name = 'Ms. Ashlie Williams';
SELECT id INTO t_sofija FROM teachers WHERE school_id = sid AND full_name = 'Ms. Sofija Brankovic';

IF t_ashlie IS NULL OR t_sofija IS NULL THEN
  RAISE EXCEPTION 'Teacher not found — run restructure_2026_27_v2.sql first (it creates Ms. Sofija Brankovic)';
END IF;

-- Starting load = everything they teach that is NOT ESL
SELECT COALESCE(SUM(periods_per_week), 0) INTO base_a
FROM teacher_assignments WHERE school_id = sid AND teacher_id = t_ashlie AND subject <> 'ESL';
SELECT COALESCE(SUM(periods_per_week), 0) INTO base_s
FROM teacher_assignments WHERE school_id = sid AND teacher_id = t_sofija AND subject <> 'ESL';

load_a := base_a;
load_s := base_s;

-- Greedy split: biggest ESL classes first, each goes to the lighter teacher
FOR rec IN
  SELECT class_name, SUM(periods_per_week) AS fond
  FROM teacher_assignments
  WHERE school_id = sid AND subject = 'ESL' AND teacher_id IN (t_ashlie, t_sofija)
  GROUP BY class_name
  ORDER BY SUM(periods_per_week) DESC, class_name
LOOP
  IF load_a <= load_s THEN
    UPDATE teacher_assignments SET teacher_id = t_ashlie
    WHERE school_id = sid AND subject = 'ESL'
      AND class_name = rec.class_name AND teacher_id IN (t_ashlie, t_sofija);
    load_a := load_a + rec.fond;
  ELSE
    UPDATE teacher_assignments SET teacher_id = t_sofija
    WHERE school_id = sid AND subject = 'ESL'
      AND class_name = rec.class_name AND teacher_id IN (t_ashlie, t_sofija);
    load_s := load_s + rec.fond;
  END IF;
END LOOP;

RAISE NOTICE 'Ashlie:  % periods/week total (% ESL + % other)', load_a, load_a - base_a, base_a;
RAISE NOTICE 'Sofija:  % periods/week total (% ESL + % other)', load_s, load_s - base_s, base_s;

IF load_a > 28 OR load_s > 28 THEN
  RAISE NOTICE '⚠ Someone is above 28 periods/week — time for a third ESL teacher to jump in.';
ELSIF load_a > 25 OR load_s > 25 THEN
  RAISE NOTICE 'ℹ Above the ideal 25 but within the 28 max — OK for now.';
END IF;

END $$;

-- ============================================================
-- Verification — ESL split per class + total weekly load per teacher:
-- ============================================================
-- SELECT t.full_name, ta.class_name, ta.periods_per_week
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920' AND ta.subject = 'ESL'
-- ORDER BY t.full_name, ta.class_name;
--
-- SELECT t.full_name, SUM(ta.periods_per_week) AS weekly_periods
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY t.full_name ORDER BY weekly_periods DESC;
