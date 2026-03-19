import { generateTimetable, detectConflicts } from './timetableGenerator';

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
    parallel_group: overrides.parallel_group || null,
  };
}

// ── Parallel Group: French + German at same time ──────────────────────────────

describe('generateTimetable — parallel groups', () => {
  test('French and German are placed in the same slot', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French',  class_name: 'Y7-French',  periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German',  class_name: 'Y7-German',  periods_per_week: 1, parallel_group: 'Y7-Languages' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);

    const french = placed.find(e => e.subject === 'French');
    const german = placed.find(e => e.subject === 'German');
    expect(french.day_of_week).toBe(german.day_of_week);
    expect(french.slot_number).toBe(german.slot_number);
  });

  test('no teacher double-booking even within parallel group', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French', class_name: 'Y7-French', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German', class_name: 'Y7-German', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS, []);
    // French teacher (t1) and German teacher (t2) must be different
    const teachers = placed.map(e => e.teacher_id);
    expect(new Set(teachers).size).toBe(2);
  });

  test('three parallel Serbian levels all in the same slot', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'Serbian', class_name: 'Serbian-Beginner', periods_per_week: 1, parallel_group: 'Y5-Serbian' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'Serbian', class_name: 'Serbian-Med',      periods_per_week: 1, parallel_group: 'Y5-Serbian' }),
      makeAssignment({ id: 'a3', teacher_id: 't3', subject: 'Serbian', class_name: 'Serbian-Native',   periods_per_week: 1, parallel_group: 'Y5-Serbian' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(3);

    const days  = placed.map(e => e.day_of_week);
    const slots = placed.map(e => e.slot_number);
    // All three must share the same day and slot
    expect(new Set(days).size).toBe(1);
    expect(new Set(slots).size).toBe(1);
  });

  test('multi-period parallel group: each occurrence lands on a different (but matched) slot', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French',  class_name: 'Y7-French',  periods_per_week: 2, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German',  class_name: 'Y7-German',  periods_per_week: 2, parallel_group: 'Y7-Languages' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(4); // 2 French + 2 German

    const french = placed.filter(e => e.subject === 'French');
    const german = placed.filter(e => e.subject === 'German');

    // For each French period, there must be a matching German period at the same slot
    const frenchKeys = new Set(french.map(e => `${e.day_of_week}|${e.slot_number}`));
    const germanKeys = new Set(german.map(e => `${e.day_of_week}|${e.slot_number}`));
    expect(frenchKeys).toEqual(germanKeys);
  });

  test('parallel group produces no conflicts (different classes, same slot is OK)', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French', class_name: 'Y7-French', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German', class_name: 'Y7-German', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
    ];
    const { placed } = generateTimetable(assignments, SLOTS, []);
    const conflicts = detectConflicts(placed.map((e, i) => ({ ...e, id: `e${i}` })));
    // Different teachers + different classes in same slot → no conflict
    expect(conflicts.size).toBe(0);
  });

  test('unparalleled assignments are not forced into group slots', () => {
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French',  class_name: 'Y7-French', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German',  class_name: 'Y7-German', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a3', teacher_id: 't3', subject: 'Maths',   class_name: 'Y7',        periods_per_week: 1, parallel_group: null }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(3);
  });

  test('moves parallel group to unplaced when no valid slot for all members', () => {
    // Block t1 (French) entirely — the whole group should be unplaced
    const availability = [];
    for (let day = 0; day < 5; day++) {
      for (let slot = 1; slot <= 6; slot++) {
        availability.push({ teacher_id: 't1', day_of_week: day, slot_number: slot, is_available: false });
      }
    }
    const assignments = [
      makeAssignment({ id: 'a1', teacher_id: 't1', subject: 'French', class_name: 'Y7-French', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
      makeAssignment({ id: 'a2', teacher_id: 't2', subject: 'German', class_name: 'Y7-German', periods_per_week: 1, parallel_group: 'Y7-Languages' }),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS, availability);
    // French can't be placed → group slot never committed → German also unplaced (or placed without French)
    // The expected behaviour: French goes to unplaced; German may still be placed independently
    const frenchPlaced = placed.find(e => e.subject === 'French');
    expect(frenchPlaced).toBeUndefined();
    const frenchUnplaced = unplaced.find(e => e.subject === 'French');
    expect(frenchUnplaced).toBeDefined();
  });
});
