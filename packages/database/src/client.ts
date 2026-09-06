import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

export interface CreateClientOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
}

/**
 * 建立具備完整型別支援的 Supabase Client
 */
export function getSupabaseClient(options?: CreateClientOptions): SupabaseClient<Database> {
  const url =
    options?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

  const key =
    options?.supabaseKey ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined.'
    );
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  });
}
