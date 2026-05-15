import { supabase } from './src/supabase';

async function test() {
  const { data, error } = await supabase.from('users').upsert({
    uid: 'test-google-uid-1',
    email: 'googletest1@example.com',
    display_name: 'Google Test User',
    role: 'student',
    points: 0,
    completed_quizzes: 0,
  }, { onConflict: 'uid' }).select();
  console.log('Upsert with select:', data, error);
}
test();
