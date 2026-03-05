import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown, BarChart3, ArrowLeft, Calendar, TrendingUp
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import useActiveTerm from '../../../../shared/hooks/useActiveTerm';
import useTermTheme from '../../../../shared/hooks/useTermTheme';
import { useBranding } from '../../../../core/context/BrandingContext';
import { getCambridgeGrade, isPrimaryClass } from '../../../../core/utils/cambridgeGrading';

// ═══════════════════════════════════════════════════════════════
// PARENT GRADES PAGE - Uses useTermTheme for dynamic colors
// ═══════════════════════════════════════════════════════════════

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

const ParentGradesPage = () => {
  const { supabase, setCurrentPage } = useApp();
  const { activeTerm, terms } = useActiveTerm();
  const branding = useBranding();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  // Helper to get term info (not a hook)
  const getTermInfo = (termNumber) => {
    const colorKey = `term${termNumber}Color`;
    const nameKey = `term${termNumber}Name`;
    const color = branding[colorKey] || ['#3b82f6', '#ec4899', '#f59e0b'][termNumber - 1];
    const name = branding[nameKey] || ['Winter', 'Spring', 'Summer'][termNumber - 1];
    return { color, name };
  };

  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');

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

  // Set default term
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

      // Fetch term-tagged + legacy (null term_number within date range)
      const { data: tg } = await supabase.from('grades').select('*')
        .eq('student_id', childId).eq('term_number', termNum)
        .order('date', { ascending: false });

      const { data: lg } = await supabase.from('grades').select('*')
        .eq('student_id', childId).is('term_number', null)
        .gte('date', termStart).lte('date', termEnd)
        .order('date', { ascending: false });

      const all = [...(tg || []), ...(lg || [])];

      // Enrich with Cambridge grades
      const enriched = all.map(g => {
        const pct = Math.round((g.grade / g.max_grade) * 100);
        const cambridge = getCambridgeGrade(pct, className);
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
      return { subject, avgPct: avg, count, cambridge: getCambridgeGrade(avg, className) };
    }).sort((a, b) => b.avgPct - a.avgPct);
  }, [grades, selectedChild]);

  const overallAvg = useMemo(() => {
    if (grades.length === 0) return null;
    const avg = Math.round(grades.reduce((s, g) => s + g.percentage, 0) / grades.length);
    return getCambridgeGrade(avg, selectedChild?.class_name || 'Y1');
  }, [grades, selectedChild]);

  const primary = isPrimaryClass(selectedChild?.class_name);
  const selectedTermInfo = selectedTerm ? getTermInfo(selectedTerm.term_number) : null;

  // ─── Loading ───────────────────────────────────────────────
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

      {/* ═══ HEADER - Dynamic gradient ═══════════════════════ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
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
                <p className="text-white/70 text-sm">Academic Performance</p>
                <h1 className="text-2xl md:text-3xl font-bold">All Grades</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              <ChildSelector children={children} selectedChild={selectedChild} setSelectedChild={setSelectedChild} />
            </div>
          </div>

          {/* Overall grade in header */}
          {overallAvg && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                style={{ backgroundColor: overallAvg.color }}>
                {overallAvg.short}
              </div>
              <div>
                <p className="font-semibold text-lg">{overallAvg.display}</p>
                <p className="text-white/70 text-sm">Overall Average · {grades.length} assessment{grades.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ TERM TABS - Dynamic colors ═══════════════════════ */}
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
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  color: '#4b5563'
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Subject Averages</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {subjectAverages.map(sa => (
              <button key={sa.subject}
                onClick={() => setSelectedSubject(selectedSubject === sa.subject ? 'all' : sa.subject)}
                className="p-3 rounded-xl border transition-all text-left"
                style={selectedSubject === sa.subject ? {
                  borderColor: `${theme.color}60`,
                  backgroundColor: theme.withAlpha(0.05),
                  boxShadow: `0 0 0 2px ${theme.withAlpha(0.2)}`
                } : {
                  borderColor: '#e5e7eb',
                  backgroundColor: '#f9fafb'
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: sa.cambridge.color }}>
                    {sa.cambridge.short}
                  </div>
                  <span className="text-xs font-bold text-gray-700 truncate">{sa.subject}</span>
                </div>
                <p className="text-[10px] text-gray-500">{sa.count} assessment{sa.count !== 1 ? 's' : ''}</p>
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
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              } : {
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                color: '#4b5563'
              }}>
              {s === 'all' ? 'All Subjects' : s}
              {s !== 'all' && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({grades.filter(g => g.subject === s).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ═══ GRADES LIST ══════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
              <BarChart3 size={16} className="text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">
              {selectedSubject === 'all' ? 'All Assessments' : selectedSubject}
            </h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredGrades.length}
            </span>
          </div>
        </div>

        {filteredGrades.length > 0 ? (
          <div className="space-y-2">
            {filteredGrades.map((g, i) => (
              <div key={g.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                {/* Cambridge badge */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: g.cambridge.color }}>
                  {g.cambridge.short}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{g.assessment_title}</p>
                  <p className="text-xs text-gray-500">
                    {g.subject} · {new Date(g.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {g.assessment_type && <span className="text-gray-400"> · {g.assessment_type}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: g.cambridge.color }}>{g.cambridge.display}</p>
                  <p className="text-xs text-gray-400">{g.grade}/{g.max_grade} ({g.percentage}%)</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <BarChart3 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No grades recorded</p>
            <p className="text-xs text-gray-400 mt-1">
              {selectedSubject !== 'all' ? `No ${selectedSubject} assessments this term` : 'Grades will appear here as they are entered'}
            </p>
          </div>
        )}

        {/* Grade scale legend */}
        {filteredGrades.length > 0 && (
          <div className="pt-4 mt-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 mb-2 font-medium">{primary ? 'Cambridge Primary Scale' : 'Cambridge IGCSE Scale'}</p>
            <div className="flex gap-1.5 flex-wrap">
              {primary
                ? [
                    { l: 'B6', c: '#059669', d: '90%+' }, { l: 'B5', c: '#10b981', d: '80%+' },
                    { l: 'B4', c: '#3b82f6', d: '70%+' }, { l: 'B3', c: '#f59e0b', d: '60%+' },
                    { l: 'B2', c: '#f97316', d: '50%+' }, { l: 'B1', c: '#ef4444', d: '<50%' }
                  ].map(b => (
                    <div key={b.l} className="flex items-center gap-1">
                      <div className="w-7 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: b.c }}>{b.l}</div>
                      <span className="text-[9px] text-gray-400 hidden sm:inline">{b.d}</span>
                    </div>
                  ))
                : ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'U'].map(grade => {
                    const pct = grade === 'A*' ? 95 : grade === 'A' ? 85 : grade === 'B' ? 75 : grade === 'C' ? 65 : grade === 'D' ? 55 : grade === 'E' ? 45 : grade === 'F' ? 35 : grade === 'G' ? 25 : 10;
                    const c = getCambridgeGrade(pct, 'Y7');
                    return (
                      <div key={grade} className="w-7 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: c.color }}>{grade}</div>
                    );
                  })
              }
            </div>
          </div>
        )}
      </div>

      {/* ═══ TERM FOOTER - Dynamic colors ═════════════════════ */}
      {selectedTerm && selectedTermInfo && (
        <div className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ backgroundColor: `${selectedTermInfo.color}15`, borderWidth: '1px', borderColor: `${selectedTermInfo.color}30` }}>
          <div className="flex items-center gap-2">
            <TermIcon size={14} style={{ color: selectedTermInfo.color }} />
            <span className="text-xs font-semibold" style={{ color: selectedTermInfo.color }}>{selectedTermInfo.name} Term {selectedTerm.academic_year}</span>
            <span className="text-[10px] text-gray-500 hidden sm:inline">
              {new Date(selectedTerm.start_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(selectedTerm.end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 rounded-full h-1.5 hidden sm:block" style={{ backgroundColor: `${selectedTermInfo.color}30` }}>
              <div className="h-1.5 rounded-full"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((new Date() - new Date(selectedTerm.start_date)) / (new Date(selectedTerm.end_date) - new Date(selectedTerm.start_date))) * 100))}%`,
                  backgroundColor: selectedTermInfo.color
                }} />
            </div>
            <span className="text-[10px] font-medium" style={{ color: selectedTermInfo.color }}>
              {Math.max(0, Math.ceil((new Date(selectedTerm.end_date + 'T00:00:00') - new Date()) / 86400000))}d left
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentGradesPage;