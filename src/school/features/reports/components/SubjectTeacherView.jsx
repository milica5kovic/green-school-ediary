import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronDown, ChevronRight, CheckCircle, Clock, XCircle, AlertCircle, Send } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { validateComment, countWords } from '../services/validationEngine';
import { getReportType, getYearFromClassName, PRIMARY_ATTAINMENT, PRIMARY_EFFORT, SECONDARY_ATTAINMENT, SECONDARY_EFFORT, OBJECTIVE_SCALE } from '../services/reportsService';

// ============================================================================
// SUBJECT TEACHER VIEW — list all entries assigned to this teacher for the period
// ============================================================================

const STATUS_STYLES = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Draft',     icon: Clock },
  submitted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Submitted', icon: Send },
  approved:  { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Approved',  icon: CheckCircle },
  rejected:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected',  icon: XCircle },
};

export default function SubjectTeacherView({ period, teacher }) {
  const { services } = useApp();
  const { primaryColor } = useBranding();
  const rs = services.reports;

  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [rules, setRules]         = useState([]);
  const [expanded, setExpanded]   = useState(null); // entry id
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    if (!teacher?.id || !period?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [ents, allRules] = await Promise.all([
          rs.getEntriesForTeacher(period.id, teacher.id),
          rs.getValidationRules('all'),
        ]);
        setEntries(ents);
        setRules(allRules);
      } catch (err) {
        console.error('Error loading entries:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [period?.id, teacher?.id]);

  const subjects = [...new Set(entries.map(e => e.subject_name))].sort();
  const filtered = subjectFilter === 'all' ? entries : entries.filter(e => e.subject_name === subjectFilter);

  const updateEntry = (updated) => setEntries(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));

  if (loading) return <LoadingCard primaryColor={primaryColor} label="Loading your entries…" />;

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
        <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm">No report entries assigned to you for this period.</p>
      </div>
    );
  }

  const stats = {
    total: entries.length,
    draft: entries.filter(e => e.status === 'draft').length,
    submitted: entries.filter(e => e.status === 'submitted').length,
    approved: entries.filter(e => e.status === 'approved').length,
    rejected: entries.filter(e => e.status === 'rejected').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: primaryColor },
          { label: 'Draft', value: stats.draft, color: '#6b7280' },
          { label: 'Submitted', value: stats.submitted, color: '#d97706' },
          { label: 'Approved', value: stats.approved, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-3 text-center" style={{ borderColor: `${primaryColor}20` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Subject filter pills */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {['all', ...subjects].map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${subjectFilter === s ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={subjectFilter === s ? { backgroundColor: primaryColor } : {}}
            >
              {s === 'all' ? 'All subjects' : s}
            </button>
          ))}
        </div>
      )}

      {/* Entry cards */}
      <div className="space-y-2">
        {filtered.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            period={period}
            rules={rules}
            isExpanded={expanded === entry.id}
            onToggle={() => setExpanded(prev => prev === entry.id ? null : entry.id)}
            onUpdate={updateEntry}
            rs={rs}
            primaryColor={primaryColor}
            periodLocked={period.status === 'locked'}
          />
        ))}
      </div>
    </div>
  );
}

// ── Single entry card ──────────────────────────────────────────────────────

function EntryCard({ entry, period, rules, isExpanded, onToggle, onUpdate, rs, primaryColor, periodLocked }) {
  const student   = entry.student || {};
  const reportType = getReportType(student.class_name);
  const s         = STATUS_STYLES[entry.status] || STATUS_STYLES.draft;
  const StatusIcon = s.icon;

  const [form, setForm]           = useState({
    comment:    entry.comment    || '',
    attainment: entry.attainment || '',
    effort:     entry.effort     || '',
    objective_ticks: entry.objective_ticks || {},
  });
  const [objectives, setObjectives] = useState([]);
  const [objSections, setObjSections] = useState([]);
  const [saving, setSaving]         = useState(false);
  const [submitErr, setSubmitErr]   = useState('');
  const [softWarns, setSoftWarns]   = useState([]);
  const [showSoftDialog, setShowSoftDialog] = useState(false);

  // Load objectives when expanded for primary students
  useEffect(() => {
    const yearGroup = getYearFromClassName(student.class_name);
    if (!isExpanded || reportType !== 'primary' || !yearGroup) return;
    (async () => {
      try {
        const objs = await rs.getObjectives(entry.subject_name, yearGroup);
        setObjectives(objs);
        const sections = [...new Set(objs.map(o => o.section).filter(Boolean))];
        setObjSections(sections);
      } catch {/* ignore */}
    })();
  }, [isExpanded, reportType, student.class_name, entry.subject_name]);

  const wordCount   = countWords(form.comment);
  const wordRules   = rules.filter(r => r.rule_key === 'word_count');
  const wordConfig  = wordRules[0]?.config || {};
  const minWords    = wordConfig.min || 60;
  const maxWords    = wordConfig.max || 120;
  const wordOk      = wordCount >= minWords && wordCount <= maxWords;
  const wordColor   = wordCount === 0 ? '#9ca3af' : wordOk ? '#16a34a' : wordCount < minWords ? '#d97706' : '#dc2626';

  const doSave = async (updates) => {
    setSaving(true);
    try {
      const updated = await rs.saveEntry(entry.id, updates);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => doSave({ ...form });

  const trySubmit = async () => {
    setSubmitErr('');
    const { hardErrors, softWarnings } = validateComment(form.comment, rules, {
      studentName: student.name,
    });
    if (hardErrors.length) { setSubmitErr(hardErrors[0]); return; }
    if (softWarnings.length) { setSoftWarns(softWarnings); setShowSoftDialog(true); return; }
    await doSubmit();
  };

  const doSubmit = async () => {
    setSaving(true);
    setShowSoftDialog(false);
    try {
      const updated = await rs.submitEntry(entry.id);
      onUpdate({ ...updated, ...form });
    } catch (err) {
      setSubmitErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = !periodLocked && entry.status !== 'approved' && entry.status !== 'submitted';
  const canSubmit = canEdit || entry.status === 'rejected';
  const attainmentOpts = reportType === 'primary' ? PRIMARY_ATTAINMENT : SECONDARY_ATTAINMENT;
  const effortOpts     = reportType === 'primary' ? PRIMARY_EFFORT     : SECONDARY_EFFORT;

  return (
    <div className="bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md" style={{ borderColor: `${primaryColor}15` }}>
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{student.name || '—'}</span>
            <span className="text-xs text-gray-400">{student.class_name}</span>
            <span className="text-xs text-gray-400">{entry.subject_name}</span>
          </div>
          {entry.status === 'rejected' && entry.rejection_comment && (
            <p className="text-xs text-red-600 mt-0.5 truncate">Rejected: {entry.rejection_comment}</p>
          )}
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${s.bg} ${s.text}`}>
          <StatusIcon size={11} /> {s.label}
        </span>
        {isExpanded ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: `${primaryColor}10` }}>
          {/* Rejection notice */}
          {entry.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2">
              <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-700">Rejected by director</p>
                <p className="text-xs text-red-600 mt-0.5">{entry.rejection_comment}</p>
              </div>
            </div>
          )}

          {/* Attainment + Effort */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Attainment</label>
              <div className="flex flex-wrap gap-1.5">
                {attainmentOpts.map(v => (
                  <button
                    key={v}
                    disabled={!canEdit}
                    onClick={() => setForm(f => ({ ...f, attainment: v }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${form.attainment === v ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    style={form.attainment === v ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Effort</label>
              <div className="flex flex-wrap gap-1.5">
                {effortOpts.map(v => (
                  <button
                    key={v}
                    disabled={!canEdit}
                    onClick={() => setForm(f => ({ ...f, effort: v }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${form.effort === v ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    style={form.effort === v ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600">Comment</label>
              <span className="text-xs font-medium" style={{ color: wordColor }}>
                {wordCount} / {minWords}–{maxWords} words
              </span>
            </div>
            <textarea
              value={form.comment}
              onChange={e => { setForm(f => ({ ...f, comment: e.target.value })); setSubmitErr(''); }}
              disabled={!canEdit}
              rows={4}
              className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 disabled:bg-gray-50"
              style={{ borderColor: `${primaryColor}30`, '--tw-ring-color': primaryColor }}
              placeholder="Write your comment about this student's performance…"
            />
            {submitErr && (
              <p className="text-red-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {submitErr}
              </p>
            )}
          </div>

          {/* Objective ticks (primary only) */}
          {reportType === 'primary' && objectives.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Curriculum Objectives</h4>
              {(objSections.length > 0 ? objSections : [null]).map(section => {
                const objs = section ? objectives.filter(o => o.section === section) : objectives;
                return (
                  <div key={section || 'all'} className="mb-3">
                    {section && <p className="text-xs font-medium text-gray-500 mb-1.5 pl-1">{section}</p>}
                    <div className="space-y-1.5">
                      {objs.map(obj => (
                        <div key={obj.id} className="flex items-start gap-2">
                          <div className="flex-1 text-xs text-gray-700 pt-0.5">{obj.text}</div>
                          <div className="flex gap-1 flex-shrink-0">
                            {OBJECTIVE_SCALE.map((scale, i) => (
                              <button
                                key={i}
                                disabled={!canEdit}
                                title={scale}
                                onClick={() => setForm(f => ({
                                  ...f,
                                  objective_ticks: { ...f.objective_ticks, [obj.id]: form.objective_ticks[obj.id] === i ? undefined : i }
                                }))}
                                className={`w-6 h-6 rounded text-[9px] font-bold border transition-all flex items-center justify-center ${form.objective_ticks[obj.id] === i ? 'text-white border-transparent' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                                style={form.objective_ticks[obj.id] === i ? { backgroundColor: primaryColor } : {}}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-3 mt-1">
                {OBJECTIVE_SCALE.map((s, i) => (
                  <span key={i} className="text-[10px] text-gray-400">{i + 1} = {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {canEdit && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-60"
                style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                onClick={trySubmit}
                disabled={saving || !wordOk}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                Submit for review
              </button>
            </div>
          )}
          {entry.status === 'approved' && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12} /> Approved — no further changes needed</p>
          )}
        </div>
      )}

      {/* Soft warning dialog */}
      {showSoftDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-bold text-gray-900 mb-3">Submit anyway?</h3>
            <ul className="space-y-1.5 mb-4">
              {softWarns.map((w, i) => (
                <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {w}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button onClick={() => setShowSoftDialog(false)} className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-600">Go back</button>
              <button onClick={doSubmit} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: primaryColor }}>Submit anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingCard({ primaryColor, label }) {
  return (
    <div className="bg-white rounded-2xl border p-6 flex items-center gap-3" style={{ borderColor: `${primaryColor}20` }}>
      <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
