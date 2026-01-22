import Homework from '../entities/homework';
import { supabase } from '../../infrastructure/supabaseClient';

class HomeworkService {
  constructor() {
    this.homeworkData = {}; // Cache
  }

  
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

  
  async getAllHomework() {
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return data.map(hw => {
      const homework = new Homework(
        hw.id,
        hw.class_id,
        hw.description,
        hw.due_date,
        hw.assigned_date,
        JSON.parse(hw.attachments || '[]')
      );
      this.homeworkData[hw.class_id] = homework;
      return [hw.class_id, homework];
    });
  }

  
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

  async deleteHomework(classId) {
    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('class_id', classId);

    if (error) throw error;

    delete this.homeworkData[classId];
    return true;
  }

  
  async getStats() {
    const allHomework = await this.getAllHomework();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const all = allHomework.length;
    const upcoming = allHomework.filter(([_, hw]) => hw.isUpcoming()).length;
    const overdue = allHomework.filter(([_, hw]) => hw.isOverdue()).length;
    const dueToday = allHomework.filter(([_, hw]) => hw.isDueToday()).length;

    return { all, upcoming, overdue, dueToday };
  }

  
  async getFilteredHomework(filter = 'all') {
    let allHomework = await this.getAllHomework();

    if (filter === 'upcoming') {
      allHomework = allHomework.filter(([_, hw]) => hw.isUpcoming() && !hw.isDueToday());
    } else if (filter === 'overdue') {
      allHomework = allHomework.filter(([_, hw]) => hw.isOverdue());
    } else if (filter === 'dueToday') {
      allHomework = allHomework.filter(([_, hw]) => hw.isDueToday());
    }

    return allHomework;
  }
}

export default HomeworkService;