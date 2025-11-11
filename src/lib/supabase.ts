import { createClient } from '@supabase/supabase-js';
import { createMockClient } from './mockSupabase';

const enableMockMode = import.meta.env.VITE_ENABLE_MOCK_MODE === 'true';

let supabase: any;

if (enableMockMode) {
  console.log('🎭 Running in MOCK MODE - no Supabase account needed');
  supabase = createMockClient();
} else {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Set VITE_ENABLE_MOCK_MODE=true for local development.');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
