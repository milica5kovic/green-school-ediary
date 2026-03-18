import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';

const DAYS = [
  { index: 0, short: 'Mon', full: 'Monday' },
  { index: 1, short: 'Tue', full: 'Tuesday' },
  { index: 2, short: 'Wed', full: 'Wednesday' },
  { index: 3, short: 'Thu', full: 'Thursday' },
  { index: 4, short: 'Fri', full: 'Friday' },
];

export default function TeacherAvailabilitySetup({
  teachers,
  timeSlots,
  isTeacherAvailable,
  onToggle,
}) {
  const { primaryColor } = useBranding();
  const [filterTeacher, setFilterTeacher] = useState('');

  const visibleTeachers = filterTeacher
    ? teachers.filter(t => t.id === filterTeacher)
    : teachers;

  const sortedSlots = [...timeSlots].sort((a, b) => a.slot_number - b.slot_number);

  if (sortedSlots.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        Configure time slots first.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserCheck size={18} style={{ color: primaryColor }} />
          <h3 className="font-semibold text-gray-800">Teacher Availability</h3>
        </div>
        <select
          value={filterTeacher}
          onChange={e => setFilterTeacher(e.target.value)}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none"
        >
          <option value="">All teachers</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Click a cell to <span className="text-red-500 font-medium">block</span> a slot (red = unavailable).
        Green = available by default.
      </p>

      {visibleTeachers.length === 0 && (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          No teachers found.
        </div>
      )}

      <div className="space-y-4">
        {visibleTeachers.map(teacher => (
          <TeacherAvailabilityRow
            key={teacher.id}
            teacher={teacher}
            days={DAYS}
            slots={sortedSlots}
            isAvailable={isTeacherAvailable}
            onToggle={onToggle}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    </div>
  );
}

function TeacherAvailabilityRow({ teacher, days, slots, isAvailable, onToggle, primaryColor }) {
  // Count blocked slots
  const blockedCount = days.reduce((acc, d) =>
    acc + slots.filter(s => !isAvailable(teacher.id, d.index, s.slot_number)).length, 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Teacher name header */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {teacher.full_name.charAt(0)}
          </div>
          <span className="font-medium text-gray-800 text-sm">{teacher.full_name}</span>
        </div>
        {blockedCount > 0 && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
            {blockedCount} blocked
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-28">Period</th>
              {days.map(d => (
                <th key={d.index} className="text-center px-2 py-2 font-medium text-gray-500">
                  {d.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map(slot => (
              <tr key={slot.slot_number} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-600 font-medium">
                  <div>{slot.label || `Period ${slot.slot_number}`}</div>
                  <div className="text-gray-400 font-normal">
                    {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                  </div>
                </td>
                {days.map(d => {
                  const available = isAvailable(teacher.id, d.index, slot.slot_number);
                  return (
                    <td key={d.index} className="text-center px-2 py-1.5">
                      <button
                        onClick={() => onToggle(teacher.id, d.index, slot.slot_number)}
                        title={available ? 'Click to block this slot' : 'Click to unblock'}
                        className={`
                          w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-sm font-bold
                          transition-all hover:scale-110 active:scale-95
                          ${available
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-red-100 text-red-500 hover:bg-red-200'
                          }
                        `}
                      >
                        {available ? '✓' : '✕'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
