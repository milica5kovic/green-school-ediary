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

  // Derived: distinct classes from students
  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))].sort();

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
      const [slots, asgn, avail, draft, published] = await Promise.all([
        service.getTimeSlots(),
        service.getTeacherAssignments(),
        service.getTeacherAvailability(),
        service.getTimetableEntries('draft'),
        service.getTimetableEntries('published'),
      ]);
      setTimeSlots(slots.length > 0 ? slots : DEFAULT_TIME_SLOTS);
      setAssignments(asgn);
      setAvailabilityRecords(avail);
      setDraftEntries(draft);
      setPublishedEntries(published);
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
  const autoGenerate = useCallback(async () => {
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
      const { placed, unplaced } = generateTimetable(assignments, timeSlots, availabilityRecords);
      const saved = await service.saveDraftEntries(placed);
      setDraftEntries(saved);
      setUnplacedTasks(unplaced);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [service, assignments, timeSlots, availabilityRecords]);

  const manualSetCell = useCallback(async ({ teacher_id, subject, class_name, day_of_week, slot_number }) => {
    setSaving(true);
    try {
      const entry = await service.upsertDraftEntry({ teacher_id, subject, class_name, day_of_week, slot_number });
      setDraftEntries(prev => {
        // Remove any existing entry for this class+day+slot
        const filtered = prev.filter(
          e => !(e.class_name === class_name && e.day_of_week === day_of_week && e.slot_number === slot_number)
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
    manualSetCell,
    deleteDraftEntry,
    clearDraft,
    publishTimetable,
  };
}
