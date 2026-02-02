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
async addClass(dateKey, className, subject, time, title, parentNote = null) {
  // Add timestamp to make class_id unique
  const timestamp = Date.now();
  const classId = `${className}-${subject}-${time}-${timestamp}`.replace(/\s+/g, '-');

  const { data, error } = await this.supabase
    .from('classes')
    .insert([
      {
        class_id: classId,
        date_key: dateKey,
        class_name: className,
        subject: subject,
        time: time,
        title: title,
        parent_visible_note: parentNote,
      },
    ])
    .select();

  if (error) {
    console.error('Error adding class:', error);
    throw error;
  }
  return data[0];
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