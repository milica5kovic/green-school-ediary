-- ============================================================
-- SEED: Profiles, Custom Classes, and Students
-- Run AFTER seed_teachers.sql
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Step 1: Replace YOUR_SCHOOL_ID below with your actual school UUID.
--         Find it: SELECT id, name FROM schools;
-- Step 2: Run the script. It is safe to re-run (ON CONFLICT DO NOTHING).
--
-- What this script does:
--   1. Inserts profile stubs for all 22 teachers (role='teacher')
--      → Teachers will link automatically when they sign in via email
--      → IMPORTANT: profiles.id must match auth.users.id
--        Since we can't create auth users from SQL, this inserts profiles
--        with a temporary UUID. When a teacher signs up, the trigger will
--        create a new profile — you may need to merge/update at that point.
--        Alternatively, use Supabase Dashboard → Authentication → Users
--        to invite each teacher, then re-run this script to ensure profiles exist.
--   2. Ensures custom_classes has all 10 year groups (Y1–Y9 + Y5a/Y5b)
--   3. Inserts students for Y6, Y7, Y9 (Y8 not yet provided)
-- ============================================================

DO $$
DECLARE
  sid UUID := 'YOUR_SCHOOL_ID';  -- ← Replace this!

  -- Teacher profile IDs (loaded from teachers table after seed_teachers.sql)
  tp_mirjana    UUID;
  tp_vera       UUID;
  tp_dunja      UUID;
  tp_ana_laura  UUID;
  tp_jelena     UUID;
  tp_snezana    UUID;
  tp_sava       UUID;
  tp_milos      UUID;
  tp_tijana_k   UUID;
  tp_tamara     UUID;
  tp_irena      UUID;
  tp_jana       UUID;
  tp_zoran_n    UUID;
  tp_ashlie     UUID;
  tp_zoran_z    UUID;
  tp_marija     UUID;
  tp_marina     UUID;
  tp_milica_d   UUID;
  tp_iva        UUID;
  tp_petar      UUID;
  tp_milica_pet UUID;
  tp_milica_p   UUID;

BEGIN

-- ============================================================
-- 1. PROFILE STUBS FOR TEACHERS
-- ============================================================
-- Note: profiles.id should ideally match auth.users.id (set by Supabase trigger on signup).
-- These stubs use gen_random_uuid() so teachers can appear in the system.
-- When a teacher signs in for the first time, Supabase's handle_new_user trigger
-- creates a real profile. At that point, the stub here can be deleted.
-- To properly invite teachers: Supabase Dashboard → Authentication → Invite User.
-- ============================================================

-- Load teacher IDs from teachers table
SELECT id INTO tp_mirjana    FROM teachers WHERE school_id=sid AND full_name='Ms. Mirjana Ivanovic';
SELECT id INTO tp_vera       FROM teachers WHERE school_id=sid AND full_name='Ms. Vera Jovanovic';
SELECT id INTO tp_dunja      FROM teachers WHERE school_id=sid AND full_name='Ms. Dunja Vidojkovic';
SELECT id INTO tp_ana_laura  FROM teachers WHERE school_id=sid AND full_name='Ms. Ana Laura';
SELECT id INTO tp_jelena     FROM teachers WHERE school_id=sid AND full_name='Ms. Jelena Milanovic';
SELECT id INTO tp_snezana    FROM teachers WHERE school_id=sid AND full_name='Ms. Snezana Cvijanovic';
SELECT id INTO tp_sava       FROM teachers WHERE school_id=sid AND full_name='Mr. Sava Simic';
SELECT id INTO tp_milos      FROM teachers WHERE school_id=sid AND full_name='Mr. Milos Lazic';
SELECT id INTO tp_tijana_k   FROM teachers WHERE school_id=sid AND full_name='Ms. Tijana Krsa';
SELECT id INTO tp_tamara     FROM teachers WHERE school_id=sid AND full_name='Ms. Tamara Stojancic';
SELECT id INTO tp_irena      FROM teachers WHERE school_id=sid AND full_name='Ms. Irena Djukic';
SELECT id INTO tp_jana       FROM teachers WHERE school_id=sid AND full_name='Ms. Jana Radovic';
SELECT id INTO tp_zoran_n    FROM teachers WHERE school_id=sid AND full_name='Mr. Zoran Nikolic';
SELECT id INTO tp_ashlie     FROM teachers WHERE school_id=sid AND full_name='Ms. Ashlie Williams';
SELECT id INTO tp_zoran_z    FROM teachers WHERE school_id=sid AND full_name='Mr. Zoran Zivkovic';
SELECT id INTO tp_marija     FROM teachers WHERE school_id=sid AND full_name='Ms. Marija Mutavdzic';
SELECT id INTO tp_marina     FROM teachers WHERE school_id=sid AND full_name='Ms. Marina Ristic';
SELECT id INTO tp_milica_d   FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Djukic-Spasojevic';
SELECT id INTO tp_iva        FROM teachers WHERE school_id=sid AND full_name='Ms. Iva Josipovic Aleksic';
SELECT id INTO tp_petar      FROM teachers WHERE school_id=sid AND full_name='Mr. Petar Jedoksic';
SELECT id INTO tp_milica_pet FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Petkovic';
SELECT id INTO tp_milica_p   FROM teachers WHERE school_id=sid AND full_name='Ms. Milica Petrovic';

