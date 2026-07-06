import { generateTimetable } from './timetableGenerator';

// Slots: Pre-period (slot 0, Y7-Y9 only) + Periods 1-6 + Extra-Curricular (slot 7)
// Slot 0 is the early-morning pre-period reserved for upper years — C&G can
// no longer start there; its valid anchors are P1 (first regular slot) and
// P6 (last regular slot) so the day connects with Morning Session / Extra-Curricular.
const SLOTS_WITH_CG_LABELS = [
  { slot_number: 0, label: 'Pre-period (Y7–Y9)' },
  { slot_number: 1, label: 'Period 1' },
  { slot_number: 2, label: 'Period 2' },
  { slot_number: 3, label: 'Period 3' },
  { slot_number: 4, label: 'Period 4' },
  { slot_number: 5, label: 'Period 5' },
  { slot_number: 6, label: 'Period 6' },
  { slot_number: 7, label: 'Extra-Curricular' },
];

// CG anchors with these slots: first + last regular slot
const CG_VALID_STARTS = new Set([1, 6]);

// Slots without pre-period
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

// ── Placement: valid anchor slots ──────────────────────────────────────────────

describe('Cooking & Gardening — placement', () => {
  test('CG placed as single periods at valid anchor slots', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);
    placed.forEach(e => {
      expect(e.subject).toBe('Cooking & Gardening');
      expect(CG_VALID_STARTS.has(e.slot_number)).toBe(true);
    });
  });

  test('CG never starts in the pre-period (slot 0) or after-school (slot 7)', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    placed.forEach(e => {
      expect(e.slot_number).not.toBe(0);
      expect(e.slot_number).not.toBe(7);
    });
  });

  test('CG without pre-period slot still anchors at P1 or P6', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 1 })],
      SLOTS_LATE_PAIR_ONLY,
      []
    );
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(1);
    expect(CG_VALID_STARTS.has(placed[0].slot_number)).toBe(true);
  });

  test('CG does not occupy an interior period slot', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    const forbiddenSlots = new Set([0, 2, 3, 4, 5, 7]); // pre-period + interior + after-school
    placed.forEach(e => {
      expect(forbiddenSlots.has(e.slot_number)).toBe(false);
    });
  });

  test('CG periods land on different days', () => {
    const { placed, unplaced } = generateTimetable(
      [makeCG({ periods_per_week: 2 })],
      SLOTS_WITH_CG_LABELS,
      []
    );
    expect(unplaced).toHaveLength(0);
    const days = placed.map(e => e.day_of_week);
    expect(new Set(days).size).toBe(2);
  });

  test('CG does not conflict with regular subjects in same slots', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg', periods_per_week: 1 }),
      {
        id: 'a2', teacher_id: 't2', subject: 'Maths', class_name: 'Y1',
        periods_per_week: 4, parallel_group: null,
      },
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    expect(unplaced).toHaveLength(0);

    const cgEntry = placed.find(e => e.subject === 'Cooking & Gardening');
    const cgSlots = cgEntry.is_double
      ? [cgEntry.slot_number, cgEntry.slot_number + 1]
      : [cgEntry.slot_number];
    const cgDay = cgEntry.day_of_week;

    // No other subject for the same class should overlap
    const others = placed.filter(e => e.subject !== 'Cooking & Gardening' && e.class_name === 'Y1');
    others.forEach(e => {
      if (e.day_of_week === cgDay) {
        const eSlots = e.is_double ? [e.slot_number, e.slot_number + 1] : [e.slot_number];
        expect(eSlots.some(s => cgSlots.includes(s))).toBe(false);
      }
    });
  });
});

// ── Parallel group C&G (shared teacher, same slot across year clusters) ────────

describe('Cooking & Gardening — parallel group (year cluster)', () => {
  test('Y1 and Y2 CG share the same day and slot', () => {
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

  test('two different CG clusters placed at valid anchor slots', () => {
    const assignments = [
      makeCG({ id: 'cg1', teacher_id: 'tcg1', class_name: 'Y1', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg2', teacher_id: 'tcg1', class_name: 'Y2', periods_per_week: 1, parallel_group: 'CG-Cluster1' }),
      makeCG({ id: 'cg3', teacher_id: 'tcg2', class_name: 'Y3', periods_per_week: 1, parallel_group: 'CG-Cluster2' }),
      makeCG({ id: 'cg4', teacher_id: 'tcg2', class_name: 'Y4', periods_per_week: 1, parallel_group: 'CG-Cluster2' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_CG_LABELS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(4);
    placed.forEach(e => expect(CG_VALID_STARTS.has(e.slot_number)).toBe(true));
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
    expect(unplaced).toHaveLength(0);
    expect(placed.length).toBeGreaterThanOrEqual(1);
    expect(placed.length).toBeLessThanOrEqual(2);
  });
});
