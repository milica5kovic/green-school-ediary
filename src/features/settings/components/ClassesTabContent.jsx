import React, { useState, useEffect } from 'react';
import { Users, Edit2, Trash2, Check, X } from 'lucide-react';
import { supabase } from '../../../core/infrastructure/supabaseClient';

const ClassesTabContent = () => {
  const [classes, setClasses] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [editingClass, setEditingClass] = useState(null);
  const [editClassName, setEditClassName] = useState('');
  const [classError, setClassError] = useState('');
  const [classSuccess, setClassSuccess] = useState('');
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    setClassError('');
    try {
      const { data, error } = await supabase
        .from('custom_classes')
        .select('*')
        .eq('is_active', true)
        .order('class_name');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error('Error loading classes:', err);
      setClassError('Failed to load classes');
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;

    setClassError('');
    setClassSuccess('');

    try {
      const { data, error } = await supabase
        .from('custom_classes')
        .insert([{ class_name: newClassName.trim() }])
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This class already exists');
        }
        throw error;
      }

      setClasses([...classes, data[0]]);
      setNewClassName('');
      setClassSuccess('Class added successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding class:', err);
      setClassError(err.message || 'Failed to add class');
    }
  };

  const handleUpdateClass = async (classId) => {
    if (!editClassName.trim()) return;

    setClassError('');
    setClassSuccess('');

    try {
      const { error } = await supabase
        .from('custom_classes')
        .update({ class_name: editClassName.trim() })
        .eq('id', classId);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This class name already exists');
        }
        throw error;
      }

      setClasses(classes.map(c => c.id === classId ? { ...c, class_name: editClassName.trim() } : c));
      setEditingClass(null);
      setEditClassName('');
      setClassSuccess('Class updated successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating class:', err);
      setClassError(err.message || 'Failed to update class');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm('Are you sure you want to deactivate this class?')) {
      return;
    }

    setClassError('');
    setClassSuccess('');

    try {
      const { error } = await supabase
        .from('custom_classes')
        .update({ is_active: false })
        .eq('id', classId);

      if (error) throw error;

      setClasses(classes.filter(c => c.id !== classId));
      setClassSuccess('Class deactivated successfully!');
      setTimeout(() => setClassSuccess(''), 3000);
    } catch (err) {
      console.error('Error deactivating class:', err);
      setClassError(err.message || 'Failed to deactivate class');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Class */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={20} className="text-emerald-600" />
          Add New Class
        </h3>

        <div className="flex gap-3">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddClass()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="e.g., Y5A, Y6B, Y7C"
          />
          <button
            onClick={handleAddClass}
            disabled={!newClassName.trim()}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Class
          </button>
        </div>

        {classError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-700 flex-1">{classError}</p>
          </div>
        )}

        {classSuccess && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
            <p className="text-sm text-emerald-700 flex-1">{classSuccess}</p>
          </div>
        )}
      </div>

      {/* Classes List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Classes</h3>

        {isLoadingClasses ? (
          <p className="text-gray-500">Loading classes...</p>
        ) : classes.length === 0 ? (
          <p className="text-gray-500">No classes added yet.</p>
        ) : (
          <div className="space-y-2">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100"
              >
                {editingClass === cls.id ? (
                  <>
                    <input
                      type="text"
                      value={editClassName}
                      onChange={(e) => setEditClassName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2 ml-3">
                      <button
                        onClick={() => handleUpdateClass(cls.id)}
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingClass(null);
                          setEditClassName('');
                        }}
                        className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-gray-800">{cls.class_name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingClass(cls.id);
                          setEditClassName(cls.class_name);
                        }}
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
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
    </div>
  );
};

export default ClassesTabContent;