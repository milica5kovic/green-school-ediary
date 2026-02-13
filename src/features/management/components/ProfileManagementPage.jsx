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
} from "lucide-react";
import {
  supabase,
  createUserWithAdmin,
  hasAdminAccess,
} from "../../../core/infrastructure/supabaseClient";



// ✅ Import all modals
import AddParentModal from "../../parents/modals/AddParentModal";
import EditParentModal from "../../parents/modals/EditParentModal";
import ManageChildrenModal from "../../parents/modals/ManageChildrenModal";
import DeleteParentModal from "../../parents/modals/DeleteParentModal";
import ExportEmailsModal from "../../parents/modals/ExportEmailsModal";

const ProfileManagementPage = () => {
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

  const [parentFilters, setParentFilters] = useState({
    status: "all",
    search: "",
  });
  const [teacherFilters, setTeacherFilters] = useState({
  role: 'all',
  search: ''
});

const loadTeachers = async () => {
  try {
    setLoading(true);
    
    // ✅ Load auth users first to get emails
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    // ✅ Load all profiles with admin or teacher role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .in('role', ['admin', 'teacher'])
      .order('full_name');
    
    if (profilesError) throw profilesError;

    // ✅ Load all teacher records
    const { data: teacherRecords, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .order('full_name');
    
    if (teachersError) throw teachersError;

    // ✅ Combine data
    const combined = profiles.map(profile => {
      const teacherRecord = teacherRecords.find(t => t.user_id === profile.id);
      const authUser = authUsers?.users?.find(u => u.id === profile.id);
      
      return {
        id: profile.id,
        user_id: profile.id,
        email: authUser?.email || teacherRecord?.email || 'No email',
        full_name: profile.full_name || teacherRecord?.full_name || 'Unnamed',
        role: profile.role,
        subjects: teacherRecord?.subjects || [],
        class_teacher_for: teacherRecord?.class_teacher_for || null,
        is_super_admin: profile.role === 'admin' && teacherRecord !== undefined,
        teacher_id: teacherRecord?.id || null
      };
    });
    
    console.log('✅ Staff loaded:', combined.length);
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

      const { data: parentsData, error: parentsError } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");

      if (parentsError) throw parentsError;

      const { data: linksData, error: linksError } = await supabase.from(
        "student_parents",
      ).select(`
          parent_id,
          student:students(id, name, class_name, email)
        `);

      if (linksError) throw linksError;

      const parentsWithStudents = (parentsData || []).map((parent) => ({
        ...parent,
        linkedStudents: (linksData || [])
          .filter((link) => link.parent_id === parent.id)
          .map((link) => link.student),
      }));

      console.log("✅ Parents loaded:", parentsWithStudents.length);
      setParents(parentsWithStudents);
    } catch (error) {
      console.error("Error loading parents:", error);
    } finally {
      setLoading(false);
    }
  };
  const getFilteredTeachers = () => {
  return teachers.filter(teacher => {
    // Role filter
    if (teacherFilters.role !== 'all') {
      if (teacherFilters.role === 'super_admin' && !teacher.is_super_admin) return false;
      if (teacherFilters.role === 'admin' && (teacher.is_super_admin || teacher.role !== 'admin')) return false;
      if (teacherFilters.role === 'teacher' && teacher.role !== 'teacher') return false;
    }

    // Search filter
    if (teacherFilters.search) {
      const search = teacherFilters.search.toLowerCase();
      const matchesName = teacher.full_name?.toLowerCase().includes(search);
      const matchesEmail = teacher.email?.toLowerCase().includes(search);
      const matchesSubject = teacher.subjects?.some(s => s.toLowerCase().includes(search));
      
      if (!matchesName && !matchesEmail && !matchesSubject) {
        return false;
      }
    }

    return true;
  });
};

const filteredTeachers = getFilteredTeachers();

  const loadStudents = async () => {
    try {
      console.log("👨‍🎓 Loading students...");
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      console.log("✅ Students loaded:", data?.length || 0);
      setStudents(data || []);
    } catch (error) {
      console.error("❌ Error loading students:", error);
      setStudents([]);
    }
  };

  const loadAllData = async () => {
    console.log("🔄 Loading all management data...");
    await Promise.all([loadTeachers(), loadParents(), loadStudents()]);
  };

  useEffect(() => {
    if (teachers.length === 0 && parents.length === 0) {
      loadAllData();
    }
  }, [activeTab]);

const handleDeleteTeacher = async (teacher) => {
  if (teacher.is_super_admin) {
    alert("❌ Cannot delete Super Admin!\n\nSuper Admins have elevated privileges and cannot be removed.");
    return;
  }

  if (!window.confirm(`⚠️ DELETE USER?\n\nName: ${teacher.full_name}\nEmail: ${teacher.email}\n\nThis will:\n• Delete their account\n• Remove all their data\n• Cannot be undone!\n\nContinue?`)) {
    return;
  }

  try {
    setLoading(true);

    console.log('🗑️ Deleting user:', teacher.user_id);

    // 1. Delete from auth (FIRST - most important)
    try {
      const { data: adminClient } = await supabase.rpc('delete_user', { user_id: teacher.user_id });
      console.log('✅ Auth user deleted');
    } catch (authError) {
      console.warn('⚠️ Auth delete warning:', authError);
      // Continue anyway - user might already be deleted from auth
    }

    // 2. Delete teacher record if exists
    if (teacher.teacher_id) {
      const { error: teacherError } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacher.teacher_id);
      
      if (teacherError) {
        console.error('Teacher delete error:', teacherError);
      } else {
        console.log('✅ Teacher record deleted');
      }
    }

    // 3. Delete profile (should cascade delete via RLS)
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", teacher.user_id);
    
    if (profileError) {
      console.error('Profile delete error:', profileError);
    } else {
      console.log('✅ Profile deleted');
    }
    
    alert("✅ User deleted successfully!");
    await loadTeachers();
  } catch (error) {
    console.error("❌ Delete failed:", error);
    alert("❌ Failed to delete user.\n\nError: " + error.message + "\n\nPlease check browser console for details.");
  } finally {
    setLoading(false);
  }
};
  const getFilteredParents = () => {
    return parents.filter((parent) => {
      if (
        parentFilters.status !== "all" &&
        parent.status !== parentFilters.status
      ) {
        return false;
      }

      if (parentFilters.search) {
        const search = parentFilters.search.toLowerCase();
        const matchesName = parent.full_name?.toLowerCase().includes(search);
        const matchesEmail = parent.email?.toLowerCase().includes(search);
        const matchesStudent = parent.linkedStudents?.some((s) =>
          s.name.toLowerCase().includes(search),
        );

        if (!matchesName && !matchesEmail && !matchesStudent) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredParents = getFilteredParents();

  // CSV functions remain the same...
  const downloadTeacherTemplate = () => {
    const csv = `full_name,email,subjects,role,class_teacher_for
John Doe,john.doe@school.com,"Mathematics;Physics",teacher,Y7
Jane Smith,jane.smith@school.com,"English;Literature",teacher,Y5A
Admin User,admin@school.com,,admin,`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "teachers_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleTeacherCSVUpload = async (e) => {
    // Keep existing CSV upload logic...
    const file = e.target.files[0];
    if (!file) return;

    if (!hasAdminAccess()) {
      alert("⚠️ Admin features not configured. Contact system administrator.");
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const teachers = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        if (values.length < 2) continue;

        const teacher = {
          full_name: values[0],
          email: values[1],
          subjects: values[2]
            ? values[2]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          role: values[3] || "teacher",
          class_teacher_for: values[4] || null,
        };

        if (!teacher.full_name || !teacher.email) {
          errors.push(`Line ${i + 1}: Missing name or email`);
          continue;
        }

        teachers.push(teacher);
      }

      if (errors.length > 0) {
        alert(
          `⚠️ CSV Errors:\n${errors.join("\n")}\n\nPlease fix and try again.`,
        );
        return;
      }

      if (!window.confirm(`Upload ${teachers.length} users?`)) {
        return;
      }

      const results = [];
      const failedTeachers = [];

      for (const teacher of teachers) {
        try {
          const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;

          const authData = await createUserWithAdmin(
            teacher.email,
            tempPassword,
            {
              full_name: teacher.full_name,
              role: teacher.role,
              subjects: teacher.subjects,
            },
          );

          await supabase.from("profiles").insert([
            {
              id: authData.id,
              role: teacher.role,
              full_name: teacher.full_name,
            },
          ]);

          // Only create teacher record if they have subjects
          if (teacher.subjects.length > 0 || teacher.class_teacher_for) {
            await supabase.from("teachers").insert([
              {
                user_id: authData.id,
                email: teacher.email,
                full_name: teacher.full_name,
                subjects: teacher.subjects,
                role: teacher.role,
                class_teacher_for: teacher.class_teacher_for,
              },
            ]);
          }

          results.push({
            name: teacher.full_name,
            email: teacher.email,
            password: tempPassword,
          });
        } catch (error) {
          console.error(`Error creating ${teacher.email}:`, error);
          failedTeachers.push(`${teacher.full_name}: ${error.message}`);
        }
      }

      await loadTeachers();

      if (results.length > 0) {
        const credentialsList = results
          .map(
            (r) => `${r.name}\n  Email: ${r.email}\n  Password: ${r.password}`,
          )
          .join("\n\n");

        const message =
          `✅ Created ${results.length} users!\n\n` +
          `CREDENTIALS:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          credentialsList +
          `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ SAVE THESE CREDENTIALS!`;

        try {
          await navigator.clipboard.writeText(credentialsList);
          alert(message + "\n\n📋 Copied to clipboard!");
        } catch {
          alert(message);
        }
      }

      if (failedTeachers.length > 0) {
        alert(`⚠️ Some failed:\n${failedTeachers.join("\n")}`);
      }
    } catch (error) {
      console.error("CSV Upload Error:", error);
      alert(`❌ Upload failed: ${error.message}`);
    }

    e.target.value = "";
  };

  // Parent CSV functions remain the same...
  const downloadParentTemplate = () => {
    const csv = `full_name,email,phone,student_names
Jane Doe,jane.doe@email.com,+381601234567,"John Doe;Mary Doe"
Mike Smith,mike.smith@email.com,+381609876543,"Sarah Smith"
Anna Johnson,anna.j@email.com,,`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parents_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleParentCSVUpload = async (e) => {
    // Keep existing parent CSV logic...
    const file = e.target.files[0];
    if (!file) return;

    if (!hasAdminAccess()) {
      alert("⚠️ Admin features not configured.");
      return;
    }

    try {
      const { data: allStudents } = await supabase
        .from("students")
        .select("*")
        .eq("status", "active");

      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const parents = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        if (values.length < 2) continue;

        const parent = {
          full_name: values[0],
          email: values[1],
          phone: values[2] || null,
          student_names: values[3]
            ? values[3]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        };

        if (!parent.full_name || !parent.email) {
          errors.push(`Line ${i + 1}: Missing name or email`);
          continue;
        }

        parents.push(parent);
      }

      if (errors.length > 0) {
        alert(`⚠️ CSV Errors:\n${errors.join("\n")}`);
        return;
      }

      if (!window.confirm(`Upload ${parents.length} parents?`)) {
        return;
      }

      const results = [];
      const failedParents = [];

      for (const parent of parents) {
        try {
          const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;

          const authData = await createUserWithAdmin(
            parent.email,
            tempPassword,
            {
              full_name: parent.full_name,
              role: "parent",
            },
          );

          await new Promise((resolve) => setTimeout(resolve, 500));

          const { data: parentData } = await supabase
            .from("parents")
            .insert([
              {
                user_id: authData.id,
                email: parent.email,
                full_name: parent.full_name,
                phone: parent.phone,
                status: "active",
              },
            ])
            .select()
            .single();

          const linkedStudents = [];
          for (const studentName of parent.student_names) {
            if (!studentName) continue;

            const student = allStudents.find(
              (s) => s.name.toLowerCase() === studentName.toLowerCase(),
            );

            if (student) {
              await supabase.from("student_parents").insert([
                {
                  student_id: student.id,
                  parent_id: parentData.id,
                  relationship: "parent",
                  is_primary: linkedStudents.length === 0,
                },
              ]);

              linkedStudents.push(student.name);
            }
          }

          results.push({
            name: parent.full_name,
            email: parent.email,
            password: tempPassword,
            students: linkedStudents,
          });
        } catch (error) {
          console.error(`Error creating ${parent.email}:`, error);
          failedParents.push(`${parent.full_name}: ${error.message}`);
        }
      }

      await loadParents();

      if (results.length > 0) {
        const credentialsList = results
          .map(
            (r) =>
              `${r.name}\n  Email: ${r.email}\n  Password: ${r.password}\n  Students: ${r.students.join(", ") || "None"}`,
          )
          .join("\n\n");

        const message =
          `✅ Created ${results.length} parents!\n\n` +
          credentialsList +
          `\n\n⚠️ SAVE THESE CREDENTIALS!`;

        try {
          await navigator.clipboard.writeText(credentialsList);
          alert(message + "\n\n📋 Copied to clipboard!");
        } catch {
          alert(message);
        }
      }

      if (failedParents.length > 0) {
        alert(`⚠️ Some failed:\n${failedParents.join("\n")}`);
      }
    } catch (error) {
      console.error("CSV Upload Error:", error);
      alert(`❌ Upload failed: ${error.message}`);
    }

    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Profile Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage teachers, admins, parents, and student profiles
            </p>
          </div>

          {activeTab === "teachers" && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingTeacher(null);
                  setShowAddModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Add User
              </button>
              <label className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
                <Upload size={20} />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleTeacherCSVUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={downloadTeacherTemplate}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all flex items-center gap-2"
              >
                <Download size={20} />
                Template
              </button>
            </div>
          )}

          {activeTab === "parents" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddParentModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Add Parent
              </button>
              <button
                onClick={() => setShowExportEmailsModal(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Mail size={20} />
                Export Emails
              </button>
              <label className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
                <Upload size={20} />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleParentCSVUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={downloadParentTemplate}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all flex items-center gap-2"
              >
                <Download size={20} />
                Template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === "teachers"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
            }`}
          >
            Teachers & Admins
          </button>
          <button
            onClick={() => setActiveTab("parents")}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === "parents"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
            }`}
          >
            Parents
          </button>
        </div>

        <div className="p-6">
          {activeTab === "teachers" && (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-800">
        All Staff Members ({filteredTeachers.length})
      </h3>
    </div>

    {/* ✅ FILTERS */}
    <div className="mb-4 flex gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search by name, email, or subject..."
          value={teacherFilters.search}
          onChange={(e) => setTeacherFilters({ ...teacherFilters, search: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>
      <select
        value={teacherFilters.role}
        onChange={(e) => setTeacherFilters({ ...teacherFilters, role: e.target.value })}
        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      >
        <option value="all">All Roles</option>
        <option value="super_admin">Super Admin</option>
        <option value="admin">Admin</option>
        <option value="teacher">Teacher</option>
      </select>
    </div>

    {loading ? (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ) : filteredTeachers.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 font-medium">
          {teacherFilters.search || teacherFilters.role !== 'all'
            ? 'No staff members match your filters'
            : 'No staff members added yet'}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Click "Add User" to get started
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-purple-50 border-b border-purple-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">Subjects</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">Role</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">Class Teacher</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-purple-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-purple-50 transition-colors">
                {/* NAME */}
                <td className="px-4 py-3 font-medium text-gray-800">
                  <div className="flex items-center gap-2">
                    {teacher.full_name}
                    {teacher.is_super_admin && (
                      <Shield size={14} className="text-purple-600" title="Super Admin" />
                    )}
                  </div>
                </td>

                {/* EMAIL */}
                <td className="px-4 py-3 text-gray-600">
                  {teacher.email}
                </td>

                {/* SUBJECTS */}
                <td className="px-4 py-3">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((subject, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>

                {/* ROLE */}
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    teacher.is_super_admin
                      ? "bg-purple-100 text-purple-700"
                      : teacher.role === "admin"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-green-100 text-green-700"
                  }`}>
                    {teacher.is_super_admin ? "sadmin" : teacher.role}
                  </span>
                </td>

                {/* CLASS TEACHER */}
                <td className="px-4 py-3 text-gray-600">
                  {teacher.class_teacher_for || "-"}
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingTeacher(teacher);
                        setShowAddModal(true);
                      }}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    {teacher.is_super_admin ? (
                      <button
                        disabled
                        className="p-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                        title="Cannot delete Super Admin"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteTeacher(teacher)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
          {activeTab === "parents" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  All Parents ({filteredParents.length})
                </h3>
              </div>

              <div className="mb-4 flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, email, or student..."
                    value={parentFilters.search}
                    onChange={(e) =>
                      setParentFilters({
                        ...parentFilters,
                        search: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <select
                  value={parentFilters.status}
                  onChange={(e) =>
                    setParentFilters({
                      ...parentFilters,
                      status: e.target.value,
                    })
                  }
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {filteredParents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium">
                    {parentFilters.search || parentFilters.status !== "all"
                      ? "No parents match your filters"
                      : "No parents registered yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-purple-50 border-b border-purple-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Linked Students
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-purple-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredParents.map((parent) => (
                        <tr
                          key={parent.id}
                          className="hover:bg-purple-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {parent.full_name || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {parent.email}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {parent.phone || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                parent.status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {parent.status || "active"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {parent.linkedStudents &&
                            parent.linkedStudents.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {parent.linkedStudents.map((student) => (
                                  <span
                                    key={student.id}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                  >
                                    {student.name} ({student.class_name})
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No linked students
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedParent(parent);
                                  setShowEditParentModal(true);
                                }}
                                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedParent(parent);
                                  setShowManageChildrenModal(true);
                                }}
                                className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                                title="Manage Children"
                              >
                                <Users size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedParent(parent);
                                  setShowDeleteParentModal(true);
                                }}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showAddModal && (
        <AddTeacherModal
          teacher={editingTeacher}
          onClose={() => {
            setShowAddModal(false);
            setEditingTeacher(null);
          }}
          onSave={async () => {
            await loadAllData();
            setShowAddModal(false);
            setEditingTeacher(null);
          }}
        />
      )}

      {showAddParentModal && (
        <AddParentModal
          onClose={() => setShowAddParentModal(false)}
          onSave={async () => {
            await loadAllData();
            setShowAddParentModal(false);
          }}
        />
      )}

      {showEditParentModal && selectedParent && (
        <EditParentModal
          parent={selectedParent}
          onClose={() => {
            setShowEditParentModal(false);
            setSelectedParent(null);
          }}
          onSave={async () => {
            await loadAllData();
            setShowEditParentModal(false);
            setSelectedParent(null);
          }}
        />
      )}

      {showManageChildrenModal && selectedParent && (
        <ManageChildrenModal
          parent={selectedParent}
          onClose={() => {
            setShowManageChildrenModal(false);
            setSelectedParent(null);
          }}
          onSave={async () => {
            await loadAllData();
            setShowManageChildrenModal(false);
            setSelectedParent(null);
          }}
        />
      )}

      {showDeleteParentModal && selectedParent && (
        <DeleteParentModal
          parent={selectedParent}
          onClose={() => {
            setShowDeleteParentModal(false);
            setSelectedParent(null);
          }}
          onDelete={async () => {
            await loadAllData();
            setShowDeleteParentModal(false);
            setSelectedParent(null);
          }}
        />
      )}

      {showExportEmailsModal && (
        <ExportEmailsModal onClose={() => setShowExportEmailsModal(false)} />
      )}
    </div>
  );
};

// ============================================
// ✅ MODERN ADD TEACHER/ADMIN MODAL
// ============================================
const AddTeacherModal = ({ teacher, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || "",
    email: teacher?.email || "",
    subjects: teacher?.subjects || [],
    user_type: teacher?.is_super_admin
      ? "super_admin"
      : teacher?.role === "admin"
        ? "admin"
        : "teacher",
    class_teacher_for: teacher?.class_teacher_for || "",
  });
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadClasses();
  }, []);

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("custom_subjects")
      .select("subject_name")
      .eq("is_active", true)
      .order("subject_name");
    setAvailableSubjects(data?.map((s) => s.subject_name) || []);
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from("custom_classes")
      .select("class_name")
      .eq("is_active", true)
      .order("class_name");
    setAvailableClasses(data?.map((c) => c.class_name) || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email) {
      alert("Please fill in name and email");
      return;
    }

    // Validate user type selection
    if (formData.user_type === "teacher" && formData.subjects.length === 0) {
      if (!window.confirm("Teacher has no subjects assigned. Continue?")) {
        return;
      }
    }

    try {
      setSaving(true);

      if (teacher) {
        // ✅ UPDATE EXISTING USER
        const isChangingToAdmin =
          formData.user_type === "admin" && teacher.subjects.length > 0;
        const isChangingToTeacher =
          formData.user_type === "teacher" &&
          teacher.role === "admin" &&
          !teacher.subjects.length;

        // Update profile
        await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            role:
              formData.user_type === "super_admin"
                ? "admin"
                : formData.user_type,
          })
          .eq("id", teacher.user_id);

        // Handle teacher record
        if (
          formData.user_type === "admin" &&
          !formData.subjects.length &&
          !formData.class_teacher_for
        ) {
          // Pure admin - delete teacher record if exists
          if (teacher.teacher_id) {
            await supabase
              .from("teachers")
              .delete()
              .eq("id", teacher.teacher_id);
          }
        } else {
          // Has subjects or is class teacher - upsert teacher record
          if (teacher.teacher_id) {
            await supabase
              .from("teachers")
              .update({
                full_name: formData.full_name,
                subjects: formData.subjects,
                role:
                  formData.user_type === "super_admin"
                    ? "admin"
                    : formData.user_type,
                class_teacher_for: formData.class_teacher_for || null,
              })
              .eq("id", teacher.teacher_id);
          } else {
            await supabase.from("teachers").insert([
              {
                user_id: teacher.user_id,
                email: teacher.email,
                full_name: formData.full_name,
                subjects: formData.subjects,
                role:
                  formData.user_type === "super_admin"
                    ? "admin"
                    : formData.user_type,
                class_teacher_for: formData.class_teacher_for || null,
              },
            ]);
          }
        }

        alert("✅ User updated successfully!");
      } else {
        // ✅ CREATE NEW USER
        if (!hasAdminAccess()) {
          alert("⚠️ Admin features not configured.");
          return;
        }

        const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;
        const role =
          formData.user_type === "super_admin" ? "admin" : formData.user_type;

        const authData = await createUserWithAdmin(
          formData.email,
          tempPassword,
          {
            full_name: formData.full_name,
            role: role,
            subjects: formData.subjects,
          },
        );

        // Create profile
        await supabase.from("profiles").insert([
          {
            id: authData.id,
            role: role,
            full_name: formData.full_name,
          },
        ]);

        // Create teacher record only if NOT pure admin
        const shouldCreateTeacherRecord =
          formData.user_type === "super_admin" ||
          formData.user_type === "teacher" ||
          (formData.user_type === "admin" &&
            (formData.subjects.length > 0 || formData.class_teacher_for));

        if (shouldCreateTeacherRecord) {
          await supabase.from("teachers").insert([
            {
              user_id: authData.id,
              email: formData.email,
              full_name: formData.full_name,
              subjects: formData.subjects,
              role: role,
              class_teacher_for: formData.class_teacher_for || null,
            },
          ]);
        }

        const userTypeLabel =
          formData.user_type === "super_admin"
            ? "SUPER ADMIN"
            : formData.user_type === "admin"
              ? "ADMIN"
              : "TEACHER";

        const credentials =
          `✅ ${userTypeLabel} CREATED!\n\n` +
          `Name: ${formData.full_name}\n` +
          `Email: ${formData.email}\n` +
          `Password: ${tempPassword}\n` +
          `Type: ${userTypeLabel}`;

        try {
          await navigator.clipboard.writeText(
            `${formData.email}\n${tempPassword}`,
          );
          alert(credentials + "\n\n📋 Credentials copied to clipboard!");
        } catch {
          alert(credentials);
        }
      }

      onSave();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const needsSubjects = formData.user_type !== "admin";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <h3 className="text-2xl font-bold text-white">
            {teacher ? "Edit User" : "Create New User"}
          </h3>
          <p className="text-purple-100 text-sm mt-1">
            {teacher
              ? "Update user information and permissions"
              : "Add a new staff member to the system"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]"
        >
          {/* User Type Selection */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
            <label className="block text-sm font-bold text-gray-800 mb-3">
              User Type *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label
                className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.user_type === "teacher"
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-white hover:border-green-300"
                }`}
              >
                <input
                  type="radio"
                  name="user_type"
                  value="teacher"
                  checked={formData.user_type === "teacher"}
                  onChange={(e) =>
                    setFormData({ ...formData, user_type: e.target.value })
                  }
                  className="sr-only"
                />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    formData.user_type === "teacher"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  <BookOpen className="text-white" size={24} />
                </div>
                <span className="font-bold text-sm">Teacher</span>
                <span className="text-xs text-gray-600 text-center mt-1">
                  Teaching staff with subjects
                </span>
              </label>

              <label
                className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.user_type === "admin"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-300 bg-white hover:border-indigo-300"
                }`}
              >
                <input
                  type="radio"
                  name="user_type"
                  value="admin"
                  checked={formData.user_type === "admin"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      user_type: e.target.value,
                      subjects: [],
                      class_teacher_for: "",
                    })
                  }
                  className="sr-only"
                />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    formData.user_type === "admin"
                      ? "bg-indigo-500"
                      : "bg-gray-300"
                  }`}
                >
                  <Users className="text-white" size={24} />
                </div>
                <span className="font-bold text-sm">Admin</span>
                <span className="text-xs text-gray-600 text-center mt-1">
                  Management only, no teaching
                </span>
              </label>

              <label
                className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.user_type === "super_admin"
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 bg-white hover:border-purple-300"
                }`}
              >
                <input
                  type="radio"
                  name="user_type"
                  value="super_admin"
                  checked={formData.user_type === "super_admin"}
                  onChange={(e) =>
                    setFormData({ ...formData, user_type: e.target.value })
                  }
                  className="sr-only"
                />
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    formData.user_type === "super_admin"
                      ? "bg-purple-500"
                      : "bg-gray-300"
                  }`}
                >
                  <Shield className="text-white" size={24} />
                </div>
                <span className="font-bold text-sm">Super Admin</span>
                <span className="text-xs text-gray-600 text-center mt-1">
                  Admin + Teacher access
                </span>
              </label>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                required
                disabled={!!teacher}
                placeholder="john.doe@school.com"
              />
            </div>
          </div>

          {/* Subjects (conditional) */}
          {formData.user_type !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subjects{" "}
                {formData.user_type === "super_admin" ? "(Optional)" : "*"}
              </label>
              <select
                multiple
                value={formData.subjects}
                onChange={(e) => {
                  const selected = Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  );
                  setFormData({ ...formData, subjects: selected });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                size="6"
                required={formData.user_type === "teacher"}
              >
                {availableSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Hold Ctrl/Cmd to select multiple subjects
              </p>
            </div>
          )}

          {/* Class Teacher (conditional) */}
          {formData.user_type !== "admin" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Teacher For (Optional)
              </label>
              <select
                value={formData.class_teacher_for}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    class_teacher_for: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              >
                <option value="">None</option>
                {availableClasses.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="text-blue-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {formData.user_type === "teacher" && (
                    <li>
                      Teachers can view and manage their own classes and
                      subjects
                    </li>
                  )}
                  {formData.user_type === "admin" && (
                    <li>
                      Admins have access to management features but cannot teach
                    </li>
                  )}
                  {formData.user_type === "super_admin" && (
                    <li>
                      Super Admins have both admin privileges AND can teach
                      subjects
                    </li>
                  )}
                  {!teacher && (
                    <li>
                      A temporary password will be generated and shown after
                      creation
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl hover:shadow-lg disabled:opacity-50 font-semibold transition-all"
            >
              {saving ? "Saving..." : teacher ? "Update User" : "Create User"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileManagementPage;
