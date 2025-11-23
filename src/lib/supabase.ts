import { createClient } from '@supabase/supabase-js';
import { createMockClient } from './mockSupabase';

const enableMockMode = import.meta.env.VITE_ENABLE_MOCK_MODE === 'true';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auto-enable mock mode if credentials are missing OR explicitly enabled
const useMockMode = enableMockMode || !supabaseUrl || !supabaseAnonKey;

if (useMockMode) {
  console.log('Running in MOCK MODE - no Supabase account needed');
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Using mock client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real Supabase.');
  }
  supabase = createMockClient();
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
