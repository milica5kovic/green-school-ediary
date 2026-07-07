// ============================================================
// useTimetable — Central state management for the Timetable Maker
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../../../core/context/AppContext';
import { useTenant } from '../../../../core/context/TenantContext';
import { TimetableService } from '../services/timetableService';
import { generateTimetable, detectConflicts } from '../services/timetableGenerator';
import { tenantSupabase } from '../../../../core/infrastructure/supabaseClient';

const DEFAULT_TIME_SLOTS = [
  { slot_number: 1, label: 'Period 1', start_time: '08:00', end_time: '08:45' },
  { slot_number: 2, label: 'Period 2', start_time: '08:50', end_time: '09:35' },
  { slot_number: 3, label: 'Period 3', start_time: '09:40', end_time: '10:25' },
  { slot_number: 4, label: 'Period 4', start_time: '10:45', end_time: '11:30' },
  { slot_number: 5, label: 'Period 5', start_time: '11:35', end_time: '12:20' },
  { slot_number: 6, label: 'Period 6', start_time: '12:25', end_time: '13:10' },
];

export function useTimetable() {
  const { schoolId } = useTenant();
  const { students } = useApp();

  // Service instance — stable per schoolId
  const [service] = useState(() => new TimetableService(tenantSupabase, schoolId));
  useEffect(() => { service.setSchoolId(schoolId); }, [service, schoolId]);

  // ---- State ----
  const [timeSlots, setTimeSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [availabilityRecords, setAvailabilityRecords] = useState([]);
  const [draftEntries, setDraftEntries] = useState([]);
  const [publishedEntries, setPublishedEntries] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [conflicts, setConflicts] = useState(new Set());
  const [unplacedTasks, setUnplacedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [customClasses, setCustomClasses] = useState([]);

  // Classes: prefer custom_classes table (authoritative); fall back to students if empty
  const classes = customClasses.length > 0
    ? customClasses
    : [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();

  // ---- Recalculate conflicts whenever draft changes ----
  useEffect(() => {
    setConflicts(detectConflicts(draftEntries));
  }, [draftEntries]);

  // ---- Fetch all teachers for this school ----
  const loadTeachers = useCallback(async () => {
    if (!schoolId) return;
    const { data } = await tenantSupabase
      .from('teachers')
      .select('id, full_name, email, subjects')
      .eq('school_id', schoolId)
      .order('full_name');
    setTeachers(data || []);
  }, [schoolId]);

  // ---- Load everything ----
  const loadAll = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const [slots, asgn, avail, draft, published, classRows] = await Promise.all([
        service.getTimeSlots(),
        service.getTeacherAssignments(),
        service.getTeacherAvailability(),
        service.getTimetableEntries('draft'),
        service.getTimetableEntries('published'),
        tenantSupabase
          .from('custom_classes')
          .select('class_name')
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .order('class_name'),
      ]);
      setTimeSlots(slots.length > 0 ? slots : DEFAULT_TIME_SLOTS);
      setAssignments(asgn);
      setAvailabilityRecords(avail);
      setDraftEntries(draft);
      setPublishedEntries(published);
      setCustomClasses(
        (classRows.data || []).map(r => r.class_name).sort()
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [service, schoolId]);

  useEffect(() => {
    loadAll();
    loadTeachers();
  }, [loadAll, loadTeachers]);

  // ============================================================
  // TIME SLOTS
  // ============================================================
  const saveTimeSlots = useCallback(async (slots) => {
    setSaving(true);
    try {
      const saved = await service.saveTimeSlots(slots);
      setTimeSlots(saved.length > 0 ? saved : slots);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [service]);

  // ============================================================
  // TEACHER ASSIGNMENTS
  // ============================================================
  const addAssignment = useCallback(async (data) => {
    setSaving(true);
    try {
      const created = await service.addTeacherAssignment(data);
      setAssignments(prev => [...prev, created]);
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [service]);

  const updateAssignment = useCallback(async (id, data) => {
    setSaving(true);
    try {
      const updated = await service.updateTeacherAssignment(id, data);
      setAssignments(prev => prev.map(a => a.id === id ? updated : a));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [service]);

  const deleteAssignment = useCallback(async (id) => {
    setSaving(true);
    try {
      await service.deleteTeacherAssignment(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [service]);

  // ============================================================
  // TEACHER AVAILABILITY
  // ============================================================
  const toggleAvailability = useCallback(async (teacher_id, day_of_week, slot_number) => {
    // Find current state — default is available (true), blocked if record exists with is_available=false
    const existing = availabilityRecords.find(
      r => r.teacher_id === teacher_id &&
           r.day_of_week === day_of_week &&
           r.slot_number === slot_number
    );
    // Toggle: if no record or is_available=true → block (false); if blocked → unblock (true)
    const newValue = existing ? !existing.is_available : false;

    // Optimistic update
    setAvailabilityRecords(prev => {
      const filtered = prev.filter(
        r => !(r.teacher_id === teacher_id && r.day_of_week === day_of_week && r.slot_number === slot_number)
      );
      return [...filtered, { teacher_id, day_of_week, slot_number, is_available: newValue, school_id: schoolId }];
    });

    try {
      await service.upsertAvailability({ teacher_id, day_of_week, slot_number, is_available: newValue });
    } catch (err) {
      // Revert on error
      setAvailabilityRecords(prev => {
        const filtered = prev.filter(
          r => !(r.teacher_id === teacher_id && r.day_of_week === day_of_week && r.slot_number === slot_number)
        );
        return existing ? [...filtered, existing] : filtered;
      });
      setError(err.message);
    }
  }, [service, availabilityRecords, schoolId]);

  // Helper: check if teacher is available at a given day+slot
  const isTeacherAvailable = useCallback((teacher_id, day_of_week, slot_number) => {
    const record = availabilityRecords.find(
      r => r.teacher_id === teacher_id &&
           r.day_of_week === day_of_week &&
           r.slot_number === slot_number
    );
    return !record || record.is_available;
  }, [availabilityRecords]);

  // ============================================================
  // DRAFT MANAGEMENT
  // ============================================================
  // Count gap slots across all class-day combos (lower = better schedule)
  const countGapSlots = (placed) => {
    const regularSlots = timeSlots
      .map(s => s.slot_number)
      .filter(s => s < 7)
      .sort((a, b) => a - b);
    let gaps = 0;
    const classes = [...new Set(placed.map(p => p.class_name))];
    for (const cls of classes) {
      for (let day = 0; day < 5; day++) {
        const idxs = placed
          .filter(p => p.class_name === cls && p.day_of_week === day && !p.is_double && p.slot_number < 7)
          .map(p => regularSlots.indexOf(p.slot_number))
          .filter(i => i >= 0)
          .sort((a, b) => a - b);
        if (idxs.length < 2) continue;
        gaps += (idxs[idxs.length - 1] - idxs[0] + 1) - idxs.length;
      }
    }
    return gaps;
  };

  const autoGenerate = useCallback(async (seed = 0) => {
    if (assignments.length === 0) {
      setError('Add teacher assignments before generating.');
      return;
    }
    if (timeSlots.length === 0) {
      setError('Configure time slots before generating.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Try 3 seeds, pick the result with fewest unplaced then fewest gaps
      let best = null;
      let bestScore = Infinity;
      for (let s = seed; s < seed + 3; s++) {
        const result = generateTimetable(assignments, timeSlots, availabilityRecords, [], s);
        const score = result.unplaced.length * 10000 + countGapSlots(result.placed);
        if (score < bestScore) { bestScore = score; best = result; }
      }
      const { placed, unplaced } = best;
      const saved = await service.saveDraftEntries(placed);
      setDraftEntries(saved);
      const enriched = unplaced.map(t => ({
        ...t,
        teacherName: teachers.find(tc => tc.id === t.teacher_id)?.full_name || t.teacher_id,
      }));
      setUnplacedTasks(enriched);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [service, assignments, timeSlots, availabilityRecords, teachers]);

  const fillGaps = useCallback(async () => {
    if (!assignments.length || !timeSlots.length) return;
    setGenerating(true);
    setError(null);
    try {
      // Count how many periods are already placed per assignment
      const placedCount = {};
      draftEntries.forEach(e => {
        const k = `${e.teacher_id}|${e.subject}|${e.class_name}`;
        placedCount[k] = (placedCount[k] || 0) + (e.is_double ? 2 : 1);
      });

      // Build reduced assignments for only the remaining unplaced periods
      const remaining = assignments
        .map(a => {
          const k = `${a.teacher_id}|${a.subject}|${a.class_name}`;
          const left = (a.periods_per_week || 1) - (placedCount[k] || 0);
          return left > 0 ? { ...a, periods_per_week: left } : null;
        })
        .filter(Boolean);

      if (!remaining.length) {
        setError('All assignments are already placed.');
        return;
      }

      // Pass existing draft entries as locked — generator works around them,
      // but its repair phase may RELOCATE some of them to make room.
      const { placed, unplaced, moved } = generateTimetable(
        remaining, timeSlots, availabilityRecords, draftEntries
      );

      // Persist repair moves on existing entries
      for (const m of moved || []) {
        await service.moveDraftEntry(m.id, m.day_of_week, m.slot_number);
      }

      const saved = await service.saveDraftEntriesIncremental(placed);
      setDraftEntries(prev => prev
        .map(e => {
          const m = (moved || []).find(x => x.id === e.id);
          return m ? { ...e, day_of_week: m.day_of_week, slot_number: m.slot_number } : e;
        })
        .concat(saved));

      const enriched = unplaced.map(t => ({
        ...t,
        teacherName: teachers?.find(tc => tc.id === t.teacher_id)?.full_name ?? t.teacher_id,
      }));
      setUnplacedTasks(enriched);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [service, assignments, timeSlots, availabilityRecords, draftEntries, teachers]);

  const moveDraftEntry = useCallback(async (entryId, newDay, newSlot) => {
    const entry = draftEntries.find(e => e.id === entryId);
    if (!entry) return false;

    // If same position — no-op
    if (entry.day_of_week === newDay && entry.slot_number === newSlot) return false;

    const slotsToCheck = entry.is_double ? [newSlot, newSlot + 1] : [newSlot];

    for (const slot of slotsToCheck) {
      // Teacher double-booked?
      const teacherBusy = draftEntries.some(
        e => e.id !== entryId &&
          e.teacher_id === entry.teacher_id &&
          e.day_of_week === newDay &&
          (e.slot_number === slot || (e.is_double && e.slot_number === slot - 1))
      );
      if (teacherBusy) {
        setError(`${entry.teacher?.full_name || 'Teacher'} is already teaching at that slot.`);
        return false;
      }

      // Class double-booked?
      const classBusy = draftEntries.some(
        e => e.id !== entryId &&
          e.class_name === entry.class_name &&
          e.day_of_week === newDay &&
          (e.slot_number === slot || (e.is_double && e.slot_number === slot - 1))
      );
      if (classBusy) {
        setError(`${entry.class_name} already has a class at that slot.`);
        return false;
      }

      // Teacher availability?
      const avail = availabilityRecords.find(
        r => r.teacher_id === entry.teacher_id &&
          r.day_of_week === newDay &&
          r.slot_number === slot
      );
      if (avail && !avail.is_available) {
        setError(`${entry.teacher?.full_name || 'Teacher'} is not available at that slot.`);
        return false;
      }
    }

    setSaving(true);
    try {
      const updated = await service.moveDraftEntry(entryId, newDay, newSlot);
      setDraftEntries(prev => prev.map(e => e.id === entryId ? updated : e));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [service, draftEntries, availabilityRecords]);

  // Move multiple draft entries (same parallel/split group) to a new slot.
  const moveDraftGroup = useCallback(async (ids, newDay, newSlot) => {
    setSaving(true);
    try {
      const results = await Promise.all(ids.map(id => service.moveDraftEntry(id, newDay, newSlot)));
      const updatedMap = new Map(results.map(e => [e.id, e]));
      setDraftEntries(prev => prev.map(e => updatedMap.has(e.id) ? updatedMap.get(e.id) : e));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [service]);

  // Swap two groups of draft entries: group1 goes to group2's slot, vice versa.
  // Accepts single IDs or arrays of IDs.
  // Returns { ok: true } on success or { ok: false, reason: '...' } on conflict.
  const swapDraftEntries = useCallback(async (ids1, ids2) => {
    const idArr1 = Array.isArray(ids1) ? ids1 : [ids1];
    const idArr2 = Array.isArray(ids2) ? ids2 : [ids2];
    const group1 = idArr1.map(id => draftEntries.find(e => e.id === id)).filter(Boolean);
    const group2 = idArr2.map(id => draftEntries.find(e => e.id === id)).filter(Boolean);
    if (group1.length !== idArr1.length || group2.length !== idArr2.length)
      return { ok: false, reason: 'Entry not found.' };
    const e1 = group1[0];
    const e2 = group2[0];
    if (!e1 || !e2) return { ok: false, reason: 'Entry not found.' };

    // All OTHER entries (excluding both groups being swapped)
    const allSwappedIds = new Set([...idArr1, ...idArr2]);
    const others = draftEntries.filter(e => !allSwappedIds.has(e.id));

    const occupies = (entry, day, slot) =>
      entry.day_of_week === day &&
      (entry.slot_number === slot || (entry.is_double && entry.slot_number === slot - 1));

    const conflictsAt = (movingEntry, targetDay, targetSlot) => {
      const slots = movingEntry.is_double ? [targetSlot, targetSlot + 1] : [targetSlot];
      for (const s of slots) {
        if (others.some(o => o.teacher_id === movingEntry.teacher_id && occupies(o, targetDay, s)))
          return `${movingEntry.teacher?.full_name || 'Teacher'} is already busy at that slot.`;
        if (others.some(o => o.class_name === movingEntry.class_name && occupies(o, targetDay, s)))
          return `${movingEntry.class_name} already has a class at that slot.`;
        const avail = availabilityRecords.find(
          r => r.teacher_id === movingEntry.teacher_id && r.day_of_week === targetDay && r.slot_number === s
        );
        if (avail && !avail.is_available)
          return `${movingEntry.teacher?.full_name || 'Teacher'} is not available at that slot.`;
      }
      return null;
    };

    // group1 → e2's slot, group2 → e1's slot
    for (const entry of group1) {
      const err = conflictsAt(entry, e2.day_of_week, e2.slot_number);
      if (err) return { ok: false, reason: err };
    }
    for (const entry of group2) {
      const err = conflictsAt(entry, e1.day_of_week, e1.slot_number);
      if (err) return { ok: false, reason: err };
    }

    setSaving(true);
    try {
      const results = await Promise.all([
        ...group1.map(e => service.moveDraftEntry(e.id, e2.day_of_week, e2.slot_number)),
        ...group2.map(e => service.moveDraftEntry(e.id, e1.day_of_week, e1.slot_number)),
      ]);
      const updatedMap = new Map(results.map(e => [e.id, e]));
      setDraftEntries(prev => prev.map(e => updatedMap.has(e.id) ? updatedMap.get(e.id) : e));
      return { ok: true };
    } catch (err) {
      setError(err.message);
      return { ok: false, reason: err.message };
    } finally {
      setSaving(false);
    }
  }, [service, draftEntries, availabilityRecords]);

  const manualSetCell = useCallback(async ({ teacher_id, subject, class_name, day_of_week, slot_number, is_double = false, parallel_group = null }) => {
    setSaving(true);
    try {
      const entry = await service.upsertDraftEntry({ teacher_id, subject, class_name, day_of_week, slot_number, is_double, parallel_group });
      setDraftEntries(prev => {
        const filtered = prev.filter(
          e => !(e.class_name === class_name && e.day_of_week === day_of_week &&
            (e.slot_number === slot_number || (is_double && e.slot_number === slot_number + 1)) &&
            // same-group entries legitimately share the slot — keep them
            !(parallel_group && e.parallel_group === parallel_group))
        );
        return [...filtered, entry];
      });
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [service]);

  const deleteDraftEntry = useCallback(async (id) => {
    setSaving(true);
    try {
      await service.deleteDraftEntry(id);
      setDraftEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [service]);

  const clearDraft = useCallback(async () => {
    setSaving(true);
    try {
      await service.clearDraft();
      setDraftEntries([]);
      setUnplacedTasks([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [service]);

  // ============================================================
  // PUBLISH
  // ============================================================
  const publishTimetable = useCallback(async () => {
    if (conflicts.size > 0) {
      setError('Resolve all conflicts before publishing.');
      return false;
    }
    setPublishing(true);
    setError(null);
    try {
      const result = await service.publishTimetable(timeSlots);
      // Reload both statuses
      const [newDraft, newPublished] = await Promise.all([
        service.getTimetableEntries('draft'),
        service.getTimetableEntries('published'),
      ]);
      setDraftEntries(newDraft);
      setPublishedEntries(newPublished);
      return result;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setPublishing(false);
    }
  }, [service, timeSlots, conflicts]);

  return {
    // Data
    timeSlots,
    assignments,
    availabilityRecords,
    draftEntries,
    publishedEntries,
    teachers,
    classes,
    conflicts,
    unplacedTasks,
    // State flags
    loading,
    saving,
    generating,
    publishing,
    error,
    setError,
    // Actions
    loadAll,
    saveTimeSlots,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    toggleAvailability,
    isTeacherAvailable,
    autoGenerate,
    fillGaps,
    manualSetCell,
    moveDraftEntry,
    moveDraftGroup,
    swapDraftEntries,
    deleteDraftEntry,
    clearDraft,
    publishTimetable,
  };
}
