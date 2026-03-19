import { generateTimetable, detectConflicts } from './timetableGenerator';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SLOTS = [
  { slot_number: 1 }, { slot_number: 2 }, { slot_number: 3 },
  { slot_number: 4 }, { slot_number: 5 }, { slot_number: 6 },
];

function makeAssignment(overrides = {}) {
  return {
    id: overrides.id || 'a1',
    teacher_id: overrides.teacher_id || 't1',
    subject: overrides.subject || 'Maths',
    class_name: overrides.class_name || 'Y1',
    periods_per_week: overrides.periods_per_week ?? 1,
  };
}

function makeEntry(overrides = {}) {
  return {
    id: overrides.id || 'e1',
    teacher_id: overrides.teacher_id || 't1',
    class_name: overrides.class_name || 'Y1',
    subject: overrides.subject || 'Maths',
    day_of_week: overrides.day_of_week ?? 0,
    slot_number: overrides.slot_number ?? 1,
    is_double: overrides.is_double ?? false,
  };
}

// ── generateTimetable ─────────────────────────────────────────────────────────

describe('generateTimetable', () => {
  test('places a single 1-period assignment', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ periods_per_week: 1 })],
      SLOTS,
      []
    );
    expect(placed).toHaveLength(1);
    expect(unplaced).toHaveLength(0);
    expect(placed[0]).toMatchObject({
      teacher_id: 't1',
      subject: 'Maths',
      class_name: 'Y1',
    });
  });

  test('places all periods for a multi-period assignment', () => {
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ periods_per_week: 5 })],
      SLOTS,
      []
    );
    expect(placed.length).toBe(5);
    expect(unplaced).toHaveLength(0);
  });

  test('no double-booking: two subjects for same class, same slot should not collide', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'Maths', class_name: 'Y1', periods_per_week: 1 }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'English', class_name: 'Y1', periods_per_week: 1 }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS, []);
    // Both placed but never on the same day+slot for Y1
    const keySet = new Set(placed.map(e => `${e.day_of_week}|${e.slot_number}`));
    expect(keySet.size).toBe(placed.length); // each slot key is unique
  });

  test('no teacher double-booking: same teacher, two classes at same slot', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', class_name: 'Y1', periods_per_week: 1 }),
      makeAssignment({ id: 'a2', teacher_id: 't1', class_name: 'Y2', periods_per_week: 1 }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS, []);
    // Teacher t1 must not appear twice in same day+slot
    const teacherKeys = placed.map(e => `${e.day_of_week}|${e.slot_number}|${e.teacher_id}`);
    const unique = new Set(teacherKeys);
    expect(unique.size).toBe(teacherKeys.length);
  });

  test('respects availability blocks', () => {
    // Block teacher t1 on all slots except day=0, slot=6
    const availability = [];
    for (let day = 0; day < 5; day++) {
      for (let slot = 1; slot <= 6; slot++) {
        if (!(day === 0 && slot === 6)) {
          availability.push({ teacher_id: 't1', day_of_week: day, slot_number: slot, is_available: false });
        }
      }
    }
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ teacher_id: 't1', periods_per_week: 1 })],
      SLOTS,
      availability
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].day_of_week).toBe(0);
    expect(placed[0].slot_number).toBe(6);
    expect(unplaced).toHaveLength(0);
  });

  test('moves task to unplaced if no available slot', () => {
    // Block ALL slots for t1
    const availability = [];
    for (let day = 0; day < 5; day++) {
      for (let slot = 1; slot <= 6; slot++) {
        availability.push({ teacher_id: 't1', day_of_week: day, slot_number: slot, is_available: false });
      }
    }
    const { placed, unplaced } = generateTimetable(
      [makeAssignment({ teacher_id: 't1', periods_per_week: 1 })],
      SLOTS,
      availability
    );
    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(1);
  });

  test('merges consecutive same-subject entries into double class when on same day', () => {
    // Force both periods onto the same day by blocking all days except Monday (day 0)
    const availability = [];
    for (let day = 1; day < 5; day++) {
      for (let slot = 1; slot <= 6; slot++) {
        availability.push({ teacher_id: 't1', day_of_week: day, slot_number: slot, is_available: false });
      }
    }
    const { placed } = generateTimetable(
      [makeAssignment({ periods_per_week: 2, subject: 'Art' })],
      SLOTS,
      availability
    );
    // Both periods forced onto Monday — should merge into 1 double entry
    expect(placed).toHaveLength(1);
    expect(placed[0].is_double).toBe(true);
  });

  test('returns empty arrays for empty inputs', () => {
    const { placed, unplaced } = generateTimetable([], SLOTS, []);
    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(0);
  });
});

// ── detectConflicts ───────────────────────────────────────────────────────────

describe('detectConflicts', () => {
  test('returns empty set when no conflicts', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', class_name: 'Y1', day_of_week: 0, slot_number: 1 }),
      makeEntry({ id: 'e2', teacher_id: 't2', class_name: 'Y2', day_of_week: 0, slot_number: 1 }),
      makeEntry({ id: 'e3', teacher_id: 't1', class_name: 'Y1', day_of_week: 0, slot_number: 2 }),
    ];
    expect(detectConflicts(entries).size).toBe(0);
  });

  test('detects teacher double-booking in same slot', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', class_name: 'Y1', day_of_week: 0, slot_number: 1 }),
      makeEntry({ id: 'e2', teacher_id: 't1', class_name: 'Y2', day_of_week: 0, slot_number: 1 }),
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.has('e1')).toBe(true);
    expect(conflicts.has('e2')).toBe(true);
  });

  test('detects class double-booking in same slot', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', class_name: 'Y1', day_of_week: 1, slot_number: 3 }),
      makeEntry({ id: 'e2', teacher_id: 't2', class_name: 'Y1', day_of_week: 1, slot_number: 3 }),
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.has('e1')).toBe(true);
    expect(conflicts.has('e2')).toBe(true);
  });

  test('double-class entry also occupies slot+1 for conflict detection', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', class_name: 'Y1', day_of_week: 0, slot_number: 1, is_double: true }),
      // Another class at slot 2 with same teacher — should conflict
      makeEntry({ id: 'e2', teacher_id: 't1', class_name: 'Y2', day_of_week: 0, slot_number: 2 }),
    ];
    const conflicts = detectConflicts(entries);
    expect(conflicts.has('e1')).toBe(true);
    expect(conflicts.has('e2')).toBe(true);
  });

  test('no conflict when same teacher on different days', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', day_of_week: 0, slot_number: 1 }),
      makeEntry({ id: 'e2', teacher_id: 't1', day_of_week: 1, slot_number: 1 }),
    ];
    expect(detectConflicts(entries).size).toBe(0);
  });

  test('no conflict when same teacher in different slots on same day', () => {
    const entries = [
      makeEntry({ id: 'e1', teacher_id: 't1', day_of_week: 0, slot_number: 1 }),
      makeEntry({ id: 'e2', teacher_id: 't1', day_of_week: 0, slot_number: 2 }),
    ];
    expect(detectConflicts(entries).size).toBe(0);
  });

  test('returns empty set for empty input', () => {
    expect(detectConflicts([]).size).toBe(0);
  });
});
