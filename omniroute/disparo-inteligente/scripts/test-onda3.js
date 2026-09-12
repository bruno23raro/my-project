const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const baseUrl = `http://localhost:${process.env.TEST_PORT || 3111}`;
let token;
async function request(route, options = {}) { const response = await fetch(`${baseUrl}${route}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } }); return { status: response.status, body: await response.json().catch(() => null) }; }
function expect(result, status, label) { if (result.status !== status) throw new Error(`${label}:${result.status}`); }
(async () => {
  const register = await fetch(`${baseUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Onda 3', email: `onda3-${Date.now()}@example.com`, password: 'TesteOnda3!123' }) });
  token = (await register.json()).accessToken; expect({ status: register.status }, 201, 'register');
  const automation = await request('/automations', { method: 'POST', body: JSON.stringify({ name: 'Responder preço', triggerType: 'keyword', triggerConfig: { keyword: 'preço' }, actionConfig: { message: 'Vou enviar os planos' } }) }); expect(automation, 201, 'automation');
  const agent = await request('/ai-agents', { method: 'POST', body: JSON.stringify({ name: 'Atendente IA', provider: 'openai', model: 'gpt-4o-mini', systemPrompt: 'Você atende com clareza e cordialidade.' }) }); expect(agent, 201, 'agent');
  const faq = await request(`/ai-agents/${agent.body.id}/faq`, { method: 'POST', body: JSON.stringify({ question: 'Qual o horário?', answer: 'Atendemos em horário comercial.' }) }); expect(faq, 201, 'faq');
  const followup = await request('/follow-ups', { method: 'POST', body: JSON.stringify({ name: 'Recuperação', stopOnReply: true, steps: [{ stepOrder: 0, delayDays: 1, body: 'Oi {{nome}}, posso ajudar?' }] }) }); expect(followup, 201, 'followup');
  const lists = await Promise.all([request('/automations'), request('/ai-agents'), request('/follow-ups')]); lists.forEach((result, index) => expect(result, 200, `list-${index}`));
  await request(`/automations/${automation.body.id}`, { method: 'DELETE' }); await request(`/ai-agents/${agent.body.id}`, { method: 'DELETE' }); await request(`/follow-ups/${followup.body.id}`, { method: 'DELETE' });
  console.log(JSON.stringify({ automation: 'ok', agent: 'ok', faq: 'ok', followup: 'ok', lists: 'ok' }));
})().catch((error) => { console.error('Falha no teste Onda 3:', error.message); process.exit(1); });
