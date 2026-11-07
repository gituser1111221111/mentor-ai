// Single-page app: landing -> quiz -> snapshot -> chat. Vanilla JS, no build step.
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const usd = v => (v === null || v === undefined || v === '') ? '—' : '$' + Number(v).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

let sid; try { sid = localStorage.getItem('sid'); } catch {}
if (!sid) { sid = crypto.randomUUID(); try { localStorage.setItem('sid', sid); } catch {} }

async function api(path, {method = 'GET', body} = {}) {
  const r = await fetch(path, {method, headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: body ? JSON.stringify(body) : undefined});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || (data.errors || []).map(x => x.error).join('; ') || 'Request failed'); e.data = data; throw e; }
  return data;
}

const state = {config: null, answers: {}, i: 0, profile: null, snapshot: null, personaId: 'debt-free-coach', agentId: 'budget', lastTurn: null};
const show = id => { document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== id); $('#restart').hidden = id === 'v-landing'; window.scrollTo(0, 0); };

// ---------- Landing ----------
function renderCatalog() {
  const {personas, agents} = state.config.catalog;
  const card = (x, sub) => `<div class="card ${x.status === 'locked' ? 'locked' : ''}"><div class="row" style="margin:0;justify-content:space-between"><strong>${esc(x.name)}</strong><span class="badge">${x.status === 'locked' ? 'Locked' : 'Live'}</span></div><div class="small muted">${esc(sub)}</div></div>`;
  $('#personas').innerHTML = personas.map(p => card(p, `${p.philosophy}. Inspired by the public work of ${p.inspiredBy}.`)).join('');
  $('#agents').innerHTML = agents.map(a => card(a, a.job)).join('');
}

// ---------- Quiz ----------
const setPath = (obj, path, val) => { const k = path.split('.'); let o = obj; k.slice(0, -1).forEach(x => o = o[x] ??= {}); o[k.at(-1)] = val; };
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const label = s => (typeof s === 'string' ? s : s.label).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, c => c.toUpperCase());
const val = s => (typeof s === 'string' ? s : s.value);

function lastMonths(n) { const out = [], d = new Date(); for (let i = n; i >= 1; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.toISOString().slice(0, 7)); } return out; }

function renderQuestion() {
  const qs = state.config.quiz.questions, q = qs[state.i];
  $('#bar').style.width = `${Math.round(state.i / qs.length * 100)}%`;
  $('#q-section').textContent = `${q.section} · ${state.i + 1} of ${qs.length}`;
  $('#q-prompt').textContent = q.prompt;
  $('#q-error').textContent = '';
  $('#q-back').disabled = state.i === 0;
  $('#q-skip').hidden = q.required;
  const cur = getPath(state.answers, q.field);
  const body = $('#q-body');

  if (q.type === 'single' || q.type === 'multi' || q.type === 'boolean') {
    const options = q.type === 'boolean' ? [{value: true, label: 'Yes'}, {value: false, label: 'No'}] : q.options;
    body.innerHTML = `<div class="opts">${options.map((o, k) => {
      const on = q.type === 'multi' ? (cur || []).includes(val(o)) : cur === val(o);
      return `<button type="button" class="opt ${on ? 'on' : ''}" data-k="${k}">${esc(label(o))}</button>`;
    }).join('')}</div>${q.id === 'portfolio' ? '<div id="pf-extra"></div>' : ''}`;
    body.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const v = val(options[+b.dataset.k]);
      if (q.type === 'multi') { const list = new Set(cur || []); list.has(v) ? list.delete(v) : (!q.maxSelect || list.size < q.maxSelect) && list.add(v); setPath(state.answers, q.field, [...list]); renderQuestion(); }
      else { setPath(state.answers, q.field, v); if (q.id === 'portfolio') renderQuestion(); else next(); }
    });
    if (q.id === 'portfolio') renderPortfolioExtra(cur);
  } else if (q.type === 'scale') {
    body.innerHTML = `<div class="opts" style="grid-template-columns:repeat(5,1fr);max-width:360px">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="opt ${cur === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div><p class="small muted">1 = not at all, 5 = completely</p>`;
    body.querySelectorAll('.opt').forEach(b => b.onclick = () => { setPath(state.answers, q.field, +b.dataset.n); next(); });
  } else if (q.type === 'money_series') {
    const months = lastMonths(q.months), list = cur || [];
    body.innerHTML = `<div class="money-grid">${months.map((m, k) => `<label>${esc(new Date(m + '-15').toLocaleString('en-US', {month: 'short', year: 'numeric'}))}<input inputmode="decimal" data-m="${m}" value="${esc(list.find(x => x.month === m)?.amount ?? '')}" placeholder="$0.00"></label>`).join('')}</div><p class="small muted">Take-home pay after taxes. Leave a month blank if you don't remember.</p>`;
  } else if (q.type === 'money') {
    body.innerHTML = `<div style="max-width:240px"><input inputmode="decimal" id="q-money" value="${esc(cur ?? '')}" placeholder="$0.00"></div>`;
  } else if (q.type === 'rows') {
    const list = cur?.length ? cur : (q.fixedRows || ['']).map(n => ({name: n.replace(/_/g, ' ')}));
    const cols = q.columns;
    const rowHtml = r => `<div class="r">${cols.map(c => `<label>${esc(label(c.key))}<input data-k="${c.key}" ${c.type === 'text' ? '' : 'inputmode="decimal"'} value="${esc(r[c.key] ?? '')}"></label>`).join('')}${q.fixedRows ? '' : '<button type="button" class="link rm">remove</button>'}</div>`;
    body.innerHTML = `<div class="rows">${list.map(rowHtml).join('')}</div>${q.fixedRows ? '' : '<button type="button" class="ghost" id="add-row">+ Add another</button>'}`;
    const rows = body.querySelector('.rows');
    body.querySelector('#add-row')?.addEventListener('click', () => rows.insertAdjacentHTML('beforeend', rowHtml({})));
    rows.addEventListener('click', e => { if (e.target.classList.contains('rm')) e.target.closest('.r').remove(); });
  }
}

function renderPortfolioExtra(choice) {
  const box = $('#pf-extra');
  if (choice === 'upload_csv') {
    box.innerHTML = `<p class="small muted">Export holdings from your brokerage as CSV (columns: symbol, sector, market_value). We never ask for your brokerage password.</p><input type="file" accept=".csv,text/csv" id="pf-file"><div class="row"><button type="button" class="ghost" id="pf-sample">Use sample portfolio (synthetic)</button></div><div id="pf-out" class="small"></div>`;
    const done = s => { state.answers.portfolio = 'upload_csv'; state.portfolioSummary = s; $('#pf-out').innerHTML = `Loaded ${s.holdings} holdings worth <strong>${usd(s.marketValue)}</strong>, est. fees ${usd(s.estimatedAnnualFees)}/yr.`; };
    $('#pf-file').onchange = async e => { try { const csv = await e.target.files[0].text(); done(await api('/api/portfolio/upload', {method: 'POST', body: {csv}})); } catch (err) { $('#pf-out').textContent = err.message; } };
    $('#pf-sample').onclick = async () => { try { done(await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}})); } catch (err) { $('#pf-out').textContent = err.message; } };
  } else if (choice === 'connect_brokerage_sandbox') {
    box.innerHTML = `<p class="small muted">Brokerage connection would go through an aggregator (Plaid Investments). It's sandbox-only in this prototype, so use the CSV upload for now.</p>`;
  } else box.innerHTML = '';
}

function collect() {
  const q = state.config.quiz.questions[state.i], body = $('#q-body');
  if (q.type === 'money_series') setPath(state.answers, q.field, [...body.querySelectorAll('input')].filter(i => i.value.trim()).map(i => ({month: i.dataset.m, amount: i.value.trim()})));
  if (q.type === 'money') { const v = $('#q-money').value.trim(); setPath(state.answers, q.field, v || undefined); }
  if (q.type === 'rows') setPath(state.answers, q.field, [...body.querySelectorAll('.r')].map(r => Object.fromEntries([...r.querySelectorAll('input')].map(i => [i.dataset.k, i.value.trim()]))).filter(r => Object.entries(r).some(([k, v]) => k !== 'name' && v)));
  if (q.required) { const v = getPath(state.answers, q.field); if (v === undefined || (Array.isArray(v) && !v.length)) { $('#q-error').textContent = q.type === 'money_series' ? 'Enter at least one month so we can plan.' : 'Please answer this one.'; return false; } }
  return true;
}
async function next() { if (!collect()) return; if (state.i < state.config.quiz.questions.length - 1) { state.i++; renderQuestion(); } else await submitQuiz(); }

async function submitQuiz(answers = state.answers) {
  try {
    const r = await api('/api/profile', {method: 'POST', body: {answers}});
    state.profile = r.profile; state.snapshot = r.snapshot; state.personaId = r.profile.personaHint || 'debt-free-coach';
    renderSnapshot(); show('v-snap');
  } catch (e) { show('v-quiz'); $('#q-error').textContent = e.message; }
}

// ---------- Snapshot ----------
function renderSnapshot() {
  const s = state.snapshot;
  if (s.status !== 'ok') { $('#snap').innerHTML = `<p class="error">${esc(s.message)}</p>`; return; }
  const stat = (k, v, bad) => `<div class="card stat ${bad ? 'bad' : ''}"><div class="small muted">${esc(k)}</div><div class="v">${usd(v)}</div></div>`;
  const short = Number(s.lowestMonthShortfall) > 0;
  $('#snap').innerHTML = `<div class="stats">${stat('Lowest month', s.lowestMonth)}${stat('Average month', s.averageMonth)}${stat('Swing (high − low)', s.swing)}${stat('Monthly essentials', s.essentialsTotal)}${short ? stat('Short in your lowest month', s.lowestMonthShortfall, true) : stat('Left over in lowest month', s.lowestMonthLeftover)}${s.portfolioValue ? stat('Invested', s.portfolioValue) : ''}</div>
    <p>${short ? `In a month like your lowest, you'd be <strong>${usd(s.lowestMonthShortfall)} short</strong> on essentials. That's the problem we plan around.` : `Even your lowest month covers essentials with ${usd(s.lowestMonthLeftover)} left. Let's put the extra to work.`}</p>
    <details class="small muted"><summary>How we calculated this</summary><ul>${s.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul></details>`;
}

// ---------- Chat ----------
function renderSidebar() {
  const {personas, agents} = state.config.catalog;
  $('#persona-switch').innerHTML = personas.map(p => `<button data-p="${p.id}" class="${p.id === state.personaId ? 'on' : ''}" ${p.status === 'locked' ? 'data-locked="1"' : ''}>${esc(p.name)}${p.status === 'locked' ? ' 🔒' : ''}</button>`).join('');
  $('#agent-list').innerHTML = agents.map(a => `<button data-a="${a.id}" class="${a.id === state.agentId ? 'on' : ''}" ${a.status === 'locked' ? 'data-locked="1"' : ''}>${esc(a.name)}${a.status === 'locked' ? ' 🔒' : ''}</button>`).join('');
  document.querySelectorAll('#persona-switch button').forEach(b => b.onclick = () => b.dataset.locked ? openUnlock() : switchPersona(b.dataset.p));
  document.querySelectorAll('#agent-list button').forEach(b => b.onclick = () => b.dataset.locked && openUnlock());
  const s = state.snapshot;
  $('#snap-mini').textContent = s?.status === 'ok' ? `Lowest month ${usd(s.lowestMonth)} · essentials ${usd(s.essentialsTotal)} · ${Number(s.lowestMonthShortfall) > 0 ? `short ${usd(s.lowestMonthShortfall)}` : `left ${usd(s.lowestMonthLeftover)}`}` : '';
  $('#suggest').innerHTML = ['How should I budget with my income swinging?', 'Should I pay off debt or save first?', 'What do I do in my slow months?'].map(t => `<button class="chip" type="button">${esc(t)}</button>`).join('');
  document.querySelectorAll('#suggest .chip').forEach(c => c.onclick = () => send(c.textContent));
}

function calcCard(c) {
  const rows = Object.entries(c.result || {}).filter(([, v]) => typeof v !== 'object' || v === null).map(([k, v]) => `<tr><td>${esc(label(k))}</td><td>${typeof v === 'string' && /^-?\d+\.\d{2}$/.test(v) ? usd(v) : esc(v ?? '—')}</td></tr>`).join('');
  return `<div class="calc"><div class="small"><strong>${esc(label(c.name))}</strong> <span class="muted">computed in code, exact cents</span></div><table>${rows}</table></div>`;
}

function botMessage(r, note) {
  const el = document.createElement('div'); el.className = 'msg bot';
  const picked = r.candidates?.find(c => c.id === r.pick?.pickId);
  el.innerHTML = `<div class="who">${esc(r.personaName || r.personaId)}${note ? ` <span class="muted">· ${esc(note)}</span>` : ''}${r.mode === 'mock' ? ' <span class="pill">mock engine</span>' : r.mode === 'mock-fallback' ? ' <span class="pill" title="Live AI failed; answered by the rule-based engine">offline fallback</span>' : ' <span class="pill">live AI</span>'}</div>
    <div>${esc(r.text)}</div>
    ${(picked?.calculations || r.calculations || []).slice(1).map(calcCard).join('')}
    <div class="chips">${(r.citations || []).map(c => `<span class="chip" title="${esc(c.ref)}">📖 ${esc(c.title)}</span>`).join('')}</div>
    <div class="row" style="margin:8px 0 0">${r.candidates?.length ? `<button class="link" data-drawer>See all ${r.candidates.length} options</button>` : ''}</div>
    <div class="small muted">${esc(r.disclosure || '')}</div>`;
  el.querySelector('[data-drawer]')?.addEventListener('click', () => openDrawer(r));
  $('#log').append(el); el.scrollIntoView({behavior: 'smooth', block: 'start'});
}

function openDrawer(r) {
  const v = r.validation;
  const check = v ? `<p class="small"><strong>Number check:</strong> the agent proposed ${v.generated} options; ${v.kept} passed, ${v.dropped.length} were dropped.${v.replyVerified === false ? ' The mentor\'s wording used an unverified number, so we showed the option\'s own text instead.' : ''}</p>${v.dropped.length ? `<details class="small muted"><summary>Dropped options</summary><ul>${v.dropped.map(d => `<li>${esc(d.title)}: ${esc(d.reason)}</li>`).join('')}</ul></details>` : ''}` : '';
  $('#drawer-body').innerHTML = check + r.candidates.map(c => `<div class="opt-card ${c.id === r.pick?.pickId ? 'picked' : ''}"><strong>${esc(c.title)}</strong>${c.id === r.pick?.pickId ? ' <span class="badge">Picked</span>' : r.pick?.runnersUp?.includes(c.id) ? ' <span class="pill">Runner-up</span>' : ''}<div class="small">${esc(c.summary)}</div><div class="small muted">Tradeoff: ${esc(c.tradeoffs)} · Risk: ${esc(c.risk)}${c.timeToGoal ? ` · ${esc(c.timeToGoal)} months` : ''}</div></div>`).join('');
  $('#drawer').showModal();
}

async function send(text) {
  text = text.trim(); if (!text) return;
  const u = document.createElement('div'); u.className = 'msg user'; u.textContent = text; $('#log').append(u);
  $('#msg').value = ''; const btn = $('#composer button'); btn.disabled = true;
  const wait = document.createElement('div'); wait.className = 'msg bot muted'; wait.textContent = 'Building your options and checking every number…'; $('#log').append(wait);
  try { const r = await api('/api/chat', {method: 'POST', body: {message: text, personaId: state.personaId, agentId: state.agentId}}); state.lastTurn = r.turnId; botMessage(r); refreshMemory(); }
  catch (e) { const el = document.createElement('div'); el.className = 'msg bot error'; el.textContent = e.message; $('#log').append(el); }
  finally { btn.disabled = false; wait.remove(); }
}

async function switchPersona(id) {
  if (id === state.personaId) return;
  state.personaId = id; renderSidebar();
  if (!state.lastTurn) return;
  try { botMessage(await api('/api/repick', {method: 'POST', body: {turnId: state.lastTurn, personaId: id}}), 'same options, new pick'); }
  catch (e) { const el = document.createElement('div'); el.className = 'msg bot error'; el.textContent = e.message; $('#log').append(el); }
}

async function refreshMemory() { try { const {memory} = await api('/api/memory'); $('#memory').innerHTML = memory.length ? memory.map(m => `<li>${esc(m.fact)}</li>`).join('') : '<li class="muted">Nothing yet</li>'; } catch {} }

function openUnlock() { $('#unlock-msg').textContent = ''; $('#unlock').showModal(); }
$('#unlock-go').addEventListener('click', async e => { e.preventDefault(); try { $('#unlock-msg').textContent = (await api('/api/checkout', {method: 'POST'})).message; } catch (err) { $('#unlock-msg').textContent = err.message; } });

// ---------- Demo profile ----------
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

// ---------- Boot ----------
async function boot() {
  state.config = await api('/api/config');
  $('#engine').textContent = state.config.engine === 'live' ? 'Live AI' : 'Mock engine';
  renderCatalog();
  $('#start').onclick = () => { state.i = 0; state.answers = {}; renderQuestion(); show('v-quiz'); };
  $('#demo').onclick = async () => { await api('/api/portfolio/upload', {method: 'POST', body: {sample: true}}).catch(() => {}); submitQuiz(DEMO); };
  $('#q-next').onclick = next;
  $('#q-back').onclick = () => { collect(); state.i = Math.max(0, state.i - 1); renderQuestion(); };
  $('#q-skip').onclick = () => { state.i < state.config.quiz.questions.length - 1 ? (state.i++, renderQuestion()) : submitQuiz(); };
  $('#to-chat').onclick = () => { $('#log').innerHTML = ''; state.lastTurn = null; renderSidebar(); refreshMemory(); show('v-chat'); $('#msg').focus(); };
  $('#composer').onsubmit = e => { e.preventDefault(); send($('#msg').value); };
  $('#restart').onclick = async () => { await api('/api/session', {method: 'DELETE'}).catch(() => {}); location.reload(); };
  try { const r = await api('/api/profile'); if (r.profile?.incomeHistory?.length) { state.profile = r.profile; state.snapshot = r.snapshot; state.personaId = r.profile.personaHint || state.personaId; renderSnapshot(); show('v-snap'); return; } } catch {}
  show('v-landing');
}
boot().catch(e => { document.body.insertAdjacentHTML('afterbegin', `<p class="error">${esc(e.message)}</p>`); });
