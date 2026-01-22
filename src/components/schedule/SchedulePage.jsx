import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import ScheduleModal from './ScheduleModal';

const SchedulePage = () => {
  const [schedule, setSchedule] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Load schedule from localStorage on mount
  useEffect(() => {
    const savedSchedule = localStorage.getItem('teacherSchedule');
    if (savedSchedule) {
      setSchedule(JSON.parse(savedSchedule));
    } else {
      // Initialize with default schedule
      setSchedule({
        Monday: [
          { time: '08:00-08:45', year: 'Y5', class: 'Y5A', subject: 'Mathematics' },
          { time: '09:00-09:45', year: 'Y5', class: 'Y5B', subject: 'Mathematics' },
          { time: '10:00-10:45', year: 'Y6', class: 'Y6A', subject: 'ICT' },
        ],
        Tuesday: [
          { time: '08:00-08:45', year: 'Y5', class: 'Y5A', subject: 'Mathematics' },
          { time: '11:00-11:45', year: 'Y7', class: 'Y7C', subject: 'ICT' },
        ],
        Wednesday: [
          { time: '09:00-09:45', year: 'Y5', class: 'Y5B', subject: 'Mathematics' },
          { time: '10:00-10:45', year: 'Y6', class: 'Y6A', subject: 'ICT' },
        ],
        Thursday: [
          { time: '08:00-08:45', year: 'Y5', class: 'Y5A', subject: 'Mathematics' },
          { time: '09:00-09:45', year: 'Y5', class: 'Y5B', subject: 'Mathematics' },
          { time: '13:00-13:45', year: 'Y7', class: 'Y7C', subject: 'ICT' },
        ],
        Friday: [
          { time: '10:00-10:45', year: 'Y6', class: 'Y6A', subject: 'ICT' },
          { time: '11:00-11:45', year: 'Y5', class: 'Y5B', subject: 'Mathematics' },
        ],
      });
    }
  }, []);

  // Save to localStorage whenever schedule changes
  useEffect(() => {
    localStorage.setItem('teacherSchedule', JSON.stringify(schedule));
  }, [schedule]);

  const handleSave = (entry) => {
    if (editingEntry) {
      // Update existing entry
      setSchedule((prev) => ({
        ...prev,
        [entry.day]: prev[entry.day]
          .map((e) =>
            e === editingEntry.entry ? entry : e
          )
          .sort((a, b) => a.time.localeCompare(b.time)),
      }));
    } else {
      // Add new entry
      setSchedule((prev) => ({
        ...prev,
        [entry.day]: [...(prev[entry.day] || []), entry].sort((a, b) =>
          a.time.localeCompare(b.time)
        ),
      }));
    }

    setShowModal(false);
    setEditingEntry(null);
  };

  const handleDelete = (day, index) => {
    if (window.confirm('Are you sure you want to delete this schedule entry?')) {
      setSchedule((prev) => ({
        ...prev,
        [day]: prev[day].filter((_, i) => i !== index),
      }));
    }
  };

  const handleEdit = (day, entry) => {
    setEditingEntry({ day, entry });
    setShowModal(true);
  };

  const getTotalClasses = () => {
    return Object.values(schedule).reduce((total, day) => total + day.length, 0);
  };

  const getClassesBySubject = () => {
    const subjects = {};
    Object.values(schedule).forEach((day) => {
      day.forEach((cls) => {
        subjects[cls.subject] = (subjects[cls.subject] || 0) + 1;
      });
    });
    return subjects;
  };

  const subjectStats = getClassesBySubject();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Weekly Schedule</h2>
            <p className="text-gray-600 mt-1">Manage your teaching schedule</p>
          </div>
          <button
            onClick={() => {
              setEditingEntry(null);
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Add Class
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-3xl font-bold text-emerald-700">{getTotalClasses()}</p>
            <p className="text-sm text-emerald-600 mt-1">Total Classes/Week</p>
          </div>
          {Object.entries(subjectStats).map(([subject, count]) => (
            <div
              key={subject}
              className="bg-blue-50 rounded-xl p-4 border border-blue-200"
            >
              <p className="text-3xl font-bold text-blue-700">{count}</p>
              <p className="text-sm text-blue-600 mt-1">{subject}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-6">
        {days.map((day) => (
          <div
            key={day}
            className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-emerald-900">{day}</h3>
              <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                {schedule[day]?.length || 0} {schedule[day]?.length === 1 ? 'class' : 'classes'}
              </span>
            </div>

            {schedule[day]?.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 italic">No classes scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule[day]?.map((cls, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-sm font-bold text-emerald-600 w-28">
                        {cls.time}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-800 bg-white px-3 py-1 rounded-lg">
                          {cls.class}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-700">{cls.subject}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(day, cls)}
                        className="p-2 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(day, idx)}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <ScheduleModal
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
          }}
          onSave={handleSave}
          existingSchedule={editingEntry?.entry}
          days={days}
        />
      )}
    </div>
  );
};

export default SchedulePage;