import Grade from "../entities/grade"

import { supabase } from "../../infrastructure/supabaseClient";

class GradingService {
  constructor() {
    this.gradesData = {}; // cache: { studentId: [Grade, ...] }
  }

  _cacheStudent(studentId) {
    if (!this.gradesData[studentId]) {
      this.gradesData[studentId] = [];
    }
  }

  async addGrades(studentScores, assessmentTitle, subject, className, assessmentType = 'Test', maxGrade = 100, date = new Date().toISOString().split('T')[0]) {
    const addedGrades = [];

    for (const [studentId, gradeValue] of Object.entries(studentScores)) {
      if (gradeValue !== undefined && gradeValue !== "") {
        const { data, error } = await supabase
          .from("grades")
          .insert({
            student_id: studentId,
            class_name: className,
            subject: subject,
            assessment_type: assessmentType,
            assessment_title: assessmentTitle,
            grade: parseFloat(gradeValue),
            max_grade: parseFloat(maxGrade),
            date: date
          })
          .select()
          .single();

        if (error) throw error;

        const grade = new Grade(
          data.id,
          data.student_id,
          data.assessment_title,
          data.subject,
          data.date,
          data.grade,
          data.max_grade,
          data.class_name,
          data.assessment_type,
          data.notes
        );

        this._cacheStudent(studentId);
        this.gradesData[studentId].push(grade);
        addedGrades.push(grade);
      }
    }

    return addedGrades;
  }

  async getStudentGrades(studentId) {
    this._cacheStudent(studentId);

    if (this.gradesData[studentId].length === 0) {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", studentId)
        .order('date', { ascending: false });

      if (error) throw error;

      this.gradesData[studentId] = (data || []).map(
        g => new Grade(
          g.id,
          g.student_id,
          g.assessment_title,
          g.subject,
          g.date,
          g.grade,
          g.max_grade,
          g.class_name,
          g.assessment_type,
          g.notes
        )
      );
    }

    return this.gradesData[studentId];
  }

  async deleteGrade(studentId, gradeId) {
    const { error } = await supabase
      .from("grades")
      .delete()
      .eq("id", gradeId);

    if (error) throw error;

    this._cacheStudent(studentId);
    this.gradesData[studentId] = this.gradesData[studentId].filter(
      g => g.id !== gradeId
    );
  }

  // Calculate percentage score
  _getPercentage(grade, maxGrade) {
    return (grade / maxGrade) * 100;
  }

  getStudentAverage(studentId, subject = null) {
    const studentGrades = this.gradesData[studentId] || [];
    
    const filtered = subject
      ? studentGrades.filter(g => g.subject === subject)
      : studentGrades;

    if (filtered.length === 0) return null;

    // Calculate weighted average based on percentage
    const totalPercentage = filtered.reduce((sum, g) => {
      return sum + this._getPercentage(g.grade, g.max_grade);
    }, 0);
    
    return parseFloat((totalPercentage / filtered.length).toFixed(1));
  }

  getStudentBand(studentId, subject = null) {
    const avg = this.getStudentAverage(studentId, subject);
    if (!avg) return null;

    const tempGrade = new Grade(0, studentId, '', '', new Date(), avg, 100, '', '', null);
    return tempGrade.band;
  }

  getStudentLetterGrade(studentId, subject = null) {
    const avg = this.getStudentAverage(studentId, subject);
    if (!avg) return null;

    const tempGrade = new Grade(0, studentId, '', '', new Date(), avg, 100, '', '', null);
    return tempGrade.letterGrade;
  }

  async getClassGrades(className) {
    const { data, error } = await supabase
      .from("grades")
      .select("*")
      .eq("class_name", className)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map(g => new Grade(
      g.id,
      g.student_id,
      g.assessment_title,
      g.subject,
      g.date,
      g.grade,
      g.max_grade,
      g.class_name,
      g.assessment_type,
      g.notes
    ));
  }

  async getGradeDistribution(students) {
    const distribution = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const student of students) {
      const grades = await this.getStudentGrades(student.id);
      const avg = this.getStudentAverage(student.id);

      if (avg !== null) {
        const tempGrade = new Grade(0, student.id, "", "", new Date(), avg, 100, "", "", null);
        const band = tempGrade.band;
        if (band) distribution[band]++;
      }
    }

    return distribution;
  }

  getCambridgeBandInfo(percentage) {
    const tempGrade = new Grade(0, 0, '', '', new Date(), percentage, 100, '', '', null);
    return {
      band: tempGrade.band,
      grade: tempGrade.letterGrade,
      description: tempGrade.description,
      color: tempGrade.getColor(),
      range: tempGrade.getBandRange()
    };
  }
}

export default GradingService;