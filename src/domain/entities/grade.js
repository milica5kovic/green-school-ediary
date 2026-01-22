class Grade {
  constructor(id, studentId, assignmentName, subject, date, score, classId) {
    this.id = id;
    this.studentId = studentId;
    this.assignmentName = assignmentName;
    this.subject = subject;
    this.date = new Date(date);
    this.score = parseFloat(score);
    this.classId = classId;

    this.band = this.calculateBand(this.score);
    this.letterGrade = this.calculateLetterGrade(this.score);
    this.description = this.getDescription(this.band);
  }
  calculateBand(percentage) {
    if (percentage >= 90) return 6;
    if (percentage >= 70) return 5;
    if (percentage >= 55) return 4;
    if (percentage >= 40) return 3;
    if (percentage >= 25) return 2;
    return 1;
  }
  calculateLetterGrade(percentage) {
    if (percentage >= 90) return "A*";
    if (percentage >= 70) return "A";
    if (percentage >= 55) return "B";
    if (percentage >= 40) return "C";
    if (percentage >= 25) return "D";
    return "E";
  }
  getDescription(band) {
    const descriptions = {
      6: 'Excellent / Outstanding',
      5: 'Great / High Achievement',
      4: 'At Expected Level',
      3: 'Developing / Basic Understanding',
      2: 'Limited / Below Expected Level',
      1: 'Very Limited / Beginning'
    };
    return descriptions[band] || 'Not Graded';
  }
  getColor() {
    switch(this.band) {
      case 6: return 'purple';
      case 5: return 'green';
      case 4: return 'blue';
      case 3: return 'yellow';
      case 2: return 'orange';
      case 1: return 'red';
      default: return 'gray';
    }
  }
   isPassing() {
    return this.band >= 3;
  }

  
  isExcellent() {
    return this.band === 6;
  }

 
  needsImprovement() {
    return this.band <= 2;
  }
  getBandRange() {
    const ranges = {
      6: '90-100%',
      5: '70-89%',
      4: '55-69%',
      3: '40-54%',
      2: '25-39%',
      1: 'Below 25%'
    };
    return ranges[this.band] || 'N/A';
  }
  getFormattedScore() {
    return `${this.score}%`;
  }
  getFullGradeText() {
    return `${this.letterGrade} (Band ${this.band})`;
  }

  getFormattedDate() {
    return this.date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

export default Grade;
