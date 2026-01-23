import React, { useState, useEffect, useCallback } from 'react';
import { Search, Edit, Trash2, UserPlus, Users, Mail, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CLASSES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5A', 'Y5B', 'Y6', 'Y7', 'Y8', 'Y9'];

const StudentsPage = () => {
  const { studentsService, supabase } = useApp();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    class_name: 'Y1',
    student_no: 1,
    email: '',
    parent_contact: '',
    notes: ''
  });

  // Create service instance if not provided by context
  const service = React.useMemo(() => {
    if (studentsService) return studentsService;
    if (!supabase) return null;
    
    class LocalStudentsService {
      constructor(supabaseClient) {
        this.supabase = supabaseClient;
      }
      
      async getAllStudents() {
        const { data, error } = await this.supabase
          .from('students')
          .select('*')
          .order('class_name', { ascending: true })
          .order('student_no', { ascending: true });
        if (error) throw error;
        return data || [];
      }
      
      async addStudent(studentData) {
        const { data, error } = await this.supabase
          .from('students')
          .insert([{
            name: studentData.name,
            class_name: studentData.class_name,
            student_no: studentData.student_no,
            email: studentData.email || null,
            parent_contact: studentData.parent_contact || null,
            notes: studentData.notes || null,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      
      async updateStudent(studentId, studentData) {
        const { data, error } = await this.supabase
          .from('students')
          .update({
            name: studentData.name,
            class_name: studentData.class_name,
            student_no: studentData.student_no,
            email: studentData.email || null,
            parent_contact: studentData.parent_contact || null,
            notes: studentData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', studentId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      
      async deleteStudent(studentId) {
        const { error } = await this.supabase
          .from('students')
          .delete()
          .eq('id', studentId);
        if (error) throw error;
        return true;
      }
      
      async getNextStudentNumber(className) {
        const { data, error } = await this.supabase
          .from('students')
          .select('student_no')
          .eq('class_name', className)
          .order('student_no', { ascending: false })
          .limit(1);
        if (error) return 1;
        if (data && data.length > 0) return data[0].student_no + 1;
        return 1;
      }
      
      groupStudentsByClass(students) {
        return students.reduce((acc, student) => {
          if (!acc[student.class_name]) {
            acc[student.class_name] = [];
          }
          acc[student.class_name].push(student);
          return acc;
        }, {});
      }
    }
    
    return new LocalStudentsService(supabase);
  }, [studentsService, supabase]);

  const loadStudents = useCallback(async () => {
    if (!service) return;
    
    try {
      const data = await service.getAllStudents();
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      alert('Failed to load students. Error: ' + error.message);
    }
  }, [service]);

  const filterStudents = useCallback(() => {
    let filtered = students;

    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.class_name === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_no.toString().includes(searchTerm)
      );
    }

    setFilteredStudents(filtered);
  }, [students, selectedClass, searchTerm]);

  useEffect(() => {
    if (service) {
      loadStudents();
    }
  }, [service, loadStudents]);

  useEffect(() => {
    filterStudents();
  }, [filterStudents]);

  const openAddModal = async () => {
    if (!service) return;
    const nextNo = await service.getNextStudentNumber(formData.class_name);
    setFormData({
      name: '',
      class_name: 'Y1',
      student_no: nextNo,
      email: '',
      parent_contact: '',
      notes: ''
    });
    setEditingStudent(null);
    setShowAddModal(true);
  };

  const openEditModal = (student) => {
    setFormData({
      name: student.name,
      class_name: student.class_name,
      student_no: student.student_no,
      email: student.email || '',
      parent_contact: student.parent_contact || '',
      notes: student.notes || ''
    });
    setEditingStudent(student);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!service) {
      alert('Service not ready');
      return;
    }
    
    if (!formData.name.trim()) {
      alert('Please enter student name');
      return;
    }

    try {
      setLocalLoading(true);
      
      if (editingStudent) {
        await service.updateStudent(editingStudent.id, formData);
      } else {
        await service.addStudent(formData);
      }

      await loadStudents();
      setShowAddModal(false);
      setEditingStudent(null);
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student. Error: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!service) return;
    
    if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      return;
    }

    try {
      setLocalLoading(true);
      await service.deleteStudent(studentId);
      await loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Error: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClassChange = async (newClass) => {
    if (!service) return;
    const nextNo = await service.getNextStudentNumber(newClass);
    setFormData({ ...formData, class_name: newClass, student_no: nextNo });
  };

  const getClassStats = () => {
    if (!service) return [];
    const grouped = service.groupStudentsByClass(students);
    return CLASSES.map(className => ({
      className,
      count: grouped[className]?.length || 0
    }));
  };

  const classStats = getClassStats();
  const totalStudents = students.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
            <p className="text-gray-500 mt-1">Manage all students across classes</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus size={20} />
            Add Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-lg">
          <Users size={32} className="mb-2 opacity-80" />
          <p className="text-3xl font-bold">{totalStudents}</p>
          <p className="text-sm opacity-90">Total Students</p>
        </div>
        {classStats.slice(0, 4).map(stat => (
          <div key={stat.className} className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">{stat.className}</p>
            <p className="text-3xl font-bold text-emerald-600">{stat.count}</p>
            <p className="text-xs text-gray-400">students</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {classStats.slice(4, 9).map(stat => (
          <div key={stat.className} className="bg-white rounded-2xl p-6 shadow-lg border border-emerald-100">
            <p className="text-sm text-gray-500 mb-1">{stat.className}</p>
            <p className="text-3xl font-bold text-emerald-600">{stat.count}</p>
            <p className="text-xs text-gray-400">students</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or student number..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {CLASSES.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-emerald-50 border-b border-emerald-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">No.</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Class</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-emerald-700">Parent Contact</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-emerald-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-emerald-700">
                          {student.student_no}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{student.name}</p>
                      {student.notes && (
                        <p className="text-xs text-gray-500 mt-1">{student.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {student.class_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.email ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} />
                          {student.email}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {student.parent_contact ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          {student.parent_contact}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                          title="Edit student"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Delete student"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name *
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Enter student name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.class_name}
                    onChange={(e) => handleClassChange(e.target.value)}
                  >
                    {CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student No. *
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.student_no}
                    onChange={(e) => setFormData({ ...formData, student_no: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="student@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Contact (Optional)
                </label>
                <input
                  type="tel"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="+381 60 123 4567"
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  rows={3}
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name.trim() || localLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localLoading ? 'Saving...' : (editingStudent ? 'Update Student' : 'Add Student')}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStudent(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;