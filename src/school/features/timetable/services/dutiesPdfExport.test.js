// ============================================================
// Tests for duty PDF export — pure logic helpers
// We cannot test the jsPDF output directly in Jest (browser API),
// but we can test the data-transformation logic in isolation.
// ============================================================

// ── Helper: replicate the lookup-building logic from dutiesPdfExport ─────────
// (mirrored here so we can unit-test it without importing the full PDF module)

function buildDutyLookup(assignments) {
  const lookup = {};
  for (const a of assignments) {
    if (!lookup[a.duty_slot_id]) lookup[a.duty_slot_id] = {};
    if (!lookup[a.duty_slot_id][a.day_of_week]) lookup[a.duty_slot_id][a.day_of_week] = [];
    const name = a.teacher?.full_name || 'Unknown';
    lookup[a.duty_slot_id][a.day_of_week].push(name.replace(/^(Ms?\.|Mr\.) /, ''));
  }
  return lookup;
}

function buildDutyTableBody(dutySlots, lookup) {
  return dutySlots.map(slot => {
    const timeLabel = `${slot.name}\n${slot.start_time?.slice(0, 5)} – ${slot.end_time?.slice(0, 5)}`;
    const row = [timeLabel];
    for (let d = 0; d < 5; d++) {
      const names = lookup[slot.id]?.[d] || [];
      const needed = slot.required_count || 0;
      let cell = names.join('\n');
      if (needed > 0 && names.length < needed) {
        cell += (cell ? '\n' : '') + `(${needed - names.length} more needed)`;
      }
      row.push(cell || '—');
    }
    return row;
  });
}

// ── hexToRgb (replicated) ─────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [34, 120, 80];
}

describe('hexToRgb', () => {
  test('converts hex with # prefix', () => {
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
  });

  test('converts hex without # prefix', () => {
    expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('000000')).toEqual([0, 0, 0]);
  });

  test('is case-insensitive', () => {
    expect(hexToRgb('#FF8800')).toEqual([255, 136, 0]);
    expect(hexToRgb('#ff8800')).toEqual([255, 136, 0]);
  });

  test('returns default green for invalid input', () => {
    expect(hexToRgb('')).toEqual([34, 120, 80]);
    expect(hexToRgb(null)).toEqual([34, 120, 80]);
    expect(hexToRgb('notacolor')).toEqual([34, 120, 80]);
  });
});

// ── buildDutyLookup ───────────────────────────────────────────────────────────

describe('buildDutyLookup', () => {
  test('returns empty object for no assignments', () => {
    expect(buildDutyLookup([])).toEqual({});
  });

  test('strips title prefix from teacher names', () => {
    const assignments = [
      { duty_slot_id: 's1', day_of_week: 0, teacher: { full_name: 'Ms. Ana Ivanovic' } },
      { duty_slot_id: 's1', day_of_week: 0, teacher: { full_name: 'Mr. Sava Simic' } },
    ];
    const lookup = buildDutyLookup(assignments);
    expect(lookup['s1'][0]).toContain('Ana Ivanovic');
    expect(lookup['s1'][0]).toContain('Sava Simic');
    expect(lookup['s1'][0]).not.toContain('Ms.');
    expect(lookup['s1'][0]).not.toContain('Mr.');
  });

  test('groups by slot and day correctly', () => {
    const assignments = [
      { duty_slot_id: 'snack', day_of_week: 1, teacher: { full_name: 'Teacher A' } },
      { duty_slot_id: 'snack', day_of_week: 3, teacher: { full_name: 'Teacher B' } },
      { duty_slot_id: 'lunch', day_of_week: 1, teacher: { full_name: 'Teacher C' } },
    ];
    const lookup = buildDutyLookup(assignments);
    expect(lookup['snack'][1]).toEqual(['Teacher A']);
    expect(lookup['snack'][3]).toEqual(['Teacher B']);
    expect(lookup['lunch'][1]).toEqual(['Teacher C']);
    expect(lookup['snack'][2]).toBeUndefined();
  });

  test('uses "Unknown" for missing teacher', () => {
    const assignments = [
      { duty_slot_id: 's1', day_of_week: 0, teacher: null },
    ];
    const lookup = buildDutyLookup(assignments);
    expect(lookup['s1'][0]).toContain('Unknown');
  });
});

// ── buildDutyTableBody ────────────────────────────────────────────────────────

describe('buildDutyTableBody', () => {
  const slots = [
    { id: 'snack', name: 'Snack Break', duty_type: 'snack', start_time: '10:30', end_time: '10:55', required_count: 2 },
    { id: 'lunch', name: 'Lunch Duty', duty_type: 'lunch', start_time: '12:30', end_time: '13:25', required_count: 0 },
  ];

  test('first cell contains name and time range', () => {
    const body = buildDutyTableBody(slots, {});
    expect(body[0][0]).toContain('Snack Break');
    expect(body[0][0]).toContain('10:30 – 10:55');
  });

  test('shows — when no assignments and required_count is 0', () => {
    const body = buildDutyTableBody(slots, {});
    // lunch slot (index 1) has required_count=0, so empty days show —
    for (let d = 1; d <= 5; d++) {
      expect(body[1][d]).toBe('—');
    }
  });

  test('shows "more needed" when no assignments but required_count > 0', () => {
    const body = buildDutyTableBody(slots, {});
    // snack slot (index 0) has required_count=2, no assignments → "(2 more needed)"
    expect(body[0][1]).toContain('2 more needed');
  });

  test('shows teacher names when assigned', () => {
    const lookup = { snack: { 0: ['Ana Ivanovic', 'Vera Jovanovic'] } };
    const body = buildDutyTableBody(slots, lookup);
    expect(body[0][1]).toBe('Ana Ivanovic\nVera Jovanovic');
  });

  test('appends "N more needed" for under-staffed cells', () => {
    const lookup = { snack: { 0: ['Ana Ivanovic'] } }; // required=2, only 1
    const body = buildDutyTableBody(slots, lookup);
    expect(body[0][1]).toContain('(1 more needed)');
  });

  test('does not append "more needed" when required_count is 0', () => {
    const lookup = { lunch: { 0: [] } };
    const body = buildDutyTableBody(slots, lookup);
    expect(body[1][1]).toBe('—');
    expect(body[1][1]).not.toContain('more needed');
  });

  test('returns correct number of rows', () => {
    const body = buildDutyTableBody(slots, {});
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveLength(6); // label + 5 days
  });
});
