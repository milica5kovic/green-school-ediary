import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, ChevronDown,
  CheckCircle, XCircle, AlertCircle, BookOpen,
  FileText, MessageSquare, Award, Users,
  Bell, LayoutDashboard, TrendingUp, ClipboardList, Zap,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════

const ATT = {
  present:  { label: 'Present',      Icon: CheckCircle,  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', badgeBg: '#dcfce7', badgeText: '#15803d', dot: '#22c55e' },
  late:     { label: 'Late',         Icon: Clock,        color: '#f97316', bg: '#fff7ed', border: '#fed7aa', badgeBg: '#ffedd5', badgeText: '#c2410c', dot: '#fb923c' },
  absent:   { label: 'Absent',       Icon: XCircle,      color: '#ef4444', bg: '#fff1f2', border: '#fecdd3', badgeBg: '#ffe4e6', badgeText: '#b91c1c', dot: '#f87171' },
  sent_out: { label: 'Sent Out',     Icon: AlertCircle,  color: '#a855f7', bg: '#faf5ff', border: '#ddd6fe', badgeBg: '#ede9fe', badgeText: '#6d28d9', dot: '#c084fc' },
  default:  { label: 'Not Recorded', Icon: Clock,        color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', badgeBg: '#f3f4f6', badgeText: '#6b7280', dot: '#d1d5db' },
};

const COMMENT_CFG = {
  positive:        { label: 'Positive',   color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  neutral:         { label: 'Neutral',    color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  needs_attention: { label: 'Needs Work', color: '#ef4444', bg: '#fff1f2', border: '#fecdd3' },
};

// ════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

const CardHead = ({ icon: Icon, title, count, color }) => (
  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
    <Icon size={16} style={{ color }} />
    <h3 className="font-bold text-gray-800 text-sm flex-1">{title}</h3>
    {count !== undefined && count > 0 && (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}15`, color }}>
        {count}
      </span>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    <Icon size={28} className="text-gray-300" />
    <p className="text-gray-400 text-sm text-center">{message}</p>
  </div>
);

const StatusPill = ({ status }) => {
  const cfg = ATT[status] || ATT.default;
  const AttIcon = cfg.Icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0"
      style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}>
      <AttIcon size={10} />
      {cfg.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const ParentDailyViewPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  const { children, selectedChild, setSelectedChild, loading: childLoading } = useParentChildrenCtx();

  const [selectedDate, setSelectedDate]           = useState(new Date());
  const [dailyClasses, setDailyClasses]           = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [homeworkDueToday, setHomeworkDueToday]   = useState([]);
  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState({});
  const [todayGrades, setTodayGrades]             = useState([]);
  const [teacherComments, setTeacherComments]     = useState([]);
  const [announcements, setAnnouncements]         = useState([]);
  const [dataLoading, setDataLoading]             = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadDailyData = useCallback(async () => {
    if (!selectedChild) return;
    setDataLoading(true);
    try {
      const dateKey   = selectedDate.toISOString().split('T')[0];
      const dateStart = `${dateKey}T00:00:00`;
      const dateEnd   = `${dateKey}T23:59:59`;

      const [
        { data: classesData },
        { data: attendanceData },
        { data: homeworkData },
        { data: gradesData },
        { data: commentsData },
      ] = await Promise.all([
        supabase.from('classes').select('*').eq('date_key', dateKey).eq('class_name', selectedChild.class_name).order('time'),
        supabase.from('attendance').select('*').eq('date_key', dateKey).eq('student_id', selectedChild.id),
        supabase.from('homework').select('*').eq('class_name', selectedChild.class_name).eq('due_date', dateKey).order('subject'),
        supabase.from('grades').select('*').eq('student_id', selectedChild.id).eq('date', dateKey),
        supabase.from('teacher_comments')
          .select('*, teachers(full_name, subjects)')
          .eq('student_id', selectedChild.id)
          .eq('is_visible_to_parent', true)
          .gte('created_at', dateStart)
          .lte('created_at', dateEnd),
      ]);

      setDailyClasses(classesData || []);

      const attMap = {};
      attendanceData?.forEach(a => { attMap[a.class_id] = a; });
      setAttendanceRecords(attMap);

      setHomeworkDueToday(homeworkData || []);
      setTodayGrades(gradesData || []);
      setTeacherComments(commentsData || []);

      if (homeworkData?.length > 0) {
        const { data: studentHw } = await supabase
          .from('student_homework').select('*')
          .eq('student_id', selectedChild.id)
          .in('homework_id', homeworkData.map(h => h.id));
        const statusMap = {};
        studentHw?.forEach(sh => { statusMap[sh.homework_id] = sh; });
        setStudentHomeworkStatus(statusMap);
      } else {
        setStudentHomeworkStatus({});
      }

      // Announcements (graceful)
      try {
        const { data: annData } = await supabase
          .from('announcements').select('*')
          .eq('is_active', true)
          .lte('created_at', dateEnd)
          .order('created_at', { ascending: false })
          .limit(3);
        setAnnouncements(annData || []);
      } catch { setAnnouncements([]); }

    } catch (err) {
      console.error('ParentDailyView error:', err);
    } finally {
      setDataLoading(false);
    }
  }, [selectedChild, selectedDate, supabase]);

  useEffect(() => {
    if (selectedChild) loadDailyData();
  }, [selectedChild, selectedDate, loadDailyData]);

  // ── Computed ──────────────────────────────────────────────────────────────

  const isToday      = selectedDate.toDateString() === new Date().toDateString();
  const attList      = Object.values(attendanceRecords);
  const presentCount = attList.filter(a => a.status === 'present').length;
  const lateCount    = attList.filter(a => a.status === 'late').length;
  const absentCount  = attList.filter(a => a.status === 'absent').length;

  const getHwStatus = (hwId) => {
    const s = studentHomeworkStatus[hwId];
    if (!s) return { text: 'Pending', style: { backgroundColor: '#f3f4f6', color: '#6b7280' } };
    switch (s.status) {
      case 'done':           return { text: '✓ Submitted',   style: { backgroundColor: '#dcfce7', color: '#15803d' } };
      case 'partially_done': return { text: '◐ In Progress', style: { backgroundColor: '#ffedd5', color: '#c2410c' } };
      case 'not_done':       return { text: '✗ Not Done',    style: { backgroundColor: '#ffe4e6', color: '#b91c1c' } };
      default:               return { text: 'Pending',       style: { backgroundColor: '#f3f4f6', color: '#6b7280' } };
    }
  };

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const formatDateFull = (d) => d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Guards ────────────────────────────────────────────────────────────────

  if (childLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 rounded-full animate-spin"
        style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
    </div>
  );

  if (children.length === 0) return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
      <Users size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600 text-lg font-medium">No student data available</p>
      <p className="text-gray-400 text-sm mt-2">Please contact the school administration.</p>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ══ GRADIENT HEADER ════════════════════════════════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24 pointer-events-none" />

        <div className="relative z-10">
          {/* Title row */}
          <div className="flex items-start justify-between mb-5 gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium">Parent Portal</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-0.5">Daily View</h1>
              <p className="text-white/80 text-sm mt-1">
                {selectedChild?.name} · Class {selectedChild?.class_name}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              {children.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedChild?.id || ''}
                    onChange={e => setSelectedChild(children.find(c => c.id === e.target.value))}
                    className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-white focus:outline-none cursor-pointer"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id} className="text-gray-900">{c.name} — {c.class_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={prevDay}
              className="w-9 h-9 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center">
              <p className="font-bold capitalize text-sm md:text-base">{formatDateFull(selectedDate)}</p>
              {isToday ? (
                <span className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-3 py-0.5 rounded-full bg-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Today
                </span>
              ) : (
                <button onClick={() => setSelectedDate(new Date())}
                  className="mt-1 text-xs text-white/70 hover:text-white transition-colors underline underline-offset-2">
                  ← Back to today
                </button>
              )}
            </div>
            <button onClick={nextDay}
              className="w-9 h-9 bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Daily stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Classes',  value: dailyClasses.length },
              { label: 'Present',  value: presentCount },
              { label: 'Late',     value: lateCount },
              { label: 'Absent',   value: absentCount },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-2.5 text-center border border-white/20">
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-[10px] text-white/70 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {dataLoading && (
            <div className="absolute bottom-4 right-4">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      {!dataLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ═══ LEFT: SCHEDULE + ANNOUNCEMENTS ════════════════════════════ */}
          <div className="lg:col-span-3 space-y-5">

            {/* Schedule & Attendance */}
            <Card>
              <CardHead icon={BookOpen} title="Today's Schedule" count={dailyClasses.length} color={theme.color} />

              {dailyClasses.length === 0 ? (
                <EmptyState icon={Calendar} message="No classes scheduled for this day" />
              ) : (
                <div className="px-5 py-4">
                  <div className="relative">
                    {dailyClasses.length > 1 && (
                      <div className="absolute top-6 bottom-6 w-px bg-gray-100" style={{ left: '62px' }} />
                    )}
                    <div className="space-y-3">
                      {dailyClasses.map((cls) => {
                        const att = attendanceRecords[cls.class_id];
                        const cfg = ATT[att?.status] || ATT.default;
                        return (
                          <div key={cls.id} className="flex items-start gap-3">
                            <div className="w-12 flex-shrink-0 text-right pt-3">
                              <span className="text-[11px] font-bold text-gray-400 tabular-nums">{cls.time || '—'}</span>
                            </div>
                            <div className="flex-shrink-0 pt-2.5 z-10">
                              <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: cfg.dot }} />
                            </div>
                            <div className="flex-1 min-w-0 rounded-xl border p-3.5 transition-all hover:shadow-sm"
                              style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 text-sm leading-tight">{cls.subject}</p>
                                  {cls.title && cls.title !== cls.subject && (
                                    <p className="text-[11px] text-gray-400 mt-0.5">{cls.title}</p>
                                  )}
                                </div>
                                <StatusPill status={att?.status} />
                              </div>
                              {att?.comment && (
                                <div className="mt-2.5 pt-2.5 border-t flex items-start gap-1.5"
                                  style={{ borderColor: `${cfg.dot}30` }}>
                                  <MessageSquare size={11} style={{ color: cfg.color }} className="flex-shrink-0 mt-0.5" />
                                  <p className="text-xs text-gray-600 leading-snug">{att.comment}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Announcements — only when data exists */}
            {announcements.length > 0 && (
              <Card>
                <CardHead icon={Bell} title="School Announcements" count={announcements.length} color="#0ea5e9" />
                <div className="p-4 space-y-3">
                  {announcements.map(ann => (
                    <div key={ann.id} className="p-3.5 rounded-xl bg-sky-50 border border-sky-100">
                      <p className="font-semibold text-gray-900 text-sm">{ann.title}</p>
                      {ann.content && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{ann.content}</p>}
                      {ann.created_at && (
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* ═══ RIGHT: HOMEWORK · GRADES · COMMENTS · ACTIONS ══════════════ */}
          <div className="lg:col-span-2 space-y-5">

            {/* Homework due */}
            <Card>
              <CardHead icon={ClipboardList} title="Homework Due" count={homeworkDueToday.length} color="#f97316" />
              {homeworkDueToday.length === 0 ? (
                <EmptyState icon={FileText} message="No homework due today" />
              ) : (
                <div className="p-4 space-y-2.5">
                  {homeworkDueToday.map(hw => {
                    const hwStatus = getHwStatus(hw.id);
                    return (
                      <div key={hw.id} className="rounded-xl border border-orange-100 bg-orange-50 p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide">{hw.subject}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={hwStatus.style}>
                            {hwStatus.text}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">{hw.title}</p>
                        {hw.description && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{hw.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Today's grades — only when data exists */}
            {todayGrades.length > 0 && (
              <Card>
                <CardHead icon={Award} title="Today's Grades" count={todayGrades.length} color="#8b5cf6" />
                <div className="p-4 space-y-2.5">
                  {todayGrades.map(grade => {
                    const pct = Math.round((grade.grade / grade.max_grade) * 100);
                    const gc  = pct >= 80 ? '#15803d' : pct >= 60 ? '#c2410c' : '#b91c1c';
                    const gbg = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#ffedd5' : '#ffe4e6';
                    return (
                      <div key={grade.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-violet-50 border border-violet-100">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide block">
                            {grade.subject}
                            {grade.assessment_type && <span className="font-normal text-gray-400 normal-case tracking-normal ml-1">· {grade.assessment_type}</span>}
                          </span>
                          <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{grade.assessment_title}</p>
                        </div>
                        <div className="text-center px-3 py-2 rounded-xl flex-shrink-0" style={{ backgroundColor: gbg }}>
                          <p className="text-base font-bold leading-none" style={{ color: gc }}>
                            {grade.grade}<span className="text-[10px] font-normal opacity-50">/{grade.max_grade}</span>
                          </p>
                          <p className="text-[10px] font-bold mt-0.5" style={{ color: gc }}>{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Teacher comments */}
            <Card>
              <CardHead icon={MessageSquare} title="Teacher Comments" count={teacherComments.length} color="#7c3aed" />
              {teacherComments.length === 0 ? (
                <EmptyState icon={MessageSquare} message="No comments for this day" />
              ) : (
                <div className="p-4 space-y-3">
                  {teacherComments.map(comment => {
                    const cfg         = COMMENT_CFG[comment.comment_type] || COMMENT_CFG.neutral;
                    const teacherName = comment.teachers?.full_name || 'Teacher';
                    const subject     = comment.teachers?.subjects?.[0] || '';
                    return (
                      <div key={comment.id} className="p-3.5 rounded-xl border"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: cfg.color }}>
                            {teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 leading-none truncate">{teacherName}</p>
                            {subject && <p className="text-[10px] text-gray-400 leading-none mt-0.5">{subject}</p>}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{comment.comment}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHead icon={Zap} title="Quick Actions" color="#9ca3af" />
              <div className="p-4 grid grid-cols-2 gap-2.5">
                {[
                  { icon: LayoutDashboard, label: 'Overview',     page: 'home',            color: theme.color },
                  { icon: TrendingUp,      label: 'Grades',       page: 'parent-grades',   color: '#8b5cf6'  },
                  { icon: Calendar,        label: 'Calendar',     page: 'parent-calendar', color: '#0ea5e9'  },
                  { icon: ClipboardList,   label: 'All Homework', page: 'parent-homework', color: '#f97316'  },
                ].map(({ icon: Icon, label, page, color }) => (
                  <button key={page}
                    onClick={() => setCurrentPage?.(page)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm transition-all group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 group-hover:text-gray-800 transition-colors text-center leading-tight">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* ══ TERM FOOTER ═══════════════════════════════════════════════════════ */}
      {theme.hasActiveTerm && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={theme.textStyle} />
            <span className="text-xs font-semibold" style={theme.textStyle}>
              {theme.name} Term {theme.activeTerm?.academic_year}
            </span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(theme.activeTerm?.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm?.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: theme.withAlpha(0.2) }}>
              <div className="h-1.5 rounded-full" style={{ width: `${theme.progress}%`, backgroundColor: theme.color }} />
            </div>
            <span className="text-[10px] font-medium" style={theme.textStyle}>{theme.daysRemaining}d left</span>
          </div>
        </div>
      )}

    </div>
  );
};

export default ParentDailyViewPage;
