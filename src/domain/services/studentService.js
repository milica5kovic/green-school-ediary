import { supabase } from "../../infrastructure/supabaseClient";

class StudentService {
  async getStudentsByClass(classId) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("class_name", classId)
      .order("name");

    if (error) throw error;
    return data;
  }

  async getStudentById(studentId) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (error) throw error;
    return data;
  }

  async createStudent({ name, student_no, class_name }) {
    const { data, error } = await supabase
      .from("students")
      .insert({
        name,
        student_no,
        class_name
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStudent(studentId, updates) {
    const { data, error } = await supabase
      .from("students")
      .update(updates)
      .eq("id", studentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteStudent(studentId) {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) throw error;
  }
}

export default StudentService;
