import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Clock, Sunrise } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';

// slot_number 0 = pre-period (08:20–09:00), only Y7–Y9 can be scheduled there
const isPrePeriod = (s) => s.slot_number === 0;

// Pre-period keeps slot 0; the rest are numbered 1..N in display order
const renumber = (slots) => {
  let n = 0;
  return slots.map(s => isPrePeriod(s) ? { ...s, slot_number: 0 } : { ...s, slot_number: ++n });
};

export default function TimeSlotsSetup({ timeSlots, onSave, saving }) {
  const { primaryColor } = useBranding();
  const [slots, setSlots] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSlots([...timeSlots].sort((a, b) => a.slot_number - b.slot_number).map(s => ({ ...s })));
    setDirty(false);
  }, [timeSlots]);

  const hasPrePeriod = slots.some(isPrePeriod);

  const update = (index, field, value) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setDirty(true);
  };

  const addSlot = () => {
    const nextNum = slots.filter(s => !isPrePeriod(s)).length + 1;
    setSlots(prev => renumber([
      ...prev,
      { slot_number: nextNum, label: `Period ${nextNum}`, start_time: '08:00', end_time: '08:45' },
    ]));
    setDirty(true);
  };

  const addPrePeriod = () => {
    if (hasPrePeriod) return;
    setSlots(prev => renumber([
      { slot_number: 0, label: 'Pre-period (Y7–Y9)', start_time: '08:20', end_time: '09:00' },
      ...prev,
    ]));
    setDirty(true);
  };

  const removeSlot = (index) => {
    setSlots(prev => renumber(prev.filter((_, i) => i !== index)));
    setDirty(true);
  };

  const handleSave = async () => {
    const normalised = renumber(slots);
    await onSave(normalised);
    setDirty(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: primaryColor }} />
          <h3 className="font-semibold text-gray-800">Bell Schedule</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
            {slots.length} period{slots.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-2">
          {!hasPrePeriod && (
            <button
              onClick={addPrePeriod}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border-2 border-amber-400 text-amber-600 font-medium transition-colors hover:bg-amber-50"
              title="Early period before Period 1 — only Y7, Y8 and Y9 can have classes there"
            >
              <Sunrise size={14} /> Add Pre-period (Y7–Y9)
            </button>
          )}
          <button
            onClick={addSlot}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border-2 font-medium transition-colors"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Plus size={14} /> Add Period
          </button>
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg font-medium text-white transition-opacity"
              style={{ backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }}
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {slots.length === 0 && (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          No periods configured. Click "Add Period" to start.
        </div>
      )}

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl p-3 border ${
              isPrePeriod(slot) ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            {/* Period number badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: isPrePeriod(slot) ? '#f59e0b' : primaryColor }}
              title={isPrePeriod(slot) ? 'Pre-period — Y7–Y9 only' : undefined}
            >
              {isPrePeriod(slot) ? <Sunrise size={15} /> : slot.slot_number}
            </div>

            {/* Label */}
            <input
              type="text"
              value={slot.label}
              onChange={e => update(i, 'label', e.target.value)}
              placeholder="Period name"
              className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': `${primaryColor}50` }}
            />

            {/* Start time */}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="text-xs text-gray-400 hidden sm:inline">From</span>
              <input
                type="time"
                value={slot.start_time}
                onChange={e => update(i, 'start_time', e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>

            {/* End time */}
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span className="text-xs text-gray-400 hidden sm:inline">To</span>
              <input
                type="time"
                value={slot.end_time}
                onChange={e => update(i, 'end_time', e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none"
              />
            </div>

            {/* Duration badge */}
            <span className="text-xs text-gray-400 hidden md:inline w-12 text-center">
              {(() => {
                const [sh, sm] = slot.start_time.split(':').map(Number);
                const [eh, em] = slot.end_time.split(':').map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                return mins > 0 ? `${mins}m` : '';
              })()}
            </span>

            {/* Delete */}
            <button
              onClick={() => removeSlot(i)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove period"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {dirty && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          ⚠ Unsaved changes — click Save to apply.
        </p>
      )}
    </div>
  );
}
