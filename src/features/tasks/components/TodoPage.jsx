import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, AlertCircle, Check } from 'lucide-react';
import { useApp } from '../../../core/context/AppContext';
import { useAuth } from '../../../core/context/AuthContext';

const TodoPage = () => {
  const { todoService } = useApp();
  const { teacher } = useAuth();
  const [todos, setTodos] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    overdue: 0,
    high: 0
  });
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    if (!todoService || !teacher?.id) return;
    
    try {
      setLoading(true);
      const data = await todoService.getTodos(teacher.id);
      
      // Filter out completed tasks
      const pendingTodos = data.filter(todo => !todo.completed);
      setTodos(pendingTodos);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue = pendingTodos.filter(t => 
        t.due_date && new Date(t.due_date) < today
      ).length;
      
      const high = pendingTodos.filter(t => t.priority === 'High').length;
      
      setStats({
        total: pendingTodos.length,
        overdue,
        high
      });
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  }, [todoService, teacher]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const handleToggle = async (todo) => {
    try {
      // Mark as completed and immediately delete
      await todoService.toggleTodo(todo.id, true);
      await todoService.deleteTodo(todo.id);
      await loadTodos();
    } catch (error) {
      console.error('Error completing todo:', error);
      alert('Failed to complete task');
    }
  };

  const handleDelete = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await todoService.deleteTodo(todoId);
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete task');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-50 border-red-200';
      case 'Medium': return 'bg-yellow-50 border-yellow-200';
      case 'Low': return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Grading': return 'bg-blue-100 text-blue-700';
      case 'Planning': return 'bg-purple-100 text-purple-700';
      case 'Administrative': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  const filteredTodos = categoryFilter === 'all' 
    ? todos 
    : todos.filter(todo => todo.category === categoryFilter);

  const groupedByPriority = {
    High: filteredTodos.filter(t => t.priority === 'High'),
    Medium: filteredTodos.filter(t => t.priority === 'Medium'),
    Low: filteredTodos.filter(t => t.priority === 'Low')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
            <p className="text-gray-600 mt-1">Organize and track your to-do list</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Add Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-sm text-blue-600 mt-1">Pending Tasks</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-3xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-sm text-red-600 mt-1">Overdue</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-700">{stats.high}</p>
            <p className="text-sm text-orange-600 mt-1">High Priority</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Category</label>
          <div className="flex gap-2 flex-wrap">
            {['all', 'Grading', 'Planning', 'Administrative', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks by Priority */}
      {filteredTodos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No pending tasks</p>
        </div>
      ) : (
        <>
          {/* High Priority */}
          {groupedByPriority.High.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-red-900">High Priority</h3>
                <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                  {groupedByPriority.High.length} {groupedByPriority.High.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="space-y-2">
                {groupedByPriority.High.map(todo => (
                  <TaskCard 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    isOverdue={isOverdue}
                    getPriorityColor={getPriorityColor}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium Priority */}
          {groupedByPriority.Medium.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-yellow-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-yellow-900">Medium Priority</h3>
                <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
                  {groupedByPriority.Medium.length} {groupedByPriority.Medium.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="space-y-2">
                {groupedByPriority.Medium.map(todo => (
                  <TaskCard 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    isOverdue={isOverdue}
                    getPriorityColor={getPriorityColor}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low Priority */}
          {groupedByPriority.Low.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-emerald-900">Low Priority</h3>
                <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                  {groupedByPriority.Low.length} {groupedByPriority.Low.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="space-y-2">
                {groupedByPriority.Low.map(todo => (
                  <TaskCard 
                    key={todo.id} 
                    todo={todo} 
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    isOverdue={isOverdue}
                    getPriorityColor={getPriorityColor}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryColor={getCategoryColor}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTodoModal
          onClose={() => setShowAddModal(false)}
          onAdd={async (todoData) => {
            try {
              await todoService.addTodo(
                teacher.id,
                todoData.title,
                todoData.description,
                todoData.category,
                todoData.priority,
                todoData.dueDate
              );
              await loadTodos();
              setShowAddModal(false);
            } catch (error) {
              console.error('Error adding todo:', error);
              alert('Failed to add task');
            }
          }}
        />
      )}
    </div>
  );
};

// Task Card Component
const TaskCard = ({ todo, onToggle, onDelete, isOverdue, getPriorityColor, getPriorityBadge, getCategoryColor }) => {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border hover:opacity-80 transition-colors ${getPriorityColor(todo.priority)}`}>
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => onToggle(todo)}
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-400 hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center group"
          title="Mark as complete"
        >
          <Check size={14} className="text-gray-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900">{todo.title}</h4>
          {todo.description && (
            <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
          )}
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-1 rounded ${getPriorityBadge(todo.priority)}`}>
              {todo.priority}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${getCategoryColor(todo.category)}`}>
              {todo.category}
            </span>
            {todo.due_date && (
              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                isOverdue(todo.due_date)
                  ? 'bg-red-100 text-red-700 font-medium'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <CalendarIcon size={12} />
                {new Date(todo.due_date).toLocaleDateString()}
                {isOverdue(todo.due_date) && ' (Overdue)'}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors flex-shrink-0"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// Add Todo Modal Component
const AddTodoModal = ({ onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }
    onAdd({ title, description, category, priority, dueDate: dueDate || null });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">Add New Task</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grade Y7 Mathematics tests"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="Grading">Grading</option>
                <option value="Planning">Planning</option>
                <option value="Administrative">Administrative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              Add Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TodoPage;