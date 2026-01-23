// services/AttendanceService.js

// AttendanceRecord class to handle individual student attendance
class AttendanceRecord {
  constructor(data = {}) {
    this.dateKey = data.date_key || '';
    this.classId = data.class_id || '';
    this.studentId = data.student_id || '';
    this.status = data.status || null;
    this.comment = data.comment || '';
  }

  isPresent() {
    return this.status === 'present';
  }

  isAbsent() {
    return this.status === 'absent';
  }

  isLate() {
    return this.status === 'late';
  }
}

export class AttendanceService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for AttendanceService');
    }
    this.supabase = supabase;
    this.cache = {}; // In-memory cache for attendance records
    console.log('AttendanceService initialized');
  }

  getCacheKey(dateKey, classId, studentId = null) {
    return studentId 
      ? `${dateKey}:${classId}:${studentId}`
      : `${dateKey}:${classId}`;
  }

  /**
   * Load all attendance for a specific class on a specific date
   */
  async loadClassAttendance(dateKey, classId) {
    try {
      console.log('Loading attendance for:', { dateKey, classId });
      
      const { data, error } = await this.supabase
        .from('attendance')
        .select('*')
        .eq('date_key', dateKey)
        .eq('class_id', classId);

      if (error) throw error;

      // Cache all records
      if (data) {
        data.forEach(record => {
          const key = this.getCacheKey(dateKey, classId, record.student_id);
          this.cache[key] = new AttendanceRecord(record);
        });
      }

      console.log('Attendance loaded:', data?.length || 0, 'records');
      return data || [];
    } catch (error) {
      console.error('Error loading class attendance:', error);
      throw error;
    }
  }

  /**
   * Get attendance record for a specific student
   */
  getAttendance(dateKey, classId, studentId) {
    const key = this.getCacheKey(dateKey, classId, studentId);
    return this.cache[key] || new AttendanceRecord({ 
      date_key: dateKey, 
      class_id: classId, 
      student_id: studentId 
    });
  }

  /**
   * Mark student attendance
   */
  async markAttendance(dateKey, classId, studentId, status) {
    try {
      console.log('Marking attendance:', { dateKey, classId, studentId, status });
      
      const { data, error } = await this.supabase
        .from('attendance')
        .upsert({
          date_key: dateKey,
          class_id: classId,
          student_id: studentId,
          status: status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date_key,class_id,student_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update cache
      const record = new AttendanceRecord(data);
      const key = this.getCacheKey(dateKey, classId, studentId);
      this.cache[key] = record;

      console.log('Attendance marked successfully');
      return record;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  }

  /**
   * Update behavior comment for a student
   */
  async updateComment(dateKey, classId, studentId, comment) {
    try {
      console.log('Updating comment:', { dateKey, classId, studentId });
      
      const { data, error } = await this.supabase
        .from('attendance')
        .upsert({
          date_key: dateKey,
          class_id: classId,
          student_id: studentId,
          comment: comment,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date_key,class_id,student_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Update cache
      const record = new AttendanceRecord(data);
      const key = this.getCacheKey(dateKey, classId, studentId);
      this.cache[key] = record;

      console.log('Comment updated successfully');
      return record;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  /**
   * Get attendance statistics for a class
   */
  getClassStats(dateKey, classId, studentIds) {
    const stats = {
      total: studentIds.length,
      present: 0,
      absent: 0,
      late: 0,
      unmarked: 0
    };

    studentIds.forEach(studentId => {
      const record = this.getAttendance(dateKey, classId, studentId);
      if (record.isPresent()) stats.present++;
      else if (record.isAbsent()) stats.absent++;
      else if (record.isLate()) stats.late++;
      else stats.unmarked++;
    });

    return stats;
  }
}