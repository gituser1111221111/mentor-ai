// Mentor Labs dashboard (Investing + Budget), built to the approved concept screens.
// Every figure comes from the server's code-computed workspace (/api/workspace) or the labeled sample
// (/api/workspace/demo). Samples are display-only and never saved as the user's finances.
const root = document.querySelector('#workspace-content');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const usd = (v, d = 0) => num(v) === null ? '—' : new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: d, maximumFractionDigits: d}).format(Number(v));
const signedUsd = v => num(v) === null ? '—' : (v >= 0 ? '+' : '−') + usd(Math.abs(v));
const pct = (v, d = 1) => num(v) === null ? '—' : `${Number(v).toFixed(d)}%`;
const signedPct = (v, d = 1) => num(v) === null ? '—' : `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}%`;
const fix = (v, d = 2) => num(v) === null ? '—' : Number(v).toFixed(d);
const cents = v => Math.round(Number(v || 0) * 100);
const info = text => `<span class="db-i" title="${esc(text)}" aria-label="${esc(text)}" role="img"></span>`;
const MONTH = m => new Date(`${m}-15T12:00:00Z`).toLocaleString('en-US', {month: 'short', timeZone: 'UTC'});
const MONTH_LONG = m => new Date(`${m}-15T12:00:00Z`).toLocaleString('en-US', {month: 'long', timeZone: 'UTC'});

const P = {
  overview: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', risk: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', improve: 'M3 17l6-6 4 4 8-8 M14 7h7v7',
  holdings: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5', calendar: 'M4 5h16v16H4z M4 10h16 M9 3v4 M15 3v4', news: 'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h4',
  guidelines: 'M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5z', cashflow: 'M4 8h13l-3-3 M20 16H7l3 3', spending: 'M12 3v9h9 M20.5 14A9 9 0 1 1 10 3.5',
  debt: 'M3 6h18v12H3z M3 10h18 M7 15h4', goals: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01', review: 'M8 4h8v3H8z M6 5H4v16h16V5h-2 M8 13l3 3 5-6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  book: 'M3 5a2 2 0 0 1 2-2h6v18H5a2 2 0 0 1-2-2z M21 5a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z', upload: 'M12 16V4 M7 9l5-5 5 5 M4 20h16', download: 'M12 4v12 M7 11l5 5 5-5 M4 20h16',
  plus: 'M12 5v14 M5 12h14', play: 'M7 4l13 8-13 8z', reset: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5', check: 'M5 12l5 5 9-10', send: 'M22 2 11 13 M22 2l-7 20-4-9-9-4z',
  warn: 'M12 3 2 21h20z M12 10v5 M12 18h.01', home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', food: 'M7 3v8a2 2 0 0 0 4 0V3 M9 11v10 M17 3c-2 0-3 3-3 6s1 4 3 4v8',
  car: 'M5 16l1.5-6h11L19 16 M3 16h18v4H3z M7 20v1 M17 20v1', heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', stack: 'M12 3 3 7l9 4 9-4z M3 12l9 4 9-4 M3 17l9 4 9-4',
  dot: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', chev: 'M9 6l6 6-6 6', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', card: 'M3 6h18v12H3z M3 10h18',
};
const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || P.dot}"/></svg>`;
const catIcon = name => /hous|rent|mortgage/i.test(name) ? 'home' : /food|grocer|dining|eat/i.test(name) ? 'food' : /transport|car|gas|transit|auto/i.test(name) ? 'car' : /life|fun|enter|personal|shop/i.test(name) ? 'heart' : /debt|loan|card/i.test(name) ? 'stack' : 'dot';

const NAV = {
  portfolio: [['overview', 'Overview'], ['risk', 'Risk review'], ['improve', 'Improve'], ['holdings', 'Holdings'], ['calendar', 'Calendar'], ['news', 'News'], ['guidelines', 'Guidelines']],
  budget: [['overview', 'Overview'], ['cashflow', 'Cash flow'], ['spending', 'Spending'], ['debt', 'Debt plan'], ['goals', 'Goals'], ['review', 'Review'], ['settings', 'Settings']],
};
const NAV_ICON = {overview: 'overview', risk: 'risk', improve: 'improve', holdings: 'holdings', calendar: 'calendar', news: 'news', guidelines: 'guidelines', cashflow: 'cashflow', spending: 'spending', debt: 'debt', goals: 'goals', review: 'review', settings: 'settings'};

const state = {tab: 'budget', view: {portfolio: 'overview', budget: 'overview'}, session: null, demo: null, market: null, scenario: null, scenarioMode: 'baseline', perfRange: 52, flowRange: 6, month: null, edit: null, charts: []};

async function api(path, method = 'GET', body) {
  let sid; try { sid = localStorage.getItem('sid'); } catch {}
  if (!sid) throw Error('Enable browser storage to save your workspace.');
  const r = await fetch(path, {method, headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: body ? JSON.stringify(body) : undefined});
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || 'The dashboard could not update.');
  return d;
}
const status = text => { state.statusText = text || ''; const el = root.querySelector('.db-status'); if (el) el.textContent = state.statusText; };

// ---------- data selection: personal when present, labeled sample otherwise ----------
function investing() {
  const own = state.session?.profile?.portfolio?.securities?.length ? state.session : null;
  const src = own || state.demo;
  return {sample: !own, ws: src, risk: src?.advancedRisk, portfolio: src?.profile?.portfolio, guidelines: src?.guidelines, market: own ? state.market : state.demo?.marketContext};
}
function budget() {
  const own = state.session?.budget?.ready ? state.session : null;
  const src = own || state.demo;
  const p = src?.profile || {}, snap = src?.budget?.snapshot || {};
  const income = [...(p.incomeHistory || [])].sort((a, b) => a.month.localeCompare(b.month));
  const debtMin = (p.debts || []).reduce((t, d) => t + cents(d.minPayment), 0);
  const cats = [...(p.bills || []).map(r => ({name: r.name, amount: cents(r.amount), fixed: true})), ...(p.expenses || []).map(r => ({name: r.name, amount: cents(r.amount), fixed: false}))];
  if (debtMin) cats.push({name: 'Debt payments', amount: debtMin, fixed: true, debt: true});
  const planned = cats.reduce((t, c) => t + c.amount, 0);
  const month = income.some(x => x.month === state.month) ? state.month : income.at(-1)?.month;
  const monthIncome = cents(income.find(x => x.month === month)?.amount);
  const savings = cents(p.savings), goal = src?.budget?.cashCushion == null ? null : cents(src.budget.cashCushion);
  return {sample: !own, src, p, snap, income, cats, planned, month, monthIncome, available: monthIncome - planned, savings, goal, debts: p.debts || []};
}
const dollars = c => c / 100;

// ---------- risk score (same weighting as the Sentinel review: high 10, medium 5, low 2) ----------
function riskScore(risk) {
  if (!risk) return null;
  const w = {high: 10, med: 5, low: 2};
  return Math.max(0, Math.min(100, Math.round(100 - (risk.breaches || []).reduce((t, b) => t + (w[b.severity] ?? 0), 0))));
}
const riskWord = s => s >= 80 ? 'Low risk' : s >= 55 ? 'Moderate risk' : 'Elevated risk';
const breachCount = risk => (risk?.breaches || []).filter(b => b.severity !== 'info').length;
const top3 = risk => (risk?.rows || []).filter(r => !r.isCash).slice(0, 3);

