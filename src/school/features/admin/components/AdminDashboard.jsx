import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, GraduationCap, BookOpen, Calendar, AlertCircle, CheckCircle,
  Clock, ClipboardList, XCircle, AlertTriangle, BarChart3
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

import { TermBanner, NoTermWarning, TermFooter } from '../../../../shared/components/TermBanner';

// ════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD - Using centralized term theming
// ════════════════════════════════════════════════════════════════════════════

const AdminDashboard = () => {
  const { supabase, schoolId } = useApp();
  const { activeTerm, allTerms } = useActiveTerm();
  const theme = useTermTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [classCounts, setClassCounts] = useState({});
  const [homeworkStats, setHomeworkStats] = useState(null);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const today = new Date().toISOString().split('T')[0];

  // ══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════════════

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!supabase || !schoolId) {
      console.log('⏳ Waiting for schoolId...');
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      console.log('📊 Loading dashboard for school:', schoolId);

      // Parallel counts
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

      // Students by class
      const { data: studentsByClass } = await supabase
        .from('students')
        .select('class_name')
        .eq('status', 'active');
      
      const counts = {};
      (studentsByClass || []).forEach(s => {
        if (s.class_name) counts[s.class_name] = (counts[s.class_name] || 0) + 1;
      });
      setClassCounts(counts);

      // Today's attendance
      const { data: todayAtt } = await supabase
        .from('attendance')
        .select('status')
        .eq('date_key', today);

      if (todayAtt && todayAtt.length > 0) {
        setTodayAttendance({
          total: todayAtt.length,
          present: todayAtt.filter(a => a.status === 'present').length,
          late: todayAtt.filter(a => a.status === 'late').length,
          absent: todayAtt.filter(a => a.status === 'absent').length,
          sentOut: todayAtt.filter(a => a.status === 'sent_out').length,
        });
      } else {
        setTodayAttendance({ total: 0, present: 0, late: 0, absent: 0, sentOut: 0 });
      }

      // Homework stats
      if (activeTerm) {
        const { data: hw } = await supabase
          .from('homework')
          .select('id')
          .eq('term_number', activeTerm.term_number);
        
        const hwIds = (hw || []).map(h => h.id);
        if (hwIds.length > 0) {
          const { data: sh } = await supabase
            .from('student_homework')
            .select('status')
            .in('homework_id', hwIds);
          
          const total = sh?.length || 0;
          const done = sh?.filter(s => s.status === 'done').length || 0;
          const partial = sh?.filter(s => s.status === 'partially_done').length || 0;
          
          setHomeworkStats({
            assignments: hwIds.length,
            done,
            partial,
            notDone: total - done - partial,
            rate: total > 0 ? Math.round((done / total) * 100) : 0
          });
        } else {
          setHomeworkStats({ assignments: 0, done: 0, partial: 0, notDone: 0, rate: 0 });
        }
      }

      // Upcoming tests & events
      const { data: tests } = await supabase
        .from('scheduled_tests')
        .select('*')
        .gte('test_date', today)
        .order('test_date')
        .limit(5);
      setUpcomingTests(tests || []);

      const { data: events } = await supabase
        .from('school_events')
        .select('*')
        .gte('start_date', today)
        .order('start_date')
        .limit(5);
      setUpcomingEvents(events || []);

      // Build alerts
      const alertsList = [];
      
      if (!activeTerm) {
        alertsList.push({
          id: 'no-term', severity: 'error', icon: AlertCircle,
          title: 'No Active Term',
          message: 'Go to Settings → Academic Terms to configure.'
        });
      }

      const allFinalized = allTerms.length > 0 && allTerms.every(t => t.is_finalized);
      if (allFinalized) {
        alertsList.push({
          id: 'all-finalized', severity: 'info', icon: CheckCircle,
          title: 'All Terms Finalized',
          message: 'Consider running year-end archive.'
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
      setRefreshing(false);
    }
  }, [supabase, schoolId, activeTerm, allTerms, today]);

  useEffect(() => {
    if (schoolId) loadDashboard();
  }, [schoolId, loadDashboard]);

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div 
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }}
          />
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER (uses dynamic colors from useTermTheme) ═══ */}
      <TermBanner 
        showRefresh 
        onRefresh={() => loadDashboard(true)} 
        refreshing={refreshing} 
      />
      
      {/* No term warning */}
      <NoTermWarning />

      {/* ═══ TOP STATS (uses theme colors) ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={GraduationCap} label="Active Students" value={stats?.activeStudents} theme={theme} />
        <StatCard icon={BookOpen} label="Teachers" value={stats?.teachers} theme={theme} />
        <StatCard icon={Users} label="Parents" value={stats?.parents} theme={theme} />
        <StatCard icon={BarChart3} label="Total Grades" value={stats?.grades} theme={theme} />
        <StatCard icon={Calendar} label="Classes" value={Object.keys(classCounts).length} theme={theme} />
      </div>

      {/* ═══ ATTENDANCE + HOMEWORK ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Today's Attendance" icon={CheckCircle} theme={theme}>
          {todayAttendance && todayAttendance.total > 0 ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <MiniStat label="Present" value={todayAttendance.present} color="#10b981" />
                <MiniStat label="Late" value={todayAttendance.late} color="#f59e0b" />
                <MiniStat label="Absent" value={todayAttendance.absent} color="#ef4444" />
                <MiniStat label="Sent Out" value={todayAttendance.sentOut} color="#8b5cf6" />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all"
                    style={{ 
                      width: `${todayAttendance.total > 0 ? Math.round((todayAttendance.present / todayAttendance.total) * 100) : 0}%`,
                      backgroundColor: theme.color
                    }}
                  />
                </div>
                <span className="text-xs font-bold" style={theme.textStyle}>
                  {todayAttendance.total > 0 ? Math.round((todayAttendance.present / todayAttendance.total) * 100) : 0}%
                </span>
              </div>
            </>
          ) : (
            <EmptyState icon={Clock} message="No attendance recorded today" />
          )}
        </DashboardCard>

        <DashboardCard title="Homework Completion" icon={ClipboardList} theme={theme}>
          {homeworkStats && homeworkStats.assignments > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke={theme.color} strokeWidth="3"
                    strokeDasharray={`${homeworkStats.rate}, 100`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-800">{homeworkStats.rate}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Assignments</span>
                  <span className="font-semibold">{homeworkStats.assignments}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> Done</span>
                  <span className="font-semibold text-emerald-600">{homeworkStats.done}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><Clock size={10} className="text-amber-500" /> Partial</span>
                  <span className="font-semibold text-amber-600">{homeworkStats.partial}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><XCircle size={10} className="text-red-500" /> Not Done</span>
                  <span className="font-semibold text-red-600">{homeworkStats.notDone}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon={ClipboardList} message="No homework this term" />
          )}
        </DashboardCard>
      </div>

      {/* ═══ CLASS DISTRIBUTION + ALERTS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Students by Class" icon={Users} theme={theme} subtitle={`${stats?.activeStudents} active`}>
          {Object.keys(classCounts).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(classCounts).sort(([a], [b]) => a.localeCompare(b)).map(([cls, count]) => {
                const maxCount = Math.max(...Object.values(classCounts));
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={cls} className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-gray-700 w-10">{cls}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div 
                        className="h-4 rounded-full transition-all flex items-center justify-end pr-1.5"
                        style={{ width: `${Math.max(pct, 15)}%`, backgroundColor: theme.color }}
                      >
                        <span className="text-[9px] font-bold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Users} message="No active students" />
          )}
        </DashboardCard>

        <DashboardCard title="Alerts" icon={AlertCircle} theme={theme}>
          <div className="space-y-2">
            {alerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* ═══ UPCOMING TESTS + EVENTS ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Upcoming Tests" icon={BookOpen} theme={theme} iconColor="#ef4444">
          {upcomingTests.length > 0 ? (
            <div className="space-y-2">
              {upcomingTests.map(test => (
                <EventRow 
                  key={test.id}
                  date={test.test_date}
                  title={test.title}
                  subtitle={`${test.subject} • ${test.class_name}`}
                  daysText={daysUntil(test.test_date)}
                  color="#ef4444"
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} message="No upcoming tests" />
          )}
        </DashboardCard>

        <DashboardCard title="Upcoming Events" icon={Calendar} theme={theme}>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <EventRow 
                  key={event.id}
                  date={event.start_date}
                  title={event.title}
                  subtitle={`${event.event_type}${event.location ? ` • ${event.location}` : ''}`}
                  daysText={daysUntil(event.start_date)}
                  color={event.color || theme.color}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={Calendar} message="No upcoming events" />
          )}
        </DashboardCard>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const StatCard = ({ icon: Icon, label, value, theme }) => (
  <div 
    className="rounded-xl p-3.5 border"
    style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.15) }}
  >
    <Icon size={16} style={theme.textStyle} />
    <p className="text-2xl font-bold mt-1" style={theme.textStyle}>{value ?? 0}</p>
    <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
  </div>
);

const DashboardCard = ({ title, icon: Icon, children, theme, subtitle, iconColor }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
      <Icon size={16} style={{ color: iconColor || theme.color }} />
      {title}
      {subtitle && <span className="text-[10px] text-gray-400 font-normal ml-auto">{subtitle}</span>}
    </h3>
    {children}
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: `${color}10` }}>
    <p className="text-xl font-bold" style={{ color }}>{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-6 bg-gray-50 rounded-xl">
    <Icon size={28} className="mx-auto text-gray-300 mb-2" />
    <p className="text-xs text-gray-400">{message}</p>
  </div>
);

const AlertItem = ({ alert }) => {
  const colorMap = {
    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '#d97706' },
    error: { bg: '#fee2e2', border: '#ef4444', icon: '#dc2626' },
    info: { bg: '#dbeafe', border: '#3b82f6', icon: '#2563eb' },
    success: { bg: '#dcfce7', border: '#22c55e', icon: '#16a34a' },
  };
  const colors = colorMap[alert.severity] || colorMap.info;
  const AlertIcon = alert.icon;

  return (
    <div className="rounded-lg p-3 border-l-4" style={{ backgroundColor: colors.bg, borderLeftColor: colors.border }}>
      <div className="flex items-start gap-2.5">
        <AlertIcon size={16} className="mt-0.5 flex-shrink-0" style={{ color: colors.icon }} />
        <div>
          <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
          <p className="text-[11px] text-gray-600 mt-0.5">{alert.message}</p>
        </div>
      </div>
    </div>
  );
};

const EventRow = ({ date, title, subtitle, daysText, color }) => {
  const dateObj = new Date(date + 'T00:00:00');
  const isToday = daysText === 'Today';
  const isTomorrow = daysText === 'Tomorrow';

  return (
    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div 
        className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border"
        style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
      >
        <span className="text-[9px] font-medium leading-none" style={{ color }}>
          {dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
        </span>
        <span className="text-sm font-bold leading-none" style={{ color }}>
          {dateObj.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
        <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
      </div>
      <span 
        className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
        style={{
          backgroundColor: isToday ? `${color}20` : isTomorrow ? `${color}15` : '#f3f4f6',
          color: isToday || isTomorrow ? color : '#6b7280'
        }}
      >
        {daysText}
      </span>
    </div>
  );
};

export default AdminDashboard;