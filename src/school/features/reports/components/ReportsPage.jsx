import React, { useState, useEffect } from 'react';
import { FileText, Plus, Lock, Unlock, RefreshCw, ChevronDown, AlertCircle } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import useReportPeriods from '../hooks/useReportPeriods';
import SubjectTeacherView from './SubjectTeacherView';
import ClassTeacherView from './ClassTeacherView';
import DirectorDashboard from './DirectorDashboard';

// ============================================================================
// REPORTS PAGE — entry point; shows period selector + role-appropriate view
// ============================================================================

export default function ReportsPage() {
  const { services } = useApp();
  const { teacher, isAdmin, profile } = useAuth();
  const { primaryColor } = useBranding();
  const rs = services.reports;

  // Super Admin = admin role + has a teacher record → needs both views
  const isSuperAdmin = profile?.role === 'admin' && teacher !== null;
  const isPureAdmin  = profile?.role === 'admin' && teacher === null;
  const adminOrDirector = isAdmin();

  const [activeTab, setActiveTab] = useState('director'); // 'director' | 'my-entries'

  const { periods, loading, error, activePeriod, setActivePeriod, createPeriod, updatePeriod, refresh } = useReportPeriods();
  const [showNewPeriod, setShowNewPeriod]   = useState(false);
  const [setupDone, setSetupDone]           = useState(null); // null = checking
  const [setupLoading, setSetupLoading]     = useState(false);
  const [periodDropdown, setPeriodDropdown] = useState(false);

  // Check / trigger school setup on mount
  useEffect(() => {
    if (!rs) return;
    rs.getPsdStatements()
      .then(stmts => setSetupDone(stmts.length > 0))
      .catch(() => setSetupDone(false));
  }, [rs]);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      await rs.setupSchool();
      setSetupDone(true);
    } catch (err) {
      alert('Setup failed: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleLockToggle = async () => {
    if (!activePeriod) return;
    const newStatus = activePeriod.status === 'open' ? 'locked' : 'open';
    if (newStatus === 'locked' && !window.confirm(`Lock "${activePeriod.name}"? Teachers will no longer be able to edit entries.`)) return;
    await updatePeriod(activePeriod.id, { status: newStatus });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // ── Setup banner ─────────────────────────────────────────────────────────
  if (setupDone === false && isAdmin()) {
    return (
      <div className="space-y-6">
        <PageHeader primaryColor={primaryColor} />
        <div className="bg-white rounded-2xl border shadow-lg p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
            <FileText size={28} style={{ color: primaryColor }} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Set up Reports for your school</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            This will seed the 13 standard PSD statements, ICT Year 5 & 6 objectives, and default validation rules. Only needs to be done once.
          </p>
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity"
            style={{ backgroundColor: primaryColor, opacity: setupLoading ? 0.7 : 1 }}
          >
            {setupLoading ? 'Setting up…' : 'Set up Reports Module'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader primaryColor={primaryColor} />
        {adminOrDirector && (
          <div className="flex items-center gap-2">
            {activePeriod && (
              <button
                onClick={handleLockToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: `${primaryColor}30`, color: primaryColor, backgroundColor: `${primaryColor}08` }}
              >
                {activePeriod.status === 'open' ? <Lock size={14} /> : <Unlock size={14} />}
                {activePeriod.status === 'open' ? 'Lock period' : 'Unlock period'}
              </button>
            )}
            <button
              onClick={() => setShowNewPeriod(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus size={14} /> New Period
            </button>
          </div>
        )}
      </div>

      {/* ── Period selector ── */}
      {periods.length > 0 && (
        <div className="relative inline-block">
          <button
            onClick={() => setPeriodDropdown(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border shadow-sm text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: `${primaryColor}30` }}
          >
            <span style={{ color: primaryColor }}>{activePeriod?.name || 'Select period'}</span>
            {activePeriod && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activePeriod.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {activePeriod.status}
              </span>
            )}
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {periodDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg z-20 min-w-[220px]" style={{ borderColor: `${primaryColor}20` }}>
              {periods.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActivePeriod(p); setPeriodDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl flex items-center justify-between gap-3 ${activePeriod?.id === p.id ? 'font-semibold' : ''}`}
                >
                  <span className="text-gray-800">{p.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${p.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {periods.length === 0 && !adminOrDirector && (
        <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
          <p className="text-gray-500 text-sm">No report periods open yet. Please check back later or contact your administrator.</p>
        </div>
      )}

      {/* ── Role-specific content ── */}
      {activePeriod && (
        <>
          {/* Super Admin: tab switcher between director view and own teacher entries */}
          {isSuperAdmin && (
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
              {[
                { key: 'director',   label: 'Director View' },
                { key: 'my-entries', label: 'My Entries' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={activeTab === tab.key
                    ? { backgroundColor: 'white', color: primaryColor, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: '#6b7280' }
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Director / pure admin → always director dashboard */}
          {(isPureAdmin || (isSuperAdmin && activeTab === 'director')) && (
            <DirectorDashboard period={activePeriod} />
          )}

          {/* Teacher entries: regular teacher OR super admin on "My Entries" tab */}
          {(!adminOrDirector || (isSuperAdmin && activeTab === 'my-entries')) && (
            <div className="space-y-5">
              <SubjectTeacherView period={activePeriod} teacher={teacher} />
              {teacher?.class_teacher_for && (
                <ClassTeacherView period={activePeriod} className={teacher.class_teacher_for} />
              )}
            </div>
          )}
        </>
      )}

      {/* ── New period modal ── */}
      {showNewPeriod && (
        <NewPeriodModal
          onClose={() => setShowNewPeriod(false)}
          onCreate={createPeriod}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
}

// ── Small reused pieces ────────────────────────────────────────────────────

function PageHeader({ primaryColor }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
        <FileText size={20} style={{ color: primaryColor }} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Student Reports</h1>
        <p className="text-xs text-gray-500">Manage report periods, entries and generation</p>
      </div>
    </div>
  );
}

function NewPeriodModal({ onClose, onCreate, primaryColor }) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: '',
    type: 'mid_year',
    school_year: `${currentYear}/${String(currentYear + 1).slice(2)}`,
    absences_total_days: 90,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Period name is required'); return; }
    setSaving(true);
    setErr('');
    try {
      await onCreate(form);
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ border: `1px solid ${primaryColor}20` }}>
        <div className="p-6 border-b" style={{ borderColor: `${primaryColor}15` }}>
          <h2 className="text-lg font-bold text-gray-900">New Report Period</h2>
          <p className="text-xs text-gray-500 mt-0.5">Opening will auto-create draft entries for all students.</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Period name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Mid-Year 2025/26"
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: `${primaryColor}30`, '--tw-ring-color': primaryColor }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
                style={{ borderColor: `${primaryColor}30` }}
              >
                <option value="mid_year">Mid-Year</option>
                <option value="end_of_year">End of Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">School year</label>
              <input
                type="text"
                value={form.school_year}
                onChange={e => setForm(f => ({ ...f, school_year: e.target.value }))}
                className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
                style={{ borderColor: `${primaryColor}30` }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Total school days (for attendance header)</label>
            <input
              type="number"
              value={form.absences_total_days}
              onChange={e => setForm(f => ({ ...f, absences_total_days: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none"
              style={{ borderColor: `${primaryColor}30` }}
            />
          </div>
          {err && <p className="text-red-500 text-xs">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
              style={{ backgroundColor: primaryColor, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Creating…' : 'Create & Open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
