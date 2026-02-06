import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const StudentsPage = () => {
  const { supabase, studentsService, loadAllStudents } = useApp();
  const [students, setStudents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📚 Loading all students...');
      
      const allStudents = await studentsService.getAllStudents();

      // Load parent links for each student
      const studentsWithParents = await Promise.all(
        allStudents.map(async (student) => {
          const { data: parentLinks } = await supabase
            .from("student_parents")
            .select("parents(full_name, email), relationship")
            .eq("student_id", student.id);

          return {
            ...student,
            parents: parentLinks || [],
          };
        }),
      );

      console.log('✅ Students loaded:', studentsWithParents.length);
      setStudents(studentsWithParents);
    } catch (error) {
      console.error("❌ Error loading students:", error);
    } finally {
      setLoading(false);
    }
  }, [studentsService, supabase]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleDelete = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student?")) {
      return;
    }

    try {
      await studentsService.deleteStudent(studentId);
      await loadStudents();
      await loadAllStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student");
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowAddModal(true);
  };

  const handleLinkParent = (student) => {
    setSelectedStudent(student);
    setShowLinkParentModal(true);
  };

  const downloadCSVTemplate = () => {
    const csv = `Name,Class,Email
John Doe,Y7,john.doe@student.com
Jane Smith,Y5A,jane.smith@student.com`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statsByClass = students.reduce((acc, s) => {
    acc[s.class_name] = (acc[s.class_name] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Students Management
            </h2>
            <p className="text-gray-600 mt-1">
              Manage student records and parent links
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingStudent(null);
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add Student
            </button>
            <button
              onClick={downloadCSVTemplate}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Download size={20} />
              CSV Template
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">
              {students.filter((s) => s.status === "active").length}
            </p>
            <p className="text-sm text-blue-600">Active Students</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <p className="text-2xl font-bold text-orange-700">
              {students.filter((s) => s.status === "graduated").length}
            </p>
            <p className="text-sm text-orange-600">Graduated</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-2xl font-bold text-red-700">
              {
                students.filter(
                  (s) => s.status === "archived" || s.status === "transferred",
                ).length
              }
            </p>
            <p className="text-sm text-red-600">Dropped Out / Kicked Out</p>
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <CSVUploadSection onUploadComplete={loadStudents} />

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Students</h3>

        {students.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No students yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    Student #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    Class
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    School Year
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">
                    Parents
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-emerald-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {student.student_no}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                        {student.class_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.email || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        student.school_year === '2025-26' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {student.school_year || 'NOT SET'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.parents?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.parents.map((link, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {link.parents.full_name} ({link.relationship})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No parents linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleLinkParent(student)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Link Parent"
                        >
                          <LinkIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
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

      {/* Add/Edit Student Modal */}
      {showAddModal && (
        <AddStudentModal
          student={editingStudent}
          onClose={() => {
            setShowAddModal(false);
            setEditingStudent(null);
          }}
          onSave={async () => {
            await loadStudents();
            await loadAllStudents();
            setShowAddModal(false);
            setEditingStudent(null);
          }}
        />
      )}

      {/* Link Parent Modal */}
      {showLinkParentModal && (
        <LinkParentModal
          student={selectedStudent}
          onClose={() => {
            setShowLinkParentModal(false);
            setSelectedStudent(null);
          }}
          onSave={async () => {
            await loadStudents();
            setShowLinkParentModal(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

// ✅ FIXED: CSV Upload Component - Uses studentsService
const CSVUploadSection = ({ onUploadComplete }) => {
  const { studentsService } = useApp();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const dataLines = lines.slice(1);

      // Get next student number
      const nextStudentNo = await studentsService.getNextStudentNumber('');

      let currentNo = nextStudentNo;
      
      // ✅ CRITICAL: Use studentsService.addStudent() for each student
      for (const line of dataLines) {
        const [name, className, email] = line
          .split(",")
          .map((s) => s.trim().replace(/^"|"$/g, ""));

        await studentsService.addStudent({
          name: name,
          class_name: className,
          email: email || null,
          student_no: currentNo,
          school_year: '2025-26', // ✅ Explicit
          status: 'active' // ✅ Explicit
        });
        
        currentNo++;
      }

      alert(`Successfully imported ${dataLines.length} students!`);
      onUploadComplete();
    } catch (error) {
      console.error("❌ Error uploading CSV:", error);
      alert("Failed to upload CSV: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <Upload size={24} className="text-blue-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            Bulk Import via CSV
          </h3>
          <p className="text-sm text-gray-600">
            Upload a CSV file to import multiple students at once
          </p>
        </div>
      </div>

      <label className="block">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
        />
        <span
          className={`inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:shadow-lg transition-all ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? "Uploading..." : "Choose CSV File"}
        </span>
      </label>

      <p className="text-xs text-gray-500 mt-3">
        Format: Name, Class, Email (School year 2025-26 will be auto-assigned)
      </p>
    </div>
  );
};

// ✅ FIXED: Add/Edit Student Modal - Uses studentsService
const AddStudentModal = ({ student, onClose, onSave }) => {
  const { studentsService } = useApp();
  const [formData, setFormData] = useState({
    name: student?.name || "",
    class_name: student?.class_name || "Y1",
    email: student?.email || "",
    school_year: student?.school_year || "2025-26", // ✅ Default
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.class_name) {
      alert("Please fill in name and class");
      return;
    }

    try {
      setSaving(true);
      console.log('💾 Saving student:', formData);

      if (student) {
        // ✅ UPDATE - use studentsService
        await studentsService.updateStudent(student.id, {
          name: formData.name,
          class_name: formData.class_name,
          email: formData.email || null,
          student_no: student.student_no, // Keep existing
          school_year: formData.school_year,
          status: student.status || 'active'
        });
      } else {
        // ✅ CREATE - use studentsService
        const nextStudentNo = await studentsService.getNextStudentNumber(formData.class_name);
        
        await studentsService.addStudent({
          name: formData.name,
          class_name: formData.class_name,
          email: formData.email || null,
          student_no: nextStudentNo,
          school_year: formData.school_year, // ✅ Explicit
          status: 'active' // ✅ Explicit
        });
      }

      console.log('✅ Student saved successfully');
      onSave();
    } catch (error) {
      console.error("❌ Error saving student:", error);
      alert("Failed to save student: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {student ? "Edit Student" : "Add New Student"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class *
            </label>
            <select
              value={formData.class_name}
              onChange={(e) =>
                setFormData({ ...formData, class_name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Y1">Y1</option>
              <option value="Y2">Y2</option>
              <option value="Y3">Y3</option>
              <option value="Y4">Y4</option>
              <option value="Y5A">Y5A</option>
              <option value="Y5B">Y5B</option>
              <option value="Y6">Y6</option>
              <option value="Y7">Y7</option>
              <option value="Y8">Y8</option>
              <option value="Y9">Y9</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              School Year
            </label>
            <input
              type="text"
              value={formData.school_year}
              onChange={(e) =>
                setFormData({ ...formData, school_year: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-gray-50"
              placeholder="2025-26"
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">Current academic year</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="john.doe@student.com"
            />
          </div>

          {!student && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>✅ Auto-generated:</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                <li>• Student # (next available)</li>
                <li>• School Year: 2025-26</li>
                <li>• Status: Active</li>
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : student
                  ? "Update Student"
                  : "Add Student"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Link Parent Modal (unchanged - already good)
const LinkParentModal = ({ student, onClose, onSave }) => {
  const { supabase } = useApp();
  const [parents, setParents] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [relationship, setRelationship] = useState("mother");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: allParents } = await supabase
        .from("parents")
        .select("*")
        .order("full_name");

      setParents(allParents || []);

      const { data: links } = await supabase
        .from("student_parents")
        .select("*, parents(full_name, email)")
        .eq("student_id", student.id);

      setLinkedParents(links || []);
    } catch (error) {
      console.error("Error loading parents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!selectedParent) {
      alert("Please select a parent");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.from("student_parents").insert([
        {
          student_id: student.id,
          parent_id: selectedParent,
          relationship: relationship,
          is_primary: linkedParents.length === 0,
        },
      ]);

      if (error) throw error;

      await loadData();
      setSelectedParent("");
    } catch (error) {
      console.error("Error linking parent:", error);
      alert("Failed to link parent: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLink = async (linkId) => {
    if (!window.confirm("Remove this parent link?")) return;

    try {
      const { error } = await supabase
        .from("student_parents")
        .delete()
        .eq("id", linkId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error("Error removing link:", error);
      alert("Failed to remove link");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          Link Parents to {student.name}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Class {student.class_name} • Student #{student.student_no}
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Currently Linked Parents */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">
                Linked Parents
              </h4>
              {linkedParents.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No parents linked yet
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedParents.map((link) => (
                    <div
                      key={link.id}
                      className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {link.parents.full_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {link.parents.email} • {link.relationship}
                        </p>
                        {link.is_primary && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded mt-1 inline-block">
                            Primary Contact
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Parent Link */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="font-semibold text-gray-800 mb-3">
                Add Parent Link
              </h4>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Parent
                  </label>
                  <select
                    value={selectedParent}
                    onChange={(e) => setSelectedParent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">Choose a parent...</option>
                    {parents
                      .filter(
                        (p) => !linkedParents.some((l) => l.parent_id === p.id),
                      )
                      .map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.full_name} ({parent.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="guardian">Guardian</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleAddLink}
                disabled={saving || !selectedParent}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Parent Link"}
              </button>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onSave}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-all"
          >
            Done
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentsPage;