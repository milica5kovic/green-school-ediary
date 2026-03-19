-- ============================================================
-- SEED: Teachers and Assignments for Green School by Chartwell
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Step 1: Replace YOUR_SCHOOL_ID below with your actual school UUID.
--         Find it: SELECT id, name FROM schools;
-- Step 2: Run the script. It is safe to re-run (ON CONFLICT DO NOTHING).
--
-- Y4 class teacher: Ms. Ana Laura (confirmed by staff list).
-- ============================================================

DO $$
DECLARE
  sid UUID := 'YOUR_SCHOOL_ID';  -- ← Replace this!

  -- Teacher ID variables
  t_mirjana    UUID;
  t_vera       UUID;
  t_dunja      UUID;
  t_tijana_b   UUID;
  t_jelena     UUID;
  t_snezana    UUID;
  t_sava       UUID;
  t_milos      UUID;
  t_tijana_k   UUID;
  t_tamara     UUID;
  t_irena      UUID;
  t_jana       UUID;
  t_zoran_n    UUID;
  t_ashlie     UUID;
  t_zoran_z    UUID;
  t_marija     UUID;
  t_marina     UUID;
  t_milica_d   UUID;
  t_iva        UUID;
  t_petar      UUID;
  t_milica_pet UUID;
  t_milica_p   UUID;

BEGIN

-- ============================================================
-- 1. INSERT TEACHERS
-- ============================================================
INSERT INTO teachers (id, school_id, full_name, email, role, created_at) VALUES
  (gen_random_uuid(), sid, 'Ms. Mirjana Ivanovic',         'mirjana.ivanovic@greenschool.edu',        'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Vera Jovanovic',            'vera.jovanovic@greenschool.edu',           'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Dunja Vidojkovic',          'dunja.vidojkovic@greenschool.edu',         'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Ana Laura',            'ana.laura@greenschool.edu',                'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Jelena Milanovic',          'jelena.milanovic@greenschool.edu',         'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Snezana Cvijanovic',        'snezana.cvijanovic@greenschool.edu',       'teacher', NOW()),
  (gen_random_uuid(), sid, 'Mr. Sava Simic',                'sava.simic@greenschool.edu',               'teacher', NOW()),
  (gen_random_uuid(), sid, 'Mr. Milos Lazic',               'milos.lazic@greenschool.edu',              'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Tijana Krsa',               'tijana.krsa@greenschool.edu',              'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Tamara Stojancic',          'tamara.stojancic@greenschool.edu',         'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Irena Djukic',              'irena.djukic@greenschool.edu',             'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Jana Radovic',              'jana.radovic@greenschool.edu',             'teacher', NOW()),
  (gen_random_uuid(), sid, 'Mr. Zoran Nikolic',             'zoran.nikolic@greenschool.edu',            'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Ashlie Williams',           'ashlie.williams@greenschool.edu',          'teacher', NOW()),
  (gen_random_uuid(), sid, 'Mr. Zoran Zivkovic',            'zoran.zivkovic@greenschool.edu',           'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Marija Mutavdzic',          'marija.mutavdzic@greenschool.edu',         'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Marina Ristic',             'marina.ristic@greenschool.edu',            'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Milica Djukic-Spasojevic',  'milica.djukic@greenschool.edu',            'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Iva Josipovic Aleksic',     'iva.josipovic@greenschool.edu',            'teacher', NOW()),
  (gen_random_uuid(), sid, 'Mr. Petar Jedoksic',            'petar.jedoksic@greenschool.edu',           'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Milica Petkovic',           'milica.petkovic@greenschool.edu',          'teacher', NOW()),
  (gen_random_uuid(), sid, 'Ms. Milica Petrovic',           'milica.petrovic@greenschool.edu',          'teacher', NOW())
ON CONFLICT (email) DO NOTHING;

-- ── Load teacher IDs back ────────────────────────────────────
SELECT id INTO t_mirjana    FROM teachers WHERE school_id=sid AND full_name='Ms. Mirjana Ivanovic';
SELECT id INTO t_vera       FROM teachers WHERE school_id=sid AND full_name='Ms. Vera Jovanovic';
SELECT id INTO t_dunja      FROM teachers WHERE school_id=sid AND full_name='Ms. Dunja Vidojkovic';
SELECT id INTO t_tijana_b   FROM teachers WHERE school_id=sid AND full_name='Ms. Ana Laura';
SELECT id INTO t_jelena     FROM teachers WHERE school_id=sid AND full_name='Ms. Jelena Milanovic';
SELECT id INTO t_snezana    FROM teachers WHERE school_id=sid AND full_name='Ms. Snezana Cvijanovic';
SELECT id INTO t_sava       FROM teachers WHERE school_id=sid AND full_name='Mr. Sava Simic';
SELECT id INTO t_milos      FROM teachers WHERE school_id=sid AND full_name='Mr. Milos Lazic';
SELECT id INTO t_tijana_k   FROM teachers WHERE school_id=sid AND full_name='Ms. Tijana Krsa';
SELECT id INTO t_tamara     FROM teachers WHERE school_id=sid AND full_name='Ms. Tamara Stojancic';
SELECT id INTO t_irena      FROM teachers WHERE school_id=sid AND full_name='Ms. Irena Djukic';
SELECT id INTO t_jana       FROM teachers WHERE school_id=sid AND full_name='Ms. Jana Radovic';
SELECT id INTO t_zoran_n    FROM teachers WHERE school_id=sid AND full_name='Mr. Zoran Nikolic';
SELECT id INTO t_ashlie     FROM teachers WHERE school_id=sid AND full_name='Ms. Ashlie Williams';
SELECT id INTO t_zoran_z    FROM teachers WHERE school_id=sid AND full_name='Mr. Zoran Zivkovic';
SELECT id INTO t_marija     FROM teachers WHERE school_id=sid AND full_name='Ms. Marija Mutavdzic';
SELECT id INTO t_marina     FROM teachers WHERE school_id=sid AND full_name='Ms. Marina Ristic';
SELECT id INTO t_milica_d   FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Djukic-Spasojevic';
SELECT id INTO t_iva        FROM teachers WHERE school_id=sid AND full_name='Ms. Iva Josipovic Aleksic';
SELECT id INTO t_petar      FROM teachers WHERE school_id=sid AND full_name='Mr. Petar Jedoksic';
SELECT id INTO t_milica_pet FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Petkovic';
SELECT id INTO t_milica_p   FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Petrovic';

-- ============================================================
-- 2. INSERT TEACHER ASSIGNMENTS
-- periods_per_week counted from the 2025-26 timetable document.
-- ============================================================
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week) VALUES

-- ── ART: Ms. Irena Djukic — Y1 to Y9, 2 periods each ────────
(sid, t_irena, 'Art', 'Y1', 2), (sid, t_irena, 'Art', 'Y2', 2),
(sid, t_irena, 'Art', 'Y3', 2), (sid, t_irena, 'Art', 'Y4', 2),
(sid, t_irena, 'Art', 'Y5a', 2),(sid, t_irena, 'Art', 'Y5b', 2),
(sid, t_irena, 'Art', 'Y6', 2), (sid, t_irena, 'Art', 'Y7', 2),
(sid, t_irena, 'Art', 'Y8', 2), (sid, t_irena, 'Art', 'Y9', 2),

-- ── ICT: Ms. Milica Petkovic — Y1-Y4 (1 per week), Y5-Y9 (2) ─
(sid, t_milica_pet, 'ICT', 'Y1', 1),  (sid, t_milica_pet, 'ICT', 'Y2', 1),
(sid, t_milica_pet, 'ICT', 'Y3', 1),  (sid, t_milica_pet, 'ICT', 'Y4', 1),
(sid, t_milica_pet, 'ICT', 'Y5a', 2), (sid, t_milica_pet, 'ICT', 'Y5b', 2),
(sid, t_milica_pet, 'ICT', 'Y6', 2),  (sid, t_milica_pet, 'ICT', 'Y7', 2),
(sid, t_milica_pet, 'ICT', 'Y8', 2),  (sid, t_milica_pet, 'ICT', 'Y9', 2),

