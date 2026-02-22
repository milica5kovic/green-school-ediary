import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, ArrowLeft, ClipboardList, CheckCircle, Clock, XCircle,
  AlertTriangle, Snowflake, Flower2, Sun, Calendar, BookOpen, Filter
} from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import useActiveTerm from '../../../shared/hooks/useActiveTerm';

// ═══════════════════════════════════════════════════════════════
// SHARED PARENT DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════

const TERM_CONFIG = {
  1: { name: 'Winter', icon: Snowflake, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  2: { name: 'Spring', icon: Flower2, gradient: 'from-pink-500 to-rose-600', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  3: { name: 'Summer', icon: Sun, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

const ChildSelector = ({ children, selectedChild, setSelectedChild }) => {
  if (children.length <= 1) return null;
  return (
    <div className="relative">
      <select value={selectedChild?.id || ''}
        onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
        className="appearance-none bg-white/20 backdrop-blur border border-white/30 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer px-4 py-2.5 pr-10">
        {children.map(c => (
          <option key={c.id} value={c.id} className="text-gray-900">{c.name} — {c.class_name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
    </div>
  );
};

const STATUS_CONFIG = {
  done: { label: 'Done', icon: CheckCircle, color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  partially_done: { label: 'Partial', icon: Clock, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  not_done: { label: 'Not Done', icon: XCircle, color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
};

// ═══════════════════════════════════════════════════════════════
// PARENT HOMEWORK PAGE
// ═══════════════════════════════════════════════════════════════

const ParentHomeworkPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm, terms } = useActiveTerm();

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const today = new Date().toISOString().split('T')[0];

  // ─── Load children ─────────────────────────────────────────
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

  useEffect(() => {
    if (activeTerm && !selectedTerm) setSelectedTerm(activeTerm);
  }, [activeTerm, selectedTerm]);

  // ─── Load homework ─────────────────────────────────────────
  const loadHomework = useCallback(async () => {
    if (!supabase || !selectedChild || !selectedTerm) return;
    try {
      const className = selectedChild.class_name;
      const childId = selectedChild.id;
      const termNum = selectedTerm.term_number;

      // Fetch homework for this class and term
      let query = supabase.from('homework').select('*').eq('class_name', className);
      query = query.eq('term_number', termNum);
      const { data: hw } = await query.order('due_date', { ascending: false });

      if (!hw || hw.length === 0) { setHomework([]); return; }

      // Fetch student's completion status
      const hwIds = hw.map(h => h.id);
      const { data: sh } = await supabase.from('student_homework')
        .select('homework_id, status')
        .eq('student_id', childId)
        .in('homework_id', hwIds);

      const statusMap = {};
      (sh || []).forEach(s => { statusMap[s.homework_id] = s.status; });

      const enriched = hw.map(h => {
        const status = statusMap[h.id] || 'not_done';
        const overdue = status !== 'done' && h.due_date < today;
        return { ...h, status, overdue };
      });

      setHomework(enriched);
    } catch (err) { console.error('Load homework error:', err); }
  }, [supabase, selectedChild, selectedTerm, today]);

  useEffect(() => { loadHomework(); }, [loadHomework]);

  // ─── Derived data ──────────────────────────────────────────
  const stats = useMemo(() => {
    const total = homework.length;
    const done = homework.filter(h => h.status === 'done').length;
    const partial = homework.filter(h => h.status === 'partially_done').length;
    const notDone = homework.filter(h => h.status === 'not_done').length;
    const overdue = homework.filter(h => h.overdue).length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, partial, notDone, overdue, rate };
  }, [homework]);

  const subjects = useMemo(() => {
    const set = new Set(homework.map(h => h.subject));
    return ['all', ...Array.from(set).sort()];
  }, [homework]);

  const filteredHomework = useMemo(() => {
    let list = homework;
    if (statusFilter === 'overdue') list = list.filter(h => h.overdue);
    else if (statusFilter !== 'all') list = list.filter(h => h.status === statusFilter);
    if (subjectFilter !== 'all') list = list.filter(h => h.subject === subjectFilter);
    return list;
  }, [homework, statusFilter, subjectFilter]);

  const termConfig = selectedTerm ? TERM_CONFIG[selectedTerm.term_number] : null;
  const TermIcon = termConfig?.icon || Calendar;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentPage && setCurrentPage('parent-dashboard')}
                className="bg-white/15 hover:bg-white/25 backdrop-blur p-2 rounded-lg transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-emerald-100 text-sm">Homework Tracker</p>
                <h1 className="text-2xl md:text-3xl font-bold">All Homework</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedTerm && termConfig && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{termConfig.name} Term</span>
                </div>
              )}
              <ChildSelector children={children} selectedChild={selectedChild} setSelectedChild={setSelectedChild} />
            </div>
          </div>

          {/* Stats in header */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: ClipboardList },
              { label: 'Done', value: stats.done, icon: CheckCircle },
              { label: 'Partial', value: stats.partial, icon: Clock },
              { label: 'Not Done', value: stats.notDone, icon: XCircle },
              { label: 'Rate', value: `${stats.rate}%`, icon: BookOpen },
            ].map(s => {
              const I = s.icon;
              return (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-center">
                  <I size={14} className="mx-auto text-white/60 mb-1" />
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[10px] text-emerald-100">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ TERM TABS ════════════════════════════════════════ */}
      {terms && terms.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {terms.map(t => {
            const tc = TERM_CONFIG[t.term_number];
            const TI = tc?.icon || Calendar;
            const active = selectedTerm?.id === t.id;
            return (
              <button key={t.id}
                onClick={() => { setSelectedTerm(t); setStatusFilter('all'); setSubjectFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? `bg-gradient-to-r ${tc?.gradient || ''} text-white shadow-md`
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                <TI size={14} />
                {tc?.name || `Term ${t.term_number}`}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ FILTERS ══════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {/* Status filters */}
        {[
          { key: 'all', label: 'All', count: stats.total },
          { key: 'done', label: 'Done', count: stats.done },
          { key: 'partially_done', label: 'Partial', count: stats.partial },
          { key: 'not_done', label: 'Not Done', count: stats.notDone },
          { key: 'overdue', label: 'Overdue', count: stats.overdue },
        ].map(f => (
          <button key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === f.key
                ? f.key === 'overdue'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label} <span className="opacity-70">({f.count})</span>
          </button>
        ))}

        {/* Subject divider */}
        {subjects.length > 2 && <div className="w-px bg-gray-200 mx-1" />}

        {/* Subject filters */}
        {subjects.length > 2 && subjects.map(s => (
          <button key={s}
            onClick={() => setSubjectFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              subjectFilter === s
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All Subjects' : s}
          </button>
        ))}
      </div>

      {/* ═══ OVERDUE ALERT ════════════════════════════════════ */}
      {stats.overdue > 0 && statusFilter === 'all' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 font-medium">
            {stats.overdue} assignment{stats.overdue > 1 ? 's' : ''} overdue — please check with your child
          </span>
          <button onClick={() => setStatusFilter('overdue')}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800">
            Show overdue →
          </button>
        </div>
      )}

      {/* ═══ HOMEWORK LIST ════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <ClipboardList size={16} className="text-orange-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Assignments</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredHomework.length}
            </span>
          </div>

          {/* Completion bar */}
          {homework.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {stats.done > 0 && <div className="bg-emerald-500" style={{ width: `${(stats.done / stats.total) * 100}%` }} />}
                {stats.partial > 0 && <div className="bg-amber-400" style={{ width: `${(stats.partial / stats.total) * 100}%` }} />}
                {stats.notDone > 0 && <div className="bg-red-400" style={{ width: `${(stats.notDone / stats.total) * 100}%` }} />}
              </div>
              <span className="text-xs font-semibold text-gray-500">{stats.rate}%</span>
            </div>
          )}
        </div>

        {filteredHomework.length > 0 ? (
          <div className="space-y-2">
            {filteredHomework.map(h => {
              const sc = STATUS_CONFIG[h.status] || STATUS_CONFIG.not_done;
              const StatusIcon = sc.icon;
              return (
                <div key={h.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  h.overdue ? 'bg-red-50/50 border-red-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}>
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.bg} ${sc.border} border`}>
                    <StatusIcon size={18} className={sc.text} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-800 truncate">{h.title}</p>
                      {h.overdue && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{h.subject} · {selectedChild?.class_name}</p>
                    {h.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{h.description}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${sc.badge}`}>
                      {sc.label}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Due {new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    {h.assigned_date && (
                      <p className="text-[10px] text-gray-300">
                        Set {new Date(h.assigned_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <ClipboardList size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No homework found</p>
            <p className="text-xs text-gray-400 mt-1">
              {statusFilter !== 'all'
                ? 'Try changing the filter above'
                : 'Homework will appear here as teachers assign it'}
            </p>
          </div>
        )}
      </div>

      {/* ═══ TERM FOOTER ══════════════════════════════════════ */}
      {selectedTerm && termConfig && (
        <div className={`${termConfig.bg} border ${termConfig.border} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} className={termConfig.text} />
            <span className={`text-xs font-semibold ${termConfig.text}`}>{termConfig.name} Term {selectedTerm.academic_year}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-white/60 rounded-full h-1.5 hidden sm:block">
              <div className={`bg-gradient-to-r ${termConfig.gradient} h-1.5 rounded-full`}
                style={{ width: `${Math.min(100, Math.max(0, ((new Date() - new Date(selectedTerm.start_date)) / (new Date(selectedTerm.end_date) - new Date(selectedTerm.start_date))) * 100))}%` }} />
            </div>
            <span className={`text-[10px] font-medium ${termConfig.text}`}>
              {Math.max(0, Math.ceil((new Date(selectedTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentHomeworkPage;