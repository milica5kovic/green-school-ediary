import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Upload, Download } from "lucide-react";
import {
  supabase,
  createUserWithAdmin,
  hasAdminAccess,
} from "../../infrastructure/supabaseClient";

const ProfileManagementPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [showAddParentModal, setShowAddParentModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState("teachers");
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Proper useCallback for data loading
const loadTeachers = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .order('full_name');
    
    if (error) throw error;
    
    console.log('✅ Teachers loaded:', data?.length || 0);
    setTeachers(data || []);
  } catch (error) {
    console.error('Error loading teachers:', error);
  } finally {
    setLoading(false);
  }
};

  // ✅ FIX: Load parents from BOTH parents AND profiles tables
  const loadParents = async () => {
    try {
      // Load parents
      const { data: parentsData, error: parentsError } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");

      if (parentsError) throw parentsError;

      // Load student-parent links
      const { data: linksData, error: linksError } = await supabase.from(
        "student_parents",
      ).select(`
        parent_id,
        student:students(id, name, class_name, email)
      `);

      if (linksError) throw linksError;

      // Attach linked students to each parent
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
    }
  };

  // ✅ FIX: Load students with proper error handling
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
  // ✅ FIX: Load on mount with proper dependencies
useEffect(() => {
  // Only load if we don't have data yet
  if (teachers.length === 0 && parents.length === 0) {
    loadAllData();
  }
}, [activeTab]); // Reload when tab changes

  // ✅ DELETE TEACHER
  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", teacherId);

      if (error) throw error;

      alert("Teacher deleted successfully!");
      await loadTeachers();
    } catch (error) {
      console.error("Error deleting teacher:", error);
      alert("Failed to delete teacher: " + error.message);
    }
  };

  // ============================================
  // CSV UPLOAD FUNCTIONS
  // ============================================

  // Download Teacher Template
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

  // Upload Teachers CSV
  const handleTeacherCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!hasAdminAccess()) {
      alert("⚠️ Admin features not configured. Contact system administrator.");
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      // const headers = lines[0].split(',').map(h => h.trim());

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

      if (
        !window.confirm(
          `Upload ${teachers.length} teachers?\n\nThis will create user accounts with passwords.`,
        )
      ) {
        return;
      }

      const results = [];
      const failedTeachers = [];

      for (const teacher of teachers) {
        try {
          const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;

          // Create auth user
          const authData = await createUserWithAdmin(
            teacher.email,
            tempPassword,
            {
              full_name: teacher.full_name,
              role: teacher.role,
              subjects: teacher.subjects,
            },
          );

          // Create profile
          await supabase.from("profiles").insert([
            {
              id: authData.id,
              role: teacher.role,
              full_name: teacher.full_name,
            },
          ]);

          // Create teacher record
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

      // Show results
      if (results.length > 0) {
        const credentialsList = results
          .map(
            (r) => `${r.name}\n  Email: ${r.email}\n  Password: ${r.password}`,
          )
          .join("\n\n");

        const message =
          `✅ Created ${results.length} teachers!\n\n` +
          `CREDENTIALS:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          credentialsList +
          `\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⚠️ SAVE THESE CREDENTIALS!\n` +
          `They won't be shown again.`;

        try {
          await navigator.clipboard.writeText(credentialsList);
          alert(message + "\n\n📋 Copied to clipboard!");
        } catch {
          alert(message);
        }
      }

      if (failedTeachers.length > 0) {
        alert(`⚠️ Some teachers failed:\n${failedTeachers.join("\n")}`);
      }
    } catch (error) {
      console.error("CSV Upload Error:", error);
      alert(`❌ Upload failed: ${error.message}`);
    }

    e.target.value = "";
  };

  // Download Parent Template
  const downloadParentTemplate = () => {
    const csv = `full_name,email,student_names
Jane Doe,jane.doe@email.com,"John Doe;Mary Doe"
Mike Smith,mike.smith@email.com,"Sarah Smith"
Anna Johnson,anna.j@email.com,`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parents_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Upload Parents CSV
  const handleParentCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!hasAdminAccess()) {
      alert("⚠️ Admin features not configured. Contact system administrator.");
      return;
    }

    try {
      // Load all students first
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
          student_names: values[2]
            ? values[2]
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

          // Create auth user
          const authData = await createUserWithAdmin(
            parent.email,
            tempPassword,
            { full_name: parent.full_name, role: "parent" },
          );

          // Create profile
          await supabase.from("profiles").insert([
            {
              id: authData.id,
              role: "parent",
              full_name: parent.full_name,
            },
          ]);

          // Create parent record
          await supabase.from("parents").insert([
            {
              user_id: authData.id,
              email: parent.email,
              full_name: parent.full_name,
            },
          ]);

          // Link students
          const linkedStudents = [];
          for (const studentName of parent.student_names) {
            if (!studentName) continue;

            const student = allStudents.find(
              (s) => s.name.toLowerCase() === studentName.toLowerCase(),
            );

            if (student) {
              await supabase
                .from("students")
                .update({ parent_contact: parent.email })
                .eq("id", student.id);

              linkedStudents.push(student.name);
            } else {
              console.warn(`Student not found: ${studentName}`);
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

      // Show results
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
        alert(`⚠️ Some parents failed:\n${failedParents.join("\n")}`);
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
              Manage teachers, parents, and student profiles
            </p>
          </div>

          {/* TEACHERS BUTTONS */}
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
                Add Teacher
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

          {/* PARENTS BUTTONS */}
          {activeTab === "parents" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddParentModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Add Parent
              </button>

              <label className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
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
          {/* TEACHERS TAB */}
          {activeTab === "teachers" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                All Teachers & Admins
              </h3>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : teachers.length === 0 ? (
                <p className="text-gray-500 italic">No teachers added yet.</p>
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
                          Subjects
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-purple-700">
                          Class Teacher
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-purple-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {teachers.map((teacher) => (
                        <tr
                          key={teacher.id}
                          className="hover:bg-purple-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {teacher.full_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {teacher.email}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects &&
                              teacher.subjects.length > 0 ? (
                                teacher.subjects.map((subject, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                  >
                                    {subject}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                teacher.role === "admin"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {teacher.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {teacher.class_teacher_for || "-"}
                          </td>
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
                              <button
                                onClick={() => handleDeleteTeacher(teacher.id)}
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

          {/* PARENTS TAB */}
          {activeTab === "parents" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                All Parents
              </h3>

              {/* Debug Info
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                <p><strong>Debug:</strong> Parents loaded: {parents.length}</p>
              </div> */}

              {parents.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 font-medium">
                    No parents registered yet
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Click "Add Parent" to get started
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
                          Linked Students
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {parents.map((parent) => (
  <tr key={parent.id}>
    <td className="px-4 py-3 font-medium text-gray-800">
      {parent.full_name || 'N/A'}
    </td>
    <td className="px-4 py-3 text-gray-600">
      {parent.email}
    </td>
    <td className="px-4 py-3">
      {parent.linkedStudents && parent.linkedStudents.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {parent.linkedStudents.map(student => (
            <span 
              key={student.id} 
              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
            >
              {student.name} ({student.class_name})
            </span>
          ))}
        </div>
      ) : (
        <span className="text-gray-400 text-sm">No linked students</span>
      )}
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
      await loadAllData(); // ✅ Explicitly reload
      setShowAddModal(false);
      setEditingTeacher(null);
    }}
  />
)}

{showAddParentModal && (
  <AddParentModal
    onClose={() => setShowAddParentModal(false)}
    onSave={async () => {
      await loadAllData(); // ✅ Explicitly reload
      setShowAddParentModal(false);
    }}
  />
)}
    </div>
  );
};

// ============================================
// ADD TEACHER MODAL (unchanged - already good)
// ============================================
const AddTeacherModal = ({ teacher, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || "",
    email: teacher?.email || "",
    subjects: teacher?.subjects || [],
    role: teacher?.role || "teacher",
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
    alert('Please fill in name and email');
    return;
  }

  try {
    setSaving(true);

    if (!hasAdminAccess()) {
      alert('⚠️ Admin features not configured.');
      return;
    }

    console.log('🔐 Creating parent account...');
    const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;
    
    // Step 1: Create auth user (trigger will auto-create profile!)
    const authData = await createUserWithAdmin(
      formData.email,
      tempPassword,
      {
        full_name: formData.full_name,
        role: 'parent'  // ← Trigger uses this!
      }
    );

    if (!authData?.id) throw new Error('Failed to create user');
    console.log('✅ Auth user created:', authData.id);

    // ❌ DELETE THIS SECTION - Trigger already created profile!
    /*
    console.log('🔐 Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: authData.id,
        role: 'parent',
        full_name: formData.full_name
      }], {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error(`Profile error: ${profileError.message}`);
    }
    console.log('✅ Profile created');
    */

    // ✅ Wait a bit for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: Create parent record
    console.log('🔐 Creating parent record...');
    const { data: parentData, error: parentInsertError } = await supabase
      .from('parents')
      .insert([{
        user_id: authData.id,
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone || null
      }])
      .select()
      .single();

    if (parentInsertError) {
      console.error('Parent insert error:', parentInsertError);
      throw new Error(`Parent insert error: ${parentInsertError.message}`);
    }
    console.log('✅ Parent record created:', parentData.id);

    // Step 3: Link to student (if selected)
    if (formData.student_email) {
      console.log('🔐 Linking to student...');
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('email', formData.student_email)
        .single();
      
      if (student) {
        const { error: linkError } = await supabase
          .from('student_parents')
          .insert([{
            student_id: student.id,
            parent_id: parentData.id,
            relationship: 'parent',
            is_primary: true
          }]);

        if (linkError) {
          console.error('Link error:', linkError);
        } else {
          console.log('✅ Student linked');
        }
      }
    }

    // Step 4: Show credentials
    const credentials = 
      `✅ PARENT ACCOUNT CREATED!\n\n` +
      `👤 Name: ${formData.full_name}\n` +
      `📧 Email: ${formData.email}\n` +
      `🔒 Password: ${tempPassword}\n\n` +
      `⚠️ Share these credentials securely!`;

    try {
      await navigator.clipboard.writeText(
        `Name: ${formData.full_name}\nEmail: ${formData.email}\nPassword: ${tempPassword}\nLogin: ${window.location.origin}`
      );
      alert(credentials + '\n\n📋 Copied to clipboard!');
    } catch {
      alert(credentials);
    }

    onSave();
  } catch (error) {
    console.error('❌ Error creating parent:', error);
    
    let errorMessage = 'Failed to create parent';
    if (error.message.includes('already registered') || error.message.includes('already exists')) {
      errorMessage = '⚠️ EMAIL ALREADY IN USE\n\nPlease use a different email.';
    } else if (error.message) {
      errorMessage = `⚠️ ERROR\n\n${error.message}`;
    }
    
    alert(errorMessage);
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">
            {teacher ? "Edit Teacher" : "Add Teacher"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) =>
                setFormData({ ...formData, full_name: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              required
              disabled={!!teacher}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Role *</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subjects</label>
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
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              size="5"
            >
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Hold Ctrl/Cmd for multiple
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Class Teacher For
            </label>
            <select
              value={formData.class_teacher_for}
              onChange={(e) =>
                setFormData({ ...formData, class_teacher_for: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">None</option>
              {availableClasses.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : teacher ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// ADD PARENT MODAL COMPONENT
// ============================================
const AddParentModal = ({ onClose, onSave }) => {
const [formData, setFormData] = useState({
  full_name: '',
  email: '',
  phone: '',
  student_id: ''  
});
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('status', 'active')
      .order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      alert('Please fill in name and email');
      return;
    }

    try {
      setSaving(true);

      if (!hasAdminAccess()) {
        alert('⚠️ Admin features not configured.');
        return;
      }

      console.log('🔐 Creating parent account...');
      const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;
      
      // Step 1: Create auth user (trigger will auto-create profile!)
      const authData = await createUserWithAdmin(
        formData.email,
        tempPassword,
        {
          full_name: formData.full_name,
          role: 'parent'  // ← Trigger uses this to create profile!
        }
      );

      if (!authData?.id) throw new Error('Failed to create user');
      console.log('✅ Auth user created:', authData.id);

      // ✅ Wait for trigger to complete
      console.log('⏳ Waiting for database trigger...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create parent record
      console.log('🔐 Creating parent record...');
      const { data: parentData, error: parentInsertError } = await supabase
        .from('parents')
        .insert([{
          user_id: authData.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null
        }])
        .select()
        .single();

      if (parentInsertError) {
        console.error('Parent insert error:', parentInsertError);
        throw new Error(`Parent insert error: ${parentInsertError.message}`);
      }
      console.log('✅ Parent record created:', parentData.id);

      // Step 3: Link to student (if selected)
      // Step 3: Link to student (if selected)
if (formData.student_id) {  // ✅ Check student_id
  console.log('🔐 Linking to student:', formData.student_id);
  
  const { error: linkError } = await supabase
    .from('student_parents')
    .insert([{
      student_id: formData.student_id,  // ✅ Direct ID, no lookup needed!
      parent_id: parentData.id,
      relationship: 'parent',
      is_primary: true
    }]);

  if (linkError) {
    console.error('❌ Link error:', linkError);
  } else {
    console.log('✅ Student linked successfully!');
  }
}


      // Step 4: Show credentials
      const credentials = 
        `✅ PARENT ACCOUNT CREATED!\n\n` +
        `👤 Name: ${formData.full_name}\n` +
        `📧 Email: ${formData.email}\n` +
        `🔒 Password: ${tempPassword}\n\n` +
        `⚠️ Share these credentials securely!`;

      try {
        await navigator.clipboard.writeText(
          `Name: ${formData.full_name}\nEmail: ${formData.email}\nPassword: ${tempPassword}\nLogin: ${window.location.origin}`
        );
        alert(credentials + '\n\n📋 Copied to clipboard!');
      } catch {
        alert(credentials);
      }

      onSave();
    } catch (error) {
      console.error('❌ Error creating parent:', error);
      
      let errorMessage = 'Failed to create parent';
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = '⚠️ EMAIL ALREADY IN USE\n\nPlease use a different email.';
      } else if (error.message) {
        errorMessage = `⚠️ ERROR\n\n${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Add New Parent</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Jane Smith"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="jane.smith@email.com"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone (Optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="+381 60 123 4567"
            />
          </div>

          {/* Link to Student */}
          <div>
            <label className="block text-sm font-medium mb-2">Link to Student (Optional)</label>
        <select
  value={formData.student_id}  
  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
>
  <option value="">-- Select Student --</option>
  {students.map(student => (
    <option key={student.id} value={student.id}>  {/* ✅ Use student.id as value */}
      {student.name} ({student.class_name})
    </option>
  ))}
</select>
            <p className="text-xs text-gray-500 mt-1">
              Parent will be able to view this student's data
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> A temporary password will be generated. Share it securely with the parent.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Parent Account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300"
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
