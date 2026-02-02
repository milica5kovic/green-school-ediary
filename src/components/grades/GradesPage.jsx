import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Filter } from 'lucide-react';
import { supabase } from '../../infrastructure/supabaseClient';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const GradesPage = () => {
  const { gradingService } = useApp();
  const { teacher } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({
    assessmentTitle: '',
    subject: '',
    assessmentType: 'Test',
    maxGrade: 100,
    date: new Date().toISOString().split('T')[0]
  });
  const [studentScores, setStudentScores] = useState({});

  // Get teacher's subjects (only ICT and Maths for you)
  const mySubjects = teacher?.subjects || [];

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadGrades();
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data } = await supabase
      .from('custom_classes')
      .select('*')
      .eq('is_active', true)
      .order('class_name');
    setClasses(data || []);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('custom_subjects')
      .select('*')
      .eq('is_active', true)
      .order('subject_name');
    
    // Filter to only show teacher's subjects
    const filtered = (data || []).filter(s => 
      mySubjects.includes(s.subject_name)
    );
    setSubjects(filtered);
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('class_name', selectedClass)
      .eq('school_year', '2025-26')
      .eq('status', 'active')
      .order('student_no');
    setStudents(data || []);
  };

  const loadGrades = async () => {
    if (!gradingService) return;
    try {
      const classGrades = await gradingService.getClassGrades(selectedClass);
      // Filter to only show grades for teacher's subjects
      const filtered = classGrades.filter(g => mySubjects.includes(g.subject));
      setGrades(filtered);
    } catch (error) {
      console.error('Error loading grades:', error);
      setGrades([]);
    }
  };

  const handleAddGrades = async () => {
    try {
      await gradingService.addGrades(
        studentScores,
        formData.assessmentTitle,
        formData.subject,
        selectedClass,
        formData.assessmentType,
        formData.maxGrade,
        formData.date
      );
      
      setShowAddModal(false);
      setStudentScores({});
      setFormData({
        assessmentTitle: '',
        subject: '',
        assessmentType: 'Test',
        maxGrade: 100,
        date: new Date().toISOString().split('T')[0]
      });
      await loadGrades();
    } catch (error) {
      console.error('Error adding grades:', error);
      alert('Failed to add grades: ' + error.message);
    }
  };

  const handleDeleteGrade = async (gradeId, studentId) => {
    if (!window.confirm('Delete this grade?')) return;
    
    try {
      await gradingService.deleteGrade(studentId, gradeId);
      await loadGrades();
    } catch (error) {
      console.error('Error deleting grade:', error);
      alert('Failed to delete grade');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={24} className="text-emerald-600" />
          Grade Management
        </h2>
        
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.class_name}>{cls.class_name}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-7">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={!selectedClass || subjects.length === 0}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              <Plus size={20} />
              Add Grades
            </button>
          </div>
        </div>

        {mySubjects.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <Filter size={16} />
            <span>Your subjects: {mySubjects.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Grades Display */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
          <h3 className="text-xl font-bold mb-4">Recent Grades - {selectedClass}</h3>
          
          {grades.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No grades recorded yet</p>
              <p className="text-sm text-gray-400 mt-2">Click "Add Grades" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {grades.map(grade => (
                <div key={grade.id} className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-800">{grade.assessmentTitle}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{grade.assessmentType}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {grade.subject} • {new Date(grade.date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-3xl font-bold" style={{ color: grade.getColor() }}>
                        {grade.grade}/{grade.max_grade}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{grade.percentage.toFixed(1)}%</span>
                        <span>•</span>
                        <span className="font-bold" style={{ color: grade.getColor() }}>
                          {grade.letterGrade}
                        </span>
                        {grade.isPrimary && (
                          <>
                            <span>•</span>
                            <span className="text-gray-600">Band {grade.band}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteGrade(grade.id, grade.studentId)}
                      className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                      title="Delete grade"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Grades Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Add Grades for {selectedClass}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Unit 1 Test, Midterm Exam"
                  value={formData.assessmentTitle}
                  onChange={(e) => setFormData({...formData, assessmentTitle: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select subject...</option>
                  {subjects.map(subj => (
                    <option key={subj.id} value={subj.subject_name}>{subj.subject_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Type
                </label>
                <select
                  value={formData.assessmentType}
                  onChange={(e) => setFormData({...formData, assessmentType: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Test">Test</option>
                  <option value="Exam">Exam</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Homework">Homework</option>
                  <option value="Project">Project</option>
                  <option value="Classwork">Classwork</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Grade
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.maxGrade}
                  onChange={(e) => setFormData({...formData, maxGrade: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-6 mb-6">
  <h4 className="font-semibold text-gray-800 mb-4">Enter Student Grades</h4>
  <div className="space-y-2 max-h-96 overflow-y-auto">
    {students.length === 0 ? (
      <p className="text-center text-gray-500 py-8">
        No students found in {selectedClass}. Please add students first.
      </p>
    ) : (
      students.map(student => (
        <div key={student.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-emerald-700">
              {student.student_no}
            </span>
          </div>
          <span className="flex-1 font-medium text-gray-800">{student.name}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="0"
              value={studentScores[student.id] || ''}
              onChange={(e) => setStudentScores({...studentScores, [student.id]: e.target.value})}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center font-semibold"
              max={formData.maxGrade}
              step="0.5"
            />
            <span className="text-gray-400 font-medium">/ {formData.maxGrade}</span>
          </div>
        </div>
      ))
    )}
  </div>
</div>
{students.length > 0 && (
  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm text-blue-800">
      <strong>Students in {selectedClass}:</strong> {students.length} • 
      <strong> Grades entered:</strong> {Object.keys(studentScores).filter(id => studentScores[id]).length}
    </p>
  </div>
)}
            
            <div className="flex gap-3 border-t border-gray-200 pt-6">
              <button
                onClick={handleAddGrades}
                disabled={!formData.assessmentTitle || !formData.subject}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Grades
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setStudentScores({});
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPage;