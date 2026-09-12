const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = `http://localhost:${process.env.TEST_PORT || 3102}`;
const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function login() {
  const response = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
  const body = await response.json();
  return body.accessToken;
}

async function upload(token, contents, type, name) {
  const form = new FormData();
  form.append('file', new Blob([contents], { type }), name);
  const response = await fetch(`${baseUrl}/admin/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return { status: response.status, body: await response.json() };
}

(async () => {
  const token = await login();
  const valid = await upload(token, pngBytes, 'image/png', 'pixel.png');
  const expectedPrefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET}/`;
  if (valid.status !== 201 || !valid.body.url || !valid.body.url.startsWith(expectedPrefix) || valid.body.provider !== 'supabase-storage') throw new Error(`valid:${valid.status}`);
  const invalid = await upload(token, Buffer.from('not an image'), 'text/plain', 'notes.txt');
  if (invalid.status !== 400 || invalid.body.error.code !== 'INVALID_FILE') throw new Error(`invalid:${invalid.status}`);
  console.log(JSON.stringify({ valid: valid.status, provider: valid.body.provider, publicUrl: valid.body.url.startsWith(expectedPrefix), invalid: invalid.status, invalidCode: invalid.body.error.code }));
})().catch((error) => {
  console.error('Falha no teste de upload:', error.message);
  process.exit(1);
});
