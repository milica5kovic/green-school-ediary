// services/ClassService.js
export class ClassService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for ClassService');
    }
    this.supabase = supabase;
    console.log('ClassService initialized');
  }

  /**
   * Add a class session for a specific day
   */
  async addClass(dateKey, className, subject, time, title) {
    try {
      const classId = `${className}-${time}-${dateKey}`;
      console.log('Adding class:', { classId, dateKey, className, subject, time, title });

      const { data, error } = await this.supabase
        .from('classes')
        .upsert({
          class_id: classId,
          date_key: dateKey,
          class_name: className,
          subject,
          time,
          title,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'class_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error adding class:', error);
        throw error;
      }
      
      console.log('Class added successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in addClass:', error);
      throw error;
    }
  }

  /**
   * Get all classes for a specific date
   */
  async getClassesByDate(dateKey) {
    try {
      console.log('Fetching classes for date:', dateKey);
      
      const { data, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('date_key', dateKey)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching classes:', error);
        throw error;
      }
      
      console.log('Classes fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error in getClassesByDate:', error);
      throw error;
    }
  }

  /**
   * Delete a class session
   */
  async deleteClass(classId) {
    try {
      console.log('Deleting class:', classId);
      
      const { error } = await this.supabase
        .from('classes')
        .delete()
        .eq('class_id', classId);

      if (error) {
        console.error('Supabase error deleting class:', error);
        throw error;
      }
      
      console.log('Class deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteClass:', error);
      throw error;
    }
  }

  /**
   * Get class by ID
   */
  async getClassById(classId) {
    try {
      const { data, error } = await this.supabase
        .from('classes')
        .select('*')
        .eq('class_id', classId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getClassById:', error);
      throw error;
    }
  }
}