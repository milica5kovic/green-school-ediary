import React, { useState } from 'react';
import { X, AlertTriangle, Plus } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';

const DAYS = [
  { index: 0, name: 'Monday' },
  { index: 1, name: 'Tuesday' },
  { index: 2, name: 'Wednesday' },
  { index: 3, name: 'Thursday' },
  { index: 4, name: 'Friday' },
];

// Consistent subject colours for readability
const SUBJECT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16',
];
function subjectColor(subject = '') {
  let hash = 0;
  for (const c of subject) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

// ============================================================
// CELL MODAL — Add / edit a timetable cell
// ============================================================
function CellModal({ day, slot, existingEntry, assignments, allEntries, onSave, onDelete, onClose, saving }) {
  const { primaryColor } = useBranding();
  const dayName = DAYS.find(d => d.index === day)?.name;
  const slotLabel = slot.label || `Period ${slot.slot_number}`;

  // Entries already occupying this slot (excluding the one being edited)
  const busyClasses = new Set(
    allEntries
      .filter(e => e.day_of_week === day && e.slot_number === slot.slot_number && e.id !== existingEntry?.id)
      .map(e => e.class_name)
  );
  const busyTeachers = new Set(
    allEntries
      .filter(e => e.day_of_week === day && e.slot_number === slot.slot_number && e.id !== existingEntry?.id)
      .map(e => e.teacher_id)
  );

  // Classes from assignments (that are free in this slot)
  const availableClasses = [...new Set(assignments.map(a => a.class_name))]
    .filter(c => !busyClasses.has(c) || c === existingEntry?.class_name)
    .sort();

  const [selectedClass, setSelectedClass] = useState(existingEntry?.class_name || '');
  const [selectedAsgn, setSelectedAsgn] = useState('');

  // Filter assignments for selected class — exclude busy teachers (unless it's the existing one)
  const classAssignments = assignments
    .filter(a => a.class_name === selectedClass)
    .filter(a => !busyTeachers.has(a.teacher_id) || a.teacher_id === existingEntry?.teacher_id);

  // Pre-select assignment if editing
  React.useEffect(() => {
    if (existingEntry) {
      const match = assignments.find(
        a => a.teacher_id === existingEntry.teacher_id &&
             a.subject === existingEntry.subject &&
             a.class_name === existingEntry.class_name
      );
      if (match) setSelectedAsgn(match.id);
    }
  }, [existingEntry, assignments]);

  const handleSave = () => {
    const asgn = assignments.find(a => a.id === selectedAsgn);
    if (!asgn) return;
    onSave({
      teacher_id: asgn.teacher_id,
      subject: asgn.subject,
      class_name: asgn.class_name,
      day_of_week: day,
      slot_number: slot.slot_number,
    });
  };

  const isValid = selectedClass && selectedAsgn;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <div>
            <h3 className="font-bold text-gray-800">
              {existingEntry ? 'Edit Entry' : 'Add Entry'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {dayName} · {slotLabel} · {slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Class selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedAsgn(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': `${primaryColor}50` }}
            >
              <option value="">Select class…</option>
              {availableClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subject / Teacher selector */}
          {selectedClass && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject & Teacher</label>
              {classAssignments.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  No available assignments for this class at this time slot.
                  The teacher may already be busy or this class has no assignments.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {classAssignments.map(a => (
                    <label
                      key={a.id}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all
                        ${selectedAsgn === a.id
                          ? 'border-current bg-opacity-10'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                      style={selectedAsgn === a.id ? {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor}10`,
                      } : {}}
                    >
                      <input
                        type="radio"
                        name="assignment"
                        value={a.id}
                        checked={selectedAsgn === a.id}
                        onChange={() => setSelectedAsgn(a.id)}
                        className="sr-only"
                      />
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: subjectColor(a.subject) }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 text-sm">{a.subject}</span>
                        <span className="text-gray-400 text-xs ml-2">— {a.teacher?.full_name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          {existingEntry && (
            <button
              onClick={() => onDelete(existingEntry.id)}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {saving ? 'Saving…' : existingEntry ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TIMETABLE GRID
// ============================================================
export default function TimetableGrid({
  entries,
  timeSlots,
  teachers,
  classes,
  assignments,
  conflicts,
  onSetCell,
  onDeleteCell,
  saving,
  viewMode, // 'draft' | 'published'
}) {
  const { primaryColor } = useBranding();
  const [filterType, setFilterType] = useState('class'); // 'class' | 'teacher' | 'all'
  const [filterValue, setFilterValue] = useState('');
  const [modalState, setModalState] = useState(null); // { day, slot, existingEntry | null }

  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);
  const isDraft = viewMode === 'draft';

  // Apply filter to entries
  const visibleEntries = entries.filter(e => {
    if (!filterValue) return true;
    if (filterType === 'class') return e.class_name === filterValue;
    if (filterType === 'teacher') return e.teacher_id === filterValue;
    return true;
  });

  // Build lookup: lookup[day][slot_number] = array of entries
  const lookup = {};
  DAYS.forEach(d => {
    lookup[d.index] = {};
    sortedSlots.forEach(s => { lookup[d.index][s.slot_number] = []; });
  });
  visibleEntries.forEach(e => {
    if (lookup[e.day_of_week]?.[e.slot_number] !== undefined) {
      lookup[e.day_of_week][e.slot_number].push(e);
    }
  });

  const openCell = (day, slot) => {
    if (!isDraft) return; // can't edit published
    const existingEntries = lookup[day.index]?.[slot.slot_number] || [];
    // If only one entry and filter is by class/teacher — edit that entry
    if (existingEntries.length === 1) {
      setModalState({ day: day.index, slot, existingEntry: existingEntries[0] });
    } else {
      setModalState({ day: day.index, slot, existingEntry: null });
    }
  };

  const handleSave = async (data) => {
    await onSetCell(data);
    setModalState(null);
  };

  const handleDelete = async (id) => {
    await onDeleteCell(id);
    setModalState(null);
  };

  const filterOptions = filterType === 'class'
    ? classes.map(c => ({ value: c, label: c }))
    : teachers.map(t => ({ value: t.id, label: t.full_name }));

  if (sortedSlots.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Configure time slots in Setup first.
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {['class', 'teacher', 'all'].map(type => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setFilterValue(''); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterType === type ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type === 'class' ? 'By Class' : type === 'teacher' ? 'By Teacher' : 'All'}
            </button>
          ))}
        </div>

        {filterType !== 'all' && (
          <select
            value={filterValue}
            onChange={e => setFilterValue(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none"
          >
            <option value="">— Show all —</option>
            {filterOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {conflicts.size > 0 && (
          <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-medium">
            <AlertTriangle size={13} />
            {conflicts.size} conflict{conflicts.size !== 1 ? 's' : ''}
          </div>
        )}

        <div className="ml-auto text-xs text-gray-400">
          {visibleEntries.length} {isDraft ? 'draft' : 'published'} entries
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
        <table className="w-full min-w-[700px] border-collapse">
          {/* Header row: days */}
          <thead>
            <tr>
              <th
                className="w-32 px-4 py-3 text-left text-xs font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Period / Time
              </th>
              {DAYS.map(d => (
                <th
                  key={d.index}
                  className="px-3 py-3 text-center text-xs font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedSlots.map((slot, si) => (
              <tr
                key={slot.slot_number}
                className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {/* Period label */}
                <td
                  className="px-4 py-3 border-r border-gray-200"
                  style={{ backgroundColor: `${primaryColor}08` }}
                >
                  <div className="font-semibold text-gray-700 text-xs">
                    {slot.label || `Period ${slot.slot_number}`}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                  </div>
                </td>

                {/* Day cells */}
                {DAYS.map(day => {
                  const cellEntries = lookup[day.index]?.[slot.slot_number] || [];
                  const hasConflict = cellEntries.some(e => conflicts.has(e.id));

                  return (
                    <td
                      key={day.index}
                      className={`
                        p-1.5 border-l border-gray-100 align-top
                        ${isDraft ? 'cursor-pointer' : 'cursor-default'}
                        ${hasConflict ? 'bg-red-50' : ''}
                      `}
                      onClick={() => isDraft && openCell(day, slot)}
                    >
                      {cellEntries.length === 0 ? (
                        isDraft ? (
                          <div className="h-14 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-all group">
                            <Plus size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                          </div>
                        ) : (
                          <div className="h-14 flex items-center justify-center text-gray-200 text-xs">—</div>
                        )
                      ) : (
                        <div className="space-y-1">
                          {cellEntries.map(entry => (
                            <GridCell
                              key={entry.id}
                              entry={entry}
                              isConflict={conflicts.has(entry.id)}
                              filterType={filterType}
                              isDraft={isDraft}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        {isDraft && <span>Click any cell to add or edit an entry.</span>}
        {conflicts.size > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
            Conflict detected
          </span>
        )}
      </div>

      {/* Modal */}
      {modalState && (
        <CellModal
          day={modalState.day}
          slot={modalState.slot}
          existingEntry={modalState.existingEntry}
          assignments={assignments}
          allEntries={entries}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalState(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ---- Individual grid cell chip ----
function GridCell({ entry, isConflict, filterType, isDraft }) {
  const color = subjectColor(entry.subject);

  return (
    <div
      className={`
        px-2 py-1.5 rounded-lg text-xs transition-all
        ${isDraft ? 'hover:opacity-80' : ''}
        ${isConflict ? 'ring-2 ring-red-400' : ''}
      `}
      style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="font-semibold text-gray-800 truncate">{entry.subject}</div>
          {filterType !== 'class' && (
            <div className="text-gray-500 truncate">{entry.class_name}</div>
          )}
          {filterType !== 'teacher' && (
            <div className="text-gray-400 truncate">{entry.teacher?.full_name}</div>
          )}
        </div>
        {isConflict && (
          <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  );
}
