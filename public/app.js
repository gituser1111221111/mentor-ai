import {VoicePlayback} from './voice-playback.js';
// Mentor Labs SPA: researched perspectives, optional intake, and specialist tools.
// Vanilla JS, no build step. All money shown here comes from the server's exact-cents math.
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const displayName = name => String(name || '').replace(/[–—-]inspired\b/gi, '').trim();
const usd = v => (v === null || v === undefined || v === '') ? 'n/a' : '$' + Number(v).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

let sid; try { sid = localStorage.getItem('sid'); } catch {}
if (!sid) { sid = crypto.randomUUID(); try { localStorage.setItem('sid', sid); } catch {} }

async function api(path, {method = 'GET', body} = {}) {
  if ((method === 'POST' && ['/api/profile','/api/portfolio/upload','/api/attachment'].includes(path)) || (method === 'DELETE' && path === '/api/session')) { if (voice.active) endConversation('Financial details changed. Start a new conversation with the updated numbers.');else {++voice.epoch;stopPlayback('financial-input-update');}state.lastTurn = null; }
  const r = await fetch(path, {method, headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || (data.errors || []).map(x => x.error).join('; ') || 'Something went wrong. Try again.'); e.status = r.status; e.data = data; throw e; }
  if (method === 'POST' && path === '/api/portfolio/upload') document.dispatchEvent(new CustomEvent('mentor:inputs-updated'));
  return data;
}

const state = {config: null, tier: 'free', answers: {}, i: 0, profile: null, snapshot: null, personaId: null, agentId: 'budget', need: 'question', lastTurn: null};
const views = ['v-landing', 'v-quiz', 'v-chat', 'v-workspace', 'v-learning'];
function show(id) {
  syncTeacherDock(id);
  if (id !== 'v-chat' && voice.active) endConversation();
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  document.body.classList.toggle('chat-open', id === 'v-chat');
  const landing = id === 'v-landing';
  $('#nav').hidden = !landing; $('#head-start').hidden = !landing; $('#restart').hidden = landing;
  $('#engine').hidden = landing;
  document.body.classList.toggle('app-open', !landing);
  document.body.classList.toggle('dashboard-open', id === 'v-workspace');
  document.body.classList.toggle('onboarding-open', id === 'v-quiz');
  $('#app-nav').hidden = landing || id === 'v-quiz';
  document.querySelectorAll('#app-nav button').forEach(b => b.setAttribute('aria-current', (b.hasAttribute('data-return-chat') ? id === 'v-chat' : b.hasAttribute('data-open-learning') ? id === 'v-learning' : id === 'v-workspace') ? 'page' : 'false'));
  document.querySelectorAll('.header-context').forEach(b => b.hidden = landing || id === 'v-quiz');
  window.scrollTo(0, 0);
}
function banner(text, warn = false) { const b = $('#banner'); b.textContent = text; b.className = 'banner' + (warn ? ' warn' : ''); b.hidden = !text; }

// ---------- catalog helpers ----------
const personas = () => state.config.catalog.personas;
const agents = () => state.config.catalog.agents;
const persona = id => personas().find(p => p.id === id);
const agent = id => agents().find(a => a.id === id);
const usable = x => Boolean(x?.built);
const orderedPersonas = () => personas().slice().sort((a,b) => Number(usable(b)) - Number(usable(a)));
const statusLabel = x => usable(x) ? 'Available' : 'Preview';
const badge = x => `<span class="tag ${usable(x) ? 'free' : 'plus'}">${statusLabel(x)}</span>`;
const initials = name => name.replace(/^The /, '').split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const art = (p, cls = 'frame') => `<div class="${cls}">${p.image ? `<img src="${esc(p.image)}" alt="AI-generated likeness inspired by ${esc(p.inspiredBy)}" width="640" height="800" loading="lazy" decoding="async">` : `<span class="mono-gram">${esc(initials(p.name))}</span>`}</div>`;
const thumb = p => `<span class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(initials(p.name))}</span>`;

const agentSymbol = id => {
  const paths = {budget:'M5 4h14v16H5z M8 8h8 M8 12h3 M8 16h5',debt:'M5 7h14 M5 12h10 M5 17h6',savings:'M12 3v18 M6 7h9a3 3 0 010 6H9a3 3 0 000 6h9',tax:'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h3',credit:'M3 6h18v12H3z M3 10h18 M6 15h4',retirement:'M4 18h16 M7 18V9 M12 18V5 M17 18v-6',insurance:'M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7z',investing:'M4 19V5 M4 19h16 M7 15l4-5 4 2 5-7',equity:'M4 20l6-6 M14 4a6 6 0 110 12 6 6 0 010-12',real_estate:'M3 11l9-8 9 8 M6 9v12h12V9 M10 21v-7h4v7',life:'M5 5h14v15H5z M5 9h14 M8 3v4 M16 3v4',business:'M3 7h18v13H3z M8 7V3h8v4 M3 12h18',biz_cash:'M3 8h18 M17 4l4 4-4 4 M21 16H3 M7 12l-4 4 4 4',biz_strategy:'M4 20L20 4 M12 4h8v8 M4 12v8h8',pricing:'M3 5h10l8 8-8 8-10-10z M7 9h.1',income:'M4 20h16 M6 16l5-5 4 2 5-9 M15 4h5v5'};
  return `<span class="agent-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[id] || paths.budget}"/></svg></span>`;
};

// ---------- landing ----------
function renderLanding() {
  const portrait = p => `<article class="portrait">${art(p)}${badge(p)}<h3>${esc(p.name)}</h3><p class="portrait-source">${usable(p) ? (p.textOnly ? 'Text chat' : 'Voice & text chat') : 'Not available yet'}</p><p>${esc(p.philosophy)}.</p><button class="btn outline" type="button" data-chat-mentor="${esc(p.id)}">${usable(p) ? 'Choose teacher' : 'Explore preview'}</button></article>`;
  const ready = personas().filter(usable), previews = personas().filter(p => !usable(p));
  $('#personas').innerHTML = `<h3 class="teacher-group-label">Available now</h3><div class="available-portraits">${ready.map(portrait).join('')}</div><details class="teacher-previews"><summary>Explore ${previews.length} upcoming perspectives <span class="tag quiet">Preview</span></summary><div class="preview-portraits">${previews.map(portrait).join('')}</div></details>`;
  $('#hero-perspectives').innerHTML = orderedPersonas().map(p => `<div class="collection-portrait">${p.image ? `<img src="${esc(p.image)}" alt="AI-generated portrait inspired by ${esc(p.inspiredBy)}" width="160" height="200" loading="eager">` : `<span>${esc(initials(p.name))}</span>`}<strong>${esc(p.inspiredBy || p.name)}</strong><small>${usable(p) ? 'Available' : 'Preview'}</small></div>`).join('');
  const groups = [...new Set(agents().map(a => a.category || 'Other specialties'))];
  $('#agents').innerHTML = groups.map(category => `<details class="specialist-group"><summary>${esc(category)} <span class="fine">${agents().filter(a => a.category === category).length} specialties</span></summary><div class="agent-grid">${agents().filter(a => (a.category || 'Other specialties') === category).map((a,i) => `<button type="button" class="agent-card tone-${i%4}" data-a="${esc(a.id)}">${agentSymbol(a.id)}<span class="agent-card-top"><strong>${esc(a.name)}</strong>${badge(a)}</span><span class="agent-card-job">${esc(a.job)}</span></button>`).join('')}</div></details>`).join('');
  document.querySelectorAll('#agents [data-a]').forEach(b => b.onclick = () => showAgent(agent(b.dataset.a)));
  document.querySelectorAll('[data-chat-mentor]').forEach(b => b.onclick = () => { const p = persona(b.dataset.chatMentor); if (usable(p)) openStartChoice({personaId:p.id}); else showFeature(p); });
  renderSources();
}

// Choose explicitly: no mentor is the product's default.
let pendingAgent = null;
// Nov 7: entry buttons go straight to the chatbot. The teacher can be switched inside chat.
function openStartChoice({personaId = state.personaId, need = state.need, agentId = null} = {}) {
  let saved = null; try { saved = JSON.parse(localStorage.getItem('mentor-labs-choice') || 'null'); } catch {}
  const pick = [personaId, saved?.personaId, 'debt-free-coach'].map(persona).find(p => p && usable(p)) || personas().find(usable);
  if (!pick) { banner('No teacher is available right now. Please try again shortly.', true); return; }
  state.personaId = pick.id; state.need = need || saved?.need || 'question';
  state.agentId = agentId || (state.need === 'future' && usable(agent('investing')) ? 'investing' : (usable(agent(state.agentId)) ? state.agentId : 'budget'));
  rememberChoice(); startChat();
  try { if (learningQuestion) { $('#msg').value = learningQuestion; learningQuestion = ''; $('#msg').focus(); } } catch {}
}
function openStartChoiceDialog({personaId = state.personaId, need = state.need, agentId = null} = {}) {
  pendingAgent = agentId;
  $('#start-personas').innerHTML = '<option value="">Choose a perspective</option>' + personas().slice().sort((a,b) => Number(usable(b)) - Number(usable(a))).map(p => `<option value="${esc(p.id)}" ${usable(p) ? '' : 'disabled'}>${esc(p.name)}${usable(p) ? '' : ' · Preview'}</option>`).join('');
  $('#start-personas').value = usable(persona(personaId)) ? personaId : '';
  $('#start-need').value = ['question','everyday','future','retirement'].includes(need) ? need : 'question';
  $('#start-choice-error').textContent = '';
  $('#start-step').value = (state.profile || $('#v-landing').hidden !== false) ? 'chat' : 'snapshot';
  $('#start-choice').showModal();
}
function submitStartChoice(e) {
  e.preventDefault();
  const selected = persona($('#start-personas').value);
  if (!usable(selected)) { $('#start-choice-error').textContent = 'Choose an available perspective to start.'; return; }
  state.personaId = selected.id; state.need = $('#start-need').value;
  state.agentId = pendingAgent || (state.need === 'future' && usable(agent('investing')) ? 'investing' : 'budget');
  rememberChoice(); $('#start-choice').close();
  if ($('#start-step').value === 'snapshot' && !learningQuestion) renderIntake(); else startChat();
}
function rememberChoice() {
  try { localStorage.setItem('mentor-labs-choice', JSON.stringify({personaId:state.personaId,agentId:state.agentId,need:state.need})); } catch {}
}

// ---------- live data connections ----------
const sources = () => state.config.catalog.dataSources || [];
const sourcesFor = id => sources().filter(d => d.agents.includes(id));
const agentNames = ids => ids.map(id => agent(id)?.name.replace(/ Agent$/, '')).filter(Boolean).join(', ');
const sourceState = d => d.status === 'live' ? (d.connected ? 'Configured · fetched on request' : 'Not configured') : 'Planned';
function renderSources() {
  const el = $('#data-sources'); if (!el) return;
  const group = (implemented, title) => {
    const list = sources().filter(d => (d.status === 'live') === implemented);
    if (!list.length) return '';
    return `<div class="api-group"><h3>${title}</h3><ul class="api-logos">${list.map(d => `<li><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer" title="${esc(d.provides)} · ${esc(sourceState(d))}">${d.logo ? `<img src="${esc(d.logo)}" alt="" width="28" height="28" loading="lazy">` : ''}<span>${esc(d.name)}<small>${esc(sourceState(d))}</small></span></a></li>`).join('')}</ul></div>`;
  };
  el.innerHTML = group(true, 'Implemented sources') + group(false, 'Planned connections');
}
function sourceList(id) {
  const list = sourcesFor(id);
  if (!list.length) return '<p class="fine">This agent uses your confirmed inputs and code-checked calculations. No market feed is attached yet.</p>';
  return `<p class="section-eyebrow">RELEVANT DATA SOURCES</p><ul class="source-list">${list.map(d => `<li><strong>${esc(d.name)}</strong> <span class="tag ${d.status === 'live' ? '' : 'plus'}">${esc(sourceState(d))}</span><br><small>${esc(d.provides)}</small></li>`).join('')}</ul>`;
}
function showAgent(a) {
  const ready = usable(a);
  $('#feature-eyebrow').textContent = ready ? 'SPECIALIST AGENT · AVAILABLE' : 'SPECIALIST PREVIEW';
  $('#feature-title').textContent = a.name;
  $('#feature-text').textContent = ready ? `${a.job}. Add your context when you are ready; inspect sources and calculations with each answer.` : `${a.job}. This specialty is planned and is not available yet.`;
  $('#feature-sources').innerHTML = sourceList(a.id);
  $('#feature-plus').hidden = true;
  $('#feature-try').hidden = !ready;
  $('#feature-try').textContent = 'Choose a perspective and start';
  $('#feature-try').onclick = () => { $('#feature-preview').close(); openStartChoice({agentId:a.id, need:['investing','equity'].includes(a.id) ? 'future' : 'everyday'}); };
  $('#feature-preview').showModal();
}

// ---------- intake ----------
function lastMonths(n) { const out = [], d = new Date(); for (let i = n; i >= 1; i--) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth() - i, 15)); out.push(x.toISOString().slice(0, 7)); } return out; }

async function submitQuiz(answers) {
  try {
    const r = await api("/api/profile", {method: "POST", body: {answers}});
    state.profile = r.profile; state.snapshot = r.snapshot;
    startChat();
  } catch (e) { banner(e.message, true); }
}

// The six-question intake is retired (Nov 7). Import is the planned way to bring in numbers.
function showImportSoon() {
  const msg = 'Import is coming soon: you will be able to bring in your budget and holdings here. Until then, your teacher works from the shared demo profile.';
  if (!$('#v-chat').hidden) note(msg); else banner(msg);
}
function renderIntake() { return showImportSoon(); }
function renderIntakeLegacy() {
  if (!usable(persona(state.personaId))) return openStartChoice();
  $('#intake-teacher').textContent = 'Getting started with ' + persona(state.personaId).name;
  $('#income-months').innerHTML = lastMonths(6).map(m => `<label class="f">${esc(new Date(m + '-15T12:00:00Z').toLocaleString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'}))}<input inputmode="decimal" data-month="${m}" placeholder="0.00"></label>`).join('');
  const p = state.profile;
  if (p) {
    document.querySelectorAll('#income-months input').forEach(i => { i.value = p.incomeHistory?.find(x => x.month === i.dataset.month)?.amount || ''; });
    const sum = rows => (rows || []).reduce((n,r) => n + Number(r.amount || 0),0).toFixed(2);
    $('#intake-bills').value = sum(p.bills); $('#intake-spending').value = sum(p.expenses);
    $('#intake-savings').value = p.savings || '';
    $('#intake-goal').value = p.goals?.[0] || 'stop_paycheck_to_paycheck';
    $('#intake-risk').value = p.riskTolerance || ''; $('#intake-horizon').value = p.investmentHorizon || '';
    const debt = p.debts?.[0];
    $('#intake-debt-balance').value = debt?.balance || '';
    $('#intake-debt-apr').value = debt?.rateBps != null ? debt.rateBps / 100 : '';
    $('#intake-debt-minimum').value = debt?.minPayment || '';
  }
  $('#q-error').textContent = '';
  show('v-quiz');
}

const moneyInput = id => $(id).value.trim();
async function submitIntake(e) {
  e.preventDefault();
  $('#q-error').textContent = '';
  const incomeHistory = [...$('#income-months').querySelectorAll('input')].filter(i => i.value.trim()).map(i => ({month: i.dataset.month, amount: i.value.trim()}));
  if (!incomeHistory.length) { $('#q-error').textContent = 'Enter at least one month of take-home pay.'; $('#income-months input')?.focus(); return; }
  const debt = [moneyInput('#intake-debt-balance'), moneyInput('#intake-debt-apr'), moneyInput('#intake-debt-minimum')];
  if (debt.some(Boolean) && !debt.every(Boolean)) { $('#q-error').textContent = 'For debt, enter the balance, APR, and monthly minimum—or leave all three blank.'; return; }
  const answers = {
    ...(state.profile || {}),
    incomeHistory,
    bills: moneyInput('#intake-bills') ? [{name: 'Fixed monthly bills', amount: moneyInput('#intake-bills')}] : [],
    expenses: moneyInput('#intake-spending') ? [{name: 'Everyday spending', amount: moneyInput('#intake-spending')}] : [],
    debts: debt.every(Boolean) ? [{name: state.profile?.debts?.[0]?.name || 'Debt', balance: debt[0], aprPercent: debt[1], minPayment: debt[2]}, ...(state.profile?.debts?.slice(1) || [])] : (state.profile?.debts?.slice(1) || []),
    savings: moneyInput('#intake-savings') || '0', goals: [$('#intake-goal').value],
    riskTolerance: $('#intake-risk').value, investmentHorizon: $('#intake-horizon').value,
  };
  const button = $('#intake-form button[type="submit"]'); button.disabled = true;
  try {
    const r = await api('/api/profile', {method: 'POST', body: {answers}});
    state.profile = r.profile; state.snapshot = r.snapshot;
    const portfolioName = state.pendingPortfolio?.name;
    const documentName = state.pendingDocument?.name;
    if (state.pendingPortfolio) await uploadPortfolio(state.pendingPortfolio);
    if (state.pendingDocument) await uploadDocument(state.pendingDocument);
    startChat();
    if (portfolioName) note(`Portfolio loaded from ${portfolioName}.`);
    if (documentName) note(`Document added: ${documentName}.`);
  } catch (err) { $('#q-error').textContent = err.message; }
  finally { button.disabled = false; }
}

function uploadNote(message) {
  if (!$('#v-chat').hidden) note(message);
  else $('#upload-status').textContent = message;
}
async function uploadPortfolio(file) {
  const summary = await api('/api/portfolio/upload', {method: 'POST', body: {csv: await file.text()}});
  const refreshed = await api('/api/profile'); state.profile = refreshed.profile; state.snapshot = refreshed.snapshot;
  if (!$('#v-chat').hidden) { renderChatChrome(); document.querySelector('#log .portfolio-start')?.remove(); }
  uploadNote(`Portfolio loaded: ${summary.holdings} holdings, ${usd(summary.marketValue)} total value.`);
  state.pendingPortfolio = null;
}
async function uploadDocument(file) {
  if (file.size > 2_000_000) throw Error('Choose a document under 2 MB.');
  const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(Error('Could not read file')); reader.readAsDataURL(file); });
  const result = await api('/api/attachment', {method: 'POST', body: {name: file.name, base64}});
  const refreshed = await api('/api/profile'); state.profile = refreshed.profile; state.snapshot = refreshed.snapshot;
  renderSavedDocuments();
  uploadNote(`Document added: ${result.name}. Its text can guide the chat; saved financial inputs are used in calculations.`);
  state.pendingDocument = null;
}

function connectPortfolio() { uploadNote('Direct brokerage connections are not available yet. Upload a portfolio CSV instead.'); }

// ---------- chat ----------
function renderChatChrome() {
  const p = persona(state.personaId), a = agent(state.agentId), s = state.snapshot;
  $('#chat-head').innerHTML = `${thumb(p)}<div><strong>${esc(p.name)}</strong><small>${p.textOnly ? 'Text conversation · Your AI teacher' : 'Your AI teacher · Learn along the way'} · AI-inspired, not affiliated</small></div>${s?.status === 'ok' ? `<div class="snap-mini">lowest ${usd(s.lowestMonth)}<br>essentials ${usd(s.essentialsTotal)}</div>` : ''}`;
  $('#persona-switch').innerHTML = orderedPersonas().map(x => `<button type="button" class="rail-item ${x.id === state.personaId ? 'on' : ''}" data-p="${esc(x.id)}">${thumb(x)}<span>${esc(displayName(x.name))}</span>${badge(x)}</button>`).join('');
  $('#agent-list').innerHTML = agents().map((x,i) => `<button type="button" class="rail-item coach-item tone-${i%4} ${x.id === state.agentId ? 'on' : ''}" data-a="${esc(x.id)}">${agentSymbol(x.id)}<span>${esc(displayName(x.name))}</span>${badge(x)}</button>`).join('');
  document.querySelectorAll('#persona-switch [data-p]').forEach(b => b.onclick = () => pickPersona(b.dataset.p));
  document.querySelectorAll('#agent-list [data-a]').forEach(b => b.onclick = () => pickAgent(b.dataset.a));
  syncVoiceAvailability();
  $('#suggest').innerHTML = starterPrompts().map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  document.querySelectorAll('#suggest .chip').forEach(c => c.onclick = () => send(c.textContent));
}
function starterPrompts() {
  return ['Summarize this demo profile', 'Explain the sample portfolio risks', 'Walk me through the sample budget'];
}
// Empty-state starters: visible questions instead of a blank log. Removed on the first send.
function showStarters() {
  $('#log').querySelectorAll('.starter').forEach(x => x.remove()); // only one set of suggestions at a time
  const el = document.createElement('div'); el.className = 'starter';
  el.innerHTML = `<p class="fine">Try one of these, or ask your own.</p><div class="chips">${starterPrompts().map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('')}</div>`;
  el.querySelectorAll('.chip').forEach(c => c.onclick = () => send(c.textContent));
  el.querySelector('[data-add-numbers]')?.addEventListener('click', renderIntake);
  $('#log').append(el);
}
const asksForNumbers = r => !r.turnId && /financial details|update your (?:numbers|details)|add your numbers/i.test(r.text || '');
function showFeature(x) {
  $('#feature-eyebrow').textContent = 'PERSPECTIVE PREVIEW';
  $('#feature-title').textContent = x.name;
  $('#feature-text').textContent = `${x.philosophy || x.job}. This perspective is planned; research and interactive support are still being developed.`;
  $('#feature-sources').replaceChildren(); $('#feature-try').hidden = true; $('#feature-try').onclick = null;
  $('#feature-plus').hidden = true;
  $('#feature-preview').showModal();
}
function blocked(x) { if (!x) return true; if (!x.built) { agent(x.id) ? showAgent(x) : showFeature(x); return true; } return false; }
function pickAgent(id) {
  const a = agent(id); if (id === state.agentId || blocked(a)) return;
  state.agentId = id; state.lastTurn = null; rememberChoice(); renderChatChrome();
  const feeds = sourcesFor(id).filter(d => d.status === 'live');
  note(`Switched to ${a.name}.${feeds.length ? ` It can request data from ${feeds.map(d => d.name).join(', ')}.` : ''} Ask your next question.`);
}
async function pickPersona(id) {
  const p = persona(id); if (id === state.personaId || blocked(p)) return;
  if (voice.active) endConversation();
  state.personaId = id; rememberChoice(); renderChatChrome();
  if (!state.lastTurn) {
    // Before the first question, switching teachers replaces the welcome instead of stacking copies.
    const fresh = !$('#log .msg.user');
    if (fresh) $('#log').innerHTML = '';
    note(`${p.name} is ready. Ask a question or explore a starting point below.`);
    if (fresh) showStarters();
    return;
  }
  const sk = skeleton();
  try { botMessage(await api('/api/repick', {method: 'POST', body: {turnId: state.lastTurn, personaId: id}})); }
  catch (e) { handleError(e); } finally { sk.stop(); }
}
function note(text) { const el = document.createElement('div'); el.className = 'msg note'; el.textContent = text; $('#log').append(el); el.scrollIntoView({block: 'nearest'}); }
function handleError(e) { note(e.message); }

// Shown the moment a question is sent. Past the slow threshold it says so honestly and keeps waiting;
// it never cuts the answer off or presents anything as verified early.
function skeleton(label) {
  const el = document.createElement('div'); el.className = 'msg bot skeleton'; el.setAttribute('aria-label', 'Working');
  el.innerHTML = `<div class="typing-head">${thumb(persona(state.personaId))}<span class="stage" role="status">${esc(label || `${persona(state.personaId).name} is thinking`)}</span></div><i></i><i></i><i></i>`; $('#log').append(el); el.scrollIntoView({block: 'nearest'});
  const slow = setTimeout(() => { const st = el.querySelector('.stage'); if (st) st.textContent = 'Still checking the numbers. This is taking longer than usual.'; }, state.config?.perf?.thresholdMs || 10000);
  return {stop() { clearTimeout(slow); el.remove(); }};
}

function calcCard(c) {
  const rows = Object.entries(c.result || {}).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => {
    const unit = c.units?.[k] || (/percent|pct|apr/i.test(k) ? 'percent' : /^(months|years|monthsOfEssentials|.*Count|.*Months|.*Years)$/i.test(k) ? 'count' : 'money');
    const shown = v === null ? 'n/a' : unit === 'percent' ? `${v}%` : unit === 'money' && typeof v === 'string' && /^-?\d+\.\d{2}$/.test(v) ? usd(v) : String(v);
    return `<tr><td>${esc(k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, x => x.toUpperCase()))}</td><td>${esc(shown)}</td></tr>`;
  }).join('');
  return `<div class="calc"><div class="ch"><span>${esc(c.label || c.name)}</span><span>${esc(c.inputs?.source || 'Based on your inputs')}</span></div><table>${rows}</table></div>`;
}

