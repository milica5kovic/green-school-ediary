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
 * @returns {{ placed: Array, unplaced: Array }}
 *   placed  — entries ready to be saved as draft (no id yet)
 *   unplaced — tasks that could not be scheduled (conflicts/not enough slots)
 */
export function generateTimetable(assignments, timeSlots, availabilityRecords) {
  const slotNumbers = timeSlots.map(s => s.slot_number).sort((a, b) => a - b);

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

  // ---- Expand assignments into individual "tasks" ----
  const tasks = [];
  assignments.forEach(a => {
    for (let i = 0; i < (a.periods_per_week || 1); i++) {
      tasks.push({
        teacher_id: a.teacher_id,
        subject: a.subject,
        class_name: a.class_name,
        assignmentId: a.id,
        periods_per_week: a.periods_per_week || 1,
        parallel_group: a.parallel_group || null,
        // Tag which occurrence within the group this is (for multi-period parallel groups)
        _parallelIndex: i,
      });
    }
  });

  // ---- Build parallel group membership: group → all tasks in that group ----
  // Parallel groups: assignments sharing the same parallel_group must be placed
  // in the same day+slot (e.g., French and German run simultaneously).
  // parallelGroupSlots tracks which (day, slot) have been committed per group.
  // Structure: { groupName: [ {day, slot}, ... ] }  — one entry per period occurrence
  const parallelGroupSlots = {};

  // ---- Sort tasks: most constrained teachers first, parallel groups first ----
  const teacherFreeSlots = {};
  assignments.forEach(a => {
    if (teacherFreeSlots[a.teacher_id] !== undefined) return;
    let count = 0;
    DAYS.forEach(day => slotNumbers.forEach(slot => {
      if (isAvailable(a.teacher_id, day, slot)) count++;
    }));
    teacherFreeSlots[a.teacher_id] = count;
  });

  tasks.sort((a, b) => {
    // Parallel-group tasks come first (they constrain others)
    const aHasGroup = a.parallel_group ? 0 : 1;
    const bHasGroup = b.parallel_group ? 0 : 1;
    if (aHasGroup !== bHasGroup) return aHasGroup - bHasGroup;
    const aFree = teacherFreeSlots[a.teacher_id] ?? 99;
    const bFree = teacherFreeSlots[b.teacher_id] ?? 99;
    if (aFree !== bFree) return aFree - bFree;
    return (b.periods_per_week || 0) - (a.periods_per_week || 0);
  });

  // ---- Per-class tracking (for even distribution) ----
  const classDayLoad = {};
  // Tracks how many times a subject has been placed for a class on a given day
  const classSubjectDay = {};

  const getLoad = (class_name, day) =>
    (classDayLoad[class_name] || {})[day] || 0;

  const subjectDayKey = (class_name, day, subject) =>
    `${class_name}|${day}|${subject}`;

  // Max periods allowed per subject per class per day
  // Single-period subjects (e.g. Maths) must not appear twice in one day
  const maxPerDay = (subject) => SINGLE_PERIOD_SUBJECTS.has(subject) ? 1 : 2;

  // ---- Place tasks greedily ----
  const placed = [];
  const unplaced = [];

  // Tracks which parallel_group a teacher is assigned to in each slot
  // Allows same teacher to teach combined classes (e.g. Y5a+Y5b English together)
  // Structure: teacherParallelGroup[day][slot][teacher_id] = parallel_group
  const teacherParallelGroup = {};
  DAYS.forEach(d => {
    teacherParallelGroup[d] = {};
    slotNumbers.forEach(s => { teacherParallelGroup[d][s] = {}; });
  });

  // Helper: check if a single task can go at (day, slot)
  const canPlace = (task, day, slot) => {
    if (!isAvailable(task.teacher_id, day, slot)) return false;
    if (teacherBusy[day][slot].has(task.teacher_id)) {
      // Allow same teacher in same slot for parallel group combined classes
      // (e.g. Y5a and Y5b English taught together by the same teacher)
      const existingGroup = teacherParallelGroup[day][slot][task.teacher_id];
      if (!task.parallel_group || existingGroup !== task.parallel_group) return false;
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

  // Helper: commit a task to (day, slot)
  const commitTask = (task, day, slot) => {
    task._placed = true;  // mark this specific task instance as placed
    grid[day][slot][task.class_name] = task;
    teacherBusy[day][slot].add(task.teacher_id);
    if (task.parallel_group) {
      teacherParallelGroup[day][slot][task.teacher_id] = task.parallel_group;
    }
    if (!classDayLoad[task.class_name]) classDayLoad[task.class_name] = {};
    classDayLoad[task.class_name][day] = getLoad(task.class_name, day) + 1;
    const sdk = subjectDayKey(task.class_name, day, task.subject);
    classSubjectDay[sdk] = (classSubjectDay[sdk] || 0) + 1;
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

  for (const task of tasks) {
    // ── PARALLEL GROUP LOGIC ─────────────────────────────────
    if (task.parallel_group) {
      const group = task.parallel_group;
      const occurrence = task._parallelIndex;

      // Check if this occurrence of the group already has a committed slot
      const committed = parallelGroupSlots[group]?.[occurrence];
      if (committed) {
        // Slot already decided by another task in the group — use same slot
        if (canPlace(task, committed.day, committed.slot)) {
          commitTask(task, committed.day, committed.slot);
        } else {
          unplaced.push({ teacher_id: task.teacher_id, subject: task.subject, class_name: task.class_name });
        }
        continue;
      }

      // No slot committed yet for this occurrence — find one where ALL remaining
      // unprocessed tasks in this group (same occurrence index) can also fit.
      // Collect sibling tasks (same group, same _parallelIndex, not yet placed)
      // Use t._placed flag (set by commitTask) to check if THIS specific task is placed
      const siblings = tasks.filter(
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
          // All siblings must also fit at this day+slot
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
          const score = getLoad(task.class_name, day) + consecutiveBonus + afterSchoolPenalty;
          if (score < bestScore) {
            bestScore = score;
            bestDay = day;
            bestSlot = slot;
          }
        }
      }

      if (bestDay !== null) {
        // Commit this slot for the group occurrence
        if (!parallelGroupSlots[group]) parallelGroupSlots[group] = [];
        parallelGroupSlots[group][occurrence] = { day: bestDay, slot: bestSlot };
        commitTask(task, bestDay, bestSlot);
      } else {
        unplaced.push({ teacher_id: task.teacher_id, subject: task.subject, class_name: task.class_name });
      }
      continue;
    }

    // ── NORMAL (non-parallel) PLACEMENT ─────────────────────
    let bestDay = null;
    let bestSlot = null;
    let bestScore = Infinity;

    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        if (!canPlace(task, day, slot)) continue;
        const existingSameSubjectToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
        const loadScore = getLoad(task.class_name, day);

        // Consecutive / double-period bonus
        let consecutiveBonus = 0;
        if (existingSameSubjectToday > 0) {
          if (DOUBLE_PREFERRED_SUBJECTS.has(task.subject)) {
            // Check if this slot is directly adjacent to an existing same-subject slot
            const prevSlotIdx = slotNumbers.indexOf(slot) - 1;
            const prevSlot = prevSlotIdx >= 0 ? slotNumbers[prevSlotIdx] : null;
            const prevEntry = prevSlot !== null ? grid[day][prevSlot][task.class_name] : null;
            const isDirectlyAfter = prevEntry && prevEntry.subject === task.subject;
            // Directly consecutive → very strong pull (forces a double period)
            // Same day but not adjacent → moderate pull (keeps related periods close)
            consecutiveBonus = isDirectlyAfter ? -50 : -10;
          } else {
            consecutiveBonus = -0.5; // slight same-day nudge for non-double subjects
          }
        }

        // Strongly prefer regular slots (1-6). After-school slots (7+) are used
        // only as a last resort when all regular slots are blocked/occupied.
        const afterSchoolPenalty = AFTER_SCHOOL_SLOTS.has(slot) ? AFTER_SCHOOL_PENALTY : 0;
        const score = loadScore + consecutiveBonus + afterSchoolPenalty;
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
      unplaced.push({ teacher_id: task.teacher_id, subject: task.subject, class_name: task.class_name });
    }
  }

  // ---- Post-process: merge consecutive same-subject entries into double classes ----
  // For each class+day+subject group, if 2 consecutive slots exist → mark first as is_double, remove second
  // Note: SINGLE_PERIOD_SUBJECTS can never produce doubles (max 1 per day)
  const mergedPlaced = mergeDoubleClasses(placed, slotNumbers);

  return { placed: mergedPlaced, unplaced };
}

/**
 * Scan placed entries for same class+day+subject at consecutive slots.
 * Merges them: first entry gets is_double=true, second is removed.
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
