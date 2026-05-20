import React, { useState } from 'react';
import {
  Shield, Download, Trash2, AlertTriangle, ChevronDown, ChevronUp,
  Lock, Eye, FileText, CheckCircle, Clock, X,
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import { useParentChildrenCtx } from '../context/ParentChildrenContext';

// ─── design tokens ────────────────────────────────────────────────────────────
const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';
const HEADER_SHADOW = '0 4px 24px rgba(15,23,42,.14), 0 1px 4px rgba(15,23,42,.06)';

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
    {children}
  </p>
);

// ─── confirm modal ────────────────────────────────────────────────────────────
const ConfirmModal = ({ title, message, confirmLabel, danger, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div
      className="relative bg-white rounded-2xl w-full max-w-md p-6"
      style={{ boxShadow: '0 24px 48px rgba(15,23,42,.18)' }}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
        danger ? 'bg-red-50' : 'bg-amber-50'
      }`}>
        <AlertTriangle size={22} className={danger ? 'text-red-500' : 'text-amber-500'} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
            danger
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-amber-500 hover:bg-amber-600'
          } disabled:opacity-50`}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── faq accordion ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'What data does Akio store about me?',
    a: 'We store your name, email address, phone number, and your relationship to your child(ren). We also store records of your child's attendance, grades, homework completion, and behaviour — all tied to the school you are registered with.',
  },
  {
    q: 'Who can see my data?',
    a: 'Only you and authorised staff at your school can see your data. We use Row Level Security (RLS) at the database level, meaning it is technically impossible for one school to access another school's data. Akio staff do not access your personal data unless required for support, and only with your school's permission.',
  },
  {
    q: 'How long is my data kept?',
    a: 'Your data is kept for as long as your child is enrolled and for up to 2 years after they leave. After that, your account and personal data are permanently deleted. School records may be retained longer in accordance with legal education obligations.',
  },
  {
    q: 'Can I request deletion of my account?',
    a: 'Yes. Use the "Request Account Deletion" button below. Your request will be reviewed by your school administrator. Once approved, your account, login credentials, and all associated personal data will be permanently deleted within 30 days.',
  },
  {
    q: 'What is the legal basis for processing my data?',
    a: 'Your data is processed under GDPR Article 6(1)(b) — processing necessary for the performance of a contract (your child's education), and Article 6(1)(c) — compliance with a legal obligation (school attendance records required by law).',
  },
];

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-3.5 text-left gap-3"
      >
        <span className="text-sm font-medium text-slate-700">{q}</span>
        {open
          ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0" />
          : <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="text-sm text-slate-500 leading-relaxed pb-4">{a}</p>
      )}
    </div>
  );
};

