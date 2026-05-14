import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../core/infrastructure/supabaseClient';
import { useAuth } from '../core/context/AuthContext';
import BrandingSettings from './BrandingSettings';

import {
  Building2, Users, GraduationCap, Plus, Search, Trash2,
  ExternalLink, CheckCircle, Clock, AlertCircle, DollarSign,
  ChevronRight, X, Sparkles, Settings, LogOut, RefreshCw,
  Shield, ToggleLeft, ToggleRight,
  Calendar, CalendarDays, CalendarRange, ClipboardList, ClipboardCheck,
  UserCheck, UserPlus, BookMarked, MessageSquare, FileText, Palette,
  Zap, BarChart3, Activity, CheckSquare, Award, Home, LayoutDashboard,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLAN_CONFIG = {
  basic: {
    name: 'Basic',
    price: 300,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    students: '50 students',
  },
  pro: {
    name: 'Pro',
    price: 500,
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    students: '200 students',
  },
  enterprise: {
    name: 'Enterprise',
    price: 800,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    students: 'Unlimited',
  },
};

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  trial: {
    label: 'Trial',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    dot: 'bg-amber-500',
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-50 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
  },
};

/**
 * FEATURE_GROUPS — single source of truth for all toggleable features.
 * Every key here must match a key used in hasFeature() in SchoolApp.jsx.
 * Groups mirror the sidebar sections so the owner can reason about them easily.
 */
const FEATURE_GROUPS = [
  {
    label: 'General',
    description: 'Core pages visible to all authenticated users',
    features: [
      { key: 'home',            label: 'Teacher Home',    icon: Home,            description: 'Teacher homepage & class overview' },
      { key: 'admin_dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, description: 'Admin analytics & statistics' },
    ],
  },
  {
    label: 'Teacher Features',
    description: 'Visible to teachers in their sidebar',
    features: [
      { key: 'schedule',       label: 'My Schedule',      icon: Clock,           description: 'Personal timetable view' },
      { key: 'calendar',       label: 'Calendar',         icon: Calendar,        description: 'Teacher calendar & events' },
      { key: 'tasks',          label: 'My Tasks',         icon: CheckSquare,     description: 'Personal to-do list' },
      { key: 'homework',       label: 'Homework',         icon: BookMarked,      description: 'Homework assignment management' },
      { key: 'grading',        label: 'Grading',          icon: GraduationCap,   description: 'Mark entry & grade reports' },
      { key: 'daily_overview', label: 'Daily Overview',   icon: ClipboardCheck,  description: 'Class teacher daily attendance view' },
      { key: 'test_maker',     label: 'Test Maker',       icon: FileText,        description: 'Create & print tests' },
      { key: 'activity',       label: 'Activity Tracker', icon: Activity,        description: 'Behaviour tracking & points log' },
    ],
  },
  {
    label: 'Admin Features',
    description: 'Visible to admins and super-admins only',
    features: [
      { key: 'admin_calendar', label: 'School Calendar',  icon: CalendarDays,    description: 'Admin-level school events' },
      { key: 'management',     label: 'Management',       icon: Users,           description: 'Teachers, students & terms' },
      { key: 'admissions',     label: 'Admissions',       icon: UserPlus,        description: 'Enrollment pipeline & applications' },
      { key: 'timetable',      label: 'Timetable Maker',  icon: CalendarRange,   description: 'Auto-generate class timetables' },
      { key: 'reports',        label: 'Reports',          icon: BarChart3,       description: 'Analytics & data exports' },
      { key: 'report_cards',   label: 'Report Cards',     icon: FileText,        description: 'Term PDF report generation' },
    ],
  },
  {
    label: 'Parent Portal',
    description: 'Visible to parents — disabling parent_portal hides all sub-features',
    features: [
      { key: 'parent_portal',     label: 'Parent Portal',    icon: Users,          description: 'Master toggle — enables parent access' },
      { key: 'parent_grades',     label: 'Grades',           icon: Award,          description: 'Parents can view grades' },
      { key: 'parent_attendance', label: 'Attendance',       icon: UserCheck,      description: 'Parents can view attendance' },
      { key: 'parent_calendar',   label: 'Calendar',         icon: Calendar,       description: 'Parents can view school events' },
      { key: 'parent_homework',   label: 'Homework',         icon: ClipboardList,  description: 'Parents can view homework' },
    ],
  },
  {
    label: 'Platform',
    description: 'Branding & communication settings',
    features: [
      { key: 'messaging',       label: 'Messaging',       icon: MessageSquare, description: 'In-app notifications & messages' },
      { key: 'custom_branding', label: 'Custom Branding', icon: Palette,       description: 'School colors & logo customization' },
      { key: 'pdf_branding',    label: 'PDF Branding',    icon: FileText,      description: 'School logo on exported PDFs' },
    ],
  },
];

/**
 * DEFAULT_FEATURES — used both for new schools and as a merge fallback
 * for existing schools that may be missing newer keys in their DB JSONB.
 */
const DEFAULT_FEATURES = {
  // General
  home:               true,
  admin_dashboard:    true,
  // Teacher
  schedule:           true,
  calendar:           true,
  tasks:              true,
  homework:           true,
  grading:            true,
  daily_overview:     true,
  test_maker:         true,
  activity:           true,
  // Admin
  admin_calendar:     true,
  management:         true,
  admissions:         true,
  timetable:          true,
  reports:            true,
  report_cards:       true,
  // Parent portal
  parent_portal:      true,
  parent_grades:      true,
  parent_attendance:  true,
  parent_calendar:    true,
  parent_homework:    true,
  // Platform
  messaging:          false,
  custom_branding:    true,
  pdf_branding:       true,
};

const DEFAULT_SCHOOL_DATA = {
  name:            '',
  slug:            '',
  email:           '',
  phone:           '',
  city:            '',
  address:         '',
  plan:            'pro',
  status:          'trial',
  primary_color:   '#10b981',
  secondary_color: '#0d9488',
  grading_system:  'cambridge',
  academic_year:   '2025-26',
  features:        DEFAULT_FEATURES,
};

// Flat list used for counts
const ALL_FEATURE_KEYS = FEATURE_GROUPS.flatMap(g => g.features);

// ============================================================================
// OWNER DASHBOARD
// ============================================================================

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();

  const [schools,        setSchools]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filters,        setFilters]        = useState({ status: 'all', plan: 'all' });
  const [modal,          setModal]          = useState({ type: null, data: null });
  const [expandedSchool, setExpandedSchool] = useState(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadSchools = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);

      const { data: schoolsData, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const schoolsWithStats = await Promise.all(
        (schoolsData || []).map(async (school) => {
          const [studentsRes, teachersRes] = await Promise.all([
            supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', school.id),
            supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', school.id),
          ]);
          return {
            ...school,
            student_count: studentsRes.count || 0,
            teacher_count: teachersRes.count || 0,
            // Merge DEFAULT_FEATURES so missing keys always have a defined value
            features: { ...DEFAULT_FEATURES, ...(school.features || {}) },
          };
        })
      );

      setSchools(schoolsWithStats);
    } catch (err) {
      console.error('[OwnerDashboard] loadSchools:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadSchools(); }, [loadSchools]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredSchools = useMemo(() => schools.filter(school => {
    const q = searchTerm.toLowerCase();
    const matchesSearch  = school.name.toLowerCase().includes(q) || school.slug.toLowerCase().includes(q);
    const matchesStatus  = filters.status === 'all' || school.status === filters.status;
    const matchesPlan    = filters.plan   === 'all' || school.plan   === filters.plan;
    return matchesSearch && matchesStatus && matchesPlan;
  }), [schools, searchTerm, filters]);

  const stats = useMemo(() => ({
    total:    schools.length,
    active:   schools.filter(s => s.status === 'active').length,
    trial:    schools.filter(s => s.status === 'trial').length,
    students: schools.reduce((sum, s) => sum + (s.student_count || 0), 0),
    teachers: schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0),
    mrr:      schools.reduce((sum, s) => {
      if (s.status !== 'active') return sum;
      return sum + (PLAN_CONFIG[s.plan]?.price || 0);
    }, 0),
  }), [schools]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openModal  = (type, data = null) => setModal({ type, data });
  const closeModal = () => setModal({ type: null, data: null });

  const handleDelete = async (school) => {
    try {
      const { error } = await supabase.from('schools').delete().eq('id', school.id);
      if (error) throw error;
      closeModal();
      loadSchools(true);
    } catch (err) {
      console.error('[OwnerDashboard] handleDelete:', err);
      alert('Failed to delete school: ' + err.message);
    }
  };

  const handleToggleFeature = async (school, featureKey) => {
    const optimisticFeatures = {
      ...school.features,
      [featureKey]: !school.features[featureKey],
    };

    // Optimistic UI update
    setSchools(prev => prev.map(s =>
      s.id === school.id ? { ...s, features: optimisticFeatures } : s
    ));

    try {
      const { error } = await supabase
        .from('schools')
        .update({ features: optimisticFeatures })
        .eq('id', school.id);

      if (error) throw error;
    } catch (err) {
      console.error('[OwnerDashboard] handleToggleFeature:', err);
      // Roll back on failure
      setSchools(prev => prev.map(s =>
        s.id === school.id ? { ...s, features: school.features } : s
      ));
    }
  };

  const handleStatusChange = async (school, newStatus) => {
    try {
      const { error } = await supabase
        .from('schools')
        .update({ status: newStatus })
        .eq('id', school.id);
      if (error) throw error;
      loadSchools(true);
    } catch (err) {
      console.error('[OwnerDashboard] handleStatusChange:', err);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-rose-50">
      <DashboardHeader user={user} onSignOut={signOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <StatsGrid stats={stats} />

        <Toolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={setFilters}
          onAdd={() => openModal('add')}
          onRefresh={() => loadSchools(true)}
          refreshing={refreshing}
        />

        {loading ? (
          <LoadingState />
        ) : filteredSchools.length === 0 ? (
          <EmptyState
            hasSearch={!!searchTerm || filters.status !== 'all' || filters.plan !== 'all'}
            onAdd={() => openModal('add')}
            onClearFilters={() => { setSearchTerm(''); setFilters({ status: 'all', plan: 'all' }); }}
          />
        ) : (
          <SchoolsList
            schools={filteredSchools}
            expandedSchool={expandedSchool}
            onToggleExpand={(id) => setExpandedSchool(prev => prev === id ? null : id)}
            onSettings={(school) => openModal('branding', school)}
            onDelete={(school) => openModal('delete', school)}
            onToggleFeature={handleToggleFeature}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {modal.type === 'add' && (
        <AddSchoolModal
          onClose={closeModal}
          onSuccess={() => { closeModal(); loadSchools(true); }}
        />
      )}
      {modal.type === 'branding' && modal.data && (
        <BrandingSettings
          school={modal.data}
          onClose={closeModal}
          onSave={() => { closeModal(); loadSchools(true); }}
        />
      )}
      {modal.type === 'delete' && modal.data && (
        <DeleteModal
          school={modal.data}
          onClose={closeModal}
          onConfirm={() => handleDelete(modal.data)}
        />
      )}
    </div>
  );
};

// ============================================================================
// HEADER
// ============================================================================

const DashboardHeader = ({ user, onSignOut }) => (
  <header className="bg-white/80 backdrop-blur-xl border-b border-violet-100 sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            E-Diary
          </h1>
          <p className="text-xs text-slate-400">Platform Control</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-violet-50 rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-violet-700">All systems operational</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-violet-500 flex items-center gap-1 justify-end">
              <Shield size={10} /> Owner
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  </header>
);

// ============================================================================
// STATS GRID
// ============================================================================

const STAT_COLOR_MAP = {
  violet:  'text-violet-500',
  emerald: 'text-emerald-500',
  amber:   'text-amber-500',
  blue:    'text-blue-500',
  rose:    'text-rose-500',
  green:   'text-green-500',
};

const StatsGrid = ({ stats }) => {
  const items = [
    { icon: Building2,     label: 'Schools',  value: stats.total,                    color: 'violet',  bg: 'from-violet-100 to-purple-50' },
    { icon: CheckCircle,   label: 'Active',   value: stats.active,                   color: 'emerald', bg: 'from-emerald-100 to-teal-50' },
    { icon: Clock,         label: 'Trial',    value: stats.trial,                    color: 'amber',   bg: 'from-amber-100 to-orange-50' },
    { icon: GraduationCap, label: 'Students', value: stats.students.toLocaleString(), color: 'blue',   bg: 'from-blue-100 to-cyan-50' },
    { icon: Users,         label: 'Teachers', value: stats.teachers.toLocaleString(), color: 'rose',   bg: 'from-rose-100 to-pink-50' },
    { icon: DollarSign,    label: 'MRR',      value: `€${stats.mrr}`,               color: 'green',   bg: 'from-green-100 to-emerald-50', highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={`relative p-4 rounded-2xl bg-gradient-to-br ${item.bg} border border-white/50 shadow-sm hover:shadow-md transition-all ${item.highlight ? 'ring-2 ring-green-200' : ''}`}
        >
          <item.icon className={`w-5 h-5 mb-2 ${STAT_COLOR_MAP[item.color]}`} />
          <p className="text-2xl font-bold text-slate-800">{item.value}</p>
          <p className="text-xs text-slate-500">{item.label}</p>
          {item.highlight && (
            <div className="absolute top-2 right-2">
              <Zap size={14} className="text-green-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// TOOLBAR
// ============================================================================

const Toolbar = ({ searchTerm, onSearchChange, filters, onFiltersChange, onAdd, onRefresh, refreshing }) => (
  <div className="flex flex-col sm:flex-row gap-3 mb-6">
    <div className="flex-1 relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
      <input
        type="text"
        placeholder="Search schools..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all shadow-sm"
      />
    </div>

    <div className="flex gap-2">
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer shadow-sm"
      >
        <option value="all">All Status</option>
        {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        value={filters.plan}
        onChange={(e) => onFiltersChange({ ...filters, plan: e.target.value })}
        className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer shadow-sm"
      >
        <option value="all">All Plans</option>
        {Object.entries(PLAN_CONFIG).map(([key, { name }]) => (
          <option key={key} value={key}>{name}</option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-violet-600 hover:border-violet-200 transition-all disabled:opacity-50 shadow-sm"
        title="Refresh"
      >
        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
      </button>

      <button
        onClick={onAdd}
        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-200 transition-all flex items-center gap-2"
      >
        <Plus size={18} />
        <span className="hidden sm:inline">Add School</span>
      </button>
    </div>
  </div>
);

// ============================================================================
// SCHOOLS LIST
// ============================================================================

const SchoolsList = ({ schools, expandedSchool, onToggleExpand, onSettings, onDelete, onToggleFeature, onStatusChange }) => (
  <div className="space-y-4">
    {schools.map(school => (
      <SchoolCard
        key={school.id}
        school={school}
        isExpanded={expandedSchool === school.id}
        onToggleExpand={() => onToggleExpand(school.id)}
        onSettings={() => onSettings(school)}
        onDelete={() => onDelete(school)}
        onToggleFeature={(key) => onToggleFeature(school, key)}
        onStatusChange={(status) => onStatusChange(school, status)}
      />
    ))}
  </div>
);

// ── School Card ───────────────────────────────────────────────────────────────

const SchoolCard = ({ school, isExpanded, onToggleExpand, onSettings, onDelete, onToggleFeature, onStatusChange }) => {
  const status = STATUS_CONFIG[school.status] || STATUS_CONFIG.active;
  const plan   = PLAN_CONFIG[school.plan]     || PLAN_CONFIG.pro;

  const enabledCount = ALL_FEATURE_KEYS.filter(f => school.features?.[f.key]).length;
  const totalCount   = ALL_FEATURE_KEYS.length;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">

      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">

          {/* Logo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${school.primary_color || '#6366f1'}, ${school.secondary_color || '#8b5cf6'})` }}
          >
            {school.logo_url
              ? <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
              : school.name.charAt(0).toUpperCase()
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{school.name}</h3>
                <p className="text-sm text-slate-400">{school.slug}.schoolhub.app</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${plan.color}`}>
                  {plan.name}
                </span>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-5 mt-4">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <GraduationCap size={15} className="text-slate-400" />
                <span className="font-medium text-slate-700">{school.student_count}</span> students
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={15} className="text-slate-400" />
                <span className="font-medium text-slate-700">{school.teacher_count}</span> teachers
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <DollarSign size={15} className="text-slate-400" />
                <span className="font-medium text-slate-700">€{plan.price}</span>/month
              </div>

              {/* Feature count — doubles as expand toggle */}
              <button
                onClick={onToggleExpand}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isExpanded
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600'
                }`}
              >
                <Settings size={12} />
                {enabledCount}/{totalCount} features
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => window.open(`/?school=${school.slug}`, '_blank')}
              className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
              title="Open school app"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={onSettings}
              className="p-2.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
              title="Branding settings"
            >
              <Palette size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Delete school"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Expanded panel ────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-5 sm:px-6 pb-6 pt-5 space-y-6">

          {/* Status changer */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => onStatusChange(key)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                    school.status === key
                      ? `${config.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feature groups */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              Features
            </p>
            <div className="space-y-5">
              {FEATURE_GROUPS.map(group => (
                <FeatureGroup
                  key={group.label}
                  group={group}
                  features={school.features}
                  onToggle={onToggleFeature}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Feature Group ─────────────────────────────────────────────────────────────

const FeatureGroup = ({ group, features, onToggle }) => {
  const enabledInGroup = group.features.filter(f => features?.[f.key]).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <p className="text-sm font-semibold text-slate-700">{group.label}</p>
        <span className="text-xs text-slate-400">
          ({enabledInGroup}/{group.features.length}) — {group.description}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {group.features.map(feature => {
          const isEnabled = features?.[feature.key] ?? false;
          return (
            <button
              key={feature.key}
              onClick={() => onToggle(feature.key)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                isEnabled
                  ? 'bg-violet-50 border-violet-200 hover:border-violet-300'
                  : 'bg-slate-50 border-slate-100 hover:border-slate-200 opacity-55'
              }`}
            >
              <feature.icon
                size={15}
                className={`flex-shrink-0 ${isEnabled ? 'text-violet-500' : 'text-slate-400'}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate leading-tight ${isEnabled ? 'text-slate-700' : 'text-slate-400'}`}>
                  {feature.label}
                </p>
                <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                  {feature.description}
                </p>
              </div>
              {isEnabled
                ? <ToggleRight size={15} className="text-violet-500 flex-shrink-0" />
                : <ToggleLeft  size={15} className="text-slate-300 flex-shrink-0" />
              }
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// LOADING / EMPTY STATES
// ============================================================================

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin mb-4" />
    <p className="text-slate-500 text-sm">Loading schools...</p>
  </div>
);

const EmptyState = ({ hasSearch, onAdd, onClearFilters }) => (
  <div className="text-center py-20">
    <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
      <Building2 className="w-10 h-10 text-violet-400" />
    </div>
    <h3 className="text-xl font-semibold text-slate-800 mb-2">
      {hasSearch ? 'No schools match your filters' : 'No schools yet'}
    </h3>
    <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
      {hasSearch
        ? 'Try adjusting your search or filters'
        : 'Add your first school to get started'}
    </p>
    <div className="flex items-center justify-center gap-3">
      {hasSearch && (
        <button
          onClick={onClearFilters}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-2xl transition-all"
        >
          Clear Filters
        </button>
      )}
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-violet-200 transition-all"
      >
        Add School
      </button>
    </div>
  </div>
);

// ============================================================================
// ADD SCHOOL MODAL
// ============================================================================

const AddSchoolModal = ({ onClose, onSuccess }) => {
  const [step,     setStep]     = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [formData, setFormData] = useState(DEFAULT_SCHOOL_DATA);

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'name' ? { slug: value.toLowerCase().replace(/[^a-z0-9]/g, '') } : {}),
    }));
    setError(null);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim())  return setError('School name is required');
      if (!formData.slug.trim())  return setError('Subdomain is required');
      if (!formData.email.trim()) return setError('Email is required');
    }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existing } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', formData.slug)
        .single();

      if (existing) return setError('This subdomain is already taken');

      const { error: insertError } = await supabase.from('schools').insert([{
        ...formData,
        pdf_header_text:  formData.name,
        show_logo_in_pdf: true,
        created_at:       new Date().toISOString(),
      }]);

      if (insertError) throw insertError;
      onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add New School</h2>
            <p className="text-sm text-slate-400">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 px-6 pt-4 flex-shrink-0">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-gradient-to-r from-violet-500 to-purple-500' : 'bg-slate-100'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {step === 1 && <StepBasicInfo  formData={formData} onChange={updateField} />}
          {step === 2 && <StepPlanStatus formData={formData} onChange={updateField} />}
          {step === 3 && <StepBranding   formData={formData} onChange={updateField} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>
          <button
            onClick={() => step < 3 ? handleNext() : handleSubmit()}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-200 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : step < 3 ? (
              <>Next <ChevronRight size={16} /></>
            ) : (
              'Create School'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const StepBasicInfo = ({ formData, onChange }) => (
  <div className="space-y-4">
    <FormInput label="School Name" value={formData.name} onChange={(v) => onChange('name', v)} placeholder="Green School" required />
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-2">Subdomain *</label>
      <div className="flex">
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          placeholder="greenschool"
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all"
        />
        <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-slate-500 text-sm select-none">
          .schoolhub.app
        </span>
      </div>
    </div>
    <FormInput label="Email" type="email" value={formData.email} onChange={(v) => onChange('email', v)} placeholder="admin@school.com" required />
    <div className="grid grid-cols-2 gap-3">
      <FormInput label="Phone" value={formData.phone} onChange={(v) => onChange('phone', v)} placeholder="+381..." />
      <FormInput label="City"  value={formData.city}  onChange={(v) => onChange('city', v)}  placeholder="Belgrade" />
    </div>
  </div>
);

const StepPlanStatus = ({ formData, onChange }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-3">Select Plan</label>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(PLAN_CONFIG).map(([id, plan]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange('plan', id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              formData.plan === id
                ? 'border-violet-400 bg-violet-50'
                : 'border-slate-100 hover:border-slate-200 bg-slate-50'
            }`}
          >
            <p className="font-semibold text-slate-700 text-sm">{plan.name}</p>
            <p className="text-lg font-bold text-violet-600">€{plan.price}</p>
            <p className="text-xs text-slate-400">{plan.students}</p>
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-3">Initial Status</label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'trial',  name: 'Trial',  desc: '14-day free trial' },
          { id: 'active', name: 'Active', desc: 'Start billing now' },
        ].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange('status', s.id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              formData.status === s.id
                ? 'border-violet-400 bg-violet-50'
                : 'border-slate-100 hover:border-slate-200 bg-slate-50'
            }`}
          >
            <p className="font-semibold text-slate-700 text-sm">{s.name}</p>
            <p className="text-xs text-slate-400">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const StepBranding = ({ formData, onChange }) => (
  <div className="space-y-4">
    <ColorInput label="Primary Color"   value={formData.primary_color}   onChange={(v) => onChange('primary_color', v)} />
    <ColorInput label="Secondary Color" value={formData.secondary_color} onChange={(v) => onChange('secondary_color', v)} />
    <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
      <p className="text-xs text-slate-400 mb-3">Preview</p>
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg"
          style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` }}
        >
          {formData.name.charAt(0) || 'S'}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{formData.name || 'School Name'}</p>
          <p className="text-sm text-slate-400">{formData.slug || 'subdomain'}.schoolhub.app</p>
        </div>
      </div>
      <div
        className="mt-4 h-2 rounded-full"
        style={{ background: `linear-gradient(to right, ${formData.primary_color}, ${formData.secondary_color})` }}
      />
    </div>
  </div>
);

const FormInput = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-2">
      {label}{required && ' *'}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:bg-white transition-all"
    />
  </div>
);

const ColorInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 mb-2">{label}</label>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 font-mono transition-all"
      />
    </div>
  </div>
);

// ============================================================================
// DELETE MODAL
// ============================================================================

const DeleteModal = ({ school, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Delete School</h3>
          <p className="text-sm text-slate-500">
            Delete <strong className="text-slate-700">{school.name}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-xs text-slate-500 mb-2">
            Type <strong className="text-slate-700 font-mono">{school.slug}</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={school.slug}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 font-mono transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== school.slug || loading}
            className="flex-1 px-5 py-3 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;