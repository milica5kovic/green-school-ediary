// ============================================================
// TIMETABLE GENERATOR — Greedy constraint satisfaction algorithm
// ============================================================

const DAYS = [0, 1, 2, 3, 4]; // Monday=0 ... Friday=4

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
      });
    }
  });

  // ---- Sort tasks: most constrained teachers first ----
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
    const aFree = teacherFreeSlots[a.teacher_id] ?? 99;
    const bFree = teacherFreeSlots[b.teacher_id] ?? 99;
    if (aFree !== bFree) return aFree - bFree;
    return (b.periods_per_week || 0) - (a.periods_per_week || 0);
  });

  // ---- Per-class tracking (for even distribution) ----
  const classDayLoad = {};
  // Allow same subject up to 2× per day (supports double classes)
  const classSubjectDay = {};

  const getLoad = (class_name, day) =>
    (classDayLoad[class_name] || {})[day] || 0;

  const subjectDayKey = (class_name, day, subject) =>
    `${class_name}|${day}|${subject}`;

  // ---- Place tasks greedily ----
  const placed = [];
  const unplaced = [];

  for (const task of tasks) {
    let bestDay = null;
    let bestSlot = null;
    let bestScore = Infinity;

    for (const day of DAYS) {
      for (const slot of slotNumbers) {
        // Constraint 1: teacher must be available
        if (!isAvailable(task.teacher_id, day, slot)) continue;

        // Constraint 2: teacher must not be double-booked
        if (teacherBusy[day][slot].has(task.teacher_id)) continue;

        // Constraint 3: class must not already have a period in this slot
        if (grid[day][slot][task.class_name]) continue;

        // Constraint 4: same subject max 2× per day per class (allows back-to-back)
        if ((classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) >= 2) continue;

        // Score: prefer the day with the least load (even distribution)
        // Secondary: prefer consecutive slots when same subject already placed that day
        const existingSameSubjectToday = classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0;
        const loadScore = getLoad(task.class_name, day);
        // Bonus if this slot is consecutive with an existing same-subject slot
        const consecutiveBonus = existingSameSubjectToday > 0 ? -0.5 : 0;
        const score = loadScore + consecutiveBonus;

        if (score < bestScore) {
          bestScore = score;
          bestDay = day;
          bestSlot = slot;
        }
      }
    }

    if (bestDay !== null) {
      grid[bestDay][bestSlot][task.class_name] = task;
      teacherBusy[bestDay][bestSlot].add(task.teacher_id);

      if (!classDayLoad[task.class_name]) classDayLoad[task.class_name] = {};
      classDayLoad[task.class_name][bestDay] = getLoad(task.class_name, bestDay) + 1;

      const sdk = subjectDayKey(task.class_name, bestDay, task.subject);
      classSubjectDay[sdk] = (classSubjectDay[sdk] || 0) + 1;

      placed.push({
        teacher_id: task.teacher_id,
        subject: task.subject,
        class_name: task.class_name,
        day_of_week: bestDay,
        slot_number: bestSlot,
        is_double: false,
      });
    } else {
      unplaced.push({
        teacher_id: task.teacher_id,
        subject: task.subject,
        class_name: task.class_name,
      });
    }
  }

  // ---- Post-process: merge consecutive same-subject entries into double classes ----
  // For each class+day+subject group, if 2 consecutive slots exist → mark first as is_double, remove second
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
    const teacherSeen = {};
    group.forEach(e => {
      if (teacherSeen[e.teacher_id]) {
        conflictIds.add(e.id);
        conflictIds.add(teacherSeen[e.teacher_id]);
      } else {
        teacherSeen[e.teacher_id] = e.id;
      }
    });

    // Class double-booking: same class_name in same slot
    const classSeen = {};
    group.forEach(e => {
      if (classSeen[e.class_name]) {
        conflictIds.add(e.id);
        conflictIds.add(classSeen[e.class_name]);
      } else {
        classSeen[e.class_name] = e.id;
      }
    });
  });

  return conflictIds;
}
