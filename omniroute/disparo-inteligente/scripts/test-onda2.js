const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const baseUrl = `http://localhost:${process.env.TEST_PORT || 3104}`;
const email = `onda2-${Date.now()}@example.com`;
let token;

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}${route}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  return { status: response.status, body: await response.json().catch(() => null) };
}
function expect(result, status, label) { if (result.status !== status) throw new Error(`${label}:${result.status}`); }
(async () => {
  const register = await fetch(`${baseUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Onda 2', email, password: 'TesteOnda2!123' }) });
  const registerBody = await register.json();
  expect({ status: register.status }, 201, 'register');
  token = registerBody.accessToken;
  const contact = await request('/contacts', { method: 'POST', body: JSON.stringify({ name: 'Contato Inbox', phone: `5511${Date.now().toString().slice(-9)}` }) });
  expect(contact, 201, 'contact');
  const conversation = await request('/conversations', { method: 'POST', body: JSON.stringify({ contactId: contact.body.id, channel: 'whatsapp', body: 'Olá, preciso de ajuda' }) });
  expect(conversation, 201, 'conversation');
  const inbox = await request('/conversations');
  expect(inbox, 200, 'inbox');
  const detail = await request(`/conversations/${conversation.body.conversation.id}`);
  expect(detail, 200, 'detail');
  const reply = await request(`/conversations/${conversation.body.conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ body: 'Olá! Como posso ajudar?' }) });
  expect(reply, 201, 'reply');
  const resolved = await request(`/conversations/${conversation.body.conversation.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'resolved' }) });
  expect(resolved, 200, 'resolve');
  const template = await request('/templates', { method: 'POST', body: JSON.stringify({ name: 'Boas-vindas', body: 'Olá {{nome}}, tudo bem?', channel: 'whatsapp' }) });
  expect(template, 201, 'template-create');
  const templates = await request('/templates');
  expect(templates, 200, 'templates');
  const schedule = await request('/schedule', { method: 'POST', body: JSON.stringify({ templateId: template.body.id, contactId: contact.body.id, kind: 'follow_up', scheduledFor: new Date(Date.now() + 86400000).toISOString(), payload: { name: 'Teste' } }) });
  expect(schedule, 201, 'schedule-create');
  const agenda = await request('/schedule');
  expect(agenda, 200, 'agenda');
  console.log(JSON.stringify({ inbox: inbox.body.length, messages: detail.body.messages.length, reply: reply.status, resolved: resolved.body.status, templates: templates.body.length, agenda: agenda.body.length }));
})().catch((error) => { console.error('Falha no teste Onda 2:', error.message); process.exit(1); });
