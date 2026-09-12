const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const breadcrumb = document.getElementById('breadcrumbCurrent');
const viewNames = { overview: 'Visão geral', calendar: 'Calendário', content: 'Conteúdo', accounts: 'Contas', analytics: 'Analytics', explorer: 'Explorer', plans: 'Plano e cobrança' };

function showView(name) {
  views.forEach(view => view.classList.toggle('active-view', view.id === `${name}-view`));
  navItems.forEach(item => item.classList.toggle('active', item.dataset.view === name));
  breadcrumb.textContent = viewNames[name];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'calendar') renderCalendar();
}

navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(button => button.addEventListener('click', () => showView(button.dataset.viewTarget)));
document.getElementById('mobileMenu').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

const calendarEvents = { 3: [['Planejamento mensal', 'event-carousel']], 5: [['5 hábitos que mudaram...', 'event-reel']], 8: [['Bastidores do processo', 'event-video']], 10: [['5 hábitos que mudaram...', 'event-reel'], ['Checklist da semana', 'event-carousel']], 11: [['O que ninguém te conta...', 'event-video'], ['3 ferramentas que uso...', 'event-reel']], 14: [['Perguntas e respostas', 'event-carousel']], 17: [['Minha rotina matinal', 'event-reel']], 22: [['Como manter o foco', 'event-video']], 25: [['Leitura do mês', 'event-carousel']] };
function renderCalendar() {
  const container = document.getElementById('calendarDays');
  if (container.children.length) return;
  [30, 31].forEach(day => container.insertAdjacentHTML('beforeend', `<div class="calendar-cell other-month"><div class="calendar-number">${day}</div></div>`));
  for (let day = 1; day <= 30; day += 1) {
    const isToday = day === 10;
    const events = calendarEvents[day] || [];
    container.insertAdjacentHTML('beforeend', `<div class="calendar-cell ${isToday ? 'today' : ''}"><div class="calendar-number">${day}</div>${events.map(event => `<div class="calendar-event ${event[1]}" title="${event[0]}">${event[0]}</div>`).join('')}</div>`);
  }
  [1, 2, 3].forEach(day => container.insertAdjacentHTML('beforeend', `<div class="calendar-cell other-month"><div class="calendar-number">${day}</div></div>`));
}

const modal = document.getElementById('postModal');
function openModal() { modal.classList.add('open'); document.getElementById('captionInput').focus(); }
function closeModal() { modal.classList.remove('open'); }
['newPostButton', 'calendarNewPost', 'contentNewPost'].forEach(id => document.getElementById(id).addEventListener('click', openModal));
document.getElementById('closeModal').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

document.getElementById('uploadZone').addEventListener('click', () => document.getElementById('mediaInput').click());
document.getElementById('mediaInput').addEventListener('change', event => {
  if (event.target.files.length) {
    const zone = document.getElementById('uploadZone');
    zone.querySelector('strong').textContent = `${event.target.files.length} arquivo(s) selecionado(s)`;
    zone.querySelector('small').textContent = 'Pronto para publicar em suas contas';
  }
});
document.getElementById('aiCaption').addEventListener('click', () => {
  const caption = document.getElementById('captionInput');
  caption.value = 'Pequenas escolhas criam uma rotina que sustenta grandes resultados. ✦\n\nQual hábito você quer levar para a sua semana? Conta aqui nos comentários.\n\n#rotina #produtividade #criadores';
});
function toast(message = 'Conteúdo agendado') {
  const element = document.getElementById('toast');
  element.querySelector('strong').textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 3300);
}
document.getElementById('scheduleButton').addEventListener('click', async () => {
  const caption = document.getElementById('captionInput').value.trim();
  if (!caption) { document.getElementById('captionInput').focus(); return; }
  const post = {
    caption,
    date: document.getElementById('scheduleDate').value,
    platform: document.getElementById('postPlatform').value
  };
  localStorage.setItem('postagend-last-post', JSON.stringify(post));
  try {
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post) });
  } catch (error) {
    // O modo estático continua funcionando sem um servidor local.
  }
  closeModal();
  toast();
});

document.querySelectorAll('.example-pills button').forEach(button => button.addEventListener('click', () => { document.getElementById('explorerInput').value = button.textContent; document.getElementById('exploreButton').click(); }));
document.getElementById('exploreButton').addEventListener('click', () => {
  const input = document.getElementById('explorerInput').value.trim();
  if (!input) return;
  document.getElementById('explorerEmpty').innerHTML = `<div class="explorer-art thumb-sand">◎</div><h2>${input.replace(/[<>]/g, '')}</h2><p>Perfil encontrado. As referências mais recentes aparecerão aqui quando a integração do Instagram estiver conectada.</p><button class="outline-button" onclick="toast('Perfil salvo no Explorer')">＋ Salvar referência</button>`;
});
document.querySelectorAll('.view-switcher button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.view-switcher button').forEach(item => item.classList.remove('active')); button.classList.add('active'); toast(`Visualização: ${button.textContent}`); }));
document.querySelectorAll('.billing-toggle button').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.billing-toggle button').forEach(item => item.classList.remove('active')); button.classList.add('active'); toast(button.textContent.includes('Anual') ? 'Desconto anual aplicado' : 'Cobrança mensal selecionada'); }));
document.getElementById('connectAccount').addEventListener('click', () => toast('Fluxo de conexão iniciado'));
document.getElementById('connectAccountSecondary').addEventListener('click', () => toast('Fluxo de conexão iniciado'));

const heatGrid = document.getElementById('heatGrid');
for (let index = 0; index < 35; index += 1) { const level = [0, 1, 2, 1, 3, 2, 1, 0, 2, 3, 3, 1, 2, 3, 1][index % 15]; heatGrid.insertAdjacentHTML('beforeend', `<i class="heat-cell level-${level}"></i>`); }