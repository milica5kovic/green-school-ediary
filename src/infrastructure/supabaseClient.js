import { createClient } from '@supabase/supabase-js';


let supabaseInstance = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    const url = process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error('Missing Supabase credentials');
    }
    
    supabaseInstance = createClient(url, key);
    console.log('✅ Supabase initialized');
  }
  return supabaseInstance;
};


export const supabase = getSupabase();