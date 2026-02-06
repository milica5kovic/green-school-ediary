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
  const { teacher, profile } = useAuth();

  // ✅ FIX: Load schedule with proper dependencies
  const loadSchedule = useCallback(async () => {
    if (!scheduleService) {
      console.log('⚠️ No scheduleService available');
      return;
    }
    
    try {
      const dayName = getDayName(selectedDate);
      const teacherId = teacher?.user_id || null;
      
      console.log('🔐 HomePage - Loading schedule');
      console.log('  📅 Date:', selectedDate.toISOString().split('T')[0]);
      console.log('  📆 Day:', dayName);
      console.log('  👤 TeacherId:', teacherId);
      
      const schedule = await scheduleService.getScheduleByDay(dayName, teacherId);
      
      console.log('✅ HomePage - Schedule loaded:', schedule?.length || 0, 'entries');
      
      if (schedule && schedule.length > 0) {
        console.log('📋 Schedule entries:');
        schedule.forEach((entry, idx) => {
          console.log(`  ${idx + 1}. ${entry.time} - ${entry.class} ${entry.subject}`);
        });
      }
      
      setTodaySchedule(schedule);
    } catch (error) {
      console.error('❌ Error loading schedule:', error);
      setTodaySchedule([]);
    }
  }, [scheduleService, selectedDate, getDayName, teacher]); // ✅ All dependencies

  // ✅ FIX: Load classes with proper dependencies
// Load classes from database when date changes
const loadClasses = useCallback(async () => {
  if (!classService) return;
  
  try {
    const dateKey = getDateKey(selectedDate);
    
    // ✅ FIX: Pass teacher.user_id to filter
    const teacherId = teacher?.user_id || null;
    
    console.log('🔐 Loading classes for teacherId:', teacherId);
    
    const classes = await classService.getClassesByDate(dateKey, teacherId);

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
}, [classService, selectedDate, getDateKey, teacher]);// ✅ All dependencies

  // ✅ FIX: Reload when dependencies change
  useEffect(() => {
    console.log('🔄 HomePage - useEffect triggered');
    console.log('  Selected date:', selectedDate.toISOString().split('T')[0]);
    
    loadSchedule();
    loadClasses();
  }, [loadSchedule, loadClasses]); // ✅ Both callbacks

const addClass = async (scheduleClass, title, comment) => {
  if (!classService || !teacher?.user_id) {
    alert('🔒 You need a teacher profile to add classes');
    return;
  }
  
  try {
    setLocalLoading(true);
    const dateKey = getDateKey(selectedDate);

    console.log('Adding class:', { dateKey, scheduleClass, title, comment });

    await classService.addClass(
      dateKey,
      scheduleClass.class,
      scheduleClass.subject,
      scheduleClass.time,
      title,
      comment || null,
      teacher.user_id // ← DODATO!
    );

    await loadClasses();
    setShowAddClass(false);
  } catch (error) {
    console.error('Error adding class:', error);
    alert('Failed to add class: ' + error.message);
  } finally {
    setLocalLoading(false);
  }
};

  const removeClass = async (classId) => {
    if (!classService) return;
    
    try {
      setLocalLoading(true);
      
      console.log('🗑️ Removing class:', classId);
      
      await classService.deleteClass(classId);
      
      console.log('✅ Class removed successfully');
      
      await loadClasses();
    } catch (error) {
      console.error('❌ Error removing class:', error);
      alert('Failed to remove class. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Check if user has any schedule entries
  const hasSchedule = todaySchedule.length > 0;
  
  // Show helpful message for admins without teacher_id
  const showAdminMessage = profile?.role === 'admin' && !teacher?.user_id;

  return (
    <div className="space-y-6">
      <DateNavigator />

      {/* Debug Info - REMOVE THIS LATER
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
        <p><strong>Debug Info:</strong></p>
        <p>Date: {selectedDate.toISOString().split('T')[0]}</p>
        <p>Day: {getDayName(selectedDate)}</p>
        <p>Teacher ID: {teacher?.user_id || 'None'}</p>
        <p>Schedule Entries: {todaySchedule.length}</p>
        <p>Classes Added: {dailyClasses.length}</p>
      </div> */}

      {/* Admin without teacher_id message */}
      {showAdminMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Admin Dashboard</h3>
          <p className="text-blue-700 text-sm">
            You are logged in as an administrator without a teaching schedule. 
            To add classes here, you need to have a teacher profile with scheduled classes.
          </p>
          <p className="text-blue-600 text-xs mt-2">
            Visit <strong>My Schedule</strong> to manage your teaching schedule, 
            or <strong>Management</strong> to view all school data.
          </p>
        </div>
      )}

      {/* Add Class Button */}
      {!showAdminMessage && (
        <button
          onClick={() => setShowAddClass(true)}
          disabled={localLoading || !hasSchedule}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          {!hasSchedule ? 'No classes scheduled for this day' : 'Add Class for Today'}
        </button>
      )}

      {/* Classes List */}
      {dailyClasses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <Clock size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">No classes added for this day yet</p>
          {hasSchedule && !showAdminMessage && (
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

      {/* Add Class Modal */}
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