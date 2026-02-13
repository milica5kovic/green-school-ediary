import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Debug logging
console.log('🔍 Environment Check:');
console.log('  SUPABASE_URL:', supabaseUrl);
console.log('  ANON_KEY (first 20):', supabaseAnonKey?.substring(0, 20));
console.log('  SERVICE_KEY (first 20):', supabaseServiceKey?.substring(0, 20) || '❌ NOT FOUND');
console.log('  SERVICE_KEY exists?', !!supabaseServiceKey);

// ✅ ONLY ONE CLIENT
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Admin function using direct API call
export const createUserWithAdmin = async (email, password, metadata) => {
  console.log('🔐 createUserWithAdmin called');
  console.log('  Email:', email);
  console.log('  Service Key available?', !!supabaseServiceKey);
  console.log('  Service Key (first 20):', supabaseServiceKey?.substring(0, 20) || 'MISSING');
  
  if (!supabaseServiceKey) {
    console.error('❌ Service role key is NOT configured!');
    throw new Error('Service role key not configured');
  }

  console.log('🔐 Making admin API call...');
  console.log('  URL:', `${supabaseUrl}/auth/v1/admin/users`);
  
  try {
    const requestBody = {
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    };
    
    console.log('📤 Request body:', requestBody);
    
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
       body: JSON.stringify({
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: metadata  // ← This should contain { role: 'parent', full_name: '...' }
  })
    });

    console.log('📥 Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Response text:', responseText);
    
    if (!response.ok) {
      let error;
      try {
        error = JSON.parse(responseText);
      } catch {
        error = { message: responseText };
      }
      console.error('❌ API Error:', error);
      throw new Error(error.msg || error.message || 'Failed to create user');
    }

    const data = JSON.parse(responseText);
    console.log('✅ User created via API:', data.id);
    return data;
  } catch (error) {
    console.error('❌ createUserWithAdmin error:', error);
    throw error;
  }
  
};

// ✅ Helper to check if admin operations are available
export const hasAdminAccess = () => {
  const hasAccess = !!supabaseServiceKey;
  console.log('🔍 hasAdminAccess() called, returning:', hasAccess);
  return hasAccess;
};

console.log('🔐 Supabase initialized (single client)');
console.log('  URL:', supabaseUrl ? '✅' : '❌');
console.log('  Anon Key:', supabaseAnonKey ? '✅' : '❌');
console.log('  Service Key:', supabaseServiceKey ? '✅ (Admin API available)' : '❌ NOT CONFIGURED');