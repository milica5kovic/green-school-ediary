import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, AlertCircle, BookOpen,
  FileText, MessageSquare, Award, Users,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ════════════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════════════

const ATT = {
  present:  { label: 'Present',    Icon: CheckCircle,  color: '#10b981', bg: '#f0fdf4', border: '#86efac', badgeBg: '#dcfce7', badgeText: '#065f46' },
  late:     { label: 'Late',       Icon: Clock,        color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', badgeBg: '#fef3c7', badgeText: '#92400e' },
  absent:   { label: 'Absent',     Icon: XCircle,      color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', badgeBg: '#fee2e2', badgeText: '#991b1b' },
  sent_out: { label: 'Sent Out',   Icon: AlertCircle,  color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd', badgeBg: '#ede9fe', badgeText: '#4c1d95' },
  default:  { label: 'Not Marked', Icon: Clock,        color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', badgeBg: '#f3f4f6', badgeText: '#4b5563' },
};

const COMMENT_TYPE = {
  positive:        { label: 'Positive',     color: '#10b981', bg: '#f0fdf4', border: '#86efac', dot: '🟢' },
  neutral:         { label: 'Neutral',      color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', dot: '🔵' },
  needs_attention: { label: 'Needs Work',   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', dot: '🟡' },
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const SectionHeader = ({ icon: Icon, title, count, color }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}18` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <h3 className="font-bold text-gray-900 text-base leading-tight">{title}</h3>
      {count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: `${color}15`, color }}>
          {count}
        </span>
      )}
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <p className="text-center text-gray-400 text-sm py-6">{message}</p>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const ParentDailyViewPage = () => {
  const { supabase } = useApp();
  const theme = useTermTheme();
  const { selectedChild, loading: childLoading } = useParentChildrenCtx();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyClasses, setDailyClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [homeworkDueToday, setHomeworkDueToday] = useState([]);
  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState({});
  const [todayGrades, setTodayGrades] = useState([]);
  const [teacherComments, setTeacherComments] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

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
        supabase.from('classes')
          .select('*')
          .eq('date_key', dateKey)
          .eq('class_name', selectedChild.class_name)
          .order('time'),

        supabase.from('attendance')
          .select('*')
          .eq('date_key', dateKey)
          .eq('student_id', selectedChild.id),

        supabase.from('homework')
          .select('*')
          .eq('class_name', selectedChild.class_name)
          .eq('due_date', dateKey)
          .order('subject'),

        supabase.from('grades')
          .select('*')
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

      // Student homework completion status
      if (homeworkData?.length > 0) {
        const { data: studentHw } = await supabase
          .from('student_homework')
          .select('*')
          .eq('student_id', selectedChild.id)
          .in('homework_id', homeworkData.map(h => h.id));
        const statusMap = {};
        studentHw?.forEach(sh => { statusMap[sh.homework_id] = sh; });
        setStudentHomeworkStatus(statusMap);
      } else {
        setStudentHomeworkStatus({});
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const attList       = Object.values(attendanceRecords);
  const presentCount  = attList.filter(a => a.status === 'present').length;
  const lateCount     = attList.filter(a => a.status === 'late').length;
  const absentCount   = attList.filter(a => a.status === 'absent').length;

  const getHwStatus = (hwId) => {
    const s = studentHomeworkStatus[hwId];
    if (!s) return { text: 'Not Started', cls: 'bg-gray-100 text-gray-500' };
    switch (s.status) {
      case 'done':           return { text: '✓ Done',        cls: 'bg-green-100 text-green-700' };
      case 'partially_done': return { text: '◐ Partial',     cls: 'bg-orange-100 text-orange-700' };
      case 'not_done':       return { text: '○ Not Done',    cls: 'bg-red-100 text-red-700' };
      default:               return { text: 'Not Started',   cls: 'bg-gray-100 text-gray-500' };
    }
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

  // ── Loading / empty states ────────────────────────────────────────────────

  if (childLoading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: `${theme.color}30`, borderTopColor: theme.color }} />
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No children linked to your account</p>
        <p className="text-gray-400 text-sm mt-1">Please contact the school administrator</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ══ DATE NAVIGATION ════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Nav bar */}
        <div className="flex items-center gap-3 px-4 py-4"
          style={{ background: `linear-gradient(135deg, ${theme.color}10, ${theme.color}04)` }}>

          <button onClick={prevDay}
            className="p-2.5 rounded-xl hover:bg-white/70 transition-colors text-gray-500 flex-shrink-0">
            <ChevronLeft size={20} />
          </button>

          <div className="flex-1 text-center">
            <p className="font-bold text-gray-900 text-lg capitalize leading-tight">
              {formatDate(selectedDate)}
            </p>
            {isToday ? (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1"
                style={{ backgroundColor: theme.color, color: '#fff' }}>
                Today
              </span>
            ) : (
              <button onClick={() => setSelectedDate(new Date())}
                className="text-xs mt-1 underline underline-offset-2 transition-opacity hover:opacity-70"
                style={{ color: theme.color }}>
                Go to today
              </button>
            )}
          </div>

          <button onClick={nextDay}
            className="p-2.5 rounded-xl hover:bg-white/70 transition-colors text-gray-500 flex-shrink-0">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Quick stats */}
        {(dailyClasses.length > 0 || !dataLoading) && (
          <div className="grid grid-cols-4 gap-3 px-4 pb-4 pt-1">
            {[
              { label: 'Classes', value: dailyClasses.length, color: theme.color },
              { label: 'Present', value: presentCount,        color: '#10b981' },
              { label: 'Late',    value: lateCount,           color: '#f59e0b' },
              { label: 'Absent',  value: absentCount,         color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} className="text-center py-3 rounded-xl bg-gray-50">
                <p className="text-xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-1 leading-none">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Loading spinner for data ── */}
      {dataLoading ? (
        <div className="flex items-center justify-center py-10 gap-3">
          <div className="w-7 h-7 border-2 rounded-full animate-spin"
            style={{ borderColor: `${theme.color}30`, borderTopColor: theme.color }} />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      ) : (
        <>

          {/* ══ SECTION 1: RASPORED & PRISUSTVO ═══════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <SectionHeader
              icon={BookOpen}
              title="Schedule & Attendance"
              count={dailyClasses.length}
              color={theme.color}
            />

            {dailyClasses.length === 0 ? (
              <div className="text-center py-10">
                <Calendar size={36} className="mx-auto text-gray-200 mb-3" />
                <EmptyState message="No classes scheduled for this day" />
              </div>
            ) : (
              <div className="space-y-2">
                {dailyClasses.map((cls, idx) => {
                  const att = attendanceRecords[cls.class_id];
                  const cfg = ATT[att?.status] || ATT.default;
                  const AttIcon = cfg.Icon;

                  return (
                    <div key={cls.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl border transition-shadow hover:shadow-sm"
                      style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>

                      {/* Time */}
                      <div className="flex-shrink-0 w-12 pt-0.5 text-center">
                        <span className="text-xs font-bold text-gray-400 tracking-tight">
                          {cls.time || '—'}
                        </span>
                      </div>

                      {/* Timeline dot + connector */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: cfg.color }} />
                        {idx < dailyClasses.length - 1 && (
                          <div className="w-px flex-1 mt-1 min-h-[1.5rem]"
                            style={{ backgroundColor: `${cfg.color}40` }} />
                        )}
                      </div>

                      {/* Class info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {cls.subject}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                            style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeText }}>
                            <AttIcon size={11} />
                            {cfg.label}
                          </div>
                        </div>

                        {cls.title && cls.title !== cls.subject && (
                          <p className="text-xs text-gray-400 truncate">{cls.title}</p>
                        )}

                        {att?.comment && (
                          <p className="text-xs text-gray-600 mt-1.5 italic leading-snug">
                            "{att.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ SECTION 2: DOMAĆI & OCJENE ════════════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <SectionHeader
              icon={FileText}
              title="Homework & Grades"
              count={homeworkDueToday.length + todayGrades.length}
              color="#f59e0b"
            />

            {homeworkDueToday.length === 0 && todayGrades.length === 0 ? (
              <EmptyState message="No homework or grades for this day" />
            ) : (
              <div className="space-y-4">

                {/* Homework */}
                {homeworkDueToday.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                      Homework due ({homeworkDueToday.length})
                    </p>
                    <div className="space-y-2">
                      {homeworkDueToday.map(hw => {
                        const hwStatus = getHwStatus(hw.id);
                        return (
                          <div key={hw.id}
                            className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <FileText size={14} className="text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-amber-700 block leading-tight">
                                {hw.subject}
                              </span>
                              <p className="text-sm font-medium text-gray-800 truncate leading-snug">
                                {hw.title}
                              </p>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 whitespace-nowrap ${hwStatus.cls}`}>
                              {hwStatus.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grades */}
                {todayGrades.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                      Grades ({todayGrades.length})
                    </p>
                    <div className="space-y-2">
                      {todayGrades.map(grade => {
                        const pct = Math.round((grade.grade / grade.max_grade) * 100);
                        const gc  = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                        return (
                          <div key={grade.id}
                            className="flex items-center gap-3 p-3.5 rounded-xl bg-purple-50 border border-purple-200">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Award size={14} className="text-purple-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[11px] font-bold text-purple-700">{grade.subject}</span>
                                {grade.assessment_type && (
                                  <>
                                    <span className="text-gray-300 text-xs">·</span>
                                    <span className="text-[11px] text-gray-400">{grade.assessment_type}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-800 truncate leading-snug">
                                {grade.assessment_title}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold leading-none" style={{ color: gc }}>
                                {grade.grade}
                                <span className="text-xs text-gray-300 font-normal">/{grade.max_grade}</span>
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{pct}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ SECTION 3: KOMENTARI NASTAVNIKA ═══════════════════════════════ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <SectionHeader
              icon={MessageSquare}
              title="Teacher Comments"
              count={teacherComments.length}
              color="#8b5cf6"
            />

            {teacherComments.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare size={28} className="mx-auto text-gray-200 mb-2" />
                <EmptyState message="No teacher comments for this day" />
              </div>
            ) : (
              <div className="space-y-3">
                {teacherComments.map(comment => {
                  const typeCfg     = COMMENT_TYPE[comment.comment_type] || COMMENT_TYPE.neutral;
                  const teacherName = comment.teachers?.full_name || 'Teacher';
                  const subject     = comment.teachers?.subjects?.[0] || '';

                  return (
                    <div key={comment.id}
                      className="p-4 rounded-xl border"
                      style={{ backgroundColor: typeCfg.bg, borderColor: typeCfg.border }}>

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${typeCfg.color}20` }}>
                            <MessageSquare size={13} style={{ color: typeCfg.color }} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-bold text-gray-900 block leading-tight truncate">
                              {teacherName}
                            </span>
                            {subject && (
                              <span className="text-[11px] text-gray-400">{subject}</span>
                            )}
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: `${typeCfg.color}15`, color: typeCfg.color }}>
                          {typeCfg.dot} {typeCfg.label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed pl-9">
                        {comment.comment}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </>
      )}
    </div>
  );
};

export default ParentDailyViewPage;
