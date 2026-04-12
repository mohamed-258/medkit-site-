import { createClient } from '@supabase/supabase-js';

// Use the credentials provided by the user directly - Trimmed to avoid hidden characters
const supabaseUrl = 'https://crqjbrlssdxdvykrnmpz.supabase.co'.trim();
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycWpicmxzc2R4ZHZ5a3JubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzkyMzMsImV4cCI6MjA5MTUxNTIzM30.ICEdc_smMPxIplFYpO4SBRxOlFxxFYiAzux0ZsLAncc'.trim();

console.log('Initializing Supabase with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // We use Firebase for Auth
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

/**
 * Utility to test if Supabase is reachable using the client itself
 */
export const testSupabaseConnection = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, error: 'Supabase credentials missing' };
  }
  try {
    // Try a simple query to check connectivity
    const { error } = await supabase.from('users').select('uid').limit(1);
    
    if (error) {
      // If the error is 'Failed to fetch', it's a network issue
      if (error.message?.includes('Failed to fetch') || (error as any).code === 'PGRST116') {
         return { ok: false, error: error.message };
      }
      // If it's a table not found error, the connection is actually OK but schema is missing
      if (error.code === '42P01') {
        return { ok: true, warning: 'Connection OK, but users table not found. Please run the SQL script.' };
      }
      return { ok: false, error: error.message };
    }
    
    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
};
