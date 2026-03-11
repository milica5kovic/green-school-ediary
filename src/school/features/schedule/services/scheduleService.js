// services/ScheduleService.js
// FIXED: Added school_id filtering for multi-tenant support

export class ScheduleService {
  constructor(supabase, schoolId = null) {
    if (!supabase) {
      throw new Error('Supabase client is required for ScheduleService');
    }
    this.supabase = supabase;
    this.schoolId = schoolId;
    console.log('ScheduleService initialized | schoolId:', schoolId);
  }

  /**
   * Set school ID for tenant filtering
   */
  setSchoolId(schoolId) {
    this.schoolId = schoolId;
  }

  /**
   * Get schedule for a specific day
   * SECURITY: Filters by both teacher_id AND school_id
   */
  async getScheduleByDay(dayOfWeek, teacherId = null) {
    try {
      console.log('🔐 Fetching schedule for:', dayOfWeek, '| teacherId:', teacherId, '| schoolId:', this.schoolId);
      
      // SECURITY: Must have both teacherId and schoolId
      if (!teacherId || !this.schoolId) {
        console.log('⚠️ Missing teacherId or schoolId, returning empty');
        return [];
      }

      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .select(`
          *,
          teacher:teachers!teacher_schedule_teacher_id_fkey(
            full_name,
            email,
            user_id
          )
        `)
        .eq('day_of_week', dayOfWeek)
        .eq('teacher_id', teacherId)
        .eq('school_id', this.schoolId)  // TENANT FILTER
        .order('time_slot', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('✅ Schedule fetched:', data?.length || 0, 'entries');
      
      return (data || []).map(item => ({
        id: item.id,
        time: item.time_slot,
        class: item.class_name,
        subject: item.subject,
        type: item.schedule_type || 'class',
        teacherId: item.teacher_id,
        teacherName: item.teacher?.full_name || 'Unknown',
        teacherEmail: item.teacher?.email || ''
      }));
    } catch (error) {
      console.error('Error fetching schedule:', error);
      throw error;
    }
  }

  /**
   * Get full week schedule
   * SECURITY: Filters by both teacher_id AND school_id
   */
  async getWeekSchedule(teacherId = null) {
    try {
      console.log('🔐 Fetching full week schedule | teacherId:', teacherId, '| schoolId:', this.schoolId);
      
      const emptySchedule = {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: []
      };

      // SECURITY: Must have both teacherId and schoolId
      if (!teacherId || !this.schoolId) {
        console.log('⚠️ Missing teacherId or schoolId, returning empty');
        return emptySchedule;
      }

      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .select(`
          *,
          teacher:teachers!teacher_schedule_teacher_id_fkey(
            full_name,
            email,
            user_id
          )
        `)
        .eq('teacher_id', teacherId)
        .eq('school_id', this.schoolId)  // TENANT FILTER
        .order('time_slot', { ascending: true });

      if (error) throw error;
      
      const schedule = { ...emptySchedule };

      (data || []).forEach(item => {
        if (schedule[item.day_of_week]) {
          schedule[item.day_of_week].push({
            id: item.id,
            time: item.time_slot,
            class: item.class_name,
            subject: item.subject,
            type: item.schedule_type || 'class',
            teacherId: item.teacher_id,
            teacherName: item.teacher?.full_name || 'Unknown',
            teacherEmail: item.teacher?.email || ''
          });
        }
      });

      console.log('✅ Week schedule fetched for school:', this.schoolId);
      return schedule;
    } catch (error) {
      console.error('Error fetching week schedule:', error);
      throw error;
    }
  }

  /**
   * Add a class/duty/extracurricular to schedule
   * SECURITY: Requires teacher_id and includes school_id
   */
  async addScheduleClass(dayOfWeek, timeSlot, className, subject, type = 'class', teacherId = null) {
    try {
      if (!teacherId) {
        throw new Error('🔒 SECURITY: teacher_id is required');
      }
      
      if (!this.schoolId) {
        throw new Error('🔒 SECURITY: school_id is required');
      }

      console.log('🔐 Adding schedule entry | teacher:', teacherId, '| school:', this.schoolId);

      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .insert([{
          teacher_id: teacherId,
          school_id: this.schoolId,  // TENANT ASSIGNMENT
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

      console.log(`✅ Added ${type} to schedule:`, data);
      return data;
    } catch (error) {
      console.error('❌ Error adding schedule entry:', error);
      throw error;
    }
  }

  /**
   * Update a schedule entry
   * SECURITY: Filters by school_id to prevent cross-tenant updates
   */
  async updateScheduleClass(scheduleId, dayOfWeek, timeSlot, className, subject, type = 'class') {
    try {
      if (!this.schoolId) {
        throw new Error('🔒 SECURITY: school_id is required');
      }

      console.log('🔐 Updating schedule entry:', scheduleId, '| school:', this.schoolId);

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
        .eq('school_id', this.schoolId)  // TENANT FILTER
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Updated schedule entry:', data);
      return data;
    } catch (error) {
      console.error('❌ Error updating schedule entry:', error);
      throw error;
    }
  }

  /**
   * Delete a class from schedule
   * SECURITY: Filters by school_id to prevent cross-tenant deletes
   */
  async deleteScheduleClass(scheduleId) {
    try {
      if (!this.schoolId) {
        throw new Error('🔒 SECURITY: school_id is required');
      }

      console.log('🔐 Deleting schedule entry:', scheduleId, '| school:', this.schoolId);

      const { error } = await this.supabase
        .from('teacher_schedule')
        .delete()
        .eq('id', scheduleId)
        .eq('school_id', this.schoolId);  // TENANT FILTER

      if (error) throw error;

      console.log('✅ Deleted schedule entry:', scheduleId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting schedule entry:', error);
      throw error;
    }
  }

  /**
   * Get statistics about schedule
   * SECURITY: Filters by teacher_id AND school_id
   */
  async getScheduleStats(teacherId = null) {
    try {
      console.log('🔐 Getting schedule stats | teacherId:', teacherId, '| schoolId:', this.schoolId);

      if (!teacherId || !this.schoolId) {
        return {
          total: 0,
          classes: 0,
          duties: 0,
          extracurriculars: 0
        };
      }

      const { data, error } = await this.supabase
        .from('teacher_schedule')
        .select('schedule_type')
        .eq('teacher_id', teacherId)
        .eq('school_id', this.schoolId);  // TENANT FILTER

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

      console.log('✅ Schedule stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error getting schedule stats:', error);
      throw error;
    }
  }
}