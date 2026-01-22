class Homework {
  constructor(id, classId, description, dueDate, assignedDate = new Date()) {
    this.id = id;
    this.classId = classId;
    this.description = description;
    this.dueDate = new Date(dueDate);
    this.assignedDate = new Date(assignedDate);
  }

  addAttachment(file) {
    const attachment = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.url || null,
      uploadedAt: new Date(),
    };
    this.attachments.push(attachment);
    return attachment;
  }

  removeAttachment(attachmentId) {
    this.attachments = this.attachments.filtet(
      (att) => att.id !== attachmentId,
    );
  }
  hasAttachments() {
    return this.attachments.length > 0;
  }
  getAttachmentCount() {
    return this.attachments.length;
  }
  getTotalAttachmentSize() {
    return this.attachments.reduce((total, att) => total + (att.size || 0), 0);
  }
  getFormattedTotalSize() {
    const bytes = this.getTotalAttachmentSize();
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  isOverdue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }

  isDueToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);

    return due.getTime() === today.getTime();
  }

  isUpcoming() {
    return !this.isOverdue();
  }

  getDaysUntilDue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  getStatusText() {
    if (this.isOverdue()) {
      const days = Math.abs(this.getDaysUntilDue());
      return `Overdue by ${days} day${days !== 1 ? "s" : ""}`;
    }

    if (this.isDueToday()) {
      return "Due today";
    }

    const days = this.getDaysUntilDue();
    return `${days} day${days !== 1 ? "s" : ""} remaining`;
  }

  getStatusColor() {
    if (this.isOverdue()) return "red";
    if (this.isDueToday()) return "orange";
    return "green";
  }

  getFormattedDueDate() {
    return this.dueDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

export default Homework;
