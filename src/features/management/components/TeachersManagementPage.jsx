import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Upload, Download, User } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';

const TeachersManagementPage = () => {
  const { supabase } = useApp();
  const [teachers, setTeachers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const handleDelete = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This will also delete their schedule entries.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacherId);

      if (error) throw error;
      await loadTeachers();
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert('Failed to delete teacher');
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setShowAddModal(true);
  };

  const downloadCSVTemplate = () => {
    const csv = `Full Name,Email,Subjects (comma-separated),Role,Class Teacher For
John Smith,john.smith@school.com,"Math,Physics",teacher,Y7
Sarah Johnson,sarah.johnson@school.com,English,teacher,Y5A
Mike Admin,mike.admin@school.com,"",admin,`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teachers_template.csv';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Teachers Management</h2>
            <p className="text-gray-600 mt-1">Add, edit, and manage teacher accounts</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add Teacher
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
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-2xl font-bold text-blue-700">{teachers.length}</p>
            <p className="text-sm text-blue-600">Total Teachers</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <p className="text-2xl font-bold text-purple-700">
              {teachers.filter(t => t.role === 'admin').length}
            </p>
            <p className="text-sm text-purple-600">Admins</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <p className="text-2xl font-bold text-emerald-700">
              {teachers.filter(t => t.class_teacher_for).length}
            </p>
            <p className="text-sm text-emerald-600">Class Teachers</p>
          </div>
        </div>
      </div>

      {/* CSV Upload */}
      <CSVUploadSection onUploadComplete={loadTeachers} />

      {/* Teachers List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Teachers</h3>
        
        {teachers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <User size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No teachers yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Subjects</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-700">Class Teacher</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-emerald-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map(teacher => (
                  <tr key={teacher.id} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{teacher.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{teacher.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects?.map((subject, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            {subject}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        teacher.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {teacher.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {teacher.class_teacher_for ? (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                          {teacher.class_teacher_for}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddTeacherModal
          teacher={editingTeacher}
          onClose={() => {
            setShowAddModal(false);
            setEditingTeacher(null);
          }}
          onSave={async () => {
            await loadTeachers();
            setShowAddModal(false);
            setEditingTeacher(null);
          }}
        />
      )}
    </div>
  );
};

// CSV Upload Component
const CSVUploadSection = ({ onUploadComplete }) => {
  const { supabase } = useApp();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      const teachers = dataLines.map(line => {
        const [fullName, email, subjectsStr, role, classTeacherFor] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        
        const subjects = subjectsStr ? subjectsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        return {
          full_name: fullName,
          email: email,
          subjects: subjects,
          role: role || 'teacher',
          class_teacher_for: classTeacherFor || null
        };
      });

      // Insert teachers
      const { error } = await supabase
        .from('teachers')
        .insert(teachers);

      if (error) throw error;

      alert(`Successfully imported ${teachers.length} teachers!`);
      onUploadComplete();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert('Failed to upload CSV: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
      <div className="flex items-center gap-3 mb-4">
        <Upload size={24} className="text-blue-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-800">Bulk Import via CSV</h3>
          <p className="text-sm text-gray-600">Upload a CSV file to import multiple teachers at once</p>
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
        <span className={`inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:shadow-lg transition-all ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}>
          {uploading ? 'Uploading...' : 'Choose CSV File'}
        </span>
      </label>

      <p className="text-xs text-gray-500 mt-3">
        Format: Full Name, Email, Subjects (comma-separated), Role, Class Teacher For
      </p>
    </div>
  );
};

// Add/Edit Teacher Modal
const AddTeacherModal = ({ teacher, onClose, onSave }) => {
  const { supabase } = useApp();
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    subjects: teacher?.subjects?.join(', ') || '',
    role: teacher?.role || 'teacher',
    class_teacher_for: teacher?.class_teacher_for || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      alert('Please fill in name and email');
      return;
    }

    try {
      setSaving(true);

      const teacherData = {
        full_name: formData.full_name,
        email: formData.email,
        subjects: formData.subjects ? formData.subjects.split(',').map(s => s.trim()) : [],
        role: formData.role,
        class_teacher_for: formData.class_teacher_for || null
      };

      if (teacher) {
        // Update
        const { error } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', teacher.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('teachers')
          .insert([teacherData]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving teacher:', error);
      alert('Failed to save teacher: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {teacher ? 'Edit Teacher' : 'Add New Teacher'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="john.smith@school.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subjects (comma-separated)
            </label>
            <input
              type="text"
              value={formData.subjects}
              onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Math, Physics, Chemistry"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Teacher For
              </label>
              <input
                type="text"
                value={formData.class_teacher_for}
                onChange={(e) => setFormData({ ...formData, class_teacher_for: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Y7"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : teacher ? 'Update Teacher' : 'Add Teacher'}
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

export default TeachersManagementPage;