// services/TodoService.js
export class TodoService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for TodoService');
    }
    this.supabase = supabase;
    console.log('TodoService initialized');
  }

  /**
   * Get all todos for a teacher
   */
  async getTodos(teacherId) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_todos')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching todos:', error);
      throw error;
    }
  }

  /**
   * Add a new todo
   */
  async addTodo(teacherId, title, description, category, priority, dueDate) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_todos')
        .insert([{
          teacher_id: teacherId,
          title: title,
          description: description || null,
          category: category || 'Other',
          priority: priority || 'Medium',
          due_date: dueDate || null,
          completed: false
        }])
        .select()
        .single();

      if (error) throw error;
      console.log('Todo added:', data);
      return data;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  }

  /**
   * Toggle todo completion
   */
  async toggleTodo(todoId, completed) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_todos')
        .update({
          completed: completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('id', todoId)
        .select()
        .single();

      if (error) throw error;
      console.log('Todo toggled:', data);
      return data;
    } catch (error) {
      console.error('Error toggling todo:', error);
      throw error;
    }
  }

  /**
   * Delete a todo
   */
  async deleteTodo(todoId) {
    try {
      const { error } = await this.supabase
        .from('teacher_todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
      console.log('Todo deleted:', todoId);
      return true;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  /**
   * Update a todo
   */
  async updateTodo(todoId, updates) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_todos')
        .update(updates)
        .eq('id', todoId)
        .select()
        .single();

      if (error) throw error;
      console.log('Todo updated:', data);
      return data;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  /**
   * Get todo statistics
   */
  async getTodoStats(teacherId) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_todos')
        .select('completed, priority, due_date')
        .eq('teacher_id', teacherId);

      if (error) throw error;

      const todos = data || [];
      const total = todos.length;
      const completed = todos.filter(t => t.completed).length;
      const pending = total - completed;
      
      // Count overdue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue = todos.filter(t => 
        !t.completed && t.due_date && new Date(t.due_date) < today
      ).length;

      // Count by priority
      const high = todos.filter(t => !t.completed && t.priority === 'High').length;

      return { total, completed, pending, overdue, high };
    } catch (error) {
      console.error('Error getting todo stats:', error);
      throw error;
    }
  }
}