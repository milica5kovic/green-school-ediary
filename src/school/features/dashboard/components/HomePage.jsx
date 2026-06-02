import React, { useState, useEffect } from 'react';
import { Plus, Clock, BookOpen, Info } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import DateNavigator from '../../../../shared/components/DateNavigator';
import { toast } from '../../../../core/components/Toast';
import ClassCard from './ClassCard';
import AddClassModal from './AddClassModal';
import { useAuth } from '../../../../core/context/AuthContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ════════════════════════════════════════════════════════════════════════════
// HOME PAGE — Teacher's daily class management
// ════════════════════════════════════════════════════════════════════════════

const HomePage = () => {
  const { getDateKey, selectedDate, classService, scheduleService } = useApp();
  const [dailyClasses, setDailyClasses]   = useState([]);
  const [showAddClass, setShowAddClass]   = useState(false);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [periodMap, setPeriodMap]         = useState({});
  const [localLoading, setLocalLoading]   = useState(false);
  const { teacher, profile }              = useAuth();
  const theme                             = useTermTheme();

  // ── helpers ──────────────────────────────────────────────────────────────
  const getDayName = (date) =>
    date ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date)) : '';

  // ── load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!scheduleService || !classService) return;
      try {
        const dayName   = getDayName(selectedDate);
        const dateKey   = getDateKey(selectedDate);
        const teacherId = teacher?.user_id || null;

        const [schedule, classes, periods] = await Promise.all([
          scheduleService.getScheduleByDay(dayName, teacherId),
          classService.getClassesByDate(dateKey, teacherId),
          scheduleService.getSchoolPeriodsForDay(dayName),
        ]);

        if (isMounted) {
          setTodaySchedule(schedule || []);
          setPeriodMap(periods || {});
          setDailyClasses(
            (classes || []).map((cls) => ({
              id:      cls.class_id,
              class:   cls.class_name,
              subject: cls.subject,
              time:    cls.time,
              title:   cls.title,
            }))
          );
        }
      } catch (err) {
        console.error('Error loading data:', err);
        if (isMounted) { setTodaySchedule([]); setDailyClasses([]); }
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [selectedDate, teacher?.user_id, scheduleService, classService, getDateKey]);

  // ── add class ─────────────────────────────────────────────────────────────
  const addClass = async (scheduleClass, title, comment) => {
    if (!classService || !teacher?.user_id) {
      toast.warning('You need a teacher profile to add classes');
      return;
    }
    try {
      setLocalLoading(true);
      const dateKey = getDateKey(selectedDate);
      await classService.addClass(
        dateKey, scheduleClass.class, scheduleClass.subject,
        scheduleClass.time, title, comment || null, teacher.user_id
      );
      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);
      setDailyClasses(
        (classes || []).map((cls) => ({
          id: cls.class_id, class: cls.class_name,
          subject: cls.subject, time: cls.time, title: cls.title,
        }))
      );
      setShowAddClass(false);
    } catch (err) {
      console.error('Error adding class:', err);
      toast.error('Failed to add class: ' + err.message);
    } finally {
      setLocalLoading(false);
    }
  };

  // ── remove class ──────────────────────────────────────────────────────────
  const removeClass = async (classId) => {
    if (!classService || !teacher?.user_id) return;
    try {
      setLocalLoading(true);
      await classService.deleteClass(classId);
      const dateKey = getDateKey(selectedDate);
      const classes = await classService.getClassesByDate(dateKey, teacher.user_id);
      setDailyClasses(
        (classes || []).map((cls) => ({
          id: cls.class_id, class: cls.class_name,
          subject: cls.subject, time: cls.time, title: cls.title,
        }))
      );
    } catch (err) {
      console.error('Error removing class:', err);
      toast.error('Failed to remove class. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // ── sort: P1 at top (ascending), fall back to time string ─────────────────
  const sortedClasses = [...dailyClasses].sort((a, b) => {
    const pa = periodMap[a.time] ?? 99;
    const pb = periodMap[b.time] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.time || '').localeCompare(b.time || '');
  });

  const hasSchedule      = todaySchedule.length > 0;
  const showAdminMessage = profile?.role === 'admin' && !teacher?.user_id;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ─── Date navigator (includes term strip) ─────────────────────────── */}
      <DateNavigator />

      {/* ─── Admin info banner ────────────────────────────────────────────── */}
      {showAdminMessage && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-blue-900 text-sm">Admin account — no teaching schedule</p>
            <p className="text-blue-600 text-xs mt-1 leading-relaxed">
              To track attendance here, set up a teacher profile with scheduled classes via{' '}
              <strong>My Schedule</strong>. Use <strong>Management</strong> to view all school data.
            </p>
          </div>
        </div>
      )}

      {/* ─── Classes section ──────────────────────────────────────────────── */}
      {!showAdminMessage && (
        <>
          {/* Section header row */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">Today's Classes</span>
              {dailyClasses.length > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}
                >
                  {dailyClasses.length}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowAddClass(true)}
              disabled={localLoading || !hasSchedule}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md active:scale-95"
              style={theme.gradientStyle}
              title={!hasSchedule ? 'No classes scheduled for this day' : 'Log a class'}
            >
              <Plus size={14} />
              Add Class
            </button>
          </div>

          {/* Empty state */}
          {dailyClasses.length === 0 && (
            <div
              className="bg-white rounded-2xl border py-12 px-8 text-center"
              style={{ borderColor: theme.withAlpha(0.15) }}
            >
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: theme.withAlpha(0.08) }}
              >
                {hasSchedule
                  ? <BookOpen size={26} style={{ color: theme.withAlpha(0.45) }} />
                  : <Clock size={26} style={{ color: theme.withAlpha(0.45) }} />
                }
              </div>
              <p className="font-semibold text-gray-600 text-sm">
                {hasSchedule ? 'No classes logged yet' : 'Nothing scheduled today'}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                {hasSchedule
                  ? 'Tap "Add Class" above to start recording attendance for today.'
                  : 'There are no classes in your schedule for this day.'}
              </p>
            </div>
          )}

          {/* Class cards */}
          {dailyClasses.length > 0 && (
            <div className="flex flex-col gap-3">
              {sortedClasses.map((cls, idx) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  onRemove={removeClass}
                  periodNumber={periodMap[cls.time]}
                  stackIndex={idx}
                  total={sortedClasses.length}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Add class modal ──────────────────────────────────────────────── */}
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
