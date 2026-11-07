import {VoicePlayback} from './voice-playback.js';
// Mentor Labs SPA: free starter chat, short intake, specialist catalog, and coaching chat.
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
  return data;
}

const state = {config: null, tier: 'free', answers: {}, i: 0, profile: null, snapshot: null, personaId: 'debt-free-coach', agentId: 'budget', lastTurn: null};
const DEMO_PERSONA = 'debt-free-coach';
const DEMO_AGENT = 'budget';
const views = ['v-landing', 'v-quiz', 'v-chat'];
function show(id) {
  if (id !== 'v-chat' && voice.active) endConversation();
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  document.body.classList.toggle('chat-open', id === 'v-chat');
  const landing = id === 'v-landing';
  $('#nav').hidden = !landing; $('#head-start').hidden = !landing; $('#restart').hidden = landing;
  $('#engine').hidden = landing;
  window.scrollTo(0, 0);
}
function banner(text, warn = false) { const b = $('#banner'); b.textContent = text; b.className = 'banner' + (warn ? ' warn' : ''); b.hidden = !text; }

// ---------- catalog helpers ----------
const freeFirst = list => [...list].sort((a,b) => Number(statusLabel(a) === 'Plus') - Number(statusLabel(b) === 'Plus'));
const personas = () => freeFirst(state.config.catalog.personas);
const agents = () => freeFirst(state.config.catalog.agents);
const persona = id => personas().find(p => p.id === id);
const agent = id => agents().find(a => a.id === id);
const allowed = x => x.tier === 'free' || state.tier === 'plus';
const starterCoach = x => x?.id === 'budget' && persona(state.personaId)?.built && persona(state.personaId)?.tier === 'free';
const usable = x => x?.built && (allowed(x) || starterCoach(x));
const statusLabel = x => x?.tier === 'free' || x?.id === 'budget' ? 'Free' : 'Plus';
const badge = x => `<span class="tag ${statusLabel(x) === 'Plus' ? 'plus' : 'free'}" ${statusLabel(x) === 'Plus' ? 'title="Mentor Labs Plus" aria-label="Mentor Labs Plus"' : ''}>${statusLabel(x)}</span>`;
const initials = name => name.replace(/^The /, '').split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const art = (p, cls = 'frame') => `<div class="${cls}">${p.image ? `<img src="${esc(p.image)}" alt="AI-generated likeness inspired by ${esc(p.inspiredBy)}" width="640" height="800" loading="lazy" decoding="async">` : `<span class="mono-gram">${esc(initials(p.name))}</span>`}</div>`;
const thumb = p => `<span class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(initials(p.name))}</span>`;

const agentSymbol = id => {
  const paths = {budget:'M5 4h14v16H5z M8 8h8 M8 12h3 M8 16h5',debt:'M5 7h14 M5 12h10 M5 17h6',savings:'M12 3v18 M6 7h9a3 3 0 010 6H9a3 3 0 000 6h9',tax:'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h3',credit:'M3 6h18v12H3z M3 10h18 M6 15h4',retirement:'M4 18h16 M7 18V9 M12 18V5 M17 18v-6',insurance:'M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7z',investing:'M4 19V5 M4 19h16 M7 15l4-5 4 2 5-7',equity:'M4 20l6-6 M14 4a6 6 0 110 12 6 6 0 010-12',real_estate:'M3 11l9-8 9 8 M6 9v12h12V9 M10 21v-7h4v7',life:'M5 5h14v15H5z M5 9h14 M8 3v4 M16 3v4',business:'M3 7h18v13H3z M8 7V3h8v4 M3 12h18',biz_cash:'M3 8h18 M17 4l4 4-4 4 M21 16H3 M7 12l-4 4 4 4',biz_strategy:'M4 20L20 4 M12 4h8v8 M4 12v8h8',pricing:'M3 5h10l8 8-8 8-10-10z M7 9h.1',income:'M4 20h16 M6 16l5-5 4 2 5-9 M15 4h5v5'};
  return `<span class="agent-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[id] || paths.budget}"/></svg></span>`;
};

// ---------- landing ----------
function renderLanding() {
  $('#personas').innerHTML = personas().map(p => `<div class="portrait ${usable(p) ? '' : 'locked'}">${art(p)}${p.tier === 'plus' ? `<button type="button" class="tag plus portrait-plus" data-unlock aria-label="Explore Plus for ${esc(p.name)}">Plus</button>` : badge(p)}
    <h3>${esc(p.name)}</h3><p class="portrait-source">${p.textOnly ? 'AI perspective · Text chat' : 'AI-inspired perspective'}</p><p>${esc(p.philosophy)}.</p>${usable(p) ? `<button class="btn outline" type="button" data-chat-mentor="${esc(p.id)}">Chat with ${esc(displayName(p.name).split(' ')[0])}</button>` : ''}</div>`).join('');
  $('#agents').innerHTML = `<div class="agent-grid">${agents().map((a,i) => `<button type="button" class="agent-card tone-${i%4}" data-a="${a.id}">${agentSymbol(a.id)}<span class="agent-card-top"><strong>${esc(a.name)}</strong>${badge(a)}</span><span class="agent-card-job">${esc(a.job)}</span><span class="agent-availability">${a.built ? "Available" : "Planned"}</span></button>`).join('')}</div>`;
  document.querySelectorAll('#agents [data-a]').forEach(b => b.onclick = () => { const a = agent(b.dataset.a); if (a.id === 'budget') renderIntake(); else showAgent(a); });
  document.querySelectorAll('#personas [data-unlock]').forEach(b => b.onclick = openUnlock);
  document.querySelectorAll('[data-chat-mentor]').forEach(b => b.onclick = () => { state.personaId = b.dataset.chatMentor; state.agentId = 'budget'; startChat(); });
  renderSources();
}

// ---------- live data connections ----------
const sources = () => state.config.catalog.dataSources || [];
const sourcesFor = id => sources().filter(d => d.agents.includes(id));
const agentNames = ids => ids.map(id => agent(id)?.name.replace(/ Agent$/, '')).filter(Boolean).join(', ');
const sourceState = d => d.status === 'live' ? (d.connected ? 'Configured · fetched on request' : 'Not configured') : 'Planned';
function sourceCard(d) {
  return `<article class="source-card ${esc(d.status)}"><div class="source-top"><a href="${esc(d.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(d.name)}</strong></a><span class="tag ${d.tier === 'plus' ? 'plus' : ''}">${d.tier === 'plus' ? 'Plus' : 'Free'}</span></div>
    <p>${esc(d.provides)}</p><small><span class="dot ${d.status === 'live' ? (d.connected ? 'on' : 'half') : ''}" aria-hidden="true"></span>${esc(sourceState(d))}</small><details class="source-detail"><summary>Used by</summary><small>${esc(agentNames(d.agents))}</small></details></article>`;
}
function renderSources() {
  const el = $('#data-sources'); if (!el) return;
  const free = sources().filter(d => d.tier === 'free'), plus = sources().filter(d => d.tier === 'plus');
  const openGroups = new Map([...el.querySelectorAll('[data-source-tier]')].map(d => [d.dataset.sourceTier, d.open]));
  const group = (tier, title, list) => `<details class="source-collection" data-source-tier="${tier}" ${openGroups.get(tier) !== false ? 'open' : ''}><summary>${title}<span>${list.length} sources</span></summary><div class="source-grid">${list.map(sourceCard).join('')}</div></details>`;
  el.innerHTML = group('free', 'Free data integrations', free) + group('plus', 'Plus connections', plus) + `<p class="source-note">Configured means ready to request, not a verified response. Snapshot fallback: ${esc(state.config.marketSnapshotAsOf || 'dated in each answer')}.</p>`;
}
function sourceList(id) {
  const list = sourcesFor(id);
  if (!list.length) return '<p class="fine">This agent works from your own inputs and code-checked calculations. No market feed is attached yet.</p>';
  return `<p class="section-eyebrow">DATA THIS AGENT READS</p><ul class="source-list">${list.map(d => `<li><strong>${esc(d.name)}</strong> <span class="tag ${d.tier === 'plus' ? 'plus' : ''}">${d.tier === 'plus' ? 'Plus · planned' : esc(sourceState(d))}</span><br><small>${esc(d.provides)}</small></li>`).join('')}</ul>`;
}
function showAgent(a) {
  const ready = a.built && usable(a);
  $('#feature-eyebrow').textContent = ready ? 'SPECIALIST AGENT · FREE' : 'PLUS LIBRARY';
  $('#feature-title').textContent = a.name;
  $('#feature-text').textContent = ready ? `${a.job}. Every number it quotes comes from these sources and is checked in code before you see it.` : a.built ? `${a.name} is part of Plus.` : `${a.name} is in the Plus library. This feature is not available yet.`;
  $('#feature-sources').innerHTML = sourceList(a.id);
  $('#feature-plus').hidden = ready || state.tier === 'plus';
  $('#feature-try').hidden = !ready;
  $('#feature-try').onclick = () => { $('#feature-preview').close(); state.agentId = a.id; startChat(); };
  $('#feature-preview').showModal();
}

