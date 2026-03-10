// services/StudentsService.js
// ═══════════════════════════════════════════════════════════════════════════
// STUDENTS SERVICE - Multi-tenant aware
// Uses raw supabase for INSERT/UPDATE/DELETE (tenantSupabase wrapper breaks .single())
// Uses tenantSupabase for SELECT (auto-filters by school_id)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase as rawSupabase } from '../../../../core/infrastructure/supabaseClient';

export class StudentsService {
  constructor(supabase, schoolId) {
    if (!supabase) {
      throw new Error('Supabase client is required for StudentsService');
    }
    this.supabase = supabase;      // tenantSupabase for reads (auto-filtered)
    this.rawSupabase = rawSupabase; // raw supabase for writes
    this.schoolId = schoolId;
    console.log('✅ StudentsService initialized');
  }

  // ═══ READ OPERATIONS (use tenantSupabase - auto-filtered) ═══════════════

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
      // Use raw supabase with explicit school_id filter for .single()
      const { data, error } = await this.rawSupabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('school_id', this.schoolId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching student:', error);
      throw error;
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

  async getNextStudentNumber(className) {
    try {
      // Use raw supabase for this query
      const { data, error } = await this.rawSupabase
        .from('students')
        .select('student_no')
        .eq('school_id', this.schoolId)
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

  // ═══ WRITE OPERATIONS (use rawSupabase + explicit school_id) ════════════

  async addStudent(studentData) {
    try {
      if (!studentData.name || !studentData.class_name || !studentData.student_no) {
        throw new Error('Missing required fields: name, class_name, student_no');
      }

      if (!this.schoolId) {
        throw new Error('School ID is required to add a student');
      }

      console.log('➕ Adding student:', {
        name: studentData.name,
        class: studentData.class_name,
        no: studentData.student_no,
        school_id: this.schoolId
      });
      
      const insertData = {
        name: studentData.name,
        class_name: studentData.class_name,
        student_no: parseInt(studentData.student_no),
        email: studentData.email || null,
        parent_contact: studentData.parent_contact || null,
        notes: studentData.notes || null,
        school_year: studentData.school_year || '2025-26',
        status: studentData.status || 'active',
        date_of_birth: studentData.date_of_birth || null,
        school_id: this.schoolId, // ✅ CRITICAL: Multi-tenant
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // ✅ Use rawSupabase for INSERT
      const { data, error } = await this.rawSupabase
        .from('students')
        .insert([insertData])
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }
      
      const student = data?.[0];
      console.log('✅ Student added successfully:', student?.id);
      return student;
    } catch (error) {
      console.error('❌ Error adding student:', error);
      throw error;
    }
  }

  async updateStudent(studentId, studentData) {
    try {
      console.log('✏️ Updating student:', studentId);
      
      // ✅ Don't update student_no - it causes unique constraint issues
      const updateData = {
        name: studentData.name,
        class_name: studentData.class_name,
        email: studentData.email || null,
        parent_contact: studentData.parent_contact || null,
        notes: studentData.notes || null,
        school_year: studentData.school_year || '2025-26',
        date_of_birth: studentData.date_of_birth || null,
        updated_at: new Date().toISOString()
      };

      // ✅ Use rawSupabase for UPDATE - don't use .single()
      const { data, error } = await this.rawSupabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .eq('school_id', this.schoolId) // ✅ Security: only update own school's students
        .select();

      if (error) {
        console.error('❌ Supabase update error:', error);
        throw error;
      }
      
      const student = data?.[0];
      if (!student) {
        throw new Error('Student not found or access denied');
      }
      
      console.log('✅ Student updated successfully');
      return student;
    } catch (error) {
      console.error('❌ Error updating student:', error);
      throw error;
    }
  }

  async deleteStudent(studentId) {
    try {
      console.log('🗑️ Deleting student:', studentId);
      
      // ✅ Use rawSupabase for DELETE
      const { error } = await this.rawSupabase
        .from('students')
        .delete()
        .eq('id', studentId)
        .eq('school_id', this.schoolId); // ✅ Security: only delete own school's students

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

  // ═══ UTILITY ════════════════════════════════════════════════════════════

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