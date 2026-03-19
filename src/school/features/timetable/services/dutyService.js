// ============================================================
// DUTY SERVICE — Supabase CRUD for duty_slots + duty_assignments
// ============================================================

export class DutyService {
  constructor(supabase, schoolId = null) {
    if (!supabase) throw new Error('Supabase client is required');
    this.supabase = supabase;
    this.schoolId = schoolId;
  }

  setSchoolId(id) { this.schoolId = id; }

  _require() {
    if (!this.schoolId) throw new Error('school_id is required');
  }

  // ── Duty Slots ─────────────────────────────────────────────

  async getDutySlots() {
    this._require();
    const { data, error } = await this.supabase
      .from('duty_slots')
      .select('*')
      .eq('school_id', this.schoolId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async upsertDutySlot({ id, name, duty_type, start_time, end_time, required_count, sort_order }) {
    this._require();
    const row = {
      school_id: this.schoolId,
      name, duty_type, start_time, end_time,
      required_count: required_count ?? 1,
      sort_order: sort_order ?? 0,
    };
    if (id) row.id = id;

    const { data, error } = await this.supabase
      .from('duty_slots')
      .upsert([row], { onConflict: id ? 'id' : 'school_id,duty_type' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteDutySlot(id) {
    this._require();
    const { error } = await this.supabase
      .from('duty_slots')
      .delete()
      .eq('id', id)
      .eq('school_id', this.schoolId);
    if (error) throw error;
  }

  // ── Duty Assignments ───────────────────────────────────────

  async getDutyAssignments() {
    this._require();
    const { data, error } = await this.supabase
      .from('duty_assignments')
      .select(`
        *,
        teacher:teachers!duty_assignments_teacher_id_fkey(id, full_name, email),
        duty_slot:duty_slots!duty_assignments_duty_slot_id_fkey(id, name, duty_type, start_time, end_time)
      `)
      .eq('school_id', this.schoolId)
      .order('day_of_week', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addDutyAssignment({ duty_slot_id, teacher_id, day_of_week, notes }) {
    this._require();
    const { data, error } = await this.supabase
      .from('duty_assignments')
      .insert([{ school_id: this.schoolId, duty_slot_id, teacher_id, day_of_week, notes }])
      .select(`
        *,
        teacher:teachers!duty_assignments_teacher_id_fkey(id, full_name, email),
        duty_slot:duty_slots!duty_assignments_duty_slot_id_fkey(id, name, duty_type, start_time, end_time)
      `)
      .single();
    if (error) throw error;
    return data;
  }

  async removeDutyAssignment(id) {
    this._require();
    const { error } = await this.supabase
      .from('duty_assignments')
      .delete()
      .eq('id', id)
      .eq('school_id', this.schoolId);
    if (error) throw error;
  }

  // Helper: get assignments grouped by duty_slot_id → day_of_week → [teacher]
  buildDutyMatrix(assignments) {
    // { [slotId]: { [day]: assignment[] } }
    const matrix = {};
    for (const a of assignments) {
      if (!matrix[a.duty_slot_id]) matrix[a.duty_slot_id] = {};
      if (!matrix[a.duty_slot_id][a.day_of_week]) matrix[a.duty_slot_id][a.day_of_week] = [];
      matrix[a.duty_slot_id][a.day_of_week].push(a);
    }
    return matrix;
  }
}
