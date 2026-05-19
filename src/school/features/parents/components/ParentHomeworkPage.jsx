import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, ArrowLeft, ClipboardList, CheckCircle, Clock, XCircle,
  AlertTriangle, BookOpen
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';
const HEADER_SHADOW = '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)';

const SectionLabel = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${className}`}>{children}</p>
);

// ═══════════════════════════════════════════════════════════════
// PARENT HOMEWORK PAGE - Uses useTermTheme for dynamic colors
// ═══════════════════════════════════════════════════════════════

const ChildSelector = ({ children, selectedChild, setSelectedChild }) => {
  if (children.length <= 1) return null;
  return (
    <div className="relative">
      <select value={selectedChild?.id || ''}
        onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
        className="appearance-none bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer px-4 py-2.5 pr-10">
        {children.map(c => (
          <option key={c.id} value={c.id} className="text-slate-900">{c.name} — {c.class_name}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" size={14} />
    </div>
  );
};

const STATUS_CONFIG = {
  done:           { label: 'Done',     Icon: CheckCircle, cardBg: '#f0fdf4', cardBorder: '#bbf7d0', iconBg: '#dcfce7', iconColor: '#16a34a', badgeBg: '#dcfce7', badgeText: '#15803d' },
  partially_done: { label: 'Partial',  Icon: Clock,       cardBg: '#fefce8', cardBorder: '#fde68a', iconBg: '#fef9c3', iconColor: '#ca8a04', badgeBg: '#fef9c3', badgeText: '#a16207' },
  not_done:       { label: 'Not Done', Icon: XCircle,     cardBg: '#fff1f2', cardBorder: '#fecdd3', iconBg: '#fee2e2', iconColor: '#dc2626', badgeBg: '#fee2e2', badgeText: '#b91c1c' },
};

const ParentHomeworkPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm, terms } = useActiveTerm();
  const branding = useBranding();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const getTermInfo = (termNumber) => {
    const colorKey = `term${termNumber}Color`;
    const nameKey = `term${termNumber}Name`;
    const color = branding[colorKey] || ['#3b82f6', '#ec4899', '#f59e0b'][termNumber - 1];
    const name = branding[nameKey] || ['Winter', 'Spring', 'Summer'][termNumber - 1];
    return { color, name };
  };

  const { children, selectedChild, setSelectedChild, loading } = useParentChildrenCtx();
  const [homework, setHomework] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const today = new Date().toISOString().split('T')[0];

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

      let query = supabase.from('homework').select('*').eq('class_name', className);
      query = query.eq('term_number', termNum);
      const { data: hw } = await query.order('due_date', { ascending: false });

      if (!hw || hw.length === 0) { setHomework([]); return; }

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

  const selectedTermInfo = selectedTerm ? getTermInfo(selectedTerm.term_number) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 rounded-full animate-spin"
          style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ ...theme.gradientStyle, boxShadow: HEADER_SHADOW }}>
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[.06] pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 w-56 h-56 rounded-full bg-black/[.04] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setCurrentPage && setCurrentPage('home')}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-sm p-2 rounded-xl transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Homework Tracker</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">All Homework</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/[.12] backdrop-blur-sm px-3 py-1.5 rounded-lg items-center gap-1.5 border border-white/[.12]">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              <ChildSelector children={children} selectedChild={selectedChild} setSelectedChild={setSelectedChild} />
            </div>
          </div>

          {/* Stats tiles */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: stats.total, Icon: ClipboardList },
              { label: 'Done', value: stats.done, Icon: CheckCircle },
              { label: 'Partial', value: stats.partial, Icon: Clock },
              { label: 'Not Done', value: stats.notDone, Icon: XCircle },
              { label: 'Rate', value: `${stats.rate}%`, Icon: BookOpen },
            ].map(s => (
              <div key={s.label} className="bg-white/[.10] backdrop-blur-sm rounded-xl p-3 border border-white/[.12] text-center">
                <s.Icon size={14} className="mx-auto text-white/60 mb-1" />
                <p className="text-xl font-bold tracking-tight">{s.value}</p>
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TERM TABS ════════════════════════════════════════ */}
      {terms && terms.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {terms.map(t => {
            const termInfo = getTermInfo(t.term_number);
            const active = selectedTerm?.id === t.id;
            return (
              <button key={t.id}
                onClick={() => { setSelectedTerm(t); setStatusFilter('all'); setSubjectFilter('all'); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                style={active ? {
                  background: `linear-gradient(135deg, ${termInfo.color} 0%, ${termInfo.color}dd 100%)`,
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(15,23,42,.12)'
                } : {
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  color: '#475569',
                  boxShadow: CARD_SHADOW
                }}>
                {termInfo.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ FILTERS ══════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all',           label: 'All',      count: stats.total },
          { key: 'done',          label: 'Done',     count: stats.done },
          { key: 'partially_done',label: 'Partial',  count: stats.partial },
          { key: 'not_done',      label: 'Not Done', count: stats.notDone },
          { key: 'overdue',       label: 'Overdue',  count: stats.overdue },
        ].map(f => (
          <button key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={statusFilter === f.key ? {
              backgroundColor: f.key === 'overdue' ? '#ef4444' : theme.color,
              color: 'white',
              boxShadow: '0 2px 8px rgba(15,23,42,.12)'
            } : {
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              color: '#475569'
            }}>
            {f.label} <span className="opacity-60">({f.count})</span>
          </button>
        ))}

        {subjects.length > 2 && <div className="w-px bg-slate-200 mx-1 self-stretch" />}

        {subjects.length > 2 && subjects.map(s => (
          <button key={s}
            onClick={() => setSubjectFilter(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
            style={subjectFilter === s ? {
              backgroundColor: '#6366f1',
              color: 'white',
              boxShadow: '0 2px 8px rgba(15,23,42,.12)'
            } : {
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              color: '#475569'
            }}>
            {s === 'all' ? 'All Subjects' : s}
          </button>
        ))}
      </div>

      {/* ═══ OVERDUE ALERT ════════════════════════════════════ */}
      {stats.overdue > 0 && statusFilter === 'all' && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 2px rgba(239,68,68,.08)' }}>
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-700 font-medium">
            {stats.overdue} assignment{stats.overdue > 1 ? 's' : ''} overdue — please check with your child
          </span>
          <button onClick={() => setStatusFilter('overdue')}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-800 whitespace-nowrap">
            Show overdue →
          </button>
        </div>
      )}

      {/* ═══ HOMEWORK LIST ════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
              <ClipboardList size={15} className="text-orange-500" />
            </div>
            <p className="font-semibold tracking-tight text-slate-900">Assignments</p>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {filteredHomework.length}
            </span>
          </div>

          {/* Completion bar */}
          {homework.length > 0 && (
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                {stats.done > 0    && <div className="bg-emerald-500" style={{ width: `${(stats.done    / stats.total) * 100}%` }} />}
                {stats.partial > 0 && <div className="bg-amber-400"   style={{ width: `${(stats.partial / stats.total) * 100}%` }} />}
                {stats.notDone > 0 && <div className="bg-red-400"     style={{ width: `${(stats.notDone / stats.total) * 100}%` }} />}
              </div>
              <span className="text-xs font-semibold text-slate-500">{stats.rate}%</span>
            </div>
          )}
        </div>

        {filteredHomework.length > 0 ? (
          <div className="space-y-2">
            {filteredHomework.map(h => {
              const sc = STATUS_CONFIG[h.status] || STATUS_CONFIG.not_done;
              const StatusIcon = sc.Icon;
              return (
                <div key={h.id}
                  className="flex items-start gap-3 p-4 rounded-xl border transition-colors"
                  style={h.overdue ? {
                    backgroundColor: '#fff1f2',
                    borderColor: '#fecdd3'
                  } : {
                    backgroundColor: '#f8fafc',
                    borderColor: 'transparent'
                  }}>
                  {/* Status icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                    style={{ backgroundColor: sc.iconBg, borderColor: sc.cardBorder }}>
                    <StatusIcon size={18} style={{ color: sc.iconColor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-900 truncate">{h.title}</p>
                      {h.overdue && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{h.subject} · {selectedChild?.class_name}</p>
                    {h.description && (
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{h.description}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                      style={{ backgroundColor: sc.badgeBg, color: sc.badgeText }}>
                      {sc.label}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Due {new Date(h.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                    {h.assigned_date && (
                      <p className="text-[10px] text-slate-300">
                        Set {new Date(h.assigned_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-14 bg-slate-50 rounded-xl">
            <ClipboardList size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No homework found</p>
            <p className="text-xs text-slate-400 mt-1">
              {statusFilter !== 'all'
                ? 'Try changing the filter above'
                : 'Homework will appear here as teachers assign it'}
            </p>
          </div>
        )}
      </div>

      {/* ═══ TERM FOOTER ══════════════════════════════════════ */}
      {selectedTerm && selectedTermInfo && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: `${selectedTermInfo.color}12`, border: `1px solid ${selectedTermInfo.color}25` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={{ color: selectedTermInfo.color }} />
            <span className="text-xs font-semibold" style={{ color: selectedTermInfo.color }}>
              {selectedTermInfo.name} Term {selectedTerm.academic_year}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: `${selectedTermInfo.color}25` }}>
              <div className="h-1.5 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, ((new Date() - new Date(selectedTerm.start_date)) / (new Date(selectedTerm.end_date) - new Date(selectedTerm.start_date))) * 100))}%`,
                  backgroundColor: selectedTermInfo.color
                }} />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: selectedTermInfo.color }}>
              {Math.max(0, Math.ceil((new Date(selectedTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentHomeworkPage;
