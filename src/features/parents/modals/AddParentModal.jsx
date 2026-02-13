import React, { useState, useEffect } from 'react';
import { supabase, createUserWithAdmin, hasAdminAccess } from '../../../core/infrastructure/supabaseClient';


const AddParentModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    student_id: ''
  });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('status', 'active')
      .order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      alert('Please fill in name and email');
      return;
    }

    try {
      setSaving(true);

      if (!hasAdminAccess()) {
        alert('⚠️ Admin features not configured.');
        return;
      }

      console.log('🔐 Creating parent account...');
      const tempPassword = `Green${Math.floor(1000 + Math.random() * 9000)}!`;
      
      // Step 1: Create auth user (trigger will auto-create profile!)
      const authData = await createUserWithAdmin(
        formData.email,
        tempPassword,
        {
          full_name: formData.full_name,
          role: 'parent'
        }
      );

      if (!authData?.id) throw new Error('Failed to create user');
      console.log('✅ Auth user created:', authData.id);

      // Wait for trigger to complete
      console.log('⏳ Waiting for database trigger...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create parent record
      console.log('🔐 Creating parent record...');
      const { data: parentData, error: parentInsertError } = await supabase
        .from('parents')
        .insert([{
          user_id: authData.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          status: 'active'
        }])
        .select()
        .single();

      if (parentInsertError) throw new Error(`Parent insert error: ${parentInsertError.message}`);
      console.log('✅ Parent record created:', parentData.id);

      // Step 3: Link to student (if selected)
      if (formData.student_id) {
        console.log('🔐 Linking to student:', formData.student_id);
        
        const { error: linkError } = await supabase
          .from('student_parents')
          .insert([{
            student_id: formData.student_id,
            parent_id: parentData.id,
            relationship: 'parent',
            is_primary: true
          }]);

        if (linkError) {
          console.error('❌ Link error:', linkError);
          alert(`⚠️ Failed to link student: ${linkError.message}`);
        } else {
          console.log('✅ Student linked successfully!');
        }
      }

      // Step 4: Show credentials
      const credentials = 
        `✅ PARENT ACCOUNT CREATED!\n\n` +
        `👤 Name: ${formData.full_name}\n` +
        `📧 Email: ${formData.email}\n` +
        `🔒 Password: ${tempPassword}\n\n` +
        `⚠️ Share these credentials securely!`;

      try {
        await navigator.clipboard.writeText(
          `Name: ${formData.full_name}\nEmail: ${formData.email}\nPassword: ${tempPassword}\nLogin: ${window.location.origin}`
        );
        alert(credentials + '\n\n📋 Copied to clipboard!');
      } catch {
        alert(credentials);
      }

      onSave();
    } catch (error) {
      console.error('❌ Error creating parent:', error);
      
      let errorMessage = 'Failed to create parent';
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = '⚠️ EMAIL ALREADY IN USE\n\nPlease use a different email.';
      } else if (error.message) {
        errorMessage = `⚠️ ERROR\n\n${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Add New Parent</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Jane Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="jane.smith@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone (Optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="+381 60 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Link to Student (Optional)</label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">-- Select Student --</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.class_name})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Parent will be able to view this student's data
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> A temporary password will be generated. Share it securely with the parent.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
            >
              {saving ? 'Creating...' : 'Create Parent Account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-gray-200 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddParentModal;