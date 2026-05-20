import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Edit2, Upload, Download, Users, Mail, Shield,
  AlertTriangle, BookOpen, Search, UserPlus, GraduationCap,
  ChevronDown, Copy, CheckCircle, X, Loader2, Eye, EyeOff,
  BookOpenCheck, Crown, UserCog, Key,
} from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";
import { useBranding } from "../../../../core/context/BrandingContext";
import { useTenant } from "../../../../core/context/TenantContext";
import {
  supabase as rawSupabase,
  getCurrentSchoolId,
} from "../../../../core/infrastructure/supabaseClient";
import { createTeacher, generateTempPassword } from "../../../../core/infrastructure/adminApi";
import { toast } from "../../../../core/components/Toast";

import AddParentModal from "../../parents/modals/AddParentModal";
import EditParentModal from "../../parents/modals/EditParentModal";
import ManageChildrenModal from "../../parents/modals/ManageChildrenModal";
import DeleteParentModal from "../../parents/modals/DeleteParentModal";
import ExportEmailsModal from "../../parents/modals/ExportEmailsModal";

// ════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ════════════════════════════════════════════════════════════

const ConfirmModal = ({ config, onCancel }) => {
  if (!config) return null;
  const { title, message, confirmLabel = 'Confirm', danger = false, onConfirm, loading } = config;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`p-5 border-b ${danger ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-blue-100'}`}>
              {danger
                ? <Trash2 size={16} className="text-red-600" />
                : <AlertTriangle size={16} className="text-blue-600" />
              }
            </div>
            <h3 className="font-bold text-gray-800">{title}</h3>
          </div>
        </div>
        <div className="p-5">
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════

const ProfileManagementPage = () => {
  const { supabase } = useApp();
  const { primaryColor } = useBranding();

  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [changePwTeacher, setChangePwTeacher] = useState(null);
  const [changePwParent, setChangePwParent] = useState(null);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showEditParentModal, setShowEditParentModal] = useState(false);
  const [showManageChildrenModal, setShowManageChildrenModal] = useState(false);
  const [showDeleteParentModal, setShowDeleteParentModal] = useState(false);
  const [showExportEmailsModal, setShowExportEmailsModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeTab, setActiveTab] = useState("teachers");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [parentFilters, setParentFilters] = useState({ status: "all", search: "" });
  const [teacherFilters, setTeacherFilters] = useState({ role: 'all', search: '' });

  // ════════════════════════════════════════════════════════════
  // DATA LOADING
  // ════════════════════════════════════════════════════════════

  const loadTeachers = async () => {
    try {
      setLoading(true);
      // 🔒 Only fetch columns needed for management UI — no PII overfetch
      const { data: teacherRecords, error } = await supabase
        .from('teachers')
        .select('id, user_id, full_name, email, role, subjects, class_teacher_for, school_id')
        .order('full_name');

      if (error) throw error;

      const userIds = (teacherRecords || []).map(t => t.user_id).filter(Boolean);
      let profiles = [];
      if (userIds.length > 0) {
        const { data } = await rawSupabase
          .from('profiles')
          .select('id, role, full_name')
          .in('id', userIds);
        profiles = data || [];
      }

      const combined = (teacherRecords || []).map(t => {
        const profile = profiles.find(p => p.id === t.user_id);
        const effectiveRole = profile?.role || t.role || 'teacher';
        return {
          id: t.user_id || t.id,
          user_id: t.user_id,
          email: t.email || '—',
          full_name: t.full_name || profile?.full_name || 'Unnamed',
          role: effectiveRole,
          subjects: t.subjects || [],
          class_teacher_for: t.class_teacher_for || null,
          is_super_admin: effectiveRole === 'admin' || effectiveRole === 'owner',
          teacher_id: t.id,
          has_login: !!t.user_id,
        };
      });

      setTeachers(combined);
    } catch (error) {
      toast.error('Failed to load staff: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadParents = async () => {
    try {
      setLoading(true);
      // 🔒 Only fetch columns needed for management UI
      const { data: parentsData } = await supabase
        .from("parents")
        .select("id, full_name, email, phone, school_id, user_id, created_at")
        .order("full_name");

      const { data: linksData } = await supabase
        .from("student_parents")
        .select(`parent_id, student:students(id, name, class_name, email)`);

      const parentsWithStudents = (parentsData || []).map((parent) => ({
        ...parent,
        linkedStudents: (linksData || [])
          .filter((link) => link.parent_id === parent.id)
          .map((link) => link.student),
      }));

      setParents(parentsWithStudents);
    } catch (error) {
      toast.error('Failed to load parents: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      // 🔒 Only fetch columns needed for student assignment dropdowns
      const { data } = await supabase
        .from("students")
        .select("id, name, class_name, student_no, status")
        .eq("status", "active")
        .order("name");
      setStudents(data || []);
    } catch (error) {
      console.error("Error loading students:", error.message);
    }
  };

  const loadAllData = useCallback(async () => {
    await Promise.all([loadTeachers(), loadParents(), loadStudents()]);
  }, []);

  useEffect(() => { loadAllData(); }, []);

  // ════════════════════════════════════════════════════════════
  // FILTERS
  // ════════════════════════════════════════════════════════════

  const filteredTeachers = teachers.filter(teacher => {
    if (teacherFilters.role !== 'all') {
      if (teacherFilters.role === 'admin' && !teacher.is_super_admin) return false;
      if (teacherFilters.role === 'teacher' && (teacher.is_super_admin || teacher.role !== 'teacher')) return false;
    }
    if (teacherFilters.search) {
      const s = teacherFilters.search.toLowerCase();
      if (!teacher.full_name?.toLowerCase().includes(s) &&
          !teacher.email?.toLowerCase().includes(s) &&
          !teacher.subjects?.some(sub => sub.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const filteredParents = parents.filter((parent) => {
    if (parentFilters.status !== "all" && parent.status !== parentFilters.status) return false;
    if (parentFilters.search) {
      const s = parentFilters.search.toLowerCase();
      if (!parent.full_name?.toLowerCase().includes(s) &&
          !parent.email?.toLowerCase().includes(s) &&
          !parent.linkedStudents?.some((st) => st.name.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  // ════════════════════════════════════════════════════════════
  // DELETE TEACHER
  // ════════════════════════════════════════════════════════════

  const handleDeleteTeacher = (teacher) => {
    if (teacher.role === 'owner') {
      toast.error('Cannot delete the school owner account.');
      return;
    }
    setConfirm({
      title: 'Delete Staff Member',
      message: `Are you sure you want to delete ${teacher.full_name}? Their login account will also be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          if (teacher.user_id) {
            // Delete auth user via Edge Function (cascades to teachers + profiles)
            const { data, error: fnErr } = await rawSupabase.functions.invoke('create-user', {
              body: { action: 'delete', schoolId: getCurrentSchoolId(), userId: teacher.user_id },
            });
            if (fnErr || data?.error) throw new Error(fnErr?.message || data?.error || 'Delete failed');
          } else if (teacher.teacher_id) {
            await supabase.from("teachers").delete().eq("id", teacher.teacher_id);
          }
          toast.success(`${teacher.full_name} has been removed.`);
          setConfirm(null);
          await loadTeachers();
        } catch (error) {
          toast.error('Failed to delete: ' + error.message);
          setConfirm(null);
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  // ════════════════════════════════════════════════════════════
  // CSV IMPORT
  // ════════════════════════════════════════════════════════════

  const parseCsvRows = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const cols = [];
      let cur = '', inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      cols.push(cur.trim());
      return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']));
    }).filter(r => Object.values(r).some(v => v));
    return { headers, rows };
  };

  const handleTeacherCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const { rows } = parseCsvRows(text);
    if (!rows.length) { toast.error('No data rows found in CSV.'); return; }

    const schoolId = getCurrentSchoolId();
    const inserts = rows
      .filter(r => r.full_name && r.email)
      .map(r => ({
        school_id: schoolId,
        full_name: r.full_name,
        email: r.email,
        role: ['admin', 'owner', 'teacher'].includes(r.role) ? r.role : 'teacher',
        subjects: r.subjects ? r.subjects.split(';').map(s => s.trim()).filter(Boolean) : [],
        class_teacher_for: r.class_teacher_for || null,
      }));

    if (!inserts.length) { toast.error('No valid rows found (full_name + email required).'); return; }

    const { error } = await supabase.from('teachers').insert(inserts);
    if (error) { toast.error(`Import failed: ${error.message}`); return; }
    toast.success(`${inserts.length} staff member${inserts.length !== 1 ? 's' : ''} imported.`);
    loadTeachers();
  };

  const handleParentCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const { rows } = parseCsvRows(text);
    if (!rows.length) { toast.error('No data rows found in CSV.'); return; }

    const schoolId = getCurrentSchoolId();
    let imported = 0, failed = 0;

    for (const r of rows) {
      if (!r.full_name || !r.email) { failed++; continue; }
      const { data: parent, error } = await supabase
        .from('parents')
        .insert([{ school_id: schoolId, full_name: r.full_name, email: r.email, phone: r.phone || null, status: 'active' }])
        .select('id')
        .single();
      if (error) { failed++; continue; }

      if (r.student_names && parent?.id) {
        const names = r.student_names.split(';').map(n => n.trim()).filter(Boolean);
        for (const name of names) {
          const { data: student } = await supabase
            .from('students').select('id').ilike('name', name).eq('school_id', schoolId).maybeSingle();
          if (student?.id) {
            await supabase.from('student_parents').insert([{ parent_id: parent.id, student_id: student.id }]);
          }
        }
      }
      imported++;
    }

    toast.success(`${imported} parent${imported !== 1 ? 's' : ''} imported.${failed ? ` ${failed} rows skipped.` : ''}`);
    loadParents();
  };

  const downloadTeacherTemplate = () => {
    const csv = `full_name,email,subjects,role,class_teacher_for\nJohn Doe,john@school.com,"Math;Physics",teacher,Y7`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "teachers_template.csv";
    a.click();
  };

  const downloadParentTemplate = () => {
    const csv = `full_name,email,phone,student_names\nJane Doe,jane@email.com,+381601234567,"John Doe;Mary Doe"`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "parents_template.csv";
    a.click();
  };

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <ConfirmModal
        config={confirm ? { ...confirm, loading: confirmLoading } : null}
        onCancel={() => setConfirm(null)}
      />

      {/* ═══ HEADER ═══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage staff and parent accounts</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "teachers" ? (
            <>
              <button
                onClick={() => { setEditingTeacher(null); setShowAddModal(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <UserPlus size={16} />
                Add Staff
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleTeacherCsvImport} />
              </label>
              <button
                onClick={downloadTeacherTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Download size={16} />
                Template
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAddParentModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <UserPlus size={16} />
                Add Parent
              </button>
              <button
                onClick={() => setShowExportEmailsModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Mail size={16} />
                Export
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleParentCsvImport} />
              </label>
              <button
                onClick={downloadParentTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Download size={16} />
                Template
              </button>
            </>
          )}
        </div>
      </div>

      {/* ═══ TABS ═════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { key: 'teachers', label: 'Staff', count: teachers.length, icon: GraduationCap },
            { key: 'parents', label: 'Parents', count: parents.length, icon: Users },
          ].map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === key ? "border-b-2" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
              style={activeTab === key ? { borderColor: primaryColor, color: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
            >
              <Icon size={16} />
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === "teachers" ? "Search staff..." : "Search parents..."}
                value={activeTab === "teachers" ? teacherFilters.search : parentFilters.search}
                onChange={(e) => activeTab === "teachers"
                  ? setTeacherFilters(f => ({ ...f, search: e.target.value }))
                  : setParentFilters(f => ({ ...f, search: e.target.value }))
                }
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition-shadow"
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
            </div>
            <div className="relative">
              <select
                value={activeTab === "teachers" ? teacherFilters.role : parentFilters.status}
                onChange={(e) => activeTab === "teachers"
                  ? setTeacherFilters(f => ({ ...f, role: e.target.value }))
                  : setParentFilters(f => ({ ...f, status: e.target.value }))
                }
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 cursor-pointer"
              >
                {activeTab === "teachers" ? (
                  <>
                    <option value="all">All Roles</option>
                    <option value="admin">Admin / Owner</option>
                    <option value="teacher">Teacher</option>
                  </>
                ) : (
                  <>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </>
                )}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin" style={{ color: primaryColor }} />
            </div>
          )}

          {/* Staff Table */}
          {!loading && activeTab === "teachers" && (
            filteredTeachers.length === 0 ? (
              <div className="text-center py-14">
                <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No staff members found</p>
                <p className="text-gray-400 text-sm mt-1">Add your first staff member to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Subjects</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Role</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden lg:table-cell">Class</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTeachers.map((teacher) => (
                      <tr key={teacher.teacher_id || teacher.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 leading-tight">{teacher.full_name}</p>
                              {teacher.is_super_admin && (
                                <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-0.5">
                                  <Crown size={9} /> Admin
                                </span>
                              )}
                              {!teacher.has_login && (
                                <span className="text-[10px] text-amber-500 font-medium">⚠ No login</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{teacher.email}</td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          {teacher.subjects?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.slice(0, 2).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">{s}</span>
                              ))}
                              {teacher.subjects.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md text-xs">+{teacher.subjects.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            teacher.is_super_admin
                              ? "bg-purple-50 text-purple-600"
                              : "bg-green-50 text-green-600"
                          }`}>
                            {teacher.is_super_admin ? 'Admin' : 'Teacher'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs hidden lg:table-cell">
                          {teacher.class_teacher_for || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditingTeacher(teacher); setShowAddModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            {teacher.user_id && (
                              <button
                                onClick={() => setChangePwTeacher(teacher)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Change password"
                              >
                                <Key size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTeacher(teacher)}
                              disabled={teacher.role === 'owner'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                teacher.role === 'owner'
                                  ? "text-gray-200 cursor-not-allowed"
                                  : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Parents Table */}
          {!loading && activeTab === "parents" && (
            filteredParents.length === 0 ? (
              <div className="text-center py-14">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No parents found</p>
                <p className="text-gray-400 text-sm mt-1">Add parents to link them with students</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden md:table-cell">Phone</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Children</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide hidden sm:table-cell">Status</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredParents.map((parent) => (
                      <tr key={parent.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {parent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                            </div>
                            <span className="font-medium text-gray-800">{parent.full_name || "N/A"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{parent.email}</td>
                        <td className="py-3 px-3 text-gray-500 text-xs hidden md:table-cell">{parent.phone || <span className="text-gray-300">—</span>}</td>
                        <td className="py-3 px-3">
                          {parent.linkedStudents?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {parent.linkedStudents.slice(0, 2).map((s) => (
                                <span key={s.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">{s.name.split(' ')[0]}</span>
                              ))}
                              {parent.linkedStudents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-md text-xs">+{parent.linkedStudents.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">None linked</span>
                          )}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                            parent.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                          }`}>
                            {parent.status || "active"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedParent(parent); setShowEditParentModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => { setSelectedParent(parent); setShowManageChildrenModal(true); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Manage Children">
                              <Users size={14} />
                            </button>
                            {parent.user_id && (
                              <button onClick={() => setChangePwParent(parent)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Change password">
                                <Key size={14} />
                              </button>
                            )}
                            <button onClick={() => { setSelectedParent(parent); setShowDeleteParentModal(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══════════════════════════════════════════ */}
      {showAddModal && (
        <AddTeacherModal
          teacher={editingTeacher}
          primaryColor={primaryColor}
          supabase={supabase}
          onClose={() => { setShowAddModal(false); setEditingTeacher(null); }}
          onRefresh={loadAllData}
        />
      )}

      {changePwTeacher && (
        <ChangePasswordModal
          teacher={changePwTeacher}
          onClose={() => setChangePwTeacher(null)}
        />
      )}

      {changePwParent && (
        <ChangePasswordModal
          teacher={changePwParent}
          onClose={() => setChangePwParent(null)}
        />
      )}

      {showAddParentModal && (
        <AddParentModal
          onClose={() => setShowAddParentModal(false)}
          onSave={async () => { await loadAllData(); }}
        />
      )}

      {showEditParentModal && selectedParent && (
        <EditParentModal
          parent={selectedParent}
          onClose={() => { setShowEditParentModal(false); setSelectedParent(null); }}
          onSave={async () => { await loadAllData(); setShowEditParentModal(false); setSelectedParent(null); }}
        />
      )}

      {showManageChildrenModal && selectedParent && (
        <ManageChildrenModal
          parent={selectedParent}
          onClose={() => { setShowManageChildrenModal(false); setSelectedParent(null); }}
          onSave={async () => { await loadAllData(); setShowManageChildrenModal(false); setSelectedParent(null); }}
        />
      )}

      {showDeleteParentModal && selectedParent && (
        <DeleteParentModal
          parent={selectedParent}
          onClose={() => { setShowDeleteParentModal(false); setSelectedParent(null); }}
          onDelete={async () => { await loadAllData(); setShowDeleteParentModal(false); toast.success(`${selectedParent?.full_name} has been removed.`); setSelectedParent(null); }}
        />
      )}

      {showExportEmailsModal && (
        <ExportEmailsModal onClose={() => setShowExportEmailsModal(false)} />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// ADD / EDIT TEACHER MODAL
// ════════════════════════════════════════════════════════════

const ROLES = [
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Can mark attendance and manage grades',
    icon: BookOpenCheck,
    color: 'emerald',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to school management',
    icon: Crown,
    color: 'purple',
  },
];

const colorMap = {
  emerald: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  purple: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' },
};

const AddTeacherModal = ({ teacher, primaryColor, supabase, onClose, onRefresh }) => {
  const { schoolId } = useTenant();
  const { name: schoolName } = useBranding();

  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || "",
    email: teacher?.email || "",
    subjects: teacher?.subjects || [],
    role: teacher?.is_super_admin ? 'admin' : (teacher?.role === 'admin' ? 'admin' : 'teacher'),
    class_teacher_for: teacher?.class_teacher_for || "",
  });
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadOptions(); }, []);

  const loadOptions = async () => {
    const [{ data: subjects }, { data: classes }] = await Promise.all([
      supabase.from("custom_subjects").select("subject_name").eq("is_active", true).order("subject_name"),
      supabase.from("custom_classes").select("class_name").eq("is_active", true).order("class_name"),
    ]);
    setAvailableSubjects(subjects?.map(s => s.subject_name) || []);
    setAvailableClasses(classes?.map(c => c.class_name) || []);
  };

  const toggleSubject = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setError("Please fill in name and email.");
      return;
    }

    const subjects = formData.role === 'admin' ? [] : formData.subjects;
    const class_teacher_for = formData.role === 'admin' ? null : (formData.class_teacher_for || null);

    try {
      setSaving(true);

      if (teacher) {
        // EDIT
        const { error: tErr } = await supabase
          .from('teachers')
          .update({ full_name: formData.full_name, role: formData.role, subjects, class_teacher_for })
          .eq('id', teacher.teacher_id);
        if (tErr) throw tErr;

        await rawSupabase
          .from('profiles')
          .update({ full_name: formData.full_name, role: formData.role })
          .eq('id', teacher.user_id);

        toast.success(`${formData.full_name} updated successfully.`);
        await onRefresh();
        onClose();
      } else {
        // CREATE — atomic via edge function
        const tempPassword = generateTempPassword(schoolName);

        await createTeacher({
          email: formData.email,
          password: tempPassword,
          full_name: formData.full_name,
          role: formData.role,
          subjects,
          class_teacher_for,
        });

        await onRefresh();
        // Show credentials AFTER refresh — do NOT call onClose
        setCredentials({ name: formData.full_name, email: formData.email, password: tempPassword });
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        setError('This email is already registered. Use a different email.');
      } else if (msg.includes('permission') || msg.includes('Insufficient') || msg.includes('staff record')) {
        setError('Permission denied. You need admin or owner role to create accounts.');
      } else {
        setError(msg || 'Failed to create account. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin: ${window.location.origin}`
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  };

  // ── Credentials screen ───────────────────────────────────
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Account Created!</h3>
                <p className="text-emerald-100 text-sm">Share these credentials with {credentials.name}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Credentials card */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {[
                { label: 'Name', value: credentials.name },
                { label: 'Email', value: credentials.email },
                { label: 'Login URL', value: window.location.origin },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  <span className="text-sm text-gray-800 font-medium">{value}</span>
                </div>
              ))}
              {/* Password row */}
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-800 tracking-wider">
                    {showPassword ? credentials.password : '••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(v => !v)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
              {copied ? 'Copied to clipboard!' : 'Copy all credentials'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Ask the staff member to change their password after first login.
            </p>
          </div>

          <div className="px-6 pb-6">
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
              <UserPlus size={18} style={{ color: primaryColor }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">
                {teacher ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">
                {teacher ? "Update their details below" : "A login account will be created automatically"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-shadow"
                required
                placeholder="Jane Smith"
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition-shadow disabled:bg-gray-50 disabled:text-gray-400"
                required
                disabled={!!teacher}
                placeholder="ana@school.com"
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(({ value, label, description, icon: Icon, color }) => {
                const c = colorMap[color];
                const selected = formData.role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: value }))}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      selected ? `${c.border} ${c.bg}` : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={15} className={selected ? c.text : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${selected ? c.text : 'text-gray-700'}`}>{label}</span>
                      {selected && <div className={`ml-auto w-2 h-2 rounded-full ${c.dot}`} />}
                    </div>
                    <p className="text-xs text-gray-400 leading-snug">{description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subjects (teacher only) */}
          {formData.role === 'teacher' && availableSubjects.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Subjects</label>
              <div className="flex flex-wrap gap-2">
                {availableSubjects.map(subject => {
                  const active = formData.subjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        active
                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {active && <span className="mr-1">✓</span>}
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Class teacher for (teacher only) */}
          {formData.role === 'teacher' && availableClasses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Class Teacher For</label>
              <div className="relative">
                <select
                  value={formData.class_teacher_for}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_teacher_for: e.target.value }))}
                  className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 bg-white cursor-pointer"
                  onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                  onBlur={(e) => e.target.style.boxShadow = 'none'}
                >
                  <option value="">None</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: primaryColor }}
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saving
                ? (teacher ? 'Saving...' : 'Creating account...')
                : (teacher ? 'Save Changes' : 'Create Account')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ════════════════════════════════════════════════════════════

const ChangePasswordModal = ({ teacher, onClose }) => {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await rawSupabase.functions.invoke('create-user', {
        body: {
          action: 'update',
          schoolId: getCurrentSchoolId(),
          userId: teacher.user_id,
          password,
        },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed');
      toast.success(`Password updated for ${teacher.full_name}.`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Key size={17} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Change Password</h3>
              <p className="text-xs text-gray-400 mt-0.5">{teacher.full_name} · {teacher.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoFocus
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 bg-gray-50 text-sm"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !password} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileManagementPage;
