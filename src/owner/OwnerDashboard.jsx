import React, { useState, useEffect } from 'react';
import { supabase } from '../core/infrastructure/supabaseClient';
import { useAuth } from '../core/context/AuthContext';

import BrandingSettings from './BrandingSettings';
import {
  Building2, Users, GraduationCap, TrendingUp,
  Plus, Search, Filter, MoreVertical, Edit2, Trash2,
  ExternalLink, CheckCircle, XCircle, Clock, AlertCircle,
  DollarSign, Calendar, Mail, Phone, Globe, Palette,
  ChevronRight, X, Upload, Eye, EyeOff, Sparkles,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight,
  Settings
} from 'lucide-react';

// ============================================================================
// OWNER DASHBOARD - Upravljanje svim školama
// ============================================================================

const OwnerDashboard = () => {
  const { user, signOut } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load schools
  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      
      // Učitaj škole sa statistikama
      const { data: schoolsData, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Za svaku školu učitaj broj učenika
      const schoolsWithStats = await Promise.all(
        (schoolsData || []).map(async (school) => {
          const { count: studentCount } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id);

          const { count: teacherCount } = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id);

          return {
            ...school,
            student_count: studentCount || 0,
            teacher_count: teacherCount || 0
          };
        })
      );

      setSchools(schoolsWithStats);
    } catch (err) {
      console.error('Error loading schools:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter schools
  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || school.plan === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Stats
  const stats = {
    total: schools.length,
    active: schools.filter(s => s.status === 'active').length,
    trial: schools.filter(s => s.status === 'trial').length,
    totalStudents: schools.reduce((sum, s) => sum + (s.student_count || 0), 0),
    totalTeachers: schools.reduce((sum, s) => sum + (s.teacher_count || 0), 0),
    mrr: schools.reduce((sum, s) => {
      if (s.status !== 'active') return sum;
      const prices = { basic: 300, pro: 500, enterprise: 800 };
      return sum + (prices[s.plan] || 0);
    }, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">SchoolHub</h1>
                <p className="text-xs text-slate-400">Owner Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-slate-400">Platform Owner</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Building2}
            label="Total Schools"
            value={stats.total}
            color="violet"
          />
          <StatCard
            icon={CheckCircle}
            label="Active"
            value={stats.active}
            color="emerald"
          />
          <StatCard
            icon={Clock}
            label="On Trial"
            value={stats.trial}
            color="amber"
          />
          <StatCard
            icon={GraduationCap}
            label="Students"
            value={stats.totalStudents}
            color="blue"
          />
          <StatCard
            icon={Users}
            label="Teachers"
            value={stats.totalTeachers}
            color="cyan"
          />
          <StatCard
            icon={DollarSign}
            label="MRR"
            value={`€${stats.mrr}`}
            color="green"
            highlight
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="all">All Plans</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Add School</span>
            </button>
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No schools found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm ? 'Try a different search term' : 'Add your first school to get started'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all"
            >
              Add School
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSchools.map(school => (
              <SchoolCard
                key={school.id}
                school={school}
                onBranding={() => {
                  setSelectedSchool(school);
                  setShowBrandingModal(true);
                }}
                onDelete={() => {
                  setSelectedSchool(school);
                  setShowDeleteConfirm(true);
                }}
                onVisit={() => {
                  window.open(`/?school=${school.slug}`, '_blank');
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add School Modal */}
      {showAddModal && (
        <AddSchoolModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSchools();
          }}
        />
      )}

      {/* Branding Settings Modal */}
      {showBrandingModal && selectedSchool && (
        <BrandingSettings
          school={selectedSchool}
          onClose={() => {
            setShowBrandingModal(false);
            setSelectedSchool(null);
          }}
          onSave={() => {
            setShowBrandingModal(false);
            setSelectedSchool(null);
            loadSchools();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedSchool && (
        <DeleteConfirmModal
          school={selectedSchool}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedSchool(null);
          }}
          onConfirm={async () => {
            try {
              await supabase.from('schools').delete().eq('id', selectedSchool.id);
              setShowDeleteConfirm(false);
              setSelectedSchool(null);
              loadSchools();
            } catch (err) {
              console.error('Error deleting school:', err);
            }
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard = ({ icon: Icon, label, value, color, highlight }) => {
  const colors = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  };

  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colors[color]} border backdrop-blur-sm ${highlight ? 'ring-2 ring-green-500/50' : ''}`}>
      <Icon className={`w-5 h-5 mb-2 ${colors[color].split(' ').pop()}`} />
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
};

// ============================================================================
// SCHOOL CARD - Sa Settings dugmetom
// ============================================================================

const SchoolCard = ({ school, onBranding, onDelete, onVisit }) => {
  const statusColors = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    trial: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const planBadges = {
    basic: 'bg-slate-600 text-slate-200',
    pro: 'bg-violet-600 text-violet-100',
    enterprise: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
  };

  const planPrices = { basic: 300, pro: 500, enterprise: 800 };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-violet-500/30 transition-all group">
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: school.primary_color || '#6366f1' }}
        >
          {school.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
          ) : (
            school.name.charAt(0)
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white truncate">{school.name}</h3>
              <p className="text-sm text-slate-400">{school.slug}.schoolhub.akio.rs</p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[school.status]}`}>
                {school.status}
              </span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${planBadges[school.plan]}`}>
                {school.plan}
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap size={16} className="text-slate-400" />
              <span className="text-white font-medium">{school.student_count || 0}</span>
              <span className="text-slate-400">students</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users size={16} className="text-slate-400" />
              <span className="text-white font-medium">{school.teacher_count || 0}</span>
              <span className="text-slate-400">teachers</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={16} className="text-slate-400" />
              <span className="text-white font-medium">€{planPrices[school.plan]}</span>
              <span className="text-slate-400">/mo</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onVisit}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
            title="Visit School"
          >
            <ExternalLink size={18} />
          </button>
          <button
            onClick={onBranding}
            className="p-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all"
            title="Branding & Settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            title="Delete School"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ADD SCHOOL MODAL
// ============================================================================

const AddSchoolModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
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
    accent_color: '#f59e0b',
    // Default features
    features: {
      homework: true,
      attendance: true,
      parent_portal: true,
      admissions: true,
      report_cards: true,
      messaging: false,
      calendar: true,
      custom_branding: true,
      pdf_branding: true,
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from name
      ...(name === 'name' ? { slug: value.toLowerCase().replace(/[^a-z0-9]/g, '') } : {})
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate
      if (!formData.name || !formData.slug || !formData.email) {
        setError('Please fill in all required fields');
        return;
      }

      // Check if slug is unique
      const { data: existing } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', formData.slug)
        .single();

      if (existing) {
        setError('This subdomain is already taken');
        return;
      }

      // Create school with all fields
      const { error: insertError } = await supabase
        .from('schools')
        .insert([{
          ...formData,
          pdf_header_text: formData.name,
          grading_system: 'cambridge',
          academic_year: '2025-26',
          default_language: 'en',
          show_logo_in_pdf: true,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error creating school:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Add New School</h2>
            <p className="text-sm text-slate-400">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2 px-6 pt-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-violet-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">School Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">School Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Green School by Chartwell"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subdomain *</label>
                <div className="flex">
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="greenschool"
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-l-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <span className="px-4 py-3 bg-slate-700 border border-l-0 border-slate-600 rounded-r-xl text-slate-400 text-sm">
                    .schoolhub.akio.rs
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@school.com"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+381 11 123 4567"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Belgrade"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Plan & Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Select Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'basic', name: 'Basic', price: '€300', features: '50 students' },
                    { id: 'pro', name: 'Pro', price: '€500', features: '200 students' },
                    { id: 'enterprise', name: 'Enterprise', price: '€800', features: 'Unlimited' },
                  ].map(plan => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, plan: plan.id }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.plan === plan.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <p className="font-semibold text-white">{plan.name}</p>
                      <p className="text-lg font-bold text-violet-400">{plan.price}</p>
                      <p className="text-xs text-slate-400">{plan.features}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Initial Status</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'trial', name: 'Trial', desc: '14-day free trial' },
                    { id: 'active', name: 'Active', desc: 'Start billing now' },
                  ].map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: status.id }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.status === status.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <p className="font-semibold text-white">{status.name}</p>
                      <p className="text-xs text-slate-400">{status.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Branding</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="w-12 h-12 rounded-lg border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleChange}
                    className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-slate-900/50 rounded-xl">
                <p className="text-sm text-slate-400 mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    {formData.name.charAt(0) || 'S'}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{formData.name || 'School Name'}</p>
                    <p className="text-sm text-slate-400">{formData.slug || 'subdomain'}.schoolhub.akio.rs</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-4">
                💡 You can customize logo, favicon, PDF branding, and more after creating the school.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2.5 text-slate-400 hover:text-white transition-all"
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </button>

          <button
            onClick={() => step < 3 ? setStep(step + 1) : handleSubmit()}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : step < 3 ? (
              <>
                Next
                <ChevronRight size={18} />
              </>
            ) : (
              'Create School'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DELETE CONFIRM MODAL
// ============================================================================

const DeleteConfirmModal = ({ school, onClose, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Delete School</h3>
          <p className="text-slate-400">
            Are you sure you want to delete <strong className="text-white">{school.name}</strong>?
            This action cannot be undone.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">
            Type <strong className="text-white">{school.slug}</strong> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
            placeholder={school.slug}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmText !== school.slug || loading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;