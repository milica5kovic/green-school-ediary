import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Plus, Search, MoreVertical, ExternalLink,
  GraduationCap, Users, TrendingUp, DollarSign, Settings,
  Building2, Mail, Phone, Calendar, CheckCircle, XCircle,
  AlertCircle, Clock, Edit3, Trash2, Eye, Power, Palette,
  ChevronDown, ArrowUpRight, ArrowDownRight, BarChart3,
  Globe, CreditCard, Shield, Zap, X, Upload, Check,
  ChevronRight, Copy, RefreshCw
} from 'lucide-react';

// ============================================================================
// SCHOOLHUB OWNER DASHBOARD
// For Akio (Mia) to manage all school tenants
// ============================================================================

const PLANS = {
  basic: { name: 'Basic', price: 300, color: 'gray', students: 50, teachers: 5 },
  pro: { name: 'Pro', price: 500, color: 'violet', students: 200, teachers: 15 },
  enterprise: { name: 'Enterprise', price: 800, color: 'amber', students: 999, teachers: 999 },
};

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'emerald', icon: CheckCircle },
  trial: { label: 'Trial', color: 'blue', icon: Clock },
  suspended: { label: 'Suspended', color: 'red', icon: XCircle },
  pending: { label: 'Pending Setup', color: 'amber', icon: AlertCircle },
};

// Mock data - would come from Supabase
const MOCK_SCHOOLS = [
  {
    id: '1',
    name: 'Green School by Chartwell',
    slug: 'greenschool',
    logo: null,
    primaryColor: '#10b981',
    plan: 'pro',
    status: 'active',
    students: 37,
    teachers: 8,
    adminEmail: 'admin@greenschool.rs',
    adminName: 'Marko Petrović',
    phone: '+381 11 234 5678',
    createdAt: '2025-09-01',
    lastActive: '2026-02-24',
    mrr: 500,
  },
  {
    id: '2',
    name: 'Cambridge Academy Belgrade',
    slug: 'cambridge-belgrade',
    logo: null,
    primaryColor: '#3b82f6',
    plan: 'enterprise',
    status: 'trial',
    students: 124,
    teachers: 18,
    adminEmail: 'director@cambridgebelgrade.edu',
    adminName: 'Ana Jovanović',
    phone: '+381 11 876 5432',
    createdAt: '2026-02-15',
    lastActive: '2026-02-24',
    mrr: 0, // trial
    trialEnds: '2026-03-15',
  },
  {
    id: '3',
    name: 'Little Stars Preschool',
    slug: 'littlestars',
    logo: null,
    primaryColor: '#f59e0b',
    plan: 'basic',
    status: 'pending',
    students: 0,
    teachers: 0,
    adminEmail: 'info@littlestars.rs',
    adminName: 'Jelena Nikolić',
    phone: '+381 64 123 4567',
    createdAt: '2026-02-22',
    lastActive: null,
    mrr: 300,
  },
];

const OwnerDashboard = () => {
  const [schools, setSchools] = useState(MOCK_SCHOOLS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showAddSchool, setShowAddSchool] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Stats
  const stats = useMemo(() => ({
    totalSchools: schools.length,
    activeSchools: schools.filter(s => s.status === 'active').length,
    totalStudents: schools.reduce((sum, s) => sum + s.students, 0),
    totalTeachers: schools.reduce((sum, s) => sum + s.teachers, 0),
    mrr: schools.reduce((sum, s) => sum + s.mrr, 0),
    trials: schools.filter(s => s.status === 'trial').length,
  }), [schools]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    let result = schools;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.slug.toLowerCase().includes(q) ||
        s.adminEmail.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);
    if (planFilter !== 'all') result = result.filter(s => s.plan === planFilter);
    return result;
  }, [schools, searchQuery, statusFilter, planFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">SchoolHub</h1>
                  <p className="text-xs text-gray-500">Owner Dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowAddSchool(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-200 transition-all"
              >
                <Plus size={18} />
                Add School
              </button>
              <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-violet-600">M</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard 
            label="Total Schools" 
            value={stats.totalSchools} 
            icon={Building2}
            color="violet"
          />
          <StatCard 
            label="Active" 
            value={stats.activeSchools} 
            icon={CheckCircle}
            color="emerald"
          />
          <StatCard 
            label="In Trial" 
            value={stats.trials} 
            icon={Clock}
            color="blue"
          />
          <StatCard 
            label="Students" 
            value={stats.totalStudents} 
            icon={Users}
            color="amber"
          />
          <StatCard 
            label="Teachers" 
            value={stats.totalTeachers} 
            icon={GraduationCap}
            color="pink"
          />
          <StatCard 
            label="MRR" 
            value={`€${stats.mrr}`} 
            icon={DollarSign}
            color="green"
            highlight
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl p-1 mb-6 w-fit border border-gray-200">
          {[
            { id: 'overview', label: 'All Schools', icon: Building2 },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'billing', label: 'Billing', icon: CreditCard },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-violet-100 text-violet-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="all">All Plans</option>
                {Object.entries(PLANS).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>

            {/* Schools Grid */}
            <div className="grid gap-4">
              {filteredSchools.map(school => (
                <SchoolCard 
                  key={school.id}
                  school={school}
                  onClick={() => setSelectedSchool(school)}
                />
              ))}

              {filteredSchools.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-1">No schools found</h3>
                  <p className="text-gray-500">Try adjusting your filters or add a new school</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Analytics Coming Soon</h3>
            <p className="text-gray-500">Track growth, usage patterns, and more</p>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Billing Dashboard Coming Soon</h3>
            <p className="text-gray-500">Manage subscriptions, invoices, and payments</p>
          </div>
        )}
      </div>

      {/* School Detail Modal */}
      {selectedSchool && (
        <SchoolDetailModal 
          school={selectedSchool}
          onClose={() => setSelectedSchool(null)}
          onUpdate={(updated) => {
            setSchools(prev => prev.map(s => s.id === updated.id ? updated : s));
            setSelectedSchool(updated);
          }}
        />
      )}

      {/* Add School Modal */}
      {showAddSchool && (
        <AddSchoolModal 
          onClose={() => setShowAddSchool(false)}
          onAdd={(newSchool) => {
            setSchools(prev => [...prev, newSchool]);
            setShowAddSchool(false);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTS
// ============================================================================

const StatCard = ({ label, value, icon: Icon, color, highlight }) => {
  const colorClasses = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    pink: 'bg-pink-50 text-pink-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className={`bg-white rounded-2xl p-4 border ${highlight ? 'border-violet-200 ring-2 ring-violet-100' : 'border-gray-200'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClasses[color]}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
};

const SchoolCard = ({ school, onClick }) => {
  const plan = PLANS[school.plan];
  const status = STATUS_CONFIG[school.status];
  const StatusIcon = status.icon;

  const statusColors = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  const planColors = {
    gray: 'bg-gray-100 text-gray-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-violet-200 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Logo/Color Badge */}
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
            style={{ backgroundColor: school.primaryColor }}
          >
            {school.name.charAt(0)}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">{school.name}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status.color]}`}>
                <StatusIcon size={12} />
                {status.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${planColors[plan.color]}`}>
                {plan.name}
              </span>
            </div>
            
            <p className="text-sm text-gray-500 mb-3">
              {school.slug}.schoolhub.app
            </p>

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users size={14} className="text-gray-400" />
                <span>{school.students} students</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <GraduationCap size={14} className="text-gray-400" />
                <span>{school.teachers} teachers</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <span>{school.adminEmail}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">€{school.mrr}/mo</p>
          {school.status === 'trial' && school.trialEnds && (
            <p className="text-xs text-blue-600">
              Trial ends {new Date(school.trialEnds).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const SchoolDetailModal = ({ school, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  const plan = PLANS[school.plan];
  const status = STATUS_CONFIG[school.status];

  const handleStatusChange = (newStatus) => {
    onUpdate({ ...school, status: newStatus });
  };

  const handlePlanChange = (newPlan) => {
    onUpdate({ ...school, plan: newPlan, mrr: PLANS[newPlan].price });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div 
            className="rounded-t-2xl p-6 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${school.primaryColor}, ${school.primaryColor}dd)` }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-24 -mt-24" />
            
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                  {school.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{school.name}</h2>
                  <p className="text-white/80 text-sm flex items-center gap-1">
                    <Globe size={14} />
                    {school.slug}.schoolhub.app
                    <button className="ml-2 p-1 hover:bg-white/20 rounded transition-colors">
                      <ExternalLink size={14} />
                    </button>
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-6">
              {['details', 'branding', 'subscription', 'danger'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <InfoBlock label="Admin Name" value={school.adminName} />
                  <InfoBlock label="Admin Email" value={school.adminEmail} />
                  <InfoBlock label="Phone" value={school.phone} />
                  <InfoBlock label="Created" value={new Date(school.createdAt).toLocaleDateString()} />
                  <InfoBlock label="Students" value={school.students} />
                  <InfoBlock label="Teachers" value={school.teachers} />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Status</label>
                  <div className="flex gap-2">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = school.status === key;
                      const colors = {
                        emerald: isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                        blue: isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                        red: isActive ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
                        amber: isActive ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
                      };
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${colors[config.color]}`}
                        >
                          <Icon size={14} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">School Logo</label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                      style={{ backgroundColor: school.primaryColor }}
                    >
                      {school.logo ? <img src={school.logo} alt="" className="w-full h-full object-cover rounded-xl" /> : school.name.charAt(0)}
                    </div>
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <Upload size={16} />
                      Upload Logo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      value={school.primaryColor}
                      onChange={(e) => onUpdate({ ...school, primaryColor: e.target.value })}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
                    />
                    <input 
                      type="text" 
                      value={school.primaryColor}
                      onChange={(e) => onUpdate({ ...school, primaryColor: e.target.value })}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Subdomain</label>
                  <div className="flex items-center">
                    <input 
                      type="text" 
                      value={school.slug}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-l-lg text-sm"
                    />
                    <span className="px-4 py-2.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-lg text-sm text-gray-500">
                      .schoolhub.app
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-3">Plan</label>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(PLANS).map(([key, planInfo]) => {
                      const isActive = school.plan === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handlePlanChange(key)}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            isActive 
                              ? 'border-violet-500 bg-violet-50' 
                              : 'border-gray-200 hover:border-violet-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">{planInfo.name}</span>
                            {isActive && <Check size={18} className="text-violet-600" />}
                          </div>
                          <p className="text-2xl font-bold text-gray-900">€{planInfo.price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
                          <p className="text-xs text-gray-500 mt-1">
                            Up to {planInfo.students === 999 ? '∞' : planInfo.students} students
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Monthly Revenue</p>
                      <p className="text-sm text-gray-500">Current billing amount</p>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">€{school.mrr}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'danger' && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-semibold text-red-800 mb-1">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-4">These actions are irreversible. Please be careful.</p>
                  
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Power size={16} />
                        <span>Suspend School</span>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                    <button className="w-full flex items-center justify-between px-4 py-3 bg-white border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Trash2 size={16} />
                        <span>Delete School</span>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoBlock = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
  </div>
);

const AddSchoolModal = ({ onClose, onAdd }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    phone: '',
    plan: 'pro',
    primaryColor: '#8b5cf6',
  });

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    // Auto-generate slug from name
    if (key === 'name') {
      const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setForm(prev => ({ ...prev, slug }));
    }
  };

  const handleCreate = () => {
    const newSchool = {
      id: Date.now().toString(),
      ...form,
      logo: null,
      status: 'pending',
      students: 0,
      teachers: 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastActive: null,
      mrr: PLANS[form.plan].price,
    };
    onAdd(newSchool);
  };

  const steps = [
    { title: 'School Info', icon: Building2 },
    { title: 'Admin Account', icon: Users },
    { title: 'Plan & Branding', icon: Palette },
  ];

  const canProceed = () => {
    if (step === 0) return form.name && form.slug;
    if (step === 1) return form.adminName && form.adminEmail;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add New School</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-2">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isPast = i < step;
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <div className={`flex-1 h-0.5 ${isPast ? 'bg-white/60' : 'bg-white/20'}`} />}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      isActive ? 'bg-white/25' : isPast ? 'bg-white/15' : 'opacity-40'
                    }`}>
                      <Icon size={14} />
                      {s.title}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">School Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g. Cambridge Academy Belgrade"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Subdomain *</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => updateField('slug', e.target.value)}
                      placeholder="cambridge-belgrade"
                      className="flex-1 px-4 py-3 rounded-l-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                    />
                    <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl text-sm text-gray-500">
                      .schoolhub.app
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+381 11 123 4567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Admin Name *</label>
                  <input
                    type="text"
                    value={form.adminName}
                    onChange={(e) => updateField('adminName', e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Admin Email *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => updateField('adminEmail', e.target.value)}
                    placeholder="admin@school.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">An invitation email will be sent to this address</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Plan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(PLANS).map(([key, planInfo]) => (
                      <button
                        key={key}
                        onClick={() => updateField('plan', key)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          form.plan === key 
                            ? 'border-violet-500 bg-violet-50' 
                            : 'border-gray-200 hover:border-violet-200'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{planInfo.name}</p>
                        <p className="text-lg font-bold text-gray-900">€{planInfo.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={(e) => updateField('primaryColor', e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200"
                    />
                    <div className="flex gap-2">
                      {['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899'].map(color => (
                        <button
                          key={color}
                          onClick={() => updateField('primaryColor', color)}
                          className={`w-8 h-8 rounded-lg ${form.primaryColor === color ? 'ring-2 ring-offset-2 ring-violet-500' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="rotate-180" size={16} />
                  Back
                </button>
              ) : <div />}

              {step < 2 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-1 px-5 py-2.5 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-600 disabled:opacity-40 transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1 px-5 py-2.5 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-600 transition-colors"
                >
                  <Check size={16} />
                  Create School
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
