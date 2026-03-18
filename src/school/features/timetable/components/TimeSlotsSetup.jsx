import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Clock } from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';

export default function TimeSlotsSetup({ timeSlots, onSave, saving }) {
  const { primaryColor } = useBranding();
  const [slots, setSlots] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSlots(timeSlots.map(s => ({ ...s })));
    setDirty(false);
  }, [timeSlots]);

  const update = (index, field, value) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
    setDirty(true);
  };

  const addSlot = () => {
    const nextNum = slots.length > 0 ? Math.max(...slots.map(s => s.slot_number)) + 1 : 1;
    setSlots(prev => [
      ...prev,
      { slot_number: nextNum, label: `Period ${nextNum}`, start_time: '08:00', end_time: '08:45' },
    ]);
    setDirty(true);
  };

  const removeSlot = (index) => {
    setSlots(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, slot_number: i + 1 })));
    setDirty(true);
  };

  const handleSave = async () => {
    const normalised = slots.map((s, i) => ({ ...s, slot_number: i + 1 }));
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
            className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200"
          >
            {/* Period number badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {i + 1}
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
