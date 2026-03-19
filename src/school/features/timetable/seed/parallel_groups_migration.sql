-- ============================================================
-- MIGRATION: Parallel Groups for teacher_assignments
-- ============================================================
-- Run in Supabase SQL Editor.
--
-- What this adds:
--   parallel_group TEXT column on teacher_assignments.
--   Assignments sharing the same parallel_group name are
--   scheduled in the SAME time slot by the timetable generator.
--
-- Use cases:
--   1. Language electives: French and German must run simultaneously
--      so students can choose one.
--      → Set parallel_group = 'Y7-Languages' on both assignments.
--
--   2. Serbian language levels: Serbian-Beginner, Serbian-Med,
--      Serbian-Native are cross-class groups that run in parallel.
--      → Set parallel_group = 'Y5-Serbian' on all three.
--
-- Cross-class groups (Serbian levels, mixed Y5a+Y5b):
--   Add virtual class names to custom_classes and use them in
--   teacher_assignments. Example:
--     class_name = 'Serbian-Native'  (not a real year group,
--     but a scheduling group — students from Y5a/Y5b who are
--     at native level attend this class during Serbian time)
--
-- ============================================================

-- 1. Add parallel_group column
ALTER TABLE teacher_assignments
  ADD COLUMN IF NOT EXISTS parallel_group TEXT DEFAULT NULL;

-- 2. Index for fast grouping in generator queries
CREATE INDEX IF NOT EXISTS idx_ta_parallel_group
  ON teacher_assignments(school_id, parallel_group)
  WHERE parallel_group IS NOT NULL;

-- ============================================================
-- Example seed for Green School:
-- Replace YOUR_SCHOOL_ID with your actual school UUID.
-- ============================================================

-- EXAMPLE: French + German must run at the same time for Y6, Y7, Y8, Y9
-- UPDATE teacher_assignments
-- SET parallel_group = 'Y6-Languages'
-- WHERE school_id = 'YOUR_SCHOOL_ID'
--   AND class_name IN ('Y6') AND subject IN ('French', 'German');

-- UPDATE teacher_assignments
-- SET parallel_group = 'Y7-Languages'
-- WHERE school_id = 'YOUR_SCHOOL_ID'
--   AND class_name IN ('Y7') AND subject IN ('French', 'German');

-- EXAMPLE: Serbian levels (cross-class groups for Y5a/Y5b)
-- First add virtual classes:
-- INSERT INTO custom_classes (id, school_id, class_name, is_active)
-- VALUES
--   (gen_random_uuid(), 'YOUR_SCHOOL_ID', 'Serbian-Beginner', true),
--   (gen_random_uuid(), 'YOUR_SCHOOL_ID', 'Serbian-Med',      true),
--   (gen_random_uuid(), 'YOUR_SCHOOL_ID', 'Serbian-Native',   true)
-- ON CONFLICT (school_id, class_name) DO UPDATE SET is_active = true;

-- Then add teacher_assignments for each Serbian teacher:
-- INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
-- VALUES
--   ('YOUR_SCHOOL_ID', <beginner_teacher_id>, 'Serbian', 'Serbian-Beginner', 5, 'Y5-Serbian'),
--   ('YOUR_SCHOOL_ID', <med_teacher_id>,      'Serbian', 'Serbian-Med',      5, 'Y5-Serbian'),
--   ('YOUR_SCHOOL_ID', <native_teacher_id>,   'Serbian', 'Serbian-Native',   5, 'Y5-Serbian');
