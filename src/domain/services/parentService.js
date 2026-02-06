// domain/services/parentService.js
export class ParentService {
  constructor(supabase) {
    if (!supabase) {
      throw new Error('Supabase client is required for ParentService');
    }
    this.supabase = supabase;
    console.log('✅ ParentService initialized');
  }

  /**
   * Get all parents from profiles table
   */
  async getAllParents() {
    try {
      console.log('📚 Loading all parents...');
      
      const { data, error } = await this.supabase
        .from('parents')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log(`✅ Parents loaded: ${data?.length || 0}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching parents:', error);
      throw error;
    }
  }

  /**
   * Get parent by ID
   */
  async getParentById(parentId) {
    try {
      const { data, error } = await this.supabase
        .from('parents')
        .select('*')
        .eq('id', parentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching parent:', error);
      throw error;
    }
  }

  /**
   * Get parent by user_id
   */
  async getParentByUserId(userId) {
    try {
      const { data, error } = await this.supabase
        .from('parents')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error fetching parent by user_id:', error);
      return null;
    }
  }

  /**
   * Get students linked to a parent
   */
  async getLinkedStudents(parentId) {
    try {
      const { data, error } = await this.supabase
        .from('student_parents')
        .select(`
          *,
          students(*)
        `)
        .eq('parent_id', parentId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching linked students:', error);
      throw error;
    }
  }

  /**
   * Link student to parent
   */
  async linkStudent(parentId, studentId, relationship = 'parent', isPrimary = false) {
    try {
      console.log('🔗 Linking student to parent:', { parentId, studentId, relationship });

      const { data, error } = await this.supabase
        .from('student_parents')
        .insert([{
          parent_id: parentId,
          student_id: studentId,
          relationship: relationship,
          is_primary: isPrimary
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Student linked successfully');
      return data;
    } catch (error) {
      console.error('❌ Error linking student:', error);
      throw error;
    }
  }

  /**
   * Unlink student from parent
   */
  async unlinkStudent(linkId) {
    try {
      const { error } = await this.supabase
        .from('student_parents')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      console.log('✅ Student unlinked successfully');
      return true;
    } catch (error) {
      console.error('❌ Error unlinking student:', error);
      throw error;
    }
  }

  /**
   * Add a new parent
   */
  async addParent(parentData) {
    try {
      console.log('➕ Adding parent:', parentData);

      const { data, error } = await this.supabase
        .from('parents')
        .insert([{
          user_id: parentData.user_id,
          email: parentData.email,
          full_name: parentData.full_name,
          phone: parentData.phone || null
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Parent added successfully');
      return data;
    } catch (error) {
      console.error('❌ Error adding parent:', error);
      throw error;
    }
  }

  /**
   * Update parent
   */
  async updateParent(parentId, parentData) {
    try {
      const { data, error } = await this.supabase
        .from('parents')
        .update({
          email: parentData.email,
          full_name: parentData.full_name,
          phone: parentData.phone || null
        })
        .eq('id', parentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Error updating parent:', error);
      throw error;
    }
  }

  /**
   * Delete parent
   */
  async deleteParent(parentId) {
    try {
      // First, remove all student links
      await this.supabase
        .from('student_parents')
        .delete()
        .eq('parent_id', parentId);

      // Then delete parent
      const { error } = await this.supabase
        .from('parents')
        .delete()
        .eq('id', parentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting parent:', error);
      throw error;
    }
  }
}