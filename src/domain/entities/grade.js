class Grade {
  constructor(id, studentId, assessmentTitle, subject, date, grade, maxGrade = 100, className = '', assessmentType = 'Test', notes = null) {
    this.id = id;
    this.studentId = studentId;
    this.assessmentTitle = assessmentTitle;
    this.subject = subject;
    this.date = date;
    this.grade = grade;
    this.max_grade = maxGrade;
    this.className = className;
    this.assessmentType = assessmentType;
    this.notes = notes;
  }

  get percentage() {
    return (this.grade / this.max_grade) * 100;
  }

  // Determine if this is primary (Y1-Y6) or secondary (Y7-Y9)
  get isPrimary() {
    const yearMatch = this.className.match(/Y(\d+)/);
    if (!yearMatch) return true; // default to primary
    const year = parseInt(yearMatch[1]);
    return year <= 6;
  }

  // Cambridge Primary Bands (Y1-Y6)
  get primaryBand() {
    const p = this.percentage;
    if (p >= 90) return 6;
    if (p >= 70) return 5;
    if (p >= 55) return 4;
    if (p >= 40) return 3;
    if (p >= 25) return 2;
    return 1;
  }

  get primaryBandDescription() {
    const bands = {
      6: 'Excellent / Outstanding',
      5: 'Great / High Achievement',
      4: 'At Expected Level',
      3: 'Developing / Basic Understanding',
      2: 'Limited / Below Expected Level',
      1: 'Very Limited / Beginning'
    };
    return bands[this.primaryBand] || 'Unknown';
  }

  get primaryLetterGrade() {
    const band = this.primaryBand;
    if (band === 6) return 'A*';
    if (band === 5) return 'A';
    if (band === 4) return 'B';
    if (band === 3) return 'C';
    if (band === 2) return 'D';
    return 'E';
  }

  // IGCSE Grades (Y7-Y9)
  get secondaryLetterGrade() {
    const p = this.percentage;
    if (p >= 95) return 'A*';
    if (p >= 85) return 'A';
    if (p >= 75) return 'B';
    if (p >= 65) return 'C';
    if (p >= 55) return 'D';
    if (p >= 45) return 'E';
    if (p >= 35) return 'F';
    if (p >= 25) return 'G';
    return 'U';
  }

  // Universal getters that pick the right scheme
  get band() {
    return this.isPrimary ? this.primaryBand : null;
  }

  get letterGrade() {
    return this.isPrimary ? this.primaryLetterGrade : this.secondaryLetterGrade;
  }

  get description() {
    if (this.isPrimary) {
      return this.primaryBandDescription;
    } else {
      const grades = {
        'A*': 'Outstanding',
        'A': 'Excellent',
        'B': 'Very Good',
        'C': 'Good',
        'D': 'Satisfactory',
        'E': 'Pass',
        'F': 'Below Pass',
        'G': 'Poor',
        'U': 'Unclassified'
      };
      return grades[this.letterGrade] || 'Unknown';
    }
  }

  getColor() {
    if (this.isPrimary) {
      const colors = {
        6: '#10b981', // green
        5: '#3b82f6', // blue
        4: '#8b5cf6', // purple
        3: '#f59e0b', // orange
        2: '#ef4444', // red
        1: '#6b7280'  // gray
      };
      return colors[this.primaryBand] || '#6b7280';
    } else {
      const p = this.percentage;
      if (p >= 85) return '#10b981'; // green
      if (p >= 65) return '#3b82f6'; // blue
      if (p >= 45) return '#f59e0b'; // orange
      return '#ef4444'; // red
    }
  }

  getBandRange() {
    if (this.isPrimary) {
      const ranges = {
        6: '90-100%',
        5: '70-89%',
        4: '55-69%',
        3: '40-54%',
        2: '25-39%',
        1: '0-24%'
      };
      return ranges[this.primaryBand] || 'N/A';
    } else {
      const grade = this.letterGrade;
      const ranges = {
        'A*': '95-100%',
        'A': '85-94%',
        'B': '75-84%',
        'C': '65-74%',
        'D': '55-64%',
        'E': '45-54%',
        'F': '35-44%',
        'G': '25-34%',
        'U': '0-24%'
      };
      return ranges[grade] || 'N/A';
    }
  }
}

export default Grade;