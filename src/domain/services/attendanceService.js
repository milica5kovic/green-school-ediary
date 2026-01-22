import Attendance from "../entities/attendance";
import { supabase } from "../../infrastructure/supabaseClient";

class AttendanceService {
  constructor() {
    this.attendanceData = {}; // local cache
  }

  _cacheKey(dateKey, classId) {
    return `${dateKey}_${classId}`;
  }

  async loadClassAttendance(dateKey, classId) {
    const key = this._cacheKey(dateKey, classId);

    if (this.attendanceData[key]) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("date_key", dateKey)
      .eq("class_id", classId);

    if (error) throw error;

    this.attendanceData[key] = {};

    data.forEach(row => {
      this.attendanceData[key][row.student_id] = new Attendance(
        row.date_key,
        row.class_id,
        row.student_id,
        row.status,
        row.comment || ""
      );
    });
  }

  async markAttendance(dateKey, classId, studentId, status, comment = "") {
    await supabase
      .from("attendance")
      .upsert(
        {
          date_key: dateKey,
          class_id: classId,
          student_id: studentId,
          status,
          comment
        },
        {
          onConflict: "class_id,student_id,date_key"
        }
      );

    const key = this._cacheKey(dateKey, classId);

    if (!this.attendanceData[key]) {
      this.attendanceData[key] = {};
    }

    const attendance = new Attendance(
      dateKey,
      classId,
      studentId,
      status,
      comment
    );

    this.attendanceData[key][studentId] = attendance;
    return attendance;
  }

  getAttendance(dateKey, classId, studentId) {
    const key = this._cacheKey(dateKey, classId);
    const record = this.attendanceData[key]?.[studentId];

    return record || new Attendance(dateKey, classId, studentId, null, "");
  }

  async updateComment(dateKey, classId, studentId, comment) {
    const record = this.getAttendance(dateKey, classId, studentId);

    return this.markAttendance(
      dateKey,
      classId,
      studentId,
      record.status,
      comment
    );
  }

  getClassAttendance(dateKey, classId) {
    return this.attendanceData[this._cacheKey(dateKey, classId)] || {};
  }

  getClassStats(dateKey, classId, students) {
    const stats = {
      total: students.length,
      present: 0,
      absent: 0,
      late: 0,
      notMarked: 0
    };

    students.forEach(student => {
      const record = this.getAttendance(dateKey, classId, student.id);

      if (record.isPresent()) stats.present++;
      else if (record.isAbsent()) stats.absent++;
      else if (record.isLate()) stats.late++;
      else stats.notMarked++;
    });

    return stats;
  }

  isClassComplete(dateKey, classId, students) {
    return this.getClassStats(dateKey, classId, students).notMarked === 0;
  }

  getAttendanceRate(dateKey, classId, students) {
    const stats = this.getClassStats(dateKey, classId, students);
    if (stats.total === 0) return 0;

    return (((stats.present + stats.late) / stats.total) * 100).toFixed(1);
  }

  getStudentsWithComments(dateKey, classId, students) {
    return students
      .map(student => ({
        student,
        record: this.getAttendance(dateKey, classId, student.id)
      }))
      .filter(item => item.record.hasComment());
  }

  clearDateAttendance(dateKey) {
    Object.keys(this.attendanceData)
      .filter(key => key.startsWith(dateKey))
      .forEach(key => delete this.attendanceData[key]);
  }
}

export default AttendanceService;