-- ── Maths: Ms. Milica Petkovic — Y5b only (6 per week) ───────
(sid, t_milica_pet, 'Maths', 'Y5b', 6),

-- ── Maths: Ms. Milica Djukic-Spasojevic — Y5a & Y6-Y9 ───────
(sid, t_milica_d, 'Maths', 'Y5a', 6),
(sid, t_milica_d, 'Maths', 'Y6',  6),
(sid, t_milica_d, 'Maths', 'Y7',  5),
(sid, t_milica_d, 'Maths', 'Y8',  5),
(sid, t_milica_d, 'Maths', 'Y9',  5),

-- ── Maths: Class teachers (Y1–Y4) ────────────────────────────
(sid, t_mirjana,  'Maths', 'Y1', 6),
(sid, t_vera,     'Maths', 'Y2', 6),
(sid, t_dunja,    'Maths', 'Y3', 6),
(sid, t_tijana_b, 'Maths', 'Y4', 6),

-- ── English: Ms. Tamara Stojancic — Y6-Y9 ────────────────────
(sid, t_tamara, 'English', 'Y6', 6),
(sid, t_tamara, 'English', 'Y7', 5),
(sid, t_tamara, 'English', 'Y8', 5),
(sid, t_tamara, 'English', 'Y9', 5),

-- ── English: Ms. Jelena Milanovic — Y5a,Y5b,Y7-Y9 ────────────
(sid, t_jelena, 'English', 'Y5a', 6),
(sid, t_jelena, 'English', 'Y5b', 4),
(sid, t_jelena, 'English', 'Y7',  5),
(sid, t_jelena, 'English', 'Y8',  5),
(sid, t_jelena, 'English', 'Y9',  1),

-- ── English: Class teachers Y1–Y4 ────────────────────────────
(sid, t_mirjana,  'English', 'Y1', 4),
(sid, t_vera,     'English', 'Y2', 4),
(sid, t_dunja,    'English', 'Y3', 4),
(sid, t_tijana_b, 'English', 'Y4', 4),

-- ── ESL: Ms. Ashlie Williams — Y1-Y5 ─────────────────────────
(sid, t_ashlie, 'ESL', 'Y1',  6),
(sid, t_ashlie, 'ESL', 'Y2',  5),
(sid, t_ashlie, 'ESL', 'Y3',  4),
(sid, t_ashlie, 'ESL', 'Y4',  5),
(sid, t_ashlie, 'ESL', 'Y5a', 1),
(sid, t_ashlie, 'ESL', 'Y5b', 1),

-- ── Music & ESL: Ms. Snezana Cvijanovic — Y1-Y9 ──────────────
(sid, t_snezana, 'Music', 'Y1',  1),
(sid, t_snezana, 'Music', 'Y2',  1),
(sid, t_snezana, 'Music', 'Y3',  1),
(sid, t_snezana, 'Music', 'Y4',  3),
(sid, t_snezana, 'Music', 'Y5a', 1),
(sid, t_snezana, 'Music', 'Y5b', 1),
(sid, t_snezana, 'Music', 'Y6',  1),
(sid, t_snezana, 'Music', 'Y7',  2),
(sid, t_snezana, 'Music', 'Y8',  2),
(sid, t_snezana, 'Music', 'Y9',  2),

-- ── History & ESL: Mr. Zoran Zivkovic — Y5-Y9 ───────────────
(sid, t_zoran_z, 'History', 'Y5a', 1),
(sid, t_zoran_z, 'History', 'Y5b', 1),
(sid, t_zoran_z, 'History', 'Y6',  4),
(sid, t_zoran_z, 'History', 'Y7',  2),
(sid, t_zoran_z, 'History', 'Y8',  2),
(sid, t_zoran_z, 'History', 'Y9',  2),

-- ── History/Humanities: Class teachers Y1–Y4 ─────────────────
(sid, t_mirjana,  'Humanities', 'Y1', 2),
(sid, t_vera,     'Humanities', 'Y2', 2),
(sid, t_dunja,    'History',    'Y3', 1),
(sid, t_tijana_b, 'History',    'Y4', 1),

-- ── Science: Ms. Tijana Krsa — Y5-Y9 (3 per week) ───────────
(sid, t_tijana_k, 'Science', 'Y5a', 3),
(sid, t_tijana_k, 'Science', 'Y5b', 3),
(sid, t_tijana_k, 'Science', 'Y6',  3),
(sid, t_tijana_k, 'Science', 'Y7',  3),
(sid, t_tijana_k, 'Science', 'Y8',  3),
(sid, t_tijana_k, 'Science', 'Y9',  3),

-- ── Science: Class teachers Y1–Y4 ────────────────────────────
(sid, t_mirjana,  'Science', 'Y1', 3),
(sid, t_vera,     'Science', 'Y2', 3),
(sid, t_dunja,    'Science', 'Y3', 3),
(sid, t_tijana_b, 'Science', 'Y4', 3),

-- ── Geography: Mr. Sava Simic — Y5-Y9 ───────────────────────
(sid, t_sava, 'Geography', 'Y5a', 1),
(sid, t_sava, 'Geography', 'Y5b', 1),
(sid, t_sava, 'Geography', 'Y6',  1),
(sid, t_sava, 'Geography', 'Y7',  2),
(sid, t_sava, 'Geography', 'Y8',  2),
(sid, t_sava, 'Geography', 'Y9',  2),

-- ── Geography: Class teachers Y1–Y4 ──────────────────────────
(sid, t_vera,     'Geography', 'Y2', 1),
(sid, t_dunja,    'Geography', 'Y3', 1),
(sid, t_tijana_b, 'Geography', 'Y4', 1),

-- ── PE: Mr. Petar Jedoksic — Y1-Y4 (3 per week) ─────────────
(sid, t_petar, 'PE', 'Y1', 3),
(sid, t_petar, 'PE', 'Y2', 3),
(sid, t_petar, 'PE', 'Y3', 3),
(sid, t_petar, 'PE', 'Y4', 3),

-- ── PE: Mr. Milos Lazic — Y5-Y9 (2 per week) ────────────────
(sid, t_milos, 'PE', 'Y5a', 2),
(sid, t_milos, 'PE', 'Y5b', 2),
(sid, t_milos, 'PE', 'Y6',  2),
(sid, t_milos, 'PE', 'Y7',  2),
(sid, t_milos, 'PE', 'Y8',  2),
(sid, t_milos, 'PE', 'Y9',  2),

-- ── French: Ms. Marija Mutavdzic — Y3-Y9 ────────────────────
(sid, t_marija, 'French', 'Y3',  2),
(sid, t_marija, 'French', 'Y4',  2),
(sid, t_marija, 'French', 'Y5a', 1),
(sid, t_marija, 'French', 'Y5b', 1),
(sid, t_marija, 'French', 'Y6',  1),
(sid, t_marija, 'French', 'Y7',  1),
(sid, t_marija, 'French', 'Y8',  1),
(sid, t_marija, 'French', 'Y9',  1),

-- ── Serbian (secondary, Marija Mutavdzic) ────────────────────
(sid, t_marija, 'Serbian (secondary)', 'Y3',  1),
(sid, t_marija, 'Serbian (secondary)', 'Y4',  1),
(sid, t_marija, 'Serbian (secondary)', 'Y5a', 1),
(sid, t_marija, 'Serbian (secondary)', 'Y5b', 1),
(sid, t_marija, 'Serbian (secondary)', 'Y6',  1),
(sid, t_marija, 'Serbian (secondary)', 'Y7',  1),
(sid, t_marija, 'Serbian (secondary)', 'Y8',  1),
(sid, t_marija, 'Serbian (secondary)', 'Y9',  1),

