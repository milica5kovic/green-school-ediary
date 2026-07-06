// ============================================================================
// REPORTS SERVICE — Tenant-aware, handles all report module data operations
// ============================================================================

export const PSD_STATEMENTS_SEED = [
  'Listens carefully and follows instructions',
  'Works independently and uses time wisely',
  'Completes class work to the best of their ability',
  'Completes homework on time and to a good standard',
  'Takes pride in the presentation of their work',
  'Shows a positive attitude towards learning',
  'Shows respect for peers, teachers, and school property',
  'Works cooperatively and constructively in a group',
  'Seeks help when needed and asks thoughtful questions',
  'Demonstrates responsibility and self-discipline',
  'Participates actively in class discussions',
  'Shows initiative and creative thinking',
  'Handles constructive feedback positively and acts on it',
];

export const REPORT_OBJECTIVES_SEED = [
  // ICT — Year 5
  { subject_name: 'ICT', year_group: 5, section: 'Digital Literacy', text: 'Can use spreadsheet software to organise and analyse data', sort_order: 1 },
  { subject_name: 'ICT', year_group: 5, section: 'Digital Literacy', text: 'Understands how search algorithms work and can evaluate online sources', sort_order: 2 },
  { subject_name: 'ICT', year_group: 5, section: 'Digital Literacy', text: 'Can create, format and present a document for a specific audience', sort_order: 3 },
  { subject_name: 'ICT', year_group: 5, section: 'Programming',      text: 'Can use variables, loops and conditionals in a block-based language', sort_order: 4 },
  { subject_name: 'ICT', year_group: 5, section: 'Programming',      text: 'Can debug a simple program and explain the error clearly', sort_order: 5 },
  { subject_name: 'ICT', year_group: 5, section: 'Programming',      text: 'Can design and create a simple program to solve a given problem', sort_order: 6 },
  { subject_name: 'ICT', year_group: 5, section: 'E-Safety',         text: 'Understands the importance of protecting personal information online', sort_order: 7 },
  { subject_name: 'ICT', year_group: 5, section: 'E-Safety',         text: 'Can identify the risks of sharing information publicly and knows how to report concerns', sort_order: 8 },
  // ICT — Year 6
  { subject_name: 'ICT', year_group: 6, section: 'Digital Literacy', text: 'Can collect, enter and interpret data in a spreadsheet using formulas', sort_order: 1 },
  { subject_name: 'ICT', year_group: 6, section: 'Digital Literacy', text: 'Can critically evaluate websites and digital media for bias and accuracy', sort_order: 2 },
  { subject_name: 'ICT', year_group: 6, section: 'Programming',      text: 'Can plan and create a program using sequence, selection and repetition', sort_order: 3 },
  { subject_name: 'ICT', year_group: 6, section: 'Programming',      text: 'Can trace through a program to predict its output', sort_order: 4 },
  { subject_name: 'ICT', year_group: 6, section: 'E-Safety',         text: 'Understands digital footprints and their long-term implications', sort_order: 5 },
  { subject_name: 'ICT', year_group: 6, section: 'E-Safety',         text: 'Can describe strategies for staying safe and responsible online', sort_order: 6 },
];

export const DEFAULT_VALIDATION_RULES_SEED = [
  { report_type: 'all', rule_key: 'word_count', config: { min: 60, max: 120 }, severity: 'hard', active: true },
];

export const OBJECTIVE_SCALE = ['Assistance Required', 'Working Towards', 'Achieving', 'Working Above'];
export const PSD_SCALE = ['Rarely', 'Sometimes', 'Generally', 'Consistently'];

export const PRIMARY_ATTAINMENT = ['A', 'B', 'C', 'D', 'N/A'];
export const PRIMARY_EFFORT     = ['1', '2', '3', '4', 'N/A'];
export const SECONDARY_ATTAINMENT = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'U'];
export const SECONDARY_EFFORT     = ['1', '2', '3'];

// Extract year group number from class_name strings like "Y5A", "Year 5", "5B", "Grade 7"
export const getYearFromClassName = (className) => {
  if (!className) return null;
  const match = className.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

export const getReportType = (className) => {
  const y = getYearFromClassName(className);
  if (y === null) return null;
  if (y >= 1 && y <= 6) return 'primary';
  if (y >= 7 && y <= 9) return 'lower_secondary';
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────

export class ReportsService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  async isSetupComplete() {
    const { data } = await this.supabase
      .from('psd_statements')
      .select('id', { count: 'exact', head: true });
    return (data?.length ?? 0) > 0;
  }

  async setupSchool() {
    // Idempotent: skip if already seeded
    const { data: existing } = await this.supabase
      .from('psd_statements')
      .select('id')
      .limit(1);
    if (existing?.length > 0) return { alreadyDone: true };

    const { error: psdErr } = await this.supabase
      .from('psd_statements')
      .insert(PSD_STATEMENTS_SEED.map((text, i) => ({ text, sort_order: i + 1 })));
    if (psdErr) throw psdErr;

    const { error: objErr } = await this.supabase
      .from('report_objectives')
      .insert(REPORT_OBJECTIVES_SEED);
    if (objErr) throw objErr;

    const { error: ruleErr } = await this.supabase
      .from('report_validation_rules')
      .insert(DEFAULT_VALIDATION_RULES_SEED);
    if (ruleErr) throw ruleErr;

    return { alreadyDone: false };
  }

  // ── Periods ────────────────────────────────────────────────────────────────

  async getPeriods() {
    const { data, error } = await this.supabase
      .from('report_periods')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async createPeriod(periodData) {
    const { data, error } = await this.supabase
      .from('report_periods')
      .insert(periodData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updatePeriod(id, updates) {
    const { data, error } = await this.supabase
      .from('report_periods')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Auto-create draft report_entries for every student × subject combination
  // derived from teacher_schedule for classes in this period.
  async openPeriod(periodId) {
    // Fetch all teacher-class-subject assignments
    const { data: scheduleRows, error: schedErr } = await this.supabase
      .from('teacher_assignments')
      .select('teacher_id, class_name, subject');
    if (schedErr) throw schedErr;

    // Fetch all students with their class_name and year_group
    const { data: students, error: stuErr } = await this.supabase
      .from('students')
      .select('id, class_name');
    if (stuErr) throw stuErr;

    // Fetch teachers to map teacher_id
    const { data: teachers, error: tchErr } = await this.supabase
      .from('teachers')
      .select('id, class_teacher_for');
    if (tchErr) throw tchErr;

    if (!scheduleRows?.length || !students?.length) return { created: 0 };

    // Build unique (class_name, subject) → teacher_id mapping
    const assignmentMap = {};
    for (const row of scheduleRows) {
      if (row.class_name && row.subject && row.teacher_id) {
        const key = `${row.class_name}|||${row.subject}`;
        assignmentMap[key] = row.teacher_id;
      }
    }

    const entries = [];
    for (const student of students) {
      for (const [key, teacherId] of Object.entries(assignmentMap)) {
        const [className, subjectName] = key.split('|||');
        if (student.class_name === className) {
          entries.push({
            period_id:    periodId,
            student_id:   student.id,
            subject_name: subjectName,
            teacher_id:   teacherId,
            status:       'draft',
          });
        }
      }
    }

    if (!entries.length) return { created: 0 };

    // Upsert to avoid duplicates if re-opening
    const { error: insErr } = await this.supabase
      .from('report_entries')
      .upsert(entries, { onConflict: 'period_id,student_id,subject_name', ignoreDuplicates: true });
    if (insErr) throw insErr;

    // Auto-create report_meta rows (one per student)
    const uniqueStudentIds = [...new Set(entries.map(e => e.student_id))];
    const metaRows = uniqueStudentIds.map(sid => ({
      period_id:  periodId,
      student_id: sid,
      status:     'in_progress',
    }));
    const { error: metaErr } = await this.supabase
      .from('report_meta')
      .upsert(metaRows, { onConflict: 'period_id,student_id', ignoreDuplicates: true });
    if (metaErr) throw metaErr;

    return { created: entries.length };
  }

  // ── Entries (subject teacher) ──────────────────────────────────────────────

  async getEntriesForTeacher(periodId, teacherId) {
    const { data, error } = await this.supabase
      .from('report_entries')
      .select(`
        *,
        student:students(id, name, class_name, date_of_birth)
      `)
      .eq('period_id', periodId)
      .eq('teacher_id', teacherId)
      .order('subject_name');
    if (error) throw error;
    return data || [];
  }

  async getEntriesForStudent(periodId, studentId) {
    const { data, error } = await this.supabase
      .from('report_entries')
      .select(`*, student:students(id, name, class_name, date_of_birth), teacher:teachers(id, full_name, class_teacher_for)`)
      .eq('period_id', periodId)
      .eq('student_id', studentId)
      .order('subject_name');
    if (error) throw error;
    return data || [];
  }

  async getAllEntriesForPeriod(periodId) {
    const { data, error } = await this.supabase
      .from('report_entries')
      .select(`
        *,
        student:students(id, name, class_name),
        teacher:teachers(id, full_name, class_teacher_for)
      `)
      .eq('period_id', periodId)
      .order('subject_name');
    if (error) throw error;
    return data || [];
  }

  async saveEntry(entryId, updates) {
    const { data, error } = await this.supabase
      .from('report_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async submitEntry(entryId) {
    return this.saveEntry(entryId, {
      status:       'submitted',
      submitted_at: new Date().toISOString(),
    });
  }

  async approveEntry(entryId) {
    return this.saveEntry(entryId, { status: 'approved' });
  }

  async rejectEntry(entryId, rejectionComment) {
    return this.saveEntry(entryId, {
      status:            'rejected',
      rejection_comment: rejectionComment,
    });
  }

  // ── Report Meta (class teacher) ────────────────────────────────────────────

  async getMetaForClass(periodId, className) {
    const { data, error } = await this.supabase
      .from('report_meta')
      .select(`*, student:students(id, name, class_name, date_of_birth)`)
      .eq('period_id', periodId);
    if (error) throw error;
    return (data || []).filter(m => m.student?.class_name === className);
  }

  async getMetaForStudent(periodId, studentId) {
    const { data, error } = await this.supabase
      .from('report_meta')
      .select('*')
      .eq('period_id', periodId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async saveMeta(metaId, updates) {
    const { data, error } = await this.supabase
      .from('report_meta')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', metaId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── PSD & Objectives ───────────────────────────────────────────────────────

  async getPsdStatements() {
    const { data, error } = await this.supabase
      .from('psd_statements')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    return data || [];
  }

  async getObjectives(subjectName, yearGroup) {
    const { data, error } = await this.supabase
      .from('report_objectives')
      .select('*')
      .eq('subject_name', subjectName)
      .eq('year_group', yearGroup)
      .order('sort_order');
    if (error) throw error;
    return data || [];
  }

  // ── Validation Rules ───────────────────────────────────────────────────────

  async getValidationRules(reportType) {
    const { data, error } = await this.supabase
      .from('report_validation_rules')
      .select('*')
      .eq('active', true)
      .or(`report_type.eq.all,report_type.eq.${reportType}`);
    if (error) throw error;
    return data || [];
  }

  // ── Progress matrix for director ──────────────────────────────────────────

  async getProgressMatrix(periodId) {
    const entries = await this.getAllEntriesForPeriod(periodId);
    const { data: metaRows, error } = await this.supabase
      .from('report_meta')
      .select('*, student:students(id, name, class_name)')
      .eq('period_id', periodId);
    if (error) throw error;

    // Group by student
    const byStudent = {};
    for (const e of entries) {
      const sid = e.student_id;
      if (!byStudent[sid]) byStudent[sid] = { student: e.student, entries: [] };
      byStudent[sid].entries.push(e);
    }
    for (const m of (metaRows || [])) {
      const sid = m.student_id;
      if (!byStudent[sid]) byStudent[sid] = { student: m.student, entries: [] };
      byStudent[sid].meta = m;
    }

    return Object.values(byStudent);
  }
}
