import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import HomeworkCard from './HomeworkCard';
import HomeworkModal from './HomeworkModal';

const HomeworkPage = () => {
  const { supabase } = useApp();
  const { teacher, profile } = useAuth();
  
  const [homework, setHomework] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIX: Load homework with proper dependencies
  const loadHomework = useCallback(async () => {
    if (!supabase) {
      console.log('⚠️ No supabase client available');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📚 HomeworkPage - Loading homework...');
      
      const { data, error } = await supabase
        .from('homework')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      console.log('✅ HomeworkPage - Homework loaded:', data?.length || 0);
      setHomework(data || []);
    } catch (error) {
      console.error('❌ Error loading homework:', error);
      setHomework([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]); // ✅ Include supabase as dependency

  // ✅ FIX: Re-run when component mounts or supabase changes
  useEffect(() => {
    console.log('🔄 HomeworkPage - Mounting/Updating');
    loadHomework();
  }, [loadHomework]); // ✅ Include callback as dependency

  const handleAdd = async (homeworkData) => {
    if (!supabase) return;
    
    // ✅ FIX: Validate class_name
    if (!homeworkData.class_name) {
      alert('Please select a class');
      return;
    }
    
    try {
      setLoading(true);
      console.log('➕ Adding homework:', homeworkData);
      
      const { data, error } = await supabase
        .from('homework')
        .insert([{
          homework_id: `hw_${Date.now()}`,
          class_name: homeworkData.class_name, // ✅ CRITICAL: Include class_name
          subject: homeworkData.subject,
          title: homeworkData.title,
          description: homeworkData.description || null,
          due_date: homeworkData.due_date,
          assigned_date: new Date().toISOString().split('T')[0],
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      console.log('✅ Homework added successfully:', data);
      
      await loadHomework();
      setShowModal(false);
    } catch (error) {
      console.error('❌ Error adding homework:', error);
      alert('Failed to add homework: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (homeworkData) => {
    if (!supabase || !editingHomework) return;
    
    try {
      setLoading(true);
      console.log('✏️ Updating homework:', editingHomework.id);
      
      const { error } = await supabase
        .from('homework')
        .update({
          class_name: homeworkData.class_name,
          subject: homeworkData.subject,
          title: homeworkData.title,
          description: homeworkData.description || null,
          due_date: homeworkData.due_date,
        })
        .eq('id', editingHomework.id);
      
      if (error) throw error;
      
      console.log('✅ Homework updated successfully');
      
      await loadHomework();
      setShowModal(false);
      setEditingHomework(null);
    } catch (error) {
      console.error('❌ Error updating homework:', error);
      alert('Failed to update homework: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (homeworkId) => {
    if (!supabase) return;
    
    if (!window.confirm('Are you sure you want to delete this homework?')) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('🗑️ Deleting homework:', homeworkId);
      
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', homeworkId);
      
      if (error) throw error;
      
      console.log('✅ Homework deleted successfully');
      
      await loadHomework();
    } catch (error) {
      console.error('❌ Error deleting homework:', error);
      alert('Failed to delete homework');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (hw) => {
    setEditingHomework(hw);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHomework(null);
  };

  // Group homework by status
  const pendingHomework = homework.filter(hw => hw.status === 'pending');
  const completedHomework = homework.filter(hw => hw.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText size={24} className="text-emerald-600" />
              Homework Management
            </h2>
            <p className="text-gray-600 mt-1">Assign and track homework</p>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Add Homework
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-600">{pendingHomework.length}</p>
            <p className="text-sm text-orange-700">Pending</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <p className="text-3xl font-bold text-emerald-600">{completedHomework.length}</p>
            <p className="text-sm text-emerald-700">Completed</p>
          </div>
        </div>
      </div>

      {/* Homework List */}
      {loading && homework.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading homework...</p>
        </div>
      ) : homework.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <FileText size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">No homework assigned yet</p>
          <p className="text-sm text-gray-400 mt-2">Click "Add Homework" to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Homework */}
          {pendingHomework.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Pending Homework</h3>
              <div className="space-y-4">
                {pendingHomework.map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Homework */}
          {completedHomework.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Completed Homework</h3>
              <div className="space-y-4">
                {completedHomework.map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <HomeworkModal
          onClose={closeModal}
          onSave={editingHomework ? handleEdit : handleAdd}
          existingHomework={editingHomework}
        />
      )}
    </div>
  );
};

export default HomeworkPage;