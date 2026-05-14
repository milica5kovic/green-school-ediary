
export class ParentService {
  constructor(supabase) {
    if (!supabase) throw new Error('Supabase client is required for ParentService');
    this.supabase = supabase;
  }

  async getAllParents() {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .order('full_name', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async getParentById(parentId) {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .eq('id', parentId)
      .single();
    if (error) throw error;
    return data;
  }

  async getParentByUserId(userId) {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) return null;
    return data;
  }

  async getLinkedStudents(parentId) {
    const { data, error } = await this.supabase
      .from('student_parents')
      .select('*, students(*)')
      .eq('parent_id', parentId);
    if (error) throw error;
    return data || [];
  }

  async linkStudent(parentId, studentId, relationship = 'parent', isPrimary = false) {
    const { data, error } = await this.supabase
      .from('student_parents')
      .insert([{ parent_id: parentId, student_id: studentId, relationship, is_primary: isPrimary }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async unlinkStudent(linkId) {
    const { error } = await this.supabase
      .from('student_parents')
      .delete()
      .eq('id', linkId);
    if (error) throw error;
    return true;
  }

  async addParent(parentData) {
    const { data, error } = await this.supabase
      .from('parents')
      .insert([{
        user_id: parentData.user_id,
        email: parentData.email,
        full_name: parentData.full_name,
        phone: parentData.phone || null,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateParent(parentId, parentData) {
    const { data, error } = await this.supabase
      .from('parents')
      .update({ email: parentData.email, full_name: parentData.full_name, phone: parentData.phone || null })
      .eq('id', parentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteParent(parentId) {
    await this.supabase.from('student_parents').delete().eq('parent_id', parentId);
    const { error } = await this.supabase.from('parents').delete().eq('id', parentId);
    if (error) throw error;
    return true;
  }
}
