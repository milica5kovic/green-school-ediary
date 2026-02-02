import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentHomeworkPage = () => {
  const { supabase } = useApp();
  const [child, setChild] = useState(null);
  const [homework, setHomework] = useState([]);
  const [filter, setFilter] = useState('all'); // all, overdue, pending, completed
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get parent record
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      // Get child
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id)
        .limit(1);
      
      const childData = studentParents?.[0]?.students;
      if (!childData) return;
      
      setChild(childData);
      
      // Load homework for child's class
      const { data: homeworkData } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', childData.class_name)
        .order('due_date', { ascending: true });
      
      setHomework(homeworkData || []);
      
    } catch (error) {
      console.error('Error loading homework:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categorizeHomework = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = homework.filter(hw => 
      hw.status === 'pending' && new Date(hw.due_date) < today
    );
    
    const dueSoon = homework.filter(hw => {
      const dueDate = new Date(hw.due_date);
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return hw.status === 'pending' && daysUntil >= 0 && daysUntil <= 7;
    });
    
    const completed = homework.filter(hw => hw.status === 'completed');
    
    return { overdue, dueSoon, completed };
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, color: 'text-red-600', urgent: true };
    if (diff === 0) return { text: 'Due today', color: 'text-orange-600', urgent: true };
    if (diff === 1) return { text: 'Due tomorrow', color: 'text-orange-600', urgent: true };
    if (diff <= 7) return { text: `Due in ${diff} days`, color: 'text-yellow-600', urgent: false };
    return { text: `Due in ${diff} days`, color: 'text-gray-600', urgent: false };
  };

  const HomeworkCard = ({ hw }) => {
    const dueInfo = getDaysUntilDue(hw.due_date);
    
    return (
      <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
        dueInfo.urgent && hw.status === 'pending'
          ? 'border-red-300 bg-red-50'
          : hw.status === 'completed'
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-800">{hw.title}</h4>
              {dueInfo.urgent && hw.status === 'pending' && (
                <span className="text-red-500">⚠️</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{hw.subject}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            hw.status === 'completed' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-orange-100 text-orange-700'
          }`}>
            {hw.status}
          </span>
        </div>
        
        {hw.description && (
          <p className="text-sm text-gray-700 mb-3 p-3 bg-gray-50 rounded-lg">
            {hw.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock size={16} />
              <span>Assigned: {new Date(hw.assigned_date).toLocaleDateString()}</span>
            </div>
          </div>
          <div className={`font-semibold ${dueInfo.color} flex items-center gap-1`}>
            {hw.status === 'pending' && <AlertCircle size={16} />}
            {hw.status === 'completed' && <CheckCircle size={16} />}
            <span>{dueInfo.text}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading homework...</p>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <p className="text-gray-500">No student data available</p>
      </div>
    );
  }

  const { overdue, dueSoon, completed } = categorizeHomework();
  
  const filteredHomework = 
    filter === 'all' ? homework :
    filter === 'overdue' ? overdue :
    filter === 'pending' ? dueSoon :
    completed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Homework - {child.name}</h2>
        <p className="text-gray-500">Track assignments and deadlines</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow">
          <p className="text-3xl font-bold text-gray-700">{homework.length}</p>
          <p className="text-sm text-gray-600 mt-1">Total</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-red-200 shadow">
          <p className="text-3xl font-bold text-red-600">{overdue.length}</p>
          <p className="text-sm text-gray-600 mt-1">Overdue</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-orange-200 shadow">
          <p className="text-3xl font-bold text-orange-600">{dueSoon.length}</p>
          <p className="text-sm text-gray-600 mt-1">Due This Week</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-green-200 shadow">
          <p className="text-3xl font-bold text-green-600">{completed.length}</p>
          <p className="text-sm text-gray-600 mt-1">Completed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex gap-3 mb-6 overflow-x-auto">
          {[
            { id: 'all', label: 'All', count: homework.length },
            { id: 'overdue', label: 'Overdue', count: overdue.length, color: 'red' },
            { id: 'pending', label: 'Due This Week', count: dueSoon.length, color: 'orange' },
            { id: 'completed', label: 'Completed', count: completed.length, color: 'green' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-6 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Homework List */}
        {filteredHomework.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {filter === 'overdue' && 'No overdue homework! 🎉'}
              {filter === 'pending' && 'Nothing due this week'}
              {filter === 'completed' && 'No completed homework yet'}
              {filter === 'all' && 'No homework assigned yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHomework.map(hw => (
              <HomeworkCard key={hw.id} hw={hw} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentHomeworkPage;