const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  activeView: 'home'
};
const adminState = { section: 'identity' };

async function fetchJson(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const requestHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(url, {
    headers: requestHeaders,
    ...options
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (error) { data = {}; }
  if (!response.ok) throw new Error(data.error?.message || data.error || 'Erro inesperado');
  return data;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

async function uploadAdminImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetchJson('/admin/upload', { method: 'POST', body: formData });
  return response.url;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function render() {
  const currentPath = window.location.hash || '#home';
  const app = document.getElementById('app');

  if (currentPath === '#auth') {
    app.innerHTML = `
      <div class="auth-wrap">
        <div class="auth-box">
          <div class="kicker">Acesso ao painel</div>
          <h2>Entrar na sua conta</h2>
          <div class="form-grid">
            <div>
              <label class="label">E-mail</label>
              <input class="input" id="login-email" type="email" placeholder="voce@empresa.com" />
            </div>
            <div>
              <label class="label">Senha</label>
              <input class="input" id="login-password" type="password" placeholder="••••••••" />
            </div>
            <button class="btn primary" id="login-btn">Acessar painel</button>
            <button class="btn secondary" id="signup-btn">Criar conta</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('login-btn').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      try {
        const data = await fetchJson('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        state.user = data.user;
        state.token = data.accessToken || data.token;
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', state.token);
        window.location.hash = '#dashboard';
        render();
      } catch (error) {
        alert(error.message);
      }
    });
    document.getElementById('signup-btn').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const name = prompt('Qual é o seu nome?');
      if (!name) return;
      try {
        const data = await fetchJson('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
        state.user = data.user;
        state.token = data.accessToken || data.token;
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', state.token);
        window.location.hash = '#dashboard';
        render();
      } catch (error) {
        alert(error.message);
      }
    });
    return;
  }

  if (currentPath === '#dashboard' && !state.user) {
    window.location.hash = '#auth';
    render();
    return;
  }

  if (currentPath === '#dashboard' && state.user) {
    app.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="brand"><span>Disparo</span> Inteligente</div>
          <div class="nav-panel" style="margin-top: 28px;">
            <button class="nav-item active" data-panel="overview">Visão geral</button>
            <button class="nav-item" data-panel="campaigns">Campanhas</button>
                   <button class="nav-item" data-panel="inbox">Inbox</button>
                   <button class="nav-item" data-panel="templates">Templates</button>
                   <button class="nav-item" data-panel="schedule">Agenda</button>
                  <button class="nav-item" data-panel="automations">Automações</button>
                  <button class="nav-item" data-panel="agents">Agentes IA</button>
                  <button class="nav-item" data-panel="followups">Follow-up</button>
            <button class="nav-item" data-panel="chatbot">Chatbot</button>
            <button class="nav-item" data-panel="integrations">Integrações</button>
            <button class="nav-item" data-panel="admin">Admin</button>
          </div>
        </aside>
        <main class="content">
          <div id="dashboard-content"></div>
        </main>
      </div>
    `;

    const panel = document.querySelector('.nav-item.active')?.dataset.panel || 'overview';
    loadDashboardPanel(panel);
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');
        loadDashboardPanel(btn.dataset.panel);
      });
    });
    return;
  }

  app.innerHTML = `
    <header class="topbar">
      <div class="container nav">
        <div class="brand"><span>Disparo</span> Inteligente</div>
        <nav class="nav-links">
          <a href="#home">Início</a>
          <a href="#beneficios">Benefícios</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div class="nav-actions">
          <button class="btn secondary" onclick="location.hash='#auth'">Entrar</button>
          <button class="btn primary" onclick="location.hash='#auth'">Testar grátis</button>
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="container hero-inner">
        <div>
          <span class="kicker">Automação comercial</span>
          <h1>Vendas e atendimento em escala sem perder o toque humano.</h1>
          <p>Crie campanhas de WhatsApp, automatize respostas e conecte sua operação ao seu funil de vendas.</p>
          <div class="hero-actions">
            <button class="btn primary" onclick="location.hash='#auth'">Testar grátis</button>
            <button class="btn secondary" onclick="location.hash='#dashboard'">Ver dashboard</button>
          </div>
        </div>
        <div class="hero-card">
          <div class="metric-grid">
            <div class="metric"><span>Campanhas ativas</span><strong>128</strong></div>
            <div class="metric"><span>Mensagens enviadas</span><strong>1.8M</strong></div>
            <div class="metric"><span>Taxa de resposta</span><strong>68%</strong></div>
            <div class="metric"><span>Conversões</span><strong>3.4x</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="beneficios">
      <div class="container">
        <div class="section-head">
          <h2>Seu time cresce com automação</h2>
          <p>Ferramentas pensadas para quem vende, atende e escala.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="icon">✦</div>
            <h3>Disparo em massa</h3>
            <p>Envie campanhas segmentadas, agende mensagens e acompanhe performance em tempo real.</p>
          </div>
          <div class="card">
            <div class="icon">⚡</div>
            <h3>Chatbot inteligente</h3>
            <p>Crie fluxos de resposta, filtros e atendimento automático com regras simples.</p>
          </div>
          <div class="card">
            <div class="icon">🔗</div>
            <h3>Integrações prontas</h3>
            <p>Conecte WhatsApp, Instagram, Hotmart e Kiwify sem complicar seu processo.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="planos">
      <div class="container">
        <div class="section-head">
          <h2>Planos para cada estágio</h2>
          <p>Escolha o nível da sua operação e escale com segurança.</p>
        </div>
        <div class="grid-3" id="pricing-box"></div>
      </div>
    </section>

    <section class="section" id="faq">
      <div class="container">
        <div class="section-head">
          <h2>Perguntas frequentes</h2>
        </div>
        <div class="faq-item"><h4>Preciso de código para usar?</h4><p>Não. A plataforma foi pensada para operação simples, com onboarding guiado e painel intuitivo.</p></div>
        <div class="faq-item"><h4>Funciona com WhatsApp e Instagram?</h4><p>Sim. O produto foi estruturado para conectar contatos, campanhas e fluxos por canal.</p></div>
        <div class="faq-item"><h4>Posso trocar de plano depois?</h4><p>Sim. Os planos são flexíveis e você pode evoluir conforme o volume da operação.</p></div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <div class="brand" style="color:#fff;">Disparo <span>Inteligente</span></div>
      </div>
    </footer>
  `;

  loadPlans();
};

async function loadPlans() {
  try {
    const plans = await fetchJson('/api/plans');
    const box = document.getElementById('pricing-box');
    if (!box) return;
    box.innerHTML = plans.map((plan) => `
      <div class="card pricing-card ${plan.featured ? 'featured' : ''}">
        ${plan.featured ? '<span class="badge">Mais popular</span>' : ''}
        <h3>${plan.name}</h3>
        <div class="price">R$ ${plan.price}<small>/mês</small></div>
        <ul class="list">
          <li>${plan.limits.maxCampaigns} campanhas</li>
          <li>${plan.limits.maxContacts.toLocaleString()} contatos</li>
          <li>${plan.limits.whatsappConnections} conexões WhatsApp</li>
          <li>${plan.limits.aiBots} bots</li>
        </ul>
        <button class="btn primary" style="width:100%; margin-top:20px;" onclick="location.hash='#auth'">Escolher</button>
      </div>
    `).join('');
  } catch (error) {
    console.error(error);
  }
}

async function loadAdminPanel(content) {
  content.innerHTML = `
    <div class="section-head admin-heading"><div><span class="kicker">Controle da plataforma</span><h2>Painel admin</h2><p>Edite o produto, a operação e o conteúdo público.</p></div><span class="admin-role">${escapeHTML(state.user?.role || 'admin')}</span></div>
    <div class="admin-tabs" role="tablist">
      ${[['identity', 'Identidade'], ['landing', 'Landing page'], ['integrations', 'Integrações'], ['users', 'Usuários'], ['plans', 'Planos']].map(([key, label]) => `<button class="admin-tab ${adminState.section === key ? 'active' : ''}" data-admin-section="${key}">${label}</button>`).join('')}
    </div>
    <div id="admin-section-content"></div>
  `;
  document.querySelectorAll('[data-admin-section]').forEach((button) => button.addEventListener('click', () => {
    adminState.section = button.dataset.adminSection;
    loadAdminPanel(content);
  }));
  const section = document.getElementById('admin-section-content');
  try {
    if (adminState.section === 'identity') await renderIdentityEditor(section);
    if (adminState.section === 'landing') await renderLandingEditor(section);
    if (adminState.section === 'integrations') await renderIntegrationEditor(section);
    if (adminState.section === 'users') await renderUsersEditor(section);
    if (adminState.section === 'plans') await renderPlansEditor(section);
  } catch (error) {
    section.innerHTML = `<div class="panel empty-state"><strong>Não foi possível carregar este painel.</strong><p>${escapeHTML(error.message)}</p></div>`;
    showToast(error.message, 'error');
  }
}

async function renderIdentityEditor(section) {
  const settings = await fetchJson('/admin/settings');
  const value = (key, fallback = '') => escapeHTML(settings?.[key] ?? fallback);
  section.innerHTML = `
    <div class="admin-grid">
      <div class="panel"><div class="panel-title"><div><span class="eyebrow">Marca</span><h3>Identidade do site</h3></div><span class="status-dot">● conectado</span></div>
        <div class="form-grid two-col">
          <div><label class="label">Nome do site</label><input class="input" id="identity-name" value="${value('name', 'Disparo Inteligente')}" /></div>
          <div><label class="label">Fonte</label><select class="select" id="identity-font"><option ${settings?.font_family === 'Inter' ? 'selected' : ''}>Inter</option><option ${settings?.font_family === 'Manrope' ? 'selected' : ''}>Manrope</option><option ${settings?.font_family === 'DM Sans' ? 'selected' : ''}>DM Sans</option><option ${settings?.font_family === 'Plus Jakarta Sans' ? 'selected' : ''}>Plus Jakarta Sans</option></select></div>
          <div><label class="label">Cor primária</label><div class="color-field"><input type="color" id="identity-primary" value="${value('primary_color', '#7c3aed')}" /><input class="input" id="identity-primary-text" value="${value('primary_color', '#7c3aed')}" /></div></div>
          <div><label class="label">Cor secundária</label><div class="color-field"><input type="color" id="identity-secondary" value="${value('secondary_color', '#0ea5e9')}" /><input class="input" id="identity-secondary-text" value="${value('secondary_color', '#0ea5e9')}" /></div></div>
          <div><label class="label">Logo</label><input class="input" id="identity-logo" type="file" accept="image/png,image/jpeg,image/webp" /><small class="helper">PNG, JPG ou WEBP. Máximo 2 MB.</small><div class="file-preview">${settings?.logo_url ? `<img src="${escapeHTML(settings.logo_url)}" alt="Logo atual" />` : 'Nenhum logo enviado'}</div></div>
          <div><label class="label">Favicon</label><input class="input" id="identity-favicon" type="file" accept="image/png,image/jpeg,image/webp" /><small class="helper">PNG, JPG ou WEBP. Máximo 2 MB.</small><div class="file-preview">${settings?.favicon_url ? `<img src="${escapeHTML(settings.favicon_url)}" alt="Favicon atual" />` : 'Nenhum favicon enviado'}</div></div>
        </div>
        <button class="btn primary" id="save-identity">Salvar identidade</button>
      </div>
      <div class="panel preview-panel"><span class="eyebrow">Prévia</span><h3 id="identity-preview-name">${value('name', 'Disparo Inteligente')}</h3><div class="preview-brand"><span id="identity-preview-primary"></span><span id="identity-preview-secondary"></span></div><p>As alterações ficam disponíveis na próxima publicação da landing page.</p></div>
    </div>
  `;
  const syncColor = (source, target) => { document.getElementById(source).addEventListener('input', (event) => { document.getElementById(target).value = event.target.value; }); };
  syncColor('identity-primary', 'identity-primary-text');
  syncColor('identity-secondary', 'identity-secondary-text');
  document.getElementById('identity-name').addEventListener('input', (event) => { document.getElementById('identity-preview-name').textContent = event.target.value; });
  document.getElementById('save-identity').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      let logoUrl = settings?.logo_url || null;
      let faviconUrl = settings?.favicon_url || null;
      const logo = document.getElementById('identity-logo').files[0];
      const favicon = document.getElementById('identity-favicon').files[0];
      if (logo) logoUrl = await uploadAdminImage(logo);
      if (favicon) faviconUrl = await uploadAdminImage(favicon);
      await fetchJson('/admin/settings', { method: 'PUT', body: JSON.stringify({ name: document.getElementById('identity-name').value, logo_url: logoUrl, favicon_url: faviconUrl, primary_color: document.getElementById('identity-primary-text').value, secondary_color: document.getElementById('identity-secondary-text').value, font_family: document.getElementById('identity-font').value }) });
      showToast('Identidade salva com sucesso.');
      await renderIdentityEditor(section);
    } catch (error) { showToast(error.message, 'error'); } finally { button.disabled = false; }
  });
}

