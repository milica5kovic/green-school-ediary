-- ============================================================
-- Y5 ENGLISH/ESL SWAP 2026-27 — align with org document
-- Run AFTER org_nastave_2026_27.sql, in the Supabase SQL editor.
-- Safe to re-run. After running: refresh app -> Clear Draft -> Auto-Generate.
-- ============================================================
-- The org distribution document lists:
--   Jelena -> ESL Y5      (was English Y5 in org_nastave)
--   Tamara -> English Y5  (was ESL Y5 in org_nastave)
-- This is a pure teacher swap on the two Y5 rows. parallel_group stays
-- 'Y5-ENG' on both, so English Y5 (Tamara) and ESL Y5 (Jelena) still
-- co-schedule in the SAME slot — the class just splits English vs ESL.
--
-- Weekly loads AFTER this swap (English fond 6, ESL Y5 fond 4):
--   Jelena 22 = ESL Y5(4) + Eng Y6a(6) + Eng Y8(6) + ESL Y7(6)
--   Tamara 24 = Eng Y6b(6) + Eng Y7(6) + Eng Y9(6) + Eng Y5(6)
--   Julijana 21 · Snezana ESL Y6 — unchanged.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_jelena UUID; t_tamara UUID;
BEGIN

SELECT id INTO t_jelena FROM teachers WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic';
SELECT id INTO t_tamara FROM teachers WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic';

IF t_jelena IS NULL OR t_tamara IS NULL THEN
  RAISE EXCEPTION 'Missing Jelena/Tamara — run org_nastave_2026_27.sql first';
END IF;

-- English Y5 -> Tamara (fond 6), keep parallel_group 'Y5-ENG'
UPDATE teacher_assignments SET teacher_id = t_tamara
  WHERE school_id = sid AND subject = 'English' AND class_name = 'Y5';

-- ESL Y5 -> Jelena (fond 4), keep parallel_group 'Y5-ENG'
UPDATE teacher_assignments SET teacher_id = t_jelena
  WHERE school_id = sid AND subject = 'ESL' AND class_name = 'Y5';

RAISE NOTICE 'Y5 swapped: English->Tamara, ESL->Jelena. Clear Draft -> Auto-Generate.';
END $$;

-- ============================================================
-- Verification — weekly load (expect Julijana 21, Jelena 22, Tamara 24):
-- ============================================================
-- SELECT t.full_name, SUM(ta.periods_per_week) AS weekly
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY t.full_name ORDER BY weekly DESC;
--
-- Y5 pairing (both must share parallel_group 'Y5-ENG'):
-- SELECT class_name, subject, parallel_group, teacher_id FROM teacher_assignments
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920' AND class_name = 'Y5'
--   AND subject IN ('English','ESL');
