import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ScheduleModal from './ScheduleModal';

const SchedulePage = () => {
  const { scheduleService } = useApp();
  const [schedule, setSchedule] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Load schedule from Supabase
  const loadSchedule = useCallback(async () => {
    if (!scheduleService) return;
    
    try {
      setLocalLoading(true);
      const weekSchedule = await scheduleService.getWeekSchedule();
      setSchedule(weekSchedule);
      console.log('Schedule loaded from Supabase');
    } catch (error) {
      console.error('Error loading schedule:', error);
      alert('Failed to load schedule');
    } finally {
      setLocalLoading(false);
    }
  }, [scheduleService]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleSave = async (entry) => {
    if (!scheduleService) return;
    
    try {
      setLocalLoading(true);

      if (editingEntry) {
        // Delete old entry and add new one (update)
        await scheduleService.deleteScheduleClass(editingEntry.id);
        await scheduleService.addScheduleClass(
          entry.day,
          entry.time,
          entry.class,
          entry.subject
        );
      } else {
        // Add new entry
        await scheduleService.addScheduleClass(
          entry.day,
          entry.time,
          entry.class,
          entry.subject
        );
      }

      // Reload schedule from database
      await loadSchedule();
      setShowModal(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule entry. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (scheduleItem) => {
    if (!scheduleService) return;
    
    if (!window.confirm('Are you sure you want to delete this schedule entry?')) {
      return;
    }

    try {
      setLocalLoading(true);
      
      // Use the id directly from the schedule item
      if (scheduleItem.id) {
        await scheduleService.deleteScheduleClass(scheduleItem.id);
        await loadSchedule();
      } else {
        alert('Cannot delete: schedule item ID not found');
      }
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      alert('Failed to delete schedule entry: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEdit = (day, entry, id) => {
    setEditingEntry({ day, entry, id });
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
            disabled={localLoading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          {Object.entries(subjectStats).slice(0, 3).map(([subject, count]) => (
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

            {!schedule[day] || schedule[day].length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Clock size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 italic">No classes scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule[day].map((cls, idx) => (
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
                        onClick={() => handleEdit(day, cls, cls.id)}
                        disabled={localLoading}
                        className="p-2 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors disabled:opacity-50"
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
                        onClick={() => handleDelete(cls)}
                        disabled={localLoading}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors disabled:opacity-50"
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