// ---------- intake ----------
function lastMonths(n) { const out = [], d = new Date(); for (let i = n; i >= 1; i--) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth() - i, 15)); out.push(x.toISOString().slice(0, 7)); } return out; }

async function submitQuiz(answers) {
  try {
    const r = await api("/api/profile", {method: "POST", body: {answers}});
    state.profile = r.profile; state.snapshot = r.snapshot;
    const hint = persona(r.profile.personaHint);
    state.personaId = hint && usable(hint) ? hint.id : "debt-free-coach";
    startChat();
  } catch (e) { banner(e.message, true); }
}

function renderIntake() {
  $('#income-months').innerHTML = lastMonths(6).map(m => `<label class="f">${esc(new Date(m + '-15T12:00:00Z').toLocaleString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'}))}<input inputmode="decimal" data-month="${m}" placeholder="0.00"></label>`).join('');
  const p = state.profile;
  if (p) {
    document.querySelectorAll('#income-months input').forEach(i => { i.value = p.incomeHistory?.find(x => x.month === i.dataset.month)?.amount || ''; });
    const sum = rows => (rows || []).reduce((n,r) => n + Number(r.amount || 0),0).toFixed(2);
    $('#intake-bills').value = sum(p.bills); $('#intake-spending').value = sum(p.expenses);
    $('#intake-savings').value = p.savings || '';
    $('#intake-goal').value = p.goals?.[0] || 'stop_paycheck_to_paycheck';
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
  uploadNote(`Document added: ${result.name}. Its text can guide the chat; only quiz numbers are used in calculations.`);
  state.pendingDocument = null;
}

function connectPortfolio() { uploadNote('Direct brokerage connections are not available yet. Upload a portfolio CSV instead.'); }

// ---------- chat ----------
function renderChatChrome() {
  const p = persona(state.personaId), a = agent(state.agentId), s = state.snapshot;
  $('#chat-head').innerHTML = `${thumb(p)}<div><strong>${esc(p.name)}</strong><small>${['investing','equity'].includes(a.id) ? esc(a.name) : p.textOnly ? 'Text mentorship · Research perspectives' : state.profile?.incomeHistory?.length ? `With ${esc(a.name)}` : 'Start with any money question'} · AI-inspired, not affiliated</small></div>${s?.status === 'ok' ? `<div class="snap-mini">lowest ${usd(s.lowestMonth)}<br>essentials ${usd(s.essentialsTotal)}</div>` : ''}`;
  $('#persona-switch').innerHTML = personas().map(x => `<button type="button" class="rail-item ${x.id === state.personaId ? 'on' : ''}" data-p="${esc(x.id)}">${thumb(x)}<span>${esc(displayName(x.name))}</span>${badge(x)}</button>`).join('');
  $('#agent-list').innerHTML = agents().map((x,i) => `<button type="button" class="rail-item coach-item tone-${i%4} ${x.id === state.agentId ? 'on' : ''}" data-a="${esc(x.id)}">${agentSymbol(x.id)}<span>${esc(displayName(x.name))}</span>${badge(x)}</button>`).join('');
  document.querySelectorAll('#persona-switch [data-p]').forEach(b => b.onclick = () => pickPersona(b.dataset.p));
  document.querySelectorAll('#agent-list [data-a]').forEach(b => b.onclick = () => pickAgent(b.dataset.a));
  syncVoiceAvailability();
  $('#suggest').innerHTML = starterPrompts().map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  document.querySelectorAll('#suggest .chip').forEach(c => c.onclick = () => send(c.textContent));
}
function starterPrompts() {
  if (state.agentId === 'budget' && state.personaId === 'value-investor') return ['What makes a business worth owning?', 'How do I recognize a durable competitive advantage?', 'How can growth create or destroy value?'];
  if (state.agentId === 'budget' && state.personaId === 'disruptive-growth') return ['How do I evaluate an innovation thesis?', 'What would make you change your mind about a company?', 'How do falling costs affect adoption and value?'];
  const prompts = {budget: ['How should I budget when my pay keeps changing?', 'What do I do in my slow months?', 'Where should extra money go in a good month?'], debt: ['How fast can I get rid of my debt?', 'Which debt should I pay first?', 'Should I pay off debt or save first?'], savings: ['How big should my emergency fund be?', 'How do I save when my income drops?', 'Should I stop investing until I have savings?'], investing: ['Review my portfolio', 'Which earnings calls are coming up for my holdings?', 'What are the biggest risks in my portfolio?'], equity: ['What should I listen for on NVIDIA’s next earnings call?', 'How did my largest holdings do last quarter?', 'What do analysts and recent filings say about what I own?']};
  return prompts[state.agentId] || prompts.budget;
}
// Empty-state starters: visible questions instead of a blank log. Removed on the first send.
function showStarters() {
  const el = document.createElement('div'); el.className = 'starter';
  el.innerHTML = `<p class="fine">Try one of these, or ask your own.</p><div class="chips">${starterPrompts().map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('')}</div>${state.profile?.incomeHistory?.length ? '' : '<button class="btn text" type="button" data-add-numbers>Add my numbers for a personal plan</button>'}`;
  el.querySelectorAll('.chip').forEach(c => c.onclick = () => send(c.textContent));
  el.querySelector('[data-add-numbers]')?.addEventListener('click', renderIntake);
  $('#log').append(el);
}
const asksForNumbers = r => !r.turnId && /financial details|update your (?:numbers|details)|add your numbers/i.test(r.text || '');
function showFeature(x) {
  $('#feature-eyebrow').textContent = 'PLANNED MENTOR';
  $('#feature-sources').replaceChildren(); $('#feature-try').hidden = true; $('#feature-try').onclick = null;
  $('#feature-title').textContent = x.name;
  $('#feature-text').textContent = `${x.name} is in the Plus library. This feature is not available yet.`;
  $('#feature-eyebrow').textContent = 'PLUS LIBRARY';
  $('#feature-sources').innerHTML = agent(x.id) ? sourceList(x.id) : '';
  $('#feature-try').hidden = true;
  $('#feature-plus').hidden = state.tier === 'plus';
  $('#feature-preview').showModal();
}
function blocked(x) { if (!x) return true; if (!allowed(x) && !starterCoach(x)) { openUnlock(); return true; } if (!x.built) { showFeature(x); return true; } return false; }
function pickAgent(id) {
  const a = agent(id); if (id === state.agentId || blocked(a)) return;
  state.agentId = id; state.lastTurn = null; renderChatChrome();
  const feeds = sourcesFor(id).filter(d => d.status === 'live');
  note(`Switched to ${a.name}.${feeds.length ? ` It reads live data from ${feeds.map(d => d.name).join(', ')}.` : ''} Ask your next question.`);
}
async function pickPersona(id) {
  const p = persona(id); if (id === state.personaId || blocked(p)) return;
  if (voice.active) endConversation();
  state.personaId = id; renderChatChrome();
  if (!state.lastTurn) { note(`${p.name} is ready. Ask a question or explore a starting point below.`); showStarters(); return; }
  const sk = skeleton();
  try { botMessage(await api('/api/repick', {method: 'POST', body: {turnId: state.lastTurn, personaId: id}})); }
  catch (e) { handleError(e); } finally { sk.stop(); }
}
function note(text) { const el = document.createElement('div'); el.className = 'msg note'; el.textContent = text; $('#log').append(el); el.scrollIntoView({block: 'nearest'}); }
function handleError(e) { if (e.status === 402) openUnlock(); else note(e.message); }

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
    const r = await api('/api/chat', {method: 'POST', body: {message: text, personaId: state.personaId, agentId: state.agentId}}); state.lastTurn = r.turnId;
    const el = botMessage(r); refreshMemory();
    if (r.profileUpdated) el.insertAdjacentHTML('beforeend', '<p class="fine">Saved inputs updated from your message.</p>');
    if (voiceSession && voice.active && voice.session === voiceSession && canSpeak(r) && speechEpoch === voice.epoch) {
      await speakReply(el, r, voiceSession);
    }
    else if (spoken && voice.active && voice.session === voiceSession) note('Voice is unavailable right now. The written answer is above.');
  }
  catch (e) { handleError(e); }
  finally {
    try { const saved = await api('/api/profile'); state.profile=saved.profile; state.snapshot=saved.snapshot; renderChatChrome(); } catch {}
    sk.stop(); btn.disabled = false; if (!voice.active) $('#msg').focus();
  }
}
async function refreshMemory() { try { const {memory} = await api('/api/memory'); $('#memory').innerHTML = memory.length ? memory.map((m, i) => `<li>${esc(m.fact)} <button class="btn text" type="button" data-memory="${i}" aria-label="Forget ${esc(m.fact)}">Forget</button></li>`).join('') : '<li>Nothing yet. Tell me about your goals.</li>'; $('#memory').querySelectorAll('[data-memory]').forEach(b => b.onclick = async () => { await api('/api/memory', {method: 'DELETE', body: {fact: memory[Number(b.dataset.memory)].fact}}); refreshMemory(); }); } catch {} }

async function restoreChat(history) {
  const last = [...history].reverse().find(x => x.role === 'assistant')?.response;
  if (last?.personaId && persona(last.personaId)) state.personaId = last.personaId;
  if (last?.agentId && agent(last.agentId)) state.agentId = last.agentId;
  state.lastTurn = last?.turnId || null;
  $('#log').innerHTML = '';
  renderChatChrome(); refreshMemory(); show('v-chat');
  for (const item of history) {
    if (item.role === 'user') { const el = document.createElement('div'); el.className = 'msg user'; el.textContent = item.text; $('#log').append(el); }
    else if (item.response) botMessage(item.response);
  }
}

function startChat() {
  $('#log').innerHTML = ''; state.lastTurn = null; renderChatChrome(); refreshMemory(); show('v-chat');
  const p = persona(state.personaId), a = agent(state.agentId);
  if (['investing','equity'].includes(a.id)) {
    note(state.profile?.portfolio ? `${a.name} is ready with your saved holdings and ${p.name}'s perspective.` : `${a.name} works from your holdings. Upload a CSV to get started.`);
    if (!state.profile?.portfolio) { const el = document.createElement('div'); el.className = 'portfolio-start'; el.innerHTML = '<button class="btn primary" type="button" data-holdings>Upload holdings CSV</button><button class="btn text" type="button" data-context-open>Open context hub</button>'; el.querySelector('[data-holdings]').onclick = () => $('#portfolio-file').click(); el.querySelector('[data-context-open]').onclick = () => $('#context-dialog').showModal(); $('#log').append(el); }
  } else note(p.textOnly ? `${p.name} is ready for text chat. Explore a perspective or bring a research question.` : state.profile?.incomeHistory?.length ? `${p.name} is ready to talk through your plan. Ask anything below.` : `Say hello, ask a question, or choose Talk live for a voice conversation. Add your numbers anytime for a personal plan.`);
  showStarters();
  $('#msg').focus();
}

// ---------- Plus ----------
function openUnlock() {
  $('#unlock-msg').textContent = '';
  const stripe = state.config.billing?.stripe;
  $('#unlock-test').hidden = !stripe;
  $('#unlock-go').textContent = stripe ? 'Continue to secure checkout' : 'Unlock Plus (demo, no payment)';
  $('#unlock').showModal();
}
$('#unlock-go').addEventListener('click', async e => {
  e.preventDefault(); const b = e.currentTarget; b.disabled = true;
  try {
    const r = await api('/api/checkout', {method: 'POST'});
    if (r.mode === 'stripe' && r.url) { location.href = r.url; return; }
    await api('/api/checkout/demo', {method: 'POST'});
    await setPlus('Plus unlocked in demo mode. No payment was taken.');
    $('#unlock').close();
  } catch (err) { $('#unlock-msg').textContent = err.message; } finally { b.disabled = false; }
});
async function setPlus(message) {
  state.tier = 'plus'; $('#tier').hidden = false; banner(message);
  state.config = await api('/api/config');
  state.config.catalog.personas.forEach(p => { p.name = displayName(p.name); }); renderLanding();
  if (!$('#v-chat').hidden) renderChatChrome();
}
async function handleCheckoutReturn() {
  const q = new URLSearchParams(location.search), status = q.get('checkout');
  if (!status) return;
  history.replaceState(null, '', location.pathname);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if (status === 'cancel') return banner('Checkout canceled. You are still on the free plan.', true);
  try { await api('/api/checkout/confirm', {method: 'POST', body: {checkoutId: q.get('cs')}}); await setPlus('Plus test access is active. More mentor-agent pairings will launch as they are built. No real charge.'); }
  catch (e) { banner(`We could not confirm that checkout: ${e.message}`, true); }
}

// Document and portfolio links are showcase context only. Holdings CSV is the working import.
function setupContextHub() {
  const dialog = $('#context-dialog');
  document.querySelectorAll('[data-context]').forEach(b => b.onclick = () => dialog.showModal());
  $('#context-close').onclick = () => dialog.close();
  $('#feature-close').onclick = () => $('#feature-preview').close();
  $('#feature-plus').onclick = () => { $('#feature-preview').close(); openUnlock(); };
  try { const saved = sessionStorage.getItem('mentor-labs-portfolio-link'); if (saved) { $('#portfolio-link').value = saved; $('#portfolio-link-status').textContent = 'Reference saved for this browser session; no account connected.'; } } catch {}
  $('#context-files').onchange = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      await uploadDocument(file); $('#context-file-status').textContent = `${file.name} added to this chat.`;
    } catch (err) { $('#context-file-status').textContent = err.message; }
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
      if ((heardSpeech && silenceSince && now - silenceSince >= 1100) || now - started >= 60000) {
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
    voiceStatus('Dave is thinking…');
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
    if (status === 'playing') {played = true;if (session && voice.active && voice.session === session) voiceStatus('Dave is speaking…');}
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
  state.config.catalog.personas.forEach(p => { p.name = displayName(p.name); });
  try { state.tier = (await api('/api/me')).tier; } catch {}
  $('#tier').hidden = state.tier !== 'plus';
  $('#engine').textContent = state.config.engine === 'live' ? 'Live AI' : state.config.engine === 'mock' ? 'Local test mode' : 'AI unavailable';
  renderLanding();
  $('#refresh-sources').onclick = async () => {
    const button = $('#refresh-sources'), status = $('#source-refresh-status');
    button.disabled = true; status.textContent = 'Refreshing…';
    try {
      const fresh = await api('/api/config');
      state.config.catalog.dataSources = fresh.catalog.dataSources;
      state.config.marketSnapshotAsOf = fresh.marketSnapshotAsOf;
      renderSources(); status.textContent = 'Configuration updated. Feeds are fetched when used.';
    } catch { status.textContent = 'Could not refresh. Showing the last loaded configuration.'; }
    finally { button.disabled = false; }
  };
  $('#home').onclick = e => { e.preventDefault(); show('v-landing'); };
  $('#start').onclick = renderIntake;
  const startRamsey = () => {state.personaId = DEMO_PERSONA; state.agentId = DEMO_AGENT; startChat();};
  $('#head-start').onclick = startRamsey; $('#try-chat').onclick = startRamsey;
  $('#chat-plan').onclick = renderIntake;
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
  try { const r = await api('/api/profile'); state.profile = r.profile; state.snapshot = r.snapshot; const h = persona(r.profile?.personaHint); if (h && usable(h)) state.personaId = h.id; const {history} = await api('/api/history'); if (history.length) { await restoreChat(history); return; } if (r.profile?.incomeHistory?.length) { startChat(); return; } } catch {}
  show('v-landing');
}
boot().catch(e => banner(`The app could not load: ${e.message}`, true));
// Keep the section rail in sync with scrolling, including long source/library sections.
const sectionLinks = [...document.querySelectorAll('.section-rail a')];
let sectionFrame = 0;
function updateSectionRail() {
  sectionFrame = 0;
  if ($('#v-landing').hidden) return;
  const threshold = document.querySelector('header.site').getBoundingClientRect().bottom + 160;
  let active = sectionLinks[0];
  for (const link of sectionLinks) {
    if ($(link.hash).getBoundingClientRect().top <= threshold) active = link;
  }
  for (const link of sectionLinks) {
    if (link === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  const rail = document.querySelector('.section-rail');
  if (rail.scrollWidth > rail.clientWidth && active) {
    rail.scrollLeft = active.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
  }
}
function scheduleSectionRail() {
  if (!sectionFrame) sectionFrame = requestAnimationFrame(updateSectionRail);
}
window.addEventListener('scroll', scheduleSectionRail, {passive: true});
window.addEventListener('resize', scheduleSectionRail);
document.addEventListener('toggle', scheduleSectionRail, true);
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
