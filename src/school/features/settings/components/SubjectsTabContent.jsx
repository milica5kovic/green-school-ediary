import React, { useState, useEffect } from 'react';
import { BookOpen, Edit2, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';

const SubjectsTabContent = () => {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [subjectSuccess, setSubjectSuccess] = useState('');
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setIsLoadingSubjects(true);
    setSubjectError('');
    try {
      const { data, error } = await supabase
        .from('custom_subjects')
        .select('*')
        .eq('is_active', true)
        .order('subject_name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setSubjectError('Failed to load subjects');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { data, error } = await supabase
        .from('custom_subjects')
        .insert([{ subject_name: newSubjectName.trim() }])
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This subject already exists');
        }
        throw error;
      }

      setSubjects([...subjects, data[0]]);
      setNewSubjectName('');
      setSubjectSuccess('Subject added successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding subject:', err);
      setSubjectError(err.message || 'Failed to add subject');
    }
  };

  const handleUpdateSubject = async (subjectId) => {
    if (!editSubjectName.trim()) return;

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { error } = await supabase
        .from('custom_subjects')
        .update({ subject_name: editSubjectName.trim() })
        .eq('id', subjectId);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This subject name already exists');
        }
        throw error;
      }

      setSubjects(subjects.map(s => s.id === subjectId ? { ...s, subject_name: editSubjectName.trim() } : s));
      setEditingSubject(null);
      setEditSubjectName('');
      setSubjectSuccess('Subject updated successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating subject:', err);
      setSubjectError(err.message || 'Failed to update subject');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to deactivate this subject?')) {
      return;
    }

    setSubjectError('');
    setSubjectSuccess('');

    try {
      const { error } = await supabase
        .from('custom_subjects')
        .update({ is_active: false })
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects(subjects.filter(s => s.id !== subjectId));
      setSubjectSuccess('Subject deactivated successfully!');
      setTimeout(() => setSubjectSuccess(''), 3000);
    } catch (err) {
      console.error('Error deactivating subject:', err);
      setSubjectError(err.message || 'Failed to deactivate subject');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Subject */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-600" />
          Add New Subject
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Add subjects that are taught at your school. These will appear in teacher assignment dropdowns throughout the app.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="e.g., Mathematics, Science, History"
          />
          <button
            onClick={handleAddSubject}
            disabled={!newSubjectName.trim()}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <BookOpen size={18} />
            Add Subject
          </button>
        </div>

        {subjectError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1">{subjectError}</p>
          </div>
        )}

        {subjectSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1">{subjectSuccess}</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-2xl font-bold text-blue-700">{subjects.length}</p>
          <p className="text-sm text-blue-600">Total Subjects</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <p className="text-2xl font-bold text-emerald-700">
            {subjects.filter(s => s.is_active).length}
          </p>
          <p className="text-sm text-emerald-600">Active Subjects</p>
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Subjects</h3>

        {isLoadingSubjects ? (
          <p className="text-gray-500">Loading subjects...</p>
        ) : subjects.length === 0 ? (
          <p className="text-gray-500 italic">No subjects added yet.</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100"
              >
                {editingSubject === subject.id ? (
                  <>
                    <input
                      type="text"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleUpdateSubject(subject.id)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSubject(null);
                          setEditSubjectName('');
                        }}
                        className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{subject.subject_name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingSubject(subject.id);
                          setEditSubjectName(subject.subject_name);
                        }}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        title="Edit Name"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          <strong>💡 Tip:</strong> Subjects added here will be available when creating teacher profiles and can be assigned to teachers for their schedules.
        </p>
      </div>
    </div>
  );
};

export default SubjectsTabContent;