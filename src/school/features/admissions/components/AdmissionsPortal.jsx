import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Search, Filter, Plus, Download, Upload, ChevronDown, ChevronRight,
  FileText, Calendar, Clock, AlertTriangle, CheckCircle, XCircle,
  Eye, Edit2, Trash2, Mail, Phone, MapPin, Globe, User, UserPlus,
  Building, GraduationCap, Shield, Camera, Paperclip, MessageSquare,
  BarChart3, TrendingUp, AlertCircle, RefreshCw, X, Check, 
  ChevronLeft, MoreVertical, Star, Flag, Send, ClipboardList,
  Loader2, ExternalLink, Copy, Briefcase, Heart, FileCheck,
  CalendarDays, UserCheck, FileWarning, Bell, Archive
} from 'lucide-react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { useAuth } from '../../../../core/context/AuthContext';
import { useTenant } from '../../../../core/context/TenantContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { toast } from '../../../../core/components/Toast';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ============================================================================
// ADMISSIONS PORTAL - Production Ready Multi-Tenant
// ============================================================================

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'gray', icon: FileText },
  submitted: { label: 'Submitted', color: 'blue', icon: Send },
  documents_pending: { label: 'Documents Pending', color: 'amber', icon: FileWarning },
  under_review: { label: 'Under Review', color: 'purple', icon: Eye },
  interview_scheduled: { label: 'Interview Scheduled', color: 'indigo', icon: CalendarDays },
  interview_completed: { label: 'Interview Done', color: 'cyan', icon: UserCheck },
  accepted: { label: 'Accepted', color: 'green', icon: CheckCircle },
  waitlisted: { label: 'Waitlisted', color: 'orange', icon: Clock },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  enrolled: { label: 'Enrolled', color: 'emerald', icon: GraduationCap },
  withdrawn: { label: 'Withdrawn', color: 'slate', icon: Archive },
};

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'photo', label: 'Passport Photo' },
  { value: 'transcript', label: 'School Transcript' },
  { value: 'report_card', label: 'Report Card' },
  { value: 'recommendation', label: 'Recommendation Letter' },
  { value: 'medical_form', label: 'Medical Form' },
  { value: 'immunization_record', label: 'Immunization Record' },
  { value: 'visa', label: 'Visa' },
  { value: 'residence_permit', label: 'Residence Permit' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'parent_id', label: 'Parent ID' },
  { value: 'other', label: 'Other' },
];

const GRADES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13'];

const PIPELINE_STAGES = [
  'submitted', 'documents_pending', 'under_review', 
  'interview_scheduled', 'interview_completed', 
  'accepted', 'waitlisted', 'rejected'
];

// ─── Main Component ──────────────────────────────────────────────────────────

const AdmissionsPortal = () => {
  const { schoolId } = useTenant();
  const { teacher } = useAuth();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  // State
  const [view, setView] = useState('overview'); // overview, list, pipeline, applicant
  const [applicants, setApplicants] = useState([]);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterYear, setFilterYear] = useState('2025-26');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadApplicants = useCallback(async () => {
    if (!schoolId) return;

    try {
      setLoading(true);

      let query = supabase
        .from('applicants')
        .select(`
          *,
          applicant_guardians (id, relationship, first_name, last_name, email, phone_mobile, is_primary_contact),
          applicant_documents (id, document_type, verification_status, is_current),
          applicant_interviews (id, status, scheduled_date, outcome),
          applicant_notes (id)
        `)
        .eq('school_id', schoolId)
        .eq('academic_year', filterYear)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterGrade !== 'all') {
        query = query.eq('applying_for_grade', filterGrade);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplicants(data || []);
    } catch (error) {
      console.error('Error loading applicants:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterYear, filterStatus, filterGrade, refreshKey]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);

  // ─── Filtered Applicants ───────────────────────────────────────────────────

  const filteredApplicants = useMemo(() => {
    if (!searchQuery) return applicants;
    
    const query = searchQuery.toLowerCase();
    return applicants.filter(a => 
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(query) ||
      a.application_number?.toLowerCase().includes(query) ||
      a.email?.toLowerCase().includes(query) ||
      a.nationality?.toLowerCase().includes(query)
    );
  }, [applicants, searchQuery]);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = applicants.length;
    const byStatus = {};
    
    Object.keys(STATUS_CONFIG).forEach(s => {
      byStatus[s] = applicants.filter(a => a.status === s).length;
    });

    const pendingDocs = applicants.filter(a => 
      a.applicant_documents?.some(d => d.verification_status === 'pending' && d.is_current)
    ).length;

    const expiringPassports = applicants.filter(a => {
      if (!a.passport_expiry_date) return false;
      const expiry = new Date(a.passport_expiry_date);
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      return expiry <= threeMonths && a.status !== 'rejected' && a.status !== 'withdrawn';
    }).length;

    const upcomingInterviews = applicants.filter(a =>
      a.applicant_interviews?.some(i => 
        i.status === 'scheduled' && new Date(i.scheduled_date) >= new Date()
      )
    ).length;

    return { total, byStatus, pendingDocs, expiringPassports, upcomingInterviews };
  }, [applicants]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleSelectApplicant = async (applicant) => {
    setSelectedApplicant(applicant);
    setView('applicant');
  };

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  const handleExportCSV = () => {
    const headers = ['App #', 'Name', 'Grade', 'Status', 'Nationality', 'DOB', 'Email', 'Applied'];
    const rows = filteredApplicants.map(a => [
      a.application_number,
      `${a.first_name} ${a.last_name}`,
      a.applying_for_grade,
      STATUS_CONFIG[a.status]?.label || a.status,
      a.nationality,
      a.date_of_birth,
      a.email,
      new Date(a.created_at).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applicants_${filterYear}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading && applicants.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin" style={{ color: theme.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Term Banner */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>{theme.name} Term</span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>{theme.daysRemaining} days left</span>
        </div>
      )}

      {/* Header */}
      <div 
        className="bg-white rounded-2xl shadow-lg p-6 border"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme.withAlpha(0.15) }}
            >
              <UserPlus size={24} style={{ color: theme.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Admissions</h2>
              <p className="text-gray-500 text-sm">Academic Year {filterYear}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              {[
                { id: 'overview', icon: BarChart3, label: 'Overview' },
                { id: 'list', icon: ClipboardList, label: 'List' },
                { id: 'pipeline', icon: TrendingUp, label: 'Pipeline' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => { setView(v.id); setSelectedApplicant(null); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    view === v.id ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <v.icon size={16} />
                  <span className="hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-xl transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-xl transition-all"
              style={{ backgroundColor: theme.color }}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">New Applicant</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        {view !== 'applicant' && (
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, app #, email..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
              />
            </div>

            <div className="flex gap-2">
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
              >
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2026-27">2026-27</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>

              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
              >
                <option value="all">All Grades</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'overview' && (
        <OverviewView 
          stats={stats} 
          applicants={applicants}
          theme={theme} 
          onSelectApplicant={handleSelectApplicant}
        />
      )}

      {view === 'list' && (
        <ListView 
          applicants={filteredApplicants}
          theme={theme}
          onSelectApplicant={handleSelectApplicant}
        />
      )}

      {view === 'pipeline' && (
        <PipelineView 
          applicants={filteredApplicants}
          theme={theme}
          schoolId={schoolId}
          onRefresh={handleRefresh}
          onSelectApplicant={handleSelectApplicant}
        />
      )}

      {view === 'applicant' && selectedApplicant && (
        <ApplicantDetailView
          applicant={selectedApplicant}
          schoolId={schoolId}
          teacher={teacher}
          theme={theme}
          onBack={() => { setView('list'); setSelectedApplicant(null); }}
          onRefresh={handleRefresh}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddApplicantModal
          schoolId={schoolId}
          teacher={teacher}
          theme={theme}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW VIEW
// ═══════════════════════════════════════════════════════════════════════════

const OverviewView = ({ stats, applicants, theme, onSelectApplicant }) => {
  // Recent applicants
  const recentApplicants = applicants.slice(0, 5);

  // Alerts
  const alerts = [];
  
  if (stats.pendingDocs > 0) {
    alerts.push({ type: 'warning', icon: FileWarning, message: `${stats.pendingDocs} applicants with pending documents` });
  }
  if (stats.expiringPassports > 0) {
    alerts.push({ type: 'danger', icon: AlertTriangle, message: `${stats.expiringPassports} passports expiring within 3 months` });
  }
  if (stats.upcomingInterviews > 0) {
    alerts.push({ type: 'info', icon: CalendarDays, message: `${stats.upcomingInterviews} upcoming interviews` });
  }

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} color={theme.color} />
        <StatCard label="Submitted" value={stats.byStatus.submitted || 0} color="#3b82f6" />
        <StatCard label="Under Review" value={stats.byStatus.under_review || 0} color="#8b5cf6" />
        <StatCard label="Interviews" value={stats.byStatus.interview_scheduled || 0} color="#6366f1" />
        <StatCard label="Accepted" value={stats.byStatus.accepted || 0} color="#22c55e" />
        <StatCard label="Enrolled" value={stats.byStatus.enrolled || 0} color="#10b981" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div 
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' :
                alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              <alert.icon size={18} />
              <span className="text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Applicants */}
        <div className="bg-white rounded-2xl shadow-lg border p-5" style={{ borderColor: theme.withAlpha(0.15) }}>
          <h3 className="font-bold text-gray-800 mb-4">Recent Applications</h3>
          {recentApplicants.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-2">
              {recentApplicants.map(a => (
                <div 
                  key={a.id}
                  onClick={() => onSelectApplicant(a)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <User size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-gray-500">{a.applying_for_grade} • {a.application_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border p-5" style={{ borderColor: theme.withAlpha(0.15) }}>
          <h3 className="font-bold text-gray-800 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {PIPELINE_STAGES.map(status => {
              const config = STATUS_CONFIG[status];
              const count = stats.byStatus[status] || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-gray-600">{config.label}</div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-${config.color}-500`}
                      style={{ width: `${percentage}%`, backgroundColor: getStatusColor(status) }}
                    />
                  </div>
                  <div className="w-8 text-sm font-medium text-gray-700 text-right">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════════════════════════════

const ListView = ({ applicants, theme, onSelectApplicant }) => {
  if (applicants.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border p-12 text-center" style={{ borderColor: theme.withAlpha(0.15) }}>
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">No applicants found</p>
        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border overflow-hidden" style={{ borderColor: theme.withAlpha(0.15) }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: theme.withAlpha(0.05) }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Applicant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Grade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nationality</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Documents</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Applied</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map(a => {
              const docsTotal = a.applicant_documents?.filter(d => d.is_current).length || 0;
              const docsApproved = a.applicant_documents?.filter(d => d.is_current && d.verification_status === 'approved').length || 0;

              return (
                <tr 
                  key={a.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectApplicant(a)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {a.photo_url ? (
                          <img src={a.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <User size={16} className="text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{a.first_name} {a.last_name}</p>
                        <p className="text-xs text-gray-500">{a.application_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: theme.color }}>{a.applying_for_grade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{a.nationality || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: docsTotal > 0 ? `${(docsApproved / docsTotal) * 100}%` : '0%',
                            backgroundColor: docsApproved === docsTotal && docsTotal > 0 ? '#22c55e' : theme.color
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{docsApproved}/{docsTotal}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); onSelectApplicant(a); }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE VIEW (Kanban)
// ═══════════════════════════════════════════════════════════════════════════

const PipelineView = ({ applicants, theme, schoolId, onRefresh, onSelectApplicant }) => {
  const [dragging, setDragging] = useState(null);

  const handleDragStart = (e, applicant) => {
    setDragging(applicant);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!dragging || dragging.status === newStatus) {
      setDragging(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('applicants')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', dragging.id)
        .eq('school_id', schoolId);

      if (error) throw error;

      // Log timeline
      await supabase.from('applicant_timeline').insert({
        school_id: schoolId,
        applicant_id: dragging.id,
        action_type: 'status_changed',
        description: `Status changed from ${STATUS_CONFIG[dragging.status]?.label} to ${STATUS_CONFIG[newStatus]?.label}`,
        old_value: dragging.status,
        new_value: newStatus,
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setDragging(null);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map(status => {
        const config = STATUS_CONFIG[status];
        const stageApplicants = applicants.filter(a => a.status === status);

        return (
          <div 
            key={status}
            className="flex-shrink-0 w-72 bg-gray-50 rounded-2xl"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div 
              className="px-4 py-3 rounded-t-2xl flex items-center justify-between"
              style={{ backgroundColor: getStatusColor(status) + '20' }}
            >
              <div className="flex items-center gap-2">
                <config.icon size={16} style={{ color: getStatusColor(status) }} />
                <span className="font-semibold text-sm" style={{ color: getStatusColor(status) }}>{config.label}</span>
              </div>
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: getStatusColor(status), color: 'white' }}
              >
                {stageApplicants.length}
              </span>
            </div>

            <div className="p-3 space-y-2 min-h-[200px]">
              {stageApplicants.map(a => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, a)}
                  onClick={() => onSelectApplicant(a)}
                  className={`bg-white rounded-xl p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
                    dragging?.id === a.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <User size={14} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{a.first_name} {a.last_name}</p>
                      <p className="text-xs text-gray-500">{a.applying_for_grade}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{a.nationality}</span>
                    <span>{a.application_number}</span>
                  </div>
                </div>
              ))}

              {stageApplicants.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// APPLICANT DETAIL VIEW
// ═══════════════════════════════════════════════════════════════════════════

const ApplicantDetailView = ({ applicant, schoolId, teacher, theme, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [data, setData] = useState(applicant);
  const [guardians, setGuardians] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [notes, setNotes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load full data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [guardiansRes, docsRes, timelineRes, notesRes, interviewsRes] = await Promise.all([
          supabase.from('applicant_guardians').select('*').eq('applicant_id', applicant.id).order('is_primary_contact', { ascending: false }),
          supabase.from('applicant_documents').select('*').eq('applicant_id', applicant.id).eq('is_current', true).order('created_at', { ascending: false }),
          supabase.from('applicant_timeline').select('*').eq('applicant_id', applicant.id).order('created_at', { ascending: false }).limit(50),
          supabase.from('applicant_notes').select('*').eq('applicant_id', applicant.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('applicant_interviews').select('*').eq('applicant_id', applicant.id).order('scheduled_date', { ascending: false }),
        ]);

        setGuardians(guardiansRes.data || []);
        setDocuments(docsRes.data || []);
        setTimeline(timelineRes.data || []);
        setNotes(notesRes.data || []);
        setInterviews(interviewsRes.data || []);
      } catch (error) {
        console.error('Error loading applicant data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [applicant.id]);

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          ...(newStatus === 'accepted' || newStatus === 'rejected' || newStatus === 'waitlisted' ? {
            decision_date: new Date().toISOString(),
            decision_by: teacher?.id
          } : {})
        })
        .eq('id', data.id)
        .eq('school_id', schoolId);

      if (error) throw error;

      await supabase.from('applicant_timeline').insert({
        school_id: schoolId,
        applicant_id: data.id,
        action_type: 'status_changed',
        description: `Status changed to ${STATUS_CONFIG[newStatus]?.label}`,
        old_value: data.status,
        new_value: newStatus,
        performed_by: teacher?.id,
        performed_by_name: teacher?.full_name,
      });

      setData({ ...data, status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'guardians', label: 'Guardians', icon: Users, count: guardians.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: documents.length },
    { id: 'interviews', label: 'Interviews', icon: CalendarDays, count: interviews.length },
    { id: 'notes', label: 'Notes', icon: MessageSquare, count: notes.length },
    { id: 'timeline', label: 'Timeline', icon: Clock },
  ];

  return (
    <div className="space-y-5">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
              {data.photo_url ? (
                <img src={data.photo_url} alt="" className="w-14 h-14 object-cover" />
              ) : (
                <User size={24} className="text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {data.first_name} {data.middle_name ? data.middle_name + ' ' : ''}{data.last_name}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-500">{data.application_number}</span>
                <span className="text-sm font-medium" style={{ color: theme.color }}>{data.applying_for_grade}</span>
                <StatusBadge status={data.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <select
            value={data.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border overflow-hidden" style={{ borderColor: theme.withAlpha(0.15) }}>
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-current text-gray-800' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.id ? { color: theme.color } : {}}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: theme.color }} />
            </div>
          ) : (
            <>
              {activeTab === 'profile' && <ProfileTab data={data} theme={theme} />}
              {activeTab === 'guardians' && <GuardiansTab guardians={guardians} theme={theme} schoolId={schoolId} applicantId={data.id} onRefresh={onRefresh} />}
              {activeTab === 'documents' && <DocumentsTab documents={documents} theme={theme} schoolId={schoolId} applicantId={data.id} teacher={teacher} onRefresh={onRefresh} />}
              {activeTab === 'interviews' && <InterviewsTab interviews={interviews} theme={theme} schoolId={schoolId} applicantId={data.id} teacher={teacher} onRefresh={onRefresh} />}
              {activeTab === 'notes' && <NotesTab notes={notes} theme={theme} schoolId={schoolId} applicantId={data.id} teacher={teacher} onRefresh={onRefresh} />}
              {activeTab === 'timeline' && <TimelineTab timeline={timeline} theme={theme} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════════════

const ProfileTab = ({ data, theme }) => {
  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-100">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );

  const Field = ({ label, value, icon: Icon }) => (
    <div>
      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
        {Icon && <Icon size={12} />}
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );

  return (
    <div>
      <Section title="Personal Information">
        <Field label="Full Name" value={`${data.first_name} ${data.middle_name || ''} ${data.last_name}`} icon={User} />
        <Field label="Preferred Name" value={data.preferred_name} />
        <Field label="Date of Birth" value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString() : null} icon={Calendar} />
        <Field label="Gender" value={data.gender?.charAt(0).toUpperCase() + data.gender?.slice(1)} />
        <Field label="Nationality" value={data.nationality} icon={Globe} />
        <Field label="Second Nationality" value={data.second_nationality} />
        <Field label="Birth Country" value={data.birth_country} />
        <Field label="Birth City" value={data.birth_city} />
        <Field label="Native Language" value={data.native_language} />
        <Field label="Home Language" value={data.home_language} />
      </Section>

      <Section title="Contact Information">
        <Field label="Email" value={data.email} icon={Mail} />
        <Field label="Phone" value={data.phone} icon={Phone} />
        <Field label="Address" value={[data.address_line1, data.address_line2, data.city, data.country].filter(Boolean).join(', ')} icon={MapPin} />
      </Section>

      <Section title="Passport & Visa">
        <Field label="Passport Number" value={data.passport_number} />
        <Field label="Issue Country" value={data.passport_issue_country} />
        <Field label="Issue Date" value={data.passport_issue_date ? new Date(data.passport_issue_date).toLocaleDateString() : null} />
        <Field label="Expiry Date" value={data.passport_expiry_date ? new Date(data.passport_expiry_date).toLocaleDateString() : null} />
        <Field label="Visa Type" value={data.visa_type} />
        <Field label="Visa Expiry" value={data.visa_expiry_date ? new Date(data.visa_expiry_date).toLocaleDateString() : null} />
      </Section>

      <Section title="Previous School">
        <Field label="School Name" value={data.previous_school_name} icon={Building} />
        <Field label="Location" value={[data.previous_school_city, data.previous_school_country].filter(Boolean).join(', ')} />
        <Field label="Grade" value={data.previous_school_grade} />
        <Field label="Leaving Date" value={data.previous_school_leaving_date ? new Date(data.previous_school_leaving_date).toLocaleDateString() : null} />
        <Field label="Reason for Leaving" value={data.previous_school_reason_leaving} />
      </Section>

      {(data.medical_conditions || data.allergies || data.special_needs) && (
        <Section title="Medical & Special Needs">
          <Field label="Medical Conditions" value={data.medical_conditions} icon={Heart} />
          <Field label="Allergies" value={data.allergies} />
          <Field label="Medications" value={data.medications} />
          <Field label="Special Needs" value={data.special_needs} />
          <Field label="Learning Support" value={data.learning_support_required ? 'Yes' : 'No'} />
        </Section>
      )}
    </div>
  );
};

const GuardiansTab = ({ guardians, theme, schoolId, applicantId, onRefresh }) => {
  if (guardians.length === 0) {
    return (
      <div className="text-center py-12">
        <Users size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No guardians added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {guardians.map(g => (
        <div key={g.id} className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User size={18} className="text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{g.title} {g.first_name} {g.last_name}</p>
                <p className="text-sm text-gray-500 capitalize">{g.relationship}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {g.is_primary_contact && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Primary</span>
              )}
              {g.is_emergency_contact && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Emergency</span>
              )}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {g.email && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Mail size={14} />
                <span className="truncate">{g.email}</span>
              </div>
            )}
            {g.phone_mobile && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Phone size={14} />
                <span>{g.phone_mobile}</span>
              </div>
            )}
            {g.occupation && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Briefcase size={14} />
                <span>{g.occupation}</span>
              </div>
            )}
            {g.nationality && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Globe size={14} />
                <span>{g.nationality}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const DocumentsTab = ({ documents, theme, schoolId, applicantId, teacher, onRefresh }) => {
  const handleVerify = async (docId, status) => {
    try {
      const { error } = await supabase
        .from('applicant_documents')
        .update({
          verification_status: status,
          verified_by: teacher?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', docId);

      if (error) throw error;

      await supabase.from('applicant_timeline').insert({
        school_id: schoolId,
        applicant_id: applicantId,
        action_type: status === 'approved' ? 'document_verified' : 'document_rejected',
        description: `Document ${status}`,
        performed_by: teacher?.id,
        performed_by_name: teacher?.full_name,
      });

      onRefresh();
    } catch (error) {
      console.error('Error verifying document:', error);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map(doc => {
        const typeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type;
        
        return (
          <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                doc.verification_status === 'approved' ? 'bg-green-100' :
                doc.verification_status === 'rejected' ? 'bg-red-100' :
                'bg-gray-100'
              }`}>
                <FileText size={18} className={
                  doc.verification_status === 'approved' ? 'text-green-600' :
                  doc.verification_status === 'rejected' ? 'text-red-600' :
                  'text-gray-400'
                } />
              </div>
              <div>
                <p className="font-medium text-gray-800">{doc.document_name}</p>
                <p className="text-xs text-gray-500">{typeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                doc.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                doc.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {doc.verification_status}
              </span>

              {doc.verification_status === 'pending' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleVerify(doc.id, 'approved')}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleVerify(doc.id, 'rejected')}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const InterviewsTab = ({ interviews, theme, schoolId, applicantId, teacher, onRefresh }) => {
  if (interviews.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No interviews scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interviews.map(int => (
        <div key={int.id} className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800 capitalize">{int.interview_type?.replace('_', ' ')}</p>
              <p className="text-sm text-gray-500">
                {new Date(int.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {' at '}
                {int.scheduled_time?.slice(0, 5)}
              </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              int.status === 'completed' ? 'bg-green-100 text-green-700' :
              int.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {int.status}
            </span>
          </div>
          {int.interviewer_name && (
            <p className="text-sm text-gray-600 mt-2">Interviewer: {int.interviewer_name}</p>
          )}
          {int.outcome && (
            <p className="text-sm mt-2">
              Outcome: <span className={`font-medium ${
                int.outcome === 'positive' ? 'text-green-600' :
                int.outcome === 'negative' ? 'text-red-600' :
                'text-gray-600'
              }`}>{int.outcome}</span>
            </p>
          )}
          {int.notes && (
            <p className="text-sm text-gray-600 mt-2">{int.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
};

const NotesTab = ({ notes, theme, schoolId, applicantId, teacher, onRefresh }) => {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [saving, setSaving] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase.from('applicant_notes').insert({
        school_id: schoolId,
        applicant_id: applicantId,
        note_type: noteType,
        content: newNote,
        created_by: teacher?.id,
        created_by_name: teacher?.full_name,
      });

      if (error) throw error;

      await supabase.from('applicant_timeline').insert({
        school_id: schoolId,
        applicant_id: applicantId,
        action_type: 'note_added',
        description: 'Added a note',
        performed_by: teacher?.id,
        performed_by_name: teacher?.full_name,
      });

      setNewNote('');
      onRefresh();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Add Note */}
      <div className="mb-4 p-4 bg-gray-50 rounded-xl">
        <div className="flex gap-2 mb-2">
          <select
            value={noteType}
            onChange={e => setNoteType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="general">General</option>
            <option value="interview">Interview</option>
            <option value="concern">Concern</option>
            <option value="positive">Positive</option>
            <option value="follow_up">Follow Up</option>
            <option value="decision">Decision</option>
          </select>
        </div>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAddNote}
            disabled={saving || !newNote.trim()}
            className="px-4 py-2 text-white text-sm font-medium rounded-xl disabled:opacity-50"
            style={{ backgroundColor: theme.color }}
          >
            {saving ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  note.note_type === 'concern' ? 'bg-red-100 text-red-700' :
                  note.note_type === 'positive' ? 'bg-green-100 text-green-700' :
                  note.note_type === 'follow_up' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {note.note_type}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(note.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-800">{note.content}</p>
              {note.created_by_name && (
                <p className="text-xs text-gray-500 mt-2">— {note.created_by_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TimelineTab = ({ timeline, theme }) => {
  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock size={40} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
      <div className="space-y-4">
        {timeline.map(event => (
          <div key={event.id} className="relative pl-10">
            <div 
              className="absolute left-2.5 w-3 h-3 rounded-full bg-white border-2"
              style={{ borderColor: theme.color }}
            />
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm text-gray-800">{event.description}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span>{new Date(event.created_at).toLocaleString()}</span>
                {event.performed_by_name && (
                  <>
                    <span>•</span>
                    <span>{event.performed_by_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ADD APPLICANT MODAL
// ═══════════════════════════════════════════════════════════════════════════

const AddApplicantModal = ({ schoolId, teacher, theme, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    applying_for_grade: '',
    email: '',
    phone: '',
  });

  const handleSave = async () => {
    if (!data.first_name || !data.last_name || !data.date_of_birth || !data.applying_for_grade || !data.nationality) {
      toast.warning('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      // Generate application number
      const { data: appNum } = await supabase.rpc('generate_application_number', { p_school_id: schoolId });

      const { error } = await supabase.from('applicants').insert({
        school_id: schoolId,
        application_number: appNum || `APP${Date.now()}`,
        ...data,
        status: 'submitted',
        created_by: teacher?.id,
      });

      if (error) throw error;

      onSuccess();
    } catch (error) {
      console.error('Error creating applicant:', error);
      toast.error('Failed to create applicant: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div 
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ backgroundColor: theme.color }}
        >
          <h3 className="text-lg font-bold">New Applicant</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                value={data.first_name}
                onChange={e => setData({ ...data, first_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                value={data.last_name}
                onChange={e => setData({ ...data, last_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                value={data.date_of_birth}
                onChange={e => setData({ ...data, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={data.gender}
                onChange={e => setData({ ...data, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality *</label>
              <input
                type="text"
                value={data.nationality}
                onChange={e => setData({ ...data, nationality: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
                placeholder="e.g., British"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applying for Grade *</label>
              <select
                value={data.applying_for_grade}
                onChange={e => setData({ ...data, applying_for_grade: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white"
              >
                <option value="">Select...</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={data.email}
                onChange={e => setData({ ...data, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={data.phone}
                onChange={e => setData({ ...data, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50"
            style={{ backgroundColor: theme.color }}
          >
            {saving ? 'Creating...' : 'Create Applicant'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const StatCard = ({ label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-3xl font-bold" style={{ color }}>{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: getStatusColor(status) + '20', color: getStatusColor(status) }}
    >
      <config.icon size={12} />
      {config.label}
    </span>
  );
};

const getStatusColor = (status) => {
  const colors = {
    draft: '#6b7280',
    submitted: '#3b82f6',
    documents_pending: '#f59e0b',
    under_review: '#8b5cf6',
    interview_scheduled: '#6366f1',
    interview_completed: '#06b6d4',
    accepted: '#22c55e',
    waitlisted: '#f97316',
    rejected: '#ef4444',
    enrolled: '#10b981',
    withdrawn: '#64748b',
  };
  return colors[status] || '#6b7280';
};

export default AdmissionsPortal;