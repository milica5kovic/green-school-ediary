// services/HomeworkService.js
export class HomeworkService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for HomeworkService');
    }
    this.supabase = supabase;
    console.log('HomeworkService initialized');
  }

  // Generate unique homework ID
  generateHomeworkId() {
    return `hw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get all homework
  async getAllHomework() {
    try {
      console.log('Fetching all homework...');
      const { data, error } = await this.supabase
        .from('homework')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Homework fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error fetching homework:', error);
      throw error;
    }
  }

  // Get homework by class
  async getHomeworkByClass(className) {
    try {
      console.log('Fetching homework for class:', className);
      const { data, error } = await this.supabase
        .from('homework')
        .select('*')
        .eq('class_name', className)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Homework fetched for class:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error fetching homework by class:', error);
      throw error;
    }
  }

  // Get homework by ID
  async getHomeworkById(homeworkId) {
    try {
      const { data, error } = await this.supabase
        .from('homework')
        .select('*')
        .eq('homework_id', homeworkId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching homework by ID:', error);
      throw error;
    }
  }

  // Add new homework
  async addHomework(homeworkData) {
    try {
      console.log('Adding homework:', homeworkData);
      
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
          assigned_date: homeworkData.assigned_date || new Date().toISOString().split('T')[0],
          status: homeworkData.status || 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Homework added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error adding homework:', error);
      throw error;
    }
  }

  // Update homework
  async updateHomework(homeworkId, homeworkData) {
    try {
      console.log('Updating homework:', homeworkId, homeworkData);
      
      const { data, error } = await this.supabase
        .from('homework')
        .update({
          class_name: homeworkData.class_name,
          subject: homeworkData.subject,
          title: homeworkData.title,
          description: homeworkData.description || null,
          due_date: homeworkData.due_date,
          status: homeworkData.status,
          updated_at: new Date().toISOString()
        })
        .eq('homework_id', homeworkId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Homework updated successfully:', data);
      return data;
    } catch (error) {
      console.error('Error updating homework:', error);
      throw error;
    }
  }

  // Delete homework
  async deleteHomework(homeworkId) {
    try {
      console.log('Deleting homework:', homeworkId);
      
      const { error } = await this.supabase
        .from('homework')
        .delete()
        .eq('homework_id', homeworkId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Homework deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting homework:', error);
      throw error;
    }
  }

  // Update homework status
  async updateStatus(homeworkId, status) {
    try {
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
    } catch (error) {
      console.error('Error updating homework status:', error);
      throw error;
    }
  }

  // Get upcoming homework (due in next 7 days)
  async getUpcomingHomework() {
    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data, error } = await this.supabase
        .from('homework')
        .select('*')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', nextWeek.toISOString().split('T')[0])
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming homework:', error);
      throw error;
    }
  }

  // Get overdue homework
  async getOverdueHomework() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await this.supabase
        .from('homework')
        .select('*')
        .lt('due_date', today)
        .eq('status', 'pending')
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching overdue homework:', error);
      throw error;
    }
  }
}