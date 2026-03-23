import { generateTimetable } from './timetableGenerator';

// Slots: Morning Session (slot 0) + Periods 1-6 + Extra-Curricular (slot 7)
const SLOTS_WITH_CG_LABELS = [
  { slot_number: 0, label: 'Morning Session' },
  { slot_number: 1, label: 'Period 1' },
  { slot_number: 2, label: 'Period 2' },
  { slot_number: 3, label: 'Period 3' },
  { slot_number: 4, label: 'Period 4' },
  { slot_number: 5, label: 'Period 5' },
  { slot_number: 6, label: 'Period 6' },
  { slot_number: 7, label: 'Extra-Curricular' },
];

// Slots without Morning Session label (late-pair only available)
const SLOTS_LATE_PAIR_ONLY = [
  { slot_number: 1, label: 'Period 1' },
  { slot_number: 2, label: 'Period 2' },
  { slot_number: 3, label: 'Period 3' },
  { slot_number: 4, label: 'Period 4' },
  { slot_number: 5, label: 'Period 5' },
  { slot_number: 6, label: 'Period 6' },
  { slot_number: 7, label: 'Extra-Curricular' },
];

// Standard slots with no CG labels — triggers fallback placement
const SLOTS_NO_LABELS = [
  { slot_number: 1 }, { slot_number: 2 }, { slot_number: 3 },
  { slot_number: 4 }, { slot_number: 5 }, { slot_number: 6 },
];

function makeCG(overrides = {}) {
  return {
    id: overrides.id || 'cg1',
    teacher_id: overrides.teacher_id || 'tcg',
    subject: 'Cooking & Gardening',
    class_name: overrides.class_name || 'Y1',
    periods_per_week: overrides.periods_per_week ?? 2,
    parallel_group: overrides.parallel_group || null,
  };
}

// ── Block placement: valid slot pairs ──────────────────────────────────────────

describe('Cooking & Gardening — block placement', () => {
  test('CG placed as is_double=true at a valid pair slot', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    // periods_per_week=2 → 2 blocks, each as a single is_double=true entry
    expect(placed).toHaveLength(2);
    placed.forEach(e => {
      expect(e.is_double).toBe(true);
      expect(e.subject).toBe('Cooking & Gardening');
    });
  });

  test('CG block starts only at Morning Session (slot 0) or Period 6 (slot 6)', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    const validStartSlots = new Set([0, 6]);
    placed.forEach(e => {
      expect(validStartSlots.has(e.slot_number)).toBe(true);
    });
  });

  test('CG with only late pair available starts at slot 6', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 1 })],
      SLOTS_LATE_PAIR_ONLY,
      []
    );
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(1);
    expect(placed[0].slot_number).toBe(6);
    expect(placed[0].is_double).toBe(true);
  });

  test('CG does not occupy a random period slot', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    const forbiddenSlots = new Set([1, 2, 3, 4, 5]); // interior periods
    placed.forEach(e => {
      expect(forbiddenSlots.has(e.slot_number)).toBe(false);
    });
  });

  test('CG blocks on different days', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    const days = placed.map(e => e.day_of_week);
    // Two blocks must land on two distinct days (no two blocks same day)
    expect(new Set(days).size).toBe(2);
  });

  test('CG block does not conflict with regular subjects in same slots', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg', periods_per_week: 1 }),
      {
        id: 'a2', teacher_id: 't2', subject: 'Maths', class_name: 'Y1',
        periods_per_week: 4, parallel_group: null,
      },
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    expect(unplaced).toHaveLength(0);

    // Find the CG block's occupied slots
    const cgEntry = placed.find(e => e.subject === 'Cooking & Gardening');
    const cgStart = cgEntry.slot_number;
    const cgEnd = cgStart + 1; // is_double expands to slot+1
    const cgDay = cgEntry.day_of_week;

    // No other subject for the same class should overlap
    const others = placed.filter(e => e.subject !== 'Cooking & Gardening' && e.class_name === 'Y1');
    others.forEach(e => {
      const isSameDay = e.day_of_week === cgDay;
      if (isSameDay) {
        expect(e.slot_number === cgStart || e.slot_number === cgEnd).toBe(false);
      }
    });
  });
});

// ── Parallel group C&G (shared teacher, same slot across year clusters) ────────

describe('Cooking & Gardening — parallel group (year cluster)', () => {
  test('Y1 and Y2 CG share the same day and slot pair', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg', class_name: 'Y1', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg2', teacher_id: 'tcg', class_name: 'Y2', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);

    const y1 = placed.find(e => e.class_name === 'Y1');
    const y2 = placed.find(e => e.class_name === 'Y2');
    expect(y1.day_of_week).toBe(y2.day_of_week);
    expect(y1.slot_number).toBe(y2.slot_number);
  });

  test('parallel CG group blocks are always is_double=true', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg', class_name: 'Y1', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg2', teacher_id: 'tcg', class_name: 'Y2', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    placed.forEach(e => expect(e.is_double).toBe(true));
  });

  test('two different CG clusters placed at different valid pairs', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg1', class_name: 'Y1', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg2', teacher_id: 'tcg1', class_name: 'Y2', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg3', teacher_id: 'tcg2', class_name: 'Y3', periods_per_week: 1, parallel_group: 'CG-Cluster2' }),
      makeCG({ id: 'cg4', teacher_id: 'tcg2', class_name: 'Y4', periods_per_week: 1, parallel_group: 'CG-Cluster2' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(4);

    // All blocks must start at a valid CG slot
    const validStarts = new Set([0, 6]);
    placed.forEach(e => expect(validStarts.has(e.slot_number)).toBe(true));
  });
});

// ── Fallback: no CG labels configured ─────────────────────────────────────────

describe('Cooking & Gardening — fallback (no valid slot labels)', () => {
  test('CG falls back to regular placement when no morning/extra-curricular slots', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_NO_LABELS,
      []
    );
    // Should still place both periods (as regular double-period, via mergeDoubleClasses)
    expect(unplaced).toHaveLength(0);
    // Either 1 merged double or 2 singles depending on whether they land consecutively
    expect(placed.length).toBeGreaterThanOrEqual(1);
    expect(placed.length).toBeLessThanOrEqual(2);
  });
});
