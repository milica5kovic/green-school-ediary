import { SubstitutionService } from './substitutionService';

const SCHOOL_ID = 'school-abc';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTeacher(id, extra = {}) {
  return { id, full_name: `Teacher ${id}`, ...extra };
}

function makeEntry(overrides = {}) {
  return {
    id: overrides.id || 'e1',
    teacher_id: overrides.teacher_id || 't1',
    day_of_week: overrides.day_of_week ?? 0,
    slot_number: overrides.slot_number ?? 1,
    is_double: overrides.is_double ?? false,
    class_name: overrides.class_name || 'Y1',
    subject: overrides.subject || 'Maths',
  };
}

// ── Constructor ───────────────────────────────────────────────────────────────

describe('SubstitutionService constructor', () => {
  test('throws if supabase is not provided', () => {
    expect(() => new SubstitutionService(null)).toThrow('Supabase client required');
  });

  test('creates instance without schoolId', () => {
    const svc = new SubstitutionService({});
    expect(svc.schoolId).toBeNull();
  });

  test('setSchoolId works', () => {
    const svc = new SubstitutionService({});
    svc.setSchoolId(SCHOOL_ID);
    expect(svc.schoolId).toBe(SCHOOL_ID);
  });
});

// ── _require ──────────────────────────────────────────────────────────────────

describe('SubstitutionService._require', () => {
  test('throws when schoolId is null', async () => {
    const svc = new SubstitutionService({}, null);
    await expect(svc.getSubstitutions()).rejects.toThrow('school_id is required');
  });
});

// ── findAvailableSubstitutes ──────────────────────────────────────────────────

describe('SubstitutionService.findAvailableSubstitutes', () => {
  const svc = new SubstitutionService({}, SCHOOL_ID);

  const baseArgs = {
    teachers: [makeTeacher('t1'), makeTeacher('t2'), makeTeacher('t3')],
    publishedEntries: [],
    availabilityRecords: [],
    assignments: [],
    existingSubstitutions: [],
    dayOfWeek: 0,
    slotNumber: 1,
    date: '2025-10-01',
    excludeTeacherId: null,
  };

  test('returns all teachers when no constraints', () => {
    const result = svc.findAvailableSubstitutes(baseArgs);
    expect(result).toHaveLength(3);
  });

  test('excludes the absent teacher', () => {
    const result = svc.findAvailableSubstitutes({ ...baseArgs, excludeTeacherId: 't1' });
    expect(result.map(t => t.id)).not.toContain('t1');
    expect(result).toHaveLength(2);
  });

  test('excludes teachers busy in published timetable at that slot', () => {
    const publishedEntries = [
      makeEntry({ teacher_id: 't2', day_of_week: 0, slot_number: 1 }),
    ];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, publishedEntries });
    expect(result.map(t => t.id)).not.toContain('t2');
    expect(result).toHaveLength(2);
  });

  test('excludes teachers busy via double-class overflow', () => {
    // t3 has a double class at slot 0 (day 0), so slot 1 is also occupied
    const publishedEntries = [
      makeEntry({ teacher_id: 't3', day_of_week: 0, slot_number: 0, is_double: true }),
    ];
    const result = svc.findAvailableSubstitutes({
      ...baseArgs,
      publishedEntries,
      slotNumber: 1,
    });
    expect(result.map(t => t.id)).not.toContain('t3');
  });

  test('excludes teachers already subbing on that date+slot', () => {
    const existingSubstitutions = [{
      date: '2025-10-01',
      slot_number: 1,
      substitute_teacher_id: 't1',
      status: 'confirmed',
    }];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, existingSubstitutions });
    expect(result.map(t => t.id)).not.toContain('t1');
  });

  test('does not exclude pending substitutions', () => {
    const existingSubstitutions = [{
      date: '2025-10-01',
      slot_number: 1,
      substitute_teacher_id: 't1',
      status: 'pending',
    }];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, existingSubstitutions });
    expect(result.map(t => t.id)).toContain('t1');
  });

  test('excludes teachers blocked by availability', () => {
    const availabilityRecords = [
      { teacher_id: 't2', day_of_week: 0, slot_number: 1, is_available: false },
    ];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, availabilityRecords });
    expect(result.map(t => t.id)).not.toContain('t2');
  });

  test('does not exclude teachers available (is_available=true) from availability records', () => {
    const availabilityRecords = [
      { teacher_id: 't2', day_of_week: 0, slot_number: 1, is_available: true },
    ];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, availabilityRecords });
    expect(result.map(t => t.id)).toContain('t2');
  });

  test('sorts results by weekly workload ascending', () => {
    const assignments = [
      { teacher_id: 't1', periods_per_week: 10 },
      { teacher_id: 't2', periods_per_week: 3 },
      { teacher_id: 't3', periods_per_week: 7 },
    ];
    const result = svc.findAvailableSubstitutes({ ...baseArgs, assignments });
    const loads = result.map(t => t.weeklyLoad);
    expect(loads).toEqual([...loads].sort((a, b) => a - b));
  });

  test('teachers with no assignments get weeklyLoad of 0', () => {
    const result = svc.findAvailableSubstitutes(baseArgs);
    result.forEach(t => expect(t.weeklyLoad).toBe(0));
  });

  test('returns empty array when all teachers are excluded', () => {
    const result = svc.findAvailableSubstitutes({
      ...baseArgs,
      publishedEntries: [
        makeEntry({ teacher_id: 't1', day_of_week: 0, slot_number: 1 }),
        makeEntry({ teacher_id: 't2', day_of_week: 0, slot_number: 1 }),
        makeEntry({ teacher_id: 't3', day_of_week: 0, slot_number: 1 }),
      ],
    });
    expect(result).toHaveLength(0);
  });
});

// ── createSubstitution status logic ──────────────────────────────────────────

describe('SubstitutionService.createSubstitution status', () => {
  test('status is confirmed when substitute is provided', async () => {
    let insertedData = null;
    const mockSupabase = {
      from: () => ({
        insert: (rows) => { insertedData = rows[0]; return { select: () => ({ single: async () => ({ data: rows[0], error: null }) }) }; },
      }),
    };
    const svc = new SubstitutionService(mockSupabase, SCHOOL_ID);
    await svc.createSubstitution({
      absent_teacher_id: 't1',
      substitute_teacher_id: 't2',
      class_name: 'Y1',
      subject: 'Maths',
      date: '2025-10-01',
      slot_number: 1,
    });
    expect(insertedData.status).toBe('confirmed');
  });

  test('status is pending when no substitute provided', async () => {
    let insertedData = null;
    const mockSupabase = {
      from: () => ({
        insert: (rows) => { insertedData = rows[0]; return { select: () => ({ single: async () => ({ data: rows[0], error: null }) }) }; },
      }),
    };
    const svc = new SubstitutionService(mockSupabase, SCHOOL_ID);
    await svc.createSubstitution({
      absent_teacher_id: 't1',
      substitute_teacher_id: null,
      class_name: 'Y1',
      subject: 'Maths',
      date: '2025-10-01',
      slot_number: 1,
    });
    expect(insertedData.status).toBe('pending');
  });
});
