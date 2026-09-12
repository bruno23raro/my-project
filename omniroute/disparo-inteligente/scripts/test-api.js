const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = `http://localhost:${process.env.TEST_PORT || 3101}`;
const adminCredentials = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const userEmail = `api-${Date.now()}@example.com`;
const userCredentials = { name: 'API Teste', email: userEmail, password: 'TesteAPI!123' };

async function request(route, token, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function assertStatus(result, expected, label) {
  if (result.status !== expected) throw new Error(`${label}:${result.status}`);
}

(async () => {
  const adminLogin = await request('/auth/login', null, { method: 'POST', body: JSON.stringify(adminCredentials) });
  assertStatus(adminLogin, 200, 'admin-login');
  const adminToken = adminLogin.body.accessToken;

  const userRegister = await request('/auth/register', null, { method: 'POST', body: JSON.stringify(userCredentials) });
  assertStatus(userRegister, 201, 'user-register');
  const userToken = userRegister.body.accessToken;

  const invalidCampaign = await request('/campaigns', userToken, { method: 'POST', body: JSON.stringify({ name: '' }) });
  assertStatus(invalidCampaign, 400, 'campaign-validation');
  if (!invalidCampaign.body?.error?.code) throw new Error('campaign-error-shape');

  const campaign = await request('/campaigns', userToken, { method: 'POST', body: JSON.stringify({ name: 'Campanha API', message: 'Mensagem de teste' }) });
  assertStatus(campaign, 201, 'campaign-create');
  const campaignId = campaign.body.id;

  const contact = await request('/contacts', userToken, { method: 'POST', body: JSON.stringify({ name: 'Contato API', phone: '5511999999999' }) });
  assertStatus(contact, 201, 'contact-create');
  const contactId = contact.body.id;

  const imported = await request('/contacts/import', userToken, { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: 'name,phone\nImportado,5511888888888\n' });
  assertStatus(imported, 201, 'contact-import');

  const queued = await request(`/campaigns/${campaignId}/start`, userToken, { method: 'POST' });
  assertStatus(queued, 200, 'campaign-start');

  const integration = await request('/integrations/whatsapp', userToken, { method: 'PUT', body: JSON.stringify({ provider: 'whatsapp-cloud', apiKey: 'super-secret-api-key-1234', secretKey: 'super-secret-value-5678', enabled: true }) });
  assertStatus(integration, 200, 'integration-save');
  if ('apiKey' in integration.body || 'secretKey' in integration.body || integration.body.apiKeyLast4 !== '1234') throw new Error('integration-secret-leak');
  const integrations = await request('/integrations', userToken);
  assertStatus(integrations, 200, 'integration-list');
  if (JSON.stringify(integrations.body).includes('super-secret')) throw new Error('integration-list-secret-leak');

  const settings = await request('/admin/settings', adminToken);
  assertStatus(settings, 200, 'settings-get');
  const updatedSettings = await request('/admin/settings', adminToken, { method: 'PUT', body: JSON.stringify({ name: 'Disparo Inteligente' }) });
  assertStatus(updatedSettings, 200, 'settings-put');

  const section = await request('/admin/landing-sections', adminToken, { method: 'POST', body: JSON.stringify({ sectionKey: `api-test-${Date.now()}`, title: 'Teste API' }) });
  assertStatus(section, 201, 'section-create');
  const sectionUpdated = await request(`/admin/landing-sections/${section.body.id}`, adminToken, { method: 'PATCH', body: JSON.stringify({ enabled: false }) });
  assertStatus(sectionUpdated, 200, 'section-update');
  const sectionDeleted = await request(`/admin/landing-sections/${section.body.id}`, adminToken, { method: 'DELETE' });
  assertStatus(sectionDeleted, 204, 'section-delete');

  const plans = await request('/admin/plans', adminToken);
  assertStatus(plans, 200, 'plans-list');
  const plan = await request('/admin/plans', adminToken, { method: 'POST', body: JSON.stringify({ name: 'API Test', slug: `api-test-${Date.now()}`, price: 1, limits: { maxCampaigns: 1 } }) });
  assertStatus(plan, 201, 'plan-create');
  const planUpdated = await request(`/admin/plans/${plan.body.id}`, adminToken, { method: 'PATCH', body: JSON.stringify({ price: 2 }) });
  assertStatus(planUpdated, 200, 'plan-update');
  const planDeleted = await request(`/admin/plans/${plan.body.id}`, adminToken, { method: 'DELETE' });
  assertStatus(planDeleted, 204, 'plan-delete');

  const users = await request('/admin/users?search=api-', adminToken);
  assertStatus(users, 200, 'users-list');
  const userId = userRegister.body.user.id;
  const userUpdated = await request(`/admin/users/${userId}`, adminToken, { method: 'PATCH', body: JSON.stringify({ status: 'blocked' }) });
  assertStatus(userUpdated, 200, 'user-update');

  await request(`/contacts/${contactId}`, userToken, { method: 'DELETE' });
  await request(`/campaigns/${campaignId}`, userToken, { method: 'DELETE' });
  console.log(JSON.stringify({ campaigns: 'ok', contacts: 'ok', csv: imported.body.importedCount, queue: queued.body.queuedCount, integrations: 'masked', settings: 'ok', landingSections: 'ok', users: 'ok', plans: 'ok', validation: invalidCampaign.body.error.code }));
})().catch((error) => {
  console.error('Falha no teste da API:', error.message);
  process.exit(1);
});
