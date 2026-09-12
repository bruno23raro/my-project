const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bucket = process.env.SUPABASE_STORAGE_BUCKET;
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const existing = await client.storage.listBuckets();
  if (existing.error) throw existing.error;
  const current = existing.data.find((item) => item.name === bucket);
  if (current) {
    console.log(JSON.stringify({ bucket: current.name, public: current.public, exists: true }));
    return;
  }
  const created = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '2MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
  });
  if (created.error) throw created.error;
  console.log(JSON.stringify({ bucket, public: true, exists: true, created: true }));
})().catch((error) => {
  console.error('Falha ao preparar bucket:', error.message);
  process.exit(1);
});
