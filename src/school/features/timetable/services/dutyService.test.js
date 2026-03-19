import { DutyService } from './dutyService';

// ── Mock Supabase ─────────────────────────────────────────────────────────────

function makeMockSupabase({ data = null, error = null } = {}) {
  const chain = {
    data,
    error,
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
    single: jest.fn().mockResolvedValue({ data, error }),
    upsert: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  return { from: jest.fn().mockReturnValue(chain), _chain: chain };
}

const SCHOOL_ID = 'school-123';

// ── Constructor ───────────────────────────────────────────────────────────────

describe('DutyService constructor', () => {
  test('throws if supabase is not provided', () => {
    expect(() => new DutyService(null)).toThrow('Supabase client is required');
  });

  test('creates instance with schoolId', () => {
    const svc = new DutyService({}, SCHOOL_ID);
    expect(svc.schoolId).toBe(SCHOOL_ID);
  });

  test('setSchoolId updates the schoolId', () => {
    const svc = new DutyService({}, SCHOOL_ID);
    svc.setSchoolId('other-school');
    expect(svc.schoolId).toBe('other-school');
  });
});

// ── _require ──────────────────────────────────────────────────────────────────

describe('DutyService._require', () => {
  test('throws when schoolId is null', async () => {
    const svc = new DutyService({}, null);
    await expect(svc.getDutySlots()).rejects.toThrow('school_id is required');
  });

  test('does not throw when schoolId is set', () => {
    const { _chain, ...supabase } = makeMockSupabase({ data: [], error: null });
    const svc = new DutyService(supabase, SCHOOL_ID);
    expect(() => svc._require()).not.toThrow();
  });
});

// ── buildDutyMatrix ───────────────────────────────────────────────────────────

describe('DutyService.buildDutyMatrix', () => {
  const svc = new DutyService({}, SCHOOL_ID);

  test('returns empty object for empty input', () => {
    expect(svc.buildDutyMatrix([])).toEqual({});
  });

  test('groups by slot id then day', () => {
    const assignments = [
      { id: 'a1', duty_slot_id: 'slot1', day_of_week: 0, teacher_id: 't1' },
      { id: 'a2', duty_slot_id: 'slot1', day_of_week: 0, teacher_id: 't2' },
      { id: 'a3', duty_slot_id: 'slot1', day_of_week: 1, teacher_id: 't3' },
      { id: 'a4', duty_slot_id: 'slot2', day_of_week: 0, teacher_id: 't1' },
    ];
    const matrix = svc.buildDutyMatrix(assignments);

    expect(matrix['slot1'][0]).toHaveLength(2);
    expect(matrix['slot1'][1]).toHaveLength(1);
    expect(matrix['slot2'][0]).toHaveLength(1);
    expect(matrix['slot2'][1]).toBeUndefined();
  });

  test('preserves full assignment objects in the matrix', () => {
    const a = { id: 'a1', duty_slot_id: 'slot1', day_of_week: 2, teacher_id: 't5', notes: 'test' };
    const matrix = svc.buildDutyMatrix([a]);
    expect(matrix['slot1'][2][0]).toEqual(a);
  });

  test('handles multiple slots independently', () => {
    const assignments = [
      { id: 'a1', duty_slot_id: 'slotA', day_of_week: 0, teacher_id: 't1' },
      { id: 'a2', duty_slot_id: 'slotB', day_of_week: 0, teacher_id: 't1' },
      { id: 'a3', duty_slot_id: 'slotB', day_of_week: 4, teacher_id: 't2' },
    ];
    const matrix = svc.buildDutyMatrix(assignments);
    expect(Object.keys(matrix)).toEqual(['slotA', 'slotB']);
    expect(matrix['slotA'][0]).toHaveLength(1);
    expect(matrix['slotB'][0]).toHaveLength(1);
    expect(matrix['slotB'][4]).toHaveLength(1);
  });
});

// ── getDutySlots (mocked Supabase) ────────────────────────────────────────────

describe('DutyService.getDutySlots', () => {
  test('returns sorted duty slots from supabase', async () => {
    const slots = [{ id: 's1', name: 'Snack', sort_order: 1 }];
    const mock = makeMockSupabase({ data: slots, error: null });
    const svc = new DutyService(mock, SCHOOL_ID);
    const result = await svc.getDutySlots();
    expect(result).toEqual(slots);
    expect(mock.from).toHaveBeenCalledWith('duty_slots');
  });

  test('throws when supabase returns an error', async () => {
    const mock = makeMockSupabase({ data: null, error: { message: 'DB error' } });
    const svc = new DutyService(mock, SCHOOL_ID);
    await expect(svc.getDutySlots()).rejects.toEqual({ message: 'DB error' });
  });

  test('returns empty array when data is null', async () => {
    const mock = makeMockSupabase({ data: null, error: null });
    const svc = new DutyService(mock, SCHOOL_ID);
    const result = await svc.getDutySlots();
    expect(result).toEqual([]);
  });
});
