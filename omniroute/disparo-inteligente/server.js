const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fsPromises = require('fs').promises;
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');
const { z } = require('zod');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const dataFile = path.join(rootDir, 'data.json');
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const supabaseJwksUrl = process.env.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
const accessTokenSecret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || '';
const refreshTokenDays = 7;
const databasePool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;
const uploadDir = path.join(rootDir, 'uploads');
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) return callback(new Error('INVALID_FILE'));
    return callback(null, true);
  }
});

app.use(cors({
  credentials: true,
  origin: (origin, callback) => callback(null, !origin || corsOrigins.includes(origin))
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }));
app.use(express.static(path.join(rootDir, 'public')));
app.use('/uploads', express.static(uploadDir));

function authError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())];
  }));
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan_name,
    status: user.status,
    createdAt: user.created_at
  };
}

function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, accessTokenSecret, { expiresIn: '15m' });
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('base64url');
  await databasePool.query(
    'insert into public.refresh_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + interval \'7 days\')',
    [userId, hashRefreshToken(token)]
  );
  return token;
}

function setRefreshCookie(res, token) {
  res.setHeader('Set-Cookie', `refreshToken=${encodeURIComponent(token)}; Max-Age=${refreshTokenDays * 86400}; Path=/; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function clearRefreshCookie(res) {
  res.setHeader('Set-Cookie', 'refreshToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
}

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || !accessTokenSecret) return authError(res, 401, 'AUTH_REQUIRED', 'Autenticação necessária.');
  try {
    req.auth = jwt.verify(token, accessTokenSecret);
    return next();
  } catch {
    return authError(res, 401, 'INVALID_TOKEN', 'Token inválido ou expirado.');
  }
}

function requireRole(role) {
  return (req, res, next) => req.auth?.role === role
    ? next()
    : authError(res, 403, 'FORBIDDEN', 'Você não tem permissão para acessar este recurso.');
}

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

const hasSupabaseConfig = Boolean(supabaseUrl || supabaseAnonKey || supabaseServiceKey);

const seedData = {
  site: {
    name: 'Disparo Inteligente',
    primaryColor: '#7c3aed',
    secondaryColor: '#0ea5e9',
    accentColor: '#10b981',
    logoText: 'DISPARO INTELIGENTE',
    heroTitle: 'Automatize vendas e atendimento em WhatsApp e Instagram.',
    heroSubtitle: 'Crie campanhas em massa, ative chatbots e conecte sua operação à sua rotina comercial.',
    ctaPrimary: 'Testar grátis',
    ctaSecondary: 'Ver demonstração',
    sections: ['beneficios', 'planos', 'depoimentos', 'faq'],
    isPublic: true
  },
  plans: [
    { id: 'free', name: 'Free', price: 0, limits: { maxCampaigns: 3, maxContacts: 200, whatsappConnections: 1, instagramConnections: 0, aiBots: 1 }, featured: false },
    { id: 'pro', name: 'Pro', price: 59, limits: { maxCampaigns: 50, maxContacts: 15000, whatsappConnections: 3, instagramConnections: 1, aiBots: 5 }, featured: true },
    { id: 'unlimited', name: 'Ilimitado', price: 149, limits: { maxCampaigns: 9999, maxContacts: 999999, whatsappConnections: 20, instagramConnections: 10, aiBots: 999 }, featured: false }
  ],
  users: [],
  campaigns: [],
  settings: {
    whatsappApi: '',
    instagramApi: '',
    hotmartApi: '',
    kiwifyApi: '',
    smtpHost: '',
    smtpUser: '',
    smtpPassword: '',
    paymentProvider: ''
  },
  integrations: [
    { id: 'whatsapp', name: 'WhatsApp', enabled: false, key: '' },
    { id: 'instagram', name: 'Instagram', enabled: false, key: '' },
    { id: 'hotmart', name: 'Hotmart', enabled: false, key: '' },
    { id: 'kiwify', name: 'Kiwify', enabled: false, key: '' }
  ]
};

function readData() {
  try {
    if (!fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, JSON.stringify(seedData, null, 2));
      return JSON.parse(JSON.stringify(seedData));
    }
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return JSON.parse(JSON.stringify(seedData));
  }
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

const appData = readData();

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'disparo-inteligente',
    mode: supabase ? 'supabase' : 'local',
    config: {
      supabaseUrl: Boolean(supabaseUrl),
      anonKey: Boolean(supabaseAnonKey),
      serviceKey: Boolean(supabaseServiceKey),
      hasSupabaseConfig,
      jwksUrl: Boolean(supabaseJwksUrl)
    }
  });
});

app.get('/api/site', (req, res) => {
  const data = readData();
  res.json(data.site);
});

app.get('/api/plans', (req, res) => {
  const data = readData();
  res.json(data.plans);
});

app.get('/api/integrations', (req, res) => {
  const data = readData();
  res.json(data.integrations);
});

app.get('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  const result = await databasePool.query('select id, name, email, role, plan_name, status, created_at from public.users order by created_at desc');
  res.json(result.rows.map(publicUser));
});

app.get('/api/dashboard/summary', (req, res) => {
  const data = readData();
  res.json({
    campaigns: data.campaigns.length,
    sent: data.campaigns.reduce((sum, item) => sum + Number(item.sent || 0), 0),
    delivered: data.campaigns.reduce((sum, item) => sum + Number(item.delivered || 0), 0),
    conversions: data.campaigns.reduce((sum, item) => sum + Number(item.conversions || 0), 0),
    users: data.users.length,
    activeConnections: data.integrations.filter((int) => int.enabled).length
  });
});

const authInput = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
});

async function register(req, res) {
  if (!databasePool || !accessTokenSecret) return authError(res, 503, 'AUTH_NOT_CONFIGURED', 'Autenticação não configurada.');
  const parsed = authInput.safeParse(req.body || {});
  if (!parsed.success || !parsed.data.name) return authError(res, 400, 'INVALID_INPUT', 'Nome, e-mail e senha válidos são obrigatórios.');
  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await databasePool.query(`
      insert into public.users (name, email, password_hash, role, plan_id, plan_name)
      select $1, lower($2), $3, 'user', id, slug from public.plans where slug = 'free'
      returning id, name, email, role, plan_name, status, created_at
    `, [name, email, passwordHash]);
    const user = result.rows[0];
    if (!user) return authError(res, 500, 'DEFAULT_PLAN_MISSING', 'Plano Free não está configurado.');
    const refreshToken = await createRefreshToken(user.id);
    setRefreshCookie(res, refreshToken);
    return res.status(201).json({ accessToken: issueAccessToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === '23505') return authError(res, 409, 'EMAIL_EXISTS', 'Este e-mail já está cadastrado.');
    return authError(res, 500, 'REGISTER_FAILED', 'Não foi possível criar o usuário.');
  }
}

async function login(req, res) {
  if (!databasePool || !accessTokenSecret) return authError(res, 503, 'AUTH_NOT_CONFIGURED', 'Autenticação não configurada.');
  const parsed = authInput.omit({ name: true }).safeParse(req.body || {});
  if (!parsed.success) return authError(res, 400, 'INVALID_INPUT', 'E-mail e senha válidos são obrigatórios.');
  const result = await databasePool.query('select * from public.users where email = lower($1) limit 1', [parsed.data.email]);
  const user = result.rows[0];
  if (!user || user.status !== 'active' || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return authError(res, 401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  }
  const refreshToken = await createRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);
  return res.json({ accessToken: issueAccessToken(user), user: publicUser(user) });
}

async function refresh(req, res) {
  if (!databasePool || !accessTokenSecret) return authError(res, 503, 'AUTH_NOT_CONFIGURED', 'Autenticação não configurada.');
  const token = parseCookies(req).refreshToken;
  if (!token) return authError(res, 401, 'REFRESH_REQUIRED', 'Refresh token ausente.');
  const result = await databasePool.query(`
    select u.* from public.refresh_tokens rt join public.users u on u.id = rt.user_id
    where rt.token_hash = $1 and rt.revoked_at is null and rt.expires_at > now() and u.status = 'active'
  `, [hashRefreshToken(token)]);
  const user = result.rows[0];
  if (!user) return authError(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token inválido ou expirado.');
  await databasePool.query('update public.refresh_tokens set revoked_at = now() where token_hash = $1', [hashRefreshToken(token)]);
  const nextToken = await createRefreshToken(user.id);
  setRefreshCookie(res, nextToken);
  return res.json({ accessToken: issueAccessToken(user), user: publicUser(user) });
}

async function logout(req, res) {
  const token = parseCookies(req).refreshToken;
  if (token && databasePool) await databasePool.query('update public.refresh_tokens set revoked_at = now() where token_hash = $1', [hashRefreshToken(token)]);
  clearRefreshCookie(res);
  return res.json({ success: true });
}

app.post(['/auth/register', '/api/auth/signup'], register);
app.post(['/auth/login', '/api/auth/login'], login);
app.post(['/auth/refresh', '/api/auth/refresh'], refresh);
app.post(['/auth/logout', '/api/auth/logout'], logout);

app.get('/auth/me', requireAuth, async (req, res) => {
  const result = await databasePool.query('select * from public.users where id = $1 limit 1', [req.auth.sub]);
  if (!result.rows[0]) return authError(res, 404, 'USER_NOT_FOUND', 'Usuário não encontrado.');
  return res.json({ user: publicUser(result.rows[0]) });
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const idParam = z.string().uuid();
const campaignInput = z.object({
  name: z.string().trim().min(2).max(160),
  message: z.string().trim().min(1).max(10000),
  scheduledFor: z.string().datetime().optional().nullable()
});
const contactInput = z.object({
  name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().min(5).max(40),
  tags: z.array(z.string().trim().max(60)).max(50).optional(),
  source: z.string().trim().max(80).optional().nullable()
});
const integrationInput = z.object({
  provider: z.string().trim().min(2).max(80),
  apiKey: z.string().max(1000).optional().nullable(),
  secretKey: z.string().max(1000).optional().nullable(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
});
const planInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  price: z.coerce.number().min(0).max(1000000),
  featured: z.boolean().optional(),
  limits: z.record(z.number().int().nonnegative()).default({})
});

function validated(schema, value, res) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    authError(res, 400, 'INVALID_INPUT', parsed.error.issues.map((issue) => issue.message).join(' '));
    return null;
  }
  return parsed.data;
}

function safeIntegration(row) {
  const apiKey = row.api_key || '';
  const secretKey = row.secret_key || '';
  return {
    id: row.id,
    merchant: row.merchant,
    provider: row.provider,
    enabled: row.is_enabled,
    apiKeyConfigured: Boolean(apiKey),
    apiKeyLast4: apiKey ? apiKey.slice(-4) : null,
    secretKeyConfigured: Boolean(secretKey),
    secretKeyLast4: secretKey ? secretKey.slice(-4) : null,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseCsv(csv) {
  const lines = String(csv || '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const cells = (line) => line.match(/(?:^|,)\s*(?:"([^"]*)"|([^,]*))/g)
    .map((value) => value.replace(/^,\s*/, '').replace(/^"|"$/g, '').trim());
  const header = cells(lines[0]).map((value) => value.toLowerCase());
  const phoneIndex = header.findIndex((value) => ['phone', 'telefone', 'celular'].includes(value));
  const nameIndex = header.findIndex((value) => ['name', 'nome'].includes(value));
  const start = phoneIndex >= 0 ? 1 : 0;
  return lines.slice(start).map((line) => {
    const values = cells(line);
    return { name: nameIndex >= 0 ? values[nameIndex] || null : values[0] || null, phone: values[phoneIndex >= 0 ? phoneIndex : 1] || values[0] };
  }).filter((contact) => contact.phone);
}

async function listCampaigns(req, res) {
  const result = await databasePool.query('select * from public.campaigns where user_id = $1 order by created_at desc', [req.auth.sub]);
  return res.json(result.rows);
}

async function createCampaign(req, res) {
  const input = validated(campaignInput, req.body, res);
  if (!input) return;
  const result = await databasePool.query(`
    insert into public.campaigns (user_id, name, message, scheduled_for)
    values ($1, $2, $3, $4) returning *
  `, [req.auth.sub, input.name, input.message, input.scheduledFor || null]);
  return res.status(201).json(result.rows[0]);
}

async function updateCampaign(req, res) {
  const id = validated(idParam, req.params.id, res);
  const input = validated(campaignInput.partial(), req.body, res);
  if (!id || !input) return;
  const result = await databasePool.query(`
    update public.campaigns set name = coalesce($1, name), message = coalesce($2, message), scheduled_for = coalesce($3, scheduled_for), updated_at = now()
    where id = $4 and user_id = $5 returning *
  `, [input.name ?? null, input.message ?? null, input.scheduledFor, id, req.auth.sub]);
  if (!result.rows[0]) return authError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.');
  return res.json(result.rows[0]);
}

async function deleteCampaign(req, res) {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  const result = await databasePool.query('delete from public.campaigns where id = $1 and user_id = $2 returning id', [id, req.auth.sub]);
  if (!result.rows[0]) return authError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.');
  return res.status(204).send();
}

async function startCampaign(req, res) {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const campaign = await client.query('update public.campaigns set status = \'queued\', updated_at = now() where id = $1 and user_id = $2 returning *', [id, req.auth.sub]);
    if (!campaign.rows[0]) {
      await client.query('rollback');
      return authError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.');
    }
    const queued = await client.query(`
      insert into public.messages (campaign_id, contact_id, body, status)
      select $1, id, $2, 'queued' from public.contacts where user_id = $3
      on conflict do nothing returning id
    `, [id, campaign.rows[0].message, req.auth.sub]);
    await client.query('commit');
    return res.json({ campaign: campaign.rows[0], queuedCount: queued.rowCount });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

app.get('/campaigns', requireAuth, asyncRoute(listCampaigns));
app.post('/campaigns', requireAuth, asyncRoute(createCampaign));
app.patch('/campaigns/:id', requireAuth, asyncRoute(updateCampaign));
app.delete('/campaigns/:id', requireAuth, asyncRoute(deleteCampaign));
app.post('/campaigns/:id/start', requireAuth, asyncRoute(startCampaign));

app.get('/contacts', requireAuth, asyncRoute(async (req, res) => {
  const result = await databasePool.query('select * from public.contacts where user_id = $1 order by created_at desc', [req.auth.sub]);
  return res.json(result.rows);
}));
app.post('/contacts', requireAuth, asyncRoute(async (req, res) => {
  const input = validated(contactInput, req.body, res);
  if (!input) return;
  const result = await databasePool.query('insert into public.contacts (user_id, name, phone, tags, source) values ($1, $2, $3, $4, $5) returning *', [req.auth.sub, input.name || null, input.phone, JSON.stringify(input.tags || []), input.source || null]);
  return res.status(201).json(result.rows[0]);
}));
app.patch('/contacts/:id', requireAuth, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  const input = validated(contactInput.partial(), req.body, res);
  if (!id || !input) return;
  const result = await databasePool.query('update public.contacts set name = coalesce($1, name), phone = coalesce($2, phone), tags = coalesce($3, tags), source = coalesce($4, source), updated_at = now() where id = $5 and user_id = $6 returning *', [input.name, input.phone, input.tags ? JSON.stringify(input.tags) : null, input.source, id, req.auth.sub]);
  if (!result.rows[0]) return authError(res, 404, 'CONTACT_NOT_FOUND', 'Contato não encontrado.');
  return res.json(result.rows[0]);
}));
app.delete('/contacts/:id', requireAuth, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  const result = await databasePool.query('delete from public.contacts where id = $1 and user_id = $2 returning id', [id, req.auth.sub]);
  if (!result.rows[0]) return authError(res, 404, 'CONTACT_NOT_FOUND', 'Contato não encontrado.');
  return res.status(204).send();
}));
app.post('/contacts/import', requireAuth, asyncRoute(async (req, res) => {
  const csv = typeof req.body === 'string' ? req.body : req.body?.csv;
  const contacts = parseCsv(csv);
  if (!contacts.length) return authError(res, 400, 'INVALID_CSV', 'CSV vazio ou sem telefones válidos.');
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    for (const contact of contacts) await client.query('insert into public.contacts (user_id, name, phone, source) values ($1, $2, $3, \'csv\')', [req.auth.sub, contact.name, contact.phone]);
    await client.query('commit');
    return res.status(201).json({ importedCount: contacts.length });
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/integrations', requireAuth, asyncRoute(async (req, res) => {
  const result = await databasePool.query('select * from public.integrations where user_id = $1 order by merchant', [req.auth.sub]);
  return res.json(result.rows.map(safeIntegration));
}));
app.put('/integrations/:merchant', requireAuth, asyncRoute(async (req, res) => {
  const merchant = z.string().trim().min(2).max(80).safeParse(req.params.merchant);
  const input = validated(integrationInput, req.body, res);
  if (!merchant.success || !input) return merchant.success ? undefined : authError(res, 400, 'INVALID_INPUT', 'Integração inválida.');
  const result = await databasePool.query(`
    insert into public.integrations (user_id, merchant, provider, api_key, secret_key, is_enabled, metadata)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
  `, [req.auth.sub, merchant.data, input.provider, input.apiKey || null, input.secretKey || null, input.enabled ?? false, JSON.stringify(input.metadata || {})]);
  return res.json(safeIntegration(result.rows[0]));
}));

const admin = [requireAuth, requireRole('admin')];
app.post('/admin/upload', ...admin, (req, res, next) => {
  imageUpload.single('file')(req, res, async (error) => {
    if (error) {
      const code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_FILE';
      return authError(res, 400, code, error.code === 'LIMIT_FILE_SIZE' ? 'A imagem deve ter no máximo 2 MB.' : 'Envie uma imagem PNG, JPG ou WEBP.');
    }
    if (!req.file) return authError(res, 400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
    try {
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[req.file.mimetype];
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
      const bucket = process.env.SUPABASE_STORAGE_BUCKET;
      let publicUrl;
      if (supabase && bucket) {
        const result = await supabase.storage.from(bucket).upload(`admin/${filename}`, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (result.error) throw result.error;
        publicUrl = supabase.storage.from(bucket).getPublicUrl(`admin/${filename}`).data.publicUrl;
      } else {
        await fsPromises.mkdir(uploadDir, { recursive: true });
        await fsPromises.writeFile(path.join(uploadDir, filename), req.file.buffer);
        publicUrl = `/uploads/${filename}`;
      }
      return res.status(201).json({ url: publicUrl, filename, provider: supabase && bucket ? 'supabase-storage' : 'local' });
    } catch (uploadError) {
      return next(uploadError);
    }
  });
});
app.get('/admin/settings', ...admin, asyncRoute(async (req, res) => {
  const result = await databasePool.query('select * from public.site_settings order by created_at limit 1');
  return res.json(result.rows[0] || null);
}));
app.put('/admin/settings', ...admin, asyncRoute(async (req, res) => {
  const allowed = ['name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'font_family', 'hero_title', 'hero_subtitle', 'cta_primary', 'cta_secondary', 'enabled_sections'];
  const values = allowed.map((key) => req.body?.[key]);
  if (values.some((value) => value !== undefined && typeof value !== 'string' && !Array.isArray(value))) return authError(res, 400, 'INVALID_INPUT', 'Configuração de site inválida.');
  const result = await databasePool.query(`
    insert into public.site_settings (name, logo_url, favicon_url, primary_color, secondary_color, font_family, hero_title, hero_subtitle, cta_primary, cta_secondary, enabled_sections)
    values (coalesce($1, 'Disparo Inteligente'), $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11::jsonb, '[]'))
    returning *
  `, [...values.slice(0, 10), values[10] === undefined ? null : JSON.stringify(values[10])]);
  return res.json(result.rows[0]);
}));

app.get('/admin/landing-sections', ...admin, asyncRoute(async (req, res) => {
  const result = await databasePool.query('select * from public.landing_sections order by order_index, created_at');
  return res.json(result.rows);
}));
app.post('/admin/landing-sections', ...admin, asyncRoute(async (req, res) => {
  const input = validated(z.object({ sectionKey: z.string().min(1).max(80), title: z.string().max(200).optional(), description: z.string().max(5000).optional(), imageUrl: z.string().url().optional().nullable(), orderIndex: z.number().int().nonnegative().optional(), enabled: z.boolean().optional() }), req.body, res);
  if (!input) return;
  const result = await databasePool.query('insert into public.landing_sections (section_key, title, description, image_url, order_index, enabled) values ($1, $2, $3, $4, $5, $6) returning *', [input.sectionKey, input.title, input.description, input.imageUrl, input.orderIndex || 0, input.enabled ?? true]);
  return res.status(201).json(result.rows[0]);
}));
app.patch('/admin/landing-sections/:id', ...admin, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  const input = validated(z.object({ title: z.string().max(200).optional(), description: z.string().max(5000).optional(), imageUrl: z.string().url().optional().nullable(), orderIndex: z.number().int().nonnegative().optional(), enabled: z.boolean().optional() }).partial(), req.body, res);
  if (!input) return;
  const result = await databasePool.query('update public.landing_sections set title = coalesce($1, title), description = coalesce($2, description), image_url = coalesce($3, image_url), order_index = coalesce($4, order_index), enabled = coalesce($5, enabled), updated_at = now() where id = $6 returning *', [input.title, input.description, input.imageUrl, input.orderIndex, input.enabled, id]);
  if (!result.rows[0]) return authError(res, 404, 'SECTION_NOT_FOUND', 'Seção não encontrada.');
  return res.json(result.rows[0]);
}));
app.delete('/admin/landing-sections/:id', ...admin, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  await databasePool.query('delete from public.landing_sections where id = $1', [id]);
  return res.status(204).send();
}));

app.get('/admin/users', ...admin, asyncRoute(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const result = await databasePool.query(`select id, name, email, role, plan_name, status, created_at from public.users where ($1 = '' or name ilike '%' || $1 || '%' or email ilike '%' || $1 || '%') and ($2 = '' or status = $2) order by created_at desc`, [search, status]);
  return res.json(result.rows.map(publicUser));
}));
app.patch('/admin/users/:id', ...admin, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  const input = validated(z.object({ plan: z.string().regex(/^[a-z0-9-]+$/).optional(), status: z.enum(['active', 'blocked', 'pending']).optional() }).refine((value) => value.plan || value.status), req.body, res);
  if (!id || !input) return;
  const result = await databasePool.query(`update public.users u set plan_id = coalesce((select p.id from public.plans p where p.slug = $3::text), u.plan_id), plan_name = coalesce((select p.slug from public.plans p where p.slug = $3::text), u.plan_name), status = coalesce($2, u.status), updated_at = now() where u.id = $1 and ($3::text is null or exists (select 1 from public.plans p where p.slug = $3::text)) returning u.id, u.name, u.email, u.role, u.plan_name, u.status, u.created_at`, [id, input.status || null, input.plan || null]);
  if (!result.rows[0]) return authError(res, 404, 'USER_NOT_FOUND', 'Usuário ou plano não encontrado.');
  return res.json(publicUser(result.rows[0]));
}));

app.get('/admin/plans', ...admin, asyncRoute(async (req, res) => {
  const result = await databasePool.query('select * from public.plans order by price');
  return res.json(result.rows);
}));
app.post('/admin/plans', ...admin, asyncRoute(async (req, res) => {
  const input = validated(planInput, req.body, res);
  if (!input) return;
  const result = await databasePool.query('insert into public.plans (name, slug, price, featured, limits) values ($1, $2, $3, $4, $5) returning *', [input.name, input.slug, input.price, input.featured ?? false, JSON.stringify(input.limits)]);
  return res.status(201).json(result.rows[0]);
}));
app.patch('/admin/plans/:id', ...admin, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  const input = validated(planInput.partial(), req.body, res);
  if (!id || !input) return;
  const result = await databasePool.query('update public.plans set name = coalesce($1, name), slug = coalesce($2, slug), price = coalesce($3, price), featured = coalesce($4, featured), limits = coalesce($5, limits), updated_at = now() where id = $6 returning *', [input.name, input.slug, input.price, input.featured, input.limits ? JSON.stringify(input.limits) : null, id]);
  if (!result.rows[0]) return authError(res, 404, 'PLAN_NOT_FOUND', 'Plano não encontrado.');
  return res.json(result.rows[0]);
}));
app.delete('/admin/plans/:id', ...admin, asyncRoute(async (req, res) => {
  const id = validated(idParam, req.params.id, res);
  if (!id) return;
  await databasePool.query('delete from public.plans where id = $1', [id]);
  return res.status(204).send();
}));

app.post('/api/site', (req, res) => {
  const data = readData();
  data.site = { ...data.site, ...req.body };
  writeData(data);
  res.json({ success: true, site: data.site });
});

app.post('/api/plans', (req, res) => {
  const data = readData();
  data.plans = req.body.plans || data.plans;
  writeData(data);
  res.json({ success: true, plans: data.plans });
});

app.post('/api/integrations', (req, res) => {
  const data = readData();
  data.integrations = req.body.integrations || data.integrations;
  data.settings = { ...data.settings, ...req.body.settings };
  writeData(data);
  res.json({ success: true, integrations: data.integrations, settings: data.settings });
});

app.get('/api/campaigns', (req, res) => {
  const data = readData();
  res.json(data.campaigns);
});

app.post('/api/campaigns', (req, res) => {
  const data = readData();
  const campaign = {
    id: `camp-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    sent: Math.floor(Math.random() * 700) + 80,
    delivered: Math.floor(Math.random() * 600) + 70,
    conversions: Math.floor(Math.random() * 80) + 10,
    status: 'ativo'
  };
  data.campaigns.unshift(campaign);
  writeData(data);
  res.status(201).json(campaign);
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('API error:', error.code || error.message);
  return res.status(error.status || 500).json({ error: { code: error.code || 'INTERNAL_ERROR', message: error.status ? error.message : 'Erro interno do servidor.' } });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Disparo Inteligente rodando em http://localhost:${PORT}`);
});
