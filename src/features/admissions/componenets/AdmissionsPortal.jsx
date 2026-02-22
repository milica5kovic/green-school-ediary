import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus, Search, ChevronRight, X, Eye,
  FileText, Calendar, Clock, CheckCircle, XCircle, Mail,
  Phone, Heart, Users, GraduationCap, ClipboardList, BarChart3,
  Edit3, Trash2, RefreshCw, MessageSquare,
  Check, ChevronLeft, Download, TrendingUp, Building,
  ArrowRight, Settings
} from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';

const STATUSES = {
  inquiry:      { label: 'Inquiry',      bg: 'bg-gray-100',   text: 'text-gray-700',    badge: 'bg-gray-100 text-gray-700',       icon: MessageSquare },
  submitted:    { label: 'Submitted',    bg: 'bg-blue-50',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',       icon: FileText },
  under_review: { label: 'Review',       bg: 'bg-purple-50',  text: 'text-purple-700',  badge: 'bg-purple-100 text-purple-700',   icon: Eye },
  interview:    { label: 'Interview',    bg: 'bg-indigo-50',  text: 'text-indigo-700',  badge: 'bg-indigo-100 text-indigo-700',   icon: Users },
  accepted:     { label: 'Accepted',     bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  waitlisted:   { label: 'Waitlisted',   bg: 'bg-amber-50',  text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',     icon: Clock },
  rejected:     { label: 'Rejected',     bg: 'bg-red-50',    text: 'text-red-700',     badge: 'bg-red-100 text-red-700',         icon: XCircle },
  enrolled:     { label: 'Enrolled',     bg: 'bg-teal-50',   text: 'text-teal-700',    badge: 'bg-teal-100 text-teal-700',       icon: GraduationCap },
  withdrawn:    { label: 'Withdrawn',    bg: 'bg-slate-50',  text: 'text-slate-600',   badge: 'bg-slate-100 text-slate-600',     icon: X },
};
const PIPELINE = ['inquiry','submitted','under_review','interview','accepted','waitlisted','enrolled'];
const PRIORITY = {
  high:   { label: 'High',   bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500' },
  medium: { label: 'Medium', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  low:    { label: 'Low',    bg: 'bg-gray-100',  text: 'text-gray-600',  dot: 'bg-gray-400' },
};
const DOCS = [
  { key: 'birth_certificate', label: 'Birth Certificate' },
  { key: 'passport_copy',     label: 'Passport / ID Copy' },
  { key: 'previous_reports',  label: 'Previous School Reports' },
  { key: 'medical_records',   label: 'Medical Records' },
  { key: 'recommendation',    label: 'Recommendation Letter' },
  { key: 'photos',            label: 'Passport Photos (2x)' },
];
const AY = '2026-2027';
const CY = '2025-2026';
const YRS = ['Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9'];


const AdmissionsPortal = () => {
  const { supabase } = useApp();
  const [apps, setApps] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [search, setSearch] = useState('');
  const [stFilt, setStFilt] = useState('all');
  const [clFilt, setClFilt] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selApp, setSelApp] = useState(null);
  const [editApp, setEditApp] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [editingCap, setEditingCap] = useState(null);
  const [capVal, setCapVal] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const [aR, cR, sR] = await Promise.all([
        supabase.from('enrollment_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('custom_classes').select('*').eq('active', true).order('name'),
        supabase.from('students').select('id,name,class_name,date_of_birth,email,parent_contact,status').eq('status','active').order('class_name'),
      ]);
      const cntMap = {};
      (sR.data||[]).forEach(s => { const b=s.class_name?.match(/^Y\d+/)?.[0]||s.class_name; cntMap[b]=(cntMap[b]||0)+1; });
      setClasses((cR.data||[]).map(c => ({...c, current_count:cntMap[c.name]||0, capacity:c.max_students||20})));
      setApps(aR.data||[]);
      setStudents(sR.data||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const autoEnroll = async () => {
    if (!supabase) return;
    if (!window.confirm(`Auto-enroll all current students for ${AY}?\n\nY1→Y2 ... Y8→Y9\nY9 skipped (graduating). Duplicates prevented.\n\nContinue?`)) return;
    setEnrolling(true);
    try {
      const { data: existing } = await supabase.from('enrollment_applications')
        .select('student_name,current_student_id').eq('is_returning_student',true).eq('academic_year',AY);
      const ids = new Set((existing||[]).map(e=>e.current_student_id).filter(Boolean));
      const names = new Set((existing||[]).map(e=>e.student_name));
      const batch = [];
      for (const s of students) {
        if (ids.has(s.id)||names.has(s.name)) continue;
        const m = s.class_name?.match(/Y(\d+)/); if (!m) continue;
        const yr = parseInt(m[1]); if (yr>=9) continue;
        batch.push({
          student_name:s.name, date_of_birth:s.date_of_birth||null,
          current_student_id:s.id, parent_name:s.parent_contact||'Linked Parent',
          parent_email:s.email||'', parent_phone:s.parent_contact||'',
          applying_for_class:`Y${yr+1}`, current_class:s.class_name,
          status:'enrolled', is_returning_student:true, priority:'low',
          academic_year:AY, notes:'Auto-enrolled returning student',
          created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
        });
      }
      if (!batch.length) { alert(`All students already enrolled for ${AY}`); setEnrolling(false); return; }
      const { error } = await supabase.from('enrollment_applications').insert(batch);
      if (error) throw error;
      alert(`${batch.length} students enrolled for ${AY}!`);
      await load();
    } catch(e) { alert('Error: '+e.message); }
    setEnrolling(false);
  };

  const exportCSV = () => {
    const h='Student,DOB,Gender,Nationality,Class,Prev School,Parent,Email,Phone,Status,Priority,Returning,Date';
    const rows = apps.map(a=>[
      `"${a.student_name||''}"`,a.date_of_birth||'',a.gender||'',a.nationality||'',
      a.applying_for_class||'',`"${a.previous_school||''}"`,
      `"${a.parent_name||''}"`,a.parent_email||'',a.parent_phone||'',
      a.status||'',a.priority||'',a.is_returning_student?'Yes':'No',
      a.created_at?new Date(a.created_at).toLocaleDateString('en-GB'):'',
    ].join(','));
    const blob = new Blob([[h,...rows].join('\n')], {type:'text/csv'});
    const u=URL.createObjectURL(blob); const el=document.createElement('a');
    el.href=u; el.download=`admissions_${AY}_${new Date().toISOString().split('T')[0]}.csv`;
    el.click(); URL.revokeObjectURL(u);
  };

  const updStatus = async (id, st) => {
    if (!supabase) return;
    const upd = {status:st, updated_at:new Date().toISOString()};
    if (st==='enrolled') upd.decision_date=new Date().toISOString().split('T')[0];
    const {error} = await supabase.from('enrollment_applications').update(upd).eq('id',id);
    if (!error) { setApps(p=>p.map(a=>a.id===id?{...a,...upd}:a)); if(selApp?.id===id) setSelApp(p=>p?{...p,...upd}:null); }
  };

  const updApp = async (id, upd) => {
    if (!supabase) return;
    upd.updated_at = new Date().toISOString();
    const {error} = await supabase.from('enrollment_applications').update(upd).eq('id',id);
    if (!error) { setApps(p=>p.map(a=>a.id===id?{...a,...upd}:a)); if(selApp?.id===id) setSelApp(p=>p?{...p,...upd}:null); }
    return !error;
  };

  const delApp = async (id) => {
    if (!supabase||!window.confirm('Delete this application?')) return;
    const {error} = await supabase.from('enrollment_applications').delete().eq('id',id);
    if (!error) { setApps(p=>p.filter(a=>a.id!==id)); setSelApp(null); }
  };

  const saveApp = async (fd) => {
    if (!supabase) return false;
    const p = {...fd, academic_year:AY, status:fd.status||'inquiry', updated_at:new Date().toISOString()};
    delete p.id; delete p.current_student_id;
    if (editApp) {
      const {error} = await supabase.from('enrollment_applications').update(p).eq('id',editApp.id);
      if (!error) { setApps(prev=>prev.map(a=>a.id===editApp.id?{...a,...p}:a)); setEditApp(null); setShowForm(false); return true; }
      else { alert('Save error: '+error.message); return false; }
    } else {
      p.created_at = new Date().toISOString();
      const {data,error} = await supabase.from('enrollment_applications').insert(p).select().single();
      if (!error&&data) { setApps(prev=>[data,...prev]); setShowForm(false); return true; }
      else { alert('Save error: '+(error?.message||'Unknown')); return false; }
    }
  };

  const updateClassCapacity = async (className, newCap) => {
    if (!supabase) return;
    const cls = classes.find(c=>c.name===className);
    if (!cls) return;
    const {error} = await supabase.from('custom_classes').update({max_students:newCap}).eq('id',cls.id);
    if (!error) { setClasses(p=>p.map(c=>c.name===className?{...c,capacity:newCap,max_students:newCap}:c)); }
    setEditingCap(null);
  };

  const filtered = useMemo(() => {
    let l=apps;
    if (search) { const q=search.toLowerCase(); l=l.filter(a=>(a.student_name||'').toLowerCase().includes(q)||(a.parent_name||'').toLowerCase().includes(q)||(a.parent_email||'').toLowerCase().includes(q)); }
    if (stFilt!=='all') l=l.filter(a=>a.status===stFilt);
    if (clFilt!=='all') l=l.filter(a=>a.applying_for_class===clFilt);
    return l;
  }, [apps,search,stFilt,clFilt]);

  const stats = useMemo(() => ({
    total:apps.length,
    active:apps.filter(a=>!['rejected','withdrawn','enrolled'].includes(a.status)).length,
    accepted:apps.filter(a=>a.status==='accepted').length,
    enrolled:apps.filter(a=>a.status==='enrolled').length,
    returning:apps.filter(a=>a.is_returning_student).length,
    newSt:apps.filter(a=>!a.is_returning_student).length,
  }), [apps]);

  const getSections = (cls, enrolled) => {
    const cap = classes.find(c=>c.name===cls)?.capacity||20;
    if (enrolled <= cap) return [{name:cls, count:enrolled}];
    const n = Math.ceil(enrolled/cap);
    const secs = []; let rem = enrolled;
    for (let i=0; i<n; i++) {
      const letter = String.fromCharCode(65+i);
      const cnt = Math.min(Math.ceil(rem/(n-i)), rem);
      secs.push({name:`${cls}${letter}`, count:cnt});
      rem -= cnt;
    }
    return secs;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-5 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white opacity-5 rounded-full -mr-28 -mt-28"/>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-5 rounded-full -ml-20 -mb-20"/>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div><p className="text-emerald-100 text-xs">{AY}</p><h1 className="text-xl font-bold">Admissions Portal</h1></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={autoEnroll} disabled={enrolling}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/30 disabled:opacity-50">
                <TrendingUp size={14} className={enrolling?'animate-spin':''}/>{enrolling?'Enrolling...':'Auto-Enroll Returning'}
              </button>
              <button onClick={exportCSV} className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/30">
                <Download size={14}/>Export CSV
              </button>
              <button onClick={()=>{setEditApp(null);setShowForm(true);}}
                className="bg-white text-emerald-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-50 shadow-md">
                <UserPlus size={14}/>New Application
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[{l:'Total',v:stats.total,i:FileText},{l:'Pipeline',v:stats.active,i:RefreshCw},{l:'Accepted',v:stats.accepted,i:CheckCircle},
              {l:'Enrolled',v:stats.enrolled,i:GraduationCap},{l:'Returning',v:stats.returning,i:Users},{l:'New',v:stats.newSt,i:UserPlus}].map(s=>{
              const I=s.i;
              return(<div key={s.l} className="bg-white/10 rounded-xl p-2 border border-white/20 text-center">
                <I size={12} className="mx-auto text-white/60 mb-0.5"/><p className="text-lg font-bold">{s.v}</p><p className="text-[9px] text-emerald-100">{s.l}</p>
              </div>);
            })}
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[{k:'overview',l:'Overview',i:BarChart3},{k:'pipeline',l:'Pipeline',i:ArrowRight},{k:'list',l:'List',i:ClipboardList},{k:'capacity',l:'Capacity',i:Building}].map(v=>{
            const I=v.i;
            return(<button key={v.k} onClick={()=>setView(v.k)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${view===v.k?'bg-white shadow-sm text-emerald-700':'text-gray-500 hover:text-gray-700'}`}>
              <I size={13}/><span className="hidden sm:inline">{v.l}</span></button>);
          })}
        </div>
        {(view==='list'||view==='pipeline')&&(
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
            </div>
            <select value={stFilt} onChange={e=>setStFilt(e.target.value)} className="px-2 py-2 rounded-xl border border-gray-200 text-xs bg-white">
              <option value="all">All Status</option>
              {Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={clFilt} onChange={e=>setClFilt(e.target.value)} className="px-2 py-2 rounded-xl border border-gray-200 text-xs bg-white">
              <option value="all">All Classes</option>
              {YRS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <button onClick={load} className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50"><RefreshCw size={14}/></button>
      </div>


      {/* OVERVIEW */}
      {view==='overview'&&(
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Users size={16} className="text-blue-600"/>Current {CY}</h3>
            <div className="space-y-1.5">
              {YRS.map(yr=>{
                const cnt=students.filter(s=>(s.class_name?.match(/^Y\d+/)?.[0])===yr).length;
                return(<div key={yr} className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">{yr}</div>
                    <p className="text-sm font-semibold text-gray-800">{cnt} students</p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">{yr==='Y9'?'Graduate':`\u2192 Y${parseInt(yr.slice(1))+1}`}</span>
                </div>);
              })}
              <div className="mt-2 p-2.5 bg-gray-50 rounded-xl text-center"><p className="text-sm font-bold text-gray-700">{students.length} total active</p></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-600"/>Next {AY}</h3>
            <div className="space-y-1.5">
              {YRS.map(yr=>{
                const enr=apps.filter(a=>a.applying_for_class===yr&&['accepted','enrolled'].includes(a.status)).length;
                const ret=apps.filter(a=>a.applying_for_class===yr&&a.is_returning_student&&['accepted','enrolled'].includes(a.status)).length;
                const pend=apps.filter(a=>a.applying_for_class===yr&&!['accepted','enrolled','rejected','withdrawn'].includes(a.status)).length;
                const cap=classes.find(c=>c.name===yr)?.capacity||20;
                const full=enr>=cap; const near=enr>=cap*0.8;
                const sections=getSections(yr,enr); const needsSplit=sections.length>1;
                return(<div key={yr} className={`p-2.5 rounded-xl border ${full?'bg-red-50 border-red-200':near?'bg-amber-50 border-amber-200':'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 text-white rounded-lg flex items-center justify-center font-bold text-xs ${full?'bg-red-500':near?'bg-amber-500':'bg-emerald-500'}`}>{yr}</div>
                      <div><p className="text-sm font-semibold text-gray-800">{enr} enrolled</p>
                        <p className="text-[9px] text-gray-500">{ret} ret + {enr-ret} new{pend>0?` \u00B7 ${pend} pending`:''}</p></div>
                    </div>
                    {full?<span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">FULL</span>
                    :<span className="text-xs text-gray-600">{cap-enr} spots</span>}
                  </div>
                  {needsSplit&&(<div className="mt-2 pt-2 border-t border-gray-200/60">
                    <p className="text-[9px] font-bold text-amber-700 mb-1">Split into {sections.length} sections:</p>
                    <div className="flex gap-1.5">{sections.map(sec=>(<div key={sec.name} className="bg-white rounded-lg px-2 py-1 text-center border border-amber-200 flex-1">
                      <p className="text-[10px] font-bold text-gray-800">{sec.name}</p><p className="text-[9px] text-gray-500">{sec.count} students</p>
                    </div>))}</div>
                  </div>)}
                </div>);
              })}
              <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl text-center"><p className="text-sm font-bold text-emerald-700">{stats.enrolled} total enrolled</p></div>
            </div>
          </div>
        </div>
      )}

      {/* PIPELINE */}
      {view==='pipeline'&&(
        <div className="w-full">
          <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${PIPELINE.length}, minmax(0, 1fr))`}}>
            {PIPELINE.map(st=>{
              const sc=STATUSES[st]; const items=filtered.filter(a=>a.status===st); const SI=sc.icon;
              return(<div key={st} className="min-w-0">
                <div className={`${sc.bg} rounded-xl p-2 mb-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0"><SI size={11} className={`${sc.text} flex-shrink-0`}/><span className={`text-[10px] font-bold ${sc.text} truncate`}>{sc.label}</span></div>
                    <span className={`text-[10px] font-bold ${sc.text} bg-white/60 px-1.5 py-0.5 rounded-full flex-shrink-0`}>{items.length}</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                  {items.map(a=>(<div key={a.id} onClick={()=>setSelApp(a)}
                    className="bg-white rounded-xl border border-gray-200 p-2 hover:shadow-md cursor-pointer transition-shadow">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[11px] font-semibold text-gray-800 truncate flex-1">{a.student_name}</p>
                      {a.priority&&PRIORITY[a.priority]&&<div className={`w-2 h-2 rounded-full ${PRIORITY[a.priority].dot} ml-1 flex-shrink-0`}/>}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{a.applying_for_class||'TBD'}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.parent_name}</p>
                    {a.is_returning_student&&<span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded mt-1 inline-block">Ret.</span>}
                  </div>))}
                  {items.length===0&&<div className="text-center py-6 text-[10px] text-gray-300">&mdash;</div>}
                </div>
              </div>);
            })}
          </div>
        </div>
      )}


      {/* LIST */}
      {view==='list'&&(
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-600 uppercase">Student</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase">Class</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase hidden md:table-cell">Parent</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase hidden lg:table-cell">Contact</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase">Status</th>
                <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-600 uppercase hidden md:table-cell">Type</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-600 uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((a,i)=>{
                  const sc=STATUSES[a.status]||STATUSES.inquiry;
                  return(<tr key={a.id} className={`border-b border-gray-100 hover:bg-emerald-50/30 cursor-pointer transition-colors ${i%2?'bg-gray-50/40':''}`} onClick={()=>setSelApp(a)}>
                    <td className="px-4 py-3"><p className="text-sm font-medium text-gray-800">{a.student_name}</p>{a.date_of_birth&&<p className="text-[10px] text-gray-400">{a.date_of_birth}</p>}</td>
                    <td className="px-3 py-3"><span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">{a.applying_for_class||'—'}</span></td>
                    <td className="px-3 py-3 hidden md:table-cell text-xs text-gray-600">{a.parent_name||'—'}</td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {a.parent_email&&<div className="flex items-center gap-1 text-[10px] text-gray-500"><Mail size={10}/><span className="truncate max-w-[130px]">{a.parent_email}</span></div>}
                      {a.parent_phone&&<div className="flex items-center gap-1 text-[10px] text-gray-400"><Phone size={10}/>{a.parent_phone}</div>}
                    </td>
                    <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${sc.badge}`}>{sc.label}</span></td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={`text-[10px] font-semibold ${a.is_returning_student?'text-emerald-600':'text-purple-600'}`}>{a.is_returning_student?'Returning':'New'}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{setEditApp(a);setShowForm(true);}} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50"><Edit3 size={13}/></button>
                        <button onClick={()=>delApp(a.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
          {filtered.length===0&&<div className="text-center py-12"><FileText size={36} className="mx-auto text-gray-300 mb-2"/><p className="text-sm text-gray-500">No applications found</p></div>}
        </div>
      )}

      {/* CAPACITY */}
      {view==='capacity'&&(
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Settings size={14} className="text-amber-600 mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-amber-800">Click the <strong>max</strong> number on any class to change capacity. Classes exceeding capacity auto-split into sections (A, B, C...).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {YRS.map(cls=>{
              const cap=classes.find(c=>c.name===cls)?.capacity||20;
              const cur=students.filter(s=>(s.class_name?.match(/^Y\d+/)?.[0])===cls).length;
              const enr=apps.filter(a=>a.applying_for_class===cls&&['accepted','enrolled'].includes(a.status)).length;
              const pend=apps.filter(a=>a.applying_for_class===cls&&!['accepted','enrolled','rejected','withdrawn'].includes(a.status)).length;
              const ret=apps.filter(a=>a.applying_for_class===cls&&a.is_returning_student&&['accepted','enrolled'].includes(a.status)).length;
              const pct=cap>0?Math.round((enr/cap)*100):0;
              const sections=getSections(cls,enr); const needsSplit=sections.length>1;

              return(<div key={cls} className={`bg-white rounded-2xl border-2 p-4 transition-all ${needsSplit?'border-amber-300 shadow-amber-100 shadow-md':pct>=100?'border-red-300':'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-800">{cls}</h3>
                  <div className="flex gap-1.5">
                    {pct>=100&&<span className="text-[9px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">FULL</span>}
                    {needsSplit&&<span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">SPLIT {'\u2192'} {sections.length}</span>}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                    <span>{enr} enrolled</span>
                    <div className="flex items-center gap-1">
                      <span>max:</span>
                      {editingCap===cls?(
                        <form onSubmit={e=>{e.preventDefault();updateClassCapacity(cls,parseInt(capVal)||20);}} className="flex items-center gap-1">
                          <input type="number" value={capVal} onChange={e=>setCapVal(e.target.value)} min="1" max="50"
                            className="w-12 px-1 py-0.5 text-[10px] border border-emerald-300 rounded text-center focus:outline-none" autoFocus/>
                          <button type="submit" className="text-emerald-600 hover:text-emerald-700"><Check size={12}/></button>
                          <button type="button" onClick={()=>setEditingCap(null)} className="text-gray-400 hover:text-gray-600"><X size={12}/></button>
                        </form>
                      ):(
                        <button onClick={()=>{setEditingCap(cls);setCapVal(String(cap));}}
                          className="font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors">
                          {cap}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct>=100?'bg-red-500':pct>=80?'bg-amber-500':'bg-emerald-500'}`}
                      style={{width:`${Math.min(100,pct)}%`}}/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-blue-50 rounded-lg p-2 text-center"><p className="text-base font-bold text-blue-700">{cur}</p><p className="text-[8px] text-blue-600">Current Students</p></div>
                  <div className="bg-emerald-50 rounded-lg p-2 text-center"><p className="text-base font-bold text-emerald-700">{enr}</p><p className="text-[8px] text-emerald-600">Enrolled Next Yr</p></div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center mb-2">
                  <div className="bg-gray-50 rounded-lg p-1.5"><p className="text-sm font-bold text-gray-700">{ret}</p><p className="text-[8px] text-gray-500">Returning</p></div>
                  <div className="bg-purple-50 rounded-lg p-1.5"><p className="text-sm font-bold text-purple-700">{enr-ret}</p><p className="text-[8px] text-purple-500">New</p></div>
                  <div className="bg-amber-50 rounded-lg p-1.5"><p className="text-sm font-bold text-amber-700">{pend}</p><p className="text-[8px] text-amber-500">Pending</p></div>
                </div>
                {needsSplit?(
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2">
                    <p className="text-[9px] font-bold text-amber-700 mb-1.5">Section Split Preview:</p>
                    <div className="flex gap-1.5">
                      {sections.map(s=>(<div key={s.name} className="bg-white rounded-lg px-2 py-1.5 text-center border border-amber-200 flex-1">
                        <p className="text-xs font-bold text-gray-800">{s.name}</p><p className="text-[9px] text-gray-500">{s.count} students</p>
                      </div>))}
                    </div>
                  </div>
                ):(<p className="text-[9px] text-gray-400 text-center mt-1">{Math.max(0,cap-enr)} spots remaining</p>)}
              </div>);
            })}
          </div>
        </div>
      )}

      {selApp&&<DetailModal app={selApp} onClose={()=>setSelApp(null)} onUpdSt={updStatus} onUpdApp={updApp} onDel={delApp}
        onEdit={a=>{setEditApp(a);setShowForm(true);setSelApp(null);}}/>}
      {showForm&&<AppForm init={editApp} onSave={saveApp} onClose={()=>{setShowForm(false);setEditApp(null);}}/>}
    </div>
  );
};


const DetailModal = ({ app, onClose, onUpdSt, onUpdApp, onDel, onEdit }) => {
  const [notes, setNotes] = useState(app.admin_notes||'');
  const [intNotes, setIntNotes] = useState(app.interview_notes||'');
  const [saving, setSaving] = useState(false);

  const saveNotes = async (field, value) => {
    setSaving(true);
    await onUpdApp(app.id, {[field]: value});
    setSaving(false);
  };

  const toggleDoc = async (key) => {
    const docs = typeof app.documents === 'object' && app.documents !== null ? {...app.documents} : {};
    docs[key] = !docs[key];
    await onUpdApp(app.id, {documents: docs});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 pt-6 pb-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl" onClick={e=>e.stopPropagation()}>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"/>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">Application Detail</p>
                <h2 className="text-lg font-bold mt-0.5">{app.student_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">{app.applying_for_class||'TBD'}</span>
                  <span className="text-emerald-100 text-xs">{app.is_returning_student?'Returning Student':'New Student'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>onEdit(app)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"><Edit3 size={14}/></button>
                <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"><X size={14}/></button>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">Application Status</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(STATUSES).map(([k,v])=>{
                  const act=app.status===k; const SI=v.icon;
                  return(<button key={k} onClick={()=>onUpdSt(app.id,k)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium border-2 transition-all ${
                      act?`${v.bg} border-current ${v.text} shadow-sm`:'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                    }`}><SI size={12}/>{v.label}</button>);
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard title="Student Information" icon={GraduationCap}>
                <IR l="Full Name" v={app.student_name}/><IR l="Date of Birth" v={app.date_of_birth}/><IR l="Gender" v={app.gender}/>
                <IR l="Nationality" v={app.nationality}/><IR l="Applying For" v={app.applying_for_class}/>
                <IR l="Previous School" v={app.previous_school}/><IR l="Current Grade" v={app.current_grade}/>
              </InfoCard>
              <InfoCard title="Parent / Guardian" icon={Users}>
                <IR l="Name" v={app.parent_name}/><IR l="Relationship" v={app.parent_relationship}/>
                <IR l="Email" v={app.parent_email} lnk={app.parent_email?`mailto:${app.parent_email}`:null}/>
                <IR l="Phone" v={app.parent_phone} lnk={app.parent_phone?`tel:${app.parent_phone}`:null}/>
                <IR l="Occupation" v={app.parent_occupation}/>
                {app.parent2_name&&(<><div className="border-t border-gray-200 my-2"/><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Second Parent</p>
                  <IR l="Name" v={app.parent2_name}/><IR l="Email" v={app.parent2_email}/><IR l="Phone" v={app.parent2_phone}/></>)}
              </InfoCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard title="Medical Information" icon={Heart}>
                <IR l="Allergies" v={app.allergies||'None reported'}/><IR l="Medical Conditions" v={app.medical_conditions||'None reported'}/>
                <IR l="Special Needs" v={app.special_needs||'None reported'}/><IR l="Medications" v={app.medications||'None reported'}/>
              </InfoCard>
              <InfoCard title="Document Checklist" icon={FileText}>
                <div className="space-y-1.5">
                  {DOCS.map(d=>{
                    const docs = typeof app.documents === 'object' && app.documents !== null ? app.documents : {};
                    const chk = docs[d.key]===true;
                    return(<button key={d.key} onClick={()=>toggleDoc(d.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all border ${
                        chk?'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium':'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}>{chk?<CheckCircle size={14} className="text-emerald-500 flex-shrink-0"/>:<div className="w-3.5 h-3.5 rounded border-2 border-gray-300 flex-shrink-0"/>}{d.label}</button>);
                  })}
                </div>
              </InfoCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoCard title="Priority & Referral" icon={TrendingUp}>
                <div className="flex gap-2 mb-3">
                  {Object.entries(PRIORITY).map(([k,v])=>(
                    <button key={k} onClick={()=>onUpdApp(app.id,{priority:k})}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        app.priority===k?`${v.bg} ${v.text} border-current shadow-sm`:'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                      }`}><div className={`w-2.5 h-2.5 rounded-full ${v.dot}`}/>{v.label}</button>))}
                </div>
                {app.referral_source&&<div className="bg-gray-50 rounded-lg p-2.5"><p className="text-[10px] text-gray-500">Referral</p><p className="text-xs font-medium text-gray-700">{app.referral_source}</p></div>}
              </InfoCard>
              <InfoCard title="Interview" icon={Calendar}>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div><label className="text-[10px] text-gray-500 block mb-1">Date</label>
                    <input type="date" value={app.interview_date||''} onChange={e=>onUpdApp(app.id,{interview_date:e.target.value})}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"/></div>
                  <div><label className="text-[10px] text-gray-500 block mb-1">Time</label>
                    <input type="time" value={app.interview_time||''} onChange={e=>onUpdApp(app.id,{interview_time:e.target.value})}
                      className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"/></div>
                </div>
                <label className="text-[10px] text-gray-500 block mb-1">Interview Notes</label>
                <textarea value={intNotes} onChange={e=>setIntNotes(e.target.value)}
                  onBlur={()=>saveNotes('interview_notes',intNotes)} placeholder="Notes from interview..." rows={2}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
              </InfoCard>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><MessageSquare size={12}/>Admin Notes</p>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                onBlur={()=>saveNotes('admin_notes',notes)} placeholder="Private notes..." rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
              {saving&&<p className="text-[9px] text-emerald-600 mt-1">Saving...</p>}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <button onClick={()=>onDel(app.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={13}/>Delete</button>
              <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({title, icon:Icon, children}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5"><Icon size={12}/>{title}</p>
    {children}
  </div>
);
const IR = ({l,v,lnk}) => (
  <div className="flex items-start gap-2 py-1">
    <span className="text-[10px] text-gray-400 w-24 flex-shrink-0">{l}</span>
    {lnk&&v?<a href={lnk} className="text-xs text-emerald-600 hover:underline truncate">{v}</a>
    :<span className="text-xs text-gray-700">{v||'\u2014'}</span>}
  </div>
);


const AppForm = ({ init, onSave, onClose }) => {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    student_name:'', date_of_birth:'', gender:'', nationality:'',
    applying_for_class:'', previous_school:'', current_grade:'',
    parent_name:'', parent_relationship:'Mother', parent_email:'', parent_phone:'', parent_occupation:'',
    parent2_name:'', parent2_relationship:'', parent2_email:'', parent2_phone:'',
    allergies:'', medical_conditions:'', special_needs:'', medications:'',
    referral_source:'', notes:'',
    priority:'medium', status:'inquiry', is_returning_student:false,
    ...(init||{}),
  });

  const u = (k,v) => setF(p=>({...p,[k]:v}));
  const steps = [{t:'Student Info',i:GraduationCap},{t:'Parent / Guardian',i:Users},{t:'Medical & Other',i:Heart}];
  const canNext = () => { if(step===0) return f.student_name&&f.applying_for_class; if(step===1) return f.parent_name; return true; };

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await onSave(f);
    if (!ok) setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={onClose}>
      <div className="min-h-full flex items-start justify-center p-4 pt-6 pb-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" onClick={e=>e.stopPropagation()}>
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">{init?'Edit Application':'New Application'}</h2>
              <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"><X size={14}/></button>
            </div>
            <div className="flex items-center gap-1">
              {steps.map((s,i)=>{const I=s.i;return(<React.Fragment key={i}>
                {i>0&&<div className={`flex-1 h-0.5 ${i<=step?'bg-white/60':'bg-white/20'}`}/>}
                <button onClick={()=>{if(i<step||(i===step+1&&canNext()))setStep(i);}}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    i===step?'bg-white/25':i<step?'bg-white/15 hover:bg-white/20':'opacity-40'
                  }`}><I size={11}/>{s.t}</button>
              </React.Fragment>);})}
            </div>
          </div>

          <div className="p-5">
            {step===0&&(<div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Details</p>
              <FI l="Student Full Name *" v={f.student_name} c={v=>u('student_name',v)}/>
              <div className="grid grid-cols-2 gap-3">
                <FI l="Date of Birth" t="date" v={f.date_of_birth} c={v=>u('date_of_birth',v)}/>
                <FS l="Gender" v={f.gender} c={v=>u('gender',v)} o={['','Male','Female']}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FS l="Applying for Class *" v={f.applying_for_class} c={v=>u('applying_for_class',v)} o={[''].concat(YRS)}/>
                <FI l="Nationality" v={f.nationality} c={v=>u('nationality',v)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI l="Previous School" v={f.previous_school} c={v=>u('previous_school',v)}/>
                <FI l="Current Grade" v={f.current_grade} c={v=>u('current_grade',v)}/>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-1">
                <div className="grid grid-cols-3 gap-3">
                  <FS l="Priority" v={f.priority} c={v=>u('priority',v)} o={['low','medium','high']}/>
                  <FS l="Initial Status" v={f.status} c={v=>u('status',v)} o={Object.keys(STATUSES)}/>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={f.is_returning_student} onChange={e=>u('is_returning_student',e.target.checked)} className="w-4 h-4 text-emerald-600 rounded"/>
                      <span className="text-xs text-gray-700">Returning</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>)}

            {step===1&&(<div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Parent / Guardian</p>
              <FI l="Full Name *" v={f.parent_name} c={v=>u('parent_name',v)}/>
              <div className="grid grid-cols-2 gap-3">
                <FS l="Relationship" v={f.parent_relationship} c={v=>u('parent_relationship',v)} o={['Mother','Father','Guardian','Other']}/>
                <FI l="Occupation" v={f.parent_occupation} c={v=>u('parent_occupation',v)}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FI l="Email" t="email" v={f.parent_email} c={v=>u('parent_email',v)}/>
                <FI l="Phone" v={f.parent_phone} c={v=>u('parent_phone',v)} ph="+381..."/>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Second Parent (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <FI l="Name" v={f.parent2_name} c={v=>u('parent2_name',v)}/>
                  <FI l="Phone" v={f.parent2_phone} c={v=>u('parent2_phone',v)}/>
                </div>
                <div className="mt-3"><FI l="Email" v={f.parent2_email} c={v=>u('parent2_email',v)}/></div>
              </div>
            </div>)}

            {step===2&&(<div className="space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medical Information</p>
              <FI l="Allergies" v={f.allergies} c={v=>u('allergies',v)} ph="List any allergies..."/>
              <FI l="Medical Conditions" v={f.medical_conditions} c={v=>u('medical_conditions',v)}/>
              <FI l="Special Needs / Learning Support" v={f.special_needs} c={v=>u('special_needs',v)}/>
              <FI l="Medications" v={f.medications} c={v=>u('medications',v)}/>
              <div className="border-t border-gray-200 pt-3 mt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Additional</p>
                <FS l="How did you hear about us?" v={f.referral_source} c={v=>u('referral_source',v)}
                  o={['','Website','Social Media','Friend/Family','School Fair','Google Search','Advertisement','Other']}/>
                <div className="mt-3">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                  <textarea value={f.notes||''} onChange={e=>u('notes',e.target.value)} rows={3} placeholder="Any additional information..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"/>
                </div>
              </div>
            </div>)}

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-200">
              {step>0
                ?<button onClick={()=>setStep(step-1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"><ChevronLeft size={14}/>Back</button>
                :<div/>}
              {step<2
                ?<button onClick={()=>setStep(step+1)} disabled={!canNext()}
                  className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next<ChevronRight size={14}/></button>
                :<button onClick={handleSubmit} disabled={!f.student_name||!f.parent_name||submitting}
                  className="flex items-center gap-1 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {submitting?'Saving...':<><Check size={14}/>{init?'Update Application':'Submit Application'}</>}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FI = ({l,v,c,t='text',ph}) => (
  <div><label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
  <input type={t} value={v||''} onChange={e=>c(e.target.value)} placeholder={ph}
    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-shadow"/></div>
);
const FS = ({l,v,c,o}) => (
  <div><label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
  <select value={v||''} onChange={e=>c(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 bg-white transition-shadow">
    {o.map(x=><option key={x} value={x}>{x||'\u2014 Select \u2014'}</option>)}
  </select></div>
);

export default AdmissionsPortal;