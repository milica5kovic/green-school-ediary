class Attendance {
  constructor(dateKey, classId, studentId, status = null, comment = '') {
    this.dateKey = dateKey;       
    this.classId = classId;       
    this.studentId = studentId;   
    this.status = status;         
    this.comment = comment;       
    this.timestamp = new Date();  
  }

 
  isMarked() {
    return this.status !== null;
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

  
  getStatusText() {
    if (!this.isMarked()) return 'Not Marked';
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  
  getStatusColor() {
    switch(this.status) {
      case 'present': return 'green';
      case 'absent': return 'red';
      case 'late': return 'orange';
      default: return 'gray';
    }
  }

  
  hasComment() {
    return this.comment && this.comment.trim().length > 0;
  }
}

export default Attendance;