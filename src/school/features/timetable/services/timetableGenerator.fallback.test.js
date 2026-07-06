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

describe('Part-time teacher priority', () => {
  test('part-timer lessons claim their few available slots before full-timer doubles', () => {
    // Part-timer tp is free ONLY Monday slots 1+2 (2 of 30 slots).
    // Full-timer tf teaches Maths 10/week (5 doubles) to the same class —
    // enough to fill the entire week. Without the priority round, tf's
    // doubles would grab Monday 1+2 and tp could never be placed.
    const assignments = [
      { id: 'af', teacher_id: 'tf', subject: 'Maths', class_name: 'Y3', periods_per_week: 10, parallel_group: null },
      { id: 'ap', teacher_id: 'tp', subject: 'Music', class_name: 'Y3', periods_per_week: 2, parallel_group: null },
    ];
    const availability = availableOnly('tp', [[0, 1], [0, 2]]);
    const { placed } = generateTimetable(assignments, SLOTS_6, availability);

    const partTimer = placed.filter(p => p.teacher_id === 'tp');
    const totalPartTimer = partTimer.reduce((n, p) => n + (p.is_double ? 2 : 1), 0);
    expect(totalPartTimer).toBe(2);
    partTimer.forEach(p => {
      expect(p.day_of_week).toBe(0);
      expect([1, 2]).toContain(p.slot_number);
    });
  });
});

describe('Slack-based teacher priority', () => {
  test('teacher with little slack (free minus required) is fully placed', () => {
    // tm mirrors Marija: 10 of 30 slots blocked (20 free — more than the
    // 60% availability cutoff) but must deliver 16 periods → slack 4.
    // A competing full-timer wants doubles in the same classes.
    const blocked = [];
    for (let s = 1; s <= 2; s++) DAYS.forEach(d => blocked.push([d, s]));
    // tm available everywhere EXCEPT slots 1 and 2 every day (10 blocked)
    const tmAvailability = blocked.map(([d, s]) => ({
      teacher_id: 'tm', day_of_week: d, slot_number: s, is_available: false,
    }));

    const classes = ['Y3', 'Y4', 'Y5', 'Y7'];
    const assignments = [];
    classes.forEach((c, i) => {
      assignments.push({ id: `m${i}`, teacher_id: 'tm', subject: 'French', class_name: c, periods_per_week: 4, parallel_group: null });
      assignments.push({ id: `f${i}`, teacher_id: `tf${i}`, subject: 'Maths', class_name: c, periods_per_week: 10, parallel_group: null });
    });

    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, tmAvailability);
    const tmUnplaced = unplaced.filter(u => u.teacher_id === 'tm');
    expect(tmUnplaced).toHaveLength(0);
    const tmPeriods = placed.filter(p => p.teacher_id === 'tm')
      .reduce((n, p) => n + (p.is_double ? 2 : 1), 0);
    expect(tmPeriods).toBe(16);
    // tm never scheduled in a blocked slot
    placed.filter(p => p.teacher_id === 'tm').forEach(p => {
      expect([1, 2]).not.toContain(p.slot_number);
    });
  });
});

describe('Phase 5 — repair by displacing a blocking lesson', () => {
  test('moves another class out of the way instead of leaving the task unplaced', () => {
    // tx is available ONLY Monday slots 1+2. ty is available ONLY Monday
    // slot 2 and teaches Y1 — so Y1 is occupied at (0,2) first.
    // tx's History(Y2) then grabs (0,1); tx's Music(Y1) has nowhere left:
    // (0,1) tx busy, (0,2) Y1 busy. Repair must move History(Y2) to (0,2)
    // (Y2 is free there) and place Music(Y1) at (0,1).
    const assignments = [
      { id: 'ay', teacher_id: 'ty', subject: 'Library', class_name: 'Y1', periods_per_week: 1, parallel_group: null },
      { id: 'a1', teacher_id: 'tx', subject: 'History', class_name: 'Y2', periods_per_week: 1, parallel_group: null },
      { id: 'a2', teacher_id: 'tx', subject: 'Music', class_name: 'Y1', periods_per_week: 1, parallel_group: null },
    ];
    const availability = [
      ...availableOnly('tx', [[0, 1], [0, 2]]),
      ...availableOnly('ty', [[0, 2]]),
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, availability);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(3);

    const music = placed.find(p => p.subject === 'Music');
    const history = placed.find(p => p.subject === 'History');
    expect(music.day_of_week).toBe(0);
    expect(history.day_of_week).toBe(0);
    // Both tx lessons in tx's two available slots, no overlap
    expect(new Set([music.slot_number, history.slot_number])).toEqual(new Set([1, 2]));
    // No teacher double-booking anywhere
    const byTeacherSlot = placed.map(p => `${p.teacher_id}|${p.day_of_week}|${p.slot_number}`);
    expect(new Set(byTeacherSlot).size).toBe(byTeacherSlot.length);
  });
});

describe('Subject spread (mix predmeta)', () => {
  test('a 2×/week subject is never twice on the same day nor on adjacent days', () => {
    const assignments = [
      { id: 'a1', teacher_id: 't1', subject: 'French', class_name: 'Y9', periods_per_week: 2, parallel_group: null },
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, []);
    expect(unplaced).toHaveLength(0);
    expect(placed).toHaveLength(2);
    const [d1, d2] = placed.map(p => p.day_of_week);
    expect(Math.abs(d1 - d2)).toBeGreaterThanOrEqual(2);
  });

  test('parallel-group 2×/week lessons spread across the week too', () => {
    // French + German in a LANG group, 2×/week — occurrences must not
    // land on the same or adjacent days.
    const assignments = [
      { id: 'a1', teacher_id: 'tf', subject: 'French', class_name: 'Y9', periods_per_week: 2, parallel_group: 'Y9-LANG' },
      { id: 'a2', teacher_id: 'tg', subject: 'German', class_name: 'Y9', periods_per_week: 2, parallel_group: 'Y9-LANG' },
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_6, []);
    expect(unplaced).toHaveLength(0);
    const frenchDays = placed.filter(p => p.subject === 'French').map(p => p.day_of_week);
    expect(new Set(frenchDays).size).toBe(2);
    expect(Math.abs(frenchDays[0] - frenchDays[1])).toBeGreaterThanOrEqual(2);
  });
});

describe('Pre-period for constrained teachers', () => {
  test('tight-schedule teacher uses the pre-period when regular slots run out', () => {
    // Y9's regular week is fully locked; only the pre-period is open.
    // tm has low slack (blocked heavily) → pre-period is a cheap option.
    const SLOTS_WITH_PRE = [
      { slot_number: 0 }, ...SLOTS_6,
    ];
    const locked = [];
    DAYS.forEach(d => SLOTS_6.forEach(({ slot_number: s }, i) => {
      locked.push({
        id: `L${d}-${s}`, teacher_id: `lock${d}${s}`, subject: `Sub${i}`,
        class_name: 'Y9', day_of_week: d, slot_number: s, is_double: false,
      });
    }));
    const assignments = [
      { id: 'a1', teacher_id: 'tm', subject: 'French', class_name: 'Y9', periods_per_week: 1, parallel_group: null },
    ];
    const { placed, unplaced } = generateTimetable(assignments, SLOTS_WITH_PRE, [], locked);
    expect(unplaced).toHaveLength(0);
    const french = placed.find(p => p.subject === 'French');
    expect(french.slot_number).toBe(0);
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
