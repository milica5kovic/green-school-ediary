import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Edit, Trash2, Calendar, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CLASSES = ['Y1', 'Y2', 'Y3', 'Y4', 'Y5A', 'Y5B', 'Y6', 'Y7', 'Y8', 'Y9'];
const SUBJECTS = ['Mathematics', 'ICT', 'English', 'Science', 'History', 'Geography'];

const HomeworkPage = () => {
  const { supabase } = useApp();
  const [homework, setHomework] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [formData, setFormData] = useState({
    class_name: 'Y1',
    subject: 'Mathematics',
    title: '',
    description: '',
    due_date: '',
    assigned_date: new Date().toISOString().split('T')[0]
  });

  const service = React.useMemo(() => {
    if (!supabase) return null;
    
    class LocalHomeworkService {
      constructor(supabaseClient) {
        this.supabase = supabaseClient;
      }
      
      generateHomeworkId() {
        return `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      async getAllHomework() {
        const { data, error } = await this.supabase
          .from('homework')
          .select('*')
          .order('due_date', { ascending: true });
        if (error) throw error;
        return data || [];
      }
      
      async addHomework(homeworkData) {
        const homeworkId = this.generateHomeworkId();
        const { data, error } = await this.supabase
          .from('homework')
          .insert([{
            homework_id: homeworkId,
            class_name: homeworkData.class_name,
            subject: homeworkData.subject,
            title: homeworkData.title,
            description: homeworkData.description || null,
            due_date: homeworkData.due_date,
            assigned_date: homeworkData.assigned_date,
            status: 'pending',
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      
      async updateHomework(homeworkId, homeworkData) {
        const { data, error } = await this.supabase
          .from('homework')
          .update({
            class_name: homeworkData.class_name,
            subject: homeworkData.subject,
            title: homeworkData.title,
            description: homeworkData.description,
            due_date: homeworkData.due_date,
            updated_at: new Date().toISOString()
          })
          .eq('homework_id', homeworkId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      
      async deleteHomework(homeworkId) {
        const { error } = await this.supabase
          .from('homework')
          .delete()
          .eq('homework_id', homeworkId);
        if (error) throw error;
        return true;
      }
      
      async updateStatus(homeworkId, status) {
        const { data, error } = await this.supabase
          .from('homework')
          .update({ 
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('homework_id', homeworkId)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }
    
    return new LocalHomeworkService(supabase);
  }, [supabase]);

  const loadHomework = useCallback(async () => {
    if (!service) return;
    
    try {
      const data = await service.getAllHomework();
      setHomework(data);
    } catch (error) {
      console.error('Error loading homework:', error);
      alert('Failed to load homework. Error: ' + error.message);
    }
  }, [service]);

  useEffect(() => {
    if (service) {
      loadHomework();
    }
  }, [service, loadHomework]);

  const getFilteredHomework = () => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (filter) {
      case 'upcoming':
        return homework.filter(hw => hw.due_date >= today && hw.status === 'pending');
      case 'dueToday':
        return homework.filter(hw => hw.due_date === today && hw.status === 'pending');
      case 'overdue':
        return homework.filter(hw => hw.due_date < today && hw.status === 'pending');
      case 'completed':
        return homework.filter(hw => hw.status === 'completed');
      default:
        return homework;
    }
  };

  const getStats = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      all: homework.length,
      upcoming: homework.filter(hw => hw.due_date >= today && hw.status === 'pending').length,
      dueToday: homework.filter(hw => hw.due_date === today && hw.status === 'pending').length,
      overdue: homework.filter(hw => hw.due_date < today && hw.status === 'pending').length,
      completed: homework.filter(hw => hw.status === 'completed').length
    };
  };

  const openAddModal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setFormData({
      class_name: 'Y1',
      subject: 'Mathematics',
      title: '',
      description: '',
      due_date: tomorrow.toISOString().split('T')[0],
      assigned_date: new Date().toISOString().split('T')[0]
    });
    setEditingHomework(null);
    setShowModal(true);
  };

  const openEditModal = (hw) => {
    setFormData({
      class_name: hw.class_name,
      subject: hw.subject,
      title: hw.title,
      description: hw.description || '',
      due_date: hw.due_date,
      assigned_date: hw.assigned_date
    });
    setEditingHomework(hw);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!service) {
      alert('Service not ready');
      return;
    }
    
    if (!formData.title.trim() || !formData.due_date) {
      alert('Please fill in title and due date');
      return;
    }

    try {
      setLocalLoading(true);
      
      if (editingHomework) {
        await service.updateHomework(editingHomework.homework_id, formData);
      } else {
        await service.addHomework(formData);
      }

      await loadHomework();
      setShowModal(false);
      setEditingHomework(null);
    } catch (error) {
      console.error('Error saving homework:', error);
      alert('Failed to save homework. Error: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDelete = async (homeworkId) => {
    if (!service) return;
    
    if (!window.confirm('Are you sure you want to delete this homework?')) {
      return;
    }

    try {
      setLocalLoading(true);
      await service.deleteHomework(homeworkId);
      await loadHomework();
    } catch (error) {
      console.error('Error deleting homework:', error);
      alert('Failed to delete homework. Error: ' + error.message);
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleStatus = async (hw) => {
    if (!service) return;
    
    try {
      const newStatus = hw.status === 'completed' ? 'pending' : 'completed';
      await service.updateStatus(hw.homework_id, newStatus);
      await loadHomework();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (dueDate, status) => {
    if (status === 'completed') return 'text-green-600';
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'text-red-600';
    if (days === 0) return 'text-orange-600';
    if (days <= 3) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const stats = getStats();
  const filteredHomework = getFilteredHomework();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Homework Assignments</h2>
            <p className="text-gray-500 mt-1">Manage homework across all classes</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Assign Homework
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-3xl font-bold text-emerald-700">{stats.all}</p>
            <p className="text-sm text-emerald-600 mt-1">Total</p>
          </div> */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <p className="text-3xl font-bold text-blue-700">{stats.upcoming}</p>
            <p className="text-sm text-blue-600 mt-1">Upcoming</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-700">{stats.dueToday}</p>
            <p className="text-sm text-orange-600 mt-1">Due Today</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
            <p className="text-3xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-sm text-red-600 mt-1">Overdue</p>
          </div>
          {/* <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
            <p className="text-sm text-green-600 mt-1">Completed</p>
          </div> */}
        </div>

        <div className="flex gap-3">
          {['all', 'upcoming', 'dueToday', 'overdue', 'completed'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === filterType
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterType === 'dueToday' ? 'Due Today' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredHomework.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <FileText size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">No homework found</p>
          <p className="text-sm text-gray-400 mt-2">Click "Assign Homework" to add new assignments</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHomework.map((hw) => {
            const daysUntil = getDaysUntilDue(hw.due_date);
            
            return (
              <div key={hw.homework_id} className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100 hover:shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {hw.class_name}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {hw.subject}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        hw.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {hw.status}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{hw.title}</h3>
                    
                    {hw.description && (
                      <p className="text-gray-600 mb-3">{hw.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-500">
                          Assigned: {new Date(hw.assigned_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className={getDueDateColor(hw.due_date, hw.status)} />
                        <span className={`font-semibold ${getDueDateColor(hw.due_date, hw.status)}`}>
                          Due: {new Date(hw.due_date).toLocaleDateString()}
                          {hw.status !== 'completed' && (
                            <span className="ml-2">
                              ({daysUntil === 0 ? 'Today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days left`})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleStatus(hw)}
                      className={`p-2 rounded-lg transition-colors ${
                        hw.status === 'completed'
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={hw.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                    >
                      <BookOpen size={18} />
                    </button>
                    <button
                      onClick={() => openEditModal(hw)}
                      className="p-2 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors"
                      title="Edit homework"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(hw.homework_id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Delete homework"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {editingHomework ? 'Edit Homework' : 'Assign New Homework'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  >
                    {CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    {SUBJECTS.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="e.g., Chapter 5 Exercises"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  rows={4}
                  placeholder="Homework details and instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.assigned_date}
                    onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || !formData.due_date || localLoading}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-2 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {localLoading ? 'Saving...' : (editingHomework ? 'Update Homework' : 'Assign Homework')}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingHomework(null);
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

export default HomeworkPage;