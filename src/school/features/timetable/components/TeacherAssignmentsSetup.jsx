import React, { useState } from 'react';
import { Plus, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [form, setForm] = useState({ teacher_id: '', subject: '', class_name: '', periods_per_week: 1 });
  const [formError, setFormError] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editPeriods, setEditPeriods] = useState(1);

  // Group assignments by teacher
  const byTeacher = assignments.reduce((acc, a) => {
    const tid = a.teacher_id;
    if (!acc[tid]) acc[tid] = { teacher: a.teacher, items: [] };
    acc[tid].items.push(a);
    return acc;
  }, {});

  const handleAdd = async () => {
    setFormError('');
    if (!form.teacher_id) return setFormError('Select a teacher.');
    if (!form.subject.trim()) return setFormError('Enter a subject.');
    if (!form.class_name) return setFormError('Select a class.');
    if (form.periods_per_week < 1) return setFormError('Periods per week must be ≥ 1.');

    // Duplicate check
    const duplicate = assignments.find(
      a => a.teacher_id === form.teacher_id &&
           a.subject.toLowerCase() === form.subject.trim().toLowerCase() &&
           a.class_name === form.class_name
    );
    if (duplicate) return setFormError('This assignment already exists.');

    try {
      await onAdd({ ...form, subject: form.subject.trim(), periods_per_week: Number(form.periods_per_week) });
      setForm({ teacher_id: '', subject: '', class_name: '', periods_per_week: 1 });
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleUpdatePeriods = async (id) => {
    try {
      await onUpdate(id, { periods_per_week: Number(editPeriods) });
      setEditingId(null);
    } catch (err) {
      // error handled in hook
    }
  };

  const toggleTeacher = (tid) => {
    setExpandedTeachers(prev => ({ ...prev, [tid]: !prev[tid] }));
  };

  // Subjects from selected teacher (from their subjects array)
  const selectedTeacher = teachers.find(t => t.id === form.teacher_id);
  const teacherSubjects = selectedTeacher?.subjects || [];

  return (
    <div>
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

      {/* Add Form */}
      {showForm && (
        <div
          className="mb-4 p-4 rounded-xl border-2 bg-gray-50"
          style={{ borderColor: `${primaryColor}40` }}
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-3">New Assignment</h4>
          <div className="grid grid-cols-2 gap-3">
            {/* Teacher */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Teacher</label>
              <select
                value={form.teacher_id}
                onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value, subject: '' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="">Select teacher…</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Class</label>
              <select
                value={form.class_name}
                onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              >
                <option value="">Select class…</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Subject</label>
              {teacherSubjects.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
                >
                  <option value="">Select subject…</option>
                  {teacherSubjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
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

            {/* Periods per week */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Periods / week</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.periods_per_week}
                onChange={e => setForm(f => ({ ...f, periods_per_week: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-500 mt-2">{formError}</p>
          )}

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
            const isExpanded = expandedTeachers[tid] !== false; // default expanded
            const totalPeriods = items.reduce((s, i) => s + (i.periods_per_week || 1), 0);
            return (
              <div key={tid} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Teacher header */}
                <button
                  onClick={() => toggleTeacher(tid)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {teacher?.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="font-medium text-gray-800 text-sm">{teacher?.full_name}</span>
                    <span className="text-xs text-gray-400">{items.length} class{items.length !== 1 ? 'es' : ''} · {totalPeriods} periods/week</span>
                  </div>
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </button>

                {/* Assignment rows */}
                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {items.map(a => (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: primaryColor }}
                        />
                        <span className="text-sm font-medium text-gray-800 w-20 flex-shrink-0">{a.class_name}</span>
                        <span className="text-sm text-gray-600 flex-1">{a.subject}</span>

                        {/* Periods per week — inline edit */}
                        {editingId === a.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={editPeriods}
                              onChange={e => setEditPeriods(e.target.value)}
                              className="w-14 px-2 py-0.5 text-sm border border-gray-300 rounded"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdatePeriods(a.id)}
                              className="text-xs px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: primaryColor }}
                            >✓</button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600"
                            >✕</button>
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
