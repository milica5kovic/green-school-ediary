import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import HomeworkCard from './HomeworkCard';
import HomeworkModal from './HomeworkModal';
import StudentHomeworkTracker from './StudentHomeworkTracker';

const HomeworkPage = () => {
  const { supabase } = useApp();
  
  const [homework, setHomework] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingHomework, setTrackingHomework] = useState(null);

  useEffect(() => {
    loadHomework();
  }, []);

  const loadHomework = async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('homework')
        .select('*')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      
      setHomework(data || []);
    } catch (error) {
      console.error('❌ Error loading homework:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (homeworkData) => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('homework')
        .insert([{
          homework_id: 'hw_' + Date.now(),
          class_name: homeworkData.class_name,
          subject: homeworkData.subject,
          title: homeworkData.title,
          description: homeworkData.description || null,
          due_date: homeworkData.due_date,
          assigned_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          attachments: homeworkData.attachments || []
        }]);
      
      if (error) throw error;
      
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
      
      const { error } = await supabase
        .from('homework')
        .update({
          class_name: homeworkData.class_name,
          subject: homeworkData.subject,
          title: homeworkData.title,
          description: homeworkData.description || null,
          due_date: homeworkData.due_date,
          attachments: homeworkData.attachments || []
        })
        .eq('id', editingHomework.id);
      
      if (error) throw error;
      
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
    if (!window.confirm('Delete this homework? This cannot be undone.')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', homeworkId);
      
      if (error) throw error;
      
      await loadHomework();
    } catch (error) {
      console.error('❌ Error deleting homework:', error);
      alert('Failed to delete homework');
    } finally {
      setLoading(false);
    }
  };

  const filteredHomework = homework.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hw.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'all' || hw.class_name === filterClass;
    const matchesStatus = filterStatus === 'all' || hw.status === filterStatus;
    return matchesSearch && matchesClass && matchesStatus;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const overdue = filteredHomework.filter(hw => 
    hw.status === 'pending' && new Date(hw.due_date) < today
  );
  
  const upcoming = filteredHomework.filter(hw => {
    const dueDate = new Date(hw.due_date);
    const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return hw.status === 'pending' && daysUntil >= 0 && daysUntil <= 7;
  });
  
  const pending = filteredHomework.filter(hw => hw.status === 'pending');
  const completed = filteredHomework.filter(hw => hw.status === 'completed');

  const classes = [...new Set(homework.map(hw => hw.class_name))].sort();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2">Homework Management</h2>
            <p className="text-emerald-100">Assign, track, and manage assignments</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white text-emerald-600 px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
          >
            <Plus size={20} />
            New Assignment
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8">
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Total</p>
                <p className="text-3xl font-bold">{homework.length}</p>
              </div>
              <FileText size={32} className="opacity-50" />
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Due Soon</p>
                <p className="text-3xl font-bold">{upcoming.length}</p>
              </div>
              <Clock size={32} className="opacity-50" />
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Overdue</p>
                <p className="text-3xl font-bold">{overdue.length}</p>
              </div>
              <Calendar size={32} className="opacity-50" />
            </div>
          </div>
          
          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Completed</p>
                <p className="text-3xl font-bold">{completed.length}</p>
              </div>
              <CheckCircle2 size={32} className="opacity-50" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search homework..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            />
          </div>
          
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No homework found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or create a new assignment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-red-500 rounded"></div>
                <h3 className="text-lg font-bold text-gray-800">Overdue ({overdue.length})</h3>
              </div>
              <div className="grid gap-3">
                {overdue.map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={(hw) => {
                      setEditingHomework(hw);
                      setShowModal(true);
                    }}
                    onDelete={handleDelete}
                    onTrackStudents={(hw) => {
                      setTrackingHomework(hw);
                      setShowTrackingModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-orange-500 rounded"></div>
                <h3 className="text-lg font-bold text-gray-800">Due This Week ({upcoming.length})</h3>
              </div>
              <div className="grid gap-3">
                {upcoming.map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={(hw) => {
                      setEditingHomework(hw);
                      setShowModal(true);
                    }}
                    onDelete={handleDelete}
                    onTrackStudents={(hw) => {
                      setTrackingHomework(hw);
                      setShowTrackingModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {pending.filter(hw => !overdue.includes(hw) && !upcoming.includes(hw)).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-blue-500 rounded"></div>
                <h3 className="text-lg font-bold text-gray-800">Other Pending</h3>
              </div>
              <div className="grid gap-3">
                {pending.filter(hw => !overdue.includes(hw) && !upcoming.includes(hw)).map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={(hw) => {
                      setEditingHomework(hw);
                      setShowModal(true);
                    }}
                    onDelete={handleDelete}
                    onTrackStudents={(hw) => {
                      setTrackingHomework(hw);
                      setShowTrackingModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-green-500 rounded"></div>
                <h3 className="text-lg font-bold text-gray-800">Completed ({completed.length})</h3>
              </div>
              <div className="grid gap-3">
                {completed.map(hw => (
                  <HomeworkCard
                    key={hw.id}
                    homework={hw}
                    onEdit={(hw) => {
                      setEditingHomework(hw);
                      setShowModal(true);
                    }}
                    onDelete={handleDelete}
                    onTrackStudents={(hw) => {
                      setTrackingHomework(hw);
                      setShowTrackingModal(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <HomeworkModal
          onClose={() => {
            setShowModal(false);
            setEditingHomework(null);
          }}
          onSave={editingHomework ? handleEdit : handleAdd}
          existingHomework={editingHomework}
        />
      )}

      {showTrackingModal && trackingHomework && (
        <StudentHomeworkTracker
          homework={trackingHomework}
          onClose={() => {
            setShowTrackingModal(false);
            setTrackingHomework(null);
          }}
        />
      )}
    </div>
  );
};

export default HomeworkPage;