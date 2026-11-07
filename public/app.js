// Money Mentor SPA: landing -> quiz -> your numbers + choose mentor/coach -> coaching chat.
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
const views = ['v-landing', 'v-quiz', 'v-snap', 'v-chat'];
function show(id) {
  views.forEach(v => { $('#' + v).hidden = v !== id; });
  const landing = id === 'v-landing';
  $('#nav').hidden = !landing; $('#head-start').hidden = !landing; $('#restart').hidden = landing;
  window.scrollTo(0, 0);
}
function banner(text, warn = false) { const b = $('#banner'); b.textContent = text; b.className = 'banner' + (warn ? ' warn' : ''); b.hidden = !text; }

// ---------- catalog helpers ----------
const personas = () => state.config.catalog.personas;
const agents = () => state.config.catalog.agents;
const persona = id => personas().find(p => p.id === id);
const agent = id => agents().find(a => a.id === id);
const allowed = x => x.tier === 'free' || state.tier === 'plus';
const usable = x => allowed(x) && x.built;
const statusLabel = x => !allowed(x) ? 'Plus' : !x.built ? 'Soon' : (x.tier === 'free' ? 'Free' : 'Plus');
const initials = name => name.replace(/^The /, '').split(/[\s-]+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const art = (p, cls = 'frame') => `<div class="${cls}">${p.image ? `<img src="${esc(p.image)}" alt="Illustration of the ${esc(p.name)} mentor" loading="lazy">` : `<span class="mono-gram">${esc(initials(p.name))}</span>`}`;
const thumb = p => `<span class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="">` : esc(initials(p.name))}</span>`;

// ---------- landing ----------
function renderLanding() {
  const c = state.config.catalog;
  $('#ex-coaching').textContent = c.explainer.coaching;
  $('#ex-mentors').textContent = c.explainer.mentors;
  $('#personas').innerHTML = personas().filter(p => p.built).map(p => `<div class="portrait ${usable(p) ? '' : 'locked'}">${art(p)}<span class="tag ${p.tier === 'plus' ? 'plus' : ''}">${p.tier === 'plus' ? 'Plus' : 'Free'}</span></div>
    <h3>${esc(p.name)}</h3><p>${esc(p.philosophy)}.</p><p>From the public work of ${esc(p.inspiredBy)}.</p></div>`).join('');
  $('#agents').innerHTML = agents().filter(a => a.built).map(a => `<div class="tr"><strong>${esc(a.name)}</strong><span>${esc(a.job)}</span><span class="tag ${a.tier === 'plus' ? 'plus' : ''}">${a.tier === 'plus' ? 'Plus' : 'Free'}</span></div>`).join('');
}

// ---------- quiz ----------
const setPath = (obj, path, val) => { const k = path.split('.'); let o = obj; k.slice(0, -1).forEach(x => o = o[x] ??= {}); o[k.at(-1)] = val; };
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const optVal = o => (typeof o === 'object' ? o.value : o);
const optLabel = o => (typeof o === 'object' ? o.label : String(o));
const colLabel = {name: 'Name', amount: 'Amount', dueDay: 'Due day', balance: 'Balance', aprPercent: 'APR %', minPayment: 'Minimum'};
function lastMonths(n) { const out = [], d = new Date(); for (let i = n; i >= 1; i--) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth() - i, 15)); out.push(x.toISOString().slice(0, 7)); } return out; }

function renderQuestion() {
  const qs = state.config.quiz.questions, q = qs[state.i];
  $('#bar').style.width = `${Math.round(state.i / qs.length * 100)}%`;
  $('#q-section').textContent = `${q.section} · ${state.i + 1} of ${qs.length}`;
  $('#q-prompt').textContent = q.prompt;
  $('#q-why').textContent = state.config.quiz.sectionWhy?.[q.section] || '';
  $('#q-error').textContent = '';
  $('#q-back').disabled = state.i === 0;
  $('#q-skip').hidden = q.required;
  $('#q-next').textContent = state.i === qs.length - 1 ? 'See my numbers' : 'Next';
  const cur = getPath(state.answers, q.field), body = $('#q-body');

  if (['single', 'multi', 'boolean'].includes(q.type)) {
    const options = q.type === 'boolean' ? [{value: true, label: 'Yes'}, {value: false, label: 'No'}] : q.options;
    body.innerHTML = `<div class="opts" role="${q.type === 'multi' ? 'group' : 'radiogroup'}">${options.map((o, k) => {
      const on = q.type === 'multi' ? (cur || []).includes(optVal(o)) : cur === optVal(o);
      return `<button type="button" class="opt ${on ? 'on' : ''}" data-k="${k}" aria-pressed="${on}">${esc(optLabel(o))}</button>`;
    }).join('')}</div>${q.type === 'multi' ? `<p class="fine">${q.maxSelect ? `Pick up to ${q.maxSelect}.` : 'Pick any that apply.'}</p>` : ''}${q.id === 'portfolio' ? '<div id="pf-extra"></div>' : ''}`;
    body.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const v = optVal(options[+b.dataset.k]);
      if (q.type === 'multi') { const set = new Set(cur || []); set.has(v) ? set.delete(v) : (!q.maxSelect || set.size < q.maxSelect) && set.add(v); setPath(state.answers, q.field, [...set]); renderQuestion(); }
      else { setPath(state.answers, q.field, v); if (q.id === 'portfolio') renderQuestion(); else next(); }
    });
    if (q.id === 'portfolio') renderPortfolioExtra(cur);
  } else if (q.type === 'scale') {
    body.innerHTML = `<div class="scale">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="opt ${cur === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div><p class="fine">1 means not at all. 5 means completely.</p>`;
    body.querySelectorAll('.opt').forEach(b => b.onclick = () => { setPath(state.answers, q.field, +b.dataset.n); next(); });
  } else if (q.type === 'money_series') {
    const list = cur || [];
    body.innerHTML = `<div class="money-grid">${lastMonths(q.months).map(m => `<label class="f">${esc(new Date(m + '-15T12:00:00Z').toLocaleString('en-US', {month: 'long', year: 'numeric', timeZone: 'UTC'}))}<input inputmode="decimal" data-m="${m}" value="${esc(list.find(x => x.month === m)?.amount ?? '')}" placeholder="0.00"></label>`).join('')}</div><p class="fine">Take-home pay after taxes. Leave a month blank if you don't remember.</p>`;
  } else if (q.type === 'money') {
    body.innerHTML = `<label class="f" style="max-width:240px">Amount<input inputmode="decimal" id="q-money" value="${esc(cur ?? '')}" placeholder="0.00"></label>`;
  } else if (q.type === 'rows') {
    const list = cur?.length ? cur : (q.fixedRows || ['']).map(n => ({name: n.replace(/_/g, ' ')}));
    const rowHtml = r => `<div class="r">${q.columns.map(c => `<label class="f">${esc(colLabel[c.key] || c.key)}<input data-k="${c.key}" ${c.type === 'text' ? '' : 'inputmode="decimal"'} value="${esc(r[c.key] ?? '')}"></label>`).join('')}${q.fixedRows ? '' : '<button type="button" class="btn text rm">Remove</button>'}</div>`;
    body.innerHTML = `<div class="rows">${list.map(rowHtml).join('')}</div>${q.fixedRows ? '' : '<button type="button" class="btn" id="add-row">Add another</button>'}`;
    const rows = body.querySelector('.rows');
    body.querySelector('#add-row')?.addEventListener('click', () => rows.insertAdjacentHTML('beforeend', rowHtml({})));
    rows.addEventListener('click', e => { if (e.target.classList.contains('rm')) e.target.closest('.r').remove(); });
  }
  body.querySelector('input')?.focus();
}

function renderPortfolioExtra(choice) {
  const box = $('#pf-extra');
  if (choice === 'upload_csv') {
    box.innerHTML = `<p class="fine">Export your holdings as a CSV (symbol, sector, market value). We read the file only. We never ask for your brokerage password.</p><input type="file" accept=".csv,text/csv" id="pf-file"><div class="row"><button type="button" class="btn" id="pf-sample">Use a sample portfolio</button></div><p id="pf-out" class="fine"></p>`;
    const done = s => { state.answers.portfolio = 'upload_csv'; $('#pf-out').innerHTML = `Loaded ${s.holdings} holdings worth <span class="mono">${usd(s.marketValue)}</span>, about <span class="mono">${usd(s.estimatedAnnualFees)}</span> a year in fees.`; };
    $('#pf-file').onchange = async e => { try { done(await api('/api/portfolio/upload', {method: 'POST', body: {csv: await e.target.files[0].text()}})); } catch (err) { $('#pf-out').textContent = err.message; } };
    $('#pf-sample').onclick = async () => { try { done(await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}})); } catch (err) { $('#pf-out').textContent = err.message; } };
  } else if (choice === 'connect_brokerage_sandbox') {
    box.innerHTML = '<p class="fine">Direct brokerage connections are coming. For now, upload a CSV export instead.</p>';
  } else box.innerHTML = '';
}

