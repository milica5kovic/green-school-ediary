import React, { useState, useEffect } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DateNavigator from '../shared/DateNavigator';
import ClassCard from './ClassCard';
import AddClassModal from './AddClassModal';
import LoadingSpinner from '../shared/LoadingSpinner';

const HomePage = () => {
  const { getDateKey, getDayName, selectedDate, classService, setLoading } = useApp();
  const [dailyClasses, setDailyClasses] = useState([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [schedule, setSchedule] = useState({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  });

  // Load schedule from localStorage
  useEffect(() => {
    const savedSchedule = localStorage.getItem('teacherSchedule');
    if (savedSchedule) {
      setSchedule(JSON.parse(savedSchedule));
    }
  }, []);

  // Load classes from database when date changes
  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const dateKey = getDateKey(selectedDate);
      const classes = await classService.getClassesByDate(dateKey);

      // Convert database format to component format
      const formattedClasses = classes.map((cls) => ({
        id: cls.class_id,
        class: cls.class_name,
        subject: cls.subject,
        time: cls.time,
        title: cls.title,
      }));

      setDailyClasses(formattedClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const getTodaySchedule = () => {
    const dayName = getDayName(selectedDate);
    return schedule[dayName] || [];
  };

  const addClass = async (scheduleClass, title) => {
    try {
      setLoading(true);
      const dateKey = getDateKey(selectedDate);

      await classService.addClass(
        dateKey,
        scheduleClass.class,
        scheduleClass.subject,
        scheduleClass.time,
        title
      );

      // Reload classes from database
      await loadClasses();
      setShowAddClass(false);
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Failed to add class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeClass = async (classId) => {
    try {
      setLoading(true);
      await classService.deleteClass(classId);

      // Reload classes from database
      await loadClasses();
    } catch (error) {
      console.error('Error removing class:', error);
      alert('Failed to remove class. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const todaySchedule = getTodaySchedule();

  if (loadingClasses) {
    return <LoadingSpinner message="Loading today's classes..." />;
  }

  return (
    <div className="space-y-6">
      <DateNavigator />

      <button
        onClick={() => setShowAddClass(true)}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Class for Today
      </button>

      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <Clock size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">No classes added for this day yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Click "Add Class for Today" to get started
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {dailyClasses.map((cls) => (
            <ClassCard key={cls.id} cls={cls} onRemove={removeClass} />
          ))}
        </div>
      )}

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onAdd={addClass}
          schedule={todaySchedule}
        />
      )}
    </div>
  );
};

export default HomePage;