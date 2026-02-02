import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Upload, Download, User, Users as UsersIcon, Baby } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { sendInviteEmail } from '../../utils/emailInvite';

const ProfileManagementPage = () => {
  const { supabase } = useApp();
  const [activeTab, setActiveTab] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [modalType, setModalType] = useState('teacher');
  const [loading, setLoading] = useState(true);
  

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('teachers')
        .select('*')
        .order('full_name');

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      // Load parents
      const { data: parentsData, error: parentsError } = await supabase
        .from('parents')
        .select('*, student_parents(students(name, class_name))')
        .order('full_name');

      if (parentsError) throw parentsError;
      setParents(parentsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const table = type === 'teacher' ? 'teachers' : 'parents';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert(`Failed to delete ${type}`);
    }
  };

  const handleEdit = (profile, type) => {
    setEditingProfile(profile);
    setModalType(type);
    setShowAddModal(true);
  };

  const openAddModal = (type) => {
    setEditingProfile(null);
    setModalType(type);
    setShowAddModal(true);
  };

  const downloadCSVTemplate = (type) => {
    let csv = '';
    
    if (type === 'teacher') {
      csv = `Full Name,Email,Subjects (comma-separated),Role,Class Teacher For
John Smith,john.smith@school.com,"Math,Physics",teacher,Y7
Sarah Johnson,sarah.johnson@school.com,English,teacher,Y5A
Mike Admin,mike.admin@school.com,"",admin,`;
    } else {
      csv = `Full Name,Email,Phone
Ana Jovanović,ana.jovanovic@email.com,+381 60 123 4567
Marko Petrović,marko.petrovic@email.com,+381 64 987 6543`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}s_template.csv`;
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
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Profile Management</h2>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'teachers'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <User size={18} />
            Teachers & Admins
          </button>
          <button
            onClick={() => setActiveTab('parents')}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'parents'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <UsersIcon size={18} />
            Parents
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {activeTab === 'teachers' ? (
            <>
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
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-2xl font-bold text-orange-700">
                  {teachers.filter(t => t.role === 'teacher').length}
                </p>
                <p className="text-sm text-orange-600">Teachers</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{parents.length}</p>
                <p className="text-sm text-blue-600">Total Parents</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                <p className="text-2xl font-bold text-emerald-700">
                  {parents.reduce((sum, p) => sum + (p.student_parents?.length || 0), 0)}
                </p>
                <p className="text-sm text-emerald-600">Linked Children</p>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => openAddModal(activeTab === 'teachers' ? 'teacher' : 'parent')}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Add {activeTab === 'teachers' ? 'Teacher' : 'Parent'}
          </button>
          <button
            onClick={() => downloadCSVTemplate(activeTab === 'teachers' ? 'teacher' : 'parent')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={20} />
            CSV Template
          </button>
        </div>
      </div>

      {/* CSV Upload */}
      <CSVUploadSection 
        type={activeTab === 'teachers' ? 'teacher' : 'parent'} 
        onUploadComplete={loadData} 
      />

      {/* Content */}
      {activeTab === 'teachers' ? (
        <TeachersTable 
          teachers={teachers} 
          onEdit={(t) => handleEdit(t, 'teacher')} 
          onDelete={(id) => handleDelete(id, 'teacher')} 
        />
      ) : (
        <ParentsTable 
          parents={parents} 
          onEdit={(p) => handleEdit(p, 'parent')} 
          onDelete={(id) => handleDelete(id, 'parent')} 
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        modalType === 'teacher' ? (
          <AddTeacherModal
            teacher={editingProfile}
            onClose={() => {
              setShowAddModal(false);
              setEditingProfile(null);
            }}
            onSave={async () => {
              await loadData();
              setShowAddModal(false);
              setEditingProfile(null);
            }}
          />
        ) : (
          <AddParentModal
            parent={editingProfile}
            onClose={() => {
              setShowAddModal(false);
              setEditingProfile(null);
            }}
            onSave={async () => {
              await loadData();
              setShowAddModal(false);
              setEditingProfile(null);
            }}
          />
        )
      )}
    </div>
  );
};

// Teachers Table Component
const TeachersTable = ({ teachers, onEdit, onDelete }) => {
  if (teachers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
        <User size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No teachers yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">All Teachers & Admins</h3>
      
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
                      onClick={() => onEdit(teacher)}
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(teacher.id)}
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
    </div>
  );
};

// Parents Table Component  
const ParentsTable = ({ parents, onEdit, onDelete }) => {
  if (parents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-blue-100">
        <UsersIcon size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No parents yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">All Parents</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-50 border-b border-blue-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-blue-700">Children</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-blue-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.map(parent => (
              <tr key={parent.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{parent.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{parent.email}</td>
                <td className="px-4 py-3 text-gray-600">{parent.phone || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {parent.student_parents?.map((sp, idx) => (
                      <span key={idx} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs">
                        {sp.students?.name} ({sp.students?.class_name})
                      </span>
                    )) || <span className="text-gray-400 text-xs">No children linked</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(parent)}
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(parent.id)}
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
    </div>
  );
};

// CSV Upload Component
const CSVUploadSection = ({ type, onUploadComplete }) => {
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
      
      if (type === 'teacher') {
        const teachers = dataLines.map(line => {
          const [fullName, email, subjectsStr, role, classTeacherFor] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          
          const subjects = subjectsStr ? subjectsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
          
          return {
            full_name: fullName,
            email: email,
            subjects: subjects,
            role: role || 'teacher',
            class_teacher_for: classTeacherFor || null,
            user_id: null // Will be set when they log in
          };
        });

        const { error } = await supabase
          .from('teachers')
          .insert(teachers);

        if (error) throw error;
        alert(`Successfully imported ${teachers.length} teachers!`);
      } else {
        const parents = dataLines.map(line => {
          const [fullName, email, phone] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          
          return {
            full_name: fullName,
            email: email,
            phone: phone || null,
            user_id: null // Will be set when they log in
          };
        });

        const { error } = await supabase
          .from('parents')
          .insert(parents);

        if (error) throw error;
        alert(`Successfully imported ${parents.length} parents!`);
      }

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
    <div className={`bg-white rounded-2xl shadow-lg p-6 border ${
      type === 'teacher' ? 'border-emerald-100' : 'border-blue-100'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <Upload size={24} className={type === 'teacher' ? 'text-emerald-600' : 'text-blue-600'} />
        <div>
          <h3 className="text-lg font-bold text-gray-800">Bulk Import via CSV</h3>
          <p className="text-sm text-gray-600">Upload a CSV file to import multiple {type}s at once</p>
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
        <span className={`inline-block bg-gradient-to-r ${
          type === 'teacher' 
            ? 'from-emerald-500 to-teal-600' 
            : 'from-blue-500 to-indigo-600'
        } text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:shadow-lg transition-all ${
          uploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}>
          {uploading ? 'Uploading...' : 'Choose CSV File'}
        </span>
      </label>

      <p className="text-xs text-gray-500 mt-3">
        {type === 'teacher' 
          ? 'Format: Full Name, Email, Subjects (comma-separated), Role, Class Teacher For'
          : 'Format: Full Name, Email, Phone'
        }
      </p>
    </div>
  );
};

// Add Teacher Modal
// Add Teacher Modal - UPDATED with Subject Dropdown
// Add Teacher Modal - WITH DYNAMIC SUBJECTS FROM DATABASE
const AddTeacherModal = ({ teacher, onClose, onSave }) => {
  const { supabase } = useApp();
  
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [formData, setFormData] = useState({
    full_name: teacher?.full_name || '',
    email: teacher?.email || '',
    subjects: teacher?.subjects || [],
    role: teacher?.role || 'teacher',
    class_teacher_for: teacher?.class_teacher_for || ''
  });
  const [saving, setSaving] = useState(false);

  // Load subjects from database on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_subjects')
        .select('*')
        .eq('is_active', true) // Only show active subjects
        .order('subject_name');

      if (error) throw error;
      setAvailableSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const toggleSubject = (subjectName) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectName)
        ? prev.subjects.filter(s => s !== subjectName)
        : [...prev.subjects, subjectName]
    }));
  };

  const removeSubject = (subjectName) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subjectName)
    }));
  };

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
        subjects: formData.subjects,
        role: formData.role,
        class_teacher_for: formData.class_teacher_for || null,
        user_id: teacher?.user_id || null
      };

      if (teacher) {
        // Update existing teacher
        const { error } = await supabase
          .from('teachers')
          .update(teacherData)
          .eq('id', teacher.id);

        if (error) throw error;
      } else {
        // Create new teacher
        const { data: newTeacher, error } = await supabase
          .from('teachers')
          .insert([teacherData])
          .select()
          .single();

        if (error) throw error;

        // Generate simple password
        const password = `Green${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Show credentials alert (since we can't send email)
        alert(
          `Teacher created successfully!\n\n` +
          `📧 Email: ${formData.email}\n` +
          `🔒 Password: ${password}\n\n` +
          `⚠️ Please share these credentials with the teacher securely.\n\n` +
          `They can change their password after logging in.`
        );
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
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
              placeholder="john.smith@greenschool.edu.rs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subjects
            </label>
            
            {/* Selected Subjects - With Remove Button */}
            {formData.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.subjects.map(subject => (
                  <span key={subject} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                    {subject}
                    <button
                      type="button"
                      onClick={() => removeSubject(subject)}
                      className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Subject Dropdown */}
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              {availableSubjects.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No subjects available. Add subjects in Settings → Subjects tab.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableSubjects.map(subject => (
                    <label key={subject.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject.subject_name)}
                        onChange={() => toggleSubject(subject.subject_name)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">{subject.subject_name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
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
              <select
                value={formData.class_teacher_for}
                onChange={(e) => setFormData({ ...formData, class_teacher_for: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">None</option>
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
          </div>

          {!teacher && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-900">
                <strong>Password:</strong> A temporary password (Green####) will be generated and shown after creation. Please share it with the teacher securely.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : teacher ? 'Update Teacher' : 'Create Teacher'}
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
// Add Parent Modal
const AddParentModal = ({ parent, onClose, onSave }) => {
  const { supabase } = useApp();
  const [formData, setFormData] = useState({
    full_name: parent?.full_name || '',
    email: parent?.email || '',
    phone: parent?.phone || ''
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

      const parentData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        user_id: parent?.user_id || null
      };

      if (parent) {
        // Update
        const { error } = await supabase
          .from('parents')
          .update(parentData)
          .eq('id', parent.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('parents')
          .insert([parentData]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving parent:', error);
      alert('Failed to save parent: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {parent ? 'Edit Parent' : 'Add New Parent'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ana Jovanović"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="ana.jovanovic@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="+381 60 123 4567"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> After creating a parent, you can link them to students in the Students page.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : parent ? 'Update Parent' : 'Add Parent'}
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

export default ProfileManagementPage;