// ============================================================
// SUBSTITUTION SERVICE — Multi-tenant CRUD for substitutions
// ============================================================

export class SubstitutionService {
  constructor(supabase, schoolId = null) {
    if (!supabase) throw new Error('Supabase client required');
    this.supabase = supabase;
    this.schoolId = schoolId;
  }

  setSchoolId(id) { this.schoolId = id; }

  _require() {
    if (!this.schoolId) throw new Error('🔒 SECURITY: school_id is required');
  }

  async getSubstitutions(date = null) {
    this._require();
    let query = this.supabase
      .from('substitutions')
      .select(`
        *,
        absent_teacher:teachers!substitutions_absent_teacher_id_fkey(id, full_name),
        substitute_teacher:teachers!substitutions_substitute_teacher_id_fkey(id, full_name)
      `)
      .eq('school_id', this.schoolId)
      .order('date', { ascending: false })
      .order('slot_number', { ascending: true });

    if (date) query = query.eq('date', date);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createSubstitution({ absent_teacher_id, substitute_teacher_id, class_name, subject, date, slot_number, notes }) {
    this._require();
    const { data, error } = await this.supabase
      .from('substitutions')
      .insert([{
        school_id: this.schoolId,
        absent_teacher_id,
        substitute_teacher_id: substitute_teacher_id || null,
        class_name,
        subject,
        date,
        slot_number,
        notes: notes || null,
        status: substitute_teacher_id ? 'confirmed' : 'pending',
      }])
      .select(`
        *,
        absent_teacher:teachers!substitutions_absent_teacher_id_fkey(id, full_name),
        substitute_teacher:teachers!substitutions_substitute_teacher_id_fkey(id, full_name)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async updateSubstitution(id, updates) {
    this._require();
    const { data, error } = await this.supabase
      .from('substitutions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', this.schoolId)
      .select(`
        *,
        absent_teacher:teachers!substitutions_absent_teacher_id_fkey(id, full_name),
        substitute_teacher:teachers!substitutions_substitute_teacher_id_fkey(id, full_name)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async deleteSubstitution(id) {
    this._require();
    const { error } = await this.supabase
      .from('substitutions')
      .delete()
      .eq('id', id)
      .eq('school_id', this.schoolId);
    if (error) throw error;
    return true;
  }

  /**
   * Find available substitute teachers for a given day+slot.
   * Returns teachers sorted by workload (ascending = fewer hours = higher priority).
   */
  findAvailableSubstitutes({ teachers, publishedEntries, availabilityRecords, assignments, existingSubstitutions, dayOfWeek, slotNumber, date, excludeTeacherId }) {
    // Busy in published timetable at this day+slot (including double class overflow)
    const busyIds = new Set(
      publishedEntries
        .filter(e =>
          e.day_of_week === dayOfWeek &&
          (e.slot_number === slotNumber || (e.is_double && e.slot_number === slotNumber - 1))
        )
        .map(e => e.teacher_id)
    );

    // Already assigned as substitute on this date+slot
    const alreadySubbing = new Set(
      (existingSubstitutions || [])
        .filter(s => s.date === date && s.slot_number === slotNumber && s.status === 'confirmed' && s.substitute_teacher_id)
        .map(s => s.substitute_teacher_id)
    );

    // Blocked in availability
    const availBlocked = new Set(
      availabilityRecords
        .filter(r => !r.is_available && r.day_of_week === dayOfWeek && r.slot_number === slotNumber)
        .map(r => r.teacher_id)
    );

    // Weekly workload per teacher
    const workload = assignments.reduce((acc, a) => {
      acc[a.teacher_id] = (acc[a.teacher_id] || 0) + (a.periods_per_week || 0);
      return acc;
    }, {});

    return teachers
      .filter(t =>
        t.id !== excludeTeacherId &&
        !busyIds.has(t.id) &&
        !alreadySubbing.has(t.id) &&
        !availBlocked.has(t.id)
      )
      .map(t => ({ ...t, weeklyLoad: workload[t.id] || 0 }))
      .sort((a, b) => a.weeklyLoad - b.weeklyLoad);
  }
}