function collect() {
  const q = state.config.quiz.questions[state.i], body = $('#q-body');
  if (q.type === 'money_series') setPath(state.answers, q.field, [...body.querySelectorAll('input')].filter(i => i.value.trim()).map(i => ({month: i.dataset.m, amount: i.value.trim()})));
  if (q.type === 'money') setPath(state.answers, q.field, $('#q-money').value.trim() || undefined);
  if (q.type === 'rows') setPath(state.answers, q.field, [...body.querySelectorAll('.r')].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.k, i.value.trim()]))).filter(r => Object.entries(r).some(([k, v]) => k !== 'name' && v)));
  if (q.required) { const v = getPath(state.answers, q.field); if (v === undefined || (Array.isArray(v) && !v.length)) { $('#q-error').textContent = q.type === 'money_series' ? 'Enter at least one month so we can plan.' : 'Please answer this one.'; return false; } }
  return true;
}
async function next() { if (!collect()) return; if (state.i < state.config.quiz.questions.length - 1) { state.i++; renderQuestion(); } else await submitQuiz(); }

async function submitQuiz(answers = state.answers) {
  try {
    const r = await api('/api/profile', {method: 'POST', body: {answers}});
    state.profile = r.profile; state.snapshot = r.snapshot;
    const hint = persona(r.profile.personaHint);
    state.personaId = hint && usable(hint) ? hint.id : 'debt-free-coach';
    renderSnapshot(); show('v-snap');
  } catch (e) { show('v-quiz'); $('#q-error').textContent = e.message; }
}

// ---------- your numbers + setup ----------
function bars(s, profile) {
  const months = profile.incomeHistory || []; if (!months.length) return '';
  const ess = Number(s.essentialsTotal), max = Math.max(ess, ...months.map(m => Number(m.amount))) * 1.1;
  const W = 600, H = 170, bw = W / months.length, y = v => H - 22 - (v / max) * (H - 34);
  const label = m => new Date(m + '-15T12:00:00Z').toLocaleString('en-US', {month: 'short', timeZone: 'UTC'});
  return `<div class="bars"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Take-home pay by month compared with monthly essentials of ${usd(ess)}">
    ${months.map((m, i) => { const v = Number(m.amount), low = v < ess; return `<rect x="${i * bw + 10}" y="${y(v)}" width="${bw - 20}" height="${H - 22 - y(v)}" fill="${low ? 'var(--ochre)' : 'var(--green)'}" opacity="${low ? 1 : .85}"><title>${label(m.month)}: ${usd(v)}</title></rect><text x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${label(m.month)}</text>`; }).join('')}
    <line x1="0" x2="${W}" y1="${y(ess)}" y2="${y(ess)}" stroke="var(--ink)" stroke-dasharray="4 4"/>
  </svg><p class="fine legend"><span class="key ink"></span>Monthly essentials ${usd(ess)} <span class="key ochre"></span>Months below essentials</p></div>`;
}

function renderSnapshot() {
  const s = state.snapshot;
  if (s.status !== 'ok') { $('#snap-title').textContent = 'We need your income to plan.'; $('#snap').innerHTML = `<p class="error">${esc(s.message)}</p>`; renderSetup(); return; }
  const short = Number(s.lowestMonthShortfall) > 0;
  $('#snap-title').textContent = short ? `In your lowest month you'd be ${usd(s.lowestMonthShortfall)} short.` : `Even your lowest month covers essentials, with ${usd(s.lowestMonthLeftover)} left.`;
  const stat = (k, v, bad) => `<div class="stat ${bad ? 'bad' : ''}"><div class="k">${esc(k)}</div><div class="v">${usd(v)}</div></div>`;
  $('#snap').innerHTML = `${bars(s, state.profile)}
    <div class="stats">${stat('Lowest month', s.lowestMonth, short)}${stat('Average month', s.averageMonth)}${stat('Monthly essentials', s.essentialsTotal)}${stat('Swing, high minus low', s.swing)}${stat('Debt', s.debtTotal)}${stat('Savings', s.savings)}</div>
    <details class="fine"><summary>How we calculated this</summary><ul>${s.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>`;
  renderSetup();
}

function renderSetup() {
  const hint = state.profile?.personaHint;
  $('#pick-mentor').innerHTML = personas().filter(p => p.built && allowed(p)).map(p => `<button type="button" class="choice ${p.id === state.personaId ? 'on' : ''}" data-p="${p.id}">${art(p)}</div><strong>${esc(p.name)}</strong><small>${esc(p.philosophy)}.</small>${p.id === hint ? '<small class="hint">Suggested from your quiz</small>' : ''}</button>`).join('');
  $('#pick-coach').innerHTML = agents().filter(usable).map(a => `<button type="button" class="choice ${a.id === state.agentId ? 'on' : ''}" data-a="${a.id}"><span><strong>${esc(a.name)}</strong><small>${esc(a.job)}</small></span><span class="tag ${a.tier === 'plus' ? 'plus' : ''}">${statusLabel(a)}</span></button>`).join('');
  document.querySelectorAll('#pick-mentor [data-p]').forEach(b => b.onclick = () => { state.personaId = b.dataset.p; renderSetup(); });
  document.querySelectorAll('#pick-coach [data-a]').forEach(b => b.onclick = () => { state.agentId = b.dataset.a; renderSetup(); });
  document.querySelectorAll('#pick-mentor [data-unlock]').forEach(b => b.onclick = openUnlock);
}

// ---------- chat ----------
function renderChatChrome() {
  const p = persona(state.personaId), a = agent(state.agentId), s = state.snapshot;
  $('#chat-head').innerHTML = `${thumb(p)}<div><strong>${esc(p.name)}</strong><small>directing ${esc(a.name)}</small></div>${s?.status === 'ok' ? `<div class="snap-mini">lowest ${usd(s.lowestMonth)}<br>essentials ${usd(s.essentialsTotal)}</div>` : ''}`;
  $('#persona-switch').innerHTML = personas().filter(x => x.built && allowed(x)).map(x => `<button class="rail-item ${x.id === state.personaId ? 'on' : ''}" data-p="${x.id}">${thumb(x)}<span>${esc(x.name)}</span></button>`).join('');
  $('#agent-list').innerHTML = agents().filter(x => x.built && allowed(x)).map(x => `<button class="rail-item coach-item ${x.id === state.agentId ? 'on' : ''}" data-a="${x.id}"><span>${esc(x.name.replace(/ Coaching$/, ''))}</span></button>`).join('');
  document.querySelectorAll('#persona-switch [data-p]').forEach(b => b.onclick = () => pickPersona(b.dataset.p));
  document.querySelectorAll('#agent-list [data-a]').forEach(b => b.onclick = () => pickAgent(b.dataset.a));
  const prompts = {budget: ['How should I budget when my pay keeps changing?', 'What do I do in my slow months?', 'Where should extra money go in a good month?'], debt: ['How fast can I get rid of my debt?', 'Which debt should I pay first?', 'Should I pay off debt or save first?'], savings: ['How big should my emergency fund be?', 'How do I save when my income drops?', 'Should I stop investing until I have savings?']};
  $('#suggest').innerHTML = (prompts[state.agentId] || prompts.budget).map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  document.querySelectorAll('#suggest .chip').forEach(c => c.onclick = () => send(c.textContent));
}
function blocked(x) { if (!allowed(x)) { openUnlock(); return true; } if (!x.built) { note(`${x.name} is coming soon.`); return true; } return false; }
function pickAgent(id) {
  const a = agent(id); if (id === state.agentId || blocked(a)) return;
  state.agentId = id; state.lastTurn = null; renderChatChrome(); note(`Switched to ${a.name}. Ask your next question.`);
}
async function pickPersona(id) {
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
  el.innerHTML = '<span class="stage">Thinking</span><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span>';
  $('#log').append(el); el.scrollIntoView({block: 'nearest'});
  return {stop() { el.remove(); }};
}

function calcCard(c) {
  const rows = Object.entries(c.result || {}).filter(([, v]) => v === null || typeof v !== 'object').map(([k, v]) => {
    const unit = c.units?.[k] || (/percent|pct|apr/i.test(k) ? 'percent' : /^(months|years|monthsOfEssentials|.*Count|.*Months|.*Years)$/i.test(k) ? 'count' : 'money');
    const shown = v === null ? 'n/a' : unit === 'percent' ? `${v}%` : unit === 'money' && typeof v === 'string' && /^-?\d+\.\d{2}$/.test(v) ? usd(v) : String(v);
    return `<tr><td>${esc(k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, x => x.toUpperCase()))}</td><td>${esc(shown)}</td></tr>`;
  }).join('');
  return `<div class="calc"><div class="ch"><span>${esc(c.label || c.name)}</span><span>calculated in code, exact to the cent</span></div><table>${rows}</table></div>`;
}

function sourceLink(c) {
  let url; try { url = new URL(c.url); } catch {}
  const label = esc(c.title);
  return url?.protocol === 'https:' ? `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
}

function botMessage(r) {
  const el = document.createElement('div'); el.className = 'msg bot';
  const calcs = (r.calculations || []).slice(1);
  el.innerHTML = `<div class="who"><strong>${esc(r.personaName || '')}</strong>${r.agentName ? ` · ${esc(r.agentName)}` : ''}</div>
    <p class="say">${esc(r.text)}</p>
    ${calcs.length || r.citations?.length ? `<details class="answer-details"><summary>Sources and calculations</summary>${calcs.map(calcCard).join('')}${r.citations?.length ? `<p class="sources">${r.citations.map(c => `${sourceLink(c)} <span>(${esc(c.ref)})</span>`).join('; ')}</p>` : ''}</details>` : ''}
    <p class="disclose">${esc(r.disclosure || '')}</p>`;
  $('#log').append(el); el.scrollIntoView({behavior: 'smooth', block: 'start'});
}

async function send(text) {
  text = text.trim(); if (!text) return;
  const u = document.createElement('div'); u.className = 'msg user'; u.textContent = text; $('#log').append(u);
  $('#msg').value = ''; const btn = $('#composer button'); btn.disabled = true;
  const sk = skeleton();
  try { const r = await api('/api/chat', {method: 'POST', body: {message: text, personaId: state.personaId, agentId: state.agentId}}); state.lastTurn = r.turnId; botMessage(r); refreshMemory(); }
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
  note(`${p.name} is directing ${a.name}. Ask anything, or start with a suggestion below.`);
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
  if (!$('#v-snap').hidden) renderSetup(); if (!$('#v-chat').hidden) renderChatChrome();
}
async function handleCheckoutReturn() {
  const q = new URLSearchParams(location.search), status = q.get('checkout');
  if (!status) return;
  history.replaceState(null, '', location.pathname);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  if (status === 'cancel') return banner('Checkout canceled. You are still on the free plan.', true);
  try { await api('/api/checkout/confirm', {method: 'POST', body: {checkoutId: q.get('cs')}}); await setPlus('Welcome to Plus. Every mentor and coach is unlocked as it launches. (Stripe test mode, no real charge.)'); }
  catch (e) { banner(`We could not confirm that checkout: ${e.message}`, true); }
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

// ---------- boot ----------
async function boot() {
  state.config = await api('/api/config');
  try { state.tier = (await api('/api/me')).tier; } catch {}
  $('#tier').hidden = state.tier !== 'plus';
  $('#engine').textContent = state.config.engine === 'live' ? 'Live AI' : state.config.engine === 'mock' ? 'Local test mode' : 'AI unavailable';
  renderLanding();
  const startQuiz = () => { state.i = 0; state.answers = {}; renderQuestion(); show('v-quiz'); };
  $('#start').onclick = startQuiz; $('#head-start').onclick = startQuiz;
  $('#demo').onclick = async () => { await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}}).catch(() => {}); submitQuiz(DEMO); };
  document.querySelectorAll('[data-unlock]').forEach(b => b.onclick = openUnlock);
  $('#q-next').onclick = next;
  $('#q-back').onclick = () => { collect(); state.i = Math.max(0, state.i - 1); renderQuestion(); };
  $('#q-skip').onclick = () => { state.i < state.config.quiz.questions.length - 1 ? (state.i++, renderQuestion()) : submitQuiz(); };
  $('#q-body').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); next(); } });
  $('#to-chat').onclick = startChat;
  $('#composer').onsubmit = e => { e.preventDefault(); send($('#msg').value); };
  $('#restart').onclick = async () => { if (!confirm('Start over? Your answers and chat will be cleared.')) return; await api('/api/session', {method: 'DELETE'}).catch(() => {}); location.href = '/'; };
  await handleCheckoutReturn();
  try { const r = await api('/api/profile'); if (r.profile?.incomeHistory?.length) { state.profile = r.profile; state.snapshot = r.snapshot; const h = persona(r.profile.personaHint); if (h && usable(h)) state.personaId = h.id; const {history} = await api('/api/history'); if (history.length) await restoreChat(history); else { renderSnapshot(); show('v-snap'); } return; } } catch {}
  show('v-landing');
}
boot().catch(e => banner(`The app could not load: ${e.message}`, true));
