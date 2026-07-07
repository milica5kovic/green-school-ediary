// ============================================================
// TIMETABLE GENERATOR — Greedy constraint satisfaction algorithm
// ============================================================

const DAYS = [0, 1, 2, 3, 4]; // Monday=0 ... Friday=4

// Subjects that should NEVER appear more than once on the same day.
// (Removed Maths — Maths forms double periods in the original school timetable)
const SINGLE_PERIOD_SUBJECTS = new Set([]);

// Subjects that should be taught in consecutive double periods wherever possible.
// E.g., Science on Tuesday P3+P4, not P1 and P5 separately.
// The generator applies a large bonus score for placing these back-to-back.
const DOUBLE_PREFERRED_SUBJECTS = new Set([
  'Maths', 'Mathematics', 'Math',
  'PE',
  'Art', 'ART',
  'Science',
  'English',
  'ESL',
]);

// Cooking & Gardening: 1 period/week but MUST land in P1 (first regular slot)
// or P6 (last regular slot) so it connects with Morning Session or Extra-Curricular.
// The generator restricts C&G to only those two slots during placement.
const CG_SUBJECTS = new Set(['Cooking and Gardening', 'Cooking & Gardening', 'C&G']);

// Slot numbers that are "after school / extra-curricular" (15:05-15:45).
// Generator applies a heavy score penalty so these are used ONLY as a last resort
// when every regular slot (1-6) is blocked or already occupied for that teacher+class.
const AFTER_SCHOOL_SLOTS = new Set([7]);
// Must be > max possible gap penalty (5 gaps × 80 = 400) so ANY regular slot,
// even with gaps, is always preferred over using an after-school slot.
const AFTER_SCHOOL_PENALTY = 2000;

// Pre-period slot (slot 0, 08:20-09:00 before Period 1).
// Only upper years (Y7, Y8, Y9) start early — lower years can never be
// scheduled here. The pre-period should FILL UP FIRST: every upper-year
// lesson moved to 08:20 frees a regular slot for everyone else
// (part-timers, combined language blocks, ...), so it gets a BONUS.
export const PRE_PERIOD_SLOTS = new Set([0]);
const PRE_PERIOD_CLASS_RE = /^y\s*(7|8|9)\b/i;
export const classAllowedInSlot = (class_name, slot_number) =>
  !PRE_PERIOD_SLOTS.has(slot_number) || PRE_PERIOD_CLASS_RE.test(class_name || '');
const PRE_PERIOD_BONUS = -25;             // Y7-Y9 lessons gladly start early
const PRE_PERIOD_BONUS_CONSTRAINED = -80; // tight-schedule teachers even more so

/** Deterministic Fisher-Yates shuffle using an integer seed. */
function shuffleDeterministic(arr, seed) {
  const result = [...arr];
  let s = (seed + 1) * 1664525 + 1013904223;
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = ((s >>> 0) % (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a timetable from assignments, time slots and availability.
 *
 * @param {Array} assignments    - teacher_assignments rows (with .teacher nested)
 * @param {Array} timeSlots      - time_slots rows (sorted by slot_number)
 * @param {Array} availabilityRecords - teacher_availability rows (is_available=false = blocked)
 * @param {Array} lockedEntries  - existing timetable entries to treat as fixed (Fill Gaps mode)
 * @param {number} seed          - integer seed for deterministic jitter (0 = no jitter)
 * @returns {{ placed: Array, unplaced: Array }}
 *   placed  — entries ready to be saved as draft (no id yet)
 *   unplaced — tasks that could not be scheduled (conflicts/not enough slots)
 */
export function generateTimetable(assignments, timeSlots, availabilityRecords, lockedEntries = [], seed = 0) {
  const slotNumbers = timeSlots.map(s => s.slot_number).sort((a, b) => a - b);

  // Clone locked entries so repair moves never mutate the caller's state.
  // Moved locked entries are reported back via `moved` (they carry .id)
  // so Fill Gaps can persist the new positions.
  lockedEntries = lockedEntries.map(e => ({ ...e }));
  const movedLocked = new Set();

  // Regular slots (P1–P6) vs pre-period (slot 0) and after-school (slot 7+)
  const regularSlotNums = slotNumbers.filter(s => !AFTER_SCHOOL_SLOTS.has(s) && !PRE_PERIOD_SLOTS.has(s));

  // C&G may only go in P1 (first regular slot) or P6 (last regular slot)
  // so the school day connects with Morning Session or Extra-Curricular.
  const cgAllowedSlots = regularSlotNums.length >= 2
    ? [regularSlotNums[0], regularSlotNums[regularSlotNums.length - 1]]
    : regularSlotNums;

  // Valid double pairs: pairs of adjacent regular slots at even indices
  // → (regularSlotNums[0], regularSlotNums[1]), (regularSlotNums[2], regularSlotNums[3]), (regularSlotNums[4], regularSlotNums[5])
  // This gives P1+P2, P3+P4, P5+P6 — never crossing snack or lunch breaks
  const validDoublePairs = [];
  for (let i = 0; i + 1 < regularSlotNums.length; i += 2) {
    validDoublePairs.push([regularSlotNums[i], regularSlotNums[i + 1]]);
  }

  // ---- Build blocked-slot lookup ----
  const blockedKey = (teacher_id, day, slot) => `${teacher_id}|${day}|${slot}`;
  const blocked = new Set(
    availabilityRecords
      .filter(a => !a.is_available)
      .map(a => blockedKey(a.teacher_id, a.day_of_week, a.slot_number))
  );
  const isAvailable = (teacher_id, day, slot) =>
    !blocked.has(blockedKey(teacher_id, day, slot));

  // ---- Initialise grid state ----
  // grid[day][slot][class_name] = placed entry | undefined
  const grid = {};
  // teacherBusy[day][slot] = Set of teacher_ids already in use
  const teacherBusy = {};
  DAYS.forEach(day => {
    grid[day] = {};
    teacherBusy[day] = {};
    slotNumbers.forEach(slot => {
      grid[day][slot] = {};
      teacherBusy[day][slot] = new Set();
    });
  });

  // ---- Build parallel group membership ----
  const parallelGroupSlots = {};

  // ---- Per-class tracking (for even distribution) ----
  const classDayLoad = {};
  // Tracks how many times a subject has been placed for a class on a given day
  const classSubjectDay = {};
  // Tracks how many periods each TEACHER already has on a given day (for balancing)
  const teacherDayLoad = {};

  // Tracks which days each subject has been placed for a class (for weekly spread)
  const subjectDayMap = new Map(); // key: `${class_name}|${subject}` → Set of days already placed

  // Tracks which parallel_group a teacher is assigned to in each slot
  const teacherParallelGroup = {};
  DAYS.forEach(d => {
    teacherParallelGroup[d] = {};
    slotNumbers.forEach(s => { teacherParallelGroup[d][s] = {}; });
  });

  const getLoad = (class_name, day) =>
    (classDayLoad[class_name] || {})[day] || 0;

  const getTeacherLoad = (teacher_id, day) =>
    (teacherDayLoad[teacher_id] || {})[day] || 0;

  const subjectDayKey = (class_name, day, subject) =>
    `${class_name}|${day}|${subject}`;

  // Max periods allowed per subject per class per day
  // Single-period subjects must not appear twice in one day
  const maxPerDay = (subject) => SINGLE_PERIOD_SUBJECTS.has(subject) ? 1 : 2;

  // ---- Pre-populate grid from lockedEntries ----
  lockedEntries.forEach(e => {
    if (!grid[e.day_of_week] || !grid[e.day_of_week][e.slot_number]) return;
    grid[e.day_of_week][e.slot_number][e.class_name] = e;
    if (e.is_double && grid[e.day_of_week][e.slot_number + 1]) {
      grid[e.day_of_week][e.slot_number + 1][e.class_name] = e;
    }
    teacherBusy[e.day_of_week][e.slot_number].add(e.teacher_id);
    if (e.is_double && teacherBusy[e.day_of_week][e.slot_number + 1]) {
      teacherBusy[e.day_of_week][e.slot_number + 1].add(e.teacher_id);
    }

    // Update classSubjectDay
    const sdk = subjectDayKey(e.class_name, e.day_of_week, e.subject);
    classSubjectDay[sdk] = (classSubjectDay[sdk] || 0) + (e.is_double ? 2 : 1);

    // Update classDayLoad
    if (!classDayLoad[e.class_name]) classDayLoad[e.class_name] = {};
    classDayLoad[e.class_name][e.day_of_week] = (classDayLoad[e.class_name][e.day_of_week] || 0) + (e.is_double ? 2 : 1);

    // Update teacherDayLoad
    if (!teacherDayLoad[e.teacher_id]) teacherDayLoad[e.teacher_id] = {};
    teacherDayLoad[e.teacher_id][e.day_of_week] = (teacherDayLoad[e.teacher_id][e.day_of_week] || 0) + (e.is_double ? 2 : 1);

    // Update subjectDayMap
    const spreadKey = `${e.class_name}|${e.subject}`;
    if (!subjectDayMap.has(spreadKey)) subjectDayMap.set(spreadKey, new Set());
    subjectDayMap.get(spreadKey).add(e.day_of_week);

    // Update parallelGroupSlots if applicable
    if (e.parallel_group) {
      if (!parallelGroupSlots[e.parallel_group]) parallelGroupSlots[e.parallel_group] = [];
      if (e.is_double) {
        parallelGroupSlots[e.parallel_group].push({ day: e.day_of_week, slotA: e.slot_number, slotB: e.slot_number + 1 });
      } else {
        parallelGroupSlots[e.parallel_group].push({ day: e.day_of_week, slot: e.slot_number });
      }
    }
  });

  // ---- Weekly spread penalty helper ----
  const weeklySpreadPenalty = (class_name, subject, day) => {
    const key = `${class_name}|${subject}`;
    const usedDays = subjectDayMap.get(key) || new Set();
    let penalty = 0;
    for (const usedDay of usedDays) {
      const dist = Math.abs(day - usedDay);
      if (dist === 1) penalty += 10; // adjacent day — heavy penalty
      if (dist === 2) penalty += 2;  // 2 days apart — light penalty
      // 3+ days apart = no penalty (ideal spread)
    }
    return penalty;
  };

  // ---- Gap penalty helper ----
  // Penalise placements that leave free periods BETWEEN a class's classes on the same day.
  // e.g. class has P1 and P5 → placing at P3 extends the range without gap (OK),
  //      but placing at P7 leaves P6 empty (penalty).
  // This keeps each class's timetable compact so students never have unexplained free periods.
  const getGapPenalty = (class_name, day, slot) => {
    if (AFTER_SCHOOL_SLOTS.has(slot)) return 0; // after-school sits outside regular hours
    if (PRE_PERIOD_SLOTS.has(slot)) return 0;   // pre-period sits before regular hours
    const slotIdx = regularSlotNums.indexOf(slot);
    if (slotIdx < 0) return 0;
    const occupiedIndices = regularSlotNums
      .map((s, i) => (grid[day][s]?.[class_name] ? i : -1))
      .filter(i => i >= 0);
    if (occupiedIndices.length === 0) return 0;
    const minOcc = Math.min(...occupiedIndices);
    const maxOcc = Math.max(...occupiedIndices);
    let gaps = 0;
    if (slotIdx < minOcc) gaps = minOcc - slotIdx - 1;       // placing before current range
    else if (slotIdx > maxOcc) gaps = slotIdx - maxOcc - 1;  // placing after current range
    // placing inside the range (filling a gap) → penalty = 0 (encouraged)
    return gaps * 200;
  };

  // For double classes, take the larger gap of the two slots
  const getGapPenaltyDouble = (class_name, day, slotA, slotB) =>
    Math.max(getGapPenalty(class_name, day, slotA), getGapPenalty(class_name, day, slotB));

  // ---- Helper: check if a single task can go at (day, slot) ----
  // relaxCap=true (Phase 4 last resort) allows ONE extra period of the
  // same subject on the same day rather than leaving the task unplaced.
  const canPlace = (task, day, slot, relaxCap = false) => {
    if (!classAllowedInSlot(task.class_name, slot)) return false;
    if (!isAvailable(task.teacher_id, day, slot)) return false;
    if (teacherBusy[day][slot].has(task.teacher_id)) {
      // Allow same teacher in same slot ONLY for parallel group combined classes
      const existingGroup = teacherParallelGroup[day][slot][task.teacher_id];
      if (!task.parallel_group || existingGroup !== task.parallel_group) return false;
      // Even within the same parallel group, the same teacher cannot revisit the same class
      // in the same slot — this would create a duplicate entry.
      // (Happens when teacher's periods_per_week > sibling teacher's periods_per_week)
      if (grid[day][slot][task.class_name]) return false;
    }
    const existing = grid[day][slot][task.class_name];
    if (existing) {
      // Parallel group tasks may share a slot for the same class (class is split between options)
      const sameGroup = task.parallel_group &&
                        existing.parallel_group &&
                        task.parallel_group === existing.parallel_group;
      if (!sameGroup) return false;
    }
    const cap = maxPerDay(task.subject) + (relaxCap ? 1 : 0);
    if ((classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) >= cap) return false;
    return true;
  };

  // ---- canPlaceDouble helper ----
  const canPlaceDouble = (task, day, slotA, slotB, relaxCap = false) => {
    return canPlace(task, day, slotA, relaxCap) && canPlace(task, day, slotB, relaxCap) &&
      (classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) === 0;
    // The last condition ensures at most one double per subject per day per class
  };

  // ---- Helper: commit a single task to (day, slot) ----
  const commitTask = (task, day, slot) => {
    task._placed = true;  // mark this specific task instance as placed
    grid[day][slot][task.class_name] = task;
    teacherBusy[day][slot].add(task.teacher_id);
    if (task.parallel_group) {
      teacherParallelGroup[day][slot][task.teacher_id] = task.parallel_group;
    }
    if (!classDayLoad[task.class_name]) classDayLoad[task.class_name] = {};
    classDayLoad[task.class_name][day] = getLoad(task.class_name, day) + 1;
    if (!teacherDayLoad[task.teacher_id]) teacherDayLoad[task.teacher_id] = {};
    teacherDayLoad[task.teacher_id][day] = getTeacherLoad(task.teacher_id, day) + 1;
    const sdk = subjectDayKey(task.class_name, day, task.subject);
    classSubjectDay[sdk] = (classSubjectDay[sdk] || 0) + 1;
    // Update subjectDayMap
    const spreadKey = `${task.class_name}|${task.subject}`;
    if (!subjectDayMap.has(spreadKey)) subjectDayMap.set(spreadKey, new Set());
    subjectDayMap.get(spreadKey).add(day);
    placed.push({
      teacher_id: task.teacher_id,
      subject: task.subject,
      class_name: task.class_name,
      day_of_week: day,
      slot_number: slot,
      is_double: false,
      parallel_group: task.parallel_group || null,
    });
  };

  // ---- commitDouble helper ----
  const commitDouble = (task, day, slotA, slotB) => {
    task._placed = true;
    grid[day][slotA][task.class_name] = { ...task, _doubleHalf: 'first' };
    grid[day][slotB][task.class_name] = { ...task, _doubleHalf: 'second' };
    teacherBusy[day][slotA].add(task.teacher_id);
    teacherBusy[day][slotB].add(task.teacher_id);
    if (task.parallel_group) {
      teacherParallelGroup[day][slotA][task.teacher_id] = task.parallel_group;
      teacherParallelGroup[day][slotB][task.teacher_id] = task.parallel_group;
    }
    if (!classDayLoad[task.class_name]) classDayLoad[task.class_name] = {};
    classDayLoad[task.class_name][day] = (classDayLoad[task.class_name][day] || 0) + 2;
    if (!teacherDayLoad[task.teacher_id]) teacherDayLoad[task.teacher_id] = {};
    teacherDayLoad[task.teacher_id][day] = (teacherDayLoad[task.teacher_id][day] || 0) + 2;
    const sdk = subjectDayKey(task.class_name, day, task.subject);
    classSubjectDay[sdk] = (classSubjectDay[sdk] || 0) + 2;
    const spreadKey = `${task.class_name}|${task.subject}`;
    if (!subjectDayMap.has(spreadKey)) subjectDayMap.set(spreadKey, new Set());
    subjectDayMap.get(spreadKey).add(day);
    placed.push({
      teacher_id: task.teacher_id,
      subject: task.subject,
      class_name: task.class_name,
      day_of_week: day,
      slot_number: slotA,
      is_double: true,
      parallel_group: task.parallel_group || null,
    });
  };

  // ---- Placed / unplaced accumulators ----
  const placed = [];
  const unplaced = [];
  // Full task objects that failed Phase 2 — retried in Phase 3 without sibling-sync
  const unplacedTaskRefs = [];
  // A task may fail in the priority round and again in the normal round —
  // queue it only once so Phase 3 doesn't process (and place) it twice.
  const queueUnplaced = (task) => {
    if (!task._queued) { task._queued = true; unplacedTaskRefs.push(task); }
  };

  // ---- Sort helper ----
  const teacherFreeSlots = {};
  assignments.forEach(a => {
    if (teacherFreeSlots[a.teacher_id] !== undefined) return;
    let count = 0;
    DAYS.forEach(day => slotNumbers.forEach(slot => {
      if (isAvailable(a.teacher_id, day, slot)) count++;
    }));
    teacherFreeSlots[a.teacher_id] = count;
  });

  const totalWeeklySlots = DAYS.length * slotNumbers.length;

  // How many periods each teacher must deliver in total
  const teacherRequiredPeriods = {};
  assignments.forEach(a => {
    teacherRequiredPeriods[a.teacher_id] =
      (teacherRequiredPeriods[a.teacher_id] || 0) + (a.periods_per_week || 1);
  });

  // Constrained = little availability OR little slack between what the
  // teacher CAN work and what they MUST teach. A teacher free 25 of 35
  // slots but needing 18 periods (slack 7) is tighter than a full-timer
  // with 35 free and 10 periods (slack 25) — schedule the former first.
  const CONSTRAINED_SLACK = 10;
  const isConstrainedTeacherTask = (task) => {
    const free = teacherFreeSlots[task.teacher_id] ?? totalWeeklySlots;
    const required = teacherRequiredPeriods[task.teacher_id] || 0;
    return free <= totalWeeklySlots * 0.6 || (free - required) <= CONSTRAINED_SLACK;
  };

  // The pre-period fills up first (bonus = negative penalty): upper-year
  // singles flow to 08:20, freeing regular slots for part-timers and
  // combined blocks. Availability and class restrictions still apply.
  const prePeriodPenaltyFor = (task, slot) => {
    if (!PRE_PERIOD_SLOTS.has(slot)) return 0;
    return isConstrainedTeacherTask(task) ? PRE_PERIOD_BONUS_CONSTRAINED : PRE_PERIOD_BONUS;
  };

  // ---- Separate tasks into three buckets ----
  // cgTasks    — C&G (P1/P6 only): scheduled FIRST so doubles don't steal those slots
  // doubleTasks — subjects that should be consecutive double periods
  // singleTasks — everything else
  const cgTasks = [];
  const doubleTasks = [];
  const singleTasks = [];

  assignments.forEach(a => {
    const isCG = CG_SUBJECTS.has(a.subject);
    const isDoubleSubject = DOUBLE_PREFERRED_SUBJECTS.has(a.subject) && !isCG;
    const n = a.periods_per_week || 1;

    if (isCG) {
      for (let i = 0; i < n; i++) {
        cgTasks.push({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_name: a.class_name,
          assignmentId: a.id,
          periods_per_week: a.periods_per_week,
          parallel_group: a.parallel_group || null,
          _isDouble: false,
          _parallelIndex: i,
        });
      }
    } else if (isDoubleSubject && validDoublePairs.length > 0) {
      const numDoubles = Math.floor(n / 2);
      const numSingles = n % 2;
      for (let i = 0; i < numDoubles; i++) {
        doubleTasks.push({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_name: a.class_name,
          assignmentId: a.id,
          periods_per_week: a.periods_per_week,
          parallel_group: a.parallel_group || null,
          _isDouble: true,
          _parallelIndex: i,
        });
      }
      for (let i = 0; i < numSingles; i++) {
        singleTasks.push({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_name: a.class_name,
          assignmentId: a.id,
          periods_per_week: a.periods_per_week,
          parallel_group: a.parallel_group || null,
          _isDouble: false,
          _parallelIndex: numDoubles + i,
        });
      }
    } else {
      for (let i = 0; i < n; i++) {
        singleTasks.push({
          teacher_id: a.teacher_id,
          subject: a.subject,
          class_name: a.class_name,
          assignmentId: a.id,
          periods_per_week: a.periods_per_week,
          parallel_group: a.parallel_group || null,
          _isDouble: false,
          _parallelIndex: i,
        });
      }
    }
  });

  // ---- Sibling count map: more siblings = more constrained = schedule earlier ----
  // e.g. Y5ab-English has 6 tasks/occurrence (Jelena+Ashlie+Sneza × Y5a+Y5b)
  // vs Y3-SerbianSec with 2 tasks/occurrence. Y5ab-English must go first.
  const siblingCountMap = {};
  [...cgTasks, ...doubleTasks, ...singleTasks].forEach(t => {
    if (!t.parallel_group) return;
    const k = `${t.parallel_group}|${t._parallelIndex}`;
    siblingCountMap[k] = (siblingCountMap[k] || 0) + 1;
  });

  const taskSortFn = (a, b) => {
    // Most siblings first (most constrained parallel groups first)
    const aSib = a.parallel_group ? (siblingCountMap[`${a.parallel_group}|${a._parallelIndex}`] || 1) : 0;
    const bSib = b.parallel_group ? (siblingCountMap[`${b.parallel_group}|${b._parallelIndex}`] || 1) : 0;
    if (aSib !== bSib) return bSib - aSib;
    const aHasGroup = a.parallel_group ? 0 : 1;
    const bHasGroup = b.parallel_group ? 0 : 1;
    if (aHasGroup !== bHasGroup) return aHasGroup - bHasGroup;
    const aFree = teacherFreeSlots[a.teacher_id] ?? 99;
    const bFree = teacherFreeSlots[b.teacher_id] ?? 99;
    if (aFree !== bFree) return aFree - bFree;
    return (b.periods_per_week || 0) - (a.periods_per_week || 0);
  };

  // When seed > 0 add a tiny deterministic jitter so each regenerate attempt
  // explores a different (but equally constrained) ordering.
  const jitter = seed > 0
    ? (idx) => (Math.sin(seed * 9301 + idx * 49297 + 12345) * 0.4)
    : () => 0;

  const makeJitteredSort = (arr) => arr.sort((a, b) => {
    const base = taskSortFn(a, b);
    if (base !== 0) return base;
    return jitter(arr.indexOf(a)) - jitter(arr.indexOf(b));
  });

  makeJitteredSort(cgTasks);
  makeJitteredSort(doubleTasks);
  makeJitteredSort(singleTasks);

  // ---- C&G task placement (most slot-restricted: P1 or P6 only) ----
  // Runs before doubles so English/ESL doubles don't claim P1+P2 or P5+P6
  // and leave no legal C&G slot for that class.
  const processCGTask = (task) => {
    if (task._placed) return;

    if (task.parallel_group) {
      // Parallel C&G (Y12-CG, Y34-CG, Y789-CG) — same logic as parallel singles
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;
      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        if (canPlace(task, committed.day, committed.slot)) {
          commitTask(task, committed.day, committed.slot);
        } else {
          queueUnplaced(task);
        }
        return;
      }
      const siblings = cgTasks.filter(
        t => t !== task && t.parallel_group === group && t._parallelIndex === occurrence && !t._placed
      );
      let bestDay = null, bestSlot = null, bestScore = Infinity;
      for (const day of DAYS) {
        for (const slot of cgAllowedSlots) {
          if (!canPlace(task, day, slot)) continue;
          if (!siblings.every(s => canPlace(s, day, slot))) continue;
          const score = getLoad(task.class_name, day) + 0.4 * getTeacherLoad(task.teacher_id, day) + getGapPenalty(task.class_name, day, slot);
          if (score < bestScore) { bestScore = score; bestDay = day; bestSlot = slot; }
        }
      }
      if (bestDay !== null) {
        if (!parallelGroupSlots[group]) parallelGroupSlots[group] = [];
        parallelGroupSlots[group][occurrence] = { day: bestDay, slot: bestSlot };
        commitTask(task, bestDay, bestSlot);
        siblings.forEach(s => { if (!s._placed) commitTask(s, bestDay, bestSlot); });
      } else {
        queueUnplaced(task);
      }
      return;
    }

    // Non-parallel C&G (goes alone)
    let bestDay = null, bestSlot = null, bestScore = Infinity;
    for (const day of DAYS) {
      for (const slot of cgAllowedSlots) {
        if (!canPlace(task, day, slot)) continue;
        const score = getLoad(task.class_name, day) + 0.4 * getTeacherLoad(task.teacher_id, day) + getGapPenalty(task.class_name, day, slot);
        if (score < bestScore) { bestScore = score; bestDay = day; bestSlot = slot; }
      }
    }
    if (bestDay !== null) {
      commitTask(task, bestDay, bestSlot);
    } else {
      queueUnplaced(task);
    }
  };

  // ---- Double task placement ----
  const processDoubleTask = (task) => {
    if (task._placed) return;

    if (task.parallel_group) {
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;
      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        // committed stores {day, slotA, slotB} for doubles
        if (committed.slotB !== undefined) {
          if (canPlaceDouble(task, committed.day, committed.slotA, committed.slotB)) {
            commitDouble(task, committed.day, committed.slotA, committed.slotB);
          } else {
            queueUnplaced(task);
          }
        } else {
          // committed as single - place as single
          if (canPlace(task, committed.day, committed.slot)) {
            commitTask(task, committed.day, committed.slot);
          } else {
            queueUnplaced(task);
          }
        }
        return;
      }

      const siblings = doubleTasks.filter(
        t => t !== task && t.parallel_group === group && t._parallelIndex === occurrence && !t._placed
      );

      let bestDay = null, bestSlotA = null, bestSlotB = null, bestScore = Infinity;
      for (const day of DAYS) {
        for (const [slotA, slotB] of validDoublePairs) {
          if (!canPlaceDouble(task, day, slotA, slotB)) continue;
          if (!siblings.every(s => canPlaceDouble(s, day, slotA, slotB))) continue;
          const score = getLoad(task.class_name, day) + weeklySpreadPenalty(task.class_name, task.subject, day) + 0.4 * getTeacherLoad(task.teacher_id, day) + getGapPenaltyDouble(task.class_name, day, slotA, slotB);
          if (score < bestScore) { bestScore = score; bestDay = day; bestSlotA = slotA; bestSlotB = slotB; }
        }
      }
      if (bestDay !== null) {
        if (!parallelGroupSlots[group]) parallelGroupSlots[group] = [];
        parallelGroupSlots[group][occurrence] = { day: bestDay, slotA: bestSlotA, slotB: bestSlotB };
        commitDouble(task, bestDay, bestSlotA, bestSlotB);
        siblings.forEach(s => { if (!s._placed) commitDouble(s, bestDay, bestSlotA, bestSlotB); });
      } else {
        queueUnplaced(task);
      }
      return;
    }

    // Non-parallel double task
    let bestDay = null, bestSlotA = null, bestSlotB = null, bestScore = Infinity;
    for (const day of DAYS) {
      for (const [slotA, slotB] of validDoublePairs) {
        if (!canPlaceDouble(task, day, slotA, slotB)) continue;
        const score = getLoad(task.class_name, day) + weeklySpreadPenalty(task.class_name, task.subject, day) + 0.4 * getTeacherLoad(task.teacher_id, day) + getGapPenaltyDouble(task.class_name, day, slotA, slotB);
        if (score < bestScore) { bestScore = score; bestDay = day; bestSlotA = slotA; bestSlotB = slotB; }
      }
    }
    if (bestDay !== null) {
      commitDouble(task, bestDay, bestSlotA, bestSlotB);
    } else {
      queueUnplaced(task);
    }
  };

  // ---- Single task placement ----
  const processSingleTask = (task) => {
    if (task._placed) return;

    // ── PARALLEL GROUP LOGIC ─────────────────────────────────
    if (task.parallel_group) {
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;

      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        // Slot already decided
        if (committed.slotB !== undefined) {
          // was committed as double — try to place as double
          if (canPlaceDouble(task, committed.day, committed.slotA, committed.slotB)) {
            commitDouble(task, committed.day, committed.slotA, committed.slotB);
          } else {
            queueUnplaced(task);
          }
        } else {
          if (canPlace(task, committed.day, committed.slot)) {
            commitTask(task, committed.day, committed.slot);
          } else {
            queueUnplaced(task);
          }
        }
        return;
      }

      // No slot committed yet for this occurrence.
      const siblings = singleTasks.filter(
        t => t !== task &&
             t.parallel_group === group &&
             t._parallelIndex === occurrence &&
             !t._placed
      );

      let bestDay = null;
      let bestSlot = null;
      let bestScore = Infinity;

      for (const day of DAYS) {
        for (const slot of slotNumbers) {
          if (!canPlace(task, day, slot)) continue;
          if (!siblings.every(s => canPlace(s, day, slot))) continue;

          // Consecutive / double-period bonus (same logic as normal placement)
          let consecutiveBonus = 0;
          const existingSameSubjectToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
          if (existingSameSubjectToday > 0) {
            if (DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
              const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
              const prevSlot = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
              const prevEntry = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
              const isDirectlyAfter = prevEntry && prevEntry.subject === task.subject;
              consecutiveBonus = isDirectlyAfter ? -50 : -10;
            } else {
              // Low-fond subjects spread out — no second period same day
              consecutiveBonus = 40;
            }
          }

          // Strongly prefer regular slots (1-6) over pre-period (0) and after-school (7+)
          const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
          const prePeriodPenalty = prePeriodPenaltyFor(task, slot);
          const spreadPenalty = weeklySpreadPenalty(task.class_name, task.subject, day);
          const score = getLoad(task.class_name, day) + consecutiveBonus + afterSchoolPenalty + prePeriodPenalty + spreadPenalty + getGapPenalty(task.class_name, day, slot);
          if (score < bestScore) {
            bestScore = score;
            bestDay = day;
            bestSlot = slot;
          }
        }
      }

      if (bestDay !== null) {
        if (!parallelGroupSlots[group]) parallelGroupSlots[group] = [];
        parallelGroupSlots[group][occurrence] = { day: bestDay, slot: bestSlot };
        commitTask(task, bestDay, bestSlot);
        siblings.forEach(s => { if (!s._placed) commitTask(s, bestDay, bestSlot); });
      } else {
        queueUnplaced(task);
      }
      return;
    }

    // ── NORMAL (non-parallel) PLACEMENT ─────────────────────
    // (C&G tasks are pre-processed via processCGTask — not present here)
    const slotsToTry = slotNumbers;

    let bestDay = null;
    let bestSlot = null;
    let bestScore = Infinity;

    for (const day of DAYS) {
      for (const slot of slotsToTry) {
        if (!canPlace(task, day, slot)) continue;
        const existingSameSubjectToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
        const loadScore = getLoad(task.class_name, day);

        const teacherLoadScore = 0.4 * getTeacherLoad(task.teacher_id, day);

        // Consecutive / double-period bonus
        let consecutiveBonus = 0;
        if (existingSameSubjectToday > 0) {
          if (DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
            const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
            const prevSlot = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
            const prevEntry = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
            const isDirectlyAfter = prevEntry && prevEntry.subject === task.subject;
            consecutiveBonus = isDirectlyAfter ? -50 : -10;
          } else {
            // Low-fond subjects (e.g. French 2×/week) should be spread out:
            // a second period of the same subject on the same day is
            // discouraged, not rewarded.
            consecutiveBonus = 40;
          }
        }

        const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
        const prePeriodPenalty = prePeriodPenaltyFor(task, slot);
        const spreadPenalty = weeklySpreadPenalty(task.class_name, task.subject, day);
        const score = loadScore + teacherLoadScore + consecutiveBonus + afterSchoolPenalty + prePeriodPenalty + spreadPenalty + getGapPenalty(task.class_name, day, slot);
        if (score < bestScore) {
          bestScore = score;
          bestDay = day;
          bestSlot = slot;
        }
      }
    }

    if (bestDay !== null) {
      commitTask(task, bestDay, bestSlot);
    } else {
      queueUnplaced(task);
    }
  };

  // ============================================================
  // TWO SCHEDULING ROUNDS — constrained (part-time) teachers first.
  //
  // A part-timer's few available slots are precious: if full-time
  // teachers' lessons are placed first, they occupy the class's grid
  // exactly where the part-timer could have taught. So every task of
  // a teacher whose availability is limited (≤ 60% of the week free)
  // is scheduled BEFORE the rest, in the same CG → doubles → singles
  // order. Group siblings placed along the way keep their sync.
  // ============================================================
  // Round 1: part-time / heavily blocked teachers
  cgTasks.filter(isConstrainedTeacherTask).forEach(processCGTask);
  doubleTasks.filter(isConstrainedTeacherTask).forEach(processDoubleTask);
  singleTasks.filter(isConstrainedTeacherTask).forEach(processSingleTask);

  // Round 2: everyone else (tasks already placed are skipped)
  cgTasks.forEach(processCGTask);
  doubleTasks.forEach(processDoubleTask);
  singleTasks.forEach(processSingleTask);

  // ============================================================
  // PHASE 3: Relaxed fallback — retry EVERY unplaced task.
  // Parallel-group sync is dropped (better a lesson out of sync than
  // no lesson); failed doubles retry as a double first, then split
  // into two independent single periods.
  // ============================================================
  const findBestSingle = (task, relaxCap) => {
    let bestDay = null, bestSlot = null, bestScore = Infinity;
    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        if (!canPlace(task, day, slot, relaxCap)) continue;
        const loadScore = getLoad(task.class_name, day);
        const teacherLoadScore = 0.4 * getTeacherLoad(task.teacher_id, day);
        let consecutiveBonus = 0;
        const sameToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
        if (sameToday > 0) {
          if (DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
            const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
            const prevSlot   = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
            const prevEntry  = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
            consecutiveBonus = (prevEntry && prevEntry.subject === task.subject) ? -50 : -10;
          } else {
            consecutiveBonus = 40; // spread low-fond subjects
          }
        }
        const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
        const prePeriodPenalty = prePeriodPenaltyFor(task, slot);
        const spreadPenalty = weeklySpreadPenalty(task.class_name, task.subject, day);
        const score = loadScore + teacherLoadScore + consecutiveBonus + afterSchoolPenalty + prePeriodPenalty + spreadPenalty + getGapPenalty(task.class_name, day, slot);
        if (score < bestScore) { bestScore = score; bestDay = day; bestSlot = slot; }
      }
    }
    return bestDay !== null ? { day: bestDay, slot: bestSlot } : null;
  };

  const findBestDouble = (task, relaxCap) => {
    let best = null, bestScore = Infinity;
    for (const day of DAYS) {
      for (const [slotA, slotB] of validDoublePairs) {
        if (!canPlaceDouble(task, day, slotA, slotB, relaxCap)) continue;
        const score = getLoad(task.class_name, day)
          + weeklySpreadPenalty(task.class_name, task.subject, day)
          + 0.4 * getTeacherLoad(task.teacher_id, day)
          + getGapPenaltyDouble(task.class_name, day, slotA, slotB);
        if (score < bestScore) { bestScore = score; best = { day, slotA, slotB }; }
      }
    }
    return best;
  };

  // Explain WHY a task has no feasible slot — shown in the unplaced list
  // so the admin knows what to change (availability, assignments, load).
  const diagnoseTask = (task) => {
    let classFull = 0, blocked = 0, busy = 0, capped = 0, candidates = 0;
    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        if (!classAllowedInSlot(task.class_name, slot)) continue;
        candidates++;
        if (grid[day][slot][task.class_name]) { classFull++; continue; }
        if (!isAvailable(task.teacher_id, day, slot)) { blocked++; continue; }
        if (teacherBusy[day][slot].has(task.teacher_id)) { busy++; continue; }
        capped++;
      }
    }
    if (candidates === classFull) return 'class timetable is completely full';
    if (capped > 0) return 'daily limit for this subject reached in every free slot';
    if (blocked >= busy) return 'teacher marked unavailable in every free slot of this class — check Availability';
    return 'teacher already teaching another class in every free slot of this class';
  };

  // ---- Move an already-placed entry to a new day/slot (full bookkeeping) ----
  const moveEntry = (entry, newDay, newSlot) => {
    const oldDay = entry.day_of_week, oldSlot = entry.slot_number;
    delete grid[oldDay][oldSlot][entry.class_name];
    teacherBusy[oldDay][oldSlot].delete(entry.teacher_id);
    const oldSdk = subjectDayKey(entry.class_name, oldDay, entry.subject);
    classSubjectDay[oldSdk] = Math.max(0, (classSubjectDay[oldSdk] || 0) - 1);
    classDayLoad[entry.class_name][oldDay] = Math.max(0, (classDayLoad[entry.class_name]?.[oldDay] || 0) - 1);
    teacherDayLoad[entry.teacher_id][oldDay] = Math.max(0, (teacherDayLoad[entry.teacher_id]?.[oldDay] || 0) - 1);

    grid[newDay][newSlot][entry.class_name] = entry;
    teacherBusy[newDay][newSlot].add(entry.teacher_id);
    const newSdk = subjectDayKey(entry.class_name, newDay, entry.subject);
    classSubjectDay[newSdk] = (classSubjectDay[newSdk] || 0) + 1;
    if (!classDayLoad[entry.class_name]) classDayLoad[entry.class_name] = {};
    classDayLoad[entry.class_name][newDay] = (classDayLoad[entry.class_name][newDay] || 0) + 1;
    if (!teacherDayLoad[entry.teacher_id]) teacherDayLoad[entry.teacher_id] = {};
    teacherDayLoad[entry.teacher_id][newDay] = (teacherDayLoad[entry.teacher_id][newDay] || 0) + 1;
    entry.day_of_week = newDay;
    entry.slot_number = newSlot;
  };

  // ---- PHASE 5 repair: displace a blocking lesson ----
  // The class has a free slot where the teacher is available but busy
  // with ANOTHER class. If that other lesson (simple single, no group,
  // no double) can move somewhere else, move it and place our task in
  // the freed slot. This is exactly what a human does by hand.
  const tryRepair = (task) => {
    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        if (!classAllowedInSlot(task.class_name, slot)) continue;
        if (grid[day][slot][task.class_name]) continue;           // class busy here
        if (!isAvailable(task.teacher_id, day, slot)) continue;   // teacher blocked here
        const cap = maxPerDay(task.subject) + 1;                  // relaxed cap (last resort)
        if ((classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) >= cap) continue;

        if (!teacherBusy[day][slot].has(task.teacher_id)) {
          commitTask({ ...task, _isDouble: false }, day, slot);
          return true;
        }

        // Teacher is busy — who blocks this slot? Search both freshly
        // placed entries AND locked (existing draft) entries: in Fill
        // Gaps mode the whole draft is locked, and being allowed to
        // shuffle it is exactly what makes the repair useful.
        const blockers = [...placed, ...lockedEntries].filter(p =>
          p.teacher_id === task.teacher_id &&
          p.day_of_week === day &&
          (p.slot_number === slot || (p.is_double && p.slot_number + 1 === slot))
        );
        if (blockers.length !== 1) continue;
        const b = blockers[0];
        if (b.is_double || b.parallel_group) continue; // don't break pairs/groups

        // Find a new home for the blocking lesson
        for (const d2 of DAYS) {
          for (const s2 of slotNumbers) {
            if (d2 === day && s2 === slot) continue;
            if (!classAllowedInSlot(b.class_name, s2)) continue;
            if (grid[d2][s2][b.class_name]) continue;
            if (!isAvailable(b.teacher_id, d2, s2)) continue;
            if (teacherBusy[d2][s2].has(b.teacher_id)) continue;
            if ((classSubjectDay[subjectDayKey(b.class_name, d2, b.subject)] || 0) >= maxPerDay(b.subject)) continue;

            moveEntry(b, d2, s2);
            if (b.id !== undefined && lockedEntries.includes(b)) movedLocked.add(b);
            commitTask({ ...task, _isDouble: false }, day, slot);
            return true;
          }
        }
      }
    }
    return false;
  };

  const stillUnplaced = [];
  for (const task of unplacedTaskRefs) {
    // A task queued in round 1 may have been placed in round 2 (or as a
    // group sibling) — skip it so it isn't scheduled twice.
    if (task._placed) continue;
    if (task._isDouble) {
      const d = findBestDouble(task, false);
      if (d) { commitDouble(task, d.day, d.slotA, d.slotB); continue; }
      // Split the failed double into two independent singles
      let remaining = 2;
      for (let i = 0; i < 2; i++) {
        const s = findBestSingle(task, false);
        if (!s) break;
        commitTask({ ...task, _isDouble: false }, s.day, s.slot);
        remaining--;
      }
      if (remaining > 0) stillUnplaced.push({ task, remaining });
      continue;
    }
    const s = findBestSingle(task, false);
    if (s) { commitTask(task, s.day, s.slot); continue; }
    stillUnplaced.push({ task, remaining: 1 });
  }

  // ============================================================
  // PHASE 4: last resort — allow one extra period of the same
  // subject per day (cap+1) before giving up.
  // PHASE 5: repair — displace a movable blocking lesson to free
  // a slot for the task (see tryRepair above).
  // ============================================================
  for (const item of stillUnplaced) {
    let left = item.remaining;
    while (left > 0) {
      const s = findBestSingle(item.task, true);
      if (!s) break;
      commitTask({ ...item.task, _isDouble: false }, s.day, s.slot);
      left--;
    }
    for (let i = 0; i < left; i++) {
      if (tryRepair(item.task)) continue;
      unplaced.push({
        teacher_id: item.task.teacher_id,
        subject: item.task.subject,
        class_name: item.task.class_name,
        reason: diagnoseTask(item.task),
      });
    }
  }

  // ============================================================
  // POST-PROCESS: compact gaps — unified, includes parallel groups
  //
  // For each class on each day that has a gap between its entries:
  //   Try to find an entry for that class on a DIFFERENT day that:
  //     a) Is NOT a double-period entry (those are locked as pairs)
  //     b) If parallel group → all siblings move together
  //     c) After removal, that day's remaining entries are still compact
  //     d) The teacher(s) are free at the gap slot on the target day
  //
  // Run up to 10 passes until no more moves are possible.
  // ============================================================
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;

    // Build (class, day) → entries index (refresh each pass)
    const buildIdx = () => {
      const idx = {};
      for (const p of placed) {
        const key = `${p.class_name}|${p.day_of_week}`;
        if (!idx[key]) idx[key] = [];
        idx[key].push(p);
      }
      return idx;
    };
    const byClassDay = buildIdx();

    for (const class_name of new Set(placed.map(p => p.class_name))) {
      if (changed) break; // restart pass after any move

      for (const targetDay of DAYS) {
        if (changed) break;

        // All entries for this class on targetDay (non-double, regular slots)
        const dayEntries = (byClassDay[`${class_name}|${targetDay}`] || [])
          .filter(p => !p.is_double && !AFTER_SCHOOL_SLOTS.has(p.slot_number) && !PRE_PERIOD_SLOTS.has(p.slot_number))
          .sort((a, b) => a.slot_number - b.slot_number);

        if (dayEntries.length < 2) continue;

        const idxOf = (slot) => regularSlotNums.indexOf(slot);
        const minIdx = idxOf(dayEntries[0].slot_number);
        const maxIdx = idxOf(dayEntries[dayEntries.length - 1].slot_number);
        if (maxIdx - minIdx + 1 === dayEntries.length) continue; // already compact

        // Find the first gap slot
        let gapSlot = null;
        for (let i = minIdx; i <= maxIdx; i++) {
          if (!grid[targetDay][regularSlotNums[i]]?.[class_name]) {
            gapSlot = regularSlotNums[i];
            break;
          }
        }
        if (gapSlot === null) continue;

        // Try to fill gapSlot by moving an entry from another day
        for (const srcDay of DAYS) {
          if (srcDay === targetDay || changed) continue;

          const srcAllEntries = (byClassDay[`${class_name}|${srcDay}`] || [])
            .filter(p => !p.is_double && !AFTER_SCHOOL_SLOTS.has(p.slot_number) && !PRE_PERIOD_SLOTS.has(p.slot_number));

          for (const src of srcAllEntries) {
            // Find siblings (same parallel_group, same day, same slot)
            const siblings = src.parallel_group
              ? placed.filter(p =>
                  p !== src &&
                  p.parallel_group === src.parallel_group &&
                  p.day_of_week === srcDay &&
                  p.slot_number === src.slot_number
                )
              : [];
            const allToMove = [src, ...siblings];

            // Check that removing src leaves this class's entries on srcDay compact
            const remaining = srcAllEntries.filter(e => e !== src);
            if (remaining.length >= 2) {
              const remIdxs = remaining
                .map(e => idxOf(e.slot_number))
                .filter(i => i >= 0)
                .sort((a, b) => a - b);
              const remMin = remIdxs[0], remMax = remIdxs[remIdxs.length - 1];
              if (remMax - remMin + 1 !== remIdxs.length) continue; // would leave a gap
            }

            // Check all allToMove can go to (targetDay, gapSlot)
            if (!allToMove.every(p => isAvailable(p.teacher_id, targetDay, gapSlot))) continue;
            if (allToMove.some(p => teacherBusy[targetDay][gapSlot].has(p.teacher_id))) continue;

            // Perform the move
            for (const p of allToMove) {
              delete grid[srcDay][p.slot_number][p.class_name];
              teacherBusy[srcDay][p.slot_number].delete(p.teacher_id);
              grid[targetDay][gapSlot][p.class_name] = p;
              teacherBusy[targetDay][gapSlot].add(p.teacher_id);
              p.day_of_week = targetDay;
              p.slot_number = gapSlot;
            }

            // Update index
            byClassDay[`${class_name}|${srcDay}`] = remaining;
            if (!byClassDay[`${class_name}|${targetDay}`]) byClassDay[`${class_name}|${targetDay}`] = [];
            byClassDay[`${class_name}|${targetDay}`].push(src);

            changed = true;
            break;
          }
        }
      }
    }

    if (!changed) break; // converged
  }

  // ============================================================
  // POST-PROCESS PHASE 2: intra-day slide compaction.
  //
  // After cross-day compaction, a class may still have gaps within
  // a single day because teacher availability prevented filling them
  // from other days.  Example: Y9 Mon has P1 and P5; nobody was free
  // at P2-P4 on other days to move in.
  //
  // Strategy: slide each entry forward (toward smaller slot indices)
  // to be directly adjacent to the entry before it, as long as the
  // teacher is free at the new slot.  Parallel-group siblings are
  // always moved together.
  //
  // Run multiple passes because one slide may open space for the next.
  // ============================================================
  for (let slidePass = 0; slidePass < 8; slidePass++) {
    let slideChanged = false;

    for (const class_name of new Set(placed.map(p => p.class_name))) {
      for (const day of DAYS) {
        const dayEntries = placed
          .filter(p =>
            p.class_name === class_name &&
            p.day_of_week === day &&
            !p.is_double &&
            !AFTER_SCHOOL_SLOTS.has(p.slot_number) &&
            !PRE_PERIOD_SLOTS.has(p.slot_number)
          )
          .sort((a, b) => a.slot_number - b.slot_number);

        if (dayEntries.length < 2) continue;

        for (let i = 1; i < dayEntries.length; i++) {
          const entry = dayEntries[i];
          const prevSlotIdx = regularSlotNums.indexOf(dayEntries[i - 1].slot_number);
          const curSlotIdx  = regularSlotNums.indexOf(entry.slot_number);
          if (curSlotIdx === prevSlotIdx + 1) continue; // already adjacent

          const targetSlot = regularSlotNums[prevSlotIdx + 1];
          if (targetSlot === undefined) continue;
          if (grid[day][targetSlot]?.[class_name]) continue; // occupied by this class already

          // Collect siblings (parallel group entries at same slot/day)
          const siblings = entry.parallel_group
            ? placed.filter(p =>
                p !== entry &&
                p.parallel_group === entry.parallel_group &&
                p.day_of_week === day &&
                p.slot_number === entry.slot_number
              )
            : [];
          const allToSlide = [entry, ...siblings];

          if (!allToSlide.every(p => isAvailable(p.teacher_id, day, targetSlot))) continue;
          if (allToSlide.some(p => teacherBusy[day][targetSlot].has(p.teacher_id))) continue;

          // Slide
          for (const p of allToSlide) {
            delete grid[day][p.slot_number][p.class_name];
            teacherBusy[day][p.slot_number].delete(p.teacher_id);
            grid[day][targetSlot][p.class_name] = p;
            teacherBusy[day][targetSlot].add(p.teacher_id);
            p.slot_number = targetSlot;
          }
          slideChanged = true;
          break; // restart this day
        }
      }
    }

    if (!slideChanged) break;
  }

  // Doubles are now placed atomically with is_double: true — no merging needed.
  // `moved` = locked (existing draft) entries the repair phase relocated;
  // the caller must persist their new day_of_week/slot_number.
  return { placed, unplaced, moved: [...movedLocked] };
}

