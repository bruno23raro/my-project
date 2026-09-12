const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = `http://localhost:${process.env.TEST_PORT || 3103}`;

(async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  const cookie = response.headers.get('set-cookie') || '';
  const result = {
    status: response.status,
    secure: cookie.includes('Secure'),
    httpOnly: cookie.includes('HttpOnly'),
    pathRoot: cookie.includes('Path=/')
  };
  if (response.status !== 200 || !result.secure || !result.httpOnly || !result.pathRoot) throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
})().catch((error) => {
  console.error('Falha no teste de produção:', error.message);
  process.exit(1);
});
