import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, AlertCircle, Check, ListTodo, Loader2 } from 'lucide-react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { useTenant } from '../../../../core/context/TenantContext';
import { useAuth } from '../../../../core/context/AuthContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ============================================================================
// TODO PAGE - Production Ready
// Multi-tenant aware, uses useTermTheme
// ============================================================================

const TodoPage = () => {
  const { schoolId } = useTenant();
  const { teacher } = useAuth();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const [todos, setTodos] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, overdue: 0, high: 0 });
  const [loading, setLoading] = useState(true);

  // ─── Load Todos ────────────────────────────────────────────────────────────

  const loadTodos = useCallback(async () => {
    if (!schoolId || !teacher?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('teacher_todos')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', teacher.id)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false });
      
      if (error) throw error;
      
      const pendingTodos = data || [];
      setTodos(pendingTodos);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const overdue = pendingTodos.filter(t => 
        t.due_date && new Date(t.due_date) < today
      ).length;
      
      const high = pendingTodos.filter(t => t.priority === 'High').length;
      
      setStats({ total: pendingTodos.length, overdue, high });
      
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId, teacher]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = async (todo) => {
    try {
      // Mark as completed and delete
      const { error } = await supabase
        .from('teacher_todos')
        .delete()
        .eq('id', todo.id)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      await loadTodos();
    } catch (error) {
      console.error('Error completing todo:', error);
      alert('Failed to complete task');
    }
  };

  const handleDelete = async (todoId) => {
    if (!window.confirm('Delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('teacher_todos')
        .delete()
        .eq('id', todoId)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete task');
    }
  };

  const handleAddTodo = async (todoData) => {
    try {
      const { error } = await supabase
        .from('teacher_todos')
        .insert([{
          teacher_id: teacher.id,
          school_id: schoolId,
          title: todoData.title,
          description: todoData.description,
          category: todoData.category,
          priority: todoData.priority,
          due_date: todoData.dueDate || null,
          completed: false
        }]);
      
      if (error) throw error;
      await loadTodos();
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add task');
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'High': return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' };
      case 'Medium': return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' };
      case 'Low': return { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' };
    }
  };

  const getCategoryBadge = (category) => {
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

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin" style={{ color: theme.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* ═══ TERM BANNER ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>{theme.name} Term</span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>{theme.daysRemaining} days left</span>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg p-6 border"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme.withAlpha(0.15) }}
            >
              <ListTodo size={24} style={{ color: theme.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
              <p className="text-gray-500 text-sm">Organize and track your to-do list</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2 hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.color }}
          >
            <Plus size={18} /> Add Task
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div 
            className="rounded-xl p-4 border"
            style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.2) }}
          >
            <p className="text-3xl font-bold" style={{ color: theme.color }}>{stats.total}</p>
            <p className="text-sm text-gray-600 mt-1">Pending Tasks</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-sm text-red-600 mt-1">Overdue</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-600">{stats.high}</p>
            <p className="text-sm text-orange-600 mt-1">High Priority</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mt-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'Grading', 'Planning', 'Administrative', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  categoryFilter === cat ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={categoryFilter === cat ? { backgroundColor: theme.color } : {}}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TASKS ═══ */}
      {filteredTodos.length === 0 ? (
        <div 
          className="bg-white rounded-2xl shadow-lg p-12 text-center border"
          style={{ borderColor: theme.withAlpha(0.15) }}
        >
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No pending tasks</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ color: theme.color, backgroundColor: theme.withAlpha(0.1) }}
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* High Priority */}
          {groupedByPriority.High.length > 0 && (
            <PrioritySection
              title="High Priority"
              todos={groupedByPriority.High}
              color="red"
              onToggle={handleToggle}
              onDelete={handleDelete}
              isOverdue={isOverdue}
              getPriorityStyles={getPriorityStyles}
              getCategoryBadge={getCategoryBadge}
            />
          )}

          {/* Medium Priority */}
          {groupedByPriority.Medium.length > 0 && (
            <PrioritySection
              title="Medium Priority"
              todos={groupedByPriority.Medium}
              color="amber"
              onToggle={handleToggle}
              onDelete={handleDelete}
              isOverdue={isOverdue}
              getPriorityStyles={getPriorityStyles}
              getCategoryBadge={getCategoryBadge}
            />
          )}

          {/* Low Priority */}
          {groupedByPriority.Low.length > 0 && (
            <PrioritySection
              title="Low Priority"
              todos={groupedByPriority.Low}
              color="green"
              onToggle={handleToggle}
              onDelete={handleDelete}
              isOverdue={isOverdue}
              getPriorityStyles={getPriorityStyles}
              getCategoryBadge={getCategoryBadge}
            />
          )}
        </div>
      )}

      {/* ═══ ADD MODAL ═══ */}
      {showAddModal && (
        <AddTodoModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTodo}
          theme={theme}
        />
      )}
    </div>
  );
};

// ─── Priority Section Component ──────────────────────────────────────────────

const PrioritySection = ({ title, todos, color, onToggle, onDelete, isOverdue, getPriorityStyles, getCategoryBadge }) => {
  const colorMap = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-700' },
  };
  const colors = colorMap[color];

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-5 border ${colors.border}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${colors.text}`}>{title}</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors.badge}`}>
          {todos.length} {todos.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      <div className="space-y-2">
        {todos.map(todo => (
          <TaskCard
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            isOverdue={isOverdue}
            getPriorityStyles={getPriorityStyles}
            getCategoryBadge={getCategoryBadge}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Task Card Component ─────────────────────────────────────────────────────

const TaskCard = ({ todo, onToggle, onDelete, isOverdue, getPriorityStyles, getCategoryBadge }) => {
  const styles = getPriorityStyles(todo.priority);
  const overdue = isOverdue(todo.due_date);

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border ${styles.bg} ${styles.border}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onToggle(todo)}
          className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center group"
        >
          <Check size={12} className="text-transparent group-hover:text-green-500 transition-colors" />
        </button>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">{todo.title}</h4>
          {todo.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{todo.description}</p>
          )}
          
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${getCategoryBadge(todo.category)}`}>
              {todo.category}
            </span>
            {todo.due_date && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                overdue ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-600'
              }`}>
                <CalendarIcon size={10} />
                {new Date(todo.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {overdue && ' !'}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onDelete(todo.id)}
        className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// ─── Add Todo Modal ──────────────────────────────────────────────────────────

const AddTodoModal = ({ onClose, onAdd, theme }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }
    setSaving(true);
    await onAdd({ title, description, category, priority, dueDate: dueDate || null });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ backgroundColor: theme.color }}
        >
          <h3 className="text-lg font-bold">Add New Task</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <Plus size={18} className="rotate-45" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Grade Y7 tests"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
              >
                <option value="Grading">Grading</option>
                <option value="Planning">Planning</option>
                <option value="Administrative">Administrative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: theme.color }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Add Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
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