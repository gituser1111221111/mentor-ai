import {VoicePlayback} from './voice-playback.js';
// Mentor Labs SPA: free starter chat, short intake, specialist catalog, and coaching chat.
// Vanilla JS, no build step. All money shown here comes from the server's exact-cents math.
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const usd = v => (v === null || v === undefined || v === '') ? 'n/a' : '$' + Number(v).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

let sid; try { sid = localStorage.getItem('sid'); } catch {}
if (!sid) { sid = crypto.randomUUID(); try { localStorage.setItem('sid', sid); } catch {} }

async function api(path, {method = 'GET', body} = {}) {
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
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  const landing = id === 'v-landing';
  $('#nav').hidden = !landing; $('#head-start').hidden = !landing; $('#restart').hidden = landing;
  $('#engine').hidden = landing;
  window.scrollTo(0, 0);
}
function banner(text, warn = false) { const b = $('#banner'); b.textContent = text; b.className = 'banner' + (warn ? ' warn' : ''); b.hidden = !text; }

// ---------- catalog helpers ----------
const personas = () => state.config.catalog.personas;
const agents = () => state.config.catalog.agents;
const persona = id => personas().find(p => p.id === id);
const agent = id => agents().find(a => a.id === id);
const allowed = x => x.tier === 'free' || state.tier === 'plus';
const starterCoach = x => x?.id === 'budget' && state.personaId === 'debt-free-coach';
const usable = x => x?.built && (allowed(x) || starterCoach(x));
const statusLabel = x => x?.tier === 'free' ? 'Free' : '+';
const railStatus = x => !x.built ? 'Soon' : x.tier === 'free' || starterCoach(x) ? 'Free' : 'Plus';
const badge = x => `<span class="tag ${x.tier === 'plus' ? 'plus' : ''}" ${x.tier === 'plus' ? 'title="Mentor Labs Plus" aria-label="Mentor Labs Plus"' : ''}>${statusLabel(x)}</span>`;
const initials = name => name.replace(/^The /, '').split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const art = (p, cls = 'frame') => `<div class="${cls}">${p.image ? `<img src="${esc(p.image)}" alt="AI-generated likeness inspired by ${esc(p.inspiredBy)}" width="640" height="800" loading="lazy" decoding="async">` : `<span class="mono-gram">${esc(initials(p.name))}</span>`}</div>`;
const thumb = p => `<span class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(initials(p.name))}</span>`;

// ---------- landing ----------
function renderLanding() {
  $('#personas').innerHTML = personas().map(p => `<div class="portrait ${usable(p) ? '' : 'locked'}">${art(p)}${badge(p)}
    <h3>${esc(p.name)}</h3><p class="portrait-source">AI-inspired perspective</p><p>${esc(p.philosophy)}.</p></div>`).join('');
  const groups = ['Everyday money', 'Investing & property', 'Business building'];
  $('#agents').innerHTML = groups.map(group => `<section class="agent-group"><h3>${esc(group)}</h3><div class="agent-grid">${agents().filter(a => a.category === group).map(a => `<button type="button" class="agent-card" data-a="${a.id}"><span class="agent-card-top"><strong>${esc(a.name)}</strong>${badge(a)}</span><span class="agent-card-job">${esc(a.job)}</span></button>`).join('')}</div></section>`).join('');
  document.querySelectorAll('#agents [data-a]').forEach(b => b.onclick = () => { const a = agent(b.dataset.a); if (a.id === 'budget') renderIntake(); else blocked(a); });
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
    incomeHistory,
    bills: moneyInput('#intake-bills') ? [{name: 'Fixed monthly bills', amount: moneyInput('#intake-bills')}] : [],
    expenses: moneyInput('#intake-spending') ? [{name: 'Everyday spending', amount: moneyInput('#intake-spending')}] : [],
    debts: debt.every(Boolean) ? [{name: 'Debt', balance: debt[0], aprPercent: debt[1], minPayment: debt[2]}] : [],
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
  if (!$('#v-chat').hidden) renderChatChrome();
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
  $('#chat-head').innerHTML = `${thumb(p)}<div><strong>${esc(p.name)}</strong><small>${state.profile?.incomeHistory?.length ? `With ${esc(a.name)}` : 'Start with any money question'} · AI-inspired, not affiliated</small></div>${s?.status === 'ok' ? `<div class="snap-mini">lowest ${usd(s.lowestMonth)}<br>essentials ${usd(s.essentialsTotal)}</div>` : ''}`;
  $('#persona-switch').innerHTML = personas().map(x => `<button type="button" class="rail-item ${x.id === state.personaId ? 'on' : ''}" data-p="${esc(x.id)}">${thumb(x)}<span>${esc(x.name)}</span><small>${railStatus(x)}</small></button>`).join('');
  $('#agent-list').innerHTML = agents().map(x => `<button type="button" class="rail-item coach-item ${x.id === state.agentId ? 'on' : ''}" data-a="${esc(x.id)}"><span>${esc(x.name)}</span><small>${railStatus(x)}</small></button>`).join('');
  document.querySelectorAll('#persona-switch [data-p]').forEach(b => b.onclick = () => pickPersona(b.dataset.p));
  document.querySelectorAll('#agent-list [data-a]').forEach(b => b.onclick = () => pickAgent(b.dataset.a));
  const prompts = {budget: ['How should I budget when my pay keeps changing?', 'What do I do in my slow months?', 'Where should extra money go in a good month?'], debt: ['How fast can I get rid of my debt?', 'Which debt should I pay first?', 'Should I pay off debt or save first?'], savings: ['How big should my emergency fund be?', 'How do I save when my income drops?', 'Should I stop investing until I have savings?']};
  $('#suggest').innerHTML = (prompts[state.agentId] || prompts.budget).map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  document.querySelectorAll('#suggest .chip').forEach(c => c.onclick = () => send(c.textContent));
}
function showFeature(x) {
  $('#feature-title').textContent = x.name;
  $('#feature-text').textContent = `${x.job || x.philosophy}. This ${x.inspiredBy ? 'mentor perspective' : 'specialist agent'} is part of the Mentor Labs Plus lineup. The Ramsey starter is the interactive MVP today; more mentor-agent pairings are being created.`;
  $('#feature-plus').hidden = state.tier === 'plus';
  $('#feature-preview').showModal();
}
function blocked(x) { if (!x) return true; if (!x.built) { showFeature(x); return true; } if (!allowed(x) && !starterCoach(x)) { openUnlock(); return true; } return false; }
function pickAgent(id) {
  ++voice.epoch;stopPlayback('coach-change');
  const a = agent(id); if (id === state.agentId || blocked(a)) return;
  state.agentId = id; state.lastTurn = null; renderChatChrome(); note(`Switched to ${a.name}. Ask your next question.`);
}
async function pickPersona(id) {
  ++voice.epoch;stopPlayback('mentor-change');
  const p = persona(id); if (id === state.personaId || blocked(p)) return;
  state.personaId = id; renderChatChrome();
  if (!state.lastTurn) return note(`${p.name} is now directing your coach.`);
  const sk = skeleton();
  try { botMessage(await api('/api/repick', {method: 'POST', body: {turnId: state.lastTurn, personaId: id}})); }
  catch (e) { handleError(e); } finally { sk.stop(); }
}
function note(text) { const el = document.createElement('div'); el.className = 'msg note'; el.textContent = text; $('#log').append(el); el.scrollIntoView({block: 'nearest'}); }
function handleError(e) { if (e.status === 402) openUnlock(); else note(e.message); }

function skeleton() {
  const el = document.createElement('div'); el.className = 'msg bot skeleton'; el.setAttribute('aria-label', 'Working');
  el.innerHTML = `<div class="typing-head">${thumb(persona(state.personaId))}<span class="stage" role="status">${esc(persona(state.personaId).name)} is thinking</span></div><i></i><i></i><i></i>`; $('#log').append(el); el.scrollIntoView({block: 'nearest'});
  return {stop() { el.remove(); }};
}

function calcCard(c) {
  const rows = Object.entries(c.result || {}).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => {
    const unit = c.units?.[k] || (/percent|pct|apr/i.test(k) ? 'percent' : /^(months|years|monthsOfEssentials|.*Count|.*Months|.*Years)$/i.test(k) ? 'count' : 'money');
    const shown = v === null ? 'n/a' : unit === 'percent' ? `${v}%` : unit === 'money' && typeof v === 'string' && /^-?\d+\.\d{2}$/.test(v) ? usd(v) : String(v);
    return `<tr><td>${esc(k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, x => x.toUpperCase()))}</td><td>${esc(shown)}</td></tr>`;
  }).join('');
  return `<div class="calc"><div class="ch"><span>${esc(c.label || c.name)}</span><span>Based on your inputs</span></div><table>${rows}</table></div>`;
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
  el.innerHTML = `<div class="who">${p ? thumb(p) : ''}<div><strong>${esc(r.personaName || p?.name || '')}</strong>${r.agentName ? ` · ${esc(r.agentName)}` : ''}<small>${p?.inspiredBy ? `Inspired by ${esc(p.inspiredBy)} · not the real person` : ''}</small></div></div>
    <p class="say">${esc(r.text)}</p>
    ${canSpeak(r) ? '<button class="btn text" type="button" data-listen>Listen</button><div class="voice-player" hidden><audio controls preload="none"></audio><button class="btn text" type="button" data-stop>Stop</button><p class="fine">AI-generated voice, not the real person.</p></div>' : ''}
    ${calcs.length || r.citations?.length ? `<details class="answer-details"><summary>Sources and calculations</summary>${calcs.map(calcCard).join('')}${r.citations?.length ? `<p class="sources">${r.citations.map(c => `${sourceLink(c)} <span>(${esc(c.ref)})</span>`).join('; ')}</p>` : ''}</details>` : ''}
    ${r.turnId ? '<div class="meta"><button class="btn text" type="button" data-compare>Compare mentors</button></div>' : ''}
    ${r.conversational ? '' : `<p class="disclose">${esc(r.disclosure || '')}</p>`}`;
  el.querySelector('[data-listen]')?.addEventListener('click', () => speakReply(el, r));
  el.querySelector('[data-stop]')?.addEventListener('click', () => {++voice.epoch;stopPlayback();});
  el.querySelector('[data-compare]')?.addEventListener('click', () => openCompare(r));
  $('#log').append(el); el.scrollIntoView({behavior: 'smooth', block: 'start'});
  return el;
}

// ---------- compare mentors (same verified options, only the pick changes) ----------
async function openCompare(r) {
  const body = $('#compare-body');
  body.innerHTML = '<p class="why">Asking each mentor to judge the same options...</p>';
  $('#compare').showModal();
  let c;
  try { c = await api('/api/compare', {method: 'POST', body: {turnId: r.turnId}}); }
  catch (e) { body.innerHTML = `<p class="error">${esc(e.message)}</p>`; return; }
  const name = id => c.mentors.find(m => m.personaId === id)?.name || id;
  const card = m => {
    const head = `<h4>${esc(m.name)}</h4><p class="fine">${esc(m.affiliation || `Inspired by ${m.inspiredBy}'s public teachings. Not affiliated or endorsed.`)}</p>`;
    if (m.status === 'locked') return `<div class="cmp-card muted">${head}<p>Part of Plus. <button type="button" class="btn text" data-unlock>Unlock to compare</button></p></div>`;
    if (m.status === 'coming-soon') return `<div class="cmp-card muted">${head}<p>Coming soon.</p></div>`;
    if (m.status === 'error') return `<div class="cmp-card muted">${head}<p class="error">Could not answer: ${esc(m.error || 'error')}</p></div>`;
    const agree = m.agreesWith?.length ? `<p class="fine">Agrees with ${m.agreesWith.map(x => esc(x.name)).join(', ')}.</p>` : '';
    const dis = m.disagreesWith?.length ? `<p class="fine">Disagrees with ${m.disagreesWith.map(x => `${esc(x.name)} (picked "${esc(x.pickTitle)}")`).join(', ')}.</p>` : '';
    const risk = [m.optionRisk?.risk ? `Option risk: ${esc(m.optionRisk.risk)}.` : '', m.optionRisk?.tradeoffs ? esc(m.optionRisk.tradeoffs) : '', m.riskNote ? esc(m.riskNote) : ''].filter(Boolean).join(' ');
    return `<div class="cmp-card">${head}
      <p><strong>Picked:</strong> ${esc(m.pickTitle)}</p>
      <p class="say">${esc(m.text || m.rationale)}</p>
      ${m.citations?.length ? `<p class="sources"><span>Sources:</span> ${m.citations.map(x => `${esc(x.title)}${x.ref ? ` <span>(${esc(x.ref)})</span>` : ''}`).join('; ')}</p>` : ''}
      ${risk ? `<p class="fine"><strong>Risks:</strong> ${risk}</p>` : ''}${agree}${dis}</div>`;
  };
  body.innerHTML = `<p class="cmp-summary">${esc(c.summary)}</p>
    <p class="fine">${c.factsUnchanged ? 'Every mentor judged the same options with the same numbers. Nothing was recalculated.' : 'Warning: the options changed between mentors, so this comparison is not reliable.'}</p>
    ${c.mentors.map(card).join('')}
    <p class="disclose">${esc(c.disclosure || '')}</p>`;
  body.querySelectorAll('[data-unlock]').forEach(b => b.onclick = () => { $('#compare').close(); openUnlock(); });
}

async function send(text, {spoken = false} = {}) {
  text = text.trim(); if (!text) return;
  stopPlayback('new-question');
  const speechEpoch = ++voice.epoch;
  const u = document.createElement('div'); u.className = 'msg user'; u.textContent = text; $('#log').append(u);
  if (spoken) u.insertAdjacentHTML('afterbegin', '<span class="via">You said</span>');
  $('#msg').value = ''; const btn = $('#composer button[type="submit"]'); btn.disabled = true;
  const sk = skeleton();
  try {
    const r = await api('/api/chat', {method: 'POST', body: {message: text, personaId: state.personaId, agentId: state.agentId}}); state.lastTurn = r.turnId;
    const el = botMessage(r); refreshMemory();
    if (canSpeak(r) && speechEpoch === voice.epoch) speakReply(el, r);
    else if (spoken) note('Voice is unavailable right now. The written answer is above.');
  }
  catch (e) { handleError(e); }
  finally { sk.stop(); btn.disabled = false; $('#msg').focus(); }
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
  note(state.profile?.incomeHistory?.length ? `${p.name} is ready to talk through your plan. Ask anything below.` : `Ask anything about budgeting, debt, or savings. For a personal plan, you can add your numbers anytime.`);
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
  state.config = await api('/api/config'); renderLanding();
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
      if (state.profile?.incomeHistory?.length) { await uploadDocument(file); $('#context-file-status').textContent = `${file.name} added to this chat.`; }
      else { state.pendingDocument = file; $('#context-file-status').textContent = `${file.name} will be added after the six questions.`; }
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
    try { if (state.profile?.incomeHistory?.length) { await uploadPortfolio(file); done(state.profile.portfolio); } else { state.pendingPortfolio = file; $('#context-csv-status').textContent = `${file.name} will be imported after the six questions.`; } }
    catch (err) { $('#context-csv-status').textContent = err.message; }
  };
  $('#context-sample').onclick = async () => { try { done(await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}})); } catch (err) { $('#context-csv-status').textContent = err.message; } };
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
// Push-to-talk -> /api/voice/transcribe (ElevenLabs STT) -> the normal /api/chat pipeline.
// "Listen" -> /api/voice/speak, which reads the server's stored copy of that verified answer
// (ElevenLabs TTS). The browser never sends text to be spoken and never sees the ElevenLabs key.
const voice = {rec: null, stream: null, chunks: [], started: 0, pressAt: 0, timer: null, starting: false, busy: false, epoch: 0};
const canSpeak = r => Boolean(r?.turnId && state.config?.voice && state.config.voicePersonas?.includes(r.personaId));
// The status row keeps its height while voice is on, so the mic button never moves under the user's finger.
function voiceStatus(text, kind = '') { const s = $('#voice-status'); s.textContent = text; s.className = 'voice-status ' + kind; }
function micUI(on) { const m = $('#mic'); m.classList.toggle('rec', on); m.setAttribute('aria-pressed', String(on)); $('#mic-label').textContent = on ? 'Send' : 'Talk'; }
const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';

async function startRecording() {
  ++voice.epoch;stopPlayback('recording');
  if (voice.busy || voice.rec || voice.starting) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return voiceStatus('This browser cannot record audio here. Type your question instead.', 'warn');
  stopPlayback(); voice.starting = true;
  try { voice.stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true, noiseSuppression: true}}); }
  catch (e) {
    voice.starting = false;
    return voiceStatus(['NotAllowedError', 'SecurityError'].includes(e.name) ? 'Microphone access is blocked. Allow it in your browser settings, or type your question.'
      : e.name === 'NotFoundError' ? 'No microphone found. Type your question instead.'
      : e.name === 'NotSupportedError' ? 'The microphone is not available in this browser. Type your question instead.' : `Could not start the microphone: ${e.message}`, 'warn');
  }
  const mime = pickMime();
  voice.chunks = [];
  voice.rec = new MediaRecorder(voice.stream, mime ? {mimeType: mime} : undefined);
  voice.rec.ondataavailable = e => { if (e.data.size) voice.chunks.push(e.data); };
  voice.rec.onstop = finishRecording;
  voice.rec.start(); voice.started = Date.now(); voice.starting = false; micUI(true);
  const tick = () => { const s = Math.floor((Date.now() - voice.started) / 1000); voiceStatus(`Recording 0:${String(s).padStart(2, '0')}. Release or tap Send when you finish.`, 'rec'); if (s >= 60) stopRecording(); };
  tick(); voice.timer = setInterval(tick, 250);
}
function stopRecording() {
  clearInterval(voice.timer);
  if (voice.rec?.state === 'recording') voice.rec.stop();
  voice.stream?.getTracks().forEach(t => t.stop()); voice.stream = null; micUI(false);
}
async function finishRecording() {
  const rec = voice.rec; voice.rec = null;
  const blob = new Blob(voice.chunks, {type: rec?.mimeType || 'audio/webm'});
  if (Date.now() - voice.started < 600 || blob.size < 1000) return voiceStatus('That was too short. Hold Talk while you speak, or tap it once to start.', 'warn');
  voice.busy = true; $('#mic').disabled = true; voiceStatus('Turning your question into text...');
  try {
    const res = await fetch('/api/voice/transcribe', {method: 'POST', headers: {'Content-Type': blob.type.split(';')[0], 'X-Session-Id': sid}, body: blob});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'We could not hear that. Try again or type your question.');
    voiceStatus('');
    await send(data.text, {spoken: true});
  } catch (e) { voiceStatus(e.message, 'warn'); }
  finally { voice.busy = false; $('#mic').disabled = false; }
}

const playback = new VoicePlayback();
function stopPlayback(reason = 'user') { playback.stop(typeof reason === 'string' ? reason : 'user'); }
async function speakReply(el, r) {
  const box = el.querySelector('.voice-player'), btn = el.querySelector('[data-listen]'), audio = box?.querySelector('audio');
  if (!box) return;
  await playback.start(audio, async (signal, requestId) => {
    const res = await fetch('/api/voice/speak', {method:'POST', signal,
      headers:{'Content-Type':'application/json','X-Session-Id':sid,'X-Voice-Request-Id':requestId},
      body:JSON.stringify({turnId:r.turnId,personaId:r.personaId,voiceReplyId:r.voiceReplyId})});
    if (!res.ok) throw Error((await res.json().catch(()=>({}))).error || 'Audio is unavailable. Your written answer is above.');
    return res.blob();
  }, (status,error) => {
    box.hidden = false;
    btn.disabled = status === 'loading'; btn.hidden = ['playing','ended','blocked'].includes(status);
    btn.textContent = status === 'loading' ? 'Preparing audio…' : 'Listen';
    el.classList.toggle('speaking',status === 'playing');
    if (status === 'blocked') box.querySelector('.fine').textContent = 'Press play to listen. AI-generated voice, not the real person.';
    if (error) note(error.message);
  });
}
window.addEventListener('pagehide', () => {++voice.epoch;stopPlayback('navigation');});

function setupVoice() {
  const mic = $('#mic');
  mic.hidden = !state.config.voice; $('#voice-status').hidden = !state.config.voice;
  if (!state.config.voice) return;
  // Hold to talk (release sends) or tap to start and tap again to send.
  const down = e => {
    if ((e.button ?? 0) > 0 || voice.busy) return;
    e.preventDefault();
    if (voice.rec) return stopRecording();
    try { mic.setPointerCapture?.(e.pointerId); } catch {} // release is delivered here even if the finger drifts
    voice.pressAt = Date.now(); startRecording();
  };
  const up = () => { if (voice.rec?.state === 'recording' && voice.pressAt && Date.now() - voice.pressAt > 500) stopRecording(); voice.pressAt = 0; };
  mic.addEventListener('pointerdown', down);
  mic.addEventListener('pointerup', up);
  mic.addEventListener('pointercancel', up);
  mic.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) down(e); });
  mic.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); up(); } });
}

// ---------- boot ----------
async function boot() {
  state.config = await api('/api/config');
  try { state.tier = (await api('/api/me')).tier; } catch {}
  $('#tier').hidden = state.tier !== 'plus';
  $('#engine').textContent = state.config.engine === 'live' ? 'Live AI' : state.config.engine === 'mock' ? 'Local test mode' : 'AI unavailable';
  renderLanding();
  $('#home').onclick = e => { e.preventDefault(); show('v-landing'); };
  $('#start').onclick = renderIntake; $('#head-start').onclick = renderIntake; $('#try-chat').onclick = renderIntake;
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
  $('#portfolio-file').onchange = async e => { const file = e.target.files?.[0]; if (!file) return; try { if (state.profile) await uploadPortfolio(file); else { state.pendingPortfolio = file; uploadNote(`${file.name} will be added when you start chatting.`); } } catch (err) { uploadNote(err.message); } e.target.value = ''; };
  $('#document-file').onchange = async e => { const file = e.target.files?.[0]; if (!file) return; try { if (state.profile) await uploadDocument(file); else { state.pendingDocument = file; uploadNote(`${file.name} will be added when you start chatting.`); } } catch (err) { uploadNote(err.message); } e.target.value = ''; };
  $('#composer').onsubmit = e => { e.preventDefault(); send($('#msg').value); };
  setupVoice();
  $('#restart').onclick = async () => { if (!confirm('Start over? Your answers and chat will be cleared.')) return; await api('/api/session', {method: 'DELETE'}).catch(() => {}); location.href = '/'; };
  await handleCheckoutReturn();
  try { const r = await api('/api/profile'); if (r.profile?.incomeHistory?.length) { state.profile = r.profile; state.snapshot = r.snapshot; const h = persona(r.profile.personaHint); if (h && usable(h)) state.personaId = h.id; const {history} = await api('/api/history'); if (history.length) await restoreChat(history); else startChat(); return; } } catch {}
  show('v-landing');
}
boot().catch(e => banner(`The app could not load: ${e.message}`, true));
