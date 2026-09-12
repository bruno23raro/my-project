const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const port = Number(process.env.PORT || 5500);
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(supabaseUrl && supabaseKey);
const dataFile = path.join(root, 'postagend-data.json');
const defaultData = { posts: [], accounts: [
  { id: 'instagram-marina', platform: 'Instagram', handle: '@marina.costa', status: 'connected' },
  { id: 'linkedin-marina', platform: 'LinkedIn', handle: 'Marina Costa', status: 'connected' },
  { id: 'youtube-marina', platform: 'YouTube', handle: '@marinacosta', status: 'connected' },
  { id: 'tiktok-marina', platform: 'TikTok', handle: '@marinacosta', status: 'connected' }
] };
function loadData() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch (error) { return defaultData; }
}
let data = loadData();
function saveData() { fs.writeFileSync(dataFile, JSON.stringify(data, null, 2)); }
async function supabaseRequest(table, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    ...options,
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}`);
  return response.status === 204 ? null : response.json();
}

const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  response.end(JSON.stringify(body));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 1e6) request.destroy(); });
    request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); } });
    request.on('error', reject);
  });
}
function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return sendJson(response, 404, { error: 'Arquivo não encontrado' });
  response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}
const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return response.end(); }
  if (request.url === '/api/health' && request.method === 'GET') return sendJson(response, 200, { ok: true, service: 'postagend-api', storage: useSupabase ? 'supabase' : 'json' });
  if (request.url === '/api/accounts' && request.method === 'GET') {
    if (useSupabase) { try { return sendJson(response, 200, await supabaseRequest('accounts', { method: 'GET' })); } catch (error) { return sendJson(response, 502, { error: 'Não foi possível consultar o Supabase' }); } }
    return sendJson(response, 200, data.accounts);
  }
  if (request.url === '/api/posts' && request.method === 'GET') {
    if (useSupabase) { try { return sendJson(response, 200, await supabaseRequest('posts?select=*&order=created_at.desc', { method: 'GET' })); } catch (error) { return sendJson(response, 502, { error: 'Não foi possível consultar o Supabase' }); } }
    return sendJson(response, 200, data.posts);
  }
  if (request.url === '/api/posts' && request.method === 'POST') {
    try {
      const body = await readBody(request);
      if (!body.caption || !body.date) return sendJson(response, 400, { error: 'caption e date são obrigatórios' });
      const post = { id: crypto.randomUUID(), ...body, status: 'scheduled', createdAt: new Date().toISOString() };
      if (useSupabase) {
        const [savedPost] = await supabaseRequest('posts', { method: 'POST', body: JSON.stringify({ id: post.id, caption: post.caption, date: post.date, platform: post.platform, status: post.status }) });
        return sendJson(response, 201, savedPost);
      }
      data.posts.unshift(post);
      saveData();
      return sendJson(response, 201, post);
    } catch (error) { return sendJson(response, 400, { error: 'JSON inválido' }); }
  }
  if (request.method === 'GET') return serveStatic(request, response);
  return sendJson(response, 404, { error: 'Rota não encontrada' });
});

server.listen(port, () => console.log(`Postagend em http://localhost:${port}`));