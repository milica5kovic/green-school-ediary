import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, GraduationCap, BookOpen, Calendar, Activity, AlertCircle, CheckCircle,
  Clock, ClipboardList, Snowflake, Flower2, Sun, TrendingUp, XCircle, AlertTriangle,
  BarChart3, ChevronRight
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';

const TERM_CONFIG = {
  1: { name: 'Winter', icon: Snowflake, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  2: { name: 'Spring', icon: Flower2, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  3: { name: 'Summer', icon: Sun, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
};

const AdminDashboard = () => {
  const { supabase } = useApp();
  const { activeTerm, allTerms } = useActiveTerm();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [classCounts, setClassCounts] = useState({});
  const [homeworkStats, setHomeworkStats] = useState(null);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  const loadDashboard = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);

      // ─── COUNTS ────────────────────────────────────────
      const [
        { count: activeStudents },
        { count: totalStudents },
        { count: teacherCount },
        { count: parentCount },
        { count: gradeCount },
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('parents').select('*', { count: 'exact', head: true }),
        supabase.from('grades').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        activeStudents: activeStudents || 0,
        totalStudents: totalStudents || 0,
        teachers: teacherCount || 0,
        parents: parentCount || 0,
        grades: gradeCount || 0,
      });

      // ─── STUDENTS BY CLASS ─────────────────────────────
      const { data: studentsByClass } = await supabase
        .from('students').select('class_name').eq('status', 'active');
      const counts = {};
      (studentsByClass || []).forEach(s => { counts[s.class_name] = (counts[s.class_name] || 0) + 1; });
      setClassCounts(counts);

      // ─── TODAY'S ATTENDANCE ────────────────────────────
      const { data: todayAtt } = await supabase
        .from('attendance').select('status').eq('date_key', today);

      if (todayAtt && todayAtt.length > 0) {
        const present = todayAtt.filter(a => a.status === 'present').length;
        const late = todayAtt.filter(a => a.status === 'late').length;
        const absent = todayAtt.filter(a => a.status === 'absent').length;
        const sentOut = todayAtt.filter(a => a.status === 'sent_out').length;
        setTodayAttendance({ total: todayAtt.length, present, late, absent, sentOut });
      } else {
        setTodayAttendance({ total: 0, present: 0, late: 0, absent: 0, sentOut: 0 });
      }

      // ─── HOMEWORK STATS (active term) ─────────────────
      if (activeTerm) {
        const { data: hw } = await supabase
          .from('homework').select('id').eq('term_number', activeTerm.term_number);
        const hwIds = (hw || []).map(h => h.id);

        if (hwIds.length > 0) {
          const { data: sh } = await supabase
            .from('student_homework').select('status').in('homework_id', hwIds);
          const total = sh?.length || 0;
          const done = sh?.filter(s => s.status === 'done').length || 0;
          const partial = sh?.filter(s => s.status === 'partially_done').length || 0;
          setHomeworkStats({
            assignments: hwIds.length,
            totalRecords: total,
            done, partial,
            notDone: total - done - partial,
            rate: total > 0 ? Math.round((done / total) * 100) : 0
          });
        } else {
          setHomeworkStats({ assignments: 0, totalRecords: 0, done: 0, partial: 0, notDone: 0, rate: 0 });
        }
      }

      // ─── UPCOMING TESTS ───────────────────────────────
      const { data: tests } = await supabase
        .from('scheduled_tests').select('*')
        .gte('test_date', today)
        .order('test_date')
        .limit(5);
      setUpcomingTests(tests || []);

      // ─── UPCOMING EVENTS ──────────────────────────────
      const { data: events } = await supabase
        .from('school_events').select('*')
        .gte('start_date', today)
        .order('start_date')
        .limit(5);
      setUpcomingEvents(events || []);

      // ─── ALERTS ───────────────────────────────────────
      const alertsList = [];

      // Students with high absences (check last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: recentAtt } = await supabase
        .from('attendance').select('student_id, status')
        .gte('date_key', thirtyDaysAgo);

      if (recentAtt && recentAtt.length > 0) {
        const studentAttMap = {};
        recentAtt.forEach(a => {
          if (!studentAttMap[a.student_id]) studentAttMap[a.student_id] = { total: 0, present: 0 };
          studentAttMap[a.student_id].total++;
          if (a.status === 'present') studentAttMap[a.student_id].present++;
        });

        let lowAttCount = 0;
        Object.values(studentAttMap).forEach(s => {
          if (s.total >= 5 && (s.present / s.total) < 0.8) lowAttCount++;
        });

        if (lowAttCount > 0) {
          alertsList.push({
            id: 'low-att', severity: 'warning', icon: AlertTriangle,
            title: 'Low Attendance', message: `${lowAttCount} student${lowAttCount > 1 ? 's' : ''} below 80% attendance (last 30 days)`
          });
        }
      }

      // Homework not done
      if (homeworkStats?.notDone > 0) {
        // Will be set after state updates
      }

      // No active term warning
      if (!activeTerm) {
        alertsList.push({
          id: 'no-term', severity: 'error', icon: AlertCircle,
          title: 'No Active Term', message: 'Academic terms not configured. Go to Management → Academic Terms.'
        });
      }

      // All terms finalized
      const allFinalized = allTerms.length > 0 && allTerms.every(t => t.is_finalized);
      if (allFinalized) {
        alertsList.push({
          id: 'all-finalized', severity: 'info', icon: CheckCircle,
          title: 'All Terms Finalized', message: 'Consider running year-end archive if the school year is complete.'
        });
      }

      if (alertsList.length === 0) {
        alertsList.push({
          id: 'all-good', severity: 'success', icon: CheckCircle,
          title: 'All Clear', message: 'No alerts at this time.'
        });
      }

      setAlerts(alertsList);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, activeTerm, allTerms, today]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // ─── HELPERS ───────────────────────────────────────────

  const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  const termConfig = activeTerm ? TERM_CONFIG[activeTerm.term_number] : null;
  const TermIcon = termConfig?.icon || Calendar;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── TERM BANNER ──────────────────────────────── */}
      {activeTerm && termConfig && (
        <div className={`bg-gradient-to-r ${termConfig.gradient} rounded-2xl shadow-lg p-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TermIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{termConfig.name} Term {activeTerm.academic_year}</h2>
                <p className="text-white/80 text-sm mt-0.5">
                  {new Date(activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                  {' – '}
                  {new Date(activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {(() => {
                  const endDate = new Date(activeTerm.end_date + 'T00:00:00');
                  const todayDate = new Date(today + 'T00:00:00');
                  const totalDays = Math.ceil((endDate - new Date(activeTerm.start_date + 'T00:00:00')) / (1000 * 60 * 60 * 24));
                  const elapsed = Math.ceil((todayDate - new Date(activeTerm.start_date + 'T00:00:00')) / (1000 * 60 * 60 * 24));
                  const remaining = Math.max(0, totalDays - elapsed);
                  return remaining;
                })()}
              </p>
              <p className="text-white/70 text-xs">days remaining</p>
            </div>
          </div>
          {/* Term progress bar */}
          <div className="mt-3">
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${(() => {
                const endDate = new Date(activeTerm.end_date + 'T00:00:00');
                const startDate = new Date(activeTerm.start_date + 'T00:00:00');
                const todayDate = new Date(today + 'T00:00:00');
                const total = endDate - startDate;
                const elapsed = todayDate - startDate;
                return Math.min(100, Math.max(0, (elapsed / total) * 100));
              })()}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {!activeTerm && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex items-center gap-3">
          <AlertCircle size={24} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">No Active Term</p>
            <p className="text-xs text-amber-700">Go to Management → Academic Terms to set up the current term.</p>
          </div>
        </div>
      )}

      {/* ─── TOP STATS ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Active Students', value: stats?.activeStudents, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Teachers', value: stats?.teachers, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Parents', value: stats?.parents, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
          { label: 'Total Grades', value: stats?.grades, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: 'Classes', value: Object.keys(classCounts).length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-3.5 border ${s.border}`}>
            <div className="flex items-center justify-between mb-1">
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── TODAY'S ATTENDANCE + HOMEWORK ROW ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-600" />
            Today's Attendance
            <span className="text-[10px] text-gray-400 font-normal ml-auto">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          </h3>

          {todayAttendance && todayAttendance.total > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Present', value: todayAttendance.present, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Late', value: todayAttendance.late, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Absent', value: todayAttendance.absent, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Sent Out', value: todayAttendance.sentOut, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((s, i) => (
                  <div key={i} className={`${s.bg} rounded-lg p-2.5 text-center`}>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${todayAttendance.total > 0 ? Math.round((todayAttendance.present / todayAttendance.total) * 100) : 0}%` }}></div>
                </div>
                <span className="text-xs font-bold text-emerald-600">
                  {todayAttendance.total > 0 ? Math.round((todayAttendance.present / todayAttendance.total) * 100) : 0}%
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <Clock size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No attendance recorded today yet</p>
            </div>
          )}
        </div>

        {/* Homework Completion */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-purple-600" />
            Homework Completion
            {activeTerm && (
              <span className={`text-[10px] font-medium ml-auto px-2 py-0.5 rounded-full ${termConfig?.bg} ${termConfig?.text}`}>
                {termConfig?.name} Term
              </span>
            )}
          </h3>

          {homeworkStats && homeworkStats.assignments > 0 ? (
            <>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${homeworkStats.rate}, 100`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-800">{homeworkStats.rate}%</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Assignments</span>
                    <span className="font-semibold text-gray-700">{homeworkStats.assignments}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Done</span>
                    <span className="font-semibold text-emerald-600">{homeworkStats.done}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1"><Clock size={10} className="text-orange-500" /> Partial</span>
                    <span className="font-semibold text-orange-600">{homeworkStats.partial}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1"><XCircle size={10} className="text-red-500" /> Not Done</span>
                    <span className="font-semibold text-red-600">{homeworkStats.notDone}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <ClipboardList size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No homework this term yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── STUDENTS BY CLASS + ALERTS ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Students by Class */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-600" />
            Students by Class
            <span className="text-[10px] text-gray-400 font-normal ml-auto">{stats?.activeStudents} active</span>
          </h3>

          {Object.keys(classCounts).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(classCounts).sort(([a], [b]) => a.localeCompare(b)).map(([cls, count]) => {
                const maxCount = Math.max(...Object.values(classCounts));
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={cls} className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-gray-700 w-10">{cls}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-4 rounded-full transition-all flex items-center justify-end pr-1.5"
                        style={{ width: `${Math.max(pct, 15)}%` }}>
                        <span className="text-[9px] font-bold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <Users size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No active students</p>
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <AlertCircle size={16} className="text-orange-600" />
            Alerts
          </h3>

          <div className="space-y-2">
            {alerts.map(alert => {
              const colorMap = {
                warning: { bg: 'bg-amber-50', border: 'border-l-amber-500', iconColor: 'text-amber-600' },
                error: { bg: 'bg-red-50', border: 'border-l-red-500', iconColor: 'text-red-600' },
                info: { bg: 'bg-blue-50', border: 'border-l-blue-500', iconColor: 'text-blue-600' },
                success: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', iconColor: 'text-emerald-600' },
              };
              const colors = colorMap[alert.severity] || colorMap.info;
              const AlertIcon = alert.icon;

              return (
                <div key={alert.id} className={`${colors.bg} border-l-4 ${colors.border} rounded-r-lg p-3`}>
                  <div className="flex items-start gap-2.5">
                    <AlertIcon size={16} className={`${colors.iconColor} mt-0.5 flex-shrink-0`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{alert.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── UPCOMING TESTS + EVENTS ──────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Tests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-red-600" />
            Upcoming Tests
          </h3>

          {upcomingTests.length > 0 ? (
            <div className="space-y-2">
              {upcomingTests.map(test => (
                <div key={test.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-medium text-red-500 leading-none">
                      {new Date(test.test_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-red-700 leading-none">
                      {new Date(test.test_date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{test.title}</p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium">{test.subject}</span>
                      <span>{test.class_name}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                    daysUntil(test.test_date) === 'Today' ? 'bg-red-100 text-red-700' :
                    daysUntil(test.test_date) === 'Tomorrow' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {daysUntil(test.test_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <BookOpen size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No upcoming tests</p>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-teal-600" />
            Upcoming Events
          </h3>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: event.color ? event.color + '20' : '#f0fdf4', borderColor: event.color || '#10b981', borderWidth: '1px' }}>
                    <span className="text-[9px] font-medium leading-none" style={{ color: event.color || '#10b981' }}>
                      {new Date(event.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold leading-none" style={{ color: event.color || '#10b981' }}>
                      {new Date(event.start_date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{event.title}</p>
                    <p className="text-[11px] text-gray-500">{event.event_type}{event.location ? ` • ${event.location}` : ''}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                    daysUntil(event.start_date) === 'Today' ? 'bg-teal-100 text-teal-700' :
                    daysUntil(event.start_date) === 'Tomorrow' ? 'bg-cyan-100 text-cyan-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {daysUntil(event.start_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <Calendar size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No upcoming events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;