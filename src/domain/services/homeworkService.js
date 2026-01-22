import Homework from '../entities/homework';
import { supabase } from '../../infrastructure/supabaseClient';

class HomeworkService {
  constructor() {
    this.homeworkData = {}; // Cache
  }

  /**
   * Assign homework to a class
   */
  async assignHomework(classId, description, dueDate, attachments = []) {
    const { data, error } = await supabase
      .from('homework')
      .insert({
        class_id: classId,
        description,
        due_date: dueDate,
        attachments: JSON.stringify(attachments)
      })
      .select()
      .single();

    if (error) throw error;

    const homework = new Homework(
      data.id,
      data.class_id,
      data.description,
      data.due_date,
      data.assigned_date,
      JSON.parse(data.attachments || '[]')
    );

    this.homeworkData[classId] = homework;
    return homework;
  }
  safeParseAttachments(value) {
  if (!value || typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("Invalid attachments JSON:", value);
    return [];
  }
}


  /**
   * Get homework for a specific class
   */
  async getHomework(classId) {
    // Check cache first
    if (this.homeworkData[classId]) {
      return this.homeworkData[classId];
    }

    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .eq('class_id', classId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows
      throw error;
    }

    const homework = new Homework(
      data.id,
      data.class_id,
      data.description,
      data.due_date,
      data.assigned_date,
      JSON.parse(data.attachments || '[]')
    );

    this.homeworkData[classId] = homework;
    return homework;
  }

  /**
   * Get all homework assignments
   */
  async getAllHomework() {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    const homeworkList = [];
    
    data.forEach(hw => {
      const homework = new Homework(
        hw.id,
        hw.class_id,
        hw.description,
        hw.due_date,
        hw.assigned_date,
        this.safeParseAttachments(hw.attachments)
      );
      this.homeworkData[hw.class_id] = homework;
      homeworkList.push({
  classId: hw.class_id,
  homework
});

    });

    return homeworkList;
  }

  /**
   * Update homework
   */
  async updateHomework(classId, description, dueDate) {
    const { data, error } = await supabase
      .from('homework')
      .update({
        description,
        due_date: dueDate
      })
      .eq('class_id', classId)
      .select()
      .single();

    if (error) throw error;

    const homework = new Homework(
      data.id,
      data.class_id,
      data.description,
      data.due_date,
      data.assigned_date,
      JSON.parse(data.attachments || '[]')
    );

    this.homeworkData[classId] = homework;
    return homework;
  }

  /**
   * Delete homework
   */
  async deleteHomework(classId) {
    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('class_id', classId);

    if (error) throw error;

    delete this.homeworkData[classId];
    return true;
  }

  /**
   * Get homework statistics
   */
  async getStats() {
    const allHomework = await this.getAllHomework();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const all = allHomework.length;
    const upcoming = allHomework.filter(
  ({ homework }) => homework.isUpcoming() && !homework.isDueToday()
).length;

    const overdue = allHomework.filter(({ homework }) => homework.isOverdue())
.length;
    const dueToday = allHomework.filter(({homework }) => homework.isDueToday()).length;

    return { all, upcoming, overdue, dueToday };
  }

  /**
   * Get filtered homework
   */
  async getFilteredHomework(filter = 'all') {
    const allHomework = await this.getAllHomework();

    if (filter === 'upcoming') {
      return allHomework.filter(([_, hw]) => hw.isUpcoming() && !hw.isDueToday());
    } else if (filter === 'overdue') {
      return allHomework.filter(([_, hw]) => hw.isOverdue());
    } else if (filter === 'dueToday') {
      return allHomework.filter(([_, hw]) => hw.isDueToday());
    }

    return allHomework;
  }
}

export default HomeworkService;