// ---------- shell ----------
function shell(body) {
  const tab = state.tab, view = state.view[tab];
  const inv = investing();
  const flags = breachCount(inv.risk);
  let done = 0; try { done = new Set([...(JSON.parse(localStorage.getItem('completedChapters') || '[]')), ...(JSON.parse(localStorage.getItem('mentor-learning-completed') || '[]'))]).size; } catch {}
  const step = Math.min(13, done + 1);
  root.innerHTML = `<div class="db-shell"><aside class="db-side" aria-label="Dashboard navigation">
    <div class="db-switch" role="group" aria-label="Dashboard"><button type="button" data-workspace-tab="portfolio" aria-pressed="${tab === 'portfolio'}">Investing</button><button type="button" data-workspace-tab="budget" aria-pressed="${tab === 'budget'}">Budget</button></div>
    <nav class="db-nav">${NAV[tab].map(([id, label]) => `<button type="button" data-view="${id}" ${id === view ? 'aria-current="page"' : ''}>${svg(NAV_ICON[id])}<span>${label}</span>${tab === 'portfolio' && id === 'risk' && flags ? `<span class="db-count">${flags}</span>` : ''}</button>`).join('')}</nav>
    <div class="db-side-foot"><button type="button" class="db-guide" data-learn><div class="db-guide-top">${svg('book')}<div><strong>Learning guide</strong><small>13-step program</small></div><span class="db-chev">›</span></div><div class="db-progress"><i style="width:${Math.round(step / 13 * 100)}%"></i></div><span class="db-step">Step ${step} of 13</span></button>
    <div class="db-avail"><span class="db-dot"></span><div><b>Teacher available</b>Typically replies in minutes</div></div></div>
  </aside><div class="db-main">${body}</div></div>`;
  root.dataset.sampleBudget = String(budget().sample); root.dataset.samplePortfolio = String(inv.sample);
}
function head(title, sub, badge, actions = '') {
  return `<div class="db-head"><div><h2>${esc(title)}${badge ? `<span class="db-badge">${esc(badge)}</span>` : ''}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="db-actions">${actions}</div></div><p class="db-status" role="status">${esc(state.statusText || '')}</p>`;
}
const btn = (label, attrs = '', icon = '', primary = false) => `<button type="button" class="db-btn${primary ? ' primary' : ''}" ${attrs}>${icon ? svg(icon) : ''}${esc(label)}</button>`;
const stat = (label, value, tip, sub = '', cls = '') => `<article class="db-card db-stat"><span>${esc(label)} ${tip ? info(tip) : ''}</span><strong class="${cls}">${value}</strong>${sub ? `<em>${sub}</em>` : ''}</article>`;
function teacher(prompt, placeholder = 'Ask about these numbers...') {
  let persona = 'debt-free-coach'; try { persona = JSON.parse(localStorage.getItem('mentor-labs-choice') || '{}').personaId || persona; } catch {}
  return `<div class="db-teacher"><div class="db-teacher-top"><img src="/img/mentors/${esc(persona)}.webp" alt="" onerror="this.src='/img/mentor-logo-suede.webp'"><div><b>Ask your teacher <span class="db-dot"></span></b><p>${esc(prompt)}</p></div></div><form data-ask><input aria-label="Ask your teacher" placeholder="${esc(placeholder)}" value=""><button type="submit" aria-label="Send">${svg('send')}</button></form></div>`;
}
const bar = (value, max, light = false, thin = false) => `<div class="db-track${light ? ' light' : ''}${thin ? ' thin' : ''}"><i style="width:${Math.max(0, Math.min(100, max ? value / max * 100 : 0))}%"></i></div>`;
const logo = sym => { const palette = ['#155c49', '#2e7d5b', '#0f493b', '#3d6b5a', '#1f6b4f', '#4a7c63']; let h = 0; for (const ch of sym) h = (h * 31 + ch.charCodeAt(0)) % 997; return `<span class="db-logo" style="background:${palette[h % palette.length]}">${esc(sym.slice(0, 4))}</span>`; };

// ---------- charts ----------
function clearCharts() { for (const c of state.charts) c.destroy(); state.charts = []; }
function lineChart(canvas, labels, sets, {percent = false, money = false, min, max} = {}) {
  if (!window.Chart || !canvas) return;
  const tick = v => percent ? `${v > 0 ? '+' : ''}${v}%` : money ? `$${Number(v).toLocaleString('en-US')}` : v;
  state.charts.push(new window.Chart(canvas, {type: 'line', data: {labels, datasets: sets.map(s => ({label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.fill || 'transparent', fill: Boolean(s.fill), borderWidth: s.width || 2, borderDash: s.dash || [], pointRadius: s.points ? 3.5 : 0, pointBackgroundColor: '#fff', pointBorderWidth: 2, tension: .25}))},
    options: {responsive: true, maintainAspectRatio: false, animation: false, interaction: {mode: 'index', intersect: false}, plugins: {legend: {display: false}, tooltip: {callbacks: {label: c => `${c.dataset.label}: ${percent ? signedPct(c.parsed.y) : money ? usd(c.parsed.y) : c.parsed.y}`}}},
      scales: {x: {grid: {display: false}, ticks: {color: '#6f7a74', font: {size: 11}, maxTicksLimit: 12, autoSkip: true}}, y: {min, max, grid: {color: '#efede6'}, border: {display: false}, ticks: {color: '#6f7a74', font: {size: 11}, callback: tick}}}}}));
}
function donut(canvas, values, colors) {
  if (!window.Chart || !canvas) return;
  state.charts.push(new window.Chart(canvas, {type: 'doughnut', data: {datasets: [{data: values, backgroundColor: colors, borderWidth: 0}]}, options: {cutout: '68%', responsive: true, maintainAspectRatio: false, animation: false, plugins: {legend: {display: false}, tooltip: {enabled: false}}}}));
}

