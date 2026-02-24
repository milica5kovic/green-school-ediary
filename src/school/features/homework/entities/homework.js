class Homework {
  constructor(id, classId, description, dueDate, assignedDate = new Date(), attachments = []) {
    this.id = id;
    this.classId = classId;
    this.description = description;
    this.dueDate = new Date(dueDate);
    this.assignedDate = new Date(assignedDate);
    this.attachments = Array.isArray(attachments) ? attachments : []; // ← FIXED: Always ensure array
  }

  // Add an attachment
  addAttachment(file) {
    const attachment = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url || null,
      uploadedAt: new Date()
    };
    this.attachments.push(attachment);
    return attachment;
  }

  // Remove an attachment by ID
  removeAttachment(attachmentId) {
    this.attachments = this.attachments.filter(att => att.id !== attachmentId);
  }

  // Check if homework has attachments
  hasAttachments() {
    return this.attachments && Array.isArray(this.attachments) && this.attachments.length > 0;
  }

  // Get attachment count
  getAttachmentCount() {
    return this.attachments ? this.attachments.length : 0;
  }

  // Get total size of all attachments (in bytes)
  getTotalAttachmentSize() {
    if (!this.attachments) return 0;
    return this.attachments.reduce((total, att) => total + (att.size || 0), 0);
  }

  // Get formatted total size (KB, MB)
  getFormattedTotalSize() {
    const bytes = this.getTotalAttachmentSize();
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Check if homework is overdue
  isOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);
    
    return due < today;
  }

  // Check if homework is due today
  isDueToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);
    
    return due.getTime() === today.getTime();
  }

  // Check if homework is upcoming (not overdue)
  isUpcoming() {
    return !this.isOverdue();
  }

  // Get days until due (negative if overdue)
  getDaysUntilDue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Get status text for display
  getStatusText() {
    if (this.isOverdue()) {
      const days = Math.abs(this.getDaysUntilDue());
      return `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
    }
    
    if (this.isDueToday()) {
      return 'Due today';
    }
    
    const days = this.getDaysUntilDue();
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  }

  // Get status color for UI
  getStatusColor() {
    if (this.isOverdue()) return 'red';
    if (this.isDueToday()) return 'orange';
    return 'green';
  }

  // Get formatted due date string
  getFormattedDueDate() {
    return this.dueDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
}

export default Homework;