-- ============================================================
-- SEED: Students & Classes for school year 2026-27
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- Source: STUDENTS 26-27.xlsx — 119 students.
-- Class structure 2026-27:
--   Y1 split into THREE classes: Y1a, Y1b, Y1c (27 kids, balanced by gender)
--   Y2 (19), Y3 (8), Y4 (11), Y5 (10),
--   Y6a (12), Y6b (9), Y7 (8), Y8 (11), Y9 (4)
--
-- School ID is already filled in (Green School).
-- Just run the script. Safe to re-run (skips classes/students
-- that already exist).
--
-- ⚠️ Do NOT use the "Promote" step in Settings → Archive after this
--    import — the new roster already contains returning students in
--    their new classes; promoting would duplicate them. Archive the
--    old generation instead (optional block at the bottom).
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  base_no INT;
BEGIN

-- ============================================================
-- 1. CUSTOM CLASSES for 2026-27
-- (Timetable Maker and class dropdowns read from custom_classes)
-- No unique constraint on (school_id, class_name), so guard with NOT EXISTS.
-- ============================================================

-- Re-activate if a class already exists but was deactivated
UPDATE custom_classes SET is_active = true
WHERE school_id = sid
  AND class_name IN ('Y1a','Y1b','Y1c','Y2','Y3','Y4','Y5','Y6a','Y6b','Y7','Y8','Y9');

INSERT INTO custom_classes (school_id, class_name, is_active, max_students)
SELECT sid, v.class_name, true, v.max_students
FROM (VALUES
  ('Y1a', 20), ('Y1b', 20), ('Y1c', 20),
  ('Y2', 25), ('Y3', 20), ('Y4', 20), ('Y5', 20),
  ('Y6a', 20), ('Y6b', 20), ('Y7', 20), ('Y8', 20), ('Y9', 20)
) AS v(class_name, max_students)
WHERE NOT EXISTS (
  SELECT 1 FROM custom_classes c
  WHERE c.school_id = sid AND c.class_name = v.class_name
);

-- ============================================================
-- 2. STUDENTS 2026-27
-- student_no continues from the school's current max (matches app logic).
-- Re-run safe: skips names already present for school_year 2026-27.
-- Notes: only medically/practically important info (allergies, diet).
-- ============================================================

SELECT COALESCE(MAX(student_no), 0) INTO base_no FROM students WHERE school_id = sid;

INSERT INTO students (school_id, name, class_name, school_year, status, date_of_birth, notes, student_no)
SELECT sid, v.name, v.class_name, '2026-27', 'active', v.dob, v.notes,
       base_no + ROW_NUMBER() OVER (ORDER BY v.ord)
