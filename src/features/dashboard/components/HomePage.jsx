import React, { useState, useEffect } from 'react';
import { Plus, Clock } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import DateNavigator from '../../../shared/components/DateNavigator';
import ClassCard from './ClassCard';
import AddClassModal from './AddClassModal';
import { useAuth } from '../../../core/context/AuthContext';

const HomePage = () => {

  
  const { getDateKey, getDayName, selectedDate, classService, scheduleService } = useApp();
  const [dailyClasses, setDailyClasses] = useState([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);


    
  const { teacher, profile } = useAuth();


  console.log('🎨 HomePage RENDER', {
    date: selectedDate.toISOString().split('T')[0],
    hasService: !!scheduleService,
    teacherId: teacher?.user_id,
    timestamp: new Date().toISOString()
  });
useEffect(() => {
  let isMounted = true;
  
  const loadData = async () => {
    if (!isMounted) return;
    
    console.log('🔄 HomePage loading...');
    
    if (!scheduleService || !classService) {
      console.log('❌ Services not ready');
      return;
    }
    
    try {
      const dayName = getDayName(selectedDate);
      const dateKey = getDateKey(selectedDate);
      const teacherId = teacher?.user_id || null;
      
      console.log('📊 Loading for:', { dayName, dateKey, teacherId });
      
      const [schedule, classes] = await Promise.all([
        scheduleService.getScheduleByDay(dayName, teacherId),
        classService.getClassesByDate(dateKey, teacherId)
      ]);
      
      console.log('✅ Data loaded:', {
        schedule: schedule?.length || 0,
        classes: classes?.length || 0
      });
      
      if (isMounted) {
        setTodaySchedule(schedule || []);
        
        const formattedClasses = (classes || []).map((cls) => ({
          id: cls.class_id,
          class: cls.class_name,
          subject: cls.subject,
          time: cls.time,
          title: cls.title,
        }));
        
        setDailyClasses(formattedClasses);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      if (isMounted) {
        setTodaySchedule([]);
        setDailyClasses([]);
      }
    }
  };
  
  loadData();
  
  return () => {
    isMounted = false;
  };
}, [selectedDate, teacher?.user_id, scheduleService, classService, getDayName, getDateKey]);
  const addClass = async (scheduleClass, title, comment) => {
    if (!classService || !teacher?.user_id) {
      alert('🔒 You need a teacher profile to add classes');
      return;
    }
    
    try {
      setLocalLoading(true);
      const dateKey = getDateKey(selectedDate);

      await classService.addClass(
        dateKey,
        scheduleClass.class,
        scheduleClass.subject,
        scheduleClass.time,
        title,
        comment || null,
        teacher.user_id
      );

      // Reload classes
      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);
      const formattedClasses = (classes || []).map((cls) => ({
        id: cls.class_id,
        class: cls.class_name,
        subject: cls.subject,
        time: cls.time,
        title: cls.title,
      }));
      setDailyClasses(formattedClasses);
      
      setShowAddClass(false);
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Failed to add class: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const removeClass = async (classId) => {
    if (!classService || !teacher?.user_id) return;
    
    try {
      setLocalLoading(true);
      
      await classService.deleteClass(classId);
      
      // Reload classes
      const dateKey = getDateKey(selectedDate);
      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);
      const formattedClasses = (classes || []).map((cls) => ({
        id: cls.class_id,
        class: cls.class_name,
        subject: cls.subject,
        time: cls.time,
        title: cls.title,
      }));
      setDailyClasses(formattedClasses);
    } catch (error) {
      console.error('Error removing class:', error);
      alert('Failed to remove class. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const hasSchedule = todaySchedule.length > 0;
  const showAdminMessage = profile?.role === 'admin' && !teacher?.user_id;

  return (
    <div className="space-y-6">
      <DateNavigator />

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