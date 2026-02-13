// services/SettingsService.js
export class SettingsService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for SettingsService');
    }
    this.supabase = supabase;
    console.log('SettingsService initialized');
  }

  // ===== TEACHER PROFILE =====
  
  async getTeacherProfile(teacherId = null) {
    try {
      let query = this.supabase
        .from('teacher_profile')
        .select('*');
      
      if (teacherId) {
        query = query.eq('teacher_id', teacherId);
      } else {
        query = query.is('teacher_id', null); // For now, before auth
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      throw error;
    }
  }

  async updateTeacherProfile(profileData, teacherId = null) {
    try {
      const { data, error } = await this.supabase
        .from('teacher_profile')
        .upsert({
          teacher_id: teacherId,
          name: profileData.name,
          email: profileData.email,
          subjects: profileData.subjects,
          phone: profileData.phone || null,
          bio: profileData.bio || null,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw error;
    }
  }

  // ===== CUSTOM SUBJECTS =====
  
  async getAllSubjects() {
    try {
      const { data, error } = await this.supabase
        .from('custom_subjects')
        .select('*')
        .eq('is_active', true)
        .order('subject_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  }

  async addSubject(subjectName) {
    try {
      const { data, error } = await this.supabase
        .from('custom_subjects')
        .insert([{ subject_name: subjectName }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding subject:', error);
      throw error;
    }
  }

  async deleteSubject(subjectId) {
    try {
      // Soft delete
      const { error } = await this.supabase
        .from('custom_subjects')
        .update({ is_active: false })
        .eq('id', subjectId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting subject:', error);
      throw error;
    }
  }

  // ===== CUSTOM CLASSES =====
  
  async getAllClasses() {
    try {
      const { data, error } = await this.supabase
        .from('custom_classes')
        .select('*')
        .eq('is_active', true)
        .order('class_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  }

  async addClass(className) {
    try {
      const { data, error } = await this.supabase
        .from('custom_classes')
        .insert([{ class_name: className }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  }

  async deleteClass(classId) {
    try {
      // Soft delete
      const { error } = await this.supabase
        .from('custom_classes')
        .update({ is_active: false })
        .eq('id', classId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  }

  // ===== DATA EXPORT =====
  
  async exportAllData() {
    try {
      const [students, grades, attendance, homework] = await Promise.all([
        this.supabase.from('students').select('*'),
        this.supabase.from('grades').select('*'),
        this.supabase.from('attendance').select('*'),
        this.supabase.from('homework').select('*')
      ]);

      return {
        students: students.data || [],
        grades: grades.data || [],
        attendance: attendance.data || [],
        homework: homework.data || []
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Helper: Convert data to CSV
  convertToCSV(data, headers) {
    if (!data || data.length === 0) return '';
    
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // Helper: Download CSV file
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}