FROM (VALUES
  -- ── Y1a (9: 5 girls, 4 boys) ─────────────────────────────
  (  1, 'Una Živaljević',                'Y1a', DATE '2020-10-15', NULL),
  (  2, 'Yulia Fedorchenko',             'Y1a', DATE '2020-02-19', 'Allergy: raw walnuts'),
  (  3, 'Nina Didenko',                  'Y1a', DATE '2020-10-06', NULL),
  (  4, 'Reina Wettstein',               'Y1a', DATE '2021-08-29', NULL),
  (  5, 'Mia Jevremovic',                'Y1a', NULL,              NULL),
  (  6, 'Antonio Maria Ereira Coutinho', 'Y1a', DATE '2021-01-23', NULL),
  (  7, 'Matej Petrović',                'Y1a', DATE '2021-09-05', NULL),
  (  8, 'Aleksei Savin',                 'Y1a', DATE '2020-10-31', NULL),
  (  9, 'Mihail Petrovskii',             'Y1a', NULL,              NULL),
  -- ── Y1b (9: 5 girls, 4 boys) ─────────────────────────────
  ( 10, 'Bjanka Ćosić',                  'Y1b', DATE '2020-11-19', NULL),
  ( 11, 'Zlata Zhakova',                 'Y1b', DATE '2020-11-25', NULL),
  ( 12, 'Avie Iris Vasiljević',          'Y1b', DATE '2021-06-10', NULL),
  ( 13, 'Srna Ružičić',                  'Y1b', DATE '2020-10-27', NULL),
  ( 14, 'Soffia Plaksina',               'Y1b', DATE '2020-08-30', NULL),
  ( 15, 'Lazar Aškić',                   'Y1b', DATE '2021-04-04', 'Allergy: peanuts'),
  ( 16, 'Joseph Leopold',                'Y1b', DATE '2020-12-23', NULL),
  ( 17, 'Kazimierz Zakrzewski',          'Y1b', DATE '2020-08-18', NULL),
  ( 18, 'Danilo Antonijevic',            'Y1b', DATE '2021-07-23', NULL),
  -- ── Y1c (9: 5 girls, 4 boys) ─────────────────────────────
  ( 19, 'Una Milicic',                   'Y1c', DATE '2021-07-02', NULL),
  ( 20, 'Nikol Somova',                  'Y1c', DATE '2021-03-07', NULL),
  ( 21, 'Miia Tolstopiatova',            'Y1c', DATE '2021-07-30', NULL),
  ( 22, 'Lora Pantić',                   'Y1c', DATE '2019-10-26', NULL),
  ( 23, 'Mia Stamenic',                  'Y1c', DATE '2021-07-19', NULL),
  ( 24, 'Andrei Pyltsin',                'Y1c', DATE '2021-06-02', NULL),
  ( 25, 'Bogdan Teodosić',               'Y1c', DATE '2021-01-08', NULL),
  ( 26, 'Itan Vuk Jankovic',             'Y1c', DATE '2021-04-09', NULL),
  ( 27, 'Luka Subotic',                  'Y1c', NULL,              NULL),
  -- ── Y2 (19) ──────────────────────────────────────────────
  ( 28, 'David Aglyamov',                'Y2',  DATE '2019-06-09', 'Vegetarian'),
  ( 29, 'Leon Nikitin',                  'Y2',  DATE '2020-01-07', NULL),
  ( 30, 'Una Zostaute',                  'Y2',  DATE '2019-12-09', NULL),
  ( 31, 'Luka Popović',                  'Y2',  DATE '2020-01-07', NULL),
  ( 32, 'Ilyass Sanogo',                 'Y2',  DATE '2020-01-07', NULL),
  ( 33, 'Imraan Sanogo',                 'Y2',  DATE '2020-01-07', NULL),
  ( 34, 'Almaz Bakirov',                 'Y2',  DATE '2019-10-11', NULL),
  ( 35, 'Liia Vizzhachikh',              'Y2',  DATE '2019-09-10', NULL),
  ( 36, 'Emili Tirnanić',                'Y2',  DATE '2020-05-21', NULL),
  ( 37, 'Maksim Kostrikov',              'Y2',  DATE '2019-07-29', NULL),
  ( 38, 'Adam Ignacio Luzhanskiy',       'Y2',  DATE '2019-08-08', NULL),
  ( 39, 'Lev Ryzhov',                    'Y2',  DATE '2019-04-23', NULL),
  ( 40, 'Fox Edmondson-Bennett',         'Y2',  DATE '2019-07-19', NULL),
  ( 41, 'Wolf Edmondson-Bennett',        'Y2',  DATE '2019-07-19', NULL),
  ( 42, 'Oakley Clare Carpenter',        'Y2',  DATE '2019-09-28', NULL),
  ( 43, 'Marija Medarić',                'Y2',  NULL,              NULL),
  ( 44, 'Petra Medarić',                 'Y2',  NULL,              NULL),
  ( 45, 'Miroslava Zhadan',              'Y2',  DATE '2019-05-07', NULL),
  ( 46, 'Lora Banićević',                'Y2',  DATE '2019-05-20', NULL),
  -- ── Y3 (8) ───────────────────────────────────────────────
  ( 47, 'Come Vićentijević',             'Y3',  DATE '2019-07-12', NULL),
  ( 48, 'Samuel Mendes',                 'Y3',  DATE '2019-07-05', NULL),
  ( 49, 'Catalina Moreno Golubović',     'Y3',  DATE '2019-02-12', NULL),
  ( 50, 'Filipp Salii',                  'Y3',  DATE '2018-09-29', 'Ne uzima ručak'),
  ( 51, 'Eva Milekić',                   'Y3',  DATE '2019-05-18', NULL),
  ( 52, 'Viktor Čajković',               'Y3',  DATE '2018-09-17', NULL),
  ( 53, 'Petra Teodosić',                'Y3',  DATE '2019-02-12', NULL),
  ( 54, 'Hugo Wettstein',                'Y3',  DATE '2019-07-24', NULL),
  -- ── Y4 (11) ──────────────────────────────────────────────
  ( 55, 'Leighton Grace Carpenter',      'Y4',  DATE '2017-12-21', NULL),
  ( 56, 'Xu Zheng',                      'Y4',  DATE '2017-08-13', NULL),
  ( 57, 'Vojin Pekez',                   'Y4',  DATE '2018-01-21', NULL),
  ( 58, 'Luka Simović',                  'Y4',  DATE '2018-04-19', 'Jede samo pohovano meso'),
  ( 59, 'Monika Staničić',               'Y4',  DATE '2017-12-20', NULL),
  ( 60, 'Michael Jakovčić',              'Y4',  DATE '2016-11-22', NULL),
  ( 61, 'Platon Ivashchenko',            'Y4',  DATE '2017-04-04', NULL),
  ( 62, 'Luka Matthyser',                'Y4',  DATE '2017-08-04', NULL),
  ( 63, 'Aleksandr Belousov',            'Y4',  DATE '2017-02-14', NULL),
  ( 64, 'Ulduz Unal',                    'Y4',  DATE '2017-09-05', NULL),
  ( 65, 'Gaya Shtabsky',                 'Y4',  DATE '2018-03-18', NULL),
  -- ── Y5 (10) ──────────────────────────────────────────────
  ( 66, 'Roman Vićentijević',            'Y5',  DATE '2017-01-09', NULL),
  ( 67, 'Lana Marković',                 'Y5',  DATE '2016-04-11', NULL),
  ( 68, 'Roy Ismael',                    'Y5',  DATE '2017-07-11', NULL),
  ( 69, 'Arian Natcho',                  'Y5',  DATE '2017-04-25', NULL),
  ( 70, 'Mihailo Jakovljević',           'Y5',  DATE '2017-08-15', NULL),
  ( 71, 'Iasna Govorova',                'Y5',  DATE '2016-07-31', NULL),
  ( 72, 'Zhang Heru',                    'Y5',  DATE '2017-03-22', NULL),
  ( 73, 'Inokentii Voliak',              'Y5',  DATE '2016-11-05', NULL),
  ( 74, 'Iurii Sorokin',                 'Y5',  DATE '2016-10-15', NULL),
  ( 75, 'Nikolai Vorobev',               'Y5',  DATE '2017-05-24', NULL),
  -- ── Y6a (12) ─────────────────────────────────────────────
  ( 76, 'Weston Leo Carpenter',          'Y6a', DATE '2016-07-01', NULL),
  ( 77, 'Alisa Nikonova',                'Y6a', DATE '2016-10-17', 'Allergy: cats, horses, kiwi'),
  ( 78, 'Nikita Behati Torp',            'Y6a', DATE '2015-04-30', NULL),
  ( 79, 'Lev Tiazhkov',                  'Y6a', DATE '2015-04-29', NULL),
  ( 80, 'Izabela Tihomirova Krashimirova','Y6a',DATE '2015-05-02', NULL),
  ( 81, 'Bogdan Krstić',                 'Y6a', DATE '2016-02-24', NULL),
  ( 82, 'Leona Staničić',                'Y6a', DATE '2015-09-16', NULL),
  ( 83, 'Filip Maleš',                   'Y6a', DATE '2015-11-20', NULL),
  ( 84, 'Luka Kozhevnikov',              'Y6a', DATE '2016-01-09', NULL),
  ( 85, 'Mark Kovalev',                  'Y6a', DATE '2015-10-28', NULL),
  ( 86, 'Maksim Belousov',               'Y6a', DATE '2015-04-25', NULL),
  ( 87, 'Ivan Meshcherskii',             'Y6a', DATE '2015-11-15', NULL),
  -- ── Y6b (9) ──────────────────────────────────────────────
  ( 88, 'Bojan Kosić',                   'Y6b', DATE '2017-04-08', NULL),
  ( 89, 'Mina Pekez',                    'Y6b', DATE '2015-07-30', NULL),
  ( 90, 'Nikita Tretiak',                'Y6b', DATE '2016-01-23', NULL),
  ( 91, 'Nikša Pavlović',                'Y6b', DATE '2015-07-30', NULL),
  ( 92, 'Sava Milekić',                  'Y6b', DATE '2016-06-07', NULL),
  ( 93, 'Uroš Jakovljević',              'Y6b', DATE '2016-06-23', NULL),
  ( 94, 'Mikhail Shabrov',               'Y6b', DATE '2014-12-24', NULL),
  ( 95, 'Daniel Shtabsky',               'Y6b', DATE '2016-08-18', NULL),
  ( 96, 'Jovan Radic',                   'Y6b', DATE '2016-03-27', NULL),
  -- ── Y7 (8) ───────────────────────────────────────────────
  ( 97, 'Bora Stanković',                'Y7',  DATE '2014-05-29', NULL),
  ( 98, 'Mila Moreno Golubović',         'Y7',  DATE '2015-05-24', NULL),
  ( 99, 'Una Djukić',                    'Y7',  DATE '2014-09-29', NULL),
  (100, 'Damjan Nikolić',                'Y7',  DATE '2014-11-14', NULL),
  (101, 'Miron Schevchenko',             'Y7',  DATE '2015-05-21', NULL),
  (102, 'Fedor Kulakov',                 'Y7',  DATE '2015-08-19', 'Vegan'),
  (103, 'Arat Unal',                     'Y7',  NULL,              NULL),
  (104, 'Iaroslav Bogomolny',            'Y7',  NULL,              NULL),
  -- ── Y8 (11) ──────────────────────────────────────────────
  (105, 'Katja Kosić',                   'Y8',  DATE '2013-08-25', NULL),
  (106, 'Teodor Ilić',                   'Y8',  DATE '2013-10-11', NULL),
  (107, 'Veronika Tiazhkova',            'Y8',  DATE '2013-07-09', NULL),
  (108, 'Damjan Jevrosimović',           'Y8',  DATE '2014-02-07', 'Specijalan ručak'),
  (109, 'Lana Pekez',                    'Y8',  DATE '2013-11-20', NULL),
  (110, 'Manuela Amir',                  'Y8',  DATE '2014-02-23', NULL),
  (111, 'Lola Morrison-Burlić',          'Y8',  DATE '2014-01-14', NULL),
  (112, 'Milan Šuput',                   'Y8',  DATE '2014-05-26', NULL),
  (113, 'Aynal Natcho',                  'Y8',  DATE '2014-09-09', NULL),
  (114, 'Luka Marušić',                  'Y8',  DATE '2013-02-26', NULL),
  (115, 'Filip Markovic',                'Y8',  NULL,              NULL),
  -- ── Y9 (4) ───────────────────────────────────────────────
  (116, 'Marco Criscuolo',               'Y9',  DATE '2013-11-25', NULL),
  (117, 'Nina Pavlović',                 'Y9',  DATE '2012-04-02', NULL),
  (118, 'Jingwen Deng',                  'Y9',  DATE '2012-05-30', NULL),
  (119, 'Tallullah Edmondson-Bennett',   'Y9',  DATE '2013-09-16', NULL)
) AS v(ord, name, class_name, dob, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM students s
  WHERE s.school_id = sid
    AND s.name = v.name
    AND s.school_year = '2026-27'
);

END $$;

-- ============================================================
-- 3. OPTIONAL — run when you close school year 2025-26
-- ============================================================
-- a) Deactivate classes that don't exist in 2026-27
--    (they disappear from Timetable Maker and class dropdowns):
--
-- UPDATE custom_classes SET is_active = false
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND class_name IN ('Y1', 'Y5a', 'Y5b', 'Y5A', 'Y5B', 'Y6');
--
-- b) Archive the old generation (2025-26 students), so only the
--    new roster stays active. ⚠️ Do this INSTEAD of the "Promote"
--    step in Settings → Archive, otherwise you get duplicates:
--
-- UPDATE students SET status = 'archived'
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND school_year = '2025-26'
--   AND status = 'active';

-- ============================================================
-- Verification queries
-- ============================================================
-- SELECT class_name, COUNT(*) FROM students
--   WHERE school_year = '2026-27' GROUP BY class_name ORDER BY class_name;
-- SELECT class_name, is_active FROM custom_classes ORDER BY class_name;
