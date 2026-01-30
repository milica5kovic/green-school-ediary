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
      
      console.log('Schedule fetched:', data?.length || 0, 'entries');
      
      // Format for compatibility
      return (data || []).map(item => ({
        id: item.id,
        time: item.time_slot,
        class: item.class_name,
        subject: item.subject,
        type: item.schedule_type || 'class'
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
            subject: item.subject,
            type: item.schedule_type || 'class'
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
   * Add a class/duty/extracurricular to schedule
   */
  async addScheduleClass(dayOfWeek, timeSlot, className, subject, type = 'class', teacherId = null) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .insert([{
          teacher_id: teacherId,
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          class_name: className,
          subject: subject,
          schedule_type: type,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      console.log(`Added ${type} to schedule:`, data);
      return data;
    } catch (error) {
      console.error('Error adding schedule entry:', error);
      throw error;
    }
  }

  /**
   * Update a schedule entry
   */
  async updateScheduleClass(scheduleId, dayOfWeek, timeSlot, className, subject, type = 'class') {
    try {
      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .update({
          day_of_week: dayOfWeek,
          time_slot: timeSlot,
          class_name: className,
          subject: subject,
          schedule_type: type
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      console.log('Updated schedule entry:', data);
      return data;
    } catch (error) {
      console.error('Error updating schedule entry:', error);
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

      console.log('Deleted schedule entry:', scheduleId);
      return true;
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      throw error;
    }
  }

  /**
   * Get statistics about schedule
   */
  async getScheduleStats(teacherId = null) {
    try {
      let query = this.supabase
        .from('teacher_schedule')
        .select('schedule_type');

      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      } else {
        query = query.is('teacher_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        classes: 0,
        duties: 0,
        extracurriculars: 0
      };

      (data || []).forEach(item => {
        const type = item.schedule_type || 'class';
        if (type === 'class') stats.classes++;
        else if (type === 'duty') stats.duties++;
        else if (type === 'extracurricular') stats.extracurriculars++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting schedule stats:', error);
      throw error;
    }
  }
}