-- ── German: Ms. Marina Ristic — Y5-Y9 ───────────────────────
(sid, t_marina, 'German', 'Y5a', 2),
(sid, t_marina, 'German', 'Y5b', 2),
(sid, t_marina, 'German', 'Y6',  2),
(sid, t_marina, 'German', 'Y7',  2),
(sid, t_marina, 'German', 'Y8',  2),
(sid, t_marina, 'German', 'Y9',  2),

-- ── Serbian (secondary, Marina Ristic) ───────────────────────
(sid, t_marina, 'Serbian (secondary)', 'Y5a', 2),
(sid, t_marina, 'Serbian (secondary)', 'Y5b', 2),
(sid, t_marina, 'Serbian (secondary)', 'Y6',  2),
(sid, t_marina, 'Serbian (secondary)', 'Y7',  2),
(sid, t_marina, 'Serbian (secondary)', 'Y8',  2),
(sid, t_marina, 'Serbian (secondary)', 'Y9',  2),

-- ── Serbian (first language): Ms. Milica Petrovic — Y3-Y9 ───
(sid, t_milica_p, 'Serbian', 'Y3',  2),
(sid, t_milica_p, 'Serbian', 'Y4',  2),
(sid, t_milica_p, 'Serbian', 'Y5a', 2),
(sid, t_milica_p, 'Serbian', 'Y5b', 2),
(sid, t_milica_p, 'Serbian', 'Y6',  2),
(sid, t_milica_p, 'Serbian', 'Y7',  2),
(sid, t_milica_p, 'Serbian', 'Y8',  2),
(sid, t_milica_p, 'Serbian', 'Y9',  2),

-- ── PD/PSHE: Ms. Iva Josipovic Aleksic — Y1-Y9 (1 per week) ─
(sid, t_iva, 'PD/PSHE', 'Y1',  1),
(sid, t_iva, 'PD/PSHE', 'Y2',  1),
(sid, t_iva, 'PD/PSHE', 'Y3',  1),
(sid, t_iva, 'PD/PSHE', 'Y4',  1),
(sid, t_iva, 'PD/PSHE', 'Y5a', 1),
(sid, t_iva, 'PD/PSHE', 'Y5b', 1),
(sid, t_iva, 'PD/PSHE', 'Y6',  1),
(sid, t_iva, 'PD/PSHE', 'Y7',  1),
(sid, t_iva, 'PD/PSHE', 'Y8',  1),
(sid, t_iva, 'PD/PSHE', 'Y9',  1),

-- ── Cooking & Gardening: Mr. Zoran Nikolic — Y1-Y9 ──────────
(sid, t_zoran_n, 'Cooking & Gardening', 'Y1',  2),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y2',  2),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y3',  2),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y4',  2),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y5a', 1),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y5b', 1),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y6',  1),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y7',  1),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y8',  1),
(sid, t_zoran_n, 'Cooking & Gardening', 'Y9',  1),

-- ── Learning Support: Ms. Jana Radovic ───────────────────────
(sid, t_jana, 'Learning Support', 'Y1',  5),
(sid, t_jana, 'Learning Support', 'Y4',  2),
(sid, t_jana, 'Learning Support', 'Y5b', 1),
(sid, t_jana, 'Learning Support', 'Y6',  1),
(sid, t_jana, 'Learning Support', 'Y7',  2),
(sid, t_jana, 'Learning Support', 'Y9',  1)

ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- VERIFY
-- ============================================================
-- SELECT t.full_name, ta.subject, ta.class_name, ta.periods_per_week
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE t.school_id = 'YOUR_SCHOOL_ID'
-- ORDER BY t.full_name, ta.class_name, ta.subject;
