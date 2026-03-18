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
  const slotNumbers = timeSlots.map(s => s.slot_number);

  // ---- Build blocked-slot lookup ----
  // A record exists only when is_available=false (teacher is blocked)
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
      });
    }
  });

  // ---- Sort tasks: most constrained teachers first ----
  // Count how many (day, slot) pairs each teacher can use
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
    if (aFree !== bFree) return aFree - bFree; // fewer free slots → higher priority
    return (b.periods_per_week || 0) - (a.periods_per_week || 0); // more periods → higher priority
  });

  // ---- Per-class tracking (for even distribution) ----
  // classDayLoad[class_name][day] = number of periods already placed that day
  const classDayLoad = {};
  // classSubjectDay[class_name|day|subject] = count (avoid same subject twice/day)
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

        // Constraint 4: avoid same subject twice in the same day for the same class
        if ((classSubjectDay[subjectDayKey(task.class_name, day, task.subject)] || 0) >= 1) continue;

        // Score: prefer the day with the least load for this class (even distribution)
        const score = getLoad(task.class_name, day);
        if (score < bestScore) {
          bestScore = score;
          bestDay = day;
          bestSlot = slot;
        }
      }
    }

    if (bestDay !== null) {
      // Place the task
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
      });
    } else {
      unplaced.push({
        teacher_id: task.teacher_id,
        subject: task.subject,
        class_name: task.class_name,
      });
    }
  }

  return { placed, unplaced };
}

/**
 * Detect conflicts in a list of timetable entries.
 * Returns a Set of entry IDs that have conflicts.
 * Also mutates each conflicting entry to add a .conflict string.
 *
 * @param {Array} entries - timetable_entries rows (with .id)
 * @returns {Set<string>} conflictIds
 */
export function detectConflicts(entries) {
  const conflictIds = new Set();

  // Group by (day, slot)
  const byDaySlot = {};
  entries.forEach(e => {
    const key = `${e.day_of_week}|${e.slot_number}`;
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
