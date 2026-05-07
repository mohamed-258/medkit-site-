import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crqjbrlssdxdvykrnmpz.supabase.co'.trim();
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNycWpicmxzc2R4ZHZ5a3JubXB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzkyMzMsImV4cCI6MjA5MTUxNTIzM30.ICEdc_smMPxIplFYpO4SBRxOlFxxFYiAzux0ZsLAncc'.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log("Buckets:", data);
  console.log("Error:", error);
}
run();
