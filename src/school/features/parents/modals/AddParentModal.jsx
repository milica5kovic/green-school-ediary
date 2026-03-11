import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../core/infrastructure/supabaseClient';
import { createUser, checkAdminAccess, generateTempPassword } from '../../../../core/infrastructure/adminApi';
import { useTenant } from '../../../../core/context/TenantContext';
import { useApp } from '../../../../core/context/AppContext';

// ════════════════════════════════════════════════════════════════════════════
// ADD PARENT MODAL
// FIX: Now includes school_id in student_parents insert
// ════════════════════════════════════════════════════════════════════════════

const AddParentModal = ({ onClose, onSave }) => {
  const { schoolId } = useTenant();
  const { supabase: tenantSupabase } = useApp();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    student_id: ''
  });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [adminStatus, setAdminStatus] = useState({ checking: true, hasAccess: false });

  useEffect(() => {
    loadStudents();
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const status = await checkAdminAccess();
    setAdminStatus({ checking: false, ...status });
  };

  const loadStudents = async () => {
    const { data } = await tenantSupabase
      .from('students')
      .select('*')
      .eq('status', 'active')
      .order('class_name')
      .order('name');
    setStudents(data || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.email) {
      alert('Please fill in name and email');
      return;
    }

    if (!adminStatus.hasAccess) {
      alert(`⚠️ Admin access required.\n\nReason: ${adminStatus.reason}`);
      return;
    }

    if (!schoolId) {
      alert('⚠️ School context not loaded. Please refresh the page.');
      return;
    }

    try {
      setSaving(true);

      console.log('🔐 Creating parent account...');
      console.log('🏫 School ID:', schoolId);
      
      const tempPassword = generateTempPassword('Green');
      
      // Step 1: Create auth user via Edge Function
      const authUser = await createUser(
        formData.email,
        tempPassword,
        {
          full_name: formData.full_name,
          role: 'parent'
        }
      );

      if (!authUser?.id) throw new Error('Failed to create user');
      console.log('✅ Auth user created:', authUser.id);

      // Wait for any database triggers
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Create parent record using RAW supabase (bypass RLS issues)
      console.log('📝 Creating parent record with school_id:', schoolId);
      
      const { data: parentData, error: parentInsertError } = await supabase
        .from('parents')
        .insert({
          user_id: authUser.id,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          status: 'active',
          school_id: schoolId
        })
        .select()
        .single();

      if (parentInsertError) {
        console.error('❌ Parent insert error:', parentInsertError);
        showCredentials(formData.full_name, formData.email, tempPassword, true);
        throw new Error(`Parent insert error: ${parentInsertError.message}`);
      }
      
      console.log('✅ Parent record created:', parentData.id);

      // Step 3: Link to student (if selected) - ✅ NOW INCLUDES school_id
      if (formData.student_id && parentData?.id) {
        console.log('🔗 Linking to student:', formData.student_id);
        console.log('🏫 With school_id:', schoolId);
        
        const { error: linkError } = await supabase
          .from('student_parents')
          .insert({
            student_id: formData.student_id,
            parent_id: parentData.id,
            relationship: 'parent',
            is_primary: true,
            school_id: schoolId  // ✅ FIX: Added school_id!
          });

        if (linkError) {
          console.error('❌ Link error:', linkError);
          // Don't throw - parent was still created
          alert('⚠️ Parent created but failed to link student. You can link manually.');
        } else {
          console.log('✅ Student linked successfully!');
        }
      }

      // Step 4: Show credentials
      showCredentials(formData.full_name, formData.email, tempPassword, false);
      onSave();
      
    } catch (error) {
      console.error('❌ Error creating parent:', error);
      
      let errorMessage = 'Failed to create parent';
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        errorMessage = '⚠️ EMAIL ALREADY IN USE\n\nThis email is already registered. Please use a different email.';
      } else if (error.message.includes('permission') || error.message.includes('Insufficient')) {
        errorMessage = '⚠️ PERMISSION DENIED\n\nYou need admin or owner role to create users.';
      } else if (error.message) {
        errorMessage = `⚠️ ERROR\n\n${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const showCredentials = (name, email, password, hadError) => {
    const credentials = 
      `${hadError ? '⚠️' : '✅'} PARENT ACCOUNT CREATED!\n\n` +
      `👤 Name: ${name}\n` +
      `📧 Email: ${email}\n` +
      `🔒 Password: ${password}\n\n` +
      `${hadError ? '⚠️ Note: There was an issue saving to database. User can still login.\n' : ''}` +
      `⚠️ Share these credentials securely!`;

    try {
      navigator.clipboard.writeText(
        `Name: ${name}\nEmail: ${email}\nPassword: ${password}\nLogin: ${window.location.origin}`
      );
      alert(credentials + '\n\n📋 Copied to clipboard!');
    } catch (clipboardError) {
      console.warn('Clipboard access denied:', clipboardError);
      alert(credentials);
    }
  };

  // Group students by class for better UX
  const studentsByClass = students.reduce((acc, student) => {
    const className = student.class_name || 'No Class';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {});

  if (adminStatus.checking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold text-gray-800">Add New Parent</h3>
          <p className="text-sm text-gray-500 mt-1">Create account and optionally link to a student</p>
        </div>

        {!adminStatus.hasAccess && (
          <div className="mx-6 mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Limited Access:</strong> {adminStatus.reason}
              <br />
              <span className="text-xs">Contact an admin or owner to create parent accounts.</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
              placeholder="Jane Smith"
              required
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
              placeholder="jane.smith@email.com"
              required
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (Optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
              placeholder="+381 60 123 4567"
              disabled={!adminStatus.hasAccess}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Link to Student (Optional)</label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-shadow"
              disabled={!adminStatus.hasAccess}
            >
              <option value="">-- Select Student --</option>
              {Object.entries(studentsByClass).sort().map(([className, classStudents]) => (
                <optgroup key={className} label={className}>
                  {classStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              You can link more children later via "Manage Children"
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>📝 Note:</strong> A temporary password will be generated. 
              Share it securely with the parent - they can change it after first login.
            </p>
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex gap-3">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={saving || !adminStatus.hasAccess}
            className="flex-1 bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving ? 'Creating...' : 'Create Parent Account'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddParentModal;