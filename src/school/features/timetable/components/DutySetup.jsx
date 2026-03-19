// ============================================================
// DUTY SETUP — Manage snack, lunch, late pick-up and other duties
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Settings, Users, Clock, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';
import { useTenant } from '../../../../core/context/TenantContext';
import { tenantSupabase } from '../../../../core/infrastructure/supabaseClient';
import { DutyService } from '../services/dutyService';

const DAYS = [
  { index: 0, name: 'Monday',    short: 'Mon' },
  { index: 1, name: 'Tuesday',   short: 'Tue' },
  { index: 2, name: 'Wednesday', short: 'Wed' },
  { index: 3, name: 'Thursday',  short: 'Thu' },
  { index: 4, name: 'Friday',    short: 'Fri' },
];

const DUTY_TYPE_LABELS = {
  arrival:         'Arrival / Gate',
  welcome:         'Welcome Session',
  snack:           'Snack Break',
  lunch:           'Lunch',
  extracurricular: 'Extra-Curricular',
  pickup:          'Late Pick-Up',
};

const DUTY_TYPE_COLORS = {
  arrival:         '#6366f1',
  welcome:         '#10b981',
  snack:           '#f59e0b',
  lunch:           '#3b82f6',
  extracurricular: '#8b5cf6',
  pickup:          '#ec4899',
};

// ── Teacher picker modal ────────────────────────────────────
function TeacherPickerModal({ teachers, busyTeachers, onSelect, onClose }) {
  const { primaryColor } = useBranding();
  const [search, setSearch] = useState('');

  const filtered = teachers.filter(t =>
    !busyTeachers.has(t.id) &&
    t.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Add Teacher to Duty</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 pt-3 pb-1">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teacher…"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-current"
            style={{ outlineColor: primaryColor }}
          />
        </div>
        <div className="max-h-64 overflow-y-auto px-4 py-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 py-4 text-center">No available teachers</p>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="w-full text-left px-3 py-2.5 text-sm rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {t.full_name.split(' ').filter(p => /^[A-Z]/.test(p)).slice(0, 2).map(p => p[0]).join('')}
              </div>
              <span className="truncate">{t.full_name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Slot config modal (edit required_count etc.) ────────────
function SlotConfigModal({ slot, onSave, onClose }) {
  const { primaryColor } = useBranding();
  const [name, setName] = useState(slot.name);
  const [required, setRequired] = useState(slot.required_count);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Configure Duty Slot</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Required teachers per day
              <span className="text-gray-400 ml-1">(0 = flexible)</span>
            </label>
            <input
              type="number"
              min="0"
              max="20"
              value={required}
              onChange={e => setRequired(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
            />
          </div>
          <div className="text-xs text-gray-400">
            <Clock size={12} className="inline mr-1" />
            {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={() => onSave({ ...slot, name, required_count: required })}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl text-white"
            style={{ backgroundColor: primaryColor }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main DutySetup component ────────────────────────────────
export default function DutySetup({ teachers = [] }) {
  const { primaryColor } = useBranding();
  const { schoolId } = useTenant();
  const supabase = tenantSupabase;

  const [dutySlots, setDutySlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Picker modal state: { slotId, day }
  const [picker, setPicker] = useState(null);
  // Config modal state
  const [configSlot, setConfigSlot] = useState(null);
  // Collapsed slots
  const [collapsed, setCollapsed] = useState({});

  const svc = useCallback(
    () => new DutyService(supabase, schoolId),
    [supabase, schoolId]
  );

  const reload = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [slots, asgns] = await Promise.all([
        svc().getDutySlots(),
        svc().getDutyAssignments(),
      ]);
      setDutySlots(slots);
      setAssignments(asgns);
      setMatrix(svc().buildDutyMatrix(asgns));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId, svc]);

  useEffect(() => { reload(); }, [reload]);

  const handleAddTeacher = async (teacherId) => {
    if (!picker) return;
    setSaving(true);
    try {
      const a = await svc().addDutyAssignment({
        duty_slot_id: picker.slotId,
        teacher_id: teacherId,
        day_of_week: picker.day,
      });
      setAssignments(prev => [...prev, a]);
      setMatrix(svc().buildDutyMatrix([...assignments, a]));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setPicker(null);
    }
  };

  const handleRemoveTeacher = async (assignmentId) => {
    setSaving(true);
    try {
      await svc().removeDutyAssignment(assignmentId);
      const next = assignments.filter(a => a.id !== assignmentId);
      setAssignments(next);
      setMatrix(svc().buildDutyMatrix(next));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlotConfig = async (slot) => {
    setSaving(true);
    try {
      const updated = await svc().upsertDutySlot(slot);
      setDutySlots(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setConfigSlot(null);
    }
  };

  const toggleCollapse = (slotId) =>
    setCollapsed(prev => ({ ...prev, [slotId]: !prev[slotId] }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${primaryColor}40`, borderTopColor: primaryColor }} />
      </div>
    );
  }

  if (dutySlots.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <p className="font-medium text-gray-600 mb-2">No duty slots configured yet.</p>
        <p className="text-xs text-gray-400">
          Run the <code>duties_migration.sql</code> in your Supabase SQL editor to set up the default duty slots.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="text-xs text-gray-400 flex items-center gap-2">
        <Users size={13} />
        Click any cell to assign teachers to a duty slot.
        <span className="ml-auto">Total staff: {teachers.length}</span>
      </div>

      {dutySlots.map(slot => {
        const color = DUTY_TYPE_COLORS[slot.duty_type] || primaryColor;
        const isCollapsed = collapsed[slot.id];

        return (
          <div key={slot.id} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Slot header */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:brightness-95 transition-all"
              style={{ backgroundColor: `${color}12` }}
              onClick={() => toggleCollapse(slot.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <div>
                  <span className="font-semibold text-sm text-gray-800">{slot.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    <Clock size={10} className="inline" /> {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                  </span>
                  {slot.required_count > 0 && (
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: color }}>
                      {slot.required_count} required
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setConfigSlot(slot); }}
                  className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Configure slot"
                >
                  <Settings size={14} />
                </button>
                {isCollapsed ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
              </div>
            </div>

            {/* Day columns */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr>
                      {DAYS.map(d => (
                        <th key={d.index} className="px-3 py-2 text-xs font-semibold text-gray-500 text-center border-b border-gray-100 w-1/5">
                          {d.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {DAYS.map(d => {
                        const dayAssignments = matrix[slot.id]?.[d.index] || [];
                        const isUnder = slot.required_count > 0 && dayAssignments.length < slot.required_count;

                        return (
                          <td key={d.index} className="align-top p-2 border-l border-gray-100 first:border-l-0">
                            <div className="space-y-1 min-h-[60px]">
                              {dayAssignments.map(a => (
                                <div
                                  key={a.id}
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs group"
                                  style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
                                >
                                  <span className="flex-1 truncate text-gray-700 font-medium">
                                    {a.teacher?.full_name?.replace(/^(Ms?\.|Mr\.) /, '') || '—'}
                                  </span>
                                  <button
                                    onClick={() => handleRemoveTeacher(a.id)}
                                    disabled={saving}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ))}

                              {/* Under-staffed indicator */}
                              {isUnder && (
                                <div className="text-xs text-amber-500 px-1 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                  {slot.required_count - dayAssignments.length} more needed
                                </div>
                              )}

                              <button
                                onClick={() => setPicker({ slotId: slot.id, day: d.index })}
                                disabled={saving}
                                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-all"
                              >
                                <Plus size={11} />
                                Add
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Teacher picker modal */}
      {picker && (
        <TeacherPickerModal
          teachers={teachers}
          busyTeachers={new Set(
            (matrix[picker.slotId]?.[picker.day] || []).map(a => a.teacher_id)
          )}
          onSelect={handleAddTeacher}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Slot config modal */}
      {configSlot && (
        <SlotConfigModal
          slot={configSlot}
          onSave={handleSaveSlotConfig}
          onClose={() => setConfigSlot(null)}
        />
      )}
    </div>
  );
}
