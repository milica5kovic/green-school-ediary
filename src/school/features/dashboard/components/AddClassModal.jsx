import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '../../../../core/components/Toast';

const AddClassModal = ({ onClose, onAdd, schedule }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState(''); // NEW

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedClass) {
      toast.warning('Please select a class');
      return;
    }
    if (!title.trim()) {
      toast.warning('Please enter a lesson title');
      return;
    }
    onAdd(selectedClass, title, comment); // Pass comment
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">Add Class for Today</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class from Schedule
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {schedule.map((cls, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedClass(cls)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedClass === cls
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <p className="font-semibold text-gray-800">{cls.class} - {cls.subject}</p>
                  <p className="text-sm text-gray-600">{cls.time}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lesson Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5: Algebra"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* NEW: Comment field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Parents (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Students need extra practice with word problems..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This note will be visible to parents on their activity feed
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Add Class
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClassModal;