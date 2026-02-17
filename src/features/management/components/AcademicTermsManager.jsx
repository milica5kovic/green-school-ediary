import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, Snowflake, Flower2, Sun, Check, Lock, Trash2, AlertCircle, Loader2, Radio, Edit3, ChevronDown, X } from 'lucide-react';
import AcademicTermsWizard from './AcademicTermsWizard';
import { fetchAcademicTerms, setActiveTerm, finalizeTerm, updateAcademicTerm, deleteAcademicYear, detectCurrentTerm } from '../../settings/service/academicTermsService';

const TERM_ICONS = { Winter: Snowflake, Spring: Flower2, Summer: Sun };

const TERM_COLORS = {
  Winter: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500' },
  Spring: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-500' },
  Summer: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500' }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

const getTermStatus = (term) => {
  if (term.is_finalized) return 'finalized';
  if (term.is_active) return 'active';
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (todayStr < term.start_date) return 'upcoming';
  if (todayStr > term.end_date) return 'completed';
  return 'current';
};

const statusConfig = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  finalized: { label: 'Finalized', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  upcoming: { label: 'Upcoming', color: 'bg-blue-50 text-blue-600', dot: 'bg-blue-400' },
  completed: { label: 'Completed', color: 'bg-amber-50 text-amber-600', dot: 'bg-amber-400' },
  current: { label: 'In Progress', color: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-400' }
};

// ─── TERM CARD ───────────────────────────────────────────
const TermCard = ({ term, onActivate, onFinalize, onEdit }) => {
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const Icon = TERM_ICONS[term.term_name] || Calendar;
  const colors = TERM_COLORS[term.term_name] || TERM_COLORS.Winter;
  const status = getTermStatus(term);
  const sc = statusConfig[status];

  return (
    <div className={`relative border rounded-xl p-4 transition-all ${
      term.is_active ? 'border-emerald-300 bg-emerald-50/30 shadow-sm'
        : term.is_finalized ? 'border-gray-200 bg-gray-50/50'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 text-sm">Term {term.term_number}: {term.term_name}</h4>
            <p className="text-xs text-gray-400">{formatDate(term.start_date)} – {formatDate(term.end_date)}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </div>
      </div>

      {term.half_term_start && (
        <div className="text-xs text-gray-500 mb-3 pl-12">
          Half-term: {formatDate(term.half_term_start)} – {formatDate(term.half_term_end)}
        </div>
      )}

      <div className="flex items-center gap-2 pl-12">
        {!term.is_active && !term.is_finalized && (
          <button onClick={() => onActivate(term)}
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1.5 rounded-md transition-colors">
            <Radio className="w-3.5 h-3.5" /> Set Active
          </button>
        )}

        {term.is_active && !term.is_finalized && !confirmFinalize && (
          <button onClick={() => setConfirmFinalize(true)}
            className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1.5 rounded-md transition-colors">
            <Lock className="w-3.5 h-3.5" /> Finalize Term
          </button>
        )}

        {confirmFinalize && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-600">Lock grades for this term?</span>
            <button onClick={() => { onFinalize(term); setConfirmFinalize(false); }}
              className="text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 px-2.5 py-1 rounded-md">Yes, Finalize</button>
            <button onClick={() => setConfirmFinalize(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
          </div>
        )}

        {!term.is_finalized && (
          <button onClick={() => onEdit(term)}
            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 px-2 py-1.5 rounded-md transition-colors ml-auto">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}

        {term.is_finalized && (
          <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
            <Lock className="w-3 h-3" /> Grades locked
          </div>
        )}
      </div>
    </div>
  );
};

// ─── EDIT MODAL ──────────────────────────────────────────
const EditTermModal = ({ term, onSave, onClose }) => {
  const [editData, setEditData] = useState({ ...term });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editData);
      onClose();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Edit Term {term.term_number}: {term.term_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={editData.start_date}
              onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={editData.end_date}
              onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Half-Term Start</label>
            <input type="date" value={editData.half_term_start || ''}
              onChange={(e) => setEditData({ ...editData, half_term_start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Half-Term End</label>
            <input type="date" value={editData.half_term_end || ''}
              onChange={(e) => setEditData({ ...editData, half_term_end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN MANAGER ────────────────────────────────────────
const AcademicTermsManager = () => {
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allTerms = await fetchAcademicTerms();
      const years = [...new Set(allTerms.map(t => t.academic_year))].sort().reverse();
      setAcademicYears(years);

      if (years.length > 0) {
        const yearToSelect = selectedYear && years.includes(selectedYear) ? selectedYear : years[0];
        setSelectedYear(yearToSelect);
        setTerms(allTerms.filter(t => t.academic_year === yearToSelect));
      } else {
        setTerms([]);
        setShowWizard(true);
      }
    } catch (err) {
      console.error('Failed to load terms:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!selectedYear) return;
    const filterTerms = async () => {
      const allTerms = await fetchAcademicTerms(selectedYear);
      setTerms(allTerms);
    };
    filterTerms();
  }, [selectedYear]);

  const showMessage = (msg, type = 'success') => {
    setActionMessage({ msg, type });
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleActivate = async (term) => {
    try {
      await setActiveTerm(term.id, term.academic_year);
      showMessage(`Term ${term.term_number} (${term.term_name}) is now active.`);
      loadData();
    } catch (err) { showMessage(`Failed: ${err.message}`, 'error'); }
  };

  const handleFinalize = async (term) => {
    try {
      await finalizeTerm(term.id);
      showMessage(`Term ${term.term_number} (${term.term_name}) has been finalized. Grades are locked.`);
      loadData();
    } catch (err) { showMessage(`Failed: ${err.message}`, 'error'); }
  };

  const handleEditSave = async (editData) => {
    await updateAcademicTerm(editData.id, {
      start_date: editData.start_date,
      end_date: editData.end_date,
      half_term_start: editData.half_term_start || null,
      half_term_end: editData.half_term_end || null
    });
    showMessage('Term dates updated.');
    loadData();
  };

  const handleDeleteYear = async () => {
    try {
      await deleteAcademicYear(selectedYear);
      showMessage(`Academic year ${selectedYear} deleted.`);
      setSelectedYear('');
      setConfirmDelete(false);
      loadData();
    } catch (err) { showMessage(`Failed: ${err.message}`, 'error'); }
  };

  const handleWizardComplete = (year) => {
    setShowWizard(false);
    setSelectedYear(year);
    showMessage(`Academic year ${year} set up successfully!`);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading academic terms...</span>
      </div>
    );
  }

  if (showWizard) {
    return (
      <AcademicTermsWizard
        onComplete={handleWizardComplete}
        onCancel={academicYears.length > 0 ? () => setShowWizard(false) : null}
      />
    );
  }

  const currentTerm = detectCurrentTerm(terms);

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Academic Terms
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentTerm ? `Currently in Term ${currentTerm.term_number} (${currentTerm.term_name})` : 'No active term'}
          </p>
        </div>
        <button onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Year
        </button>
      </div>

      {/* Year selector */}
      {academicYears.length > 1 && (
        <div className="flex items-center gap-3 mb-5">
          <label className="text-sm font-medium text-gray-600">Academic Year:</label>
          <div className="relative">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {academicYears.map(y => (<option key={y} value={y}>{y}</option>))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Action message */}
      {actionMessage && (
        <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg ${
          actionMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
        }`}>
          {actionMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {actionMessage.msg}
        </div>
      )}

      {/* Term cards */}
      <div className="space-y-3">
        {terms.map(term => (
          <TermCard key={term.id} term={term} onActivate={handleActivate} onFinalize={handleFinalize} onEdit={setEditingTerm} />
        ))}
      </div>

      {/* Danger zone */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete academic year {selectedYear}
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-600">Delete all terms for {selectedYear}? This cannot be undone.</span>
            <button onClick={handleDeleteYear}
              className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md ml-auto">Delete</button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5">Cancel</button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingTerm && (
        <EditTermModal term={editingTerm} onSave={handleEditSave} onClose={() => setEditingTerm(null)} />
      )}
    </div>
  );
};

export default AcademicTermsManager;