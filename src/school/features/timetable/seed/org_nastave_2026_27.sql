-- ============================================================
-- ORGANIZACIJA NASTAVE 2026-27 (radna verzija) — full data update
-- Run in the Supabase SQL editor. Safe to re-run (rebuilds ESL/English
-- grouping from scratch every time).
-- After running: refresh app → Clear Draft → Auto-Generate.
-- ============================================================
-- KEY FIX vs. earlier draft: ESL is PARALLEL with English again (same
-- slot, the class splits into English vs ESL groups) — it does NOT
-- consume separate slots. ESL groups are MERGED across classes:
--   Y1 (a+b+c) · Y2 (a+b) · Y3+Y4 · Y6a+Y6b · Y8+Y9 — one ESL lesson
--   each, taught alongside those classes' English.
--
-- Weekly loads (match the org document):
--   Julijana 21 = ESL Y1(6)+Y2(5)+Y34(5)+Y89(5)
--   Jelena   24 = Eng Y5(6)+Y6a(6)+Y8(6) + ESL Y7(6)
--   Tamara   22 = Eng Y6b(6)+Y7(6)+Y9(6) + ESL Y6(4)
--   Snezana       ESL Y5(4) + backup
--
-- Also: pre-period 08:20–08:55 · Jelena Seva replaces Zoran (History) ·
--   Ashlie = Class Teacher Y1b (Teodora removed) · Milos takes Y4 PE ·
--   PD/PSHE (Iva) Y4/Y5/Y6-combined + PSHE Y7-Y9, removed Y1-Y3 ·
--   Cooking & Gardening removed from grid (pre-period / club).
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_julijana UUID; t_jelena UUID; t_tamara UUID; t_snezana UUID;
  t_ashlie UUID; t_teodora UUID; t_milos UUID; t_zoran UUID; t_seva UUID; t_iva UUID;
  n INT;
BEGIN

SELECT id INTO t_julijana FROM teachers WHERE school_id = sid AND full_name ILIKE '%Julijana Kapuran%';
SELECT id INTO t_jelena   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic';
SELECT id INTO t_tamara   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic';
SELECT id INTO t_snezana  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Snezana Cvijanovic';
SELECT id INTO t_ashlie   FROM teachers WHERE school_id = sid AND full_name = 'Ms. Ashlie Williams';
SELECT id INTO t_teodora  FROM teachers WHERE school_id = sid AND full_name = 'Ms. Teodora Vasic';
SELECT id INTO t_milos    FROM teachers WHERE school_id = sid AND full_name = 'Mr. Milos Lazic';
SELECT id INTO t_zoran    FROM teachers WHERE school_id = sid AND full_name = 'Mr. Zoran Zivkovic';
SELECT id INTO t_iva      FROM teachers WHERE school_id = sid AND full_name = 'Ms. Iva Josipovic Aleksic';

IF t_julijana IS NULL OR t_jelena IS NULL OR t_tamara IS NULL THEN
  RAISE EXCEPTION 'Missing teacher — run esl_serbian_updates_2026_27.sql first (Julijana)';
END IF;

-- ── 7. Pre-period 08:20–08:55 ────────────────────────────────
UPDATE time_slots SET end_time = TIME '08:55' WHERE school_id = sid AND slot_number = 0;

-- ── Jelena Seva replaces Zoran Zivkovic (History) ────────────
SELECT id INTO t_seva FROM teachers WHERE school_id = sid AND full_name ILIKE '%Jelena Seva%';
IF t_seva IS NULL THEN
  INSERT INTO teachers (id, school_id, full_name, email, role, created_at)
  VALUES (gen_random_uuid(), sid, 'Ms. Jelena Seva', 'jelena.seva@greenschool.edu', 'teacher', NOW())
  RETURNING id INTO t_seva;
END IF;
IF t_zoran IS NOT NULL THEN
  DELETE FROM teacher_assignments a WHERE a.school_id = sid AND a.teacher_id = t_zoran
    AND EXISTS (SELECT 1 FROM teacher_assignments b WHERE b.school_id = sid
                AND b.teacher_id = t_seva AND b.subject = a.subject AND b.class_name = a.class_name);
  UPDATE teacher_assignments SET teacher_id = t_seva WHERE school_id = sid AND teacher_id = t_zoran;
  UPDATE timetable_entries   SET teacher_id = t_seva WHERE school_id = sid AND teacher_id = t_zoran;
  UPDATE teacher_schedule    SET teacher_id = t_seva WHERE school_id = sid AND teacher_id = t_zoran;
  RAISE NOTICE 'Zoran Zivkovic -> Ms. Jelena Seva';
END IF;

-- ============================================================
-- ENGLISH: fix named teachers + fond 6, clear all ESL/ENG groups
-- ============================================================
DELETE FROM teacher_assignments t WHERE t.school_id = sid AND t.subject = 'English'
  AND t.id NOT IN (SELECT DISTINCT ON (class_name) id FROM teacher_assignments
                   WHERE school_id = sid AND subject = 'English'
                   ORDER BY class_name, periods_per_week DESC, id);
UPDATE teacher_assignments SET parallel_group = NULL WHERE school_id = sid AND subject = 'English';
UPDATE teacher_assignments SET teacher_id = t_jelena, periods_per_week = 6
  WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y5','Y6a','Y8');
UPDATE teacher_assignments SET teacher_id = t_tamara, periods_per_week = 6
  WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y6b','Y7','Y9');

-- ============================================================
-- ESL: rebuilt PARALLEL with English, merged across classes.
-- One ESL row per merge-cluster (hosted in the first section) + the
-- cluster's English rows share a parallel_group so they co-schedule.
-- ============================================================
DELETE FROM teacher_assignments WHERE school_id = sid AND subject = 'ESL';

INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group) VALUES
  (sid, t_julijana, 'ESL', 'Y1a', 6, 'Y1-ENG'),   -- Y1 all together
  (sid, t_julijana, 'ESL', 'Y2a', 5, 'Y2-ENG'),   -- Y2 all together
  (sid, t_julijana, 'ESL', 'Y3',  5, 'Y34-ENG'),  -- Y3 + Y4
  (sid, t_julijana, 'ESL', 'Y8',  5, 'Y89-ENG'),  -- Y8 + Y9
  (sid, t_tamara,   'ESL', 'Y6a', 4, 'Y6-ENG'),   -- Y6a + Y6b (see note)
  (sid, t_jelena,   'ESL', 'Y7',  6, 'Y7-ENG'),
  (sid, t_snezana,  'ESL', 'Y5',  4, 'Y5-ENG');

-- Pair each cluster's English with its ESL (same parallel_group)
UPDATE teacher_assignments SET parallel_group = 'Y1-ENG'  WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y1a','Y1b','Y1c');
UPDATE teacher_assignments SET parallel_group = 'Y2-ENG'  WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y2a','Y2b');
UPDATE teacher_assignments SET parallel_group = 'Y34-ENG' WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y3','Y4');
UPDATE teacher_assignments SET parallel_group = 'Y89-ENG' WHERE school_id = sid AND subject = 'English' AND class_name IN ('Y8','Y9');
UPDATE teacher_assignments SET parallel_group = 'Y5-ENG'  WHERE school_id = sid AND subject = 'English' AND class_name = 'Y5';
UPDATE teacher_assignments SET parallel_group = 'Y7-ENG'  WHERE school_id = sid AND subject = 'English' AND class_name = 'Y7';
-- Y6: Tamara teaches Y6b English AND Y6 ESL, so they can't be the same
-- slot. Pair Y6 ESL (Tamara) with Y6a English (Jelena) only; Y6b
-- English (Tamara) stays independent. Y6b ESL kids join during this slot.
UPDATE teacher_assignments SET parallel_group = 'Y6-ENG'  WHERE school_id = sid AND subject = 'English' AND class_name = 'Y6a';

-- ============================================================
-- PD / PSHE (Iva): Y4, Y5, Y6 (a+b combined) + PSHE Y7-Y9; drop Y1-Y3
-- ============================================================
DELETE FROM teacher_assignments WHERE school_id = sid AND teacher_id = t_iva
  AND subject IN ('PD','PD/PSHE','PSHE') AND class_name IN ('Y1a','Y1b','Y1c','Y2a','Y2b','Y3');
UPDATE teacher_assignments SET parallel_group = 'Y6-PD', periods_per_week = 1
  WHERE school_id = sid AND teacher_id = t_iva AND subject IN ('PD','PD/PSHE','PSHE') AND class_name IN ('Y6a','Y6b');
UPDATE teacher_assignments SET parallel_group = NULL, periods_per_week = 1
  WHERE school_id = sid AND teacher_id = t_iva AND subject IN ('PD','PD/PSHE','PSHE') AND class_name IN ('Y4','Y5');

-- ── 6. Cooking & Gardening leaves the regular grid ───────────
DELETE FROM teacher_assignments WHERE school_id = sid
  AND subject IN ('Cooking & Gardening','Cooking and Gardening','C&G');
GET DIAGNOSTICS n = ROW_COUNT;
RAISE NOTICE 'C&G removed from grid (% rows) — organise as pre-period/club', n;

-- ── Milos takes Y4 PE ────────────────────────────────────────
DELETE FROM teacher_assignments a WHERE a.school_id = sid AND a.subject = 'PE'
  AND a.class_name = 'Y4' AND a.teacher_id <> t_milos
  AND EXISTS (SELECT 1 FROM teacher_assignments b WHERE b.school_id = sid
              AND b.teacher_id = t_milos AND b.subject = 'PE' AND b.class_name = 'Y4');
UPDATE teacher_assignments SET teacher_id = t_milos WHERE school_id = sid AND subject = 'PE' AND class_name = 'Y4';

-- ── Ashlie becomes Class Teacher of Y1b (replaces Teodora) ───
IF t_teodora IS NOT NULL THEN
  DELETE FROM teacher_assignments a WHERE a.school_id = sid AND a.teacher_id = t_teodora
    AND EXISTS (SELECT 1 FROM teacher_assignments b WHERE b.school_id = sid
                AND b.teacher_id = t_ashlie AND b.subject = a.subject AND b.class_name = a.class_name);
  UPDATE teacher_assignments SET teacher_id = t_ashlie WHERE school_id = sid AND teacher_id = t_teodora;
  UPDATE timetable_entries   SET teacher_id = t_ashlie WHERE school_id = sid AND teacher_id = t_teodora;
  UPDATE teacher_schedule    SET teacher_id = t_ashlie WHERE school_id = sid AND teacher_id = t_teodora;
  DELETE FROM teacher_availability WHERE school_id = sid AND teacher_id = t_teodora;
  DELETE FROM teachers WHERE id = t_teodora;
  RAISE NOTICE 'Ashlie Williams is now Class Teacher of Y1b (Teodora removed)';
END IF;
UPDATE teachers SET class_teacher_for = 'Y1b' WHERE id = t_ashlie;

RAISE NOTICE 'Done. Clear Draft -> Auto-Generate.';
END $$;

-- ============================================================
-- Verification — weekly load (expect Julijana 21, Jelena 24, Tamara 22):
-- ============================================================
-- SELECT t.full_name, SUM(ta.periods_per_week) AS weekly
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY t.full_name ORDER BY weekly DESC;
--
-- ESL + English pairing per cluster:
-- SELECT class_name, subject, parallel_group FROM teacher_assignments
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND subject IN ('English','ESL') ORDER BY parallel_group, subject, class_name;
