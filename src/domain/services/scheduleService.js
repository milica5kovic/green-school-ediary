// services/ScheduleService.js
export class ScheduleService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for ScheduleService');
    }
    this.supabase = supabase;
    console.log('ScheduleService initialized');
  }

  /**
   * Get schedule for a specific day
   */
  async getScheduleByDay(dayOfWeek, teacherId = null) {
    try {
      console.log('Fetching schedule for:', dayOfWeek);
      
      let query = this.supabase
        .from('teacher_schedule')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .order('time_slot', { ascending: true });

      // For now, teacherId is null, but later we'll filter by logged-in teacher
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      } else {
        query = query.is('teacher_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Schedule fetched:', data?.length || 0, 'classes');
      
      // Format for AddClassModal compatibility
      return (data || []).map(item => ({
        id: item.id,
        time: item.time_slot,
        class: item.class_name,
        subject: item.subject
      }));
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
  }

  /**
   * Get full week schedule
   */
  async getWeekSchedule(teacherId = null) {
    try {
      console.log('Fetching full week schedule');
      
      let query = this.supabase
        .from('teacher_schedule')
        .select('*')
        .order('time_slot', { ascending: true });

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      } else {
        query = query.is('teacher_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Group by day
      const schedule = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: []
      };

      (data || []).forEach(item => {
        if (schedule[item.day_of_week]) {
          schedule[item.day_of_week].push({
            id: item.id,
            time: item.time_slot,
            class: item.class_name,
            subject: item.subject
          });
        }
      });

      console.log('Week schedule fetched');
      return schedule;
    } catch (error) {
      console.error('Error fetching week schedule:', error);
      throw error;
    }
  }

  /**
   * Add a class to schedule
   */
  async addScheduleClass(dayOfWeek, timeSlot, className, subject, teacherId = null) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .insert([{
          teacher_id: teacherId,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          class_name: className,
          subject: subject,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding schedule class:', error);
      throw error;
    }
  }

  /**
   * Delete a class from schedule
   */
  async deleteScheduleClass(scheduleId) {
    try {
      const { error } = await this.supabase
        .from('teacher_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting schedule class:', error);
      throw error;
    }
  }
}