// ================= INVESTING =================
function invOverview() {
  const {sample, risk, portfolio, market} = investing();
  if (!risk) return empty('Your portfolio');
  const rows = risk.rows || [], total = Number(portfolio?.marketValue) || 0;
  const cost = rows.reduce((t, r) => t + (num(r.costBasis) ?? 0), 0), costKnown = rows.length && rows.every(r => num(r.costBasis) !== null);
  const gain = costKnown ? total - cost : null, score = riskScore(risk), m = risk.metrics || {}, h = risk.history || {};
  const t3 = top3(risk), t3w = t3.reduce((s, r) => s + r.weight, 0);
  const classes = [['Stocks', rows.filter(r => !r.isCash && r.sector !== 'Crypto').reduce((s, r) => s + r.weight, 0)], ['Crypto', rows.filter(r => r.sector === 'Crypto').reduce((s, r) => s + r.weight, 0)], ['Cash', rows.filter(r => r.isCash).reduce((s, r) => s + r.weight, 0)], ['Unclassified', rows.filter(r => !r.isCash && r.sector === 'Unknown').reduce((s, r) => s + r.weight, 0)]];
  const body = head('Your portfolio', '', sample ? 'Example portfolio' : '', btn('Import holdings', 'data-import', 'upload') + btn('Export', 'data-export="holdings"', 'download')) + `
  <div class="db-grid db-g4">${stat('Portfolio value', usd(total), 'Imported market values. A refresh does not revalue your holdings.')}${stat('Unrealized gain', gain === null ? '—' : signedUsd(gain), 'Value minus the cost basis you imported.', gain === null ? 'Add cost basis to see this' : signedPct(cost ? gain / cost * 100 : null) + ' on cost', gain === null ? '' : gain >= 0 ? 'pos' : 'neg')}${stat('Historical mix return', signedPct(m.ret1y), 'Your current mix replayed over the past year of weekly closes. Not your account performance.', `S&amp;P 500 ${signedPct(m.spyRet)} (1Y)`, num(m.ret1y) >= 0 ? 'pos' : 'neg')}${stat('Risk health', `${score ?? '—'}<small> /100</small>`, 'Starts at 100 and drops for each guideline breach: 10 for high, 5 for medium, 2 for low severity.', sample ? 'Example guideline review' : 'Your saved guidelines')}</div>
  <article class="db-card"><div class="db-card-h"><h3>Performance</h3><div class="db-seg" role="group" aria-label="Range">${[[13, '3M'], [26, '6M'], [52, '1Y']].map(([w, l]) => `<button type="button" data-range="${w}" aria-pressed="${state.perfRange === w}">${l}</button>`).join('')}</div></div>
    <div class="db-legend"><span><i></i>Portfolio <b id="db-perf-p"></b></span><span><i class="dash"></i>S&amp;P 500 <b id="db-perf-b"></b></span></div>
    <div class="db-chart"><canvas id="db-perf" aria-label="Portfolio mix versus S&P 500"></canvas></div>
    <p class="db-note">${sample ? 'Illustrative data. ' : ''}Weekly closes ${esc(h.startDate || '')} to ${esc(h.endDate || '')} from the ${esc(h.source || 'dated snapshot')}. Not a recommendation to buy or sell any security.</p></article>
  <div class="db-grid db-g21"><article class="db-card"><h3>Holdings</h3><table class="db-table"><thead><tr><th>Asset</th><th class="r">Value</th><th class="r">Weight</th><th></th></tr></thead><tbody>${rows.slice(0, 4).map(r => holdingRow(r, risk)).join('')}</tbody></table><button type="button" class="db-link" data-view="holdings">View all ${rows.length} holdings ›</button></article>
    <article class="db-card"><h3>Exposure warnings ${info('Shares of your imported value by asset type. Concentration uses your three largest non-cash holdings.')}</h3>${t3w > 50 ? `<div class="db-warnbox">${svg('warn')}<div><b>High concentration: ${pct(t3w)}</b> in three holdings (${t3.map(r => esc(r.symbol)).join(', ')}). Consider diversifying.</div></div>` : ''}
      <div class="db-bars">${classes.map(([l, v], i) => `<div class="db-bar-row noicon"><span>${l}</span>${bar(v, 100, i > 0, true)}<span class="v">${pct(v)}</span></div>`).join('')}</div></article></div>
  <div class="db-grid db-g21"><article class="db-card"><h3>Key metrics ${info('Computed in code from weekly history of your current mix against the S&P 500.')}</h3><div class="db-grid db-g4">${[['Beta', fix(m.beta)], ['Volatility', pct(m.vol, 0)], ['Sharpe ratio', fix(m.sharpe)], ['Max drawdown', num(m.maxDD) === null ? '—' : '−' + pct(m.maxDD)]].map(([l, v]) => `<div><span class="db-note" style="color:var(--db-ink-2)">${l}</span><div style="font:700 1.25rem 'DM Sans',Arial;margin-top:4px">${v}</div></div>`).join('')}</div></article>
    ${teacher(sample ? 'What does concentration mean for a portfolio like this?' : 'What does concentration mean for my portfolio?')}</div>`;
  return {body, after: () => drawPerf(risk)};
}
function drawPerf(risk) {
  const h = risk?.history; if (!h?.dates?.length || !h.portfolio?.length) return;
  const n = Math.min(state.perfRange + 1, h.dates.length), s = h.dates.length - n;
  const base = (arr, i) => arr[s] ? (arr[i] / arr[s] - 1) * 100 : null;
  const p = h.dates.slice(s).map((_, i) => +base(h.portfolio, s + i).toFixed(2)), b = h.benchmark ? h.dates.slice(s).map((_, i) => +base(h.benchmark, s + i).toFixed(2)) : [];
  const el = id => root.querySelector(id); if (el('#db-perf-p')) el('#db-perf-p').textContent = `${signedPct(p.at(-1))} (${state.perfRange === 52 ? '1Y' : state.perfRange === 26 ? '6M' : '3M'})`; if (el('#db-perf-b')) el('#db-perf-b').textContent = b.length ? signedPct(b.at(-1)) : '—';
  lineChart(root.querySelector('#db-perf'), h.dates.slice(s).map(d => MONTH(d.slice(0, 7))), [{label: 'Portfolio', data: p, color: '#155c49', fill: 'rgba(21,92,73,.08)'}, {label: 'S&P 500', data: b, color: '#9aa39e', dash: [5, 4], width: 1.6}], {percent: true});
}
function holdingRow(r, risk) {
  const breach = (risk?.breaches || []).some(b => b.id === 'position:' + r.symbol);
  return `<tr><td><div class="db-asset">${logo(r.symbol)}<div><b>${esc(r.symbol)}</b><small>${esc(r.company || r.sector || '')}</small></div></div></td><td class="r">${usd(r.value)}</td><td class="r">${pct(r.weight)}</td><td class="r"><span class="db-ok${breach ? ' warn' : ''}" title="${breach ? 'Above your position limit' : 'Within your position limit'}"></span></td></tr>`;
}
const checkStatus = c => c.status === 'pass' ? 'pass' : c.status === 'unknown' ? 'unknown' : c.severity === 'high' ? 'breach' : 'warn';
const checkWord = s => ({pass: 'Pass', warn: 'Warn', breach: 'Breach', unknown: 'Unknown'}[s]);
function invRisk() {
  const {sample, risk, guidelines} = investing();
  if (!risk) return empty('Risk review');
  const m = risk.metrics || {}, score = riskScore(risk), rows = (risk.rows || []).filter(r => !r.isCash), checks = risk.checks || [];
  const ringColor = score >= 80 ? '#3d9a62' : score >= 55 ? '#e0a43a' : '#b2452f';
  const top4 = rows.slice(0, 4), other = rows.slice(4), otherW = other.reduce((s, r) => s + r.weight, 0), maxW = Math.max(...rows.map(r => r.weight), otherW, 1);
  const sectors = Object.entries(risk.sectors || {}).sort((a, b) => b[1] - a[1]), sMax = Math.max(40, ...sectors.map(s => s[1]));
  const g = guidelines || {};
  const worst = prefix => { const list = checks.filter(c => c.id.startsWith(prefix)); if (!list.length) return null; const order = {breach: 3, warn: 2, unknown: 1, pass: 0}; return list.sort((a, b) => order[checkStatus(b)] - order[checkStatus(a)])[0]; };
  const lines = [['position:', `Position size (≤ ${g.maxPositionPercent ?? '—'}%)`], ['sector:', `Sector concentration (≤ ${g.maxSectorPercent ?? '—'}%)`], ['top-five', `Top-five share (≤ ${g.maxTop5Percent ?? '—'}%)`], ['drawdown', `Portfolio drawdown (≤ ${g.maxDrawdownPercent ?? '—'}%)`], ['volatility', `Volatility (≤ ${g.maxVolatilityPercent ?? '—'}%)`], ['holdings', `Diversification (≥ ${g.minHoldings ?? '—'} positions)`], ['crypto', `Crypto share (≤ ${g.maxCryptoPercent ?? '—'}%)`]].map(([id, label]) => { const c = worst(id); return c ? [label, checkStatus(c)] : null; }).filter(Boolean).slice(0, 6);
  const corr = rows.slice(0, 4).map(r => r.symbol), pair = (a, b) => a === b ? 1 : (risk.pairs || []).find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a))?.correlation;
  const body = head('Risk review', 'Portfolio risk and guideline check', sample ? 'Example portfolio' : '', btn('Import holdings', 'data-import', 'upload') + btn('Export', 'data-export="risk"', 'download')) + `
  <div class="db-grid db-g4">${stat('Beta', fix(m.beta), 'How much the mix moved with the S&P 500 over the past year. 1.0 moves with the market.')}${stat('Volatility', pct(m.vol), 'Annualized standard deviation of weekly returns.', '', 'pos')}${stat('Max drawdown', num(m.maxDD) === null ? '—' : '−' + pct(m.maxDD), 'Largest peak-to-trough fall of the mix over the window.', '', 'neg')}${stat('Sharpe ratio', fix(m.sharpe), 'Return above the 10-year Treasury rate per unit of volatility.')}</div>
  <div class="db-grid db-g2"><article class="db-card"><h3>Risk score ${info('100 minus points for each guideline breach: 10 high, 5 medium, 2 low.')}</h3><div class="db-score"><div class="db-ring" style="--p:${score};--c:${ringColor}"><div><div><b>${score}<small>/100</small></b><span>${riskWord(score)}</span></div></div></div><div>${breachCount(risk) ? `<span class="db-flag">${svg('warn', 'db-ic')} ${breachCount(risk)} guideline breach${breachCount(risk) === 1 ? '' : 'es'}</span>` : ''}<p class="db-note" style="color:var(--db-ink-2);font-size:.8rem">${score >= 80 ? 'Risk is within your guidelines.' : score >= 55 ? 'Risk is within a moderate range, with areas to address.' : 'Several guidelines are breached. Review the checklist.'}</p></div></div></article>
    <article class="db-card"><h3>Position concentration ${info('Share of imported value in each holding.')}</h3><table class="db-table"><thead><tr><th>Position</th><th></th><th class="r">% of portfolio</th></tr></thead><tbody>${top4.map(r => `<tr><td><b>${esc(r.symbol)}</b></td><td style="width:55%">${bar(r.weight, maxW, false, true)}</td><td class="r">${pct(r.weight)}</td></tr>`).join('')}${other.length ? `<tr><td>Other (${other.length})</td><td>${bar(otherW, maxW, true, true)}</td><td class="r">${pct(otherW)}</td></tr>` : ''}</tbody></table></article></div>
  <div class="db-grid db-g2"><article class="db-card"><h3>Sector exposure ${info('Sectors from your import, or the dated snapshot when the import has none.')}</h3><div class="db-bars">${sectors.map(([s, w]) => `<div class="db-bar-row noicon"><span style="font-size:.78rem">${esc(s)}</span>${bar(w, sMax, true, true)}<span class="v">${pct(w)}</span></div>`).join('')}</div></article>
    <article class="db-card"><h3>Guideline checklist ${info(sample ? 'Example limits applied to the example holdings.' : 'Your saved guideline limits.')}</h3><ul class="db-checks">${lines.map(([l, s]) => `<li><span class="db-ck ${s}">${s === 'pass' ? '✓' : s === 'unknown' ? '?' : '!'}</span><span>${esc(l)}</span><span class="db-pill ${s}">${checkWord(s)}</span></li>`).join('')}</ul></article></div>
  <div class="db-grid db-g21"><article class="db-card"><h3>Correlation <small>(selected assets)</small> ${info('Correlation of weekly returns over the window. 1.00 moves together exactly.')}</h3><table class="db-table db-corr"><thead><tr><th>Asset</th>${corr.map(s => `<th class="r" style="text-align:center">${esc(s)}</th>`).join('')}</tr></thead><tbody>${corr.map(a => `<tr><td>${esc(a)}</td>${corr.map(b => { const v = pair(a, b); return `<td class="${a === b ? 'diag' : num(v) !== null && v >= .6 ? 'hi' : ''}">${num(v) === null ? '—' : v.toFixed(2)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></article>
    ${teacher(`What does a beta of ${fix(m.beta)} mean for ${sample ? 'a portfolio like this' : 'my portfolio'}?`)}</div>`;
  return {body};
}
function invImprove() {
  const {sample, risk, guidelines} = investing();
  if (!risk) return empty('Explore portfolio tradeoffs');
  const rows = (risk.rows || []).filter(r => !r.isCash), sc = state.scenario, g = guidelines || {};
  const limit = sc?.positionLimit ?? state.draftLimit ?? Math.max(5, Math.min(50, g.maxPositionPercent ?? 25));
  const sym = sc?.symbol ?? state.draftSymbol ?? rows[0]?.symbol, from = rows.find(r => r.symbol === sym)?.weight;
  const to = sc?.toPercent ?? state.draftTo ?? Math.min(limit, from ?? limit);
  const before = sc?.before || risk, after = sc?.after, showAfter = Boolean(after) && state.scenarioMode === 'whatif';
  const bScore = riskScore(before), aScore = after ? riskScore(after) : null;
  const t3 = r => top3(r).reduce((s, x) => s + x.weight, 0);
  const allocRows = [...(before.rows || []).filter(r => !r.isCash).slice(0, 4).map(r => r.symbol), 'CASH'];
  const w = (r, s) => s === 'CASH' ? (r?.rows || []).filter(x => x.isCash).reduce((t, x) => t + x.weight, 0) : (r?.rows || []).find(x => x.symbol === s)?.weight ?? 0;
  const delta = (a, b, d = 1, pp = true) => num(a) === null || num(b) === null ? '—' : `<span class="${a - b <= 0 ? 'pos' : 'neg'}">${a - b <= 0 ? '−' : '+'}${Math.abs(a - b).toFixed(d)}${pp ? ' pp' : ''}</span>`;
  const body = head('Explore portfolio tradeoffs', 'Adjust position size and trims to see how risk, concentration, and allocation could change.', sample ? 'Example portfolio' : '', btn('Run scenario', 'data-run', 'play', true) + btn('Reset', 'data-reset-scenario', 'reset')) + `
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div class="db-radio" role="radiogroup" aria-label="View"><label class="${!showAfter ? 'on' : ''}"><input type="radio" name="db-mode" value="baseline" ${!showAfter ? 'checked' : ''}> Baseline <small>(current portfolio)</small></label><label class="${showAfter ? 'on' : ''}"><input type="radio" name="db-mode" value="whatif" ${showAfter ? 'checked' : ''} ${after ? '' : 'disabled'}> What-if <small>(proposed changes)</small></label></div><span class="db-chip" style="margin-left:auto">${svg('check')} Baseline unchanged</span></div>
  <div class="db-grid db-g3">${stat('Risk score (before)', `${bScore}<small> / 100</small>`, 'Score of your current holdings under these limits.')}${stat('Risk score (after)', aScore === null ? '—' : `${aScore}<small> / 100</small>`, 'Score after the trim, under the same limits.', '', aScore !== null && aScore >= bScore ? 'pos' : '')}${stat('Cash released', sc ? usd(sc.cashReleased) : '—', 'Value moved from the trimmed holding to cash in the scenario. No trade is placed.', '', 'pos')}</div>
  <div class="db-grid db-g2"><article class="db-card"><h3>Position limit ${info('Maximum share of the portfolio in any one holding, for this scenario only.')}</h3><p class="db-note">Max weight per holding</p><div style="display:flex;justify-content:flex-end"><span class="db-input" style="width:64px;text-align:center;font-weight:700" id="db-limit-out">${limit}%</span></div><input class="db-range" type="range" min="5" max="50" step="1" value="${limit}" id="db-limit" aria-label="Position limit"><div class="db-range-row"><span>5%</span><span>50%</span></div></article>
    <article class="db-card"><h3>Trim-to-cash scenario ${info('Reduce one holding to a target share and hold the proceeds as cash.')}</h3><p class="db-note">Reduce selected holding(s) and move proceeds to cash.</p><div class="db-trim" style="margin-top:12px"><select class="db-select" id="db-sym" aria-label="Holding">${rows.map(r => `<option value="${esc(r.symbol)}" ${r.symbol === sym ? 'selected' : ''}>${esc(r.symbol)}</option>`).join('')}</select><span>from</span><span class="db-input" style="width:78px;text-align:center">${pct(from)}</span><span>to</span><input class="db-input" id="db-to" inputmode="decimal" value="${Number(to).toFixed(1)}" aria-label="Target share in percent"><span>%</span></div></article></div>
  <article class="db-card"><div class="db-card-h"><h3>Allocation: before vs. after</h3><div class="db-legend" style="margin:0"><span><span class="db-swatch" style="background:#1f6b4f"></span>Before (baseline)</span><span><span class="db-swatch" style="background:#a9d3b5"></span>After (what-if)</span></div></div>
    <div class="db-bars">${allocRows.map(s => { const b = w(before, s), a = after ? w(after, s) : null, mx = Math.max(30, ...allocRows.map(x => Math.max(w(before, x), after ? w(after, x) : 0))); return `<div class="db-bar-row noicon" style="grid-template-columns:70px minmax(0,1fr) 54px;row-gap:3px"><b style="grid-row:span 2">${s === 'CASH' ? 'Cash' : esc(s)}</b>${bar(b, mx, false, true)}<span class="v" style="font-size:.74rem">${pct(b)}</span>${bar(a ?? 0, mx, true, true)}<span class="v" style="font-size:.74rem">${a === null ? '—' : pct(a)}</span></div>`; }).join('')}</div></article>
  <div class="db-grid db-g21"><article class="db-card"><h3>Key comparison ${info('Before uses your current holdings; after uses the scenario. Same weekly history and limits.')}</h3><table class="db-table"><thead><tr><th>Metric</th><th class="r">Before (baseline)</th><th class="r">After (what-if)</th><th class="r">Change</th></tr></thead><tbody>
    <tr><td>Concentration (top 3)</td><td class="r">${pct(t3(before))}</td><td class="r">${after ? pct(t3(after)) : '—'}</td><td class="r">${after ? delta(t3(after), t3(before)) : '—'}</td></tr>
    <tr><td>Beta</td><td class="r">${fix(before.metrics?.beta)}</td><td class="r">${after ? fix(after.metrics?.beta) : '—'}</td><td class="r">${after ? delta(after.metrics?.beta, before.metrics?.beta, 2, false) : '—'}</td></tr>
    <tr><td>Volatility (annualized)</td><td class="r">${pct(before.metrics?.vol)}</td><td class="r">${after ? pct(after.metrics?.vol) : '—'}</td><td class="r">${after ? delta(after.metrics?.vol, before.metrics?.vol) : '—'}</td></tr></tbody></table><p class="db-note" style="margin-top:6px">${esc(sc?.note || 'Scenario only. Nothing is saved and no trade is placed.')}</p></article>
    ${teacher(`What would be the impact of a larger trim${sym ? ' of ' + sym : ''}?`)}</div>`;
  return {body};
}
function invHoldings() {
  const {sample, risk} = investing();
  if (!risk) return empty('Holdings');
  const rows = risk.rows || [];
  const body = head('Holdings', 'Every imported position, valued as imported', sample ? 'Example portfolio' : '', btn('Import holdings', 'data-import', 'upload') + btn('Export', 'data-export="holdings"', 'download')) + `
  <article class="db-card"><table class="db-table"><thead><tr><th>Asset</th><th>Sector</th><th class="r">Value</th><th class="r">Weight</th><th class="r">Gain vs cost</th><th class="r">Price</th><th>Price source</th></tr></thead><tbody>${rows.map(r => `<tr><td><div class="db-asset">${logo(r.symbol)}<div><b>${esc(r.symbol)}</b><small>${esc(r.company || '')}</small></div></div></td><td>${esc(r.sector)}</td><td class="r">${usd(r.value, 2)}</td><td class="r">${pct(r.weight)}</td><td class="r ${num(r.plPct) === null ? '' : r.plPct >= 0 ? 'pos' : 'neg'}">${signedPct(r.plPct)}</td><td class="r">${usd(r.price, 2)}</td><td><small class="db-note">${esc(r.priceSource || '—')} ${esc(r.priceAsOf || '')}</small></td></tr>`).join('')}</tbody></table></article>`;
  return {body};
}
function invCalendar() {
  const {sample, risk, market} = investing();
  if (!risk) return empty('Calendar');
  const events = (risk.rows || []).filter(r => r.nextEarnings?.date).map(r => ({symbol: r.symbol, ...r.nextEarnings})).sort((a, b) => a.date.localeCompare(b.date));
  const econ = market?.economicEvents || [];
  const body = head('Calendar', 'Scheduled earnings and economic events. Dates can change.', sample ? 'Example portfolio' : '', sample ? '' : btn('Refresh market data', 'data-refresh', 'reset')) + `
  <div class="db-grid db-g2"><article class="db-card"><h3>Upcoming earnings</h3>${events.length ? `<ul class="db-list">${events.map(e => `<li><span><b>${esc(e.symbol)}</b> <small>${esc(e.time === 'amc' ? 'after close' : e.time === 'bmo' ? 'before open' : '')}</small></span><span>${esc(e.date)} <small>· ${esc(e.source || '')}</small></span></li>`).join('')}</ul>` : '<p class="db-empty">No scheduled earnings found for these holdings.</p>'}</article>
    <article class="db-card"><h3>Economic calendar</h3>${econ.length ? `<ul class="db-list">${econ.map(e => `<li><span>${esc(e.name || e.event || e.title || 'Event')}</span><span>${esc(e.date)} <small>· ${esc(e.source || '')}</small></span></li>`).join('')}</ul>` : `<p class="db-empty">${sample ? 'No events in the sample window.' : 'Refresh market data to load events.'}</p>`}</article></div>
  <p class="db-note">No earnings transcript is loaded. Ask your teacher what to listen for; it will not predict results.</p>`;
  return {body};
}
function invNews() {
  const {sample, market} = investing();
  const news = market?.news || [];
  const body = head('News', 'Recent headlines about your holdings, with source and date', sample ? 'Example portfolio' : '', sample ? '' : btn('Refresh market data', 'data-refresh', 'reset')) + `
  <article class="db-card">${news.length ? `<ul class="db-list">${news.map(n => `<li><span><b>${esc(n.symbol || '')}</b> ${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a>` : esc(n.title)}</span><small>${esc(n.source || n.provider || '')} · ${esc(n.date || n.providerAsOf || '')}</small></li>`).join('')}</ul>` : `<p class="db-empty">${sample ? 'No sample headlines.' : 'Refresh market data to load headlines for your holdings.'}</p>`}</article>`;
  return {body};
}
function invGuidelines() {
  const {sample} = investing();
  const body = head('Guidelines', 'Your own review limits. They flag holdings for review; they never place trades.', sample ? 'Example portfolio' : '') + `<article class="db-card" id="db-guidelines-slot"></article>`;
  return {body, after: () => { const g = document.querySelector('#portfolio-guidelines'); const slot = root.querySelector('#db-guidelines-slot'); if (g && slot) { slot.append(g); g.hidden = false; g.querySelectorAll('details').forEach(d => { d.open = true; }); } }};
}

// ================= BUDGET =================
function budgetHead(title, sub, actions) {
  const b = budget();
  const months = b.income.map(x => x.month);
  const sel = months.length ? `<select class="db-select" data-month aria-label="Month">${months.map(m => `<option value="${m}" ${m === b.month ? 'selected' : ''}>${MONTH_LONG(m)}</option>`).join('')}</select>` : '';
  return head(title, sub, b.sample ? 'Example budget' : '', sel + actions);
}
function catRows(b, max) { return b.cats.map(c => `<div class="db-bar-row">${svg(catIcon(c.name), 'db-ic')}<span>${esc(c.name)}</span>${bar(c.amount, max)}<span class="v">${b.monthIncome ? pct(c.amount / b.monthIncome * 100) : '—'}</span></div>`).join(''); }
function payoff(debts) {
  let months = 0, interest = 0; const list = debts.map(d => ({bal: Number(d.balance), rate: (d.rateBps || 0) / 10000 / 12, pay: Number(d.minPayment)}));
  if (!list.length) return null;
  while (list.some(d => d.bal > 0.005) && months < 600) { months++; for (const d of list) { if (d.bal <= 0) continue; const i = d.bal * d.rate; interest += i; d.bal = d.bal + i - d.pay; if (d.pay <= i) return {months: null, interest: null}; if (d.bal < 0) d.bal = 0; } }
  return {months, interest};
}
function budOverview() {
  const b = budget();
  if (!b.src) return empty('Your monthly plan');
  const gap = b.goal === null ? null : Math.max(0, b.goal - b.savings), monthsToGoal = gap === null ? null : gap === 0 ? 0 : b.available > 0 ? gap / b.available : null;
  const goalMonths = b.goal && b.planned ? b.goal / b.planned : null, progress = b.goal ? Math.min(100, b.savings / b.goal * 100) : null;
  const totalDebt = b.debts.reduce((t, d) => t + Number(d.balance), 0), pay = payoff(b.debts);
  const max = Math.max(...b.cats.map(c => c.amount), 1);
  const body = budgetHead('Your monthly plan', '', btn('Add your numbers', 'data-view="settings"', 'plus') + btn('Import', 'data-import-doc', 'upload')) + `
  <div class="db-grid db-g4">${stat('Income', usd(dollars(b.monthIncome)), `Take-home income saved for ${b.month ? MONTH_LONG(b.month) : 'this month'}.`)}${stat('Planned spending', usd(dollars(b.planned)), 'Fixed bills, everyday spending and debt minimums.')}${stat('Available', usd(dollars(b.available)), 'Income for the selected month minus planned spending.', '', b.available >= 0 ? 'pos' : 'neg')}${stat('Cushion gap', monthsToGoal === null ? (gap === null ? 'Not set' : '—') : `${monthsToGoal.toFixed(1)} months`, 'Months to reach your cash cushion goal if the available amount is saved each month.', gap === null ? '' : `${usd(dollars(gap))} to go`, 'pos')}</div>
  <article class="db-card"><div class="db-card-h"><h3>Income vs. current planned costs</h3>${b.sample ? '<span class="db-note">Illustrative data.</span>' : ''}</div><div class="db-legend"><span><i></i>Income</span><span><i class="light"></i>Planned costs</span></div><div class="db-chart"><canvas id="db-flow" aria-label="Income versus planned costs by month"></canvas></div></article>
  <div class="db-grid db-g21"><article class="db-card"><h3>Spending by category <small>(${b.month ? MONTH_LONG(b.month) : ''})</small></h3><table class="db-table"><thead><tr><th>Category</th><th class="r">Amount</th><th></th><th class="r">% of income ${info('Share of the selected month\'s take-home income.')}</th></tr></thead><tbody>${b.cats.map(c => `<tr><td><div class="db-asset">${svg(catIcon(c.name), 'db-ic')}<b>${esc(c.name)}</b></div></td><td class="r">${usd(dollars(c.amount))}</td><td style="width:34%">${bar(c.amount, max, true, true)}</td><td class="r">${b.monthIncome ? pct(c.amount / b.monthIncome * 100) : '—'}</td></tr>`).join('')}</tbody></table></article>
    <article class="db-card"><h3>Emergency fund goal</h3>${b.goal ? `<div style="display:flex;gap:10px">${svg('shield', 'db-ic')}<div style="flex:1"><div style="font-size:.84rem">${usd(dollars(b.goal))} (≈ ${goalMonths.toFixed(1)} months of planned costs)</div><div style="display:flex;align-items:center;gap:10px;margin:8px 0 4px">${bar(progress, 100)}<b>${Math.round(progress)}%</b></div><small class="db-note">${usd(dollars(b.savings))} saved · ${usd(dollars(gap))} to go</small></div></div>` : '<p class="db-empty">Set a cash cushion goal in Goals.</p>'}<hr class="db-divider" style="margin:14px 0">
      <div style="display:flex;gap:10px">${svg('card', 'db-ic')}<div><b style="font-size:.88rem">Debt payoff (preview)</b> ${info('Pays only the current minimums, with monthly interest at each debt\'s APR. An estimate, not a payoff quote.')}<div class="db-note" style="color:var(--db-ink-2);margin:4px 0">${b.debts.length ? (pay?.months ? `Pay off ${usd(totalDebt)} in ≈ ${pay.months} months` : 'Minimums do not cover the interest.') : 'No debts saved.'}</div><button type="button" class="db-link" data-view="debt">Explore debt plan ›</button></div></div></article></div>
  ${teacher(b.available > 0 ? 'You have room to build your emergency fund.' : 'Your planned costs are above this month\'s income.', 'Ask about these numbers...')}`;
  return {body, after: () => drawFlow(b, '#db-flow', 6)};
}
function drawFlow(b, sel, range) {
  const months = b.income.slice(-range), lo = Math.min(dollars(b.planned), ...months.map(m => Number(m.amount)));
  lineChart(root.querySelector(sel), months.map(m => MONTH(m.month)), [{label: 'Income', data: months.map(m => Number(m.amount)), color: '#155c49', fill: 'rgba(21,92,73,.07)', points: true}, {label: 'Planned costs', data: months.map(() => dollars(b.planned)), color: '#8fc29d', points: true}], {money: true, min: Math.max(0, Math.floor(lo * 0.85 / 500) * 500)});
}
function budCashflow() {
  const b = budget();
  if (!b.src) return empty('Cash flow');
  const vals = b.income.map(x => cents(x.amount)), low = vals.length ? Math.min(...vals) : 0, avg = vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : 0;
  const fixed = b.cats.filter(c => c.fixed).reduce((t, c) => t + c.amount, 0), flex = b.planned - fixed;
  const body = head('Cash flow', 'Income, planned costs, and monthly balance', b.sample ? 'Example budget' : '', `<select class="db-select" data-flow-range aria-label="Range">${[[6, 'Last 6 months'], [3, 'Last 3 months'], [12, 'Last 12 months']].map(([v, l]) => `<option value="${v}" ${state.flowRange === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` + btn('Add amount', 'data-view="settings"', 'plus') + btn('Export', 'data-export="cashflow"', 'download')) + `
  <div class="db-grid db-g4">${stat('Lowest income', usd(dollars(low)), 'Lowest saved take-home month. Plans built on it hold up in a slow month.')}${stat('Average income', usd(dollars(avg)), 'Average of saved months, to the cent.', '', 'pos')}${stat('Planned costs', usd(dollars(b.planned)), 'Current monthly plan: bills, spending and debt minimums.', '', 'pos')}${stat('Monthly balance', usd(dollars(avg - b.planned)), 'Average income minus planned costs.', '', avg - b.planned >= 0 ? 'pos' : 'neg')}</div>
  <article class="db-card"><div class="db-card-h"><h3>Income vs. planned costs</h3><div class="db-seg" role="group" aria-label="Range">${[[1, '1M'], [3, '3M'], [6, '6M']].map(([v, l]) => `<button type="button" data-flow="${v}" aria-pressed="${Math.min(state.flowRange, 6) === v}">${l}</button>`).join('')}</div></div><div class="db-legend"><span><i></i>Income</span><span><i class="light"></i>Planned costs</span></div><div class="db-chart"><canvas id="db-flow2" aria-label="Income versus planned costs"></canvas></div></article>
  <div class="db-grid db-g21"><article class="db-card"><h3>Saved income history ${info('Planned costs use your current plan for every month; past plans are not stored.')}</h3><table class="db-table"><thead><tr><th>Month</th><th class="r">Income</th><th class="r">Planned costs</th><th class="r">Saved income</th></tr></thead><tbody>${b.income.slice(-state.flowRange).map(x => { const s = cents(x.amount) - b.planned; return `<tr><td>${MONTH(x.month)}</td><td class="r">${usd(Number(x.amount))}</td><td class="r">${usd(dollars(b.planned))}</td><td class="r ${s >= 0 ? 'pos' : 'neg'}"><b>${usd(dollars(s))}</b></td></tr>`; }).join('')}</tbody></table></article>
    <article class="db-card"><h3>Costs: fixed vs. flexible ${info('Fixed: bills and debt minimums. Flexible: everyday spending.')}</h3><div class="db-donut"><div class="db-chart"><canvas id="db-donut"></canvas><div class="db-donut-center"><div><b>${usd(dollars(b.planned))}</b><span>Planned<br>costs</span></div></div></div><div><div class="db-kv"><span><span class="db-swatch" style="background:#155c49"></span>Fixed costs</span><b>${usd(dollars(fixed))} <small class="db-note">${b.planned ? pct(fixed / b.planned * 100) : ''}</small></b></div><div class="db-kv"><span><span class="db-swatch" style="background:#a9d3b5"></span>Flexible costs</span><b>${usd(dollars(flex))} <small class="db-note">${b.planned ? pct(flex / b.planned * 100) : ''}</small></b></div><hr class="db-divider"><div class="db-kv"><b>Total planned</b><b>${usd(dollars(b.planned))} <small class="db-note">100%</small></b></div></div></div></article></div>
  ${teacher('How can I increase my monthly balance?')}`;
  return {body, after: () => { drawFlow(b, '#db-flow2', Math.min(state.flowRange, 12)); donut(root.querySelector('#db-donut'), [fixed, flex], ['#155c49', '#a9d3b5']); }};
}
function budSpending() {
  const b = budget();
  if (!b.src) return empty('Spending');
  state.edit ||= b.cats.map(c => ({...c, amount: (c.amount / 100).toFixed(2)}));
  const edit = state.edit, total = edit.reduce((t, c) => t + cents(c.amount), 0), avail = b.monthIncome - total;
  const gap = b.goal === null ? null : Math.max(0, b.goal - b.savings), est = gap === null ? null : gap === 0 ? 0 : avail > 0 ? gap / avail : null;
  const max = Math.max(...b.cats.map(c => c.amount), 1);
  const body = budgetHead('Spending', 'Plan and adjust your monthly spending by category.', '') + `
  <div class="db-grid db-g2">${stat('Total costs', usd(dollars(b.planned)), 'Saved monthly plan.')}${stat('Available', usd(dollars(b.available)), 'Selected month income minus saved planned costs.', '', b.available >= 0 ? 'pos' : 'neg')}</div>
  <article class="db-card"><h3>Spending by category <small>(${b.month ? MONTH_LONG(b.month) : ''})</small></h3><div class="db-bars">${catRows(b, max)}</div></article>
  <div class="db-grid db-g21"><article class="db-card"><h3>Edit spending plan ${info('Saved as your monthly plan. Debt payments come from your debts; edit them in Debt plan.')}</h3><table class="db-table"><thead><tr><th>Category</th><th>Amount</th><th class="r">Share of income</th></tr></thead><tbody>${edit.map((c, i) => `<tr><td><div class="db-asset">${svg(catIcon(c.name), 'db-ic')}${c.debt ? `<b>${esc(c.name)}</b>` : `<input class="db-input" data-cat-name="${i}" value="${esc(c.name)}" aria-label="Category name" style="max-width:150px">`}</div></td><td><input class="db-input" data-cat-amount="${i}" inputmode="decimal" value="${esc(c.amount)}" ${c.debt ? 'readonly title="Edit in Debt plan"' : ''} aria-label="${esc(c.name)} amount" style="max-width:120px"></td><td class="r">${b.monthIncome ? pct(cents(c.amount) / b.monthIncome * 100) : '—'}</td></tr>`).join('')}</tbody></table><button type="button" class="db-add" data-add-cat>+ Add category</button></article>
    <article class="db-card"><h3>Planned costs summary</h3><div class="db-kv"><span>Total planned spending</span><b>${usd(dollars(total))}</b></div><div class="db-kv"><span>Share of income</span><b>${b.monthIncome ? pct(total / b.monthIncome * 100) : '—'}</b></div><hr class="db-divider"><div class="db-kv big"><span>Available after spending</span><b class="${avail >= 0 ? 'pos' : 'neg'}">${usd(dollars(avail))}</b></div><hr class="db-divider"><div class="db-kv"><span>Emergency fund goal ${info('Your saved cash cushion goal.')}</span><b>${b.goal === null ? 'Not set' : usd(dollars(b.goal))}</b></div><div class="db-kv"><span>Est. time to goal ${info('Remaining gap divided by the amount available after spending.')}</span><b>${est === null ? '—' : `${est.toFixed(1)} months`}</b></div></article></div>
  <div class="db-grid db-g21"><div style="display:flex;gap:10px">${btn(b.sample ? 'Save as my plan' : 'Save changes', 'data-save-plan', 'check', true)}${btn('Reset', 'data-reset-plan', 'reset')}</div>${teacher('How can I adjust this plan to add more to my emergency fund?')}</div>`;
  return {body};
}
function budDebt() {
  const b = budget();
  if (!b.src) return empty('Debt plan');
  const pay = payoff(b.debts), total = b.debts.reduce((t, d) => t + Number(d.balance), 0), mins = b.debts.reduce((t, d) => t + Number(d.minPayment), 0);
  const byBalance = [...b.debts].sort((a, c) => Number(a.balance) - Number(c.balance)), byRate = [...b.debts].sort((a, c) => c.rateBps - a.rateBps);
  const body = head('Debt plan', 'Your saved debts and a minimum-payment payoff estimate', b.sample ? 'Example budget' : '', btn('Edit debts', 'data-edit-finances', 'settings')) + `
  <div class="db-grid db-g4">${stat('Total debt', usd(total), 'Sum of saved balances.')}${stat('Monthly minimums', usd(mins), 'Included in planned costs.')}${stat('Payoff estimate', pay?.months ? `${pay.months} months` : '—', 'Minimum payments only, monthly interest at each APR.')}${stat('Interest estimate', pay?.interest ? usd(pay.interest) : '—', 'Interest paid over that schedule.', '', 'neg')}</div>
  <div class="db-grid db-g2"><article class="db-card"><h3>Your debts</h3>${b.debts.length ? `<table class="db-table"><thead><tr><th>Debt</th><th class="r">Balance</th><th class="r">APR</th><th class="r">Minimum</th></tr></thead><tbody>${b.debts.map(d => `<tr><td><b>${esc(d.name)}</b></td><td class="r">${usd(Number(d.balance), 2)}</td><td class="r">${(d.rateBps / 100).toFixed(2)}%</td><td class="r">${usd(Number(d.minPayment), 2)}</td></tr>`).join('')}</tbody></table>` : '<p class="db-empty">No debts saved.</p>'}</article>
    <article class="db-card"><h3>Payoff order to discuss</h3><div class="db-kv"><span><b>Snowball</b> <small class="db-note">smallest balance first</small></span><span>${byBalance.map(d => esc(d.name)).join(' → ') || '—'}</span></div><div class="db-kv"><span><b>Avalanche</b> <small class="db-note">highest APR first</small></span><span>${byRate.map(d => esc(d.name)).join(' → ') || '—'}</span></div><p class="db-note">Both orders are shown for learning. Your teacher can explain how your mentor approaches it.</p></article></div>
  ${teacher('Which payoff order fits my situation, and why?')}`;
  return {body};
}
function budGoals() {
  const b = budget();
  if (!b.src) return empty('Goals');
  const gap = b.goal === null ? null : Math.max(0, b.goal - b.savings), progress = b.goal ? Math.min(100, b.savings / b.goal * 100) : 0;
  const body = head('Goals', 'Your cash cushion goal', b.sample ? 'Example budget' : '') + `
  <div class="db-grid db-g3">${stat('Cushion goal', b.goal === null ? 'Not set' : usd(dollars(b.goal)), 'The cash you want set aside for surprises.')}${stat('Saved', usd(dollars(b.savings)), 'Cash savings you entered.', '', 'pos')}${stat('To go', gap === null ? '—' : usd(dollars(gap)), 'Goal minus savings.')}</div>
  <article class="db-card"><h3>Emergency fund goal</h3><div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">${bar(progress, 100)}<b>${Math.round(progress)}%</b></div>
    <div class="db-trim"><label>Goal <input class="db-input" id="db-goal" inputmode="decimal" value="${b.goal === null ? '' : (b.goal / 100).toFixed(2)}" style="width:120px"></label><label>Savings <input class="db-input" id="db-savings" inputmode="decimal" value="${(b.savings / 100).toFixed(2)}" style="width:120px"></label>${btn(b.sample ? 'Save as my goal' : 'Save goal', 'data-save-goal', 'check', true)}</div></article>
  ${teacher('How much should my cash cushion be?')}`;
  return {body};
}
function budReview() {
  const b = budget();
  if (!b.src) return empty('Review');
  const vals = b.income.map(x => cents(x.amount)), low = vals.length ? Math.min(...vals) : 0, debtPay = b.cats.filter(c => c.debt).reduce((t, c) => t + c.amount, 0);
  const rows = [['Lowest month covers planned costs', low >= b.planned ? 'pass' : 'warn', `${usd(dollars(low))} lowest vs ${usd(dollars(b.planned))} planned`], ['Cash cushion goal set', b.goal === null ? 'unknown' : 'pass', b.goal === null ? 'Add a goal in Goals' : usd(dollars(b.goal))], ['Cushion progress', b.goal ? (b.savings >= b.goal ? 'pass' : 'warn') : 'unknown', b.goal ? pct(b.savings / b.goal * 100, 0) + ' saved' : '—'], ['Debt payments share of income', 'unknown', b.monthIncome ? pct(debtPay / b.monthIncome * 100) : '—'], ['Months of income saved', 'unknown', b.income.length + ' month(s)']];
  const body = head('Review', 'Your plan at a glance. Facts from your saved numbers, not a grade.', b.sample ? 'Example budget' : '') + `
  <article class="db-card"><ul class="db-checks">${rows.map(([l, s, d]) => `<li><span class="db-ck ${s}">${s === 'pass' ? '✓' : s === 'unknown' ? 'i' : '!'}</span><span>${esc(l)} <small class="db-note">· ${esc(d)}</small></span><span class="db-pill ${s}">${s === 'pass' ? 'On track' : s === 'warn' ? 'Review' : 'Info'}</span></li>`).join('')}</ul></article>
  ${teacher('Walk me through my plan and the one thing to focus on first.')}`;
  return {body};
}
function budSettings() {
  const b = budget();
  const months = []; const now = new Date(); for (let i = 5; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 15)); months.push(d.toISOString().slice(0, 7)); }
  const saved = new Map((b.sample ? [] : b.income).map(x => [x.month, x.amount]));
  const body = head('Settings', 'Your take-home income by month. Used for every budget figure.', b.sample ? 'Example budget' : '') + `
  <article class="db-card"><h3>Take-home income</h3><table class="db-table"><thead><tr><th>Month</th><th>Take-home income</th></tr></thead><tbody>${months.map(m => `<tr><td>${MONTH_LONG(m)} ${m.slice(0, 4)}</td><td><input class="db-input" data-income="${m}" inputmode="decimal" placeholder="0.00" value="${esc(saved.get(m) || '')}" style="max-width:160px"></td></tr>`).join('')}</tbody></table>
    <div style="display:flex;gap:10px;margin-top:12px">${btn('Save income', 'data-save-income', 'check', true)}${btn('Edit debts & detailed inputs', 'data-edit-finances', 'settings')}</div><p class="db-note" style="margin-top:8px">Leave a month blank if you have no record. Sample numbers are never saved unless you save them here.</p></article>`;
  return {body};
}
function empty(title) { return {body: head(title, 'Loading your dashboard...', '') + '<article class="db-card"><p class="db-empty">Loading…</p></article>'}; }

const VIEWS = {portfolio: {overview: invOverview, risk: invRisk, improve: invImprove, holdings: invHoldings, calendar: invCalendar, news: invNews, guidelines: invGuidelines}, budget: {overview: budOverview, cashflow: budCashflow, spending: budSpending, debt: budDebt, goals: budGoals, review: budReview, settings: budSettings}};

function render() {
  clearCharts();
  const g = document.querySelector('#portfolio-guidelines'); if (g && root.contains(g)) { g.hidden = true; document.body.append(g); }
  const view = VIEWS[state.tab][state.view[state.tab]] || VIEWS[state.tab].overview;
  const out = view();
  shell(out.body);
  out.after?.();
  document.dispatchEvent(new CustomEvent('mentor:workspace-rendered'));
}
async function load() {
  const [session, demo] = await Promise.all([api('/api/workspace').catch(() => null), state.demo ? state.demo : api('/api/workspace/demo').catch(() => null)]);
  state.session = session; state.demo = demo; state.edit = null;
  render();
}

// ---------- actions ----------
function ask(question) {
  const q = String(question || '').trim(); if (!q) return;
  let chosen = null; try { chosen = JSON.parse(localStorage.getItem('mentor-labs-choice') || 'null')?.personaId; } catch {}
  const launcher = document.querySelector('#teacher-launcher');
  if (!chosen) { document.dispatchEvent(new CustomEvent('mentor:workspace-question', {detail: {question: q}})); return; }
  if (launcher) { launcher.click(); setTimeout(() => { const msg = document.querySelector('#msg'), form = document.querySelector('#composer'); if (msg && form && !document.querySelector('#teacher-dock')?.hidden) { msg.value = q; form.requestSubmit(); } }, 80); }
  else document.dispatchEvent(new CustomEvent('mentor:workspace-question', {detail: {question: q}}));
}
function download(name, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv'})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function run(fn) { try { await fn(); } catch (e) { status(e.message); } }

root.addEventListener('click', e => {
  const t = e.target.closest('button, a'); if (!t || !root.contains(t)) return;
  if (t.dataset.workspaceTab) { state.tab = t.dataset.workspaceTab; state.statusText = ''; render(); return; }
  if (t.dataset.view) { state.view[state.tab] = t.dataset.view; state.edit = null; state.statusText = ''; render(); return; }
  if (t.hasAttribute('data-learn')) { document.dispatchEvent(new CustomEvent('mentor:show-learning')); return; }
  if (t.dataset.range) { state.perfRange = Number(t.dataset.range); render(); return; }
  if (t.dataset.flow) { state.flowRange = Number(t.dataset.flow); render(); return; }
  if (t.hasAttribute('data-import')) { document.querySelector('#portfolio-file')?.click(); return; }
  if (t.hasAttribute('data-import-doc')) { document.querySelector('#context-dialog')?.showModal?.(); return; }
  if (t.hasAttribute('data-edit-finances')) { document.dispatchEvent(new CustomEvent('mentor:edit-finances')); return; }
  if (t.dataset.export) {
    const inv = investing(), b = budget();
    if (t.dataset.export === 'cashflow') download('mentor-labs-cash-flow.csv', [['Month', 'Income', 'Planned costs', 'Saved income'], ...b.income.map(x => [x.month, x.amount, (b.planned / 100).toFixed(2), ((cents(x.amount) - b.planned) / 100).toFixed(2)])]);
    else if (t.dataset.export === 'risk') download('mentor-labs-risk-review.csv', [['Check', 'Value', 'Limit', 'Status'], ...(inv.risk?.checks || []).map(c => [c.label, c.value?.toFixed?.(2) ?? '', c.limit ?? '', c.status])]);
    else download('mentor-labs-holdings.csv', [['Symbol', 'Company', 'Sector', 'Value', 'Weight %', 'Price', 'Price source', 'Price date'], ...(inv.risk?.rows || []).map(r => [r.symbol, r.company, r.sector, r.value, r.weight?.toFixed(2), r.price, r.priceSource, r.priceAsOf])]);
    return;
  }
  if (t.hasAttribute('data-run')) {
    const sym = root.querySelector('#db-sym')?.value, to = Number(root.querySelector('#db-to')?.value), limit = Number(root.querySelector('#db-limit')?.value);
    state.draftSymbol = sym; state.draftTo = to; state.draftLimit = limit;
    run(async () => { status('Running scenario…'); state.scenario = await api('/api/workspace/whatif', 'POST', {sample: investing().sample, symbol: sym, toPercent: to, positionLimit: limit}); state.scenarioMode = 'whatif'; render(); status('Scenario ready. Your saved holdings are unchanged.'); });
    return;
  }
  if (t.hasAttribute('data-reset-scenario')) { state.scenario = null; state.scenarioMode = 'baseline'; state.draftSymbol = state.draftTo = state.draftLimit = undefined; render(); return; }
  if (t.hasAttribute('data-refresh')) {
    run(async () => { status('Retrieving market data…'); state.market = await api('/api/workspace/market', 'POST', {}); render(); status(state.market.fallbackNote || 'Market data refreshed. Check each source and date.'); });
    return;
  }
  if (t.hasAttribute('data-add-cat')) { syncEdit(); state.edit.push({name: 'New category', amount: '0.00', fixed: false}); render(); return; }
  if (t.hasAttribute('data-reset-plan')) { state.edit = null; render(); return; }
  if (t.hasAttribute('data-save-plan')) {
    syncEdit();
    run(async () => { const cats = state.edit.filter(c => !c.debt).map(c => ({name: c.name, amount: c.amount, fixed: /hous|rent|mortgage|insur|utilit|phone|bill/i.test(c.name) || c.fixed})); const b = budget(); const body = {categories: cats}; if (b.sample) Object.assign(body, {incomeHistory: b.income, debts: b.debts, savings: (b.savings / 100).toFixed(2), cashCushion: b.goal === null ? undefined : (b.goal / 100).toFixed(2)}); state.session = await api('/api/workspace/plan', 'POST', body); state.edit = null; document.dispatchEvent(new CustomEvent('mentor:inputs-updated')); render(); status('Plan saved. Your teacher uses these same numbers.'); });
    return;
  }
  if (t.hasAttribute('data-save-goal')) {
    run(async () => { const b = budget(), goal = root.querySelector('#db-goal').value.trim(), savings = root.querySelector('#db-savings').value.trim(); const body = {categories: b.cats.filter(c => !c.debt).map(c => ({name: c.name, amount: (c.amount / 100).toFixed(2), fixed: c.fixed})), savings, cashCushion: goal}; if (b.sample) Object.assign(body, {incomeHistory: b.income, debts: b.debts}); state.session = await api('/api/workspace/plan', 'POST', body); document.dispatchEvent(new CustomEvent('mentor:inputs-updated')); render(); status('Goal saved.'); });
    return;
  }
  if (t.hasAttribute('data-save-income')) {
    run(async () => { const b = budget(); const incomeHistory = [...root.querySelectorAll('[data-income]')].map(i => ({month: i.dataset.income, amount: i.value.trim()})); const body = {categories: b.sample ? [] : b.cats.filter(c => !c.debt).map(c => ({name: c.name, amount: (c.amount / 100).toFixed(2), fixed: c.fixed})), incomeHistory}; state.session = await api('/api/workspace/plan', 'POST', body); document.dispatchEvent(new CustomEvent('mentor:inputs-updated')); state.view.budget = 'overview'; render(); status('Income saved.'); });
  }
});
function syncEdit() { if (!state.edit) return; root.querySelectorAll('[data-cat-name]').forEach(i => { state.edit[i.dataset.catName].name = i.value.trim() || 'Category'; }); root.querySelectorAll('[data-cat-amount]').forEach(i => { state.edit[i.dataset.catAmount].amount = i.value.trim(); }); }
root.addEventListener('change', e => {
  if (e.target.matches('[data-month]')) { state.month = e.target.value; render(); }
  if (e.target.matches('[data-flow-range]')) { state.flowRange = Number(e.target.value); render(); }
  if (e.target.matches('input[name="db-mode"]')) { state.scenarioMode = e.target.value; render(); }
  if (e.target.matches('#db-sym')) { state.draftSymbol = e.target.value; state.draftTo = undefined; state.scenario = null; render(); }
  if (e.target.matches('[data-cat-amount], [data-cat-name]')) { syncEdit(); const pos = e.target.dataset.catAmount; render(); if (pos !== undefined) root.querySelector(`[data-cat-amount="${pos}"]`)?.focus(); }
});
root.addEventListener('input', e => { if (e.target.matches('#db-limit')) { const o = root.querySelector('#db-limit-out'); if (o) o.textContent = e.target.value + '%'; state.draftLimit = Number(e.target.value); } });
root.addEventListener('submit', e => { if (e.target.matches('[data-ask]')) { e.preventDefault(); const input = e.target.querySelector('input'); ask(input.value || input.closest('.db-teacher').querySelector('p').textContent); input.value = ''; } });

document.addEventListener('mentor:workspace-open', () => run(load));
document.addEventListener('mentor:inputs-updated', () => { if (!document.querySelector('#v-workspace')?.hidden) run(load); });
document.addEventListener('mentor:guidelines-updated', () => { state.scenario = null; run(load); });
root.classList.add('db');
render();