function sourceLink(c) {
  let url; try { url = new URL(c.url); } catch {}
  const label = esc(c.title);
  return url?.protocol === 'https:' ? `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
}

function botMessage(r) {
  const el = document.createElement('div'); el.className = 'msg bot';
  const calcs = (r.calculations || []).slice(1);
  const p = persona(r.personaId) || persona(state.personaId);
  el.innerHTML = `<div class="who">${p ? thumb(p) : ''}<div><strong>${esc(displayName(r.personaName || p?.name || ''))}</strong></div></div>
    <p class="say">${esc(r.text)}</p>
    ${voice.active && canSpeak(r) ? '<button class="btn text" type="button" data-listen>Listen</button><div class="voice-player" hidden><audio controls preload="none"></audio><button class="btn text" type="button" data-stop>Stop</button><p class="fine">AI-generated voice, not the real person.</p></div>' : ''}
    ${r.market ? `<p class="data-note">Data sources: ${esc(r.market.sources.join(', '))}. Latest price date: ${esc(r.market.asOf)}; individual fields may be older.</p>` : ''}
    ${calcs.length || r.citations?.length || r.optionsReviewed || (!r.conversational && r.disclosure) ? `<details class="answer-details"><summary>Sources & answer details</summary>
      ${calcs.map(calcCard).join('')}${r.citations?.length ? `<p class="sources">${r.citations.map(c => `${sourceLink(c)} <span>(${esc(c.ref)})</span>`).join('; ')}</p>` : ''}
      ${r.optionsReviewed ? `<p class="fine reviewed">This answer considered ${r.optionsReviewed} checked options.</p>` : ''}
      ${r.turnId && r.canExpand ? '<div class="meta"><button class="btn text" type="button" data-expand>Explore other options</button></div><div class="more-options" hidden></div>' : ''}
      ${r.conversational ? '' : `<p class="disclose">${esc(r.disclosure || '')}</p>`}</details>` : ''}
    ${asksForNumbers(r) ? '<div class="meta"><button class="btn primary" type="button" data-add-numbers>Add my numbers</button></div>' : ''}
    `;
  el.querySelector('[data-add-numbers]')?.addEventListener('click', renderIntake);
  el.querySelector('[data-listen]')?.addEventListener('click', () => speakReply(el, r));
  el.querySelector('[data-stop]')?.addEventListener('click', () => {++voice.epoch;if(voice.active)endConversation();else stopPlayback();});
  el.querySelector('[data-expand]')?.addEventListener('click', e => expandOptions(el, r, e.currentTarget));
  $('#log').append(el); el.scrollIntoView({behavior: 'smooth', block: 'start'});
  return el;
}

// ---------- more options (progressive: the first answer used a small verified set) ----------
async function expandOptions(el, r, btn) {
  const box = el.querySelector('.more-options');
  btn.disabled = true; btn.textContent = 'Finding more verified options...';
  try {
    const x = await api('/api/expand', {method: 'POST', body: {turnId: r.turnId}});
    box.hidden = false;
    box.innerHTML = x.added.length
      ? `<p class="fine">${x.added.length} more verified options (${x.total} total). Your mentor has not reviewed these yet, so the answer above is unchanged.</p>
         <ul class="opt-list">${x.added.map(o => `<li><strong>${esc(o.title)}</strong> <span class="fine">${esc(o.summary)}</span></li>`).join('')}</ul>
         <button class="btn text" type="button" data-review>Ask your mentor to review all ${x.total}</button>`
      : `<p class="fine">${esc(x.note || 'No additional distinct options fit this question.')}</p>`;
    btn.remove();
    box.querySelector('[data-review]')?.addEventListener('click', async e => {
      const b = e.currentTarget; b.disabled = true;
      const sk = skeleton(`Reviewing all ${x.total} options`);
      try { botMessage(await api('/api/repick', {method: 'POST', body: {turnId: r.turnId, personaId: state.personaId}})); }
      catch (err) { handleError(err); b.disabled = false; } finally { sk.stop(); }
    });
  } catch (e) { btn.disabled = false; btn.textContent = 'Explore other options'; note(e.message); }
}

async function send(text, {spoken = false, voiceSession = null} = {}) {
  text = text.trim(); if (!text) return;
  document.querySelector('#log .starter')?.remove();
  if (!voiceSession && voice.active) endConversation();
  stopPlayback('new-question');
  const speechEpoch = ++voice.epoch;
  const u = document.createElement('div'); u.className = 'msg user'; u.textContent = text; $('#log').append(u);
  if (spoken) u.insertAdjacentHTML('afterbegin', '<span class="via">You said</span>');
  $('#msg').value = ''; const btn = $('#composer button[type="submit"]'); btn.disabled = true;
  const sk = skeleton();
  try {
    const r = await api('/api/chat', {method: 'POST', body: {message: text, demoProfile: Boolean(state.profile?.demoIdentity?.fictional) || !(state.profile?.incomeHistory?.length || state.profile?.portfolio?.securities?.length), personaId: state.personaId, agentId: state.agentId, learningModuleId: teacherLessonContext()?.id, learningToolTitle: teacherLessonContext()?.id ? undefined : teacherLessonContext()?.title}}); state.lastTurn = r.turnId;
    const el = botMessage(r); refreshMemory();
    if (r.profileUpdated) el.insertAdjacentHTML('beforeend', '<p class="fine">Saved inputs updated from your message.</p>');
    if (voiceSession && voice.active && voice.session === voiceSession && canSpeak(r) && speechEpoch === voice.epoch) {
      await speakReply(el, r, voiceSession);
    }
    else if (spoken && voice.active && voice.session === voiceSession) note('Voice is unavailable right now. The written answer is above.');
  }
  catch (e) { handleError(e); }
  finally {
    try { const saved = await api('/api/workspace/demo'); state.profile=saved.profile; state.snapshot=saved.budget.snapshot; renderChatChrome(); } catch {}
    sk.stop(); btn.disabled = false; if (!voice.active) $('#msg').focus();
  }
}
async function refreshMemory() { try { const {memory} = await api('/api/memory'); $('#memory').innerHTML = memory.length ? memory.map((m, i) => `<li>${esc(m.fact)} <button class="btn text" type="button" data-memory="${i}" aria-label="Forget ${esc(m.fact)}">Forget</button></li>`).join('') : '<li>Nothing yet. Tell me about your goals.</li>'; $('#memory').querySelectorAll('[data-memory]').forEach(b => b.onclick = async () => { await api('/api/memory', {method: 'DELETE', body: {fact: memory[Number(b.dataset.memory)].fact}}); refreshMemory(); }); } catch {} }

async function restoreChat(history) {
  const last = [...history].reverse().find(x => x.role === 'assistant')?.response;
  if (last?.personaId && persona(last.personaId)) state.personaId = last.personaId;
  if (last?.agentId && agent(last.agentId)) state.agentId = last.agentId;
  if (!usable(persona(state.personaId))) return openStartChoice();
  state.lastTurn = last?.turnId || null;
  rememberChoice();
  $('#log').innerHTML = '';
  renderChatChrome(); refreshMemory(); show('v-chat');
  for (const item of history) {
    if (item.role === 'user') { const el = document.createElement('div'); el.className = 'msg user'; el.textContent = item.text; $('#log').append(el); }
    else if (item.response) botMessage(item.response);
  }
}

function startChat() {
  if (!usable(persona(state.personaId))) return openStartChoice();
  if (!usable(agent(state.agentId))) state.agentId = 'budget';
  rememberChoice();
  if (!$('#log .msg.user')) state.lastTurn = null; renderChatChrome(); refreshMemory(); show('v-chat');
  if ($('#log .msg.user')) { $('#msg').focus(); return; }
  $('#log').innerHTML = '';
  const p = persona(state.personaId), a = agent(state.agentId);
  if (['investing','equity'].includes(a.id)) {
    note(state.profile?.portfolio ? `Your teacher can explore your saved holdings through ${p.name}'s researched perspective.` : 'Import your holdings to explore your portfolio with your teacher.');
    if (!state.profile?.portfolio) { const el = document.createElement('div'); el.className = 'portfolio-start'; el.innerHTML = '<button class="btn primary" type="button" data-holdings>Upload holdings CSV</button><button class="btn text" type="button" data-context-open>Open context hub</button>'; el.querySelector('[data-holdings]').onclick = () => $('#portfolio-file').click(); el.querySelector('[data-context-open]').onclick = () => $('#context-dialog').showModal(); $('#log').append(el); }
  } else note(p.textOnly ? `${p.name} is ready for text chat. Explore a perspective or bring a research question.` : state.profile?.incomeHistory?.length ? `${p.name} is ready to talk through your plan. Ask anything below.` : `Say hello, ask a question, or choose Talk live for a voice conversation.`);
  if (state.need === 'retirement') note('Explore retirement questions here. A dedicated retirement scenario tool is still planned.');
  showStarters();
  $('#msg').focus();
}

// ---------- all-inclusive offer (billing is not active) ----------
function openUnlock() {
  $('#unlock-msg').textContent = 'The planned offer is one month free, then $2.99/month for all perspectives and features. Billing is not active in this demo.';
  $('#unlock-test').hidden = true;
  $('#unlock-go').textContent = 'Explore the demo';
  $('#unlock').showModal();
}
$('#unlock-go').addEventListener('click', e => {
  e.preventDefault(); $('#unlock').close(); openStartChoice();
});
async function handleCheckoutReturn() {
  const q = new URLSearchParams(location.search);
  if (!q.has('checkout')) return;
  history.replaceState(null, '', location.pathname);
  banner('Billing is not active in this demo. Available perspectives and tools need no checkout.');
}

function renderSavedDocuments() {
  const docs = state.profile?.documents || [];
  $('#context-saved-documents').innerHTML = docs.length ? `<strong>Saved to this chat</strong><ul>${docs.map(d=>`<li>${esc(d.name)}</li>`).join('')}</ul>` : '';
}
// Uploaded documents and holdings are saved immediately; links remain browser references.
function setupContextHub() {
  const dialog = $('#context-dialog');
  document.querySelectorAll('[data-context]').forEach(b => b.onclick = async () => { dialog.showModal(); renderSavedDocuments(); try { const r = await api('/api/profile'); state.profile=r.profile; state.snapshot=r.snapshot; renderSavedDocuments(); } catch {} });
  $('#context-done').onclick = () => { dialog.close(); if ($('#v-chat').hidden && $('#v-workspace').hidden && $('#v-learning').hidden) startChat(); };
  $('#context-close').onclick = () => dialog.close();
  $('#feature-close').onclick = () => $('#feature-preview').close();
  $('#feature-plus').onclick = () => { $('#feature-preview').close(); openUnlock(); };
  try { const saved = sessionStorage.getItem('mentor-labs-portfolio-link'); if (saved) { $('#portfolio-link').value = saved; $('#portfolio-link-status').textContent = 'Reference saved for this browser session; no account connected.'; } } catch {}
  $('#context-files').onchange = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    $('#context-done').disabled = true; $('#context-file-status').textContent = 'Saving document…';
    try {
      await uploadDocument(file); $('#context-file-status').textContent = `${file.name} added to this chat.`;
    } catch (err) { $('#context-file-status').textContent = err.message; }
    finally { $('#context-done').disabled = false; }
    e.target.value = '';
  };
  $('#portfolio-save').onclick = () => {
    const value = $('#portfolio-link').value.trim();
    if (!value) { $('#portfolio-link-status').textContent = 'Paste a portfolio URL first.'; return; }
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Invalid URL');
      sessionStorage.setItem('mentor-labs-portfolio-link', url.href);
      $('#portfolio-link-status').textContent = 'Reference saved for this browser session. No brokerage connection or holdings import was made.';
    } catch { $('#portfolio-link-status').textContent = 'Enter a valid web URL without a username or password.'; }
  };
  const done = s => { $('#context-csv-status').textContent = `Imported ${s.holdings} holdings worth ${usd(s.marketValue)}. Estimated annual fees: ${usd(s.estimatedAnnualFees)}.`; };
  $('#context-csv').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 1024 * 1024) { $('#context-csv-status').textContent = 'Choose a CSV smaller than 1 MB.'; return; }
    try { await uploadPortfolio(file); done(state.profile.portfolio); }
    catch (err) { $('#context-csv-status').textContent = err.message; }
  };
  $('#context-sample').onclick = async () => { try { const summary = await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}}); const refreshed = await api('/api/profile'); state.profile = refreshed.profile; state.snapshot = refreshed.snapshot; if (!$('#v-chat').hidden) renderChatChrome(); done(summary); } catch (err) { $('#context-csv-status').textContent = err.message; } };
}

// ---------- sample profile ----------
const DEMO = {
  name: 'Jordan', incomeVaries: true,
  incomeHistory: [['2026-05', '2310.00'], ['2026-06', '2950.00'], ['2026-07', '2120.00'], ['2026-08', '2640.00'], ['2026-09', '1780.00'], ['2026-10', '2410.00']].map(([month, amount]) => ({month, amount})),
  incomeSources: ['hourly_job', 'gig_delivery'],
  bills: [{name: 'Rent', amount: '725.00', dueDay: 1}, {name: 'Phone', amount: '45.00', dueDay: 15}, {name: 'Car insurance', amount: '138.00', dueDay: 20}, {name: 'Streaming', amount: '23.00', dueDay: 8}],
  expenses: [{name: 'food', amount: '380.00'}, {name: 'gas transport', amount: '160.00'}, {name: 'fun', amount: '150.00'}],
  debts: [{name: 'Credit card', balance: '1340.00', aprPercent: '24.9', minPayment: '45.00'}, {name: 'Car loan', balance: '9800.00', aprPercent: '7.9', minPayment: '289.00'}],
  savings: '420.00', goals: ['stop_paycheck_to_paycheck', 'pay_off_debt'],
  trust: {priorAdvisor: 'couldnt_afford', aiTrust: 2, needs: ['show_the_math', 'known_philosophy']}, personaHint: 'debt-free-coach',
};

// ---------- voice ----------
// One tap starts a hands-free, turn-taking conversation. ElevenLabs transcribes each
// utterance and speaks the exact Claude answer stored on the server. The key stays there.
const voice = {active: false, session: 0, rec: null, stream: null, context: null, analyser: null,
  timer: null, starting: false, epoch: 0};
const canSpeak = r => Boolean((r?.voiceTurnId || r?.turnId) && state.config?.voice && state.config.voicePersonas?.includes(r.personaId));
function voiceStatus(text, kind = '') { const s = $('#voice-status'); s.textContent = text; s.className = 'voice-status ' + kind; }
function micUI() {
  const m = $('#mic'); m.classList.toggle('rec', voice.active);
  m.setAttribute('aria-pressed', String(voice.active));
  m.setAttribute('aria-label', voice.active ? 'End voice conversation' : 'Start voice conversation');
  $('#mic-label').textContent = voice.active ? 'End call' : 'Talk live';
}
const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';

// Development-only voice timing (localStorage mmDebugPerf=1); never shown to users.
const perfDebug = (() => { try { return localStorage.getItem('mmDebugPerf') === '1'; } catch { return false; } })();
let voiceT0 = null;
function closeCapture() {
  clearInterval(voice.timer); voice.timer = null;
  const rec = voice.rec; voice.rec = null;
  if (rec?.state === 'recording') rec.stop();
  voice.stream?.getTracks().forEach(t => t.stop()); voice.stream = null;
  voice.context?.close().catch(() => {}); voice.context = null; voice.analyser = null;
}
function endConversation(message = 'Voice conversation ended.') {
  voice.active = false; voice.session++;++voice.epoch;
  closeCapture(); stopPlayback(); micUI(); voiceStatus(message);
}
async function startListening(session) {
  if (playback.active && !playback.active.audio.ended) return; // Never capture speaker output while a reply is loading or playing.
  if (!voice.active || session !== voice.session || voice.starting || voice.rec) return;
  voice.starting = true; voiceStatus('Opening microphone...');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true}});
    if (!voice.active || session !== voice.session) { stream.getTracks().forEach(t => t.stop()); return; }
    voice.stream = stream;
    const Context = window.AudioContext || window.webkitAudioContext;
    voice.context = new Context();
    if (voice.context.state === 'suspended') await voice.context.resume();
    if (!voice.active || session !== voice.session) { stream.getTracks().forEach(t => t.stop()); return; }
    const source = voice.context.createMediaStreamSource(stream);
    voice.analyser = voice.context.createAnalyser();
    voice.analyser.fftSize = 2048;
    source.connect(voice.analyser);
    const samples = new Uint8Array(voice.analyser.fftSize);
    const mime = pickMime(), rec = new MediaRecorder(stream, mime ? {mimeType: mime} : undefined);
    voice.rec = rec;
    const chunks = [], started = Date.now();
    let heardSpeech = false, speakingMs = 0, silenceSince = 0, previous = started;
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onerror = () => {
      if (voice.active && session === voice.session) {
        endConversation('');
        voiceStatus('Microphone recording failed. Try again or type your question.', 'warn');
      }
    };
    rec.onstop = () => {
      if (voice.rec === rec) voice.rec = null;
      if (voice.active && session === voice.session) {
        if (heardSpeech) finishUtterance(session, new Blob(chunks, {type: rec.mimeType || 'audio/webm'}), Date.now() - started);
        else startListening(session);
      }
    };
    rec.start(); voiceStatus('Listening… Speak naturally. Pause when you finish.', 'rec');
    voice.timer = setInterval(() => {
      if (!voice.active || session !== voice.session || rec.state !== 'recording') return;
      voice.analyser.getByteTimeDomainData(samples);
      let power = 0;
      for (const sample of samples) power += ((sample - 128) / 128) ** 2;
      const speaking = Math.sqrt(power / samples.length) > 0.025;
      const now = Date.now();
      if (speaking) { speakingMs += now - previous; silenceSince = 0; if (speakingMs >= 250) heardSpeech = true; }
      else { speakingMs = 0; if (heardSpeech) silenceSince ||= now; }
      previous = now;
      if ((heardSpeech && silenceSince && now - silenceSince >= 2500) || now - started >= 60000) {
        voiceStatus('Thinking…');
        closeCapture();
      }
    }, 100);
  } catch (e) {
    if (session === voice.session) {
      endConversation('');
      voiceStatus(['NotAllowedError', 'SecurityError'].includes(e.name) ? 'Microphone access is blocked. Allow it in your browser settings, or type your question.'
        : e.name === 'NotFoundError' ? 'No microphone found. Type your question instead.'
        : `Could not start the microphone: ${e.message}`, 'warn');
    }
    stream?.getTracks().forEach(t => t.stop());
  } finally {
    voice.starting = false;
    if (voice.active && voice.session !== session && !voice.rec) startListening(voice.session);
  }
}
async function finishUtterance(session, blob, duration) {
  if (!voice.active || session !== voice.session) return;
  if (duration < 600 || blob.size < 1000) return startListening(session);
  voiceT0 = performance.now();
  voiceStatus('Turning your words into text…');
  try {
    const res = await fetch('/api/voice/transcribe', {method: 'POST', headers: {'Content-Type': blob.type.split(';')[0], 'X-Session-Id': sid}, body: blob});
    const data = await res.json().catch(() => ({}));
    if (!voice.active || session !== voice.session) return;
    if (!res.ok) throw new Error(data.error || 'We could not hear that. Try again or type your question.');
    voiceStatus('Your AI perspective is preparing an answer…');
    await send(data.text, {spoken: true, voiceSession: session});
  } catch (e) {
    if (voice.active && session === voice.session) voiceStatus(e.message, 'warn');
  } finally {
    if (voice.active && session === voice.session) startListening(session);
  }
}

const playback = new VoicePlayback();
function stopPlayback(reason = 'user') { playback.stop(typeof reason === 'string' ? reason : 'user'); }
async function speakReply(el, r, session = null) {
  if (!voice.active) return false;
  const box = el.querySelector('.voice-player'), btn = el.querySelector('[data-listen]'), audio = box?.querySelector('audio');
  if (!box || (session && (!voice.active || session !== voice.session))) return false;
  if (!session && voice.active) endConversation();
  let settle;const completed = new Promise(resolve => settle = resolve);
  let played = false;
  await playback.start(audio, async (signal, requestId) => {
    const res = await fetch('/api/voice/speak', {method:'POST', signal,
      headers:{'Content-Type':'application/json','X-Session-Id':sid,'X-Voice-Request-Id':requestId},
      body:JSON.stringify({turnId:r.voiceTurnId || r.turnId,personaId:r.personaId,voiceReplyId:r.voiceReplyId})});
    if (!res.ok) throw Error((await res.json().catch(()=>({}))).error || 'Audio is unavailable. Your written answer is above.');
    return res.blob();
  }, (status,error) => {
    if (['ended','stopped','error','blocked'].includes(status)) settle(status === 'ended');
    if (session && status === 'blocked') endConversation('Playback needs a click. Use Listen to retry.');
    if (status === 'playing') {played = true;if (session && voice.active && voice.session === session) voiceStatus('Playing the AI-generated answer…');}
    box.hidden = false;
    btn.disabled = status === 'loading'; btn.hidden = ['playing','ended','blocked'].includes(status);
    btn.textContent = status === 'loading' ? 'Preparing audio…' : 'Listen';
    el.classList.toggle('speaking',status === 'playing');
    if (status === 'blocked') box.querySelector('.fine').textContent = 'Press play to listen. AI-generated voice, not the real person.';
    if (error) note(error.message);
  });
  return session ? completed : played;
}
window.addEventListener('pagehide', () => {endConversation('');});

function syncVoiceAvailability() {
  const available = !persona(state.personaId)?.textOnly && state.config.voicePersonas?.includes(state.personaId);
  $('#mic').hidden = !available; $('#voice-status').hidden = !available;
}
function setupVoice() {
  const mic = $('#mic');
  syncVoiceAvailability();
  if (!state.config.voice) {
    $('#mic-label').textContent = 'Talk live';
    mic.setAttribute('aria-label', 'Live voice setup status');
    mic.onclick = () => voiceStatus('Live voice is not configured on this server yet. The site owner needs to connect the voice service.', 'warn');
    return;
  }
  micUI();
  mic.addEventListener('click', () => {
    if (persona(state.personaId)?.textOnly || !state.config.voicePersonas?.includes(state.personaId)) return;
    if (voice.active) return endConversation();
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !(window.AudioContext || window.webkitAudioContext))
      return voiceStatus('Live voice is unavailable in this browser. Type your question instead.', 'warn');
    stopPlayback(); voice.active = true; voice.session++; micUI();
    startListening(voice.session);
  });
}

// ---------- boot ----------
async function boot() {
  state.config = await api('/api/config');
  try { const demo = await api('/api/workspace/demo'); state.profile=demo.profile; state.snapshot=demo.budget.snapshot; } catch {}
  state.config.catalog.personas.forEach(p => { p.name = displayName(p.name); });
  try { state.tier = (await api('/api/me')).tier; } catch {}
  $('#tier').hidden = true;
  try { const saved = JSON.parse(localStorage.getItem('mentor-labs-choice') || 'null'); if (saved && usable(persona(saved.personaId))) { state.personaId=saved.personaId; state.agentId=usable(agent(saved.agentId)) ? saved.agentId : 'budget'; state.need=saved.need || 'question'; } } catch {}
  $('#engine').textContent = state.config.engine === 'live' ? 'Live AI' : state.config.engine === 'mock' ? 'Local test mode' : 'AI unavailable';
  renderLanding();
  $('#home').onclick = e => { e.preventDefault(); show('v-landing'); };
  $('#start').onclick = () => openStartChoice();
  $('#intake-skip').onclick = startChat;
  $('#head-start').onclick = () => openStartChoice(); $('#try-chat').onclick = () => openStartChoice();
  $('#start-choice-form').onsubmit = submitStartChoice;
  $('#start-choice-close').onclick = () => $('#start-choice').close();
  document.querySelectorAll('[data-start-need]').forEach(b => b.onclick = () => openStartChoice({need:b.dataset.startNeed}));
  $('#chat-plan').onclick = showImportSoon; $('#chat-import') && ($('#chat-import').onclick = showImportSoon);
  $('#demo').onclick = async () => { await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}}).catch(() => {}); submitQuiz(DEMO); };
  document.querySelectorAll('[data-unlock]').forEach(b => b.onclick = openUnlock);
  setupContextHub();
  $('#intake-form').onsubmit = submitIntake;
  $('#connect-portfolio').onclick = connectPortfolio;
  $('#chat-connect-portfolio').onclick = connectPortfolio;
  $('#upload-portfolio').onclick = () => $('#portfolio-file').click();
  $('#chat-upload-portfolio').onclick = () => $('#portfolio-file').click();
  $('#upload-document').onclick = () => $('#document-file').click();
  $('#chat-upload-document').onclick = () => $('#document-file').click();
  $('#portfolio-file').onchange = async e => { const file = e.target.files?.[0]; if (!file) return; try { await uploadPortfolio(file); } catch (err) { uploadNote(err.message); } e.target.value = ''; };
  $('#document-file').onchange = async e => { const file = e.target.files?.[0]; if (!file) return; try { await uploadDocument(file); } catch (err) { uploadNote(err.message); } e.target.value = ''; };
  $('#composer').onsubmit = e => { e.preventDefault(); if (voice.active) endConversation('Voice conversation ended.'); send($('#msg').value); };
  setupVoice();
  $('#toggle-chat-sidebar').onclick = () => { const hidden = document.body.classList.toggle('chat-sidebar-hidden'); $('#toggle-chat-sidebar').setAttribute('aria-expanded', String(!hidden)); };
  $('#restart').onclick = async () => { if (!confirm('Start over? Your answers and chat will be cleared.')) return; await api('/api/session', {method: 'DELETE'}).catch(() => {}); location.href = '/'; };
  await handleCheckoutReturn();
  try { const r = await api('/api/profile'); state.profile = r.profile; state.snapshot = r.snapshot; const {history} = await api('/api/history'); if (history.length) { await restoreChat(history); return; } if (r.profile?.incomeHistory?.length) { startChat(); return; } } catch {}
  show('v-landing');
}
boot().then(() => {
  const preview = new URLSearchParams(location.search);
  if (preview.get('view') === 'landing') show('v-landing');
  if (preview.get('view') === 'workspace') openWorkspace(preview.get('tab') === 'portfolio' ? 'portfolio' : 'budget');
  if (preview.get('view') === 'learning') openLearning();
}).catch(e => banner(`The app could not load: ${e.message}`, true));
// Animate each landing section once as it enters view, without hiding content.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const sections = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('section-enter');
      sections.unobserve(entry.target);
    }
  }, {threshold:0.08});
  document.querySelectorAll('#v-landing > .band').forEach(section => sections.observe(section));
}

// Lessons are optional; the user reviews the question before sending it.
let learningQuestion = '';
document.addEventListener('mentor:learn', e => {
  learningQuestion = 'Teach me the core ideas in ' + String(e.detail?.title || 'this lesson').slice(0,120) + '. Explain why they matter, give me a practical reflection exercise, and help me check my understanding.';
  openStartChoice({need:'question'});
});
document.querySelector('#start-choice')?.addEventListener('submit', () => {
  if (learningQuestion && !document.querySelector('#start-choice').open) {document.querySelector('#msg').value=learningQuestion;document.querySelector('#msg').focus();learningQuestion='';}
});

// One teacher conversation, shared with the learning and planning workspace.
// Dashboard design pass (Nov 7): the Dashboard opens the standalone Investing/Budget page.
// The Dashboard (Investing/Budget design pass) mounts inside the app, under the shared header,
// with the built-in teacher dock available. The previous workspace.js is kept but no longer loaded.
function openWorkspace(tab) {show('v-workspace');import('/dashboard.js?v=13').then(m=>m.mountDashboard(document.querySelector('#dashboard-root'),tab==='portfolio'||tab==='investing'?'investing':tab==='budget'?'budget':undefined)).catch(e=>banner('The dashboard could not load: '+e.message,true));}
function openLearning() {show('v-learning');}
document.querySelectorAll('[data-open-workspace]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openWorkspace(b.dataset.openWorkspace);}));
document.querySelectorAll('[data-open-learning]').forEach(b=>b.addEventListener('click',openLearning));
document.querySelectorAll('[data-return-chat]').forEach(b=>b.addEventListener('click',()=>{if(state.personaId)startChat();else openStartChoice();}));
document.addEventListener('mentor:show-learning',openLearning);
document.addEventListener('mentor:edit-finances',renderIntake);
document.addEventListener('mentor:inputs-updated',async()=>{if(voice.active)endConversation('Your saved inputs changed.');state.lastTurn=null;const r=await api('/api/profile');state.profile=r.profile;state.snapshot=r.snapshot;});
document.addEventListener('mentor:workspace-question',e=>{learningQuestion=String(e.detail?.question||'').slice(0,2000);openStartChoice({need:/portfolio|holdings|earnings/.test(learningQuestion)?'future':'question'});});

document.addEventListener('mentor:guidelines-updated',()=>{state.lastTurn=null;if(voice.active)endConversation('Your saved review guidelines changed.');});

// One persistent conversation, available alongside lessons and financial tools.
const teacherDockStyle=document.createElement('link');teacherDockStyle.rel='stylesheet';teacherDockStyle.href='/teacher-dock.css';document.head.append(teacherDockStyle);
const teacherChatPane = document.querySelector('#v-chat .chat-main');
const teacherChatAnchor = document.createComment('Teacher chat home');
teacherChatPane.before(teacherChatAnchor);
const teacherDock = document.createElement('aside');
teacherDock.id = 'teacher-dock';teacherDock.hidden = true;
teacherDock.setAttribute('aria-label','Ask your teacher');
teacherDock.innerHTML = '<header class="teacher-dock-header"><div><strong>Ask your teacher</strong><small id="teacher-dock-context"></small></div><button type="button" class="btn text" id="teacher-dock-close" aria-label="Close teacher chat">Close</button></header><div id="teacher-dock-body"></div>';
document.body.append(teacherDock);
const teacherLauncher = document.createElement('button');
teacherLauncher.id='teacher-launcher';teacherLauncher.type='button';teacherLauncher.className='btn primary';teacherLauncher.textContent='Ask your teacher';teacherLauncher.hidden=true;
teacherLauncher.setAttribute('aria-controls','teacher-dock');teacherLauncher.setAttribute('aria-expanded','false');document.body.append(teacherLauncher);
function teacherLessonContext(){
  if(document.querySelector('#v-learning').hidden)return null;
  try{const frame=document.querySelector('#learning-frame'),url=new URL(frame.contentWindow.location.href),title=frame.contentDocument.querySelector('#detail-title')?.textContent;return {id:url.pathname.endsWith('/lesson.html')?url.searchParams.get('topic'):null,title:title||'Learning guide'};}catch{return null;}
}
function closeTeacherDock(focus=false){
  teacherChatAnchor.after(teacherChatPane);teacherDock.hidden=true;teacherLauncher.setAttribute('aria-expanded','false');document.body.classList.remove('teacher-docked');if(focus&&!teacherLauncher.hidden)teacherLauncher.focus();
}
function syncTeacherDock(id){
  const eligible=['v-learning','v-workspace'].includes(id);
  if(typeof teacherLauncher==='undefined')return;
  teacherLauncher.hidden=!eligible;if(!eligible)closeTeacherDock();
}
function openTeacherDock(){
  if(!usable(persona(state.personaId))){openStartChoice();return;}
  const currentView=views.find(id=>!$('#'+id).hidden);
  if(!$('#log').children.length){startChat();show(currentView);}
  renderChatChrome();document.querySelector('#teacher-dock-body').append(teacherChatPane);
  updateTeacherDockContext();
  teacherDock.hidden=false;teacherLauncher.setAttribute('aria-expanded','true');document.body.classList.add('teacher-docked');$('#msg').focus();
}
teacherLauncher.onclick=openTeacherDock;$('#teacher-dock-close').onclick=()=>closeTeacherDock(true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!teacherDock.hidden&&!document.querySelector('dialog[open]')){e.preventDefault();closeTeacherDock(true);}});
document.addEventListener('mentor:learning-page',()=>{if(!teacherDock.hidden){const context=teacherLessonContext();$('#teacher-dock-context').textContent=context?'Alongside '+context.title:'Your teacher';}});

function updateTeacherDockContext(){
  const context=teacherLessonContext();
  if(context){$('#teacher-dock-context').textContent='Alongside '+context.title;return;}
  const tab=document.querySelector('[data-workspace-tab][aria-pressed="true"]')?.dataset.workspaceTab;
  let isSample=document.querySelector('#dashboard-root')?.dataset[tab==='portfolio'?'samplePortfolio':'sampleBudget']==='true';
  if(tab==='portfolio'){try{isSample=document.querySelector('#exact-portfolio-frame')?.contentWindow.MentorPortfolio?.getState()?.sample??isSample;}catch{}}
  $('#teacher-dock-context').textContent='Fictional demo profile · shared with your teacher';
}
document.addEventListener('mentor:workspace-rendered',()=>{if(!teacherDock.hidden)updateTeacherDockContext();});
document.addEventListener('click',e=>{if(e.target.closest('[data-workspace-tab]')&&!teacherDock.hidden)updateTeacherDockContext();});
