import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, ChevronRight, Save, CheckCircle } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { PSD_SCALE } from '../services/reportsService';

// ============================================================================
// CLASS TEACHER VIEW — PSD ticks, absences, self-appraisal, targets
// ============================================================================

export default function ClassTeacherView({ period, className }) {
  const { services } = useApp();
  const { primaryColor } = useBranding();
  const rs = services.reports;

  const [metaRows, setMetaRows]     = useState([]);
  const [psdStmts, setPsdStmts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState(null);

  useEffect(() => {
    if (!period?.id || !className) return;
    (async () => {
      setLoading(true);
      try {
        const [meta, stmts] = await Promise.all([
          rs.getMetaForClass(period.id, className),
          rs.getPsdStatements(),
        ]);
        setMetaRows(meta);
        setPsdStmts(stmts);
      } catch (err) {
        console.error('Error loading class meta:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [period?.id, className]);

  const updateRow = (updated) => setMetaRows(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m));

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-6 flex items-center gap-3" style={{ borderColor: `${primaryColor}20` }}>
        <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
        <p className="text-sm text-gray-500">Loading class data…</p>
      </div>
    );
  }

  if (metaRows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-6 text-center" style={{ borderColor: `${primaryColor}20` }}>
        <Users size={28} className="mx-auto mb-2 text-gray-300" />
        <p className="text-gray-500 text-sm">No students found for class "{className}" in this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Users size={16} style={{ color: primaryColor }} />
        <h2 className="text-sm font-bold text-gray-800">Class Teacher Section — {className}</h2>
      </div>
      <div className="space-y-2">
        {metaRows.map(meta => (
          <StudentMetaCard
            key={meta.id}
            meta={meta}
            psdStmts={psdStmts}
            isExpanded={expanded === meta.id}
            onToggle={() => setExpanded(prev => prev === meta.id ? null : meta.id)}
            onUpdate={updateRow}
            rs={rs}
            primaryColor={primaryColor}
            periodLocked={period.status === 'locked'}
          />
        ))}
      </div>
    </div>
  );
}

// ── Per-student meta card ──────────────────────────────────────────────────

function StudentMetaCard({ meta, psdStmts, isExpanded, onToggle, onUpdate, rs, primaryColor, periodLocked }) {
  const student  = meta.student || {};
  const totalDays = 90; // shown in header; ideally from period.absences_total_days

  const [form, setForm] = useState({
    days_absent:   meta.days_absent   || 0,
    late_arrivals: meta.late_arrivals || 0,
    psd_ticks:     meta.psd_ticks     || {},
    self_appraisal: meta.self_appraisal || { good_at: '', improve: '', try_to: '' },
    targets:       meta.targets       || '',
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const canEdit = !periodLocked;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await rs.saveMeta(meta.id, form);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const setPsd = (stmtId, scaleIdx) => {
    setForm(f => ({
      ...f,
      psd_ticks: {
        ...f.psd_ticks,
        [stmtId]: f.psd_ticks[stmtId] === scaleIdx ? undefined : scaleIdx,
      },
    }));
  };

  const setSelfAppraisal = (field, value) => {
    setForm(f => ({ ...f, self_appraisal: { ...f.self_appraisal, [field]: value } }));
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: `${primaryColor}15` }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900 text-sm">{student.name}</span>
          <span className="text-xs text-gray-400 ml-2">{student.class_name}</span>
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0">
          {form.days_absent} absent · {form.late_arrivals} late
        </div>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {meta.status === 'ready' ? 'Ready' : 'In progress'}
        </span>
        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="border-t px-4 py-4 space-y-5" style={{ borderColor: `${primaryColor}10` }}>
          {/* Attendance */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Attendance</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Days absent:
                <input
                  type="number"
                  min="0"
                  value={form.days_absent}
                  onChange={e => setForm(f => ({ ...f, days_absent: parseInt(e.target.value, 10) || 0 }))}
                  disabled={!canEdit}
                  className="w-16 px-2 py-1 border rounded-lg text-sm text-center focus:outline-none disabled:bg-gray-50"
                  style={{ borderColor: `${primaryColor}30` }}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Late arrivals:
                <input
                  type="number"
                  min="0"
                  value={form.late_arrivals}
                  onChange={e => setForm(f => ({ ...f, late_arrivals: parseInt(e.target.value, 10) || 0 }))}
                  disabled={!canEdit}
                  className="w-16 px-2 py-1 border rounded-lg text-sm text-center focus:outline-none disabled:bg-gray-50"
                  style={{ borderColor: `${primaryColor}30` }}
                />
              </label>
            </div>
          </div>

          {/* PSD tick grid */}
          {psdStmts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Personal / Social Development & Work Habits</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left text-gray-500 font-medium pb-2 pr-3 w-1/2">Statement</th>
                      {PSD_SCALE.map(s => (
                        <th key={s} className="text-center text-gray-500 font-medium pb-2 px-1 whitespace-nowrap">{s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {psdStmts.map(stmt => (
                      <tr key={stmt.id} className="border-t border-gray-50">
                        <td className="py-1.5 pr-3 text-gray-700">{stmt.text}</td>
                        {PSD_SCALE.map((scale, i) => (
                          <td key={i} className="text-center py-1.5 px-1">
                            <button
                              disabled={!canEdit}
                              onClick={() => setPsd(stmt.id, i)}
                              className={`w-5 h-5 rounded border transition-all mx-auto block ${form.psd_ticks[stmt.id] === i ? 'border-transparent' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                              style={form.psd_ticks[stmt.id] === i ? { backgroundColor: primaryColor } : {}}
                              title={scale}
                            >
                              {form.psd_ticks[stmt.id] === i && (
                                <svg viewBox="0 0 10 10" className="w-full h-full text-white" fill="currentColor">
                                  <path d="M2 5 L4.5 7.5 L8 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Self-appraisal */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Student Self-Appraisal</h4>
            <div className="space-y-2">
              {[
                { field: 'good_at',  label: 'I am good at…' },
                { field: 'improve',  label: 'I need to improve…' },
                { field: 'try_to',   label: 'I will try to…' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                  <textarea
                    rows={2}
                    value={form.self_appraisal[field] || ''}
                    onChange={e => setSelfAppraisal(field, e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none disabled:bg-gray-50"
                    style={{ borderColor: `${primaryColor}30` }}
                    placeholder={label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Targets */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Targets to help you improve</label>
            <textarea
              rows={3}
              value={form.targets || ''}
              onChange={e => setForm(f => ({ ...f, targets: e.target.value }))}
              disabled={!canEdit}
              className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none disabled:bg-gray-50"
              style={{ borderColor: `${primaryColor}30` }}
              placeholder="Enter targets for this student…"
            />
          </div>

          {canEdit && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Saved
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