async function renderLandingEditor(section) {
  const sections = await fetchJson('/admin/landing-sections');
  section.innerHTML = `
    <div class="panel"><div class="panel-title"><div><span class="eyebrow">Conteúdo</span><h3>Seções da landing page</h3></div><span class="helper">Arraste para reordenar</span></div>
      <div class="sortable-list" id="landing-list">${sections.map((item) => `<article class="sortable-item" draggable="true" data-section-id="${item.id}"><div class="drag-handle" title="Arrastar">⠿</div><div class="sortable-fields"><div class="two-col"><div><label class="label">Título</label><input class="input section-title" value="${escapeHTML(item.title)}" /></div><div><label class="label">Imagem</label><input class="input section-file" type="file" accept="image/png,image/jpeg,image/webp" /></div></div><label class="label">Descrição</label><textarea class="textarea section-description" rows="3">${escapeHTML(item.description)}</textarea><div class="section-actions"><label class="toggle"><input class="section-enabled" type="checkbox" ${item.enabled ? 'checked' : ''} /><span></span> Ativa</label><button class="btn secondary save-section">Salvar</button><button class="btn danger delete-section">Excluir</button></div></div></article>`).join('') || '<div class="empty-state">Nenhuma seção criada ainda.</div>'}</div>
    </div>
    <div class="panel add-section-panel"><span class="eyebrow">Nova seção</span><h3>Adicionar conteúdo</h3><div class="two-col"><input class="input" id="new-section-key" placeholder="chave-da-secao" /><input class="input" id="new-section-title" placeholder="Título da seção" /></div><textarea class="textarea" id="new-section-description" rows="3" placeholder="Descrição"></textarea><button class="btn primary" id="add-section">Adicionar seção</button></div>
  `;
  let dragged;
  document.querySelectorAll('.sortable-item').forEach((item) => {
    item.addEventListener('dragstart', () => { dragged = item; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => { event.preventDefault(); if (dragged && dragged !== item) item.parentNode.insertBefore(dragged, item); });
  });
  document.querySelectorAll('.save-section').forEach((button) => button.addEventListener('click', async (event) => {
    const item = event.currentTarget.closest('.sortable-item');
    try {
      let imageUrl;
      const file = item.querySelector('.section-file').files[0];
      if (file) imageUrl = await uploadAdminImage(file);
      await fetchJson(`/admin/landing-sections/${item.dataset.sectionId}`, { method: 'PATCH', body: JSON.stringify({ title: item.querySelector('.section-title').value, description: item.querySelector('.section-description').value, ...(imageUrl ? { imageUrl } : {}), enabled: item.querySelector('.section-enabled').checked }) });
      showToast('Seção salva.');
    } catch (error) { showToast(error.message, 'error'); }
  }));
  document.querySelectorAll('.delete-section').forEach((button) => button.addEventListener('click', async (event) => { try { await fetchJson(`/admin/landing-sections/${event.currentTarget.closest('.sortable-item').dataset.sectionId}`, { method: 'DELETE' }); showToast('Seção excluída.'); await renderLandingEditor(section); } catch (error) { showToast(error.message, 'error'); } }));
  document.getElementById('add-section').addEventListener('click', async () => { try { await fetchJson('/admin/landing-sections', { method: 'POST', body: JSON.stringify({ sectionKey: document.getElementById('new-section-key').value, title: document.getElementById('new-section-title').value, description: document.getElementById('new-section-description').value }) }); showToast('Seção adicionada.'); await renderLandingEditor(section); } catch (error) { showToast(error.message, 'error'); } });
}

async function renderIntegrationEditor(section) {
  const providers = [['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['hotmart', 'Hotmart'], ['kiwify', 'Kiwify']];
  const integrations = await fetchJson('/integrations');
  const current = Object.fromEntries(integrations.map((item) => [item.merchant, item]));
  section.innerHTML = `<div class="integration-grid">${providers.map(([key, label]) => { const item = current[key] || {}; return `<div class="panel integration-card"><div class="integration-title"><div class="integration-icon">${label.slice(0, 1)}</div><div><h3>${label}</h3><p>${item.apiKeyConfigured ? `Configurada · termina em ${escapeHTML(item.apiKeyLast4)}` : 'Ainda não configurada'}</p></div></div><label class="label">API key</label><input class="input integration-key" type="password" placeholder="Cole uma nova chave para substituir" data-provider="${key}" /><label class="toggle"><input class="integration-enabled" type="checkbox" data-provider="${key}" ${item.enabled ? 'checked' : ''} /><span></span> Ativa</label><div class="section-actions"><button class="btn primary save-integration" data-provider="${key}">Salvar</button><button class="btn secondary test-integration" data-provider="${key}">Testar conexão</button></div><small class="helper">O teste real deste provedor será conectado na etapa de integrações.</small></div>`; }).join('')}</div>`;
  document.querySelectorAll('.save-integration').forEach((button) => button.addEventListener('click', async () => { const key = button.dataset.provider; const input = document.querySelector(`.integration-key[data-provider="${key}"]`); const enabled = document.querySelector(`.integration-enabled[data-provider="${key}"]`).checked; try { await fetchJson(`/integrations/${key}`, { method: 'PUT', body: JSON.stringify({ provider: key, apiKey: input.value || null, enabled }) }); showToast(`${key} salvo com segurança.`); await renderIntegrationEditor(section); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelectorAll('.test-integration').forEach((button) => button.addEventListener('click', () => showToast(`Teste de ${button.dataset.provider} preparado; conexão externa ainda não configurada.`, 'info')));
}

async function renderUsersEditor(section, search = '') {
  const [users, plans] = await Promise.all([fetchJson(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`), fetchJson('/admin/plans')]);
  section.innerHTML = `<div class="panel"><div class="panel-title"><div><span class="eyebrow">Acesso</span><h3>Usuários</h3></div><input class="input compact-input" id="user-search" placeholder="Buscar por nome ou e-mail" /></div><div class="table-wrap"><table class="table admin-table"><thead><tr><th>Usuário</th><th>Plano</th><th>Status</th><th>Ações</th></tr></thead><tbody id="users-body">${users.map((user) => `<tr><td><strong>${escapeHTML(user.name)}</strong><small>${escapeHTML(user.email)}</small></td><td><select class="select user-plan" data-id="${user.id}">${plans.map((plan) => `<option value="${plan.slug}" ${user.plan === plan.slug ? 'selected' : ''}>${escapeHTML(plan.name)}</option>`).join('')}</select></td><td><span class="tag ${user.status === 'active' ? 'green' : 'danger-tag'}">${escapeHTML(user.status)}</span></td><td><button class="btn secondary user-save" data-id="${user.id}">Salvar</button><button class="btn ${user.status === 'active' ? 'danger' : 'primary'} user-ban" data-id="${user.id}" data-status="${user.status}">${user.status === 'active' ? 'Banir' : 'Desbanir'}</button></td></tr>`).join('')}</tbody></table></div></div>`;
  document.getElementById('user-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') renderUsersEditor(section, event.currentTarget.value); });
  document.querySelectorAll('.user-save').forEach((button) => button.addEventListener('click', async () => { const plan = document.querySelector(`.user-plan[data-id="${button.dataset.id}"]`).value; try { await fetchJson(`/admin/users/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }); showToast('Plano do usuário atualizado.'); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelectorAll('.user-ban').forEach((button) => button.addEventListener('click', async () => { const status = button.dataset.status === 'active' ? 'blocked' : 'active'; try { await fetchJson(`/admin/users/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); showToast(status === 'blocked' ? 'Usuário banido.' : 'Usuário reativado.'); await renderUsersEditor(section); } catch (error) { showToast(error.message, 'error'); } }));
}

async function renderPlansEditor(section) {
  const plans = await fetchJson('/admin/plans');
  section.innerHTML = `<div class="panel"><div class="panel-title"><div><span class="eyebrow">Monetização</span><h3>Planos</h3></div><span class="helper">Preço e limites reais do banco</span></div><div class="plan-admin-grid">${plans.map((plan) => `<article class="plan-editor" data-id="${plan.id}"><input class="input plan-name" value="${escapeHTML(plan.name)}" /><input class="input plan-price" type="number" min="0" step="0.01" value="${plan.price}" /><label class="toggle"><input class="plan-featured" type="checkbox" ${plan.featured ? 'checked' : ''} /><span></span> Destaque</label><textarea class="textarea plan-limits" rows="3">${escapeHTML(JSON.stringify(plan.limits || {}, null, 2))}</textarea><div class="section-actions"><button class="btn primary update-plan">Salvar</button><button class="btn danger delete-plan">Excluir</button></div></article>`).join('')}</div></div><div class="panel"><span class="eyebrow">Novo plano</span><h3>Criar plano</h3><div class="two-col"><input class="input" id="new-plan-name" placeholder="Nome" /><input class="input" id="new-plan-slug" placeholder="slug-do-plano" /><input class="input" id="new-plan-price" type="number" min="0" step="0.01" placeholder="Preço mensal" /></div><textarea class="textarea" id="new-plan-limits" rows="3">{"maxCampaigns": 10, "maxContacts": 1000}</textarea><button class="btn primary" id="add-plan">Criar plano</button></div>`;
  document.querySelectorAll('.update-plan').forEach((button) => button.addEventListener('click', async () => { const card = button.closest('.plan-editor'); try { await fetchJson(`/admin/plans/${card.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ name: card.querySelector('.plan-name').value, price: Number(card.querySelector('.plan-price').value), featured: card.querySelector('.plan-featured').checked, limits: JSON.parse(card.querySelector('.plan-limits').value) }) }); showToast('Plano salvo.'); } catch (error) { showToast(error.message, 'error'); } }));
  document.querySelectorAll('.delete-plan').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/admin/plans/${button.closest('.plan-editor').dataset.id}`, { method: 'DELETE' }); showToast('Plano excluído.'); await renderPlansEditor(section); } catch (error) { showToast(error.message, 'error'); } }));
  document.getElementById('add-plan').addEventListener('click', async () => { try { await fetchJson('/admin/plans', { method: 'POST', body: JSON.stringify({ name: document.getElementById('new-plan-name').value, slug: document.getElementById('new-plan-slug').value, price: Number(document.getElementById('new-plan-price').value), limits: JSON.parse(document.getElementById('new-plan-limits').value) }) }); showToast('Plano criado.'); await renderPlansEditor(section); } catch (error) { showToast(error.message, 'error'); } });
}

async function loadDashboardPanel(panel) {
  const content = document.getElementById('dashboard-content');
  if (panel === 'overview') {
    const summary = await fetchJson('/api/dashboard/summary');
    content.innerHTML = `
      <div class="section-head">
        <h2>Visão geral</h2>
        <p>Fluxo geral da operação</p>
      </div>
      <div class="stats">
        <div class="stat-card"><span>Campanhas</span><strong>${summary.campaigns}</strong></div>
        <div class="stat-card"><span>Mensagens enviadas</span><strong>${summary.sent}</strong></div>
        <div class="stat-card"><span>Entregues</span><strong>${summary.delivered}</strong></div>
        <div class="stat-card"><span>Conversões</span><strong>${summary.conversions}</strong></div>
      </div>
      <div class="grid-two" style="margin-top:20px;">
        <div class="panel">
          <h3>Campanhas recentes</h3>
          <table class="table">
            <thead><tr><th>Nome</th><th>Status</th><th>Envios</th></tr></thead>
            <tbody id="campaign-body"></tbody>
          </table>
        </div>
        <div class="panel">
          <h3>Conexões ativas</h3>
          <div id="integration-body"></div>
        </div>
      </div>
    `;

    const campaigns = await fetchJson('/api/campaigns');
    document.getElementById('campaign-body').innerHTML = campaigns.slice(0, 4).map((item) => `
      <tr><td>${item.name}</td><td><span class="tag green">${item.status}</span></td><td>${item.sent}</td></tr>
    `).join('');

    const integrations = await fetchJson('/api/integrations');
    document.getElementById('integration-body').innerHTML = integrations.map((item) => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin: 12px 0;">
        <span>${item.name}</span>
        <span class="tag ${item.enabled ? 'green' : 'purple'}">${item.enabled ? 'Ativa' : 'Desativada'}</span>
      </div>
    `).join('');
    return;
  }

  if (panel === 'campaigns') {
    const campaigns = await fetchJson('/api/campaigns');
    content.innerHTML = `
      <div class="section-head">
        <h2>Campanhas</h2>
        <p>Crie e organize disparos em massa</p>
      </div>
      <div class="panel">
        <div class="form-grid">
          <div>
            <label class="label">Nome da campanha</label>
            <input class="input" id="campaign-name" value="Campanha de exemplo" />
          </div>
          <div>
            <label class="label">Mensagem</label>
            <textarea class="textarea" id="campaign-message" rows="4">Olá, tudo bem? Aqui é a Disparo Inteligente...</textarea>
          </div>
          <button class="btn primary" id="create-campaign">Salvar campanha</button>
        </div>
      </div>
      <div class="panel" style="margin-top:20px;">
        <table class="table">
          <thead><tr><th>Nome</th><th>Status</th><th>Envios</th><th>Conversões</th></tr></thead>
          <tbody>
            ${campaigns.map((item) => `
              <tr><td>${item.name}</td><td><span class="tag green">${item.status}</span></td><td>${item.sent}</td><td>${item.conversions}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('create-campaign').addEventListener('click', async () => {
      const name = document.getElementById('campaign-name').value;
      const message = document.getElementById('campaign-message').value;
      await fetchJson('/api/campaigns', { method: 'POST', body: JSON.stringify({ name, message }) });
      loadDashboardPanel('campaigns');
    });
    return;
  }

  if (panel === 'inbox') {
    const conversations = await fetchJson('/conversations');
    const first = conversations[0];
    content.innerHTML = `
      <div class="section-head"><span class="kicker">Atendimento</span><h2>Inbox unificado</h2><p>Organize conversas de WhatsApp e Instagram em um só lugar.</p></div>
      <div class="inbox-layout"><div class="panel conversation-list"><div class="panel-title"><h3>Conversas abertas</h3><span class="tag purple">${conversations.length}</span></div><div id="conversation-items">${conversations.map((item) => `<button class="conversation-item" data-conversation-id="${item.id}"><strong>${escapeHTML(item.contact_name || item.contact_phone)}</strong><small>${escapeHTML(item.channel)} · ${escapeHTML(item.last_message || 'Sem mensagens')}</small><span class="tag ${item.status === 'open' ? 'green' : 'purple'}">${item.status === 'open' ? 'Aberta' : 'Resolvida'}</span></button>`).join('') || '<div class="empty-state">Nenhuma conversa recebida ainda.</div>'}</div></div><div class="panel conversation-detail" id="conversation-detail"><div class="empty-state">Selecione uma conversa para ver o histórico.</div></div></div>
    `;
    async function showConversation(id) {
      const item = await fetchJson(`/conversations/${id}`);
      const detail = document.getElementById('conversation-detail');
      detail.innerHTML = `<div class="panel-title"><div><span class="eyebrow">${escapeHTML(item.channel)}</span><h3>${escapeHTML(item.contact_name || item.contact_phone)}</h3><small>${escapeHTML(item.contact_phone)}</small></div><button class="btn secondary" id="resolve-conversation">${item.status === 'open' ? 'Marcar resolvida' : 'Reabrir conversa'}</button></div><div class="message-thread">${item.messages.map((message) => `<div class="message-bubble ${message.direction}"><p>${escapeHTML(message.body)}</p><small>${new Date(message.created_at).toLocaleString('pt-BR')}</small></div>`).join('')}</div><div class="reply-box"><textarea class="textarea" id="reply-body" rows="3" placeholder="Escreva uma resposta..."></textarea><button class="btn primary" id="send-reply">Enviar resposta</button></div>`;
      document.getElementById('resolve-conversation').addEventListener('click', async () => { try { await fetchJson(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: item.status === 'open' ? 'resolved' : 'open' }) }); showToast('Status da conversa atualizado.'); await loadDashboardPanel('inbox'); } catch (error) { showToast(error.message, 'error'); } });
      document.getElementById('send-reply').addEventListener('click', async () => { try { await fetchJson(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: document.getElementById('reply-body').value }) }); showToast('Resposta enfileirada.'); await showConversation(id); } catch (error) { showToast(error.message, 'error'); } });
    }
    document.querySelectorAll('.conversation-item').forEach((button) => button.addEventListener('click', () => showConversation(button.dataset.conversationId)));
    if (first) showConversation(first.id);
    return;
  }

  if (panel === 'templates') {
    const templates = await fetchJson('/templates');
    content.innerHTML = `<div class="section-head"><span class="kicker">Biblioteca</span><h2>Templates de mensagem</h2><p>Use variáveis como {{nome}} para personalizar seus envios.</p></div><div class="panel"><div class="two-col"><input class="input" id="template-name" placeholder="Nome do template" /><select class="select" id="template-channel"><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="both">WhatsApp e Instagram</option></select></div><textarea class="textarea" id="template-body" rows="4" placeholder="Olá {{nome}}, tudo bem?"></textarea><button class="btn primary" id="create-template">Criar template</button></div><div class="template-grid">${templates.map((item) => `<article class="panel template-card"><div class="panel-title"><div><h3>${escapeHTML(item.name)}</h3><span class="tag ${item.approval_status === 'approved' ? 'green' : 'purple'}">${escapeHTML(item.approval_status)}</span></div><button class="btn danger delete-template" data-id="${item.id}">Excluir</button></div><p>${escapeHTML(item.body)}</p><small>${escapeHTML(item.channel)}</small></article>`).join('')}</div>`;
    document.getElementById('create-template').addEventListener('click', async () => { try { await fetchJson('/templates', { method: 'POST', body: JSON.stringify({ name: document.getElementById('template-name').value, body: document.getElementById('template-body').value, channel: document.getElementById('template-channel').value }) }); showToast('Template criado.'); await loadDashboardPanel('templates'); } catch (error) { showToast(error.message, 'error'); } });
    document.querySelectorAll('.delete-template').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/templates/${button.dataset.id}`, { method: 'DELETE' }); showToast('Template excluído.'); await loadDashboardPanel('templates'); } catch (error) { showToast(error.message, 'error'); } }));
    return;
  }

  if (panel === 'schedule') {
    const [jobs, campaigns, templates] = await Promise.all([fetchJson('/schedule'), fetchJson('/campaigns'), fetchJson('/templates')]);
    content.innerHTML = `<div class="section-head"><span class="kicker">Planejamento</span><h2>Agenda de envios</h2><p>Agende campanhas e follow-ups para a sua operação.</p></div><div class="panel"><div class="two-col"><select class="select" id="schedule-kind"><option value="campaign">Campanha</option><option value="follow_up">Follow-up</option></select><select class="select" id="schedule-campaign"><option value="">Selecione uma campanha</option>${campaigns.map((item) => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join('')}</select><select class="select" id="schedule-template"><option value="">Selecione um template</option>${templates.map((item) => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join('')}</select><input class="input" id="schedule-date" type="datetime-local" /></div><button class="btn primary" id="create-schedule">Agendar envio</button></div><div class="panel" style="margin-top:20px;"><table class="table"><thead><tr><th>Tipo</th><th>Agendado para</th><th>Status</th><th>Ação</th></tr></thead><tbody>${jobs.map((job) => `<tr><td>${escapeHTML(job.kind)}</td><td>${new Date(job.scheduled_for).toLocaleString('pt-BR')}</td><td><span class="tag ${job.status === 'scheduled' ? 'green' : 'purple'}">${escapeHTML(job.status)}</span></td><td>${job.status === 'scheduled' ? `<button class="btn danger cancel-schedule" data-id="${job.id}">Cancelar</button>` : '-'}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum agendamento.</td></tr>'}</tbody></table></div>`;
    document.getElementById('create-schedule').addEventListener('click', async () => { try { const date = new Date(document.getElementById('schedule-date').value); await fetchJson('/schedule', { method: 'POST', body: JSON.stringify({ kind: document.getElementById('schedule-kind').value, campaignId: document.getElementById('schedule-campaign').value || null, templateId: document.getElementById('schedule-template').value || null, scheduledFor: date.toISOString() }) }); showToast('Envio agendado.'); await loadDashboardPanel('schedule'); } catch (error) { showToast(error.message, 'error'); } });
    document.querySelectorAll('.cancel-schedule').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/schedule/${button.dataset.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }); showToast('Agendamento cancelado.'); await loadDashboardPanel('schedule'); } catch (error) { showToast(error.message, 'error'); } }));
    return;
  }

  if (panel === 'automations') {
    const automations = await fetchJson('/automations');
    content.innerHTML = `<div class="section-head"><span class="kicker">Automação</span><h2>Fluxos inteligentes</h2><p>Monte gatilho, condição e ação para sua operação.</p></div><div class="panel"><div class="two-col"><input class="input" id="automation-name" placeholder="Nome do fluxo" /><select class="select" id="automation-trigger"><option value="message_received">Mensagem recebida</option><option value="keyword">Palavra-chave</option><option value="campaign_finished">Campanha finalizada</option><option value="schedule">Agendamento</option></select></div><div class="two-col"><input class="input" id="automation-condition" placeholder="Condição, ex: palavra contém preço" /><input class="input" id="automation-action" placeholder="Ação, ex: enviar template boas-vindas" /></div><button class="btn primary" id="create-automation">Criar fluxo</button></div><div class="template-grid">${automations.map((item) => `<article class="panel template-card"><div class="panel-title"><div><h3>${escapeHTML(item.name)}</h3><span class="tag ${item.enabled ? 'green' : 'purple'}">${item.enabled ? 'Ativo' : 'Pausado'}</span></div><button class="btn danger delete-automation" data-id="${item.id}">Excluir</button></div><p>Gatilho: ${escapeHTML(item.trigger_type)}</p><small>Condição e ação configuráveis</small></article>`).join('') || '<div class="empty-state">Nenhum fluxo criado.</div>'}</div>`;
    document.getElementById('create-automation').addEventListener('click', async () => { try { await fetchJson('/automations', { method: 'POST', body: JSON.stringify({ name: document.getElementById('automation-name').value, triggerType: document.getElementById('automation-trigger').value, conditionConfig: { description: document.getElementById('automation-condition').value }, actionConfig: { description: document.getElementById('automation-action').value } }) }); showToast('Fluxo criado.'); await loadDashboardPanel('automations'); } catch (error) { showToast(error.message, 'error'); } });
    document.querySelectorAll('.delete-automation').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/automations/${button.dataset.id}`, { method: 'DELETE' }); showToast('Fluxo excluído.'); await loadDashboardPanel('automations'); } catch (error) { showToast(error.message, 'error'); } }));
    return;
  }

  if (panel === 'agents') {
    const agents = await fetchJson('/ai-agents');
    content.innerHTML = `<div class="section-head"><span class="kicker">Inteligência</span><h2>Agentes IA</h2><p>Configure persona e base de conhecimento. A conexão com o provedor será ativada quando você adicionar a chave.</p></div><div class="panel"><div class="two-col"><input class="input" id="agent-name" placeholder="Nome do agente" /><select class="select" id="agent-provider"><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="custom">Endpoint próprio</option></select></div><input class="input" id="agent-model" placeholder="Modelo, ex: gpt-4o-mini" value="gpt-4o-mini" /><textarea class="textarea" id="agent-prompt" rows="5" placeholder="Você é um atendente..."></textarea><button class="btn primary" id="create-agent">Criar agente</button></div><div class="template-grid">${agents.map((item) => `<article class="panel template-card"><div class="panel-title"><div><h3>${escapeHTML(item.name)}</h3><span class="tag ${item.enabled ? 'green' : 'purple'}">${item.enabled ? 'Ativo' : 'Rascunho'}</span></div><button class="btn danger delete-agent" data-id="${item.id}">Excluir</button></div><p>${escapeHTML(item.system_prompt)}</p><small>${escapeHTML(item.provider)} · ${escapeHTML(item.model)}</small><div class="section-actions"><button class="btn secondary faq-agent" data-id="${item.id}">Adicionar FAQ</button></div></article>`).join('') || '<div class="empty-state">Nenhum agente criado.</div>'}</div>`;
    document.getElementById('create-agent').addEventListener('click', async () => { try { await fetchJson('/ai-agents', { method: 'POST', body: JSON.stringify({ name: document.getElementById('agent-name').value, provider: document.getElementById('agent-provider').value, model: document.getElementById('agent-model').value, systemPrompt: document.getElementById('agent-prompt').value }) }); showToast('Agente criado.'); await loadDashboardPanel('agents'); } catch (error) { showToast(error.message, 'error'); } });
    document.querySelectorAll('.delete-agent').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/ai-agents/${button.dataset.id}`, { method: 'DELETE' }); showToast('Agente excluído.'); await loadDashboardPanel('agents'); } catch (error) { showToast(error.message, 'error'); } }));
    document.querySelectorAll('.faq-agent').forEach((button) => button.addEventListener('click', async () => { const question = prompt('Pergunta da FAQ'); const answer = question && prompt('Resposta da FAQ'); if (!question || !answer) return; try { await fetchJson(`/ai-agents/${button.dataset.id}/faq`, { method: 'POST', body: JSON.stringify({ question, answer }) }); showToast('FAQ adicionada ao agente.'); } catch (error) { showToast(error.message, 'error'); } }));
    return;
  }

  if (panel === 'followups') {
    const sequences = await fetchJson('/follow-ups');
    content.innerHTML = `<div class="section-head"><span class="kicker">Relacionamento</span><h2>Sequências de follow-up</h2><p>Crie mensagens automáticas com regra de parada ao receber resposta.</p></div><div class="panel"><div class="two-col"><input class="input" id="followup-name" placeholder="Nome da sequência" /><label class="toggle"><input id="followup-stop" type="checkbox" checked /><span></span> Parar quando responder</label></div><textarea class="textarea" id="followup-body" rows="4" placeholder="Mensagem do primeiro follow-up"></textarea><div class="two-col"><input class="input" id="followup-delay" type="number" min="0" value="1" placeholder="Dias de espera" /><button class="btn primary" id="create-followup">Criar sequência</button></div></div><div class="template-grid">${sequences.map((item) => `<article class="panel template-card"><div class="panel-title"><div><h3>${escapeHTML(item.name)}</h3><span class="tag ${item.enabled ? 'green' : 'purple'}">${item.enabled ? 'Ativa' : 'Pausada'}</span></div><button class="btn danger delete-followup" data-id="${item.id}">Excluir</button></div><p>${item.steps?.length || 0} etapa(s) · ${item.stop_on_reply ? 'para ao responder' : 'continua após resposta'}</p></article>`).join('') || '<div class="empty-state">Nenhuma sequência criada.</div>'}</div>`;
    document.getElementById('create-followup').addEventListener('click', async () => { try { await fetchJson('/follow-ups', { method: 'POST', body: JSON.stringify({ name: document.getElementById('followup-name').value, stopOnReply: document.getElementById('followup-stop').checked, steps: [{ stepOrder: 0, delayDays: Number(document.getElementById('followup-delay').value), body: document.getElementById('followup-body').value }] }) }); showToast('Sequência criada.'); await loadDashboardPanel('followups'); } catch (error) { showToast(error.message, 'error'); } });
    document.querySelectorAll('.delete-followup').forEach((button) => button.addEventListener('click', async () => { try { await fetchJson(`/follow-ups/${button.dataset.id}`, { method: 'DELETE' }); showToast('Sequência excluída.'); await loadDashboardPanel('followups'); } catch (error) { showToast(error.message, 'error'); } }));
    return;
  }

  if (panel === 'chatbot') {
    content.innerHTML = `
      <div class="section-head">
        <h2>Chatbot</h2>
        <p>Fluxo de perguntas e respostas</p>
      </div>
      <div class="panel">
        <div class="form-grid">
          <div>
            <label class="label">Pergunta inicial</label>
            <input class="input" value="Olá, tudo bem? Como posso te ajudar?" />
          </div>
          <div>
            <label class="label">Resposta automática</label>
            <textarea class="textarea" rows="4">Posso te ajudar a conhecer nossos planos e agendar uma demonstração.</textarea>
          </div>
          <button class="btn primary">Salvar sequência</button>
        </div>
      </div>
    `;
    return;
  }

  if (panel === 'integrations') {
    const integrations = await fetchJson('/api/integrations');
    content.innerHTML = `
      <div class="section-head">
        <h2>Integrações</h2>
        <p>Conecte canais e sistemas de vendas</p>
      </div>
      <div class="panel">
        ${integrations.map((item) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--line);">
            <div>
              <strong>${item.name}</strong>
              <div style="color:#6b7280; font-size:.8rem;">${item.enabled ? 'Conectado' : 'Não conectado'}</div>
            </div>
            <button class="btn secondary" data-key="${item.id}">${item.enabled ? 'Editar' : 'Conectar'}</button>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  if (panel === 'admin') {
    loadAdminPanel(content);
    return;
  }
}

window.addEventListener('hashchange', render);
render();
