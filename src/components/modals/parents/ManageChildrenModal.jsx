import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../../infrastructure/supabaseClient';

const ManageChildrenModal = ({ parent, onClose, onSave }) => {
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

      // Load all active students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'active')
        .order('class_name, name');

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
    try {
      setSaving(true);

      // Find students to add (in selected but not in linked)
      const toAdd = selectedStudentIds.filter(id => !linkedStudentIds.includes(id));
      
      // Find students to remove (in linked but not in selected)
      const toRemove = linkedStudentIds.filter(id => !selectedStudentIds.includes(id));

      // Add new links
      if (toAdd.length > 0) {
        const newLinks = toAdd.map(studentId => ({
          student_id: studentId,
          parent_id: parent.id,
          relationship: 'parent',
          is_primary: linkedStudentIds.length === 0 // First one is primary
        }));

        const { error: addError } = await supabase
          .from('student_parents')
          .insert(newLinks);

        if (addError) throw addError;
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
    if (!acc[student.class_name]) {
      acc[student.class_name] = [];
    }
    acc[student.class_name].push(student);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Manage Children</h3>
            <p className="text-sm text-gray-600 mt-1">
              Parent: {parent.full_name}
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
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedStudentIds.length} student(s)
              </p>
            </div>

            <div className="space-y-4">
              {Object.entries(studentsByClass).map(([className, students]) => (
                <div key={className} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-semibold text-gray-700">
                    {className} ({students.length})
                  </div>
                  <div className="p-2 space-y-1">
                    {students.map(student => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => handleToggleStudent(student.id)}
                          className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{student.name}</p>
                          <p className="text-xs text-gray-500">
                            Student #{student.student_no}
                          </p>
                        </div>
                        {linkedStudentIds.includes(student.id) && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Currently Linked
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(studentsByClass).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No active students found</p>
              </div>
            )}
          </div>
        )}

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageChildrenModal;