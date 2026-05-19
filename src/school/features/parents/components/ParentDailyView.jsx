import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, BookOpen,
  FileText, MessageSquare, Award, Users,
  Bell, LayoutDashboard, TrendingUp, ClipboardList,
  Zap,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════

const ATT = {
  present:  {
    label: 'Present',
    Icon: CheckCircle,
    color: '#059669', dot: '#22c55e',
    bg: '#f0fdf4', border: '#bbf7d0',
    badgeBg: '#dcfce7', badgeText: '#15803d',
  },
  late: {
    label: 'Late',
    Icon: Clock,
    color: '#d97706', dot: '#f59e0b',
    bg: '#fffbeb', border: '#fde68a',
    badgeBg: '#fef9c3', badgeText: '#a16207',
  },
  absent: {
    label: 'Absent',
    Icon: XCircle,
    color: '#dc2626', dot: '#f43f5e',
    bg: '#fff1f2', border: '#fecdd3',
    badgeBg: '#ffe4e6', badgeText: '#b91c1c',
  },
  sent_out: {
    label: 'Sent Out',
    Icon: AlertCircle,
    color: '#7c3aed', dot: '#8b5cf6',
    bg: '#faf5ff', border: '#ddd6fe',
    badgeBg: '#ede9fe', badgeText: '#6d28d9',
  },
  default: {
    label: 'Not Recorded',
    Icon: Clock,
    color: '#94a3b8', dot: '#cbd5e1',
    bg: '#f8fafc', border: '#e2e8f0',
    badgeBg: '#f1f5f9', badgeText: '#64748b',
  },
};

const COMMENT_CFG = {
  positive:        { label: 'Positive',   color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  neutral:         { label: 'Neutral',    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  needs_attention: { label: 'Needs Work', color: '#dc2626', bg: '#fff1f2', border: '#fecdd3' },
};

// ════════════════════════════════════════════════════════════════════════════
// MICRO COMPONENTS
// ════════════════════════════════════════════════════════════════════════════

const Card = ({ children, accent, style = {}, className = '' }) => (
  <div
    className={`bg-white rounded-2xl overflow-hidden ${className}`}
    style={{
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.07)',
      borderTop: accent ? `3px solid ${accent}` : undefined,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionHead = ({ icon: Icon, title, count, accent }) => (
  <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${accent}18` }}
    >
      <Icon size={15} style={{ color: accent }} />
    </div>
    <h3 className="font-bold text-gray-900 text-sm flex-1">{title}</h3>
    {count !== undefined && count > 0 && (
      <span
        className="px-2 py-0.5 rounded-full text-xs font-bold"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        {count}
      </span>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, message, accent }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: `${accent}10` }}
    >
      <Icon size={22} style={{ color: `${accent}70` }} />
    </div>
    <p className="text-gray-400 text-sm font-medium text-center max-w-[200px] leading-snug">
      {message}
    </p>
  </div>
);

const StatusPill = ({ status }) => {
  const cfg = ATT[status] || ATT.default;
  const AttIcon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 whitespace-nowrap"
      style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}
    >
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
  const { selectedChild, loading: childLoading } = useParentChildrenCtx();

  const [selectedDate, setSelectedDate]         = useState(new Date());
  const [dailyClasses, setDailyClasses]         = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [homeworkDueToday, setHomeworkDueToday] = useState([]);
  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState({});
  const [todayGrades, setTodayGrades]           = useState([]);
  const [teacherComments, setTeacherComments]   = useState([]);
  const [announcements, setAnnouncements]       = useState([]);
  const [dataLoading, setDataLoading]           = useState(false);

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
        supabase.from('classes').select('*')
          .eq('date_key', dateKey)
          .eq('class_name', selectedChild.class_name)
          .order('time'),
        supabase.from('attendance').select('*')
          .eq('date_key', dateKey)
          .eq('student_id', selectedChild.id),
        supabase.from('homework').select('*')
          .eq('class_name', selectedChild.class_name)
          .eq('due_date', dateKey)
          .order('subject'),
        supabase.from('grades').select('*')
          .eq('student_id', selectedChild.id)
          .eq('date', dateKey),
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

      // Homework completion status
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

      // Announcements (graceful — table may not exist)
      try {
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .lte('created_at', dateEnd)
          .order('created_at', { ascending: false })
          .limit(3);
        setAnnouncements(annData || []);
      } catch {
        setAnnouncements([]);
      }

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
    if (!s) return { text: 'Pending', style: { backgroundColor: '#f1f5f9', color: '#64748b' } };
    switch (s.status) {
      case 'done':           return { text: '✓ Submitted',   style: { backgroundColor: '#dcfce7', color: '#15803d' } };
      case 'partially_done': return { text: '◐ In Progress', style: { backgroundColor: '#fef9c3', color: '#a16207' } };
      case 'not_done':       return { text: '✗ Not Done',    style: { backgroundColor: '#ffe4e6', color: '#b91c1c' } };
      default:               return { text: 'Pending',       style: { backgroundColor: '#f1f5f9', color: '#64748b' } };
    }
  };

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };

  const formatDateFull = (d) => d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const initials = selectedChild
    ? selectedChild.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  const accent = theme.color || '#059669';

  // ── Guards ────────────────────────────────────────────────────────────────

  if (childLoading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: `${accent}30`, borderTopColor: accent }}
        />
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <Card className="p-12 text-center">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-semibold">No children linked to your account</p>
        <p className="text-gray-400 text-sm mt-1">Please contact the school administrator</p>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ══ DATE NAVIGATION ═════════════════════════════════════════════════ */}
      <Card>
        <div className="px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={prevDay}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="text-center">
            <p className="font-bold text-gray-900 text-sm capitalize">{formatDateFull(selectedDate)}</p>
            {isToday ? (
              <span
                className="inline-flex items-center gap-1.5 mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${accent}15`, color: accent }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
                Today
              </span>
            ) : (
              <button
                onClick={() => setSelectedDate(new Date())}
                className="mt-1 text-xs font-semibold transition-colors hover:opacity-70"
                style={{ color: accent }}
              >
                ← Back to today
              </button>
            )}
          </div>

          <button
            onClick={nextDay}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </Card>

      {/* ══ STUDENT OVERVIEW CARD ═══════════════════════════════════════════ */}
      <Card>
        {/* Gradient top stripe */}
        <div
          className="h-1.5"
          style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}60 100%)` }}
        />

        <div className="px-5 pt-5 pb-5">

          {/* Identity row */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                boxShadow: `0 4px 16px ${accent}40`,
              }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-[17px] leading-tight truncate">
                {selectedChild.name}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: `${accent}12`, color: accent }}
                >
                  {selectedChild.class_name}
                </span>
                {isToday && (
                  <span className="text-xs text-gray-400 font-medium">
                    {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Daily stats row */}
          <div className="grid grid-cols-4 gap-2.5 mt-4">
            {[
              { label: 'Classes',  value: dailyClasses.length, valueColor: '#334155', bg: '#f1f5f9' },
              { label: 'Present',  value: presentCount,        valueColor: '#15803d', bg: '#dcfce7' },
              { label: 'Late',     value: lateCount,           valueColor: '#a16207', bg: '#fef9c3' },
              { label: 'Absent',   value: absentCount,         valueColor: '#b91c1c', bg: '#ffe4e6' },
            ].map((stat, i) => (
              <div
                key={i}
                className="text-center py-3 rounded-xl"
                style={{ backgroundColor: stat.bg }}
              >
                <p className="text-xl font-bold leading-none" style={{ color: stat.valueColor }}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5 leading-none">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Loading spinner ── */}
      {dataLoading && (
        <div className="flex items-center justify-center py-10 gap-3">
          <div
            className="w-5 h-5 border-2 rounded-full animate-spin"
            style={{ borderColor: `${accent}30`, borderTopColor: accent }}
          />
          <span className="text-gray-400 text-sm font-medium">Loading day data…</span>
        </div>
      )}

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      {!dataLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* ═══ LEFT: SCHEDULE TIMELINE ════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-4">

            {/* ── Schedule & Attendance ── */}
            <Card accent={accent}>
              <SectionHead
                icon={BookOpen}
                title="Today's Schedule"
                count={dailyClasses.length}
                accent={accent}
              />

              {dailyClasses.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  message="No classes scheduled for this day"
                  accent={accent}
                />
              ) : (
                <div className="px-5 py-4">
                  {/* Timeline wrapper */}
                  <div className="relative">
                    {/* Vertical connector line */}
                    {dailyClasses.length > 1 && (
                      <div
                        className="absolute top-6 bottom-6 w-px"
                        style={{ left: '62px', backgroundColor: '#e2e8f0' }}
                      />
                    )}

                    <div className="space-y-3">
                      {dailyClasses.map((cls) => {
                        const att     = attendanceRecords[cls.class_id];
                        const cfg     = ATT[att?.status] || ATT.default;

                        return (
                          <div key={cls.id} className="flex items-start gap-3">

                            {/* Time label */}
                            <div className="w-12 flex-shrink-0 text-right pt-3">
                              <span className="text-[11px] font-bold text-gray-400 tabular-nums leading-none">
                                {cls.time || '—'}
                              </span>
                            </div>

                            {/* Timeline dot */}
                            <div className="flex-shrink-0 pt-2.5 z-10">
                              <div
                                className="w-4 h-4 rounded-full border-2 border-white"
                                style={{
                                  backgroundColor: cfg.dot,
                                  boxShadow: `0 0 0 2px ${cfg.dot}30`,
                                }}
                              />
                            </div>

                            {/* Class card */}
                            <div
                              className="flex-1 min-w-0 rounded-xl border p-3.5 transition-all hover:shadow-sm"
                              style={{
                                backgroundColor: cfg.bg,
                                borderColor: cfg.border,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                                    {cls.subject}
                                  </p>
                                  {cls.title && cls.title !== cls.subject && (
                                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                                      {cls.title}
                                    </p>
                                  )}
                                </div>
                                <StatusPill status={att?.status} />
                              </div>

                              {att?.comment && (
                                <div
                                  className="mt-2.5 pt-2.5 border-t flex items-start gap-1.5"
                                  style={{ borderColor: `${cfg.dot}25` }}
                                >
                                  <MessageSquare
                                    size={11}
                                    style={{ color: cfg.color }}
                                    className="flex-shrink-0 mt-0.5"
                                  />
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

            {/* ── Announcements (shown only if data exists) ── */}
            {announcements.length > 0 && (
              <Card accent="#0ea5e9">
                <SectionHead
                  icon={Bell}
                  title="School Announcements"
                  count={announcements.length}
                  accent="#0ea5e9"
                />
                <div className="p-4 space-y-3">
                  {announcements.map(ann => (
                    <div
                      key={ann.id}
                      className="p-3.5 rounded-xl bg-sky-50 border border-sky-100"
                    >
                      <p className="font-semibold text-gray-900 text-sm leading-snug">
                        {ann.title}
                      </p>
                      {ann.content && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {ann.content}
                        </p>
                      )}
                      {ann.created_at && (
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">
                          {new Date(ann.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short',
                          })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

          </div>

          {/* ═══ RIGHT: HOMEWORK · GRADES · COMMENTS · ACTIONS ══════════════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── Homework due ── */}
            <Card accent="#f59e0b">
              <SectionHead
                icon={ClipboardList}
                title="Homework Due"
                count={homeworkDueToday.length}
                accent="#f59e0b"
              />
              {homeworkDueToday.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  message="No homework due today"
                  accent="#f59e0b"
                />
              ) : (
                <div className="p-4 space-y-2.5">
                  {homeworkDueToday.map(hw => {
                    const hwStatus = getHwStatus(hw.id);
                    return (
                      <div
                        key={hw.id}
                        className="rounded-xl border border-amber-100 bg-amber-50 p-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                            {hw.subject}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={hwStatus.style}
                          >
                            {hwStatus.text}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug">
                          {hw.title}
                        </p>
                        {hw.description && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                            {hw.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ── Today's grades (shown only if data exists) ── */}
            {todayGrades.length > 0 && (
              <Card accent="#8b5cf6">
                <SectionHead
                  icon={Award}
                  title="Today's Grades"
                  count={todayGrades.length}
                  accent="#8b5cf6"
                />
                <div className="p-4 space-y-2.5">
                  {todayGrades.map(grade => {
                    const pct = Math.round((grade.grade / grade.max_grade) * 100);
                    const gc  = pct >= 80 ? '#15803d' : pct >= 60 ? '#a16207' : '#b91c1c';
                    const gbg = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef9c3' : '#ffe4e6';
                    return (
                      <div
                        key={grade.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-violet-50 border border-violet-100"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide block">
                            {grade.subject}
                            {grade.assessment_type && (
                              <span className="font-normal text-gray-400 normal-case tracking-normal ml-1">
                                · {grade.assessment_type}
                              </span>
                            )}
                          </span>
                          <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">
                            {grade.assessment_title}
                          </p>
                        </div>
                        <div
                          className="text-center px-3 py-2 rounded-xl flex-shrink-0"
                          style={{ backgroundColor: gbg }}
                        >
                          <p className="text-base font-bold leading-none" style={{ color: gc }}>
                            {grade.grade}
                            <span className="text-[10px] font-normal opacity-50">/{grade.max_grade}</span>
                          </p>
                          <p className="text-[10px] font-bold mt-0.5" style={{ color: gc }}>
                            {pct}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── Teacher comments ── */}
            <Card accent="#7c3aed">
              <SectionHead
                icon={MessageSquare}
                title="Teacher Comments"
                count={teacherComments.length}
                accent="#7c3aed"
              />
              {teacherComments.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  message="No comments for this day"
                  accent="#7c3aed"
                />
              ) : (
                <div className="p-4 space-y-3">
                  {teacherComments.map(comment => {
                    const cfg         = COMMENT_CFG[comment.comment_type] || COMMENT_CFG.neutral;
                    const teacherName = comment.teachers?.full_name || 'Teacher';
                    const subject     = comment.teachers?.subjects?.[0] || '';
                    return (
                      <div
                        key={comment.id}
                        className="p-3.5 rounded-xl border"
                        style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
                      >
                        {/* Teacher row */}
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          >
                            {teacherName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 leading-none truncate">
                              {teacherName}
                            </p>
                            {subject && (
                              <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                                {subject}
                              </p>
                            )}
                          </div>
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
                          >
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

            {/* ── Quick Actions ── */}
            <Card accent="#94a3b8">
              <SectionHead icon={Zap} title="Quick Actions" accent="#94a3b8" />
              <div className="p-4 grid grid-cols-2 gap-2.5">
                {[
                  { icon: LayoutDashboard, label: 'Overview',    page: 'home',            color: accent },
                  { icon: TrendingUp,      label: 'Grades',      page: 'parent-grades',   color: '#8b5cf6' },
                  { icon: Calendar,        label: 'Calendar',    page: 'parent-calendar', color: '#0ea5e9' },
                  { icon: ClipboardList,   label: 'All Homework',page: 'parent-homework', color: '#f59e0b' },
                ].map(({ icon: Icon, label, page, color }) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage?.(page)}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-white transition-all group"
                    style={{ boxShadow: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${color}12` }}
                    >
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

    </div>
  );
};

export default ParentDailyViewPage;
