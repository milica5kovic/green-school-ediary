import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useTenant } from '../../../../core/context/TenantContext';

// ════════════════════════════════════════════════════════════════════════════
// MANAGE CHILDREN MODAL - Links parents to students
// FIX: Now includes school_id in student_parents insert
// ════════════════════════════════════════════════════════════════════════════

const ManageChildrenModal = ({ parent, onClose, onSave }) => {
  const { supabase } = useApp();
  const { schoolId } = useTenant();
  
  const [allStudents, setAllStudents] = useState([]);
  const [linkedStudentIds, setLinkedStudentIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [parent.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all active students (filtered by school via tenantSupabase)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('class_name')
        .order('name');

      if (studentsError) throw studentsError;

      // Load currently linked students
      const { data: linksData, error: linksError } = await supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parent.id);

      if (linksError) throw linksError;

      const linkedIds = linksData.map(link => link.student_id);

      setAllStudents(studentsData || []);
      setLinkedStudentIds(linkedIds);
      setSelectedStudentIds(linkedIds);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSave = async () => {
    if (!schoolId) {
      alert('⚠️ School context not loaded. Please refresh the page.');
      return;
    }

    try {
      setSaving(true);

      // Find students to add (in selected but not in linked)
      const toAdd = selectedStudentIds.filter(id => !linkedStudentIds.includes(id));
      
      // Find students to remove (in linked but not in selected)
      const toRemove = linkedStudentIds.filter(id => !selectedStudentIds.includes(id));

      // Add new links - ✅ NOW INCLUDES school_id
      if (toAdd.length > 0) {
        const newLinks = toAdd.map(studentId => ({
          student_id: studentId,
          parent_id: parent.id,
          relationship: 'parent',
          is_primary: linkedStudentIds.length === 0,
          school_id: schoolId  // ✅ FIX: Added school_id!
        }));

        console.log('🔗 Creating links with school_id:', schoolId);
        
        const { error: addError } = await supabase
          .from('student_parents')
          .insert(newLinks);

        if (addError) {
          console.error('❌ Link insert error:', addError);
          throw addError;
        }
        
        console.log('✅ Links created successfully');
      }

      // Remove old links
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('student_parents')
          .delete()
          .eq('parent_id', parent.id)
          .in('student_id', toRemove);

        if (removeError) throw removeError;
      }

      alert(`✅ Updated! Added: ${toAdd.length}, Removed: ${toRemove.length}`);
      onSave();
    } catch (error) {
      console.error('Error saving links:', error);
      alert('Failed to update student links: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Group students by class
  const studentsByClass = allStudents.reduce((acc, student) => {
    const className = student.class_name || 'No Class';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {});

  // Sort class names
  const sortedClassNames = Object.keys(studentsByClass).sort();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Manage Children</h3>
            <p className="text-sm text-gray-600 mt-1">
              Parent: <span className="font-medium">{parent.full_name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedStudentIds.length} student(s)
              </p>
              {selectedStudentIds.length !== linkedStudentIds.length && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="space-y-4">
              {sortedClassNames.map((className) => {
                const students = studentsByClass[className];
                return (
                  <div key={className} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 font-semibold text-gray-700 text-sm flex items-center justify-between">
                      <span>{className}</span>
                      <span className="text-xs text-gray-500 font-normal">{students.length} students</span>
                    </div>
                    <div className="p-2 space-y-1">
                      {students.map(student => {
                        const isLinked = linkedStudentIds.includes(student.id);
                        const isSelected = selectedStudentIds.includes(student.id);
                        const hasChanged = isLinked !== isSelected;
                        
                        return (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              hasChanged 
                                ? isSelected 
                                  ? 'bg-green-50 border border-green-200' 
                                  : 'bg-red-50 border border-red-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudent(student.id)}
                              className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{student.name}</p>
                              {student.student_no && (
                                <p className="text-xs text-gray-500">
                                  Student #{student.student_no}
                                </p>
                              )}
                            </div>
                            {isLinked && !hasChanged && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                Linked
                              </span>
                            )}
                            {hasChanged && (
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                isSelected 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {isSelected ? '+ Adding' : '− Removing'}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {sortedClassNames.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No active students found</p>
                <p className="text-sm text-gray-400 mt-1">Add students first before linking to parents</p>
              </div>
            )}
          </div>
        )}

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 disabled:opacity-50 font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageChildrenModal;