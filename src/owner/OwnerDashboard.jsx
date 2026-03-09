import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../core/infrastructure/supabaseClient';
import { useAuth } from '../core/context/AuthContext';
import BrandingSettings from './BrandingSettings';

import {
  Building2, Users, GraduationCap, Plus, Search, Trash2,
  ExternalLink, CheckCircle, Clock, AlertCircle, DollarSign,
  ChevronRight, X, Sparkles, Settings, LogOut, RefreshCw,
  AlertTriangle, Shield
} from 'lucide-react';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const PLAN_CONFIG = {
  basic: { 
    name: 'Basic', 
    price: 300, 
    color: 'bg-slate-600 text-slate-200',
    students: '50 students',
  },
  pro: { 
    name: 'Pro', 
    price: 500, 
    color: 'bg-violet-600 text-violet-100',
    students: '200 students',
  },
  enterprise: { 
    name: 'Enterprise', 
    price: 800, 
    color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    students: 'Unlimited',
  },
};

const STATUS_CONFIG = {
  active: { 
    label: 'Active', 
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: CheckCircle,
  },
  trial: { 
    label: 'Trial', 
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Clock,
  },
  suspended: { 
    label: 'Suspended', 
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: AlertTriangle,
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: X,
  },
};

const DEFAULT_SCHOOL_DATA = {
  name: '',
  slug: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  plan: 'pro',
  status: 'trial',
  primary_color: '#10b981',
  secondary_color: '#0d9488',
  grading_system: 'cambridge',
  academic_year: '2025-26',
  features: {
    homework: true,
    attendance: true,
    parent_portal: true,
    calendar: true,
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();
  
  // Data state
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', plan: 'all' });
  
  // Modal state
  const [modal, setModal] = useState({ type: null, data: null });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════════════

  const loadSchools = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: schoolsData, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Batch load stats for all schools
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
          };
        })
      );

      setSchools(schoolsWithStats);
    } catch (err) {
      console.error('Error loading schools:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // ══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ══════════════════════════════════════════════════════════════════════════

  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const matchesSearch = 
        school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        school.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filters.status === 'all' || school.status === filters.status;
      const matchesPlan = filters.plan === 'all' || school.plan === filters.plan;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [schools, searchTerm, filters]);

  const stats = useMemo(() => ({
    total: schools.length,
    active: schools.filter(s => s.status === 'active').length,
    trial: schools.filter(s => s.status === 'trial').length,
    students: schools.reduce((sum, s) => sum + (s.student_count || 0), 0),
    teachers: schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0),
    mrr: schools.reduce((sum, s) => {
      if (s.status !== 'active') return sum;
      return sum + (PLAN_CONFIG[s.plan]?.price || 0);
    }, 0),
  }), [schools]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const openModal = (type, data = null) => setModal({ type, data });
  const closeModal = () => setModal({ type: null, data: null });

  const handleDelete = async (school) => {
    try {
      const { error } = await supabase.from('schools').delete().eq('id', school.id);
      if (error) throw error;
      closeModal();
      loadSchools(true);
    } catch (err) {
      console.error('Error deleting school:', err);
      alert('Failed to delete school: ' + err.message);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header user={user} onSignOut={signOut} />

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
            onClearFilters={() => {
              setSearchTerm('');
              setFilters({ status: 'all', plan: 'all' });
            }}
          />
        ) : (
          <SchoolsList
            schools={filteredSchools}
            onSettings={(school) => openModal('branding', school)}
            onDelete={(school) => openModal('delete', school)}
          />
        )}
      </main>

      {/* Modals */}
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

const Header = ({ user, onSignOut }) => (
  <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">SchoolHub</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Owner Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white truncate max-w-[200px]">{user?.email}</p>
            <div className="flex items-center gap-1 justify-end">
              <Shield size={10} className="text-violet-400" />
              <p className="text-xs text-slate-400">Platform Owner</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="p-2 sm:px-4 sm:py-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all flex items-center gap-2"
            title="Sign Out"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);

// ============================================================================
// STATS GRID
// ============================================================================

const StatsGrid = ({ stats }) => {
  const items = [
    { icon: Building2, label: 'Total Schools', value: stats.total, color: 'violet' },
    { icon: CheckCircle, label: 'Active', value: stats.active, color: 'emerald' },
    { icon: Clock, label: 'On Trial', value: stats.trial, color: 'amber' },
    { icon: GraduationCap, label: 'Students', value: stats.students.toLocaleString(), color: 'blue' },
    { icon: Users, label: 'Teachers', value: stats.teachers.toLocaleString(), color: 'cyan' },
    { icon: DollarSign, label: 'MRR', value: `€${stats.mrr.toLocaleString()}`, color: 'green', highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {items.map((item, idx) => (
        <StatCard key={idx} {...item} />
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, highlight }) => {
  const colorMap = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br border backdrop-blur-sm transition-transform hover:scale-[1.02] ${colorMap[color]} ${highlight ? 'ring-2 ring-green-500/30' : ''}`}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 mb-1.5 sm:mb-2 opacity-80" />
      <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
      <p className="text-[10px] sm:text-xs text-slate-400">{label}</p>
    </div>
  );
};

// ============================================================================
// TOOLBAR
// ============================================================================

const Toolbar = ({ searchTerm, onSearchChange, filters, onFiltersChange, onAdd, onRefresh, refreshing }) => (
  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
    <div className="flex-1 relative">
      <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
      <input
        type="text"
        placeholder="Search schools..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
      />
    </div>

    <div className="flex gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
      <select
        value={filters.status}
        onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
      >
        <option value="all">All Status</option>
        {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        value={filters.plan}
        onChange={(e) => onFiltersChange({ ...filters, plan: e.target.value })}
        className="flex-1 sm:flex-none px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
      >
        <option value="all">All Plans</option>
        {Object.entries(PLAN_CONFIG).map(([key, { name }]) => (
          <option key={key} value={key}>{name}</option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50"
        title="Refresh"
      >
        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
      </button>

      <button
        onClick={onAdd}
        className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2"
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

const SchoolsList = ({ schools, onSettings, onDelete }) => (
  <div className="space-y-3 sm:space-y-4">
    {schools.map(school => (
      <SchoolCard
        key={school.id}
        school={school}
        onSettings={() => onSettings(school)}
        onDelete={() => onDelete(school)}
      />
    ))}
  </div>
);

const SchoolCard = ({ school, onSettings, onDelete }) => {
  const status = STATUS_CONFIG[school.status] || STATUS_CONFIG.active;
  const plan = PLAN_CONFIG[school.plan] || PLAN_CONFIG.pro;
  const StatusIcon = status.icon;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-violet-500/30 transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: school.primary_color || '#6366f1' }}
        >
          {school.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
          ) : (
            school.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">{school.name}</h3>
              <p className="text-xs sm:text-sm text-slate-400 truncate">{school.slug}.schoolhub.app</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${status.color}`}>
                <StatusIcon size={12} />
                {status.label}
              </span>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${plan.color}`}>
                {plan.name}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-3 sm:mt-4">
            <StatPill icon={GraduationCap} value={school.student_count || 0} label="students" />
            <StatPill icon={Users} value={school.teacher_count || 0} label="teachers" />
            <StatPill icon={DollarSign} value={`€${plan.price}`} label="/mo" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-start sm:self-center">
          <ActionButton icon={ExternalLink} onClick={() => window.open(`/?school=${school.slug}`, '_blank')} title="Visit" />
          <ActionButton icon={Settings} onClick={onSettings} title="Settings" hoverColor="violet" />
          <ActionButton icon={Trash2} onClick={onDelete} title="Delete" hoverColor="red" />
        </div>
      </div>
    </div>
  );
};

const StatPill = ({ icon: Icon, value, label }) => (
  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
    <Icon size={14} className="text-slate-400" />
    <span className="text-white font-medium">{value}</span>
    <span className="text-slate-400">{label}</span>
  </div>
);

const ActionButton = ({ icon: Icon, onClick, title, hoverColor = 'white' }) => {
  const hoverClasses = {
    white: 'hover:text-white hover:bg-slate-700',
    violet: 'hover:text-violet-400 hover:bg-violet-500/10',
    red: 'hover:text-red-400 hover:bg-red-500/10',
  };

  return (
    <button onClick={onClick} className={`p-2 text-slate-400 rounded-lg transition-all ${hoverClasses[hoverColor]}`} title={title}>
      <Icon size={16} />
    </button>
  );
};

// ============================================================================
// STATE COMPONENTS
// ============================================================================

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
    <p className="text-slate-400 text-sm">Loading schools...</p>
  </div>
);

const EmptyState = ({ hasSearch, onAdd, onClearFilters }) => (
  <div className="text-center py-16 sm:py-20">
    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
      <Building2 className="w-8 h-8 text-slate-600" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
      {hasSearch ? 'No schools match your filters' : 'No schools yet'}
    </h3>
    <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
      {hasSearch ? 'Try adjusting your search or filters' : 'Add your first school to start managing it with SchoolHub'}
    </p>
    <div className="flex items-center justify-center gap-3">
      {hasSearch && (
        <button onClick={onClearFilters} className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl transition-all">
          Clear Filters
        </button>
      )}
      <button onClick={onAdd} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all">
        Add School
      </button>
    </div>
  </div>
);

// ============================================================================
// ADD SCHOOL MODAL
// ============================================================================

const AddSchoolModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
      if (!formData.name.trim()) return setError('School name is required');
      if (!formData.slug.trim()) return setError('Subdomain is required');
      if (!formData.email.trim()) return setError('Email is required');
    }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: existing } = await supabase.from('schools').select('id').eq('slug', formData.slug).single();
      if (existing) return setError('This subdomain is already taken');

      const { error: insertError } = await supabase.from('schools').insert([{
        ...formData,
        pdf_header_text: formData.name,
        show_logo_in_pdf: true,
        created_at: new Date().toISOString(),
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-700">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Add New School</h2>
            <p className="text-xs sm:text-sm text-slate-400">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 px-5 sm:px-6 pt-4">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-violet-500' : 'bg-slate-700'}`} />
          ))}
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto max-h-[55vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && <StepBasicInfo formData={formData} onChange={updateField} />}
          {step === 2 && <StepPlanStatus formData={formData} onChange={updateField} />}
          {step === 3 && <StepBranding formData={formData} onChange={updateField} />}
        </div>

        <div className="flex items-center justify-between p-5 sm:p-6 border-t border-slate-700">
          <button onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="px-4 sm:px-6 py-2.5 text-slate-400 hover:text-white text-sm">
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          <button
            onClick={() => step < 3 ? handleNext() : handleSubmit()}
            disabled={loading}
            className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating...</>
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
    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">School Information</h3>
    <FormInput label="School Name" value={formData.name} onChange={(v) => onChange('name', v)} placeholder="Green School" required />
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">Subdomain *</label>
      <div className="flex">
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
          placeholder="greenschool"
          className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-l-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <span className="px-3 py-2.5 bg-slate-700 border border-l-0 border-slate-600 rounded-r-xl text-slate-400 text-xs sm:text-sm">.schoolhub.app</span>
      </div>
    </div>
    <FormInput label="Email" type="email" value={formData.email} onChange={(v) => onChange('email', v)} placeholder="admin@school.com" required />
    <div className="grid grid-cols-2 gap-3">
      <FormInput label="Phone" value={formData.phone} onChange={(v) => onChange('phone', v)} placeholder="+381..." />
      <FormInput label="City" value={formData.city} onChange={(v) => onChange('city', v)} placeholder="Belgrade" />
    </div>
  </div>
);

const StepPlanStatus = ({ formData, onChange }) => (
  <div className="space-y-5">
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-3">Select Plan</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(PLAN_CONFIG).map(([id, plan]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange('plan', id)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${formData.plan === id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-slate-500'}`}
          >
            <p className="font-semibold text-white text-sm">{plan.name}</p>
            <p className="text-base font-bold text-violet-400">€{plan.price}</p>
            <p className="text-[10px] text-slate-400">{plan.students}</p>
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-3">Initial Status</label>
      <div className="grid grid-cols-2 gap-2">
        {[{ id: 'trial', name: 'Trial', desc: '14-day free trial' }, { id: 'active', name: 'Active', desc: 'Start billing now' }].map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange('status', s.id)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${formData.status === s.id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-slate-500'}`}
          >
            <p className="font-semibold text-white text-sm">{s.name}</p>
            <p className="text-[10px] text-slate-400">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const StepBranding = ({ formData, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Branding</h3>
    <ColorInput label="Primary Color" value={formData.primary_color} onChange={(v) => onChange('primary_color', v)} />
    <ColorInput label="Secondary Color" value={formData.secondary_color} onChange={(v) => onChange('secondary_color', v)} />
    <div className="mt-6 p-4 bg-slate-900/50 rounded-xl">
      <p className="text-xs text-slate-400 mb-3">Preview</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: formData.primary_color }}>
          {formData.name.charAt(0) || 'S'}
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{formData.name || 'School Name'}</p>
          <p className="text-xs text-slate-400">{formData.slug || 'subdomain'}.schoolhub.app</p>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${formData.primary_color}, ${formData.secondary_color})` }} />
    </div>
  </div>
);

const FormInput = ({ label, type = 'text', value, onChange, placeholder, required }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">{label} {required && '*'}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    />
  </div>
);

const ColorInput = ({ label, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded-lg border-0 cursor-pointer" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 font-mono" />
    </div>
  </div>
);

// ============================================================================
// DELETE MODAL
// ============================================================================

const DeleteModal = ({ school, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-5 sm:p-6">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Delete School</h3>
          <p className="text-sm text-slate-400">Delete <strong className="text-white">{school.name}</strong>? This cannot be undone.</p>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-slate-400 mb-2">Type <strong className="text-white font-mono">{school.slug}</strong> to confirm:</label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 font-mono"
            placeholder={school.slug}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-xl">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== school.slug || loading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;