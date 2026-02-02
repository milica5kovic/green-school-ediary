import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DateNavigator from '../shared/DateNavigator';
import ClassCard from './ClassCard';
import AddClassModal from './AddClassModal';
import { useAuth } from '../../context/AuthContext';

const HomePage = () => {
  const { getDateKey, getDayName, selectedDate, classService, scheduleService } = useApp();
  const [dailyClasses, setDailyClasses] = useState([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const { teacher, canViewAllClasses } = useAuth();

  // Load schedule for selected date
  const loadSchedule = useCallback(async () => {
    if (!scheduleService) return;
    
    try {
      const dayName = getDayName(selectedDate);
      
      // If not admin, filter by teacher's schedule
      const teacherId = canViewAllClasses() ? null : teacher?.id;
      const schedule = await scheduleService.getScheduleByDay(dayName, teacherId);
      
      setTodaySchedule(schedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
      setTodaySchedule([]);
    }
  }, [scheduleService, selectedDate, getDayName, teacher, canViewAllClasses]);

  // Load classes from database when date changes
  const loadClasses = useCallback(async () => {
    if (!classService) return;
    
    try {
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
      setDailyClasses([]);
    }
  }, [classService, selectedDate, getDateKey]);

  useEffect(() => {
    loadSchedule();
    loadClasses();
  }, [selectedDate, loadSchedule, loadClasses]);
const addClass = async (scheduleClass, title, comment) => {
  if (!classService) return;
  
  try {
    setLocalLoading(true);
    const dateKey = getDateKey(selectedDate);

    console.log('Adding class:', { dateKey, scheduleClass, title, comment }); // Debug log

    await classService.addClass(
      dateKey,
      scheduleClass.class,
      scheduleClass.subject,
      scheduleClass.time,
      title,
      comment || null // Make sure it's null if empty
    );

    await loadClasses();
    setShowAddClass(false);
  } catch (error) {
    console.error('Error adding class:', error);
    console.error('Error details:', error.message); // More detailed error
    alert('Failed to add class: ' + error.message); // Show actual error
  } finally {
    setLocalLoading(false);
  }
};
  const removeClass = async (classId) => {
    if (!classService) return;
    
    try {
      setLocalLoading(true);
      await classService.deleteClass(classId);
      await loadClasses();
    } catch (error) {
      console.error('Error removing class:', error);
      alert('Failed to remove class. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <DateNavigator />

      <button
        onClick={() => setShowAddClass(true)}
        disabled={localLoading || todaySchedule.length === 0}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={20} />
        {todaySchedule.length === 0 ? 'No classes scheduled for this day' : 'Add Class for Today'}
      </button>

      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <Clock size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">No classes added for this day yet</p>
          {todaySchedule.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Click "Add Class for Today" to get started
            </p>
          )}
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