/**
 * Student Entity
 * Represents a student in the school system
 */
class Student {
  constructor(id, name, studentNo, className) {
    this.id = id;
    this.name = name;
    this.studentNo = studentNo;
    this.className = className;
  }

  
  getDisplayName() {
    return `${this.studentNo} - ${this.name}`;
  }

  
  getInitials() {
    const names = this.name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return this.name.substring(0, 2).toUpperCase();
  }
}

export default Student;