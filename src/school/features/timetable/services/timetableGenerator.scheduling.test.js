/**
 * timetableGenerator.scheduling.test.js
 *
 * Tests for two core guarantees:
 *
 * 1. REGULAR HOURS (09:00–15:00)
 *    All subjects must land in slots 1–6 (regular school day).
 *    Slot 7 (after-school) is used ONLY when every regular slot on every day
 *    is physically impossible for a given task (teacher blocked / class full).
 *
 * 2. MATHS DOUBLE PERIODS
 *    Maths (and other DOUBLE_PREFERRED_SUBJECTS) must achieve ≥80% of their
 *    periods in consecutive double classes, across realistic load scenarios.
 */

import { generateTimetable } from './timetableGenerator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** 6 regular school-hour slots (08:00–13:10) */
const REGULAR_SLOTS = [
  { slot_number: 1 },
  { slot_number: 2 },
  { slot_number: 3 },
  { slot_number: 4 },
  { slot_number: 5 },
  { slot_number: 6 },
];

/** Regular slots + after-school slot 7 (15:05–15:45) */
const ALL_SLOTS = [...REGULAR_SLOTS, { slot_number: 7 }];

function makeAssignment(overrides = {}) {
  return {
    id: overrides.id ?? 'a1',
    teacher_id: overrides.teacher_id ?? 't1',
    subject: overrides.subject ?? 'History',
    class_name: overrides.class_name ?? 'Y5',
    periods_per_week: overrides.periods_per_week ?? 1,
    parallel_group: overrides.parallel_group ?? null,
  };
}

/**
 * Block a teacher from ALL regular slots on ALL days,
 * leaving only slot 7 available.
 */
function blockAllRegular(teacherId) {
  const blocks = [];
  for (let day = 0; day < 5; day++) {
    for (let slot = 1; slot <= 6; slot++) {
      blocks.push({ teacher_id: teacherId, day_of_week: day, slot_number: slot, is_available: false });
    }
  }
  return blocks;
}

/**
 * Returns the fraction of periods (by count, not entries) that landed
 * in consecutive double classes after merging.
 *
 * placed entries after mergeDoubleClasses:
 *   is_double=true  → counts as 2 periods
 *   is_double=false → counts as 1 period
 */
function doubleRate(placed) {
  const doubled = placed.filter(e => e.is_double).length * 2;
  const singled = placed.filter(e => !e.is_double).length;
  const total = doubled + singled;
  return total === 0 ? 0 : doubled / total;
}

// ── Suite 1: Regular school hours (09:00–15:00) ───────────────────────────────

describe('regular school hours fill (slots 1–6 before slot 7)', () => {
  test('never uses after-school slot 7 when regular slots are available', () => {
    // 10 subjects, 10 different teachers — plenty of room in regular slots
    const assignments = Array.from({ length: 10 }, (_, i) =>
      makeAssignment({ id: `a${i}`, teacher_id: `t${i}`, subject: `Subj${i}` })
    );

    const { placed, unplaced } = generateTimetable(assignments, ALL_SLOTS, []);

    expect(unplaced).toHaveLength(0);
    expect(placed.every(e => e.slot_number !== 7)).toBe(true);
  });

  test('uses after-school slot 7 only when ALL regular slots are blocked', () => {
    // Teacher t1 has no free regular slot — slot 7 is the only option
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ teacher_id: 't1', periods_per_week: 1 })],
      ALL_SLOTS,
      blockAllRegular('t1')
    );

    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(1);
    expect(placed[0].slot_number).toBe(7);
  });

  test('reports unplaced when no slot at all is available', () => {
    // Block EVERY slot including slot 7 — task must be unplaced
    const allBlocked = [
      ...blockAllRegular('t1'),
      { teacher_id: 't1', day_of_week: 0, slot_number: 7, is_available: false },
      { teacher_id: 't1', day_of_week: 1, slot_number: 7, is_available: false },
      { teacher_id: 't1', day_of_week: 2, slot_number: 7, is_available: false },
      { teacher_id: 't1', day_of_week: 3, slot_number: 7, is_available: false },
      { teacher_id: 't1', day_of_week: 4, slot_number: 7, is_available: false },
    ];

    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ teacher_id: 't1', periods_per_week: 1 })],
      ALL_SLOTS,
      allBlocked
    );

    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(1);
  });

  test('30 subjects for one class fill exactly 30 regular slots, no slot 7', () => {
    // 5 days × 6 slots = 30 class slots available; all 30 must land in regular hours
    const assignments = Array.from({ length: 30 }, (_, i) =>
      makeAssignment({
        id: `a${i}`,
        teacher_id: `teacher${i}`,   // all different teachers — no teacher conflicts
        subject: `UniqueSubj${i}`,   // all different subjects — no per-day subject limit hit
        class_name: 'Y9',
        periods_per_week: 1,
      })
    );

    const { placed, unplaced } = generateTimetable(assignments, ALL_SLOTS, []);

    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(30);
    expect(placed.every(e => e.slot_number !== 7)).toBe(true);
  });

  test('subjects placed in slot 7 for one teacher do not displace others into slot 7', () => {
    // t1 is blocked on all regular slots → goes to slot 7
    // t2 is free → must still land in regular slots despite t1 using slot 7
    const assignments = [
      makeAssignment({ id: 'blocked', teacher_id: 't1', subject: 'Music', periods_per_week: 1 }),
      makeAssignment({ id: 'free',    teacher_id: 't2', subject: 'Art',   periods_per_week: 1 }),
    ];

    const { placed, unplaced } = generateTimetable(
      assignments,
      ALL_SLOTS,
      blockAllRegular('t1')
    );

    expect(unplaced).toHaveLength(0);
    const t2entry = placed.find(e => e.teacher_id === 't2');
    expect(t2entry).toBeDefined();
    expect(t2entry.slot_number).not.toBe(7);
  });
});

