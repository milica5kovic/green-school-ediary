import React, { useState } from 'react';

const AddClassModal = ({ onClose, onAdd, schedule }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [classTitle, setClassTitle] = useState('');

  const handleAdd = () => {
    if (selectedClass && classTitle) {
      onAdd(selectedClass, classTitle);
      setClassTitle('');
      setSelectedClass(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-6">Add Class for Today</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select from Schedule
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                setSelectedClass(schedule[idx]);
              }}
              value={selectedClass ? schedule.indexOf(selectedClass) : ''}
            >
              <option value="">Choose a scheduled class...</option>
              {schedule.map((cls, idx) => (
                <option key={idx} value={idx}>
                  {cls.time} - {cls.class} ({cls.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class Title/Topic
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="e.g., Introduction to Algebra"
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleAdd}
            disabled={!selectedClass || !classTitle}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Class
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClassModal;