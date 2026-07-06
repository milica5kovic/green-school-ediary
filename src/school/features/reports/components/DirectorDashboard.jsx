import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, CheckCircle, XCircle, Clock, Send, Download,
  ChevronDown, ChevronRight, AlertCircle, RefreshCw, Filter,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { generateReportsForClass, generateReportForStudent } from './ReportDocxGenerator';

// ============================================================================
// DIRECTOR DASHBOARD — progress matrix, approve/reject, generate .docx
// ============================================================================

const STATUS_COLOR = {
  draft:     { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  submitted: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
  approved:  { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' },
  rejected:  { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
};

export default function DirectorDashboard({ period }) {
  const { services } = useApp();
  const { primaryColor, name: schoolName, address, phone, email, website } = useBranding();
  const rs = services.reports;
  const schoolInfo = { name: schoolName, address, phone, email, website };

  const [matrix, setMatrix]         = useState([]); // [{student, entries[], meta}]
  const [loading, setLoading]       = useState(true);
  const [classFilter, setClassFilter] = useState('all');
  const [expanded, setExpanded]     = useState(null);
  const [approving, setApproving]   = useState(null);
  const [generating, setGenerating] = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await rs.getProgressMatrix(period.id);
      setMatrix(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rs, period.id]);

  useEffect(() => { load(); }, [load]);

  const classes = [...new Set(matrix.map(r => r.student?.class_name).filter(Boolean))].sort();
  const filtered = classFilter === 'all' ? matrix : matrix.filter(r => r.student?.class_name === classFilter);

  // Aggregate stats
  const allEntries = matrix.flatMap(r => r.entries);
  const stats = {
    total:     allEntries.length,
    draft:     allEntries.filter(e => e.status === 'draft').length,
    submitted: allEntries.filter(e => e.status === 'submitted').length,
    approved:  allEntries.filter(e => e.status === 'approved').length,
    rejected:  allEntries.filter(e => e.status === 'rejected').length,
  };

  const handleApprove = async (entryId) => {
    setApproving(entryId);
    try {
      const updated = await rs.approveEntry(entryId);
      // Merge full DB row back, preserving nested student/teacher objects
      setMatrix(prev => prev.map(row => ({
        ...row,
        entries: row.entries.map(e => e.id === entryId
          ? { ...e, ...updated, student: e.student, teacher: e.teacher }
          : e),
      })));
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (entryId, comment) => {
    setApproving(entryId);
    try {
      await rs.rejectEntry(entryId, comment);
      setMatrix(prev => prev.map(row => ({
        ...row,
        entries: row.entries.map(e => e.id === entryId ? { ...e, status: 'rejected', rejection_comment: comment } : e),
      })));
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleGenerateStudent = async (studentRow) => {
    setGenerating(studentRow.student.id);
    try {
      // Always re-fetch fresh entries from DB to get latest comments
      const [freshEntries, freshMeta, psdStmts] = await Promise.all([
        rs.getEntriesForStudent(period.id, studentRow.student.id),
        rs.getMetaForStudent(period.id, studentRow.student.id),
        rs.getPsdStatements(),
      ]);
      await generateReportForStudent({
        studentRow: { ...studentRow, entries: freshEntries, meta: freshMeta },
        period,
        psdStmts,
        rs,
        schoolInfo,
      });
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const handleResync = async () => {
    setSyncing(true);
    setError('');
    try {
      const result = await rs.openPeriod(period.id);
      await load();
      if (result.created === 0) setError('No new entries to create — check that teacher assignments exist in the Timetable module.');
    } catch (err) {
      setError('Resync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateClass = async (className) => {
    setGenerating('class_' + className);
    try {
      const classRows = matrix.filter(r => r.student?.class_name === className);
      const psdStmts = await rs.getPsdStatements();
      for (const row of classRows) {
        await generateReportForStudent({ studentRow: row, period, psdStmts, rs, schoolInfo });
      }
    } catch (err) {
      alert('Generation failed: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-8 flex items-center justify-center gap-3" style={{ borderColor: `${primaryColor}20` }}>
        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
        <p className="text-sm text-gray-500">Loading progress matrix…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total',     value: stats.total,     color: primaryColor },
          { label: 'Draft',     value: stats.draft,     color: '#6b7280' },
          { label: 'Submitted', value: stats.submitted, color: '#d97706' },
          { label: 'Approved',  value: stats.approved,  color: '#16a34a' },
          { label: 'Rejected',  value: stats.rejected,  color: '#dc2626' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-3 text-center" style={{ borderColor: `${primaryColor}15` }}>
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {['all', ...classes].map(c => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${classFilter === c ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              style={classFilter === c ? { backgroundColor: primaryColor } : {}}
            >
              {c === 'all' ? 'All classes' : c}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleResync}
            disabled={syncing || period.status === 'locked'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-50"
            style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
            title="Re-create draft entries from teacher assignments"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Re-sync entries'}
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>
        {classFilter !== 'all' && (
          <button
            onClick={() => handleGenerateClass(classFilter)}
            disabled={!!generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            <Download size={12} />
            {generating === 'class_' + classFilter ? 'Generating…' : `Generate all for ${classFilter}`}
          </button>
        )}
      </div>

      {/* Student rows */}
      <div className="space-y-2">
        {filtered.map(row => (
          <StudentProgressRow
            key={row.student?.id}
            row={row}
            isExpanded={expanded === row.student?.id}
            onToggle={() => setExpanded(prev => prev === row.student?.id ? null : row.student?.id)}
            onApprove={handleApprove}
            onReject={handleReject}
            onGenerate={() => handleGenerateStudent(row)}
            approving={approving}
            generating={generating}
            primaryColor={primaryColor}
          />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: `${primaryColor}20` }}>
            <p className="text-gray-400 text-sm">No students found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student progress row ───────────────────────────────────────────────────

function StudentProgressRow({ row, isExpanded, onToggle, onApprove, onReject, onGenerate, approving, generating, primaryColor }) {
  const { student, entries = [], meta } = row;
  const approvedCount = entries.filter(e => e.status === 'approved').length;
  const allApproved   = entries.length > 0 && approvedCount === entries.length;
  const canGenerate   = approvedCount > 0; // allow generating with partial approvals

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: `${primaryColor}15` }}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm text-gray-900">{student?.name}</span>
          <span className="text-xs text-gray-400 ml-2">{student?.class_name}</span>
        </div>

        {/* Mini status dots */}
        <div className="flex gap-1 flex-shrink-0">
          {entries.map(e => (
            <div
              key={e.id}
              title={`${e.subject_name}: ${e.status}`}
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[e.status]?.text || '#9ca3af' }}
            />
          ))}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {canGenerate && (
            <button
              onClick={e => { e.stopPropagation(); onGenerate(); }}
              disabled={!!generating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
              title="Generate report"
            >
              <Download size={11} />
              {generating === student?.id ? '…' : 'Generate'}
            </button>
          )}
          {isExpanded ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: `${primaryColor}10` }}>
          {entries.map(entry => (
            <EntryReviewRow
              key={entry.id}
              entry={entry}
              onApprove={() => onApprove(entry.id)}
              onReject={(comment) => onReject(entry.id, comment)}
              loading={approving === entry.id}
              primaryColor={primaryColor}
            />
          ))}
          {entries.length === 0 && (
            <p className="text-xs text-gray-400">No entries yet for this student.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Entry review row ───────────────────────────────────────────────────────

function EntryReviewRow({ entry, onApprove, onReject, loading, primaryColor }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment]  = useState('');
  const s = STATUS_COLOR[entry.status] || STATUS_COLOR.draft;

  const handleReject = () => {
    if (!rejectComment.trim()) { alert('Rejection comment is required'); return; }
    onReject(rejectComment.trim());
    setShowRejectForm(false);
    setRejectComment('');
  };

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: s.border, backgroundColor: s.bg + '60' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-xs text-gray-700">{entry.subject_name}</span>
        <span className="text-xs text-gray-400">{entry.attainment && `Att: ${entry.attainment}`} {entry.effort && `· Eff: ${entry.effort}`}</span>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ml-auto"
          style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}
        >
          {entry.status}
        </span>
        {entry.status === 'submitted' && (
          <>
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#16a34a' }}
            >
              <CheckCircle size={11} /> Approve
            </button>
            <button
              onClick={() => setShowRejectForm(v => !v)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#dc2626' }}
            >
              <XCircle size={11} /> Reject
            </button>
          </>
        )}
      </div>

      {entry.comment && (
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{entry.comment}</p>
      )}
      {entry.rejection_comment && (
        <p className="text-xs text-red-600 mt-1">Rejection note: {entry.rejection_comment}</p>
      )}

      {showRejectForm && (
        <div className="mt-2 space-y-1.5">
          <textarea
            rows={2}
            value={rejectComment}
            onChange={e => setRejectComment(e.target.value)}
            className="w-full px-2.5 py-1.5 border rounded-lg text-xs resize-none focus:outline-none"
            style={{ borderColor: '#fca5a5' }}
            placeholder="Reason for rejection (required)…"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowRejectForm(false)} className="text-xs text-gray-500 underline">Cancel</button>
            <button onClick={handleReject} className="text-xs font-semibold text-red-600 underline">Confirm rejection</button>
          </div>
        </div>
      )}
    </div>
  );
}
