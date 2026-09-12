const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = `http://localhost:${process.env.TEST_PORT || process.env.PORT || 3000}`;
const testEmail = `fase3-${Date.now()}@example.com`;
const testPassword = 'TesteFase3!123';
let accessToken;
let refreshCookie;

async function request(route, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (refreshCookie) headers.Cookie = refreshCookie;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) refreshCookie = setCookie.split(';')[0];
  return { status: response.status, body };
}

(async () => {
  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Teste Fase 3', email: testEmail, password: testPassword })
  });
  if (register.status !== 201) throw new Error(`register:${register.status}`);
  accessToken = register.body.accessToken;

  const me = await request('/auth/me');
  if (me.status !== 200) throw new Error(`me:${me.status}`);
  const userAdminRoute = await request('/api/admin/users');
  if (userAdminRoute.status !== 403) throw new Error(`userAdminRoute:${userAdminRoute.status}`);

  const refresh = await request('/auth/refresh', { method: 'POST' });
  if (refresh.status !== 200) throw new Error(`refresh:${refresh.status}`);
  accessToken = refresh.body.accessToken;

  const logout = await request('/auth/logout', { method: 'POST' });
  if (logout.status !== 200) throw new Error(`logout:${logout.status}`);

  const protectedWithoutToken = await fetch(`${baseUrl}/auth/me`);
  if (protectedWithoutToken.status !== 401) throw new Error(`protected:${protectedWithoutToken.status}`);

  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })
  });
  if (adminLogin.status !== 200 || adminLogin.body.user.role !== 'admin') throw new Error(`admin:${adminLogin.status}`);
  accessToken = adminLogin.body.accessToken;
  const adminRoute = await request('/api/admin/users');
  if (adminRoute.status !== 200) throw new Error(`adminRoute:${adminRoute.status}`);

  console.log(JSON.stringify({ register: register.status, me: me.status, userAdminRoute: userAdminRoute.status, refresh: refresh.status, logout: logout.status, protectedWithoutToken: protectedWithoutToken.status, adminLogin: adminLogin.status, adminRole: adminLogin.body.user.role, adminRoute: adminRoute.status }));
})().catch((error) => {
  console.error('Falha no teste de auth:', error.message);
  process.exit(1);
});
