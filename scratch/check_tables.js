require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToCheck = [
  'User',
  'Tenant',
  'Client',
  'Campaign',
  'Dashboard',
  'MetaConnection',
  'MetaCampaign',
  'GoogleConnection',
  'GoogleCampaign',
  'FabricConnection',
  'AzureConnection'
];

async function checkTables() {
  console.log('Verifying Supabase Tables...');
  const results = [];
  
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        results.push({ table, status: 'Error', details: error.message });
      } else {
        results.push({ table, status: 'Exists', details: 'OK' });
      }
    } catch (e) {
      results.push({ table, status: 'Exception', details: e.message });
    }
  }

  console.table(results);
  
  // Identify missing
  const missing = results.filter(r => r.status !== 'Exists');
  if (missing.length > 0) {
    console.log('\n❌ Some tables are missing or inaccessible:');
    missing.forEach(m => console.log(` - ${m.table}: ${m.details}`));
  } else {
    console.log('\n✅ All required tables exist in Supabase!');
  }
}

checkTables();
