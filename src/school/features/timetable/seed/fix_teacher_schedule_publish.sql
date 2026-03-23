-- ============================================================
-- DIAGNOSTIC & FIX: teacher_schedule publish FK issue
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================
-- This script diagnoses why "teacher_schedule_teacher_id_fkey" fails
-- and cleans up any orphaned timetable entries.
-- ============================================================

-- STEP 1 — Check what the FK actually references
-- (should show: from teacher_schedule.teacher_id → teachers.user_id or auth.users.id)
SELECT
  kcu.column_name          AS from_column,
  ccu.table_schema         AS to_schema,
  ccu.table_name           AS to_table,
  ccu.column_name          AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints        AS tc
JOIN information_schema.key_column_usage         AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage  AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name       = 'teacher_schedule'
  AND kcu.column_name     = 'teacher_id';

-- STEP 2 — Check how many timetable_entries have no linked teacher (FK ghost)
SELECT COUNT(*) AS orphaned_entries
FROM timetable_entries te
LEFT JOIN teachers t ON t.id = te.teacher_id
WHERE t.id IS NULL AND te.teacher_id IS NOT NULL;

-- STEP 3 — List orphaned entries (teacher was deleted after entry was created)
SELECT te.id, te.teacher_id, te.subject, te.class_name, te.day_of_week, te.slot_number, te.status
FROM timetable_entries te
LEFT JOIN teachers t ON t.id = te.teacher_id
WHERE t.id IS NULL AND te.teacher_id IS NOT NULL;

-- STEP 4 — DELETE orphaned timetable_entries (safe to run, removes ghost entries)
-- Uncomment and run if Step 3 shows rows you want to remove:
-- DELETE FROM timetable_entries
-- WHERE teacher_id NOT IN (SELECT id FROM teachers)
--   AND teacher_id IS NOT NULL;

-- STEP 5 — Check which teachers have no user_id (haven't signed in yet)
-- These teachers will be skipped during publish (their schedule won't sync).
-- Fix: invite them via Supabase Dashboard → Authentication → Invite User
SELECT id, full_name, email, user_id
FROM teachers
WHERE school_id = (SELECT id FROM schools LIMIT 1)  -- replace with your school_id if needed
  AND user_id IS NULL
ORDER BY full_name;

-- STEP 6 — Verify teacher_schedule rows are using user_id (auth.users.id)
-- After a successful publish, this should show rows where teacher_id matches
-- the user_id column in teachers (not the id column):
SELECT
  ts.teacher_id            AS schedule_teacher_id,
  t.id                     AS teachers_id,
  t.user_id                AS teachers_user_id,
  t.full_name,
  ts.day_of_week,
  ts.time_slot,
  ts.class_name,
  ts.subject
FROM teacher_schedule ts
LEFT JOIN teachers t ON t.user_id = ts.teacher_id
ORDER BY t.full_name, ts.day_of_week, ts.time_slot
LIMIT 50;
