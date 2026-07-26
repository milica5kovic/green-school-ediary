import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight, Link2, X, Check } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';

export default function TeacherAssignmentsSetup({
  assignments,
  teachers,
  classes,
  onAdd,
  onUpdate,
  onDelete,
  saving,
}) {
  const { primaryColor } = useBranding();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', subject: '', class_name: '', periods_per_week: 1, parallel_group: '' });
  const [formError, setFormError] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editPeriods, setEditPeriods] = useState(1);
  const [groupEditingId, setGroupEditingId] = useState(null);
  const [groupDraft, setGroupDraft] = useState('');

  // Group assignments by teacher
  const byTeacher = assignments.reduce((acc, a) => {
    const tid = a.teacher_id;
    if (!acc[tid]) acc[tid] = { teacher: a.teacher, items: [] };
    acc[tid].items.push(a);
    return acc;
  }, {});

  // All existing group names (for autocomplete) + members per group (for the overview)
  const groupMembers = assignments.reduce((acc, a) => {
    if (!a.parallel_group) return acc;
    (acc[a.parallel_group] = acc[a.parallel_group] || []).push(a);
    return acc;
  }, {});
  const groupNames = Object.keys(groupMembers).sort();

  // Stable color per group name so the same group looks the same everywhere
  const GROUP_COLORS = ['#7c3aed', '#0ea5e9', '#db2777', '#ea580c', '#0d9488', '#4f46e5', '#ca8a04', '#dc2626'];
  const groupColor = (name = '') => {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length];
  };

  const handleAdd = async () => {
    setFormError('');
    if (!form.teacher_id) return setFormError('Select a teacher.');
    if (!form.subject.trim()) return setFormError('Enter a subject.');
    if (!form.class_name) return setFormError('Select a class.');
    if (form.periods_per_week < 1) return setFormError('Periods per week must be ≥ 1.');

    const duplicate = assignments.find(
      a => a.teacher_id === form.teacher_id &&
           a.subject.toLowerCase() === form.subject.trim().toLowerCase() &&
           a.class_name === form.class_name
    );
    if (duplicate) return setFormError('This assignment already exists.');

    try {
      await onAdd({ ...form, subject: form.subject.trim(), periods_per_week: Number(form.periods_per_week), parallel_group: form.parallel_group.trim() || null });
      setForm({ teacher_id: '', subject: '', class_name: '', periods_per_week: 1, parallel_group: '' });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdatePeriods = async (id) => {
    try {
      await onUpdate(id, { periods_per_week: Number(editPeriods) });
      setEditingId(null);
    } catch { /* handled in hook */ }
  };

  const saveGroup = async (id) => {
    try {
      await onUpdate(id, { parallel_group: groupDraft.trim() || null });
      setGroupEditingId(null);
      setGroupDraft('');
    } catch { /* handled in hook */ }
  };

  const toggleTeacher = (tid) => setExpandedTeachers(prev => ({ ...prev, [tid]: !prev[tid] }));

  const selectedTeacher = teachers.find(t => t.id === form.teacher_id);
  const teacherSubjects = selectedTeacher?.subjects || [];

  // Datalist shared by the add form and inline editors
  const groupDatalist = (
    <datalist id="parallel-group-options">
      {groupNames.map(g => <option key={g} value={g} />)}
    </datalist>
  );

  return (
    <div>
      {groupDatalist}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} style={{ color: primaryColor }} />
          <h3 className="font-semibold text-gray-800">Teacher Assignments</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setFormError(''); }}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border-2 font-medium transition-colors"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <Plus size={14} /> Add Assignment
        </button>
      </div>

      {/* ── Combined groups overview ──────────────────────────── */}
      {groupNames.length > 0 && (
        <div className="mb-4 p-3 rounded-xl border border-gray-200 bg-gray-50/60">
          <div className="flex items-center gap-1.5 mb-2">
            <Link2 size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Combined groups — these lessons run at the same time
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {groupNames.map(g => {
              const color = groupColor(g);
              const members = groupMembers[g];
              const classList = [...new Set(members.map(m => m.class_name))].join(', ');
              return (
                <div
                  key={g}
                  className="rounded-lg border bg-white px-2.5 py-1.5"
                  style={{ borderColor: `${color}55` }}
                  title={members.map(m => `${m.class_name} ${m.subject} — ${m.teacher?.full_name || ''}`).join('\n')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold" style={{ color }}>{g}</span>
                    <span className="text-[11px] text-gray-400">· {members.length} lesson{members.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{classList}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-xl border-2 bg-gray-50" style={{ borderColor: `${primaryColor}40` }}>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">New Assignment</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Teacher</label>
              <select
                value={form.teacher_id}
                onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value, subject: '' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="">Select teacher…</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Class</label>
              <select
                value={form.class_name}
                onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="">Select class…</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Subject</label>
              {teacherSubjects.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                >
                  <option value="">Select subject…</option>
                  {teacherSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                />
              )}
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Periods / week</label>
              <input
                type="number" min={1} max={10}
                value={form.periods_per_week}
                onChange={e => setForm(f => ({ ...f, periods_per_week: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>

            {/* Parallel group — pick an existing one or type a new name */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Link2 size={12} /> Combined group
                <span className="text-gray-400 ml-1">optional — give the same name to lessons that should run at the same time (e.g. English + ESL, French + German)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                <input
                  type="text"
                  list="parallel-group-options"
                  value={form.parallel_group}
                  onChange={e => setForm(f => ({ ...f, parallel_group: e.target.value }))}
                  placeholder="Pick or type a group name…"
                  className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                />
                {form.parallel_group && (
                  <button
                    onClick={() => setForm(f => ({ ...f, parallel_group: '' }))}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                  >clear</button>
                )}
              </div>
              {groupNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {groupNames.map(g => (
                    <button
                      key={g}
                      onClick={() => setForm(f => ({ ...f, parallel_group: g }))}
                      className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                      style={{
                        borderColor: `${groupColor(g)}55`,
                        color: groupColor(g),
                        backgroundColor: form.parallel_group === g ? `${groupColor(g)}15` : 'transparent',
                      }}
                    >{g}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {formError && <p className="text-xs text-red-500 mt-2">{formError}</p>}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-1.5 text-sm font-medium rounded-lg text-white transition-opacity"
              style={{ backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(''); }}
              className="px-4 py-1.5 text-sm font-medium rounded-lg text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Assignments grouped by teacher */}
      {Object.keys(byTeacher).length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          No assignments yet. Add one above to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(byTeacher).map(([tid, { teacher, items }]) => {
            const isExpanded = expandedTeachers[tid] !== false;
            const totalPeriods = items.reduce((s, i) => s + (i.periods_per_week || 1), 0);
            return (
              <div key={tid} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleTeacher(tid)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
                      {teacher?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium text-gray-800 text-sm">{teacher?.full_name}</span>
                    <span className="text-xs text-gray-400">{items.length} class{items.length !== 1 ? 'es' : ''} · {totalPeriods} periods/week</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {items.map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                        <span className="text-sm font-medium text-gray-800 w-20 flex-shrink-0">{a.class_name}</span>
                        <span className="text-sm text-gray-600 flex-1">{a.subject}</span>

                        {/* Combined group — inline editable */}
                        {groupEditingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              list="parallel-group-options"
                              value={groupDraft}
                              onChange={e => setGroupDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveGroup(a.id); if (e.key === 'Escape') setGroupEditingId(null); }}
                              placeholder="group name…"
                              autoFocus
                              className="w-36 px-2 py-0.5 text-xs border border-gray-300 rounded"
                            />
                            <button onClick={() => saveGroup(a.id)} className="p-1 rounded text-white" style={{ backgroundColor: primaryColor }}><Check size={12} /></button>
                            <button onClick={() => setGroupEditingId(null)} className="p-1 rounded bg-gray-200 text-gray-600"><X size={12} /></button>
                          </div>
                        ) : a.parallel_group ? (
                          <button
                            onClick={() => { setGroupEditingId(a.id); setGroupDraft(a.parallel_group); }}
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 flex items-center gap-1 transition-opacity hover:opacity-80"
                            style={{ backgroundColor: `${groupColor(a.parallel_group)}18`, color: groupColor(a.parallel_group) }}
                            title="Click to change or remove the combined group"
                          >
                            <Link2 size={10} /> {a.parallel_group}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setGroupEditingId(a.id); setGroupDraft(''); }}
                            className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 border border-dashed border-gray-300 transition-colors"
                            title="Combine this lesson with others in the same slot"
                          >
                            <Link2 size={10} /> group
                          </button>
                        )}

                        {/* Periods per week — inline edit */}
                        {editingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={1} max={10}
                              value={editPeriods}
                              onChange={e => setEditPeriods(e.target.value)}
                              className="w-14 px-2 py-0.5 text-sm border border-gray-300 rounded"
                              autoFocus
                            />
                            <button onClick={() => handleUpdatePeriods(a.id)} className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>✓</button>
                            <button onClick={() => setEditingId(null)} className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(a.id); setEditPeriods(a.periods_per_week); }}
                            className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            title="Edit periods per week"
                          >
                            {a.periods_per_week}×/week
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(a.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove assignment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
