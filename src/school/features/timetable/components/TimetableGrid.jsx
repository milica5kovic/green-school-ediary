import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Plus, Layers, ArrowLeftRight } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { useBranding } from '../../../../core/context/BrandingContext';
import { classAllowedInSlot, PRE_PERIOD_SLOTS } from '../services/timetableGenerator';

const DAYS = [
  { index: 0, name: 'Monday' },
  { index: 1, name: 'Tuesday' },
  { index: 2, name: 'Wednesday' },
  { index: 3, name: 'Thursday' },
  { index: 4, name: 'Friday' },
];

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
function CellModal({
  day, slot, nextSlot, existingEntry, assignments, allEntries, allSlots,
  onSave, onDelete, onClose, saving,
}) {
  const { primaryColor } = useBranding();
  const dayName = DAYS.find(d => d.index === day)?.name;
  const slotLabel = slot.label || `Period ${slot.slot_number}`;

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

  const busyClassesNextSlot = nextSlot ? new Set(
    allEntries
      .filter(e =>
        e.day_of_week === day &&
        (e.slot_number === nextSlot.slot_number ||
          (e.is_double && e.slot_number === nextSlot.slot_number - 1)) &&
        e.id !== existingEntry?.id
      )
      .map(e => e.class_name)
  ) : new Set();

  const busyTeachersNextSlot = nextSlot ? new Set(
    allEntries
      .filter(e =>
        e.day_of_week === day &&
        (e.slot_number === nextSlot.slot_number ||
          (e.is_double && e.slot_number === nextSlot.slot_number - 1)) &&
        e.id !== existingEntry?.id
      )
      .map(e => e.teacher_id)
  ) : new Set();

  const availableClasses = [...new Set(assignments.map(a => a.class_name))]
    .filter(c => !busyClasses.has(c) || c === existingEntry?.class_name)
    .filter(c => classAllowedInSlot(c, slot.slot_number))
    .sort();

  const [selectedClass, setSelectedClass] = useState(existingEntry?.class_name || '');
  const [selectedAsgn, setSelectedAsgn] = useState('');
  const [isDouble, setIsDouble] = useState(existingEntry?.is_double ?? false);

  const classAssignments = assignments
    .filter(a => a.class_name === selectedClass)
    .filter(a => !busyTeachers.has(a.teacher_id) || a.teacher_id === existingEntry?.teacher_id);

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

  const selectedAsgnData = assignments.find(a => a.id === selectedAsgn);

  const teacherBusySlots = useMemo(() => {
    if (!selectedAsgnData?.teacher_id) return new Set();
    return new Set(
      allEntries
        .filter(e => e.teacher_id === selectedAsgnData.teacher_id && e.id !== existingEntry?.id)
        .flatMap(e => {
          const keys = [`${e.day_of_week}|${e.slot_number}`];
          if (e.is_double) keys.push(`${e.day_of_week}|${e.slot_number + 1}`);
          return keys;
        })
    );
  }, [selectedAsgnData, allEntries, existingEntry]);

  const canBeDouble = nextSlot &&
    selectedClass &&
    !busyClassesNextSlot.has(selectedClass) &&
    (!selectedAsgnData || !busyTeachersNextSlot.has(selectedAsgnData.teacher_id));

  const handleSave = () => {
    const asgn = assignments.find(a => a.id === selectedAsgn);
    if (!asgn) return;
    onSave({
      teacher_id: asgn.teacher_id,
      subject: asgn.subject,
      class_name: asgn.class_name,
      day_of_week: day,
      slot_number: slot.slot_number,
      is_double: canBeDouble && isDouble,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Two-column layout: left = class+subject picker, right = availability grid */}
        <div className="p-4 flex gap-4">
          {/* LEFT: selectors */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSelectedAsgn(''); setIsDouble(false); }}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
              >
                <option value="">Select class…</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {selectedClass && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subject & Teacher</label>
                {classAssignments.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 px-2.5 py-2 rounded-lg">
                    No available assignments for this class at this time slot.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                    {classAssignments.map(a => (
                      <label
                        key={a.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAsgn === a.id ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={selectedAsgn === a.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                      >
                        <input type="radio" name="assignment" value={a.id} checked={selectedAsgn === a.id}
                          onChange={() => setSelectedAsgn(a.id)} className="sr-only" />
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: subjectColor(a.subject) }} />
                        <div className="flex-1 min-w-0 leading-tight">
                          <span className="font-medium text-gray-800 text-xs block truncate">{a.subject}</span>
                          <span className="text-gray-400 text-[11px] truncate block">{a.teacher?.full_name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedAsgn && nextSlot && (
              <label className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 cursor-pointer transition-all text-xs ${
                isDouble ? 'border-violet-400 bg-violet-50' : canBeDouble ? 'border-gray-200 hover:border-gray-300' : 'border-gray-100 opacity-50 cursor-not-allowed'
              }`}>
                <input type="checkbox" checked={isDouble} onChange={e => canBeDouble && setIsDouble(e.target.checked)}
                  disabled={!canBeDouble} className="rounded" />
                <Layers size={13} className={isDouble ? 'text-violet-500' : 'text-gray-400'} />
                <span className="font-medium text-gray-700">Double</span>
                <span className="text-gray-400">{slotLabel}+{nextSlot.label || `P${nextSlot.slot_number}`}</span>
                {!canBeDouble && <span className="text-amber-600 ml-1">Next slot busy</span>}
              </label>
            )}
          </div>

          {/* RIGHT: teacher week availability mini-grid */}
          {selectedAsgnData && allSlots?.length > 0 && (
            <div className="flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-2">
              <p className="text-[10px] font-semibold text-gray-400 mb-1.5 truncate max-w-[130px]">
                {selectedAsgnData.teacher?.full_name?.split(' ').slice(-1)[0] ?? 'Teacher'}
              </p>
              <table className="text-[10px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-4" />
                    {['M','T','W','T','F'].map((d, i) => (
                      <th key={i} className="text-center text-gray-400 font-normal pb-0.5 px-0.5 text-[9px] w-5">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSlots.map(s => (
                    <tr key={s.slot_number}>
                      <td className="text-gray-300 text-right pr-1 text-[9px] leading-none py-0.5">{s.slot_number}</td>
                      {[0,1,2,3,4].map(dayIdx => {
                        const isBusy = teacherBusySlots.has(`${dayIdx}|${s.slot_number}`);
                        const isCurrent = dayIdx === day && s.slot_number === slot?.slot_number;
                        return (
                          <td key={dayIdx} className="px-0.5 py-0.5">
                            <div className={`w-4 h-3 rounded-sm border ${
                              isCurrent ? 'border-blue-400 bg-blue-100' :
                              isBusy    ? 'border-red-200 bg-red-100' :
                                          'border-green-200 bg-green-50'
                            }`} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 mt-1">
                {[['bg-green-50 border-green-200','Free'],['bg-red-100 border-red-200','Busy'],['bg-blue-100 border-blue-400','Now']].map(([cls,lbl]) => (
                  <span key={lbl} className="flex items-center gap-0.5 text-[9px] text-gray-400">
                    <span className={`inline-block w-2.5 h-2 rounded-sm border ${cls}`} />{lbl}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          {existingEntry && (
            <button onClick={() => onDelete(existingEntry.id)}
              className="px-4 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
              Remove
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!selectedClass || !selectedAsgn || saving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-xl text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}>
            {saving ? 'Saving…' : existingEntry ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DRAGGABLE CHIP
// ============================================================
function DraggableChip({ entry, isConflict, filterType, isDraft }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: entry.id });
  return (
    <div ref={setNodeRef} {...(isDraft ? { ...attributes, ...listeners } : {})}
      style={{ opacity: isDragging ? 0.3 : 1, cursor: isDraft ? 'grab' : 'default' }}>
      <ChipContent entry={entry} isConflict={isConflict} filterType={filterType} />
    </div>
  );
}

// ============================================================
// DROPPABLE CELL
// ============================================================
function DroppableCell({ id, isEmpty, isConsumed, isDraft, isDoubleCell, activeId, isValidDrop, children, onClick }) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isDraft || isConsumed });

  const showHighlight = isOver && activeId;
  const highlightColor = showHighlight ? (isValidDrop ? '#10b98120' : '#ef444420') : 'transparent';
  const borderColor = showHighlight ? (isValidDrop ? '#10b981' : '#ef4444') : 'transparent';

  return (
    <td
      ref={setNodeRef}
      rowSpan={isDoubleCell ? 2 : 1}
      onClick={onClick}
      className={`p-1.5 border-l border-gray-100 align-top transition-colors ${
        isDraft && !isConsumed ? 'cursor-pointer' : 'cursor-default'
      } ${isDoubleCell ? 'border-b-2 border-b-violet-200' : ''}`}
      style={{
        backgroundColor: highlightColor,
        outline: showHighlight ? `2px solid ${borderColor}` : 'none',
        outlineOffset: '-2px',
      }}
    >
      {children}
    </td>
  );
}

// ============================================================
// CHIP CONTENT (reused in overlay + cell)
// ============================================================
function ChipContent({ entry, isConflict, filterType }) {
  const color = subjectColor(entry.subject);
  return (
    <div
      className={`px-2 py-1.5 rounded-lg text-xs ${isConflict ? 'ring-2 ring-red-400' : ''} ${entry.is_double ? 'ring-1 ring-violet-300' : ''}`}
      style={{ backgroundColor: `${color}15`, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="font-semibold text-gray-800 truncate flex items-center gap-1">
            {entry.subject}
            {entry.is_double && <Layers size={10} className="text-violet-400 flex-shrink-0" />}
          </div>
          {filterType !== 'class' && <div className="text-gray-500 truncate">{entry.class_name}</div>}
          {filterType !== 'teacher' && <div className="text-gray-400 truncate">{entry.teacher?.full_name || '—'}</div>}
        </div>
        {isConflict && <AlertTriangle size={11} className="text-red-500 flex-shrink-0 mt-0.5" />}
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
  onMoveCell,
  onMoveGroup,
  onSwapCells,
  saving,
  viewMode,
}) {
  const { primaryColor } = useBranding();
  const [filterType, setFilterType] = useState('class');
  const [filterValue, setFilterValue] = useState('');
  const [modalState, setModalState] = useState(null);
  const [swapModal, setSwapModal] = useState(null); // { dragged, target, canSwap, reason }
  const [activeEntry, setActiveEntry] = useState(null); // entry being dragged
  const [dragValidTarget, setDragValidTarget] = useState(null); // 'valid' | 'invalid' | null

  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);
  const isDraft = viewMode === 'draft';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const visibleEntries = entries.filter(e => {
    if (!filterValue) return true;
    if (filterType === 'class') return e.class_name === filterValue;
    if (filterType === 'teacher') return e.teacher_id === filterValue;
    return true;
  });

  // Build lookup[day][slot] = entries[]
  const lookup = useMemo(() => {
    const lk = {};
    DAYS.forEach(d => {
      lk[d.index] = {};
      sortedSlots.forEach(s => { lk[d.index][s.slot_number] = []; });
    });
    visibleEntries.forEach(e => {
      if (lk[e.day_of_week]?.[e.slot_number] !== undefined) {
        lk[e.day_of_week][e.slot_number].push(e);
      }
    });
    return lk;
  }, [visibleEntries, sortedSlots]);

  // All entries lookup (for conflict/availability check during drag)
  const allLookup = useMemo(() => {
    const lk = {};
    DAYS.forEach(d => {
      lk[d.index] = {};
      sortedSlots.forEach(s => { lk[d.index][s.slot_number] = []; });
    });
    entries.forEach(e => {
      if (lk[e.day_of_week]?.[e.slot_number] !== undefined) {
        lk[e.day_of_week][e.slot_number].push(e);
      }
    });
    return lk;
  }, [entries, sortedSlots]);

  // Consumed cells (double class occupies next slot)
  const consumed = useMemo(() => {
    const s = new Set();
    visibleEntries.filter(e => e.is_double).forEach(e => {
      s.add(`${e.day_of_week}|${e.slot_number + 1}`);
    });
    return s;
  }, [visibleEntries]);

  const getNextSlot = (slot) => {
    const idx = sortedSlots.findIndex(s => s.slot_number === slot.slot_number);
    return idx >= 0 && idx < sortedSlots.length - 1 ? sortedSlots[idx + 1] : null;
  };

  // Entries of the same parallel group sitting at the same day+slot —
  // they move TOGETHER when one of them is dragged (French+German,
  // English+ESL, combined C&G...).
  const groupCompanions = (entry) =>
    entry?.parallel_group
      ? entries.filter(e =>
          e.id !== entry.id &&
          e.parallel_group === entry.parallel_group &&
          e.day_of_week === entry.day_of_week &&
          e.slot_number === entry.slot_number
        )
      : [];

  // Check if dropping activeEntry (plus its group companions) at
  // [targetDay, targetSlot] is valid — every mover must fit.
  const isValidDropTarget = (entry, targetDay, targetSlot) => {
    if (!entry) return false;
    const movers = [entry, ...groupCompanions(entry)];
    // Pre-period (slot 0) is reserved for Y7–Y9
    if (movers.some(m => !classAllowedInSlot(m.class_name, targetSlot))) return false;
    const movingIds = new Set(movers.map(m => m.id));
    for (const m of movers) {
      const slotsToCheck = m.is_double ? [targetSlot, targetSlot + 1] : [targetSlot];
      for (const slot of slotsToCheck) {
        const cellEntries = (allLookup[targetDay]?.[slot] || []).filter(e => !movingIds.has(e.id));
        // Also double-period entries from slot-1 that visually consume this slot
        const prevDoubles = (allLookup[targetDay]?.[slot - 1] || []).filter(e => !movingIds.has(e.id) && e.is_double);
        const others = [...cellEntries, ...prevDoubles];
        if (others.some(e => e.teacher_id === m.teacher_id)) return false;
        if (others.some(e => e.class_name === m.class_name)) return false;
      }
    }
    return true;
  };

  // Check if two entries can be swapped (each can go to the other's slot, excluding both from conflicts)
  const checkCanSwap = (dragged, target) => {
    // When swapping, exclude BOTH entries plus any parallel-group companions
    // (same class at the same slot). This prevents false conflicts when a class
    // has multiple parallel entries at a slot (e.g. Y9 Science + Y9 C&G running
    // simultaneously) — the companion entries just stay put and are not blockers.
    const sameClassAtTargetSlot = entries.filter(e =>
      e.id !== dragged.id && e.id !== target.id &&
      e.day_of_week === target.day_of_week &&
      e.slot_number === target.slot_number &&
      e.class_name === dragged.class_name
    );
    const sameClassAtDraggedSlot = entries.filter(e =>
      e.id !== dragged.id && e.id !== target.id &&
      e.day_of_week === dragged.day_of_week &&
      e.slot_number === dragged.slot_number &&
      e.class_name === target.class_name
    );
    const excludeIds = new Set([
      dragged.id, target.id,
      ...sameClassAtTargetSlot.map(e => e.id),
      ...sameClassAtDraggedSlot.map(e => e.id),
    ]);
    const others = entries.filter(e => !excludeIds.has(e.id));

    const occupies = (e, day, slot) =>
      e.day_of_week === day && (e.slot_number === slot || (e.is_double && e.slot_number === slot - 1));

    const conflictMsg = (moving, toDay, toSlot) => {
      const slots = moving.is_double ? [toSlot, toSlot + 1] : [toSlot];
      for (const s of slots) {
        if (others.some(o => o.teacher_id === moving.teacher_id && occupies(o, toDay, s)))
          return `${moving.teacher?.full_name || 'Teacher'} is busy at that slot.`;
        if (others.some(o => o.class_name === moving.class_name && occupies(o, toDay, s)))
          return `${moving.class_name} already has a class at that slot.`;
      }
      return null;
    };

    const r1 = conflictMsg(dragged, target.day_of_week, target.slot_number);
    if (r1) return { canSwap: false, reason: r1 };
    const r2 = conflictMsg(target, dragged.day_of_week, dragged.slot_number);
    if (r2) return { canSwap: false, reason: r2 };
    return { canSwap: true, reason: null };
  };

  const handleDragStart = ({ active }) => {
    const entry = entries.find(e => e.id === active.id);
    setActiveEntry(entry || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || !activeEntry) { setDragValidTarget(null); return; }
    const [targetDay, targetSlot] = over.id.toString().split('|').map(Number);
    setDragValidTarget(isValidDropTarget(activeEntry, targetDay, targetSlot) ? 'valid' : 'invalid');
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveEntry(null);
    setDragValidTarget(null);
    if (!over || !isDraft) return;

    const [targetDay, targetSlot] = over.id.toString().split('|').map(Number);
    const dragged = entries.find(e => e.id === active.id);
    const companions = groupCompanions(dragged);

    // Grouped lessons move as one block — all or nothing
    if (companions.length > 0) {
      if (!isValidDropTarget(dragged, targetDay, targetSlot)) return;
      await onMoveGroup([dragged.id, ...companions.map(c => c.id)], targetDay, targetSlot);
      return;
    }

    if (!isValidDropTarget(dragged, targetDay, targetSlot)) {
      // Collect all entries occupying the target slot:
      // direct entries at this slot + double-period entries from slot-1 that consume this slot
      const directEntries = (allLookup[targetDay]?.[targetSlot] || []).filter(e => e.id !== active.id);
      const doublesFromPrev = (allLookup[targetDay]?.[targetSlot - 1] || []).filter(
        e => e.id !== active.id && e.is_double
      );
      const occupying = [...directEntries, ...doublesFromPrev];

      if (occupying.length >= 1) {
        // Prefer same class+subject first (most intuitive swap), then same class, then fallback
        const target =
          occupying.find(e => e.class_name === dragged.class_name && e.subject === dragged.subject) ||
          occupying.find(e => e.class_name === dragged.class_name) ||
          occupying[0];
        const { canSwap, reason } = checkCanSwap(dragged, target);
        setSwapModal({ dragged, target, canSwap, reason });
        return;
      }
    }

    await onMoveCell(active.id, targetDay, targetSlot);
  };

  const openCell = (day, slot) => {
    if (!isDraft) return;
    if (consumed.has(`${day.index}|${slot.slot_number}`)) return;
    const existingEntries = lookup[day.index]?.[slot.slot_number] || [];
    if (existingEntries.length === 1) {
      setModalState({ day: day.index, slot, existingEntry: existingEntries[0] });
    } else {
      setModalState({ day: day.index, slot, existingEntry: null });
    }
  };

  const filterOptions = filterType === 'class'
    ? classes.map(c => ({ value: c, label: c }))
    : teachers.map(t => ({ value: t.id, label: t.full_name }));

  if (sortedSlots.length === 0) {
    return <div className="text-center py-12 text-gray-400">Configure time slots in Setup first.</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div>
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {['class', 'teacher', 'all'].map(type => (
              <button key={type} onClick={() => { setFilterType(type); setFilterValue(''); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  filterType === type ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {type === 'class' ? 'By Class' : type === 'teacher' ? 'By Teacher' : 'All'}
              </button>
            ))}
          </div>

          {filterType !== 'all' && (
            <select value={filterValue} onChange={e => setFilterValue(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none">
              <option value="">— Show all —</option>
              {filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          {conflicts.size > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-medium">
              <AlertTriangle size={13} />
              {conflicts.size} conflict{conflicts.size !== 1 ? 's' : ''}
            </div>
          )}

          {isDraft && (
            <div className="ml-auto text-xs text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
              Drag to move · Click to edit
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr>
                <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}>
                  Period / Time
                </th>
                {DAYS.map(d => (
                  <th key={d.index} className="px-3 py-3 text-center text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}>
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {sortedSlots.map((slot, si) => (
                <tr key={slot.slot_number} className={si % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 border-r border-gray-200"
                    style={{ backgroundColor: PRE_PERIOD_SLOTS.has(slot.slot_number) ? '#f59e0b15' : `${primaryColor}08` }}>
                    <div className="font-semibold text-gray-700 text-xs">{slot.label || `Period ${slot.slot_number}`}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</div>
                    {PRE_PERIOD_SLOTS.has(slot.slot_number) && (
                      <div className="text-amber-600 text-[10px] mt-0.5 font-medium">Y7–Y9 only</div>
                    )}
                  </td>

                  {DAYS.map(day => {
                    const cellKey = `${day.index}|${slot.slot_number}`;
                    if (consumed.has(cellKey)) return null;

                    const cellEntries = lookup[day.index]?.[slot.slot_number] || [];
                    const hasConflict = cellEntries.some(e => conflicts.has(e.id));
                    const isDoubleCell = cellEntries.some(e => e.is_double);
                    const isValid = activeEntry
                      ? isValidDropTarget(activeEntry, day.index, slot.slot_number)
                      : false;

                    return (
                      <DroppableCell
                        key={cellKey}
                        id={cellKey}
                        isEmpty={cellEntries.length === 0}
                        isConsumed={false}
                        isDraft={isDraft}
                        isDoubleCell={isDoubleCell}
                        activeId={activeEntry?.id}
                        isValidDrop={isValid}
                        onClick={() => !activeEntry && openCell(day, slot)}
                      >
                        {cellEntries.length === 0 ? (
                          isDraft ? (
                            <div className="h-14 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-all group">
                              <Plus size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                          ) : (
                            <div className="h-14" />
                          )
                        ) : (
                          <div className={`space-y-1 ${hasConflict ? 'bg-red-50 rounded-xl' : ''}`}>
                            {cellEntries.map(entry => (
                              <DraggableChip
                                key={entry.id}
                                entry={entry}
                                isConflict={conflicts.has(entry.id)}
                                filterType={filterType}
                                isDraft={isDraft}
                              />
                            ))}
                          </div>
                        )}
                      </DroppableCell>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          {isDraft && <span>Click any cell to add or edit · Drag chips to move.</span>}
          <span className="flex items-center gap-1 text-violet-500">
            <Layers size={12} /> Double class spans 2 periods
          </span>
          {conflicts.size > 0 && (
            <span className="flex items-center gap-1 text-red-500">
              <div className="w-3 h-3 rounded bg-red-200 border border-red-400" />
              Conflict detected
            </span>
          )}
        </div>
      </div>

      {/* Drag overlay — floating ghost chip */}
      <DragOverlay>
        {activeEntry ? (
          <div style={{ opacity: 0.85, pointerEvents: 'none', minWidth: 120 }}>
            <ChipContent entry={activeEntry} isConflict={false} filterType={filterType} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Swap Modal */}
      {swapModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-violet-50 border-b border-violet-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <ArrowLeftRight size={15} className="text-violet-500" />
                Swap entries?
              </h3>
              <button onClick={() => setSwapModal(null)} className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Visual swap: dragged ↔ target */}
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subjectColor(swapModal.dragged.subject) }} />
                    <span className="font-semibold text-gray-800 truncate">{swapModal.dragged.subject}</span>
                  </div>
                  <div className="text-gray-500 truncate">{swapModal.dragged.class_name}</div>
                  <div className="text-gray-400 truncate">{swapModal.dragged.teacher?.full_name}</div>
                  <div className="text-gray-300 mt-0.5 text-[10px]">
                    {['Mon','Tue','Wed','Thu','Fri'][swapModal.dragged.day_of_week]} · P{swapModal.dragged.slot_number}
                  </div>
                </div>

                <ArrowLeftRight size={18} className="text-violet-400 flex-shrink-0" />

                <div className="flex-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subjectColor(swapModal.target.subject) }} />
                    <span className="font-semibold text-gray-800 truncate">{swapModal.target.subject}</span>
                  </div>
                  <div className="text-gray-500 truncate">{swapModal.target.class_name}</div>
                  <div className="text-gray-400 truncate">{swapModal.target.teacher?.full_name}</div>
                  <div className="text-gray-300 mt-0.5 text-[10px]">
                    {['Mon','Tue','Wed','Thu','Fri'][swapModal.target.day_of_week]} · P{swapModal.target.slot_number}
                  </div>
                </div>
              </div>

              {!swapModal.canSwap && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{swapModal.reason || 'Swap not possible — conflict exists.'}</p>
                </div>
              )}
              {swapModal.canSwap && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  ✓ Both teachers are free at their new slots — swap is valid.
                </p>
              )}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button onClick={() => setSwapModal(null)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              {swapModal.canSwap && (
                <button
                  onClick={async () => {
                    const { dragged, target } = swapModal;
                    setSwapModal(null);
                    await onSwapCells(dragged.id, target.id);
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Swapping…' : 'Swap'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cell Edit Modal */}
      {modalState && (
        <CellModal
          day={modalState.day}
          slot={modalState.slot}
          nextSlot={getNextSlot(modalState.slot)}
          existingEntry={modalState.existingEntry}
          assignments={assignments}
          allEntries={entries}
          allSlots={sortedSlots}
          onSave={async (data) => { await onSetCell(data); setModalState(null); }}
          onDelete={async (id) => { await onDeleteCell(id); setModalState(null); }}
          onClose={() => setModalState(null)}
          saving={saving}
        />
      )}
    </DndContext>
  );
}
