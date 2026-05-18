import React, { useState, useEffect } from 'react';
import { Plus, Clock, Calendar } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import DateNavigator from '../../../../shared/components/DateNavigator';
import ClassCard from './ClassCard';
import AddClassModal from './AddClassModal';
import { useAuth } from '../../../../core/context/AuthContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ════════════════════════════════════════════════════════════════════════════
// HOMEPAGE - Teacher's Daily Class Management
// Uses useTermTheme for dynamic colors from BrandingContext
// ════════════════════════════════════════════════════════════════════════════

const HomePage = () => {
  const { getDateKey, selectedDate, classService, scheduleService } = useApp();
  const [dailyClasses, setDailyClasses] = useState([]);
  const [showAddClass, setShowAddClass] = useState(false);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [periodMap, setPeriodMap] = useState({});
  const [localLoading, setLocalLoading] = useState(false);
  const { teacher, profile } = useAuth();
  
  // ═══ USE TERM THEME (dynamic colors from admin settings) ═══
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  // Get day name helper
  const getDayName = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date));
  };

  // Load schedule and classes
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) return;
      if (!scheduleService || !classService) return;

      try {
        const dayName = getDayName(selectedDate);
        const dateKey = getDateKey(selectedDate);
        const teacherId = teacher?.user_id || null;

        const [schedule, classes, periods] = await Promise.all([
          scheduleService.getScheduleByDay(dayName, teacherId),
          classService.getClassesByDate(dateKey, teacherId),
          scheduleService.getSchoolPeriodsForDay(dayName),
        ]);

        if (isMounted) {
          setTodaySchedule(schedule || []);
          setPeriodMap(periods || {});
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
    return () => { isMounted = false; };
  }, [selectedDate, teacher?.user_id, scheduleService, classService, getDateKey]);

  // Add class handler
  const addClass = async (scheduleClass, title, comment) => {
    if (!classService || !teacher?.user_id) {
      alert('You need a teacher profile to add classes');
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

      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);
      setDailyClasses(
        (classes || []).map((cls) => ({
          id: cls.class_id,
          class: cls.class_name,
          subject: cls.subject,
          time: cls.time,
          title: cls.title
        }))
      );

      setShowAddClass(false);
    } catch (error) {
      console.error('Error adding class:', error);
      alert('Failed to add class: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // Remove class handler
  const removeClass = async (classId) => {
    if (!classService || !teacher?.user_id) return;

    try {
      setLocalLoading(true);
      await classService.deleteClass(classId);

      const dateKey = getDateKey(selectedDate);
      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);

      setDailyClasses(
        (classes || []).map((cls) => ({
          id: cls.class_id,
          class: cls.class_name,
          subject: cls.subject,
          time: cls.time,
          title: cls.title
        }))
      );
    } catch (error) {
      console.error('Error removing class:', error);
      alert('Failed to remove class. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Sort: latest time at top, earliest at bottom
  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.replace(/[APap][Mm]/, '').trim().split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const sortedClasses = [...dailyClasses].sort((a, b) => parseTime(b.time) - parseTime(a.time));

  const hasSchedule = todaySchedule.length > 0;
  const showAdminMessage = profile?.role === 'admin' && !teacher?.user_id;

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER - Dynamic Colors ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ 
            backgroundColor: theme.withAlpha(0.1),
            borderWidth: '1px',
            borderColor: theme.withAlpha(0.2)
          }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>
              {theme.name} Term
            </span>
            <span className="text-xs text-gray-500">
              {new Date(theme.activeTerm.start_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>
            {theme.daysRemaining} days left
          </span>
        </div>
      )}

      {/* ═══ DATE NAVIGATOR ═══ */}
      <DateNavigator />

      {/* ═══ ADMIN MESSAGE ═══ */}
      {showAdminMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Admin Dashboard</h3>
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

      {/* ═══ ADD CLASS BUTTON - Dynamic Gradient ═══ */}
      {!showAdminMessage && (
        <button
          onClick={() => setShowAddClass(true)}
          disabled={localLoading || !hasSchedule}
          className="w-full text-white py-4 rounded-2xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={theme.gradientStyle}
        >
          <Plus size={20} />
          {!hasSchedule ? 'No classes scheduled for this day' : 'Add Class for Today'}
        </button>
      )}

      {/* ═══ CLASSES LIST ═══ */}
      {dailyClasses.length === 0 ? (
        <div 
          className="bg-white rounded-2xl shadow-lg p-12 text-center border"
          style={{ borderColor: theme.withAlpha(0.2) }}
        >
          <Clock size={48} className="mx-auto mb-4" style={{ color: theme.withAlpha(0.4) }} />
          <p className="text-gray-500">No classes added for this day yet</p>
          {hasSchedule && !showAdminMessage && (
            <p className="text-sm text-gray-400 mt-2">
              Click "Add Class for Today" to get started
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedClasses.map((cls, idx) => (
            <ClassCard key={cls.id} cls={cls} onRemove={removeClass} periodNumber={periodMap[cls.time]} stackIndex={idx} total={sortedClasses.length} />
          ))}
        </div>
      )}

      {/* ═══ ADD CLASS MODAL ═══ */}
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