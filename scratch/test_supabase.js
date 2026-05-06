const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseClient() {
  try {
    console.log('Testing Supabase REST API...');
    const { data, error } = await supabase
      .from('Client')
      .insert([{ 
        name: 'Supabase Test Client', 
        industry: 'Testing',
        tenantId: 'dev_tenant',
        platforms: ['Meta']
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log('Client created via Supabase:', data);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSupabaseClient();
