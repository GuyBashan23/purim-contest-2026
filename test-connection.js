// Quick test script to verify Supabase connection
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local file
let envContent = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envContent[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.error('❌ Could not read .env.local file');
  process.exit(1);
}

const supabaseUrl = envContent.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envContent.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = envContent.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!');
  console.log('Make sure .env.local exists with:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Test 1: Check contest_state table
    const { data: state, error: stateError } = await supabase
      .from('contest_state')
      .select('*')
      .single();
    
    if (stateError) {
      console.error('❌ Error reading contest_state:', stateError.message);
      return false;
    }
    
    console.log('✅ contest_state table exists:', state);
    
    // Test 2: Check entries table
    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('count');
    
    if (entriesError) {
      console.error('❌ Error reading entries:', entriesError.message);
      return false;
    }
    
    console.log('✅ entries table exists');
    
    // Test 3: Check storage bucket (try with admin key if available)
    const clientToUse = supabaseAdmin || supabase;
    const { data: buckets, error: bucketsError } = await clientToUse.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error reading buckets:', bucketsError.message);
      console.log('Trying with service role key...');
      
      if (supabaseAdmin) {
        const { data: adminBuckets, error: adminError } = await supabaseAdmin.storage.listBuckets();
        if (!adminError && adminBuckets) {
          const costumesBucket = adminBuckets.find(b => b.name === 'costumes');
          if (costumesBucket) {
            console.log('✅ costumes bucket exists (found with admin key):', costumesBucket);
            console.log('⚠️  Note: Bucket might not be public. Make sure it\'s set to public in Supabase dashboard.');
            return true;
          }
        }
      }
      return false;
    }
    
    const costumesBucket = buckets.find(b => b.name === 'costumes');
    if (!costumesBucket) {
      console.error('❌ costumes bucket not found!');
      console.log('Available buckets:', buckets.map(b => b.name));
      console.log('\n💡 Make sure:');
      console.log('   1. Bucket name is exactly "costumes" (lowercase)');
      console.log('   2. Bucket is set to PUBLIC in Supabase Dashboard');
      console.log('   3. You have the correct project selected');
      return false;
    }
    
    console.log('✅ costumes bucket exists:', costumesBucket);
    if (!costumesBucket.public) {
      console.log('⚠️  WARNING: Bucket is not public! Set it to public in Supabase Dashboard → Storage → costumes → Settings');
    }
    
    console.log('\n🎉 All tests passed! Connection is working!');
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
