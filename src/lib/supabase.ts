import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase env vars are missing. Please ensure your .env.local is configured.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