/**
 * Scan placed entries for same class+day+subject at consecutive slots.
 * Merges them: first entry gets is_double=true, second is removed.
 * Kept for reference / test compatibility — not called from generateTimetable.
 */
function mergeDoubleClasses(placed, slotNumbers) {
  // Group by class+day+subject
  const groups = {};
  placed.forEach((e, idx) => {
    const key = `${e.class_name}|${e.day_of_week}|${e.subject}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...e, _idx: idx });
  });

  const toRemove = new Set();

  Object.values(groups).forEach(entries => {
    if (entries.length < 2) return;
    // Sort by slot_number
    entries.sort((a, b) => a.slot_number - b.slot_number);
    // Find consecutive pairs
    for (let i = 0; i < entries.length - 1; i++) {
      const curr = entries[i];
      const next = entries[i + 1];
      const currSlotIndex = slotNumbers.indexOf(curr.slot_number);
      const nextSlotIndex = slotNumbers.indexOf(next.slot_number);
      if (nextSlotIndex === currSlotIndex + 1 && !toRemove.has(curr._idx)) {
        // Mark first as double, schedule second for removal
        placed[curr._idx].is_double = true;
        toRemove.add(next._idx);
        i++; // skip next — already merged
      }
    }
  });

  return placed.filter((_, idx) => !toRemove.has(idx));
}

/**
 * Detect conflicts in a list of timetable entries.
 * Entries with is_double=true also "occupy" slot_number+1 for conflict purposes.
 * Returns a Set of entry IDs that have conflicts.
 *
 * @param {Array} entries - timetable_entries rows (with .id)
 * @returns {Set<string>} conflictIds
 */
export function detectConflicts(entries) {
  const conflictIds = new Set();

  // Expand double entries to cover two slots
  const expanded = [];
  entries.forEach(e => {
    expanded.push({ ...e, _slot: e.slot_number });
    if (e.is_double) {
      expanded.push({ ...e, _slot: e.slot_number + 1, _isExpanded: true });
    }
  });

  // Group by (day, effective slot)
  const byDaySlot = {};
  expanded.forEach(e => {
    const key = `${e.day_of_week}|${e._slot}`;
    if (!byDaySlot[key]) byDaySlot[key] = [];
    byDaySlot[key].push(e);
  });

  Object.values(byDaySlot).forEach(group => {
    // Teacher double-booking: same teacher_id in same slot
    // Exception: same teacher in same parallel_group = combined class (Y5a+Y5b together)
    const teacherSeen = {}; // teacher_id → { id, parallel_group }
    group.forEach(e => {
      const prev = teacherSeen[e.teacher_id];
      if (prev) {
        const isCombinedClass = e.parallel_group &&
                                prev.parallel_group &&
                                e.parallel_group === prev.parallel_group;
        if (!isCombinedClass) {
          conflictIds.add(e.id);
          conflictIds.add(prev.id);
        }
      } else {
        teacherSeen[e.teacher_id] = { id: e.id, parallel_group: e.parallel_group || null };
      }
    });

    // Class double-booking: same class_name in same slot
    // Exception: same class split into parallel groups (e.g. Y5a English + Y5a ESL)
    const classSeen = {}; // class_name → { id, parallel_group }
    group.forEach(e => {
      const prev = classSeen[e.class_name];
      if (prev) {
        const isSplitClass = e.parallel_group &&
                             prev.parallel_group &&
                             e.parallel_group === prev.parallel_group;
        if (!isSplitClass) {
          conflictIds.add(e.id);
          conflictIds.add(prev.id);
        }
      } else {
        classSeen[e.class_name] = { id: e.id, parallel_group: e.parallel_group || null };
      }
    });
  });

  return conflictIds;
}
