import { generateTimetable, classAllowedInSlot } from './timetableGenerator';

// Slots including the pre-period (slot 0, 08:20–09:00, Y7–Y9 only)
const SLOTS_WITH_PRE = [
  { slot_number: 0 }, { slot_number: 1 }, { slot_number: 2 },
  { slot_number: 3 }, { slot_number: 4 }, { slot_number: 5 }, { slot_number: 6 },
];

function makeAssignment(overrides = {}) {
  return {
    id: overrides.id || 'a1',
    teacher_id: overrides.teacher_id || 't1',
    subject: overrides.subject || 'History',
    class_name: overrides.class_name || 'Y1a',
    periods_per_week: overrides.periods_per_week ?? 1,
    ...overrides,
  };
}

describe('classAllowedInSlot', () => {
  test('pre-period (slot 0) allows only Y7, Y8, Y9', () => {
    expect(classAllowedInSlot('Y7', 0)).toBe(true);
    expect(classAllowedInSlot('Y8', 0)).toBe(true);
    expect(classAllowedInSlot('Y9', 0)).toBe(true);
    expect(classAllowedInSlot('y9', 0)).toBe(true);
    expect(classAllowedInSlot('Y1a', 0)).toBe(false);
    expect(classAllowedInSlot('Y2', 0)).toBe(false);
    expect(classAllowedInSlot('Y6b', 0)).toBe(false);
  });

  test('regular slots allow every class', () => {
    expect(classAllowedInSlot('Y1a', 1)).toBe(true);
    expect(classAllowedInSlot('Y2', 3)).toBe(true);
    expect(classAllowedInSlot('Y9', 6)).toBe(true);
  });
});

describe('generateTimetable with pre-period slot', () => {
  test('lower years are never scheduled in the pre-period', () => {
    // 30 periods for Y2 with 6 regular slots × 5 days = exactly full;
    // one more period would overflow into slot 0 if it were allowed.
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'History', class_name: 'Y2', periods_per_week: 31 }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS_WITH_PRE, []);
    expect(placed.every(p => p.slot_number !== 0)).toBe(true);
  });

  test('Y9 overflow lands in the pre-period instead of being unplaced', () => {
    // Fill Y9's whole regular week (6 slots × 5 days = 30) with different
    // teachers, then one extra subject must use the pre-period.
    const assignments = [];
    for (let i = 0; i < 6; i++) {
      assignments.push(makeAssignment({
        id: `a${i}`, teacher_id: `t${i}`, subject: `Subject${i}`,
        class_name: 'Y9', periods_per_week: 5,
      }));
    }
    assignments.push(makeAssignment({
      id: 'extra', teacher_id: 't-extra', subject: 'PD/PSHE',
      class_name: 'Y9', periods_per_week: 1,
    }));

    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_PRE, []);
    expect(unplaced).toHaveLength(0);
    const preEntries = placed.filter(p => p.slot_number === 0);
    expect(preEntries).toHaveLength(1);
    expect(preEntries[0].class_name).toBe('Y9');
  });

  test('pre-period is a last resort — free regular slots win', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'History', class_name: 'Y9', periods_per_week: 3 }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS_WITH_PRE, []);
    expect(placed.every(p => p.slot_number !== 0)).toBe(true);
  });

  test('doubles never start in the pre-period', () => {
    // Maths is double-preferred; even with heavy load it must not pair slot 0+1
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'Maths', class_name: 'Y9', periods_per_week: 10 }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS_WITH_PRE, []);
    placed.filter(p => p.is_double).forEach(p => {
      expect(p.slot_number).not.toBe(0);
    });
  });
});
