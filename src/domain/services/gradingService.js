import Grade from "../entities/grade";
import { supabase } from "../../infrastructure/supabaseClient";

class GradingService {
  constructor() {
    this.gradesData = {}; // optional cache: { studentId: [Grade, ...] }
  }

  _cacheStudent(studentId) {
    if (!this.gradesData[studentId]) {
      this.gradesData[studentId] = [];
    }
  }

  async addGrades(studentScores, assignmentName, subject, date, classId) {
    const addedGrades = [];

    for (const [studentId, score] of Object.entries(studentScores)) {
      if (score !== undefined && score !== "") {
        // upsert into Supabase
        const { data, error } = await supabase
          .from("grades")
          .upsert(
            {
              student_id: parseInt(studentId),
              assignment_name: assignmentName,
              subject,
              date,
              score: parseFloat(score),
              class_id: classId
            },
            { onConflict: "student_id,assignment_name,subject,date,class_id" }
          )
          .select()
          .single();

        if (error) throw error;

        const grade = new Grade(
          data.id,
          data.student_id,
          data.assignment_name,
          data.subject,
          data.date,
          data.score,
          data.class_id
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
        .eq("student_id", studentId);

      if (error) throw error;

      this.gradesData[studentId] = data.map(
        g =>
          new Grade(
            g.id,
            g.student_id,
            g.assignment_name,
            g.subject,
            g.date,
            g.score,
            g.class_id
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
  
  
  getStudentAverage(studentId, subject = null) {
    const studentGrades = this.gradesData[studentId] || [];
    
    const filtered = subject
      ? studentGrades.filter(g => g.subject === subject)
      : studentGrades;

    if (filtered.length === 0) return null;

    const avg = filtered.reduce((sum, g) => sum + g.score, 0) / filtered.length;
    return parseFloat(avg.toFixed(1));
  }
  getStudentBand(studentId, subject = null) {
    const avg = this.getStudentAverage(studentId, subject);
    if (!avg) return null;

    const tempGrade = new Grade(0, studentId, '', '', new Date(), avg, '');
    return tempGrade.band;
  }
  getStudentLetterGrade(studentId, subject = null) {
    const avg = this.getStudentAverage(studentId, subject);
    if (!avg) return null;

    const tempGrade = new Grade(0, studentId, '', '', new Date(), avg, '');
    return tempGrade.letterGrade;
  }
  async getAssignmentAverage(assignmentName, classId) {
    const { data, error } = await supabase
      .from("grades")
      .select("score")
      .eq("assignment_name", assignmentName)
      .eq("class_id", classId);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, g) => sum + g.score, 0);
    return parseFloat((total / data.length).toFixed(1));
  }
  async getGradeDistribution(students) {
    const distribution = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    for (const student of students) {
      const grades = await this.getStudentGrades(student.id);
      const avg = grades.length
        ? grades.reduce((sum, g) => sum + g.score, 0) / grades.length
        : null;

      if (avg !== null) {
        const tempGrade = new Grade(0, student.id, "", "", new Date(), avg, "");
        const band = tempGrade.band;
        if (band) distribution[band]++;
      }
    }

    return distribution;
  }
  async getGradeDistributionPercentages(students) {
    const distribution = await this.getGradeDistribution(students);
    const total = students.length;
    const percentages = {};

    Object.entries(distribution).forEach(([band, count]) => {
      percentages[band] = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    });

    return percentages;
  }
    // Get average score per subject for a class
  async getClassSubjectAverages(classId) {
    // Fetch all grades for the class
    const { data, error } = await supabase
      .from("grades")
      .select("subject, score")
      .eq("class_id", classId);

    if (error) throw error;
    if (!data || data.length === 0) return {};

    // Aggregate totals and counts per subject
    const totals = {};
    const counts = {};

    data.forEach(g => {
      if (!totals[g.subject]) totals[g.subject] = 0;
      if (!counts[g.subject]) counts[g.subject] = 0;

      totals[g.subject] += g.score;
      counts[g.subject] += 1;
    });

    // Compute averages per subject
    const averages = {};
    Object.keys(totals).forEach(subject => {
      averages[subject] = parseFloat((totals[subject] / counts[subject]).toFixed(1));
    });

    return averages; // { Math: 85.2, English: 78.5, ... }
  }

  // Get highest, lowest, and average score for a class overall
  async getClassStats(classId) {
    const { data, error } = await supabase
      .from("grades")
      .select("score")
      .eq("class_id", classId);

    if (error) throw error;
    if (!data || data.length === 0) return { average: null, highest: null, lowest: null, count: 0 };

    const scores = data.map(g => g.score);
    const total = scores.reduce((sum, s) => sum + s, 0);
    return {
      average: parseFloat((total / scores.length).toFixed(1)),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      count: scores.length
    };
  }

  
  getCambridgeBandInfo(percentage) {
    const tempGrade = new Grade(0, 0, '', '', new Date(), percentage, '');
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
