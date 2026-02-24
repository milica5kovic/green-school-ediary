import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus, Search, ChevronRight, X, Eye, Save, FileText, Calendar, Clock, 
  CheckCircle, XCircle, Mail, Phone, Heart, Users, GraduationCap,
  Edit3, Trash2, RefreshCw, MessageSquare, Check, ChevronLeft, Download, 
  TrendingUp, Building, ArrowRight, Settings, LogOut, ChevronDown, ChevronUp, 
  Info, AlertCircle, Layers, SplitSquareHorizontal
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';

// Constants
const STATUSES = {
  inquiry: { label: 'Inquiry', color: 'gray', icon: MessageSquare },
  documents: { label: 'Documents', color: 'blue', icon: FileText },
  under_review: { label: 'Review', color: 'purple', icon: Eye },
  interview: { label: 'Interview', color: 'indigo', icon: Users },
  accepted: { label: 'Accepted', color: 'emerald', icon: CheckCircle },
  waitlisted: { label: 'Waitlisted', color: 'amber', icon: Clock },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  enrolled: { label: 'Enrolled', color: 'teal', icon: GraduationCap },
  withdrawn: { label: 'Withdrawn', color: 'slate', icon: X },
};

const STATUS_COLORS = {
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const PIPELINE_STAGES = ['inquiry', 'documents', 'under_review', 'interview', 'accepted', 'enrolled'];
const YEAR_GROUPS = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9'];
const RELATIONSHIPS = ['Mother', 'Father', 'Guardian', 'Grandmother', 'Grandfather', 'Other'];
const DOCS_CHECKLIST = [
  { key: 'birth_certificate', label: 'Birth Certificate', required: true },
  { key: 'passport_copy', label: 'Passport / ID Copy', required: true },
  { key: 'previous_reports', label: 'Previous School Reports', required: false },
  { key: 'medical_records', label: 'Medical Records', required: false },
  { key: 'photos', label: 'Passport Photos (2x)', required: true },
];

const NEXT_YEAR = '2026-2027';

// Main Component
const AdmissionsPortal = () => {
  const { supabase } = useApp();
  const [applications, setApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({ defaultCapacity: 20, capacityOverrides: {} });
  const [leavingStudents, setLeavingStudents] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProjections, setShowProjections] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [appsRes, studentsRes, classesRes] = await Promise.all([
        supabase.from('enrollment_applications').select('*').eq('academic_year', NEXT_YEAR).order('created_at', { ascending: false }),
        supabase.from('students').select('*').eq('status', 'active').order('class_name'),
        supabase.from('custom_classes').select('*').eq('is_active', true).order('class_name'),
      ]);
      setApplications(appsRes.data || []);
      setStudents(studentsRes.data || []);
      setClasses(classesRes.data || []);
      const leaving = new Set();
      (appsRes.data || []).forEach(app => {
        if (app.is_returning_student && app.status === 'withdrawn' && app.current_student_id) leaving.add(app.current_student_id);
      });
      setLeavingStudents(leaving);
      const saved = localStorage.getItem('admissions_settings');
      if (saved) setSettings(JSON.parse(saved));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const getCapacity = useCallback((cn) => {
    const base = cn?.match(/^Y\d+/)?.[0] || cn;
    return settings.capacityOverrides[base] ?? settings.defaultCapacity;
  }, [settings]);

  const newApplications = useMemo(() => applications.filter(a => !a.is_returning_student), [applications]);

  const stats = useMemo(() => ({
    total: newApplications.length,
    pending: newApplications.filter(a => !['accepted', 'enrolled', 'rejected', 'withdrawn'].includes(a.status)).length,
    accepted: newApplications.filter(a => a.status === 'accepted').length,
    enrolled: newApplications.filter(a => a.status === 'enrolled').length,
    rejected: newApplications.filter(a => a.status === 'rejected').length,
    waitlisted: newApplications.filter(a => a.status === 'waitlisted').length,
  }), [newApplications]);

  const capacityByYear = useMemo(() => {
    const result = {};
    YEAR_GROUPS.forEach(year => {
      const capacity = getCapacity(year);
      const sourceYear = year === 'Y1' ? null : `Y${parseInt(year.slice(1)) - 1}`;
      const promotingIn = sourceYear ? students.filter(s => {
        const sy = s.class_name?.match(/^Y\d+/)?.[0];
        return sy === sourceYear && !leavingStudents.has(s.id) && sy !== 'Y9';
      }).length : 0;
      const newEnrolled = newApplications.filter(a => a.applying_for_class?.startsWith(year) && ['accepted', 'enrolled'].includes(a.status));
      const newPending = newApplications.filter(a => a.applying_for_class?.startsWith(year) && !['accepted', 'enrolled', 'rejected', 'withdrawn'].includes(a.status));
      const totalProjected = promotingIn + newEnrolled.length;
      const needsSplit = totalProjected > capacity;
      let sections = [];
      if (needsSplit) {
        const num = Math.ceil(totalProjected / capacity);
        for (let i = 0; i < num; i++) {
          const letter = String.fromCharCode(65 + i);
          const sn = `${year}${letter}`;
          sections.push({ name: sn, capacity, assigned: newEnrolled.filter(a => a.applying_for_class === sn).length });
        }
        if (sections.every(s => s.assigned === 0)) sections = [{ name: `${year}A`, capacity, assigned: 0 }, { name: `${year}B`, capacity, assigned: 0 }];
      }
      result[year] = { capacity, promotingIn, newEnrolled: newEnrolled.length, newEnrolledList: newEnrolled, newPending: newPending.length, totalProjected, spotsLeft: Math.max(0, capacity - totalProjected), needsSplit, sections };
    });
    return result;
  }, [students, newApplications, leavingStudents, getCapacity]);

  const filteredApps = useMemo(() => {
    let r = newApplications;
    if (searchQuery) { const q = searchQuery.toLowerCase(); r = r.filter(a => a.student_name?.toLowerCase().includes(q) || a.parent_name?.toLowerCase().includes(q) || a.parent_email?.toLowerCase().includes(q)); }
    if (statusFilter !== 'all') r = r.filter(a => a.status === statusFilter);
    if (classFilter !== 'all') r = r.filter(a => a.applying_for_class?.startsWith(classFilter));
    return r;
  }, [newApplications, searchQuery, statusFilter, classFilter]);

  const updateAppStatus = async (id, status) => {
    if (!supabase) return;
    const upd = { status, updated_at: new Date().toISOString() };
    if (status === 'enrolled') upd.decision_date = new Date().toISOString().split('T')[0];
    await supabase.from('enrollment_applications').update(upd).eq('id', id);
    setApplications(p => p.map(a => a.id === id ? { ...a, ...upd } : a));
    if (selectedApp?.id === id) setSelectedApp(p => p ? { ...p, ...upd } : null);
  };

  const updateApp = async (id, upd) => {
    if (!supabase) return;
    upd.updated_at = new Date().toISOString();
    await supabase.from('enrollment_applications').update(upd).eq('id', id);
    setApplications(p => p.map(a => a.id === id ? { ...a, ...upd } : a));
    if (selectedApp?.id === id) setSelectedApp(p => p ? { ...p, ...upd } : null);
  };

  const deleteApp = async (id) => {
    if (!supabase || !window.confirm('Delete this application?')) return;
    await supabase.from('enrollment_applications').delete().eq('id', id);
    setApplications(p => p.filter(a => a.id !== id));
    setSelectedApp(null);
  };

  const saveNewApp = async (fd) => {
    if (!supabase) return;
    const payload = { ...fd, academic_year: NEXT_YEAR, status: fd.status || 'inquiry', is_returning_student: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    if (editingApp) {
      await supabase.from('enrollment_applications').update(payload).eq('id', editingApp.id);
      setApplications(p => p.map(a => a.id === editingApp.id ? { ...a, ...payload } : a));
    } else {
      const { data } = await supabase.from('enrollment_applications').insert(payload).select().single();
      if (data) setApplications(p => [data, ...p]);
    }
    setShowAppForm(false);
    setEditingApp(null);
  };

  const toggleStudentLeaving = async (sid) => {
    if (!supabase) return;
    const isL = leavingStudents.has(sid);
    const st = students.find(s => s.id === sid);
    if (!st) return;
    if (isL) {
      setLeavingStudents(p => { const n = new Set(p); n.delete(sid); return n; });
      const app = applications.find(a => a.is_returning_student && a.current_student_id === sid);
      if (app) { await supabase.from('enrollment_applications').delete().eq('id', app.id); setApplications(p => p.filter(a => a.id !== app.id)); }
    } else {
      setLeavingStudents(p => new Set([...p, sid]));
      const cy = parseInt(st.class_name?.match(/Y(\d+)/)?.[1] || 0);
      await supabase.from('enrollment_applications').insert({ student_name: st.name, current_student_id: sid, current_class: st.class_name, applying_for_class: `Y${cy + 1}`, status: 'withdrawn', is_returning_student: true, academic_year: NEXT_YEAR, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      await loadData();
    }
  };

  const saveSettings = async (ns) => {
    setSettings(ns);
    localStorage.setItem('admissions_settings', JSON.stringify(ns));
    if (supabase) {
      for (const [cn, cap] of Object.entries(ns.capacityOverrides)) {
        const cls = classes.find(c => c.class_name === cn);
        if (cls) await supabase.from('custom_classes').update({ max_students: cap }).eq('id', cls.id);
      }
    }
    setShowSettings(false);
  };

  const exportCSV = () => {
    const h = 'Student,DOB,Gender,Class,Parent1,Phone1,Email1,Parent2,Phone2,Status,Created';
    const rows = newApplications.map(a => [`"${a.student_name||''}"`, a.date_of_birth||'', a.gender||'', a.applying_for_class||'', `"${a.parent_name||''}"`, a.parent_phone||'', a.parent_email||'', `"${a.parent2_name||''}"`, a.parent2_phone||'', a.status||'', a.created_at?new Date(a.created_at).toLocaleDateString('en-GB'):''].join(','));
    const blob = new Blob([[h, ...rows].join('\n')], { type: 'text/csv' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = `admissions_${NEXT_YEAR}.csv`;
    el.click();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <Header stats={stats} onExport={exportCSV} onNewApp={() => { setEditingApp(null); setShowAppForm(true); }} onSettings={() => setShowSettings(true)} onProjections={() => setShowProjections(true)} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} counts={{ applications: filteredApps.length, pipeline: newApplications.filter(a => PIPELINE_STAGES.includes(a.status)).length }} />
      
      {activeTab === 'applications' && <ApplicationsTab applications={filteredApps} searchQuery={searchQuery} onSearchChange={setSearchQuery} statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} classFilter={classFilter} onClassFilterChange={setClassFilter} capacityByYear={capacityByYear} onSelect={setSelectedApp} onEdit={a => { setEditingApp(a); setShowAppForm(true); }} onDelete={deleteApp} />}
      {activeTab === 'pipeline' && <PipelineTab applications={newApplications} onSelect={setSelectedApp} />}
      {activeTab === 'capacity' && <CapacityTab capacityByYear={capacityByYear} settings={settings} onEditSettings={() => setShowSettings(true)} onAssignSection={(id, sec) => updateApp(id, { applying_for_class: sec })} />}
      
      {selectedApp && <DetailModal app={selectedApp} capacityByYear={capacityByYear} onClose={() => setSelectedApp(null)} onUpdateStatus={updateAppStatus} onUpdate={updateApp} onDelete={deleteApp} onEdit={() => { setEditingApp(selectedApp); setShowAppForm(true); setSelectedApp(null); }} />}
      {showAppForm && <AppFormModal initialData={editingApp} capacityByYear={capacityByYear} onSave={saveNewApp} onClose={() => { setShowAppForm(false); setEditingApp(null); }} />}
      {showSettings && <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setShowSettings(false)} />}
      {showProjections && <ProjectionsModal students={students} leavingStudents={leavingStudents} capacityByYear={capacityByYear} onToggleLeaving={toggleStudentLeaving} onClose={() => setShowProjections(false)} />}
    </div>
  );
};

// Header
const Header = ({ stats, onExport, onNewApp, onSettings, onProjections }) => (
  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-5 text-white relative overflow-hidden">
    <div className="absolute top-0 right-0 w-56 h-56 bg-white opacity-5 rounded-full -mr-28 -mt-28" />
    <div className="relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div><p className="text-emerald-100 text-xs font-medium">{NEXT_YEAR} Enrollment</p><h1 className="text-xl font-bold">New Student Admissions</h1></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onProjections} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/30"><TrendingUp size={14} />Projections</button>
          <button onClick={onSettings} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/30"><Settings size={14} />Capacity</button>
          <button onClick={onExport} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/30"><Download size={14} />Export</button>
          <button onClick={onNewApp} className="bg-white text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-50 shadow-md"><UserPlus size={14} />New Application</button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[{l:'Total',v:stats.total,i:FileText},{l:'In Progress',v:stats.pending,i:Clock},{l:'Accepted',v:stats.accepted,i:CheckCircle},{l:'Enrolled',v:stats.enrolled,i:GraduationCap},{l:'Waitlisted',v:stats.waitlisted,i:AlertCircle},{l:'Rejected',v:stats.rejected,i:XCircle}].map(s=>{const I=s.i;return<div key={s.l} className="bg-white/10 rounded-xl p-2.5 border border-white/20 text-center"><I size={14} className="mx-auto text-white/70 mb-1"/><p className="text-xl font-bold">{s.v}</p><p className="text-[9px] text-emerald-100">{s.l}</p></div>})}
      </div>
    </div>
  </div>
);

// TabBar
const TabBar = ({ activeTab, onTabChange, counts }) => (
  <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
    {[{id:'applications',l:'Applications',i:UserPlus,b:counts.applications},{id:'pipeline',l:'Pipeline',i:ArrowRight,b:counts.pipeline},{id:'capacity',l:'Capacity & Sections',i:Layers}].map(t=>{const I=t.i;const a=activeTab===t.id;return<button key={t.id} onClick={()=>onTabChange(t.id)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${a?'bg-white shadow-sm text-emerald-700':'text-gray-500 hover:text-gray-700 hover:bg-white/50'}`}><I size={16}/><span>{t.l}</span>{t.b>0&&<span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${a?'bg-emerald-100 text-emerald-700':'bg-gray-200 text-gray-600'}`}>{t.b}</span>}</button>})}
  </div>
);

// ApplicationsTab
const ApplicationsTab = ({ applications, searchQuery, onSearchChange, statusFilter, onStatusFilterChange, classFilter, onClassFilterChange, capacityByYear, onSelect, onEdit, onDelete }) => (
  <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="text" placeholder="Search..." value={searchQuery} onChange={e=>onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/></div>
      <select value={statusFilter} onChange={e=>onStatusFilterChange(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"><option value="all">All Statuses</option>{Object.entries(STATUSES).map(([k,{label}])=><option key={k} value={k}>{label}</option>)}</select>
      <select value={classFilter} onChange={e=>onClassFilterChange(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"><option value="all">All Classes</option>{YEAR_GROUPS.map(y=><option key={y} value={y}>{y} ({capacityByYear[y]?.spotsLeft||0} spots)</option>)}</select>
    </div>
    {applications.length===0?<div className="bg-white rounded-2xl border border-gray-200 p-12 text-center"><UserPlus size={48} className="mx-auto text-gray-300 mb-4"/><h3 className="text-lg font-semibold text-gray-700 mb-1">No Applications Found</h3></div>:
    <div className="grid gap-3">{applications.map(app=>{const st=STATUSES[app.status]||STATUSES.inquiry;const c=STATUS_COLORS[st.color];const I=st.icon;return<div key={app.id} onClick={()=>onSelect(app)} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all">
      <div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-2"><h3 className="text-base font-semibold text-gray-800 truncate">{app.student_name}</h3><span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">{app.applying_for_class||'—'}</span><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}><I size={10}/>{st.label}</span></div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm"><div className="flex items-center gap-2 text-gray-600"><Users size={12} className="text-gray-400"/><span className="truncate">{app.parent_name||'—'}{app.parent2_name&&<span className="text-gray-400"> & {app.parent2_name}</span>}</span></div><div className="flex items-center gap-2 text-gray-500"><Mail size={12} className="text-gray-400"/><span className="truncate">{app.parent_email||'—'}</span></div><div className="flex items-center gap-2 text-gray-500"><Phone size={12} className="text-gray-400"/>{app.parent_phone||'—'}</div><div className="flex items-center gap-2 text-gray-400 text-xs"><Calendar size={12}/>{app.created_at?new Date(app.created_at).toLocaleDateString('en-GB'):'—'}</div></div></div>
      <div className="flex items-center gap-1" onClick={e=>e.stopPropagation()}><button onClick={()=>onEdit(app)} className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"><Edit3 size={16}/></button><button onClick={()=>onDelete(app.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button></div></div>
    </div>})}</div>}
  </div>
);

// PipelineTab
const PipelineTab = ({ applications, onSelect }) => (
  <div className="overflow-x-auto pb-4"><div className="grid gap-3" style={{gridTemplateColumns:`repeat(${PIPELINE_STAGES.length},minmax(200px,1fr))`}}>
    {PIPELINE_STAGES.map(stage=>{const st=STATUSES[stage];const c=STATUS_COLORS[st.color];const items=applications.filter(a=>a.status===stage);const I=st.icon;return<div key={stage} className="min-w-[200px]">
      <div className={`${c.bg} rounded-xl p-3 mb-3`}><div className="flex items-center justify-between"><div className="flex items-center gap-2"><I size={14} className={c.text}/><span className={`text-sm font-bold ${c.text}`}>{st.label}</span></div><span className={`text-xs font-bold ${c.text} bg-white/60 px-2 py-0.5 rounded-full`}>{items.length}</span></div></div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">{items.map(app=><div key={app.id} onClick={()=>onSelect(app)} className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md cursor-pointer"><p className="text-sm font-semibold text-gray-800 truncate">{app.student_name}</p><p className="text-xs text-emerald-600 font-medium">{app.applying_for_class||'—'}</p><p className="text-xs text-gray-400 truncate mt-1">{app.parent_name}</p></div>)}{items.length===0&&<div className="text-center py-8 text-xs text-gray-300">—</div>}</div>
    </div>})}
  </div></div>
);

// CapacityTab
const CapacityTab = ({ capacityByYear, settings, onEditSettings, onAssignSection }) => (
  <div className="space-y-5">
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3"><Info size={18} className="text-blue-600 mt-0.5"/><div><p className="text-sm font-medium text-blue-800">Capacity & Section Management</p><p className="text-xs text-blue-600 mt-0.5">Default: <strong>{settings.defaultCapacity}</strong> per class. Classes exceeding capacity split into sections.</p></div></div>
      <button onClick={onEditSettings} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5"><Settings size={14}/>Edit</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {YEAR_GROUPS.map(year=>{const cap=capacityByYear[year];const pct=cap.capacity>0?Math.round((cap.totalProjected/cap.capacity)*100):0;const full=cap.spotsLeft<=0;const near=pct>=80;return<div key={year} className={`bg-white rounded-2xl border-2 p-4 ${cap.needsSplit?'border-amber-300 shadow-amber-100 shadow-md':full?'border-red-300':near?'border-amber-200':'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-3"><h3 className="text-2xl font-bold text-gray-800">{year}</h3>{cap.needsSplit&&<span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1"><SplitSquareHorizontal size={10}/>SPLIT</span>}{full&&!cap.needsSplit&&<span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">FULL</span>}</div>
        <div className="mb-4"><div className="flex justify-between text-xs text-gray-500 mb-1"><span>{cap.totalProjected} projected</span><span>max {cap.capacity}</span></div><div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${full?'bg-red-500':near?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${Math.min(100,pct)}%`}}/></div></div>
        <div className="grid grid-cols-3 gap-2 mb-3"><div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-blue-700">{cap.promotingIn}</p><p className="text-[9px] text-blue-600">Returning</p></div><div className="bg-emerald-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-emerald-700">{cap.newEnrolled}</p><p className="text-[9px] text-emerald-600">New</p></div><div className="bg-amber-50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-amber-700">{cap.newPending}</p><p className="text-[9px] text-amber-600">Pending</p></div></div>
        {cap.needsSplit&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3"><p className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5"><SplitSquareHorizontal size={12}/>Section Assignment</p><div className="space-y-2">{cap.sections.map(s=><div key={s.name} className="bg-white rounded-lg p-2 border border-amber-200 flex items-center justify-between"><span className="text-sm font-bold text-gray-800">{s.name}</span><span className="text-xs text-gray-500">{s.assigned}/{s.capacity}</span></div>)}</div>
          {cap.newEnrolledList.filter(a=>!a.applying_for_class?.match(/[A-Z]$/)).length>0&&<div className="mt-3 pt-3 border-t border-amber-200"><p className="text-[10px] font-semibold text-amber-700 mb-2">Unassigned:</p>{cap.newEnrolledList.filter(a=>!a.applying_for_class?.match(/[A-Z]$/)).map(app=><div key={app.id} className="flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-amber-100 mb-1"><span className="text-xs text-gray-700">{app.student_name}</span><div className="flex gap-1">{cap.sections.map(sec=><button key={sec.name} onClick={()=>onAssignSection(app.id,sec.name)} className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded hover:bg-amber-200">{sec.name}</button>)}</div></div>)}</div>}
        </div>}
        {!cap.needsSplit&&<p className={`text-xs text-center ${cap.spotsLeft>0?'text-gray-500':'text-red-600 font-medium'}`}>{cap.spotsLeft>0?`${cap.spotsLeft} spots available`:'No spots'}</p>}
      </div>})}
    </div>
  </div>
);

// DetailModal
const DetailModal = ({ app, capacityByYear, onClose, onUpdateStatus, onUpdate, onDelete, onEdit }) => {
  const [notes, setNotes] = useState(app.admin_notes || '');
  const [intNotes, setIntNotes] = useState(app.interview_notes || '');
  const save = (f, v) => onUpdate(app.id, { [f]: v });
  const toggleDoc = k => { const d = typeof app.documents === 'object' && app.documents ? { ...app.documents } : {}; d[k] = !d[k]; onUpdate(app.id, { documents: d }); };
  const year = app.applying_for_class?.match(/^Y\d+/)?.[0];
  const cap = year ? capacityByYear[year] : null;

  return <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}><div className="min-h-full flex items-start justify-center p-4 py-8"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl" onClick={e=>e.stopPropagation()}>
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-emerald-100 text-xs">New Student Application</p><h2 className="text-xl font-bold mt-0.5">{app.student_name}</h2><div className="flex items-center gap-2 mt-2"><span className="bg-white/20 px-3 py-1 rounded-lg text-sm font-semibold">{app.applying_for_class||'—'}</span>{app.date_of_birth&&<span className="text-emerald-100 text-xs">DOB: {app.date_of_birth}</span>}</div></div><div className="flex gap-2"><button onClick={onEdit} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-lg"><Edit3 size={16}/></button><button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-lg"><X size={16}/></button></div></div></div>
    <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
      <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3">Status</p><div className="flex flex-wrap gap-1.5">{Object.entries(STATUSES).map(([k,s])=>{const c=STATUS_COLORS[s.color];const a=app.status===k;const I=s.icon;return<button key={k} onClick={()=>onUpdateStatus(app.id,k)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-all ${a?`${c.bg} ${c.border} ${c.text} shadow-sm`:'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}><I size={12}/>{s.label}</button>})}</div></div>
      {cap?.needsSplit&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs font-semibold text-amber-700 uppercase mb-2 flex items-center gap-1.5"><SplitSquareHorizontal size={12}/>Assign Section</p><div className="flex gap-2">{cap.sections.map(sec=><button key={sec.name} onClick={()=>onUpdate(app.id,{applying_for_class:sec.name})} className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${app.applying_for_class===sec.name?'bg-amber-500 text-white':'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'}`}>{sec.name}<span className="block text-xs font-normal opacity-70 mt-0.5">{sec.assigned}/{sec.capacity}</span></button>)}</div></div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Users size={12}/>Parent 1</p><IR l="Name" v={app.parent_name}/><IR l="Relationship" v={app.parent_relationship}/><IR l="Phone" v={app.parent_phone} lnk={app.parent_phone?`tel:${app.parent_phone}`:null}/><IR l="Email" v={app.parent_email} lnk={app.parent_email?`mailto:${app.parent_email}`:null}/></div>
        <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Users size={12}/>Parent 2</p><IR l="Name" v={app.parent2_name}/><IR l="Relationship" v={app.parent2_relationship}/><IR l="Phone" v={app.parent2_phone} lnk={app.parent2_phone?`tel:${app.parent2_phone}`:null}/><IR l="Email" v={app.parent2_email} lnk={app.parent2_email?`mailto:${app.parent2_email}`:null}/></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><GraduationCap size={12}/>Student</p><IR l="Gender" v={app.gender}/><IR l="Previous School" v={app.previous_school}/><IR l="Nationality" v={app.nationality}/></div>
        <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Heart size={12}/>Medical</p><IR l="Allergies" v={app.allergies||'None'}/><IR l="Conditions" v={app.medical_conditions||'None'}/><IR l="Medications" v={app.medications||'None'}/></div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><FileText size={12}/>Documents</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{DOCS_CHECKLIST.map(d=>{const docs=typeof app.documents==='object'&&app.documents?app.documents:{};const chk=docs[d.key]===true;return<button key={d.key} onClick={()=>toggleDoc(d.key)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-left ${chk?'bg-emerald-50 text-emerald-700 font-medium border border-emerald-200':'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-100'}`}>{chk?<CheckCircle size={14} className="text-emerald-500"/>:<div className="w-3.5 h-3.5 rounded border-2 border-gray-300"/>}<span className="flex-1">{d.label}</span>{d.required&&!chk&&<span className="text-red-400 text-[10px]">*</span>}</button>})}</div></div>
      <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><Calendar size={12}/>Interview</p><div className="grid grid-cols-2 gap-3 mb-3"><div><label className="text-xs text-gray-500 block mb-1">Date</label><input type="date" value={app.interview_date||''} onChange={e=>onUpdate(app.id,{interview_date:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"/></div><div><label className="text-xs text-gray-500 block mb-1">Time</label><input type="time" value={app.interview_time||''} onChange={e=>onUpdate(app.id,{interview_time:e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"/></div></div><textarea value={intNotes} onChange={e=>setIntNotes(e.target.value)} onBlur={()=>save('interview_notes',intNotes)} placeholder="Interview notes..." rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"/></div>
      <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-1.5"><MessageSquare size={12}/>Admin Notes</p><textarea value={notes} onChange={e=>setNotes(e.target.value)} onBlur={()=>save('admin_notes',notes)} placeholder="Private notes..." rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"/></div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-200"><button onClick={()=>onDelete(app.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"><Trash2 size={14}/>Delete</button><button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Close</button></div>
    </div>
  </div></div></div>;
};

const IR = ({l,v,lnk}) => <div className="flex items-start gap-2 py-1"><span className="text-xs text-gray-400 w-24 flex-shrink-0">{l}</span>{lnk&&v?<a href={lnk} className="text-xs text-emerald-600 hover:underline">{v}</a>:<span className="text-xs text-gray-700">{v||'—'}</span>}</div>;

// AppFormModal - 4 steps with 2 parents required
const AppFormModal = ({ initialData, capacityByYear, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    student_name:'',date_of_birth:'',gender:'',applying_for_class:'',previous_school:'',nationality:'',
    parent_name:'',parent_relationship:'Mother',parent_email:'',parent_phone:'',
    parent2_name:'',parent2_relationship:'Father',parent2_email:'',parent2_phone:'',
    allergies:'',medical_conditions:'',medications:'',notes:'',status:'inquiry',
    ...(initialData||{}),
  });
  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const canNext = () => { if(step===0) return f.student_name&&f.applying_for_class; if(step===1) return f.parent_name&&(f.parent_email||f.parent_phone); if(step===2) return f.parent2_name&&(f.parent2_email||f.parent2_phone); return true; };
  const submit = async () => { setSubmitting(true); await onSave(f); setSubmitting(false); };
  const steps = [{t:'Student',i:GraduationCap},{t:'Parent 1',i:Users},{t:'Parent 2',i:Users},{t:'Medical',i:Heart}];
  const classOpts = YEAR_GROUPS.flatMap(y=>{const c=capacityByYear[y];if(c?.needsSplit) return c.sections.map(s=>({v:s.name,l:`${s.name} (${s.capacity-s.assigned} spots)`,full:s.assigned>=s.capacity}));return[{v:y,l:`${y} (${c?.spotsLeft||0} spots)`,full:c?.spotsLeft<=0}];});

  return <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}><div className="min-h-full flex items-start justify-center p-4 py-8"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e=>e.stopPropagation()}>
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">{initialData?'Edit Application':'New Student Application'}</h2><button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"><X size={16}/></button></div>
      <div className="flex items-center gap-1">{steps.map((s,i)=>{const I=s.i;const a=i===step;const p=i<step;return<React.Fragment key={i}>{i>0&&<div className={`flex-1 h-0.5 ${p?'bg-white/60':'bg-white/20'}`}/>}<button onClick={()=>i<step&&setStep(i)} disabled={i>step} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${a?'bg-white/25':p?'bg-white/15':'opacity-40'}`}><I size={12}/>{s.t}</button></React.Fragment>})}</div>
    </div>
    <div className="p-5">
      {step===0&&<div className="space-y-4"><p className="text-xs font-semibold text-gray-400 uppercase">Student Information</p><FI l="Student Full Name" req v={f.student_name} c={v=>u('student_name',v)} ph="Full name"/><div className="grid grid-cols-2 gap-3"><FI l="Date of Birth" t="date" v={f.date_of_birth} c={v=>u('date_of_birth',v)}/><FS l="Gender" v={f.gender} c={v=>u('gender',v)} o={[{v:'',l:'— Select —'},{v:'Male',l:'Male'},{v:'Female',l:'Female'}]}/></div><FS l="Applying for Class" req v={f.applying_for_class} c={v=>u('applying_for_class',v)} o={[{v:'',l:'— Select Class —'},...classOpts]}/><div className="grid grid-cols-2 gap-3"><FI l="Previous School" v={f.previous_school} c={v=>u('previous_school',v)} ph="School name"/><FI l="Nationality" v={f.nationality} c={v=>u('nationality',v)} ph="e.g. Serbian"/></div></div>}
      {step===1&&<div className="space-y-4"><p className="text-xs font-semibold text-gray-400 uppercase">Parent / Guardian 1</p><FI l="Full Name" req v={f.parent_name} c={v=>u('parent_name',v)} ph="Full name"/><FS l="Relationship" v={f.parent_relationship} c={v=>u('parent_relationship',v)} o={RELATIONSHIPS.map(r=>({v:r,l:r}))}/><div className="grid grid-cols-2 gap-3"><FI l="Phone" req v={f.parent_phone} c={v=>u('parent_phone',v)} ph="+381..."/><FI l="Email" t="email" v={f.parent_email} c={v=>u('parent_email',v)} ph="email@example.com"/></div></div>}
      {step===2&&<div className="space-y-4"><p className="text-xs font-semibold text-gray-400 uppercase">Parent / Guardian 2</p><FI l="Full Name" req v={f.parent2_name} c={v=>u('parent2_name',v)} ph="Full name"/><FS l="Relationship" v={f.parent2_relationship} c={v=>u('parent2_relationship',v)} o={RELATIONSHIPS.map(r=>({v:r,l:r}))}/><div className="grid grid-cols-2 gap-3"><FI l="Phone" req v={f.parent2_phone} c={v=>u('parent2_phone',v)} ph="+381..."/><FI l="Email" t="email" v={f.parent2_email} c={v=>u('parent2_email',v)} ph="email@example.com"/></div></div>}
      {step===3&&<div className="space-y-4"><p className="text-xs font-semibold text-gray-400 uppercase">Medical & Notes</p><FI l="Allergies" v={f.allergies} c={v=>u('allergies',v)} ph="List any or 'None'"/><FI l="Medical Conditions" v={f.medical_conditions} c={v=>u('medical_conditions',v)} ph="Any conditions or 'None'"/><FI l="Medications" v={f.medications} c={v=>u('medications',v)} ph="Current medications or 'None'"/><div><label className="text-xs font-medium text-gray-600 block mb-1.5">Additional Notes</label><textarea value={f.notes||''} onChange={e=>u('notes',e.target.value)} rows={3} placeholder="Any other info..." className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"/></div><FS l="Initial Status" v={f.status} c={v=>u('status',v)} o={Object.entries(STATUSES).map(([k,{label}])=>({v:k,l:label}))}/></div>}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">{step>0?<button onClick={()=>setStep(step-1)} className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100"><ChevronLeft size={16}/>Back</button>:<div/>}{step<3?<button onClick={()=>setStep(step+1)} disabled={!canNext()} className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">Next<ChevronRight size={16}/></button>:<button onClick={submit} disabled={submitting} className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">{submitting?'Saving...':<><Check size={16}/>{initialData?'Update':'Create'}</>}</button>}</div>
    </div>
  </div></div></div>;
};

const FI = ({l,req,t='text',v,c,ph}) => <div><label className="text-xs font-medium text-gray-600 block mb-1.5">{l}{req&&<span className="text-red-400"> *</span>}</label><input type={t} value={v||''} onChange={e=>c(e.target.value)} placeholder={ph} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/></div>;
const FS = ({l,req,v,c,o}) => <div><label className="text-xs font-medium text-gray-600 block mb-1.5">{l}{req&&<span className="text-red-400"> *</span>}</label><select value={v||''} onChange={e=>c(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200">{o.map(opt=><option key={opt.v} value={opt.v} disabled={opt.full}>{opt.l}</option>)}</select></div>;

// SettingsModal
const SettingsModal = ({ settings, onSave, onClose }) => {
  const [def, setDef] = useState(settings.defaultCapacity);
  const [over, setOver] = useState({...settings.capacityOverrides});
  const save = () => { const clean={}; Object.entries(over).forEach(([k,v])=>{if(v&&parseInt(v)!==parseInt(def)) clean[k]=parseInt(v);}); onSave({defaultCapacity:parseInt(def),capacityOverrides:clean}); };
  return <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}><div className="min-h-full flex items-start justify-center p-4 py-8"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
    <div className="p-5 border-b border-gray-200"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-gray-800">Capacity Settings</h2><button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18}/></button></div></div>
    <div className="p-5 space-y-5"><div><label className="text-sm font-medium text-gray-700 block mb-2">Default Class Capacity</label><p className="text-xs text-gray-500 mb-2">Max students per class. Classes exceeding this will split.</p><input type="number" min="1" max="50" value={def} onChange={e=>setDef(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"/></div>
    <div><label className="text-sm font-medium text-gray-700 block mb-2">Class Overrides</label><p className="text-xs text-gray-500 mb-3">Leave empty to use default.</p><div className="grid grid-cols-3 gap-2">{YEAR_GROUPS.map(y=><div key={y}><label className="text-xs text-gray-500 block mb-1 text-center">{y}</label><input type="number" min="1" max="50" value={over[y]||''} onChange={e=>setOver(p=>({...p,[y]:e.target.value}))} placeholder={String(def)} className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"/></div>)}</div></div></div>
    <div className="p-5 border-t border-gray-200 flex justify-end gap-2"><button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button><button onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1.5"><Save size={14}/>Save</button></div>
  </div></div></div>;
};

// ProjectionsModal
const ProjectionsModal = ({ students, leavingStudents, capacityByYear, onToggleLeaving, onClose }) => {
  const [exp, setExp] = useState(null);
  const byYear = useMemo(()=>{const r={};YEAR_GROUPS.forEach(y=>{r[y]=students.filter(s=>(s.class_name?.match(/^Y\d+/)?.[0])===y).sort((a,b)=>a.name.localeCompare(b.name));});return r;},[students]);
  return <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}><div className="min-h-full flex items-start justify-center p-4 py-8"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e=>e.stopPropagation()}>
    <div className="p-5 border-b border-gray-200"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-gray-800">Capacity Projections</h2><p className="text-xs text-gray-500 mt-0.5">Mark students leaving to update projections</p></div><button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={18}/></button></div></div>
    <div className="p-5 max-h-[70vh] overflow-y-auto space-y-3">
      {YEAR_GROUPS.map(year=>{const ys=byYear[year]||[];const isE=exp===year;const lc=ys.filter(s=>leavingStudents.has(s.id)).length;const is9=year==='Y9';return<div key={year} className="bg-gray-50 rounded-xl overflow-hidden">
        <button onClick={()=>setExp(isE?null:year)} className="w-full flex items-center justify-between p-4 hover:bg-gray-100"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">{year}</div><div className="text-left"><p className="font-semibold text-gray-800">{ys.length} students</p><p className="text-xs text-gray-500">{is9?'Graduating':`→ Y${parseInt(year.slice(1))+1}`}{lc>0&&!is9&&<span className="text-amber-600 ml-2">{lc} leaving</span>}</p></div></div><div className="flex items-center gap-2">{!is9&&<span className="text-xs text-gray-500">{ys.length-lc} continuing</span>}{isE?<ChevronUp size={18} className="text-gray-400"/>:<ChevronDown size={18} className="text-gray-400"/>}</div></button>
        {isE&&ys.length>0&&<div className="border-t border-gray-200 bg-white">{ys.map(st=>{const il=leavingStudents.has(st.id);return<div key={st.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${il?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600'}`}>{st.name?.charAt(0)}</div><div><p className={`text-sm font-medium ${il?'text-amber-700 line-through':'text-gray-800'}`}>{st.name}</p><p className="text-xs text-gray-500">{st.class_name}</p></div></div>
          {!is9&&<button onClick={()=>onToggleLeaving(st.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${il?'bg-amber-100 text-amber-700 hover:bg-amber-200':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{il?<span className="flex items-center gap-1"><X size={12}/>Leaving</span>:<span className="flex items-center gap-1"><Check size={12}/>Staying</span>}</button>}
          {is9&&<span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1"><GraduationCap size={12}/>Graduating</span>}
        </div>})}</div>}
      </div>})}
    </div>
    <div className="p-5 border-t border-gray-200 flex justify-end"><button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600">Done</button></div>
  </div></div></div>;
};

export default AdmissionsPortal;