// services/StudentsService.js
export class StudentsService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for StudentsService');
    }
    this.supabase = supabase;
    console.log('✅ StudentsService initialized');
  }

  async getAllStudents() {
    try {
      console.log('📚 Fetching all students...');
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .order('class_name', { ascending: true })
        .order('student_no', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log(`✅ Students fetched: ${data?.length || 0}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching students:', error);
      throw error;
    }
  }

  async getStudentsByClass(className) {
    try {
      console.log('📚 Fetching students for class:', className);
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .eq('class_name', className)
        .order('student_no', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log(`✅ Students fetched for ${className}: ${data?.length || 0}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching students by class:', error);
      throw error;
    }
  }

  async getStudentById(studentId) {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching student:', error);
      throw error;
    }
  }

  async addStudent(studentData) {
    try {
      // ✅ CRITICAL: Validate required fields
      if (!studentData.name || !studentData.class_name || !studentData.student_no) {
        throw new Error('Missing required fields: name, class_name, student_no');
      }

      console.log('➕ Adding student:', {
        name: studentData.name,
        class: studentData.class_name,
        no: studentData.student_no,
        school_year: studentData.school_year || '2025-26'
      });
      
      // ✅ CRITICAL: Build insert object with explicit defaults
      const insertData = {
        name: studentData.name,
        class_name: studentData.class_name,
        student_no: parseInt(studentData.student_no), // Ensure number
        email: studentData.email || null,
        parent_contact: studentData.parent_contact || null,
        notes: studentData.notes || null,
        school_year: studentData.school_year || '2025-26', // ✅ DEFAULT
        status: studentData.status || 'active', // ✅ DEFAULT
        date_of_birth: studentData.date_of_birth || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 Insert data:', insertData);

      const { data, error } = await this.supabase
        .from('students')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      console.log('✅ Student added successfully:', data);
      console.log('   - school_year:', data.school_year);
      console.log('   - status:', data.status);
      
      return data;
    } catch (error) {
      console.error('❌ Error adding student:', error);
      throw error;
    }
  }

  async updateStudent(studentId, studentData) {
    try {
      console.log('✏️ Updating student:', studentId);
      
      const updateData = {
        name: studentData.name,
        class_name: studentData.class_name,
        student_no: parseInt(studentData.student_no),
        email: studentData.email || null,
        parent_contact: studentData.parent_contact || null,
        notes: studentData.notes || null,
        school_year: studentData.school_year || '2025-26', // ✅ Ensure school_year
        date_of_birth: studentData.date_of_birth || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }
      
      console.log('✅ Student updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Error updating student:', error);
      throw error;
    }
  }

  async deleteStudent(studentId) {
    try {
      console.log('🗑️ Deleting student:', studentId);
      const { error } = await this.supabase
        .from('students')
        .delete()
        .eq('id', studentId);

      if (error) {
        console.error('❌ Supabase delete error:', error);
        throw error;
      }
      
      console.log('✅ Student deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      throw error;
    }
  }

  async getNextStudentNumber(className) {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('student_no')
        .eq('class_name', className)
        .order('student_no', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Error getting next student number:', error);
        return 1;
      }
      
      if (data && data.length > 0) {
        return data[0].student_no + 1;
      }
      return 1;
    } catch (error) {
      console.error('❌ Error getting next student number:', error);
      return 1;
    }
  }

  async searchStudents(searchTerm) {
    try {
      const { data, error } = await this.supabase
        .from('students')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('class_name', { ascending: true })
        .order('student_no', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error searching students:', error);
      throw error;
    }
  }

  groupStudentsByClass(students) {
    return students.reduce((acc, student) => {
      if (!acc[student.class_name]) {
        acc[student.class_name] = [];
      }
      acc[student.class_name].push(student);
      return acc;
    }, {});
  }
}