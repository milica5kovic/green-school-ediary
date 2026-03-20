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
const AFTER_SCHOOL_PENALTY = 200; // much higher than any realistic day-load score

/**
 * Generate a timetable from assignments, time slots and availability.
 *
 * @param {Array} assignments    - teacher_assignments rows (with .teacher nested)
 * @param {Array} timeSlots      - time_slots rows (sorted by slot_number)
 * @param {Array} availabilityRecords - teacher_availability rows (is_available=false = blocked)
 * @param {Array} lockedEntries  - existing timetable entries to treat as fixed (Fill Gaps mode)
 * @returns {{ placed: Array, unplaced: Array }}
 *   placed  — entries ready to be saved as draft (no id yet)
 *   unplaced — tasks that could not be scheduled (conflicts/not enough slots)
 */
export function generateTimetable(assignments, timeSlots, availabilityRecords, lockedEntries = []) {
  const slotNumbers = timeSlots.map(s => s.slot_number).sort((a, b) => a - b);

  // Regular slots (P1–P6) vs after-school (slot 7+)
  const regularSlotNums = slotNumbers.filter(s => !AFTER_SCHOOL_SLOTS.has(s));

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
      if (dist === 1) penalty += 4; // adjacent day — heavy penalty
      if (dist === 2) penalty += 1; // 2 days apart — light penalty
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
    return gaps * 80;
  };

  // For double classes, take the larger gap of the two slots
  const getGapPenaltyDouble = (class_name, day, slotA, slotB) =>
    Math.max(getGapPenalty(class_name, day, slotA), getGapPenalty(class_name, day, slotB));

  // ---- Helper: check if a single task can go at (day, slot) ----
  const canPlace = (task, day, slot) => {
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
    if ((classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) >= maxPerDay(task.subject)) return false;
    return true;
  };

  // ---- canPlaceDouble helper ----
  const canPlaceDouble = (task, day, slotA, slotB) => {
    return canPlace(task, day, slotA) && canPlace(task, day, slotB) &&
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

  cgTasks.sort(taskSortFn);
  doubleTasks.sort(taskSortFn);
  singleTasks.sort(taskSortFn);

  // ---- Process C&G tasks FIRST (most slot-restricted: P1 or P6 only) ----
  // Must run before doubles so English/ESL doubles don't claim P1+P2 or P5+P6
  // and leave no legal C&G slot for that class.
  for (const task of cgTasks) {
    if (task._placed) continue;

    if (task.parallel_group) {
      // Parallel C&G (Y12-CG, Y34-CG, Y789-CG) — same logic as parallel singles
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;
      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        if (canPlace(task, committed.day, committed.slot)) {
          commitTask(task, committed.day, committed.slot);
        } else {
          unplacedTaskRefs.push(task);
        }
        continue;
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
        unplacedTaskRefs.push(task);
      }
      continue;
    }

    // Non-parallel C&G (Y5a, Y5b, Y6 go alone)
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
      unplacedTaskRefs.push(task);
    }
  }

  // ---- Process double tasks NEXT ----
  for (const task of doubleTasks) {
    if (task._placed) continue;

    if (task.parallel_group) {
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;
      if (task._placed) continue;
      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        // committed stores {day, slotA, slotB} for doubles
        if (committed.slotB !== undefined) {
          if (canPlaceDouble(task, committed.day, committed.slotA, committed.slotB)) {
            commitDouble(task, committed.day, committed.slotA, committed.slotB);
          } else {
            unplacedTaskRefs.push(task);
          }
        } else {
          // committed as single - place as single
          if (canPlace(task, committed.day, committed.slot)) {
            commitTask(task, committed.day, committed.slot);
          } else {
            unplacedTaskRefs.push(task);
          }
        }
        continue;
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
        unplacedTaskRefs.push(task);
      }
      continue;
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
      unplacedTaskRefs.push(task);
    }
  }

  // ---- Process single tasks ----
  for (const task of singleTasks) {
    // ── PARALLEL GROUP LOGIC ─────────────────────────────────
    if (task.parallel_group) {
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;

      if (task._placed) continue;

      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        // Slot already decided
        if (committed.slotB !== undefined) {
          // was committed as double — try to place as double
          if (canPlaceDouble(task, committed.day, committed.slotA, committed.slotB)) {
            commitDouble(task, committed.day, committed.slotA, committed.slotB);
          } else {
            unplacedTaskRefs.push(task);
          }
        } else {
          if (canPlace(task, committed.day, committed.slot)) {
            commitTask(task, committed.day, committed.slot);
          } else {
            unplacedTaskRefs.push(task);
          }
        }
        continue;
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
          if (existingSameSubjectToday > 0 && DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
            const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
            const prevSlot = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
            const prevEntry = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
            const isDirectlyAfter = prevEntry && prevEntry.subject === task.subject;
            consecutiveBonus = isDirectlyAfter ? -50 : -10;
          }

          // Strongly prefer regular slots (1-6) over after-school slots (7+)
          const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
          const score = getLoad(task.class_name, day) + consecutiveBonus + afterSchoolPenalty + getGapPenalty(task.class_name, day, slot);
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
        unplacedTaskRefs.push(task);
      }
      continue;
    }

    // ── NORMAL (non-parallel) PLACEMENT ─────────────────────
    // (C&G tasks are pre-processed in the cgTasks loop above — not present here)
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
            consecutiveBonus = -0.5;
          }
        }

        const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
        const spreadPenalty = weeklySpreadPenalty(task.class_name, task.subject, day);
        const score = loadScore + teacherLoadScore + consecutiveBonus + afterSchoolPenalty + spreadPenalty + getGapPenalty(task.class_name, day, slot);
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
      unplacedTaskRefs.push(task);
    }
  }

  // ============================================================
  // PHASE 3: Relaxed fallback — ONLY for French / German
  // ============================================================
  const PHASE3_SUBJECTS = new Set(['French', 'German']);

  for (const task of unplacedTaskRefs) {
    if (!PHASE3_SUBJECTS.has(task.subject)) {
      // Must keep parallel-group timing — leave for manual placement
      unplaced.push({ teacher_id: task.teacher_id, subject: task.subject, class_name: task.class_name });
      continue;
    }

    // French / German: find the best free slot ignoring sibling sync
    let bestDay = null;
    let bestSlot = null;
    let bestScore = Infinity;

    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        if (!canPlace(task, day, slot)) continue;

        const existingSameSubjectToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
        const loadScore = getLoad(task.class_name, day);
        let consecutiveBonus = 0;
        if (existingSameSubjectToday > 0 && DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
          const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
          const prevSlot   = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
          const prevEntry  = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
          consecutiveBonus = (prevEntry && prevEntry.subject === task.subject) ? -50 : -10;
        }
        const teacherLoadScore = 0.4 * getTeacherLoad(task.teacher_id, day);
        const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
        const score = loadScore + teacherLoadScore + consecutiveBonus + afterSchoolPenalty + getGapPenalty(task.class_name, day, slot);
        if (score < bestScore) { bestScore = score; bestDay = day; bestSlot = slot; }
      }
    }

    if (bestDay !== null) {
      commitTask(task, bestDay, bestSlot);
    } else {
      unplaced.push({ teacher_id: task.teacher_id, subject: task.subject, class_name: task.class_name });
    }
  }

  // Doubles are now placed atomically with is_double: true — no merging needed.
  return { placed, unplaced };
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
