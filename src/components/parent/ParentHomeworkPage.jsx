import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentHomeworkPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [homework, setHomework] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id);
      
      const childrenList = studentParents?.map(sp => sp.students).filter(Boolean) || [];
      setChildren(childrenList);
      
      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHomework = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const { data: homeworkData } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', selectedChild.class_name)
        .order('due_date', { ascending: true });
      
      setHomework(homeworkData || []);
    } catch (error) {
      console.error('Error loading homework:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadHomework();
    }
  }, [selectedChild, loadHomework]);

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
    
    if (diff < 0) return { text: Math.abs(diff) + ' days overdue', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (diff === 0) return { text: 'Due today', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (diff === 1) return { text: 'Due tomorrow', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    if (diff <= 7) return { text: 'Due in ' + diff + ' days', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
    return { text: 'Due in ' + diff + ' days', color: 'text-gray-600', bg: 'bg-white', border: 'border-gray-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No student data available</p>
      </div>
    );
  }

  const stats = categorizeHomework();
  
  const filteredHomework = 
    filter === 'all' ? homework :
    filter === 'overdue' ? stats.overdue :
    filter === 'pending' ? stats.dueSoon :
    stats.completed;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Homework</h1>
            <p className="text-sm text-gray-600 mt-1">Track assignments and deadlines</p>
          </div>
          
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChild?.id || ''}
                onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name} - Class {child.class_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{homework.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Overdue</p>
          <p className="text-2xl font-semibold text-red-600">{stats.overdue.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Due This Week</p>
          <p className="text-2xl font-semibold text-orange-600">{stats.dueSoon.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Completed</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.completed.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200'}
          >
            All ({homework.length})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={filter === 'overdue' ? 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200'}
          >
            Overdue ({stats.overdue.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200'}
          >
            Due This Week ({stats.dueSoon.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-emerald-600 text-white' : 'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200'}
          >
            Completed ({stats.completed.length})
          </button>
        </div>

        {filteredHomework.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {filter === 'overdue' && 'No overdue homework'}
              {filter === 'pending' && 'Nothing due this week'}
              {filter === 'completed' && 'No completed homework yet'}
              {filter === 'all' && 'No homework assigned yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHomework.map(hw => {
              const dueInfo = getDaysUntilDue(hw.due_date);
              
              return (
                <div key={hw.id} className={'p-4 rounded-lg border hover:shadow-sm transition-shadow ' + dueInfo.border + ' ' + dueInfo.bg}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{hw.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{hw.subject}</p>
                    </div>
                    <span className={hw.status === 'completed' ? 'text-xs font-medium px-2 py-1 rounded bg-emerald-100 text-emerald-700' : 'text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-700'}>
                      {hw.status}
                    </span>
                  </div>
                  
                  {hw.description && (
                    <p className="text-sm text-gray-600 mb-3">{hw.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      Assigned: {new Date(hw.assigned_date).toLocaleDateString()}
                    </span>
                    <span className={'font-medium ' + dueInfo.color}>
                      {dueInfo.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentHomeworkPage;