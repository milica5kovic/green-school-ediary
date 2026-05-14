import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  Users,
  Mail,
  Shield,
  AlertTriangle,
  BookOpen,
  Search,
  Filter,
  UserPlus,
  GraduationCap,
  ChevronDown,
  Copy,
} from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";
import { useBranding } from "../../../../core/context/BrandingContext";
import { useTenant } from "../../../../core/context/TenantContext";
import {
  supabase as rawSupabase,
  getCurrentSchoolId,
} from "../../../../core/infrastructure/supabaseClient";
import { createUser, generateTempPassword } from "../../../../core/infrastructure/adminApi";

import AddParentModal from "../../parents/modals/AddParentModal";
import EditParentModal from "../../parents/modals/EditParentModal";
import ManageChildrenModal from "../../parents/modals/ManageChildrenModal";
import DeleteParentModal from "../../parents/modals/DeleteParentModal";
import ExportEmailsModal from "../../parents/modals/ExportEmailsModal";

const ProfileManagementPage = () => {
  const { supabase } = useApp();
  const { primaryColor } = useBranding();
  
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [showEditParentModal, setShowEditParentModal] = useState(false);
  const [showManageChildrenModal, setShowManageChildrenModal] = useState(false);
  const [showDeleteParentModal, setShowDeleteParentModal] = useState(false);
  const [showExportEmailsModal, setShowExportEmailsModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeTab, setActiveTab] = useState("teachers");
  const [loading, setLoading] = useState(false);

  const [parentFilters, setParentFilters] = useState({ status: "all", search: "" });
  const [teacherFilters, setTeacherFilters] = useState({ role: 'all', search: '' });

  // ════════════════════════════════════════════════════════════
  // DATA LOADING
  // ════════════════════════════════════════════════════════════

  const loadTeachers = async () => {
    try {
      setLoading(true);

      // Primary source: teachers table (tenant-scoped, always complete)
      const { data: teacherRecords, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');

      if (error) throw error;

      // Enrich with profile data where available (for role/super-admin flag)
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
          is_super_admin: effectiveRole === 'admin',
          teacher_id: t.id,
          has_login: !!t.user_id,
        };
      });

      setTeachers(combined);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParents = async () => {
    try {
      setLoading(true);

      const { data: parentsData } = await supabase
        .from("parents")
        .select("*")
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
      console.error("Error loading parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("status", "active")
        .order("name");
      setStudents(data || []);
    } catch (error) {
      console.error("Error loading students:", error);
    }
  };

  const loadAllData = async () => {
    await Promise.all([loadTeachers(), loadParents(), loadStudents()]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ════════════════════════════════════════════════════════════
  // FILTERS
  // ════════════════════════════════════════════════════════════

  const filteredTeachers = teachers.filter(teacher => {
    if (teacherFilters.role !== 'all') {
      if (teacherFilters.role === 'super_admin' && !teacher.is_super_admin) return false;
      if (teacherFilters.role === 'admin' && (teacher.is_super_admin || teacher.role !== 'admin')) return false;
      if (teacherFilters.role === 'teacher' && teacher.role !== 'teacher') return false;
    }
    if (teacherFilters.search) {
      const search = teacherFilters.search.toLowerCase();
      if (!teacher.full_name?.toLowerCase().includes(search) &&
          !teacher.email?.toLowerCase().includes(search) &&
          !teacher.subjects?.some(s => s.toLowerCase().includes(search))) {
        return false;
      }
    }
    return true;
  });

  const filteredParents = parents.filter((parent) => {
    if (parentFilters.status !== "all" && parent.status !== parentFilters.status) return false;
    if (parentFilters.search) {
      const search = parentFilters.search.toLowerCase();
      if (!parent.full_name?.toLowerCase().includes(search) &&
          !parent.email?.toLowerCase().includes(search) &&
          !parent.linkedStudents?.some((s) => s.name.toLowerCase().includes(search))) {
        return false;
      }
    }
    return true;
  });

  // ════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════

  const handleDeleteTeacher = async (teacher) => {
    if (teacher.is_super_admin) {
      alert("❌ Cannot delete Super Admin!");
      return;
    }
    if (!window.confirm(`Delete ${teacher.full_name}?`)) return;

    try {
      setLoading(true);
      if (teacher.teacher_id) {
        await supabase.from("teachers").delete().eq("id", teacher.teacher_id);
      }
      await rawSupabase.from("profiles").delete().eq("id", teacher.user_id);
      alert("✅ User deleted!");
      await loadTeachers();
    } catch (error) {
      alert("❌ Failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // CSV IMPORT HELPERS
  // ════════════════════════════════════════════════════════════

  const parseCsvRows = (text) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      // handle quoted fields containing commas
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
    if (!rows.length) { alert('No data rows found in CSV.'); return; }

    const schoolId = getCurrentSchoolId();
    const inserts = rows
      .filter(r => r.full_name && r.email)
      .map(r => ({
        school_id: schoolId,
        full_name: r.full_name,
        email: r.email,
        subjects: r.subjects ? r.subjects.split(';').map(s => s.trim()).filter(Boolean) : [],
        class_teacher_for: r.class_teacher_for || null,
        is_active: true,
      }));

    if (!inserts.length) { alert('No valid rows (full_name + email required).'); return; }

    const { error } = await supabase.from('teachers').insert(inserts);
    if (error) { alert(`Import failed: ${error.message}`); return; }
    alert(`✅ ${inserts.length} teacher${inserts.length !== 1 ? 's' : ''} imported successfully.`);
    loadTeachers();
  };

  const handleParentCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    const { rows } = parseCsvRows(text);
    if (!rows.length) { alert('No data rows found in CSV.'); return; }

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

      // Link students by name if provided
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

    alert(`✅ ${imported} parent${imported !== 1 ? 's' : ''} imported.${failed ? ` ${failed} rows skipped (missing name/email).` : ''}`);
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
      {/* ═══ HEADER ═══════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Profile Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage staff and parent accounts</p>
        </div>

        {/* Action Buttons */}
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
          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "teachers"
                ? "border-b-2 bg-opacity-10"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={activeTab === "teachers" ? { 
              borderColor: primaryColor, 
              color: primaryColor,
              backgroundColor: `${primaryColor}08`
            } : {}}
          >
            <GraduationCap size={16} />
            Staff ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab("parents")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === "parents"
                ? "border-b-2 bg-opacity-10"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
            style={activeTab === "parents" ? { 
              borderColor: primaryColor, 
              color: primaryColor,
              backgroundColor: `${primaryColor}08`
            } : {}}
          >
            <Users size={16} />
            Parents ({parents.length})
          </button>
        </div>

        {/* ═══ CONTENT ════════════════════════════════════════ */}
        <div className="p-4">
          
          {/* ─── FILTERS ─────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === "teachers" ? "Search staff..." : "Search parents..."}
                value={activeTab === "teachers" ? teacherFilters.search : parentFilters.search}
                onChange={(e) => activeTab === "teachers" 
                  ? setTeacherFilters({ ...teacherFilters, search: e.target.value })
                  : setParentFilters({ ...parentFilters, search: e.target.value })
                }
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-shadow"
                style={{ '--tw-ring-color': `${primaryColor}40` }}
                onFocus={(e) => e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
              />
            </div>
            <div className="relative">
              <select
                value={activeTab === "teachers" ? teacherFilters.role : parentFilters.status}
                onChange={(e) => activeTab === "teachers"
                  ? setTeacherFilters({ ...teacherFilters, role: e.target.value })
                  : setParentFilters({ ...parentFilters, status: e.target.value })
                }
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 transition-shadow cursor-pointer"
                style={{ '--tw-ring-color': `${primaryColor}40` }}
              >
                {activeTab === "teachers" ? (
                  <>
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
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

          {/* ─── LOADING ─────────────────────────────────────── */}
          {loading && (
            <div className="flex justify-center py-12">
              <div 
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* ─── STAFF TABLE ─────────────────────────────────── */}
          {!loading && activeTab === "teachers" && (
            filteredTeachers.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No staff members found</p>
                <p className="text-gray-400 text-sm mt-1">Add your first staff member to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 hidden md:table-cell">Subjects</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Role</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 hidden lg:table-cell">Class Teacher</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-600 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTeachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {teacher.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{teacher.full_name}</p>
                              {teacher.is_super_admin && (
                                <span className="text-[10px] text-purple-600 font-medium">★ Super Admin</span>
                              )}
                              {!teacher.has_login && (
                                <span className="text-[10px] text-amber-600 font-medium">⚠ No login account</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{teacher.email}</td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          {teacher.subjects?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects.slice(0, 2).map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                  {s}
                                </span>
                              ))}
                              {teacher.subjects.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{teacher.subjects.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            teacher.is_super_admin ? "bg-purple-100 text-purple-700"
                            : teacher.role === "admin" ? "bg-indigo-100 text-indigo-700"
                            : "bg-green-100 text-green-700"
                          }`}>
                            {teacher.is_super_admin ? "S.Admin" : teacher.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600 hidden lg:table-cell">
                          {teacher.class_teacher_for || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditingTeacher(teacher); setShowAddModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teacher)}
                              disabled={teacher.is_super_admin}
                              className={`p-1.5 rounded-lg transition-colors ${
                                teacher.is_super_admin 
                                  ? "text-gray-300 cursor-not-allowed" 
                                  : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                              }`}
                            >
                              <Trash2 size={15} />
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

          {/* ─── PARENTS TABLE ───────────────────────────────── */}
          {!loading && activeTab === "parents" && (
            filteredParents.length === 0 ? (
              <div className="text-center py-12">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No parents found</p>
                <p className="text-gray-400 text-sm mt-1">Add parents to link them with students</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Email</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 hidden md:table-cell">Phone</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Children</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600 hidden sm:table-cell">Status</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-600 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredParents.map((parent) => (
                      <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {parent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                            </div>
                            <span className="font-medium text-gray-800">{parent.full_name || "N/A"}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{parent.email}</td>
                        <td className="py-3 px-3 text-gray-600 hidden md:table-cell">{parent.phone || "—"}</td>
                        <td className="py-3 px-3">
                          {parent.linkedStudents?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {parent.linkedStudents.slice(0, 2).map((s) => (
                                <span key={s.id} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                  {s.name.split(' ')[0]}
                                </span>
                              ))}
                              {parent.linkedStudents.length > 2 && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{parent.linkedStudents.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">No children linked</span>
                          )}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            parent.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {parent.status || "active"}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setSelectedParent(parent); setShowEditParentModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => { setSelectedParent(parent); setShowManageChildrenModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Manage Children"
                            >
                              <Users size={15} />
                            </button>
                            <button
                              onClick={() => { setSelectedParent(parent); setShowDeleteParentModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
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
          onSave={async () => { await loadAllData(); setShowAddModal(false); setEditingTeacher(null); }}
        />
      )}

      {showAddParentModal && (
        <AddParentModal
          onClose={() => setShowAddParentModal(false)}
          onSave={async () => { await loadAllData(); setShowAddParentModal(false); }}
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
          onDelete={async () => { await loadAllData(); setShowDeleteParentModal(false); setSelectedParent(null); }}
        />
      )}

      {showExportEmailsModal && (
        <ExportEmailsModal onClose={() => setShowExportEmailsModal(false)} />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// ADD/EDIT TEACHER MODAL
// ════════════════════════════════════════════════════════════

const AddTeacherModal = ({ teacher, primaryColor, supabase, onClose, onSave }) => {
  const { schoolId } = useTenant();
  const { name: schoolName } = useBranding();

  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || "",
    email: teacher?.email || "",
    subjects: teacher?.subjects || [],
    user_type: teacher?.is_super_admin ? "super_admin" : teacher?.role === "admin" ? "admin" : "teacher",
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
    const { data: subjects } = await supabase.from("custom_subjects").select("subject_name").eq("is_active", true).order("subject_name");
    const { data: classes } = await supabase.from("custom_classes").select("class_name").eq("is_active", true).order("class_name");
    setAvailableSubjects(subjects?.map(s => s.subject_name) || []);
    setAvailableClasses(classes?.map(c => c.class_name) || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setError("Please fill in name and email.");
      return;
    }

    const role = formData.user_type === 'super_admin' ? 'admin' : formData.user_type;
    const subjects = formData.user_type === 'admin' ? [] : formData.subjects;
    const class_teacher_for = formData.user_type === 'admin' ? null : (formData.class_teacher_for || null);

    try {
      setSaving(true);

      if (teacher) {
        // ── EDIT existing teacher ────────────────────────────
        const { error: tErr } = await supabase
          .from('teachers')
          .update({ full_name: formData.full_name, role, subjects, class_teacher_for })
          .eq('id', teacher.teacher_id);
        if (tErr) throw tErr;

        await supabase
          .from('profiles')
          .update({ full_name: formData.full_name, role })
          .eq('id', teacher.id);

        onSave();
      } else {
        // ── CREATE new teacher ───────────────────────────────

        // Pre-check: does this email already exist in teachers for this school?
        const { data: existing } = await supabase
          .from('teachers')
          .select('id')
          .eq('email', formData.email)
          .maybeSingle();

        if (existing) {
          setError('A staff member with this email already exists in your school.');
          return;
        }

        const tempPassword = generateTempPassword(schoolName);

        // 1. Create auth user
        const authUser = await createUser(formData.email, tempPassword, {
          full_name: formData.full_name,
          role,
        });
        if (!authUser?.id) throw new Error('Failed to create auth user.');

        // Small delay so DB triggers can fire
        await new Promise(r => setTimeout(r, 500));

        // 2. Insert teacher record
        const { error: tErr } = await supabase
          .from('teachers')
          .insert([{
            user_id: authUser.id,
            school_id: schoolId,
            full_name: formData.full_name,
            email: formData.email,
            role,
            subjects,
            class_teacher_for,
            is_active: true,
          }]);
        if (tErr) {
          if (tErr.message?.includes('duplicate') || tErr.message?.includes('unique')) {
            setError('A staff member with this email already exists.');
          } else {
            setError(tErr.message || 'Account created but failed to save staff record. Contact support.');
          }
          return;
        }

        setCredentials({ name: formData.full_name, email: formData.email, password: tempPassword });
        onSave();
      }
    } catch (err) {
      if (err.message?.includes('already registered') || err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        setError('This email is already registered. Please use a different email.');
      } else if (err.message?.includes('permission') || err.message?.includes('Insufficient')) {
        setError('Permission denied. You need admin or owner role to create users.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(
      `Name: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}\nLogin: ${window.location.origin}`
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); })
    .catch(() => {});
  };

  // ── Credentials screen ───────────────────────────────────
  if (credentials) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="p-6 border-b bg-emerald-50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Staff Account Created</h3>
              <p className="text-sm text-gray-500">Share these credentials with the staff member</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-2.5 text-sm font-mono">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Name</span>
                <span className="text-gray-900">{credentials.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Email</span>
                <span className="text-gray-900">{credentials.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Password</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 tracking-wider">
                    {showPassword ? credentials.password : '••••••••'}
                  </span>
                  <button onClick={() => setShowPassword(v => !v)} className="text-gray-400 hover:text-gray-600">
                    {showPassword
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-sans font-medium">Login URL</span>
                <span className="text-gray-900 text-xs">{window.location.origin}</span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              <Copy size={14} />
              {copied ? 'Copied!' : 'Copy credentials'}
            </button>
            <p className="text-xs text-gray-400 text-center">⚠️ Ask the staff member to change their password after first login.</p>
          </div>

          <div className="px-6 pb-6">
            <button onClick={onClose} className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 font-medium transition-colors">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">
            {teacher ? "Edit Staff Member" : "Add Staff Member"}
          </h3>
          <p className="text-gray-500 text-sm">
            {teacher ? "Update account details" : "A login account will be created automatically"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition-shadow"
              required
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 transition-shadow"
              required
              disabled={!!teacher}
              placeholder="john@school.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {formData.user_type !== "admin" && formData.user_type !== "super_admin" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subjects</label>
                <select
                  multiple
                  value={formData.subjects}
                  onChange={(e) => setFormData({ ...formData, subjects: Array.from(e.target.selectedOptions, o => o.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                  size="4"
                >
                  {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Ctrl/Cmd + click to select multiple</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher For</label>
                <select
                  value={formData.class_teacher_for}
                  onChange={(e) => setFormData({ ...formData, class_teacher_for: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
                >
                  <option value="">None</option>
                  {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? "Creating..." : teacher ? "Update" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileManagementPage;