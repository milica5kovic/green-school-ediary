import { supabase } from '../../infrastructure/supabaseClient';

class ClassService {
  /**
   * Add a class session for a specific day
   */
  async addClass(dateKey, className, subject, time, title) {
    const classId = `${className}-${time}-${dateKey}`;

    const { data, error } = await supabase
      .from('classes')
      .upsert({
        class_id: classId,
        date_key: dateKey,
        class_name: className,
        subject,
        time,
        title
      }, {
        onConflict: 'class_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all classes for a specific date
   */
  async getClassesByDate(dateKey) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('date_key', dateKey)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Delete a class session
   */
  async deleteClass(classId) {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('class_id', classId);

    if (error) throw error;
    return true;
  }

  /**
   * Get class by ID
   */
  async getClassById(classId) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

export default ClassService;