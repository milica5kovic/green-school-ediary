export class ClassService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for ClassService');
    }
    this.supabase = supabase;
    console.log('ClassService initialized');
  }

  /**
   * Get classes for a specific date
   * SECURITY: Filter by teacher_id
   */
  async getClassesByDate(dateKey, teacherId = null) {
    try {
      console.log('🔐 Fetching classes for date:', dateKey, '| teacherId:', teacherId);
      
      let query = this.supabase
        .from('classes')
        .select('*')
        .eq('date_key', dateKey)
        .order('time', { ascending: true });

      // SECURITY: Always filter by teacher if provided
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      } else {
        // No teacherId = no classes
        console.log('⚠️ No teacherId provided, returning empty');
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('✅ Classes fetched:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  }

  /**
   * Add a new class
   * SECURITY: Must include teacher_id
   */
  async addClass(dateKey, className, subject, time, title, comment, teacherId) {
    try {
      if (!teacherId) {
        throw new Error('🔒 SECURITY: teacher_id is required');
      }

      console.log('🔐 Adding class for teacher:', teacherId);

      const classId = `${className}-${subject}-${time}-${Date.now()}`;

      const { data, error } = await this.supabase
        .from('classes')
        .insert([{
          class_id: classId,
          date_key: dateKey,
          class_name: className,
          subject: subject,
          time: time,
          title: title,
          parent_visible_note: comment,
          teacher_id: teacherId, // ← DODATO!
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Class added:', data);
      return data;
    } catch (error) {
      console.error('❌ Error adding class:', error);
      throw error;
    }
  }

  /**
   * Delete a class
   */
  async deleteClass(classId) {
    try {
      console.log('🔐 Deleting class:', classId);

      const { error } = await this.supabase
        .from('classes')
        .delete()
        .eq('class_id', classId);

      if (error) throw error;

      console.log('✅ Class deleted');
      return true;
    } catch (error) {
      console.error('❌ Error deleting class:', error);
      throw error;
    }
  }
}