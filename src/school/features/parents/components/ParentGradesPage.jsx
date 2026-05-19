import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, BarChart3, ArrowLeft, TrendingUp
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getGradeFromConfig, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';
const HEADER_SHADOW = '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)';

const SectionLabel = ({ children, className = '' }) => (
  <p className={`text-[10px] font-semibold uppercase tracking-widest text-slate-400 ${className}`}>{children}</p>
);

// ═══════════════════════════════════════════════════════════════
// PARENT GRADES PAGE - Uses useTermTheme for dynamic colors
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

const ParentGradesPage = () => {
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
  const [grades, setGrades] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    if (activeTerm && !selectedTerm) setSelectedTerm(activeTerm);
  }, [activeTerm, selectedTerm]);

  // ─── Load grades ───────────────────────────────────────────
  const loadGrades = useCallback(async () => {
    if (!supabase || !selectedChild || !selectedTerm) return;
    try {
      const childId = selectedChild.id;
      const className = selectedChild.class_name;
      const termNum = selectedTerm.term_number;
      const termStart = selectedTerm.start_date;
      const termEnd = selectedTerm.end_date;

      const { data: tg } = await supabase.from('grades').select('*')
        .eq('student_id', childId).eq('term_number', termNum)
        .order('date', { ascending: false });

      const { data: lg } = await supabase.from('grades').select('*')
        .eq('student_id', childId).is('term_number', null)
        .gte('date', termStart).lte('date', termEnd)
        .order('date', { ascending: false });

      const all = [...(tg || []), ...(lg || [])];

      const enriched = all.map(g => {
        const pct = Math.round((g.grade / g.max_grade) * 100);
        const cambridge = getGradeFromConfig(pct, className, branding.gradingConfig);
        return { ...g, percentage: pct, cambridge };
      });

      setGrades(enriched);
    } catch (err) { console.error('Load grades error:', err); }
  }, [supabase, selectedChild, selectedTerm]);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  // ─── Derived data ──────────────────────────────────────────
  const subjects = useMemo(() => {
    const set = new Set(grades.map(g => g.subject));
    return ['all', ...Array.from(set).sort()];
  }, [grades]);

  const filteredGrades = useMemo(() => {
    if (selectedSubject === 'all') return grades;
    return grades.filter(g => g.subject === selectedSubject);
  }, [grades, selectedSubject]);

  const subjectAverages = useMemo(() => {
    const map = {};
    grades.forEach(g => {
      if (!map[g.subject]) map[g.subject] = { total: 0, count: 0 };
      map[g.subject].total += g.percentage;
      map[g.subject].count++;
    });
    const className = selectedChild?.class_name || 'Y1';
    return Object.entries(map).map(([subject, { total, count }]) => {
      const avg = Math.round(total / count);
      return { subject, avgPct: avg, count, cambridge: getGradeFromConfig(avg, className, branding.gradingConfig) };
    }).sort((a, b) => b.avgPct - a.avgPct);
  }, [grades, selectedChild]);

  const overallAvg = useMemo(() => {
    if (grades.length === 0) return null;
    const avg = Math.round(grades.reduce((s, g) => s + g.percentage, 0) / grades.length);
    return getGradeFromConfig(avg, selectedChild?.class_name || 'Y1', branding.gradingConfig);
  }, [grades, selectedChild, branding.gradingConfig]);

  const primary = isPrimaryClass(selectedChild?.class_name);
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
                <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Academic Performance</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-0.5">All Grades</h1>
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

          {/* Overall grade tile */}
          {overallAvg && (
            <div className="bg-white/[.10] backdrop-blur-sm rounded-xl p-4 border border-white/[.12] flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0"
                style={{ backgroundColor: overallAvg.color }}>
                {overallAvg.short}
              </div>
              <div>
                <p className="font-semibold tracking-tight text-lg">{overallAvg.display}</p>
                <p className="text-white/60 text-sm">Overall Average · {grades.length} assessment{grades.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
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
                onClick={() => { setSelectedTerm(t); setSelectedSubject('all'); }}
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
                {t.status === 'finalized' && <span className="text-[10px] opacity-70">🔒</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ SUBJECT AVERAGES ═════════════════════════════════ */}
      {subjectAverages.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-100" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={15} className="text-violet-500" />
            </div>
            <p className="font-semibold tracking-tight text-slate-900">Subject Averages</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {subjectAverages.map(sa => (
              <button key={sa.subject}
                onClick={() => setSelectedSubject(selectedSubject === sa.subject ? 'all' : sa.subject)}
                className="p-3 rounded-xl border transition-all text-left"
                style={selectedSubject === sa.subject ? {
                  borderColor: `${theme.color}60`,
                  backgroundColor: theme.withAlpha(0.05),
                  boxShadow: `0 0 0 2px ${theme.withAlpha(0.15)}`
                } : {
                  borderColor: '#e2e8f0',
                  backgroundColor: '#f8fafc'
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: sa.cambridge.color }}>
                    {sa.cambridge.short}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate">{sa.subject}</span>
                </div>
                <p className="text-[10px] text-slate-400">{sa.count} assessment{sa.count !== 1 ? 's' : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SUBJECT FILTER PILLS ═════════════════════════════ */}
      {subjects.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjects.map(s => (
            <button key={s}
              onClick={() => setSelectedSubject(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
              style={selectedSubject === s ? {
                backgroundColor: theme.color,
                color: 'white',
                boxShadow: '0 2px 8px rgba(15,23,42,.12)'
              } : {
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                color: '#475569'
              }}>
              {s === 'all' ? 'All Subjects' : s}
              {s !== 'all' && (
                <span className="ml-1 text-[10px] opacity-60">
                  ({grades.filter(g => g.subject === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ═══ GRADES LIST ══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <BarChart3 size={15} className="text-indigo-500" />
            </div>
            <p className="font-semibold tracking-tight text-slate-900">
              {selectedSubject === 'all' ? 'All Assessments' : selectedSubject}
            </p>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {filteredGrades.length}
            </span>
          </div>
        </div>

        {filteredGrades.length > 0 ? (
          <div className="space-y-2">
            {filteredGrades.map((g, i) => (
              <div key={g.id || i} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: g.cambridge.color }}>
                  {g.cambridge.short}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{g.assessment_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {g.assessment_type && <span className="text-slate-400"> · {g.assessment_type}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: g.cambridge.color }}>{g.cambridge.display}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{g.grade}/{g.max_grade} ({g.percentage}%)</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14 bg-slate-50 rounded-xl">
            <BarChart3 size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-600">No grades recorded</p>
            <p className="text-xs text-slate-400 mt-1">
              {selectedSubject !== 'all' ? `No ${selectedSubject} assessments this term` : 'Grades will appear here as they are entered'}
            </p>
          </div>
        )}

        {/* Grade scale legend */}
        {filteredGrades.length > 0 && (() => {
          const tierConfig = primary
            ? branding.gradingConfig?.primary
            : branding.gradingConfig?.secondary;
          const scaleGrades = tierConfig?.grades;
          if (!scaleGrades?.length) return null;
          return (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <SectionLabel className="mb-2.5">{primary ? 'Primary Scale' : 'Secondary Scale'}</SectionLabel>
              <div className="flex gap-1.5 flex-wrap">
                {scaleGrades.map((g, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-7 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center"
                      style={{ backgroundColor: g.color }}>
                      {g.label}
                    </div>
                    {g.min !== undefined && (
                      <span className="text-[9px] text-slate-400 hidden sm:inline">{g.min}%+</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
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
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {new Date(selectedTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(selectedTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
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

export default ParentGradesPage;
