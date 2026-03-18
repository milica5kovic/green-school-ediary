import React, { useState, useEffect, useCallback } from 'react';
import { UserX, UserCheck, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';
import { SubstitutionService } from '../services/substitutionService';
import { tenantSupabase } from '../../../../core/infrastructure/supabaseClient';
import { useTenant } from '../../../../core/context/TenantContext';

const DAY_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function dateToDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const js = d.getDay(); // 0=Sun, 1=Mon...
  return js === 0 || js === 6 ? null : js - 1; // Mon=0...Fri=4, null if weekend
}

// ============================================================
// SUBSTITUTE PICKER MODAL
// ============================================================
function SubPickerModal({ slot, entry, candidates, onConfirm, onClose, saving }) {
  const { primaryColor } = useBranding();
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: `${primaryColor}15` }}>
          <div>
            <h3 className="font-bold text-gray-800">Assign Substitute</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.class_name} · {entry.subject} · Period {slot}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {candidates.length === 0 ? (
            <div className="text-center py-6 text-amber-600 bg-amber-50 rounded-xl text-sm">
              <AlertCircle size={20} className="mx-auto mb-2" />
              No available teachers for this slot.
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">Sorted by weekly workload (fewest hours first):</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {candidates.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedId === t.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={selectedId === t.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
                  >
                    <input type="radio" name="substitute" value={t.id} checked={selectedId === t.id}
                      onChange={() => setSelectedId(t.id)} className="sr-only" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-800 text-sm">{t.full_name}</span>
                      <span className="text-xs text-gray-400 ml-2">{t.weeklyLoad} hrs/week</span>
                    </div>
                    {selectedId === t.id && <CheckCircle2 size={16} style={{ color: primaryColor }} />}
                  </label>
                ))}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. cover chapter 5"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(selectedId, notes)} disabled={!selectedId || saving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}>
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SubstitutionSchedule({ teachers, publishedEntries, timeSlots, availabilityRecords, assignments }) {
  const { primaryColor } = useBranding();
  const { schoolId } = useTenant();

  const [service] = useState(() => new SubstitutionService(tenantSupabase, schoolId));
  useEffect(() => { service.setSchoolId(schoolId); }, [service, schoolId]);

  const [date, setDate] = useState('');
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [substitutions, setSubstitutions] = useState([]);
  const [allSubstitutions, setAllSubstitutions] = useState([]);
  const [pickerModal, setPickerModal] = useState(null); // { slot, entry, candidates }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadAllSubs = useCallback(async () => {
    try {
      const data = await service.getSubstitutions();
      setAllSubstitutions(data);
    } catch (e) { setError(e.message); }
  }, [service]);

  useEffect(() => { loadAllSubs(); }, [loadAllSubs]);

  // Reload substitutions when date changes
  useEffect(() => {
    if (!date) { setSubstitutions([]); return; }
    service.getSubstitutions(date).then(setSubstitutions).catch(e => setError(e.message));
  }, [service, date]);

  const dayOfWeek = date ? dateToDayOfWeek(date) : null;
  const isWeekend = date && dayOfWeek === null;

  // Absent teacher's published slots for the selected day
  const absentSlots = dayOfWeek !== null && absentTeacherId
    ? publishedEntries.filter(e => e.teacher_id === absentTeacherId && e.day_of_week === dayOfWeek)
    : [];

  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);
  const slotLabel = (slotNum) => {
    const s = sortedSlots.find(s => s.slot_number === slotNum);
    return s ? `${s.label || `Period ${slotNum}`} (${s.start_time?.slice(0,5)}–${s.end_time?.slice(0,5)})` : `Period ${slotNum}`;
  };

  const getExistingSubForSlot = (slotNum) =>
    substitutions.find(s => s.slot_number === slotNum && s.absent_teacher_id === absentTeacherId);

  const openPicker = (slotEntry) => {
    const candidates = service.findAvailableSubstitutes({
      teachers,
      publishedEntries,
      availabilityRecords,
      assignments,
      existingSubstitutions: substitutions,
      dayOfWeek,
      slotNumber: slotEntry.slot_number,
      date,
      excludeTeacherId: absentTeacherId,
    });
    setPickerModal({ slot: slotEntry.slot_number, entry: slotEntry, candidates });
  };

  const handleConfirm = async (substituteId, notes) => {
    setSaving(true);
    try {
      const existingSub = getExistingSubForSlot(pickerModal.slot);
      let saved;
      if (existingSub) {
        saved = await service.updateSubstitution(existingSub.id, {
          substitute_teacher_id: substituteId,
          notes,
          status: 'confirmed',
        });
        setSubstitutions(prev => prev.map(s => s.id === existingSub.id ? saved : s));
      } else {
        saved = await service.createSubstitution({
          absent_teacher_id: absentTeacherId,
          substitute_teacher_id: substituteId,
          class_name: pickerModal.entry.class_name,
          subject: pickerModal.entry.subject,
          date,
          slot_number: pickerModal.slot,
          notes,
        });
        setSubstitutions(prev => [...prev, saved]);
      }
      setAllSubstitutions(prev => {
        const filtered = prev.filter(s => s.id !== saved.id);
        return [saved, ...filtered];
      });
      setPickerModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await service.deleteSubstitution(id);
      setSubstitutions(prev => prev.filter(s => s.id !== id));
      setAllSubstitutions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  // Group history by date
  const historyByDate = allSubstitutions.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <UserX size={18} style={{ color: primaryColor }} />
          Substitution Schedule
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Mark a teacher as absent and assign substitutes. Teachers with fewer weekly hours are prioritised.
        </p>
      </div>

      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Form */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of absence</label>
            <input
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setAbsentTeacherId(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none"
            />
            {isWeekend && (
              <p className="text-xs text-amber-600 mt-1">Selected date is a weekend.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Absent teacher</label>
            <select
              value={absentTeacherId}
              onChange={e => setAbsentTeacherId(e.target.value)}
              disabled={!date || isWeekend}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none disabled:opacity-50"
            >
              <option value="">Select teacher…</option>
              {teachers
                .filter(t => dayOfWeek !== null && publishedEntries.some(e => e.teacher_id === t.id && e.day_of_week === dayOfWeek))
                .map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)
              }
            </select>
            {date && !isWeekend && (
              <p className="text-xs text-gray-400 mt-1">
                {DAY_OF_WEEK[dayOfWeek]} · only showing teachers with published classes
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Absent teacher's schedule for that day */}
      {absentTeacherId && absentSlots.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: `${primaryColor}08` }}>
            <h3 className="font-semibold text-gray-700 text-sm">
              {teachers.find(t => t.id === absentTeacherId)?.full_name}'s schedule on {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {absentSlots.sort((a, b) => a.slot_number - b.slot_number).map(entry => {
              const existing = getExistingSubForSlot(entry.slot_number);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-36 flex-shrink-0">
                    <div className="text-xs font-semibold text-gray-600">{slotLabel(entry.slot_number)}</div>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{entry.subject}</span>
                    <span className="text-xs text-gray-400 ml-2">{entry.class_name}</span>
                  </div>

                  {existing ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                        <UserCheck size={12} />
                        {existing.substitute_teacher?.full_name}
                      </span>
                      {existing.notes && (
                        <span className="text-xs text-gray-400 italic">"{existing.notes}"</span>
                      )}
                      <button onClick={() => openPicker(entry)} className="text-xs text-gray-400 hover:text-gray-600 underline">change</button>
                      <button onClick={() => handleDelete(existing.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openPicker(entry)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border-2 transition-colors"
                      style={{ borderColor: primaryColor, color: primaryColor }}
                    >
                      <UserCheck size={13} />
                      Assign substitute
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {absentTeacherId && absentSlots.length === 0 && dayOfWeek !== null && (
        <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm">
          This teacher has no published classes on {DAY_OF_WEEK[dayOfWeek]}.
        </div>
      )}

      {/* History */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowHistory(h => !h)}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
        >
          <span>Substitution History ({allSubstitutions.length})</span>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showHistory && (
          <div className="divide-y divide-gray-100">
            {Object.keys(historyByDate).length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No substitutions recorded yet.</div>
            ) : (
              Object.entries(historyByDate)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([d, subs]) => (
                  <div key={d}>
                    <div className="px-5 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {subs.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                        <span className="w-24 text-xs text-gray-400 flex-shrink-0">Period {s.slot_number}</span>
                        <span className="font-medium text-gray-700 flex-shrink-0">{s.class_name}</span>
                        <span className="text-gray-500 flex-shrink-0">{s.subject}</span>
                        <span className="text-gray-400 text-xs flex-shrink-0">absent: {s.absent_teacher?.full_name}</span>
                        <span className="flex items-center gap-1 text-xs font-medium flex-shrink-0" style={{ color: primaryColor }}>
                          <UserCheck size={12} /> {s.substitute_teacher?.full_name || 'Unassigned'}
                        </span>
                        {s.notes && <span className="text-xs text-gray-400 italic flex-1 truncate">"{s.notes}"</span>}
                        <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors ml-auto flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {pickerModal && (
        <SubPickerModal
          slot={pickerModal.slot}
          entry={pickerModal.entry}
          candidates={pickerModal.candidates}
          onConfirm={handleConfirm}
          onClose={() => setPickerModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