// ─── main ─────────────────────────────────────────────────────────────────────
const ParentPrivacyPage = () => {
  const { supabase, schoolId } = useApp();
  const { user } = useAuth();
  const { children } = useParentChildrenCtx();

  const [downloadState, setDownloadState] = useState('idle'); // idle | loading | done | error
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteState, setDeleteState]     = useState('idle'); // idle | loading | done | error
  const [deleteReason, setDeleteReason]   = useState('');

  // ── Download My Data (GDPR Art. 20 — data portability) ─────────────────────
  const handleDownload = async () => {
    setDownloadState('loading');
    try {
      // 1. Parent profile
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // 2. Linked students + their data
      const studentRecords = [];
      for (const child of children) {
        const [attRes, gradeRes, hwRes, behavRes] = await Promise.all([
          supabase.from('attendance').select('date, status, notes').eq('student_id', child.id),
          supabase.from('grades').select('subject, assessment_title, score, max_score, date, assessment_type').eq('student_id', child.id),
          supabase.from('student_homework').select('status, submitted_at, homework:homework(title, subject, due_date)').eq('student_id', child.id),
          supabase.from('behavior_records').select('type, category, description, date').eq('student_id', child.id),
        ]);

        studentRecords.push({
          name: child.name,
          class: child.class_name,
          attendance:  attRes.data   || [],
          grades:      gradeRes.data || [],
          homework:    hwRes.data    || [],
          behavior:    behavRes.data || [],
        });
      }

      // 3. Assemble export package
      const exportData = {
        exported_at: new Date().toISOString(),
        gdpr_note: 'This export contains all personal data held about you under GDPR Article 20 (right to data portability).',
        parent_profile: {
          full_name:   parentData?.full_name,
          email:       parentData?.email,
          phone:       parentData?.phone,
          created_at:  parentData?.created_at,
        },
        children: studentRecords,
      };

      // 4. Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `akio-my-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 4000);
    } catch (err) {
      console.error('Data export failed:', err);
      setDownloadState('error');
      setTimeout(() => setDownloadState('idle'), 4000);
    }
  };

  // ── Request Account Deletion (GDPR Art. 17 — right to erasure) ─────────────
  const handleDeleteRequest = async () => {
    setDeleteState('loading');
    try {
      await supabase.from('deletion_requests').insert([{
        user_id:    user.id,
        school_id:  schoolId,
        reason:     deleteReason.trim() || null,
        status:     'pending',
        created_at: new Date().toISOString(),
      }]);
      setDeleteState('done');
      setDeleteModal(false);
    } catch (err) {
      console.error('Deletion request failed:', err);
      setDeleteState('error');
      setDeleteModal(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 sm:p-6 text-white"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          boxShadow: HEADER_SHADOW,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Privacy & Your Data</h1>
            <p className="text-xs text-slate-300 mt-0.5">GDPR rights · data portability · account control</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Under GDPR you have the right to access, download, and delete your personal data
          at any time. Use the tools below to exercise those rights.
        </p>
      </div>

      {/* ── quick stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { Icon: Lock,     label: 'Database encryption',  value: 'AES-256'   },
          { Icon: Eye,      label: 'Access policy',        value: 'School-only'},
          { Icon: FileText, label: 'Legal basis',          value: 'GDPR Art.6' },
        ].map(({ Icon, label, value }) => (
          <div
            key={label}
            className="rounded-2xl bg-white border border-slate-100 p-4 flex items-center gap-3"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
              <Icon size={15} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-semibold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── download my data ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <SectionLabel>Data Portability · GDPR Article 20</SectionLabel>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Download My Data</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Download a copy of all personal data we hold about you and your child(ren) —
              attendance records, grades, homework, and behaviour logs — in a portable JSON format.
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloadState === 'loading'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
              downloadState === 'done'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : downloadState === 'error'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            } disabled:opacity-60`}
          >
            {downloadState === 'loading' ? (
              <><Clock size={14} className="animate-spin" /> Preparing…</>
            ) : downloadState === 'done' ? (
              <><CheckCircle size={14} /> Downloaded</>
            ) : downloadState === 'error' ? (
              <><X size={14} /> Failed — retry</>
            ) : (
              <><Download size={14} /> Download (.json)</>
            )}
          </button>
        </div>
        {downloadState === 'done' && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
            ✓ Your data has been downloaded. Keep this file safe — it contains personal information.
          </div>
        )}
      </div>

      {/* ── request deletion ───────────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <SectionLabel>Right to Erasure · GDPR Article 17</SectionLabel>
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Request Account Deletion</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              You may request the permanent deletion of your account and all associated personal data.
              Your school administrator will review the request. Deletion is completed within{' '}
              <strong>30 days</strong> of approval. Note: your child's academic records may be
              retained as legally required by your school.
            </p>
          </div>
          {deleteState === 'done' ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-medium text-amber-700 flex-shrink-0">
              <CheckCircle size={14} /> Request submitted
            </div>
          ) : (
            <button
              onClick={() => setDeleteModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex-shrink-0"
            >
              <Trash2 size={14} /> Request Deletion
            </button>
          )}
        </div>
        {deleteState === 'done' && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
            ✓ Your deletion request has been submitted and will be reviewed by your school within 30 days.
          </div>
        )}
        {deleteState === 'error' && (
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
            Something went wrong. Please contact your school administrator directly.
          </div>
        )}
      </div>

      {/* ── data retention ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <SectionLabel>Data Retention Policy</SectionLabel>
        <div className="space-y-3">
          {[
            { category: 'Account & contact details', retention: 'Until deletion request is approved + 30 days' },
            { category: 'Attendance records',        retention: '2 years after child leaves school (legal requirement)' },
            { category: 'Grades & assessments',      retention: '2 years after child leaves school (legal requirement)' },
            { category: 'Homework records',          retention: '1 academic year' },
            { category: 'Behaviour logs',            retention: '1 academic year' },
            { category: 'Login / access logs',       retention: '90 days (security purposes)' },
          ].map(({ category, retention }) => (
            <div key={category} className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-700 font-medium">{category}</span>
              <span className="text-xs text-slate-400 text-right max-w-[180px]">{retention}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── faq ────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <SectionLabel>Frequently Asked Questions</SectionLabel>
        <div>
          {FAQ_ITEMS.map(item => <FaqItem key={item.q} {...item} />)}
        </div>
      </div>

      {/* ── contact ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-700">Data Controller:</span> Your school is the data controller for your child's records.{' '}
          <span className="font-semibold text-slate-700">Data Processor:</span> Akio Platform processes data on behalf of the school under a Data Processing Agreement (DPA).{' '}
          For any privacy concerns not resolved through this page, please contact your school administrator directly.
        </p>
      </div>

      {/* ── delete confirm modal ───────────────────────────────────────────── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteModal(false)} />
          <div
            className="relative bg-white rounded-2xl w-full max-w-md p-6"
            style={{ boxShadow: '0 24px 48px rgba(15,23,42,.18)' }}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Request Account Deletion</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              This will submit a deletion request to your school administrator. Your account and personal
              data will be permanently deleted within 30 days of approval. This action cannot be undone.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. My child has left this school…"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleteState === 'loading'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={deleteState === 'loading'}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteState === 'loading' ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentPrivacyPage;
