import React, { useState, useEffect } from 'react';

const ScheduleModal = ({ onClose, onSave, existingSchedule, days }) => {
  const [day, setDay] = useState('Monday');
  const [time, setTime] = useState('');
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');

  // Time slots
  const timeSlots = [
    '09:00-09:40',
    '09:45-10:30',
    '11:00-11:45',
    '11:50-12:30',
    '13:30-14:15',
    '14:20-15:00'
  ];

  // Classes Y1-Y9 with A/B variants for Y5
  const classes = [
    'Y1', 'Y2', 'Y3', 'Y4', 
    'Y5A', 'Y5B', 
    'Y6', 'Y7', 'Y8', 'Y9'
  ];

  // Common subjects
  const subjects = [
    'Mathematics',
    'English',
    'Science',
    'ICT',
    'History',
    'Geography',
    'Art',
    'Music',
    'PE',
    'Other'
  ];

  useEffect(() => {
    if (existingSchedule) {
      setDay(existingSchedule.day || 'Monday');
      setTime(existingSchedule.time || '');
      setClassName(existingSchedule.class || '');
      setSubject(existingSchedule.subject || '');
    }
  }, [existingSchedule]);

  const handleSave = () => {
    if (time && className && subject) {
      onSave({ day, time, class: className, subject });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-6">
          {existingSchedule ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
        </h3>

        <div className="space-y-4">
          {/* Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Day of Week *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Slot *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            >
              <option value="">Select time slot...</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class/Year Group *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              <option value="">Select class...</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Select subject...</option>
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!time || !className || !subject}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {existingSchedule ? 'Update' : 'Add'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;