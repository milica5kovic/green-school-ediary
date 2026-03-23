// ============================================================
// TIMETABLE SERVICE — Multi-tenant Supabase CRUD
// ============================================================

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export class TimetableService {
  constructor(supabase, schoolId = null) {
    if (!supabase) throw new Error('Supabase client is required for TimetableService');
    this.supabase = supabase;
    this.schoolId = schoolId;
  }

  setSchoolId(schoolId) {
    this.schoolId = schoolId;
  }

  _require() {
    if (!this.schoolId) throw new Error('🔒 SECURITY: school_id is required');
  }

  // ============================================================
  // TIME SLOTS
  // ============================================================

  async getTimeSlots() {
    this._require();
    const { data, error } = await this.supabase
      .from('time_slots')
      .select('*')
      .eq('school_id', this.schoolId)
      .order('slot_number', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async saveTimeSlots(slots) {
    this._require();
    const { error: delErr } = await this.supabase
      .from('time_slots')
      .delete()
      .eq('school_id', this.schoolId);
    if (delErr) throw delErr;

    if (slots.length === 0) return [];

    const toInsert = slots.map((s, i) => ({
      school_id: this.schoolId,
      slot_number: s.slot_number ?? i + 1,
      label: s.label || `Period ${s.slot_number ?? i + 1}`,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    const { data, error } = await this.supabase
      .from('time_slots')
      .insert(toInsert)
      .select();
    if (error) throw error;
    return data;
  }

  // ============================================================
  // TEACHER ASSIGNMENTS
  // ============================================================

  async getTeacherAssignments() {
    this._require();
    const { data, error } = await this.supabase
      .from('teacher_assignments')
      .select(`
        *,
        teacher:teachers!teacher_assignments_teacher_id_fkey(id, full_name, email)
      `)
      .eq('school_id', this.schoolId)
      .order('class_name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addTeacherAssignment({ teacher_id, subject, class_name, periods_per_week, parallel_group }) {
    this._require();
    const { data, error } = await this.supabase
      .from('teacher_assignments')
      .insert([{ school_id: this.schoolId, teacher_id, subject, class_name, periods_per_week, parallel_group: parallel_group || null }])
      .select(`
        *,
        teacher:teachers!teacher_assignments_teacher_id_fkey(id, full_name, email)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async updateTeacherAssignment(id, { periods_per_week, parallel_group }) {
    this._require();
    const updates = { periods_per_week };
    if (parallel_group !== undefined) updates.parallel_group = parallel_group || null;
    const { data, error } = await this.supabase
      .from('teacher_assignments')
      .update(updates)
      .eq('id', id)
      .eq('school_id', this.schoolId)
      .select(`
        *,
        teacher:teachers!teacher_assignments_teacher_id_fkey(id, full_name, email)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async deleteTeacherAssignment(id) {
    this._require();
    const { error } = await this.supabase
      .from('teacher_assignments')
      .delete()
      .eq('id', id)
      .eq('school_id', this.schoolId);
    if (error) throw error;
    return true;
  }

  // ============================================================
  // TEACHER AVAILABILITY
  // ============================================================

  async getTeacherAvailability() {
    this._require();
    const { data, error } = await this.supabase
      .from('teacher_availability')
      .select('*')
      .eq('school_id', this.schoolId);
    if (error) throw error;
    return data || [];
  }

  async upsertAvailability({ teacher_id, day_of_week, slot_number, is_available }) {
    this._require();
    const { data, error } = await this.supabase
      .from('teacher_availability')
      .upsert(
        [{ school_id: this.schoolId, teacher_id, day_of_week, slot_number, is_available }],
        { onConflict: 'school_id,teacher_id,day_of_week,slot_number' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ============================================================
  // TIMETABLE ENTRIES
  // ============================================================

  async getTimetableEntries(status = 'draft') {
    this._require();
    const { data, error } = await this.supabase
      .from('timetable_entries')
      .select(`
        *,
        teacher:teachers!timetable_entries_teacher_id_fkey(id, full_name, email, user_id)
      `)
      .eq('school_id', this.schoolId)
      .eq('status', status)
      .order('day_of_week', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async saveDraftEntries(entries) {
    this._require();
    // Clear existing draft
    const { error: delErr } = await this.supabase
      .from('timetable_entries')
      .delete()
      .eq('school_id', this.schoolId)
      .eq('status', 'draft');
    if (delErr) throw delErr;

    if (entries.length === 0) return [];

    const toInsert = entries.map(e => ({
      school_id: this.schoolId,
      teacher_id: e.teacher_id,
      subject: e.subject,
      class_name: e.class_name,
      day_of_week: e.day_of_week,
      slot_number: e.slot_number,
      is_double: e.is_double ?? false,
      parallel_group: e.parallel_group || null,
      status: 'draft',
    }));

    const { data, error } = await this.supabase
      .from('timetable_entries')
      .insert(toInsert)
      .select(`
        *,
        teacher:teachers!timetable_entries_teacher_id_fkey(id, full_name, email, user_id)
      `);
    if (error) throw error;
    return data;
  }

  async saveDraftEntriesIncremental(entries) {
    this._require();
    if (!entries.length) return [];
    const toInsert = entries.map(e => ({
      school_id: this.schoolId,
      teacher_id: e.teacher_id,
      subject: e.subject,
      class_name: e.class_name,
      day_of_week: e.day_of_week,
      slot_number: e.slot_number,
      is_double: e.is_double ?? false,
      parallel_group: e.parallel_group || null,
      status: 'draft',
    }));
    const { data, error } = await this.supabase
      .from('timetable_entries')
      .insert(toInsert)
      .select(`*, teacher:teachers!timetable_entries_teacher_id_fkey(id, full_name, email, user_id)`);
    if (error) throw error;
    return data ?? [];
  }

  // Upsert a single draft cell (replaces any existing entry for that class+day+slot)
  async upsertDraftEntry({ teacher_id, subject, class_name, day_of_week, slot_number, is_double = false }) {
    this._require();
    // Remove existing entry for this class at this slot
    await this.supabase
      .from('timetable_entries')
      .delete()
      .eq('school_id', this.schoolId)
      .eq('status', 'draft')
      .eq('class_name', class_name)
      .eq('day_of_week', day_of_week)
      .eq('slot_number', slot_number);

    // If double class, also clear the next slot for this class (it will be consumed visually)
    if (is_double) {
      await this.supabase
        .from('timetable_entries')
        .delete()
        .eq('school_id', this.schoolId)
        .eq('status', 'draft')
        .eq('class_name', class_name)
        .eq('day_of_week', day_of_week)
        .eq('slot_number', slot_number + 1);
    }

    const { data, error } = await this.supabase
      .from('timetable_entries')
      .insert([{
        school_id: this.schoolId,
        teacher_id, subject, class_name, day_of_week, slot_number, is_double, status: 'draft',
      }])
      .select(`
        *,
        teacher:teachers!timetable_entries_teacher_id_fkey(id, full_name, email, user_id)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  // Move a draft entry to a new day+slot (drag & drop)
  async moveDraftEntry(id, newDay, newSlot) {
    this._require();
    const { data, error } = await this.supabase
      .from('timetable_entries')
      .update({ day_of_week: newDay, slot_number: newSlot, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', this.schoolId)
      .eq('status', 'draft')
      .select(`
        *,
        teacher:teachers!timetable_entries_teacher_id_fkey(id, full_name, email, user_id)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async deleteDraftEntry(id) {
    this._require();
    const { error } = await this.supabase
      .from('timetable_entries')
      .delete()
      .eq('id', id)
      .eq('school_id', this.schoolId)
      .eq('status', 'draft');
    if (error) throw error;
    return true;
  }

  async clearDraft() {
    this._require();
    const { error } = await this.supabase
      .from('timetable_entries')
      .delete()
      .eq('school_id', this.schoolId)
      .eq('status', 'draft');
    if (error) throw error;
    return true;
  }

  // Publish: draft → published + sync to teacher_schedule
  //
  // IMPORTANT ordering: teacher_schedule insert happens BEFORE promoting draft→published.
  // If the insert fails (e.g. FK violation), entries remain as draft so the user can retry.
  // Previously the promotion ran first, leaving entries stuck as published with no schedule.
  async publishTimetable(timeSlots) {
    this._require();

    // Fetch draft entries WITH teacher join so we can guard deleted teachers
    const draftEntries = await this.getTimetableEntries('draft');

    // If draft is empty, also check if entries are stuck in published state
    // (this happens when a previous publish promoted draft→published but teacher_schedule insert failed)
    let entriesToPublish = draftEntries;
    if (draftEntries.length === 0) {
      const published = await this.getTimetableEntries('published');
      if (published.length > 0) {
        // Re-sync teacher_schedule from the already-published entries
        entriesToPublish = published;
      } else {
        return { published: 0 };
      }
    }

    // Build slot lookup: slot_number → slot data
    const slotMap = timeSlots.reduce((acc, s) => {
      acc[s.slot_number] = s;
      return acc;
    }, {});

    // Build teacher_schedule rows.
    // teacher_schedule.teacher_id references teachers.id (the PK) — not user_id.
    // This way all teachers are synced regardless of whether they have an auth account.
    const scheduleRows = [];
    entriesToPublish.forEach(e => {
      if (!e.teacher?.id) return; // teacher record was deleted
      const slot = slotMap[e.slot_number];
      const timeLabel = slot
        ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`
        : `Period ${e.slot_number}`;
      scheduleRows.push({
        school_id: this.schoolId,
        teacher_id: e.teacher.id,
        day_of_week: DAY_NAMES[e.day_of_week],
        time_slot: timeLabel,
        class_name: e.class_name,
        subject: e.subject,
        schedule_type: 'class',
        created_at: new Date().toISOString(),
      });
      // Double class: also add the next slot to teacher_schedule
      if (e.is_double) {
        const nextSlot = slotMap[e.slot_number + 1];
        const nextLabel = nextSlot
          ? `${nextSlot.start_time.slice(0, 5)} - ${nextSlot.end_time.slice(0, 5)}`
          : `Period ${e.slot_number + 1}`;
        scheduleRows.push({
          school_id: this.schoolId,
          teacher_id: e.teacher.id,
          day_of_week: DAY_NAMES[e.day_of_week],
          time_slot: nextLabel,
          class_name: e.class_name,
          subject: e.subject,
          schedule_type: 'class',
          created_at: new Date().toISOString(),
        });
      }
    });

    // Deduplicate by (teacher_id, day_of_week, time_slot).
    // Parallel group entries (same teacher, multiple classes, same slot) produce duplicates.
    const seenScheduleKeys = new Set();
    const deduplicatedRows = scheduleRows.filter(row => {
      if (!row.teacher_id) return false;

      const key = `${row.teacher_id}|${row.day_of_week}|${row.time_slot}`;
      if (seenScheduleKeys.has(key)) return false;
      seenScheduleKeys.add(key);
      return true;
    });

    // Step 1: wipe + re-insert teacher_schedule FIRST.
    // If this fails the draft entries are still draft and the user can retry.
    await this.supabase
      .from('teacher_schedule')
      .delete()
      .eq('school_id', this.schoolId);

    if (deduplicatedRows.length > 0) {
      const { error: schedErr } = await this.supabase
        .from('teacher_schedule')
        .insert(deduplicatedRows);
      if (schedErr) throw schedErr;
    }

    // Step 2: only promote draft→published after teacher_schedule succeeded.
    if (draftEntries.length > 0) {
      await this.supabase
        .from('timetable_entries')
        .delete()
        .eq('school_id', this.schoolId)
        .eq('status', 'published');

      const { error: promoteErr } = await this.supabase
        .from('timetable_entries')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('school_id', this.schoolId)
        .eq('status', 'draft');
      if (promoteErr) throw promoteErr;
    }

    return {
      published: entriesToPublish.length,
      synced: deduplicatedRows.length,
    };
  }
}