// ── Suite 2: Maths consecutive double classes ─────────────────────────────────

describe('Maths (DOUBLE_PREFERRED) consecutive double classes', () => {
  test('6 periods: all 3 placed as double classes (100%)', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ subject: 'Maths', periods_per_week: 6 })],
      REGULAR_SLOTS,
      []
    );

    expect(unplaced).toHaveLength(0);
    // 6 periods → 3 consecutive pairs → merged into 3 is_double entries
    expect(placed).toHaveLength(3);
    expect(placed.every(e => e.is_double)).toBe(true);
    expect(doubleRate(placed)).toBe(1);
  });

  test('4 periods: all 2 placed as double classes (100%)', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ subject: 'Maths', periods_per_week: 4 })],
      REGULAR_SLOTS,
      []
    );

    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);
    expect(placed.every(e => e.is_double)).toBe(true);
    expect(doubleRate(placed)).toBe(1);
  });

  test('5 periods: ≥80% placed in consecutive doubles (2 doubles + 1 single)', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ subject: 'Maths', periods_per_week: 5 })],
      REGULAR_SLOTS,
      []
    );

    expect(unplaced).toHaveLength(0);
    // Ideal: 2 is_double entries (4 periods) + 1 single = 80%
    expect(doubleRate(placed)).toBeGreaterThanOrEqual(0.8);
  });

  test('each Maths double is on a different day', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ subject: 'Maths', periods_per_week: 6 })],
      REGULAR_SLOTS,
      []
    );

    expect(unplaced).toHaveLength(0);
    const days = placed.map(e => e.day_of_week);
    const uniqueDays = new Set(days);
    // 3 doubles → each on a different day (max 2 Maths per day = 1 double per day)
    expect(uniqueDays.size).toBe(3);
  });

  test('6 Maths periods with competing subjects: ≥80% still consecutive', () => {
    // Other subjects compete for slots; Maths is sorted first (DOUBLE_PREFERRED)
    // so it always gets first pick of consecutive pairs.
    const assignments = [
      makeAssignment({ id: 'm',  teacher_id: 't1', subject: 'Maths',     class_name: 'Y5', periods_per_week: 6 }),
      makeAssignment({ id: 'h1', teacher_id: 't2', subject: 'History',   class_name: 'Y5', periods_per_week: 2 }),
      makeAssignment({ id: 'h2', teacher_id: 't3', subject: 'Geography', class_name: 'Y5', periods_per_week: 2 }),
      makeAssignment({ id: 'h3', teacher_id: 't4', subject: 'PD',        class_name: 'Y5', periods_per_week: 1 }),
      makeAssignment({ id: 'h4', teacher_id: 't5', subject: 'Library',   class_name: 'Y5', periods_per_week: 1 }),
    ];

    const { placed, unplaced } = generateTimetable(assignments, REGULAR_SLOTS, []);

    expect(unplaced).toHaveLength(0);
    const mathsPlaced = placed.filter(e => e.subject === 'Maths');
    expect(doubleRate(mathsPlaced)).toBeGreaterThanOrEqual(0.8);
  });

  test('Maths double periods land in regular slots, not slot 7', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ subject: 'Maths', periods_per_week: 6 })],
      ALL_SLOTS,
      []
    );

    expect(unplaced).toHaveLength(0);
    expect(placed.every(e => e.slot_number !== 7)).toBe(true);
  });

  test('Y1 realistic load: Maths 6 periods achieves ≥80% doubles among Art/Music/PE/Science', () => {
    // Simulates a realistic Y1 class (all different teachers, specialist subjects)
    const assignments = [
      makeAssignment({ id: 'm',   teacher_id: 't1',  subject: 'Maths',   class_name: 'Y1', periods_per_week: 6 }),
      makeAssignment({ id: 'sc',  teacher_id: 't2',  subject: 'Science', class_name: 'Y1', periods_per_week: 3 }),
      makeAssignment({ id: 'en',  teacher_id: 't3',  subject: 'English', class_name: 'Y1', periods_per_week: 2 }),
      makeAssignment({ id: 'art', teacher_id: 't4',  subject: 'Art',     class_name: 'Y1', periods_per_week: 2 }),
      makeAssignment({ id: 'pe',  teacher_id: 't5',  subject: 'PE',      class_name: 'Y1', periods_per_week: 3 }),
      makeAssignment({ id: 'mu',  teacher_id: 't6',  subject: 'Music',   class_name: 'Y1', periods_per_week: 1 }),
      makeAssignment({ id: 'ict', teacher_id: 't7',  subject: 'ICT',     class_name: 'Y1', periods_per_week: 1 }),
      makeAssignment({ id: 'hu',  teacher_id: 't8',  subject: 'History', class_name: 'Y1', periods_per_week: 2 }),
      makeAssignment({ id: 'pd',  teacher_id: 't9',  subject: 'PD',      class_name: 'Y1', periods_per_week: 1 }),
      makeAssignment({ id: 'li',  teacher_id: 't10', subject: 'Library', class_name: 'Y1', periods_per_week: 1 }),
    ];

    const { placed, unplaced } = generateTimetable(assignments, REGULAR_SLOTS, []);

    expect(unplaced).toHaveLength(0);
    const mathsPlaced = placed.filter(e => e.subject === 'Maths');
    expect(doubleRate(mathsPlaced)).toBeGreaterThanOrEqual(0.8);
  });
});
