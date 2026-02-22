import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, Calendar, Clock, BookOpen, CheckCircle, XCircle, AlertTriangle,
  Snowflake, Flower2, Sun, ClipboardList, BarChart3, ArrowRight, UserCheck,
  AlertCircle, Award, Users
} from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import useActiveTerm from '../../../shared/hooks/useActiveTerm';
import { getCambridgeGrade, isPrimaryClass } from '../../../core/utils/cambridgeGrading';

// ═══════════════════════════════════════════════════════════
// SHARED PARENT DESIGN TOKENS — reuse across all parent pages
// ═══════════════════════════════════════════════════════════

const TERM_CONFIG = {
  1: { name: 'Winter', icon: Snowflake, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  2: { name: 'Spring', icon: Flower2, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  3: { name: 'Summer', icon: Sun, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

// Shared child selector for parent pages
const ChildSelector = ({ children, selectedChild, setSelectedChild, compact = false }) => {
  if (children.length <= 1) return null;
  return (
    <div className="relative">
      <select value={selectedChild?.id || ''}
        onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
        className={`appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer ${compact ? 'px-3 py-1.5 pr-8' : 'px-4 py-2.5 pr-10'}`}>
        {children.map(c => (
          <option key={c.id} value={c.id} className="text-gray-900">{c.name} — {c.class_name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PARENT DASHBOARD
// ═══════════════════════════════════════════════════════════

const ParentDashboard = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm } = useActiveTerm();

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const [attendanceStats, setAttendanceStats] = useState(null);
  const [recentGrades, setRecentGrades] = useState([]);
  const [overallGrade, setOverallGrade] = useState(null);
  const [homeworkStats, setHomeworkStats] = useState(null);
  const [urgentItems, setUrgentItems] = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);

  const today = new Date().toISOString().split('T')[0];
  const termConfig = activeTerm ? TERM_CONFIG[activeTerm.term_number] : null;
  const TermIcon = termConfig?.icon || Calendar;

  // ─── LOAD CHILDREN ───────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!supabase) return;
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
        if (!parent) return;
        const { data: links } = await supabase.from('student_parents').select('students(*)').eq('parent_id', parent.id);
        const list = links?.map(l => l.students).filter(Boolean) || [];
        setChildren(list);
        if (list.length > 0) setSelectedChild(list[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [supabase]);

  // ─── LOAD DATA FOR CHILD ─────────────────────────────
  const loadData = useCallback(async () => {
    if (!supabase || !selectedChild) return;
    setDataLoading(true);

    try {
      const childId = selectedChild.id;
      const className = selectedChild.class_name;
      const termStart = activeTerm?.start_date || '2026-01-01';
      const termEnd = activeTerm?.end_date || '2026-12-31';
      const termNum = activeTerm?.term_number || null;
      const primary = isPrimaryClass(className);

      // ── ATTENDANCE ──
      const { data: att } = await supabase.from('attendance').select('status')
        .eq('student_id', childId).gte('date_key', termStart).lte('date_key', termEnd);
      const attTotal = att?.length || 0;
      const attPresent = att?.filter(a => a.status === 'present').length || 0;
      const attLate = att?.filter(a => a.status === 'late').length || 0;
      const attAbsent = att?.filter(a => a.status === 'absent').length || 0;
      const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;
      setAttendanceStats({ total: attTotal, present: attPresent, late: attLate, absent: attAbsent, rate: attRate });

      // ── GRADES → Cambridge ──
      let allGrades = [];
      if (termNum) {
        const { data: tg } = await supabase.from('grades').select('*').eq('student_id', childId).eq('term_number', termNum).order('date', { ascending: false });
        const { data: lg } = await supabase.from('grades').select('*').eq('student_id', childId).is('term_number', null).gte('date', termStart).lte('date', termEnd).order('date', { ascending: false });
        allGrades = [...(tg || []), ...(lg || [])];
      } else {
        const { data: g } = await supabase.from('grades').select('*').eq('student_id', childId).order('date', { ascending: false });
        allGrades = g || [];
      }

      const enriched = allGrades.map(g => {
        const pct = Math.round((g.grade / g.max_grade) * 100);
        const cambridge = getCambridgeGrade(pct, className);
        return { ...g, percentage: pct, cambridge };
      });
      setRecentGrades(enriched.slice(0, 6));

      if (enriched.length > 0) {
        const avgPct = Math.round(enriched.reduce((s, g) => s + g.percentage, 0) / enriched.length);
        setOverallGrade(getCambridgeGrade(avgPct, className));
      } else {
        setOverallGrade(null);
      }

      // ── HOMEWORK (student_homework) ──
      let hwQuery = supabase.from('homework').select('id, title, subject, due_date').eq('class_name', className);
      if (termNum) hwQuery = hwQuery.eq('term_number', termNum);
      const { data: hw } = await hwQuery;
      const hwIds = (hw || []).map(h => h.id);

      let hwDone = 0, hwPartial = 0, hwNotDone = 0, hwOverdue = 0;
      if (hwIds.length > 0) {
        const { data: sh } = await supabase.from('student_homework').select('homework_id, status').eq('student_id', childId).in('homework_id', hwIds);
        const statusMap = {};
        (sh || []).forEach(s => { statusMap[s.homework_id] = s.status; });
        (hw || []).forEach(h => {
          const st = statusMap[h.id] || 'not_done';
          if (st === 'done') hwDone++;
          else if (st === 'partially_done') hwPartial++;
          else { hwNotDone++; if (h.due_date < today) hwOverdue++; }
        });
      }
      const hwTotal = hwIds.length;
      const hwRate = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : null;
      setHomeworkStats({ total: hwTotal, done: hwDone, partial: hwPartial, notDone: hwNotDone, overdue: hwOverdue, rate: hwRate });

      // ── URGENT ITEMS ──
      const urgent = [];
      if (hwOverdue > 0) urgent.push({ severity: 'high', icon: XCircle, message: `${hwOverdue} overdue homework assignment${hwOverdue > 1 ? 's' : ''}` });
      if (attRate !== null && attRate < 85) urgent.push({ severity: 'high', icon: AlertTriangle, message: `Attendance at ${attRate}% — below 85% threshold` });
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: weekAtt } = await supabase.from('attendance').select('status').eq('student_id', childId).gte('date_key', weekAgo);
      const weekLate = weekAtt?.filter(a => a.status === 'late').length || 0;
      const weekAbsent = weekAtt?.filter(a => a.status === 'absent').length || 0;
      if (weekLate >= 2) urgent.push({ severity: 'medium', icon: Clock, message: `Late ${weekLate} times this week` });
      if (weekAbsent >= 2) urgent.push({ severity: 'high', icon: AlertCircle, message: `Absent ${weekAbsent} days this week` });
      const lowGrades = enriched.filter(g => g.cambridge.band !== null ? g.cambridge.band <= 2 : g.percentage < 40);
      if (lowGrades.length > 0) urgent.push({ severity: 'medium', icon: BarChart3, message: `${lowGrades.length} assessment${lowGrades.length > 1 ? 's' : ''} at Band 2 or below` });
      setUrgentItems(urgent);

      // ── UPCOMING TESTS ──
      const { data: tests } = await supabase.from('scheduled_tests').select('*').eq('class_name', className).gte('test_date', today).order('test_date').limit(5);
      setUpcomingTests(tests || []);

      // ── UPCOMING EVENTS ──
      const { data: events } = await supabase.from('school_events').select('*').gte('start_date', today).order('start_date').limit(6);
      const relevant = (events || []).filter(e => {
        const affected = Array.isArray(e.affects_classes) ? e.affects_classes : JSON.parse(e.affects_classes || '["All"]');
        return affected.includes('All') || affected.includes(className);
      });
      setUpcomingEvents(relevant.slice(0, 4));

      // ── TODAY ──
      const { data: cls } = await supabase.from('classes').select('subject, time, title').eq('date_key', today).eq('class_name', className).order('time');
      setTodayClasses(cls || []);
    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setDataLoading(false); }
  }, [supabase, selectedChild, activeTerm, today]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── HELPERS ───────────────────────────────────────────
  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };
  const nav = (page) => setCurrentPage && setCurrentPage(page);
  const primary = isPrimaryClass(selectedChild?.class_name);

  // ─── LOADING ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg font-medium">No children linked to your account</p>
        <p className="text-gray-400 text-sm mt-2">Please contact the school administration.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-emerald-100 text-sm">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Parent Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              {activeTerm && termConfig && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{termConfig.name} Term</span>
                </div>
              )}
              <ChildSelector children={children} selectedChild={selectedChild} setSelectedChild={setSelectedChild} />
            </div>
          </div>

          {/* Child info */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold">{selectedChild?.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base md:text-lg truncate">{selectedChild?.name}</p>
              <p className="text-emerald-100 text-sm">Class {selectedChild?.class_name} · {primary ? 'Cambridge Primary' : 'Cambridge IGCSE'}</p>
            </div>
            {activeTerm && termConfig && (
              <div className="hidden md:block text-right">
                <p className="text-2xl font-bold">
                  {Math.max(0, Math.ceil((new Date(activeTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}
                </p>
                <p className="text-emerald-100 text-xs">days left in term</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {dataLoading && (
        <div className="flex justify-center py-2"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      )}

      {/* ═══ STAT CARDS — colorful gradients ═════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-100 text-xs font-medium">Attendance</p>
            <UserCheck size={16} className="text-blue-200" />
          </div>
          <p className="text-3xl font-bold">{attendanceStats?.rate != null ? `${attendanceStats.rate}%` : '—'}</p>
          <p className="text-blue-200 text-xs mt-1">
            {attendanceStats?.present || 0} present · {attendanceStats?.absent || 0} absent · {attendanceStats?.late || 0} late
          </p>
        </div>

        {/* Overall Grade */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-purple-100 text-xs font-medium">Overall Grade</p>
            <Award size={16} className="text-purple-200" />
          </div>
          {overallGrade ? (
            <>
              <p className="text-3xl font-bold">{overallGrade.display}</p>
              <p className="text-purple-200 text-xs mt-1">
                {recentGrades.length} assessment{recentGrades.length !== 1 ? 's' : ''} this term
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">—</p>
              <p className="text-purple-200 text-xs mt-1">No grades yet</p>
            </>
          )}
        </div>

        {/* Homework */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-orange-100 text-xs font-medium">Homework Done</p>
            <ClipboardList size={16} className="text-orange-200" />
          </div>
          <p className="text-3xl font-bold">{homeworkStats?.done || 0}<span className="text-lg font-normal text-orange-200">/{homeworkStats?.total || 0}</span></p>
          <p className="text-orange-200 text-xs mt-1">
            {homeworkStats?.overdue > 0
              ? <span className="text-yellow-200 font-semibold">{homeworkStats.overdue} overdue!</span>
              : `${homeworkStats?.partial || 0} partially done`}
          </p>
        </div>

        {/* Today */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-teal-100 text-xs font-medium">Today's Classes</p>
            <Calendar size={16} className="text-teal-200" />
          </div>
          <p className="text-3xl font-bold">{todayClasses.length}</p>
          <p className="text-teal-200 text-xs mt-1">
            {todayClasses.length === 0 ? 'No classes today' : todayClasses.map(c => c.subject).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
          </p>
        </div>
      </div>

      {/* ═══ ALERTS ══════════════════════════════════════ */}
      {urgentItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Needs Attention</h3>
          </div>
          <div className="space-y-2">
            {urgentItems.map((item, i) => {
              const I = item.icon;
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                  item.severity === 'high' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <I size={16} className="flex-shrink-0" />
                  <span>{item.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ MAIN 2-COL: Grades + Homework ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Recent Grades ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <BarChart3 size={16} className="text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Recent Grades</h3>
            </div>
            <button onClick={() => nav('parent-grades')} className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5 hover:underline">
              View All <ArrowRight size={12} />
            </button>
          </div>

          {recentGrades.length > 0 ? (
            <div className="space-y-2">
              {recentGrades.map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  {/* Cambridge badge */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: g.cambridge.color }}>
                    {g.cambridge.short}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{g.assessment_title}</p>
                    <p className="text-xs text-gray-500">
                      {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      {g.assessment_type && <span className="text-gray-400"> · {g.assessment_type}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: g.cambridge.color }}>{g.cambridge.display}</p>
                    <p className="text-[10px] text-gray-400">{g.grade}/{g.max_grade}</p>
                  </div>
                </div>
              ))}

              {/* Grade scale */}
              <div className="pt-3 mt-1 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 mb-1.5 font-medium">{primary ? 'Cambridge Primary Scale' : 'IGCSE Scale'}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {primary
                    ? [
                        { l: 'B6', c: '#059669' }, { l: 'B5', c: '#10b981' }, { l: 'B4', c: '#3b82f6' },
                        { l: 'B3', c: '#f59e0b' }, { l: 'B2', c: '#f97316' }, { l: 'B1', c: '#ef4444' }
                      ].map(b => <div key={b.l} className="w-7 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: b.c }}>{b.l}</div>)
                    : ['A*', 'A', 'B', 'C', 'D', 'E', 'F'].map(g => {
                        const c = getCambridgeGrade(g === 'A*' ? 95 : g === 'A' ? 85 : g === 'B' ? 75 : g === 'C' ? 65 : g === 'D' ? 55 : g === 'E' ? 45 : 35, 'Y7');
                        return <div key={g} className="w-7 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: c.color }}>{g}</div>;
                      })
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No grades recorded this term</p>
            </div>
          )}
        </div>

        {/* ── Homework ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <ClipboardList size={16} className="text-orange-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Homework</h3>
            </div>
            <button onClick={() => nav('parent-homework')} className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5 hover:underline">
              View All <ArrowRight size={12} />
            </button>
          </div>

          {homeworkStats && homeworkStats.total > 0 ? (
            <div className="space-y-4">
              {/* Stacked bar */}
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Completion</span>
                  <span>{homeworkStats.rate}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex">
                  {homeworkStats.done > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(homeworkStats.done / homeworkStats.total) * 100}%` }} />}
                  {homeworkStats.partial > 0 && <div className="bg-amber-400 transition-all" style={{ width: `${(homeworkStats.partial / homeworkStats.total) * 100}%` }} />}
                  {homeworkStats.notDone > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(homeworkStats.notDone / homeworkStats.total) * 100}%` }} />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle size={18} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-xl font-bold text-emerald-700">{homeworkStats.done}</p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Done</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <Clock size={18} className="mx-auto text-amber-500 mb-1" />
                  <p className="text-xl font-bold text-amber-700">{homeworkStats.partial}</p>
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">Partial</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <XCircle size={18} className="mx-auto text-red-500 mb-1" />
                  <p className="text-xl font-bold text-red-700">{homeworkStats.notDone}</p>
                  <p className="text-[10px] text-red-600 font-medium mt-0.5">Not Done</p>
                </div>
              </div>

              {homeworkStats.overdue > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700 font-medium">
                    {homeworkStats.overdue} assignment{homeworkStats.overdue > 1 ? 's' : ''} past due — please check with your child
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <ClipboardList size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No homework this term</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM ROW: Today + Tests + Events ══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Today's Classes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Calendar size={16} className="text-indigo-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Today's Classes</h3>
            </div>
            <button onClick={() => nav('parent-daily')} className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5 hover:underline">
              Details <ArrowRight size={12} />
            </button>
          </div>

          {todayClasses.length > 0 ? (
            <div className="space-y-2">
              {todayClasses.map((cls, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-12 text-center flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">{cls.time}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{cls.title || cls.subject}</p>
                    <p className="text-xs text-gray-500">{cls.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Clock size={28} className="mx-auto text-gray-300 mb-1.5" />
              <p className="text-xs text-gray-400">No classes today</p>
            </div>
          )}
        </div>

        {/* Upcoming Tests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <BookOpen size={16} className="text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Upcoming Tests</h3>
          </div>

          {upcomingTests.length > 0 ? (
            <div className="space-y-2">
              {upcomingTests.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-red-50 border border-red-200 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[8px] font-medium text-red-500 leading-none">
                      {new Date(t.test_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-red-700 leading-none">
                      {new Date(t.test_date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.subject}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                    daysUntil(t.test_date) === 'Today' ? 'bg-red-100 text-red-700' :
                    daysUntil(t.test_date) === 'Tomorrow' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{daysUntil(t.test_date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <BookOpen size={28} className="mx-auto text-gray-300 mb-1.5" />
              <p className="text-xs text-gray-400">No upcoming tests</p>
            </div>
          )}
        </div>

        {/* Events */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                <Calendar size={16} className="text-teal-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">School Events</h3>
            </div>
            <button onClick={() => nav('parent-calendar')} className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5 hover:underline">
              Calendar <ArrowRight size={12} />
            </button>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {upcomingEvents.map(e => (
                <div key={e.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border"
                    style={{ backgroundColor: (e.color || '#10b981') + '15', borderColor: (e.color || '#10b981') + '40' }}>
                    <span className="text-[8px] font-medium leading-none" style={{ color: e.color || '#10b981' }}>
                      {new Date(e.start_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-sm font-bold leading-none" style={{ color: e.color || '#10b981' }}>
                      {new Date(e.start_date + 'T00:00:00').getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                    <p className="text-xs text-gray-500">{e.event_type}{e.location ? ` · ${e.location}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                    {daysUntil(e.start_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Calendar size={28} className="mx-auto text-gray-300 mb-1.5" />
              <p className="text-xs text-gray-400">No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TERM FOOTER ═════════════════════════════════ */}
      {activeTerm && termConfig && (
        <div className={`${termConfig.bg} border ${termConfig.border} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} className={termConfig.text} />
            <span className={`text-xs font-semibold ${termConfig.text}`}>{termConfig.name} Term {activeTerm.academic_year}</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(activeTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(activeTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-white/60 rounded-full h-1.5 hidden sm:block">
              <div className={`bg-gradient-to-r ${termConfig.gradient} h-1.5 rounded-full`}
                style={{ width: `${Math.min(100, Math.max(0, ((new Date() - new Date(activeTerm.start_date)) / (new Date(activeTerm.end_date) - new Date(activeTerm.start_date))) * 100))}%` }} />
            </div>
            <span className={`text-[10px] font-medium ${termConfig.text}`}>
              {Math.max(0, Math.ceil((new Date(activeTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;