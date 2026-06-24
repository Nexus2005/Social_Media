const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: missing Supabase URL or service role key.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  try {
    const fileKey = `test-uploads/test_put_${Date.now()}.txt`;
    console.log('Generating signed upload URL for path:', fileKey);
    
    const { data, error } = await supabaseAdmin.storage
      .from('social-media')
      .createSignedUploadUrl(fileKey);
      
    if (error) {
      console.error('Error from createSignedUploadUrl:', error);
      return;
    }
    
    const { signedUrl, token } = data;
    console.log('Signed URL generated successfully.');

    // Let's try uploading to this URL.
    // Supabase signed upload URLs accept PUT requests with raw binary/text body.
    // Also, we can set header: 'Authorization: Bearer <token>' or just pass token in query (it's already in the signedUrl).
    // Let's check headers needed. According to Supabase docs, the signedUrl has a token query parameter,
    // but we can also use headers:
    // x-upsert: true/false
    // Content-Type: file type
    console.log('Attempting PUT request...');
    const fileContent = 'Hello World from test signed upload!';
    
    // We can use standard fetch. Since we are in Node 18+, global fetch is available.
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: fileContent
    });

    console.log('Upload status:', uploadResponse.status);
    const responseText = await uploadResponse.text();
    console.log('Upload response body:', responseText);

    if (uploadResponse.ok) {
      console.log('Upload succeeded!');
      // Let's verify file exists by trying to download it
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${fileKey}`;
      console.log('Checking public url:', publicUrl);
      const checkRes = await fetch(publicUrl);
      console.log('Public URL status:', checkRes.status);
      const text = await checkRes.text();
      console.log('Downloaded content matches:', text === fileContent ? 'YES' : 'NO');
    } else {
      console.log('Upload failed.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

main();