-- Insert profile stubs (id = teacher's own id as a stand-in)
-- ON CONFLICT on id means: if a real auth profile already exists with the same id, skip.
INSERT INTO profiles (id, role, full_name, school_id) VALUES
  (tp_mirjana,    'teacher', 'Ms. Mirjana Ivanovic',        sid),
  (tp_vera,       'teacher', 'Ms. Vera Jovanovic',           sid),
  (tp_dunja,      'teacher', 'Ms. Dunja Vidojkovic',         sid),
  (tp_ana_laura,  'teacher', 'Ms. Ana Laura',                sid),
  (tp_jelena,     'teacher', 'Ms. Jelena Milanovic',         sid),
  (tp_snezana,    'teacher', 'Ms. Snezana Cvijanovic',       sid),
  (tp_sava,       'teacher', 'Mr. Sava Simic',               sid),
  (tp_milos,      'teacher', 'Mr. Milos Lazic',              sid),
  (tp_tijana_k,   'teacher', 'Ms. Tijana Krsa',              sid),
  (tp_tamara,     'teacher', 'Ms. Tamara Stojancic',         sid),
  (tp_irena,      'teacher', 'Ms. Irena Djukic',             sid),
  (tp_jana,       'teacher', 'Ms. Jana Radovic',             sid),
  (tp_zoran_n,    'teacher', 'Mr. Zoran Nikolic',            sid),
  (tp_ashlie,     'teacher', 'Ms. Ashlie Williams',          sid),
  (tp_zoran_z,    'teacher', 'Mr. Zoran Zivkovic',           sid),
  (tp_marija,     'teacher', 'Ms. Marija Mutavdzic',         sid),
  (tp_marina,     'teacher', 'Ms. Marina Ristic',            sid),
  (tp_milica_d,   'teacher', 'Ms. Milica Djukic-Spasojevic', sid),
  (tp_iva,        'teacher', 'Ms. Iva Josipovic Aleksic',    sid),
  (tp_petar,      'teacher', 'Mr. Petar Jedoksic',           sid),
  (tp_milica_pet, 'teacher', 'Ms. Milica Petkovic',          sid),
  (tp_milica_p,   'teacher', 'Ms. Milica Petrovic',          sid)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      school_id = EXCLUDED.school_id,
      role      = EXCLUDED.role;

-- ============================================================
-- 2. CUSTOM CLASSES — ensure all 10 year groups exist
-- ============================================================
-- Fix any legacy 'ICT Y1'-style names: update them to plain 'Y1', etc.

UPDATE custom_classes
SET class_name = REGEXP_REPLACE(class_name, '^ICT\s+', '', 'i')
WHERE school_id = sid
  AND class_name ~* '^ICT\s+Y';

-- Insert missing classes (safe to re-run)
INSERT INTO custom_classes (id, school_id, class_name, is_active) VALUES
  (gen_random_uuid(), sid, 'Y1',  true),
  (gen_random_uuid(), sid, 'Y2',  true),
  (gen_random_uuid(), sid, 'Y3',  true),
  (gen_random_uuid(), sid, 'Y4',  true),
  (gen_random_uuid(), sid, 'Y5a', true),
  (gen_random_uuid(), sid, 'Y5b', true),
  (gen_random_uuid(), sid, 'Y6',  true),
  (gen_random_uuid(), sid, 'Y7',  true),
  (gen_random_uuid(), sid, 'Y8',  true),
  (gen_random_uuid(), sid, 'Y9',  true)
ON CONFLICT (school_id, class_name) DO UPDATE
  SET is_active = true;

-- ============================================================
-- 3. STUDENTS
-- ============================================================
-- student_no is auto-assigned as a sequential number per class.
-- school_year is the academic year string.
-- status defaults to 'active'.
-- Y8 students not yet provided — placeholder class entry exists above.
-- ============================================================

-- ── Year 6 (8 students) ──────────────────────────────────────
INSERT INTO students (id, school_id, name, class_name, school_year, status) VALUES
  (gen_random_uuid(), sid, 'Fjodor Kulakov',         'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Una Ivanovic',            'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Miron Schevchenko',       'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Damjan Nikolic',          'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Una Djukic',              'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Yauheni Dulina',          'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Mila Moreno Golubovic',   'Y6', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Bora Stankovic',          'Y6', '2025-26', 'active')
ON CONFLICT DO NOTHING;

-- ── Year 7 (10 students) ─────────────────────────────────────
INSERT INTO students (id, school_id, name, class_name, school_year, status) VALUES
  (gen_random_uuid(), sid, 'Aynal Natcho',            'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Milan Suput',              'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Filip Markovic',           'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Lola Morrison-Burlic',     'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Manuela Amir',             'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Lana Pekez',               'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Damjan Jevrosimovic',      'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Veronika Tiazhkov',        'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Teodor Ilic',              'Y7', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Katja Kosic',              'Y7', '2025-26', 'active')
ON CONFLICT DO NOTHING;

-- ── Year 9 (9 students) ──────────────────────────────────────
INSERT INTO students (id, school_id, name, class_name, school_year, status) VALUES
  (gen_random_uuid(), sid, 'Novak Obradovic',          'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Luka Valeix',              'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Nicholas Novakovic',       'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Akram Natcho',             'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Esad Usak',                'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Elena Suput',              'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Lisa Mendes',              'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Teodora Urosevic',         'Y9', '2025-26', 'active'),
  (gen_random_uuid(), sid, 'Kaiji Zheng',              'Y9', '2025-26', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. CLASS TEACHER ASSIGNMENTS
-- ============================================================
-- Set class_teacher_for for each primary class teacher.

UPDATE teachers SET class_teacher_for = 'Y1'  WHERE school_id = sid AND full_name = 'Ms. Mirjana Ivanovic';
UPDATE teachers SET class_teacher_for = 'Y2'  WHERE school_id = sid AND full_name = 'Ms. Vera Jovanovic';
UPDATE teachers SET class_teacher_for = 'Y3'  WHERE school_id = sid AND full_name = 'Ms. Dunja Vidojkovic';
UPDATE teachers SET class_teacher_for = 'Y4'  WHERE school_id = sid AND full_name = 'Ms. Ana Laura';
UPDATE teachers SET class_teacher_for = 'Y5a' WHERE school_id = sid AND full_name = 'Ms. Jelena Milanovic';
UPDATE teachers SET class_teacher_for = 'Y5b' WHERE school_id = sid AND full_name = 'Ms. Snezana Cvijanovic';
UPDATE teachers SET class_teacher_for = 'Y6'  WHERE school_id = sid AND full_name = 'Mr. Sava Simic';
UPDATE teachers SET class_teacher_for = 'Y7'  WHERE school_id = sid AND full_name = 'Ms. Tamara Stojancic';
UPDATE teachers SET class_teacher_for = 'Y8'  WHERE school_id = sid AND full_name = 'Ms. Milica Djukic-Spasojevic';
UPDATE teachers SET class_teacher_for = 'Y9'  WHERE school_id = sid AND full_name = 'Ms. Ashlie Williams';

-- ============================================================
-- Verification queries (uncomment to check results)
-- ============================================================
-- SELECT full_name, role, school_id FROM profiles WHERE school_id = sid ORDER BY full_name;
-- SELECT class_name, is_active FROM custom_classes WHERE school_id = sid ORDER BY class_name;
-- SELECT name, class_name FROM students WHERE school_id = sid ORDER BY class_name, name;

END $$;
