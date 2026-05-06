import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Testing connection to Supabase REST API...');
  console.log('URL:', supabaseUrl);
  
  const { data, error } = await supabase.from('Client').select('*').limit(1);
  
  if (error) {
    console.error('Connection failed:', error.message);
    if (error.message.includes('relation "public.Client" does not exist')) {
      console.log('✅ Connection successful, but table "Client" does not exist yet.');
    }
  } else {
    console.log('✅ Connection successful!');
    console.log('Data:', data);
  }
}

main();
