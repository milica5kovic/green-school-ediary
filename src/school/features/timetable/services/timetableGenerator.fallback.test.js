import { generateTimetable } from './timetableGenerator';

const SLOTS_6 = [
  { slot_number: 1 }, { slot_number: 2 }, { slot_number: 3 },
  { slot_number: 4 }, { slot_number: 5 }, { slot_number: 6 },
];
const DAYS = [0, 1, 2, 3, 4];

// Block every (day, slot) for a teacher EXCEPT the given allowed list
function availableOnly(teacher_id, allowed) {
  const allowedSet = new Set(allowed.map(([d, s]) => `${d}|${s}`));
  const records = [];
  DAYS.forEach(d => SLOTS_6.forEach(({ slot_number: s }) => {
    if (!allowedSet.has(`${d}|${s}`)) {
      records.push({ teacher_id, day_of_week: d, slot_number: s, is_available: false });
    }
  }));
  return records;
}

describe('Phase 3 — relaxed fallback for all subjects', () => {
  test('parallel-group siblings with no common slot are placed out of sync instead of unplaced', () => {
    // t1 free everywhere EXCEPT day0/slot1; t2 free ONLY day0/slot1.
    // No common slot → group sync fails → Phase 3 places each separately.
    const assignments = [
      { id: 'a1', teacher_id: 't1', subject: 'Music', class_name: 'Y3', periods_per_week: 1, parallel_group: 'G-Music' },
      { id: 'a2', teacher_id: 't2', subject: 'Music', class_name: 'Y4', periods_per_week: 1, parallel_group: 'G-Music' },
    ];
    const availability = [
      { teacher_id: 't1', day_of_week: 0, slot_number: 1, is_available: false },
      ...availableOnly('t2', [[0, 1]]),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, availability);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);
    const t2entry = placed.find(p => p.teacher_id === 't2');
    expect(t2entry.day_of_week).toBe(0);
    expect(t2entry.slot_number).toBe(1);
  });

  test('a failed double splits into two single periods', () => {
    // Maths 2/week → one double task. Teacher free only at day0/slot2 and
    // day1/slot5 — no valid adjacent pair, but two singles fit.
    const assignments = [
      { id: 'a1', teacher_id: 't1', subject: 'Maths', class_name: 'Y3', periods_per_week: 2, parallel_group: null },
    ];
    const availability = availableOnly('t1', [[0, 2], [1, 5]]);
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, availability);
    expect(unplaced).toHaveLength(0);
    const totalPeriods = placed.reduce((n, p) => n + (p.is_double ? 2 : 1), 0);
    expect(totalPeriods).toBe(2);
    placed.forEach(p => expect(p.is_double).toBe(false));
  });
});

describe('Phase 4 — daily cap relaxed as last resort', () => {
  test('a third period of the same subject fits on one day instead of staying unplaced', () => {
    // Teacher available only on Monday (slots 1,2,3). History 3/week,
    // normal cap = 2/day → third period only possible with relaxed cap.
    const assignments = [
      { id: 'a1', teacher_id: 't1', subject: 'History', class_name: 'Y3', periods_per_week: 3, parallel_group: null },
    ];
    const availability = availableOnly('t1', [[0, 1], [0, 2], [0, 3]]);
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, availability);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(3);
    placed.forEach(p => expect(p.day_of_week).toBe(0));
  });
});

describe('Unplaced diagnostics', () => {
  test('genuinely impossible task reports a reason', () => {
    // Teacher blocked everywhere → cannot be placed at all.
    const assignments = [
      { id: 'a1', teacher_id: 't1', subject: 'ICT', class_name: 'Y3', periods_per_week: 1, parallel_group: null },
    ];
    const availability = availableOnly('t1', []);
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, availability);
    expect(placed).toHaveLength(0);
    expect(unplaced).toHaveLength(1);
    expect(unplaced[0].reason).toMatch(/unavailable|Availability/);
  });
});
