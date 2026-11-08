// Original Budget screens (Debt plan, Settings, Review, Goals) from the reference-board design,
// restored on request. Figures match the shared fictional demo profile the teacher answers from
// (lib/workspace-demo.js); payoff paths come from the app's own month-by-month payoff simulator.
// Rendered inside the data-driven dashboard, wrapped in <div class="mlx"> (styles: dashboard-classic.css).
const P = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', shield: 'M12 21s7-3.5 7-9.5V5.5L12 3 5 5.5v6C5 17.5 12 21 12 21z',
  trend: 'M3 17l6-6 4 4 8-8 M15 7h6v6', layers: 'M12 3 2 8l10 5 10-5-10-5z M2 12.5l10 5 10-5 M2 16.5l10 5 10-5',
  calendar: 'M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4', news: 'M5 3h11l3 3v15H5z M8 9h8 M8 13h8 M8 17h5',
  book: 'M2 5c3-1.5 7-1.5 10 1v14c-3-2.5-7-2.5-10-1z M22 5c-3-1.5-7-1.5-10 1v14c3-2.5 7-2.5 10-1z',
  swap: 'M4 8h15l-4-4 M20 16H5l4 4', pie: 'M11 4a8 8 0 1 0 9 9h-9z M14 2.8V10h7.2A7.3 7.3 0 0 0 14 2.8z',
  card: 'M3 5h18v14H3z M3 10h18 M7 15h4', target: 'M12 3a9 9 0 1 0 .01 0 M12 7a5 5 0 1 0 .01 0 M12 11a1 1 0 1 0 .01 0',
  clip: 'M8 3h8v3H8z M6 4.5H5V21h14V4.5h-1 M9 14l2 2 4-4',
  gear: 'M12 9a3 3 0 1 0 .01 0 M10.3 3h3.4l.5 2.3 1.6.9 2.2-.8 1.7 2.9-1.7 1.6v1.8l1.7 1.6-1.7 2.9-2.2-.8-1.6.9-.5 2.3h-3.4l-.5-2.3-1.6-.9-2.2.8-1.7-2.9 1.7-1.6v-1.8L4.3 8.3 6 5.4l2.2.8 1.6-.9z',
  info: 'M12 3a9 9 0 1 0 .01 0 M12 11v5 M12 7.6v.4', user: 'M12 3.5a4 4 0 1 0 .01 0 M4.5 21c1-4 4.2-6 7.5-6s6.5 2 7.5 6',
  upload: 'M12 15V4 M7 9l5-5 5 5 M4 15v5h16v-5', plus: 'M12 5v14 M5 12h14', plug: 'M9 3v5 M15 3v5 M6 8h12v3a6 6 0 0 1-12 0z M12 17v4',
  check: 'M5 12.5l4.5 4.5L19 7', pencil: 'M4 20h4L19 9l-4-4L4 16z M14 6l4 4', refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  reset: 'M4 11a8 8 0 1 1 2.3 5.7 M4 4v7h7', search: 'M10.5 4a6.5 6.5 0 1 0 .01 0 M15.5 15.5 21 21', ext: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
  chevR: 'M9 5l7 7-7 7', chevL: 'M15 5l-7 7 7 7', chevD: 'M6 9l6 6 6-6', send: 'M21 3 3 10.5l7 2.5 2.5 7z M10 13 21 3',
  msg: 'M4 5h16v11H9l-5 4z', warn: 'M12 3.5 2.5 20h19z M12 10v4.5 M12 17.2v.3', lock: 'M5 11h14v10H5z M8 11V8a4 4 0 0 1 8 0v3',
  download: 'M12 4v11 M7 10l5 5 5-5 M4 19h16', link: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  cap: 'M2 9l10-5 10 5-10 5z M6 11.2v4.8c3 2 9 2 12 0v-4.8 M22 9v5', car: 'M3 16v-4l2.2-5h13.6L21 12v4z M4 16v2.5h3V16 M17 16v2.5h3V16 M7 12.5h.5 M16.5 12.5h.5',
  shieldok: 'M12 21s7-3.5 7-9.5V5.5L12 3 5 5.5v6C5 17.5 12 21 12 21z M9 12l2 2 4-4', doc: 'M6 3h9l4 4v14H6z M9 10h7 M9 14h7 M9 18h4',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;
const inf = ic('info');
const kpi = (k, v, cls = '') => `<div class="kpi"><div class="k">${k}${inf}</div><div class="v ${cls}">${v}</div></div>`;
const S = '<span class="sort"></span>';
const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
function smooth(pts) { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], mx = (a[0] + b[0]) / 2; d += ` C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`; } return d; }

// ---------- budget screens ----------
// Every figure matches the shared fictional demo profile the teacher reads (lib/workspace-demo.js):
// lowest month $5,200, essentials $3,650 (housing 1,600 + food 550 + transport 350 + lifestyle 450 + debt minimums 700),
// $1,550 available, $10,600 cash vs a $16,640 cushion goal. Payoff paths come from the app's own
// month-by-month simulator (lib/mentor/chat.mock.js payoff(), exact cents) with $300/mo extra.
const PLANS = {
  snowball: {label: 'Snowball (smallest balance first)', months: 19, interest: '$1,472.18', paid: '$18,112.18', order: 'Student loan → Credit card → Auto loan',
    tip: 'The snowball method can build momentum<br>by paying off smaller debts first.',
    bal: [16640, 15801, 14955, 14103, 13245, 12380, 11508, 10623, 9726, 8814, 7890, 6951, 5998, 5032, 4058, 3079, 2095, 1106, 112, 0]},
  avalanche: {label: 'Avalanche (highest APR first)', months: 18, interest: '$1,305.48', paid: '$17,945.48', order: 'Credit card → Student loan → Auto loan',
    tip: 'The avalanche method pays the least interest<br>by targeting the highest APR first.',
    bal: [16640, 15801, 14951, 14090, 13219, 12337, 11444, 10539, 9623, 8695, 7756, 6804, 5840, 4870, 3895, 2915, 1931, 941, 0]},
};
const MIN_ONLY = [16640, 16101, 15556, 15007, 14452, 13892, 13326, 12755, 12179, 11597, 11010, 10416, 9817, 9212, 8601, 7984, 7361, 6729, 6090, 5441, 4784, 4118, 3443, 2761, 2076, 1387, 694, 0]; // 27 months, $2,257.38 interest
let debtPlan = 'snowball';

function debtChart(plan) {
  const W = 900, H = 235, L = 62, R = 16, T = 10, B = 24, N = 27;
  const x = m => L + m / N * (W - L - R), y = v => T + (18000 - v) / 18000 * (H - T - B);
  const pts = plan.bal.map((v, m) => [x(m), y(v)]);
  const dots = pts.filter((_, m) => m % 3 === 0 || m === plan.bal.length - 1);
  const min = MIN_ONLY.map((v, m) => [x(m), y(v)]);
  const grid = Array.from({length: 10}, (_, i) => i * 2000).map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ecebe5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">$${v.toLocaleString()}</text>`).join('');
  const xt = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27].map(m => `<text x="${x(m)}" y="${H - 5}" text-anchor="middle">${m ? m + ' mo' : 'Now'}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projected debt balance: paid off in ${plan.months} months with $300 extra, 27 months on minimums">
    <defs><linearGradient id="db" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7a4f" stop-opacity=".22"/><stop offset="1" stop-color="#2b7a4f" stop-opacity=".04"/></linearGradient></defs>
    ${grid}${xt}<path d="${path(pts)} L${x(0)} ${y(0)} Z" fill="url(#db)"/>
    <path d="${path(min)}" fill="none" stroke="#a9aca4" stroke-width="1.4" stroke-dasharray="5 4"/>
    <path d="${path(pts)}" fill="none" stroke="#1e5a3b" stroke-width="2"/>${dots.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="#1e5a3b" stroke-width="1.8"/>`).join('')}</svg>`;
}

function incomeBars() {
  const W = 900, H = 112, L = 110, R = 80, x = v => L + v / 6000 * (W - L - R);
  const ticks = [0, 1000, 2000, 3000, 4000, 5000, 6000].map(v => `<text x="${x(v)}" y="${H - 4}" text-anchor="middle">$${v.toLocaleString()}</text><line x1="${x(v)}" x2="${x(v)}" y1="8" y2="${H - 22}" stroke="#ecebe5"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income $5,200 vs planned cost $3,650">${ticks}
    <text x="${L - 14}" y="38" text-anchor="end" style="font-size:13px;fill:#1b1d1a">Income</text><rect x="${L}" y="24" width="${x(5200) - L}" height="20" fill="#1e5a3b"/><text x="${x(6000) + 10}" y="38" style="font-size:13px;fill:#1b1d1a">$5,200</text>
    <text x="${L - 14}" y="70" text-anchor="end" style="font-size:13px;fill:#1b1d1a">Planned cost</text><rect x="${L}" y="56" width="${x(3650) - L}" height="20" fill="#9cc79f"/><text x="${x(6000) + 10}" y="70" style="font-size:13px;fill:#1b1d1a">$3,650</text></svg>`;
}

// Projection: $10,600 today, +$1,550 a month (the full lowest-month surplus) until the $16,640 goal.
function goalChart() {
  const W = 900, H = 160, L = 64, R = 20, T = 8, B = 22;
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const x = i => L + 30 + i * (W - L - R - 60) / 5, y = v => T + (20000 - v) / 20000 * (H - T - B);
  const saved = [10600, 12150, 13700, 15250, 16640, 16640].map((v, i) => [x(i), y(v)]);
  const target = months.map((_, i) => [x(i), y(16640)]);
  const grid = [0, 5000, 10000, 15000, 20000].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ecebe5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">$${v.toLocaleString()}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cash cushion projection: $10,600 now, goal $16,640 reached in 4 months at $1,550 a month">
    <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7a4f" stop-opacity=".16"/><stop offset="1" stop-color="#2b7a4f" stop-opacity=".02"/></linearGradient></defs>
    ${grid}${months.map((m, i) => `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${m}</text>`).join('')}
    <path d="${path(saved)} L${x(5)} ${y(0)} L${x(0)} ${y(0)}Z" fill="url(#gp)"/>
    <path d="${path(target)}" fill="none" stroke="#9cc79f" stroke-width="1.6" stroke-dasharray="5 4"/>${target.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#9cc79f"/>`).join('')}
    <path d="${path(saved)}" fill="none" stroke="#1e5a3b" stroke-width="2"/>${saved.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="#1e5a3b" stroke-width="1.8"/>`).join('')}</svg>`;
}

const debt = () => { const p = PLANS[debtPlan]; return `
  <div class="head"><h1>Debt plan${inf}</h1><span class="spacer"></span><span class="plan-label">Plan:</span><div class="pill-group">${Object.keys(PLANS).map(k => `<button data-plan="${k}" class="${k === debtPlan ? 'on' : ''}" style="padding:5px 18px">${k === 'snowball' ? 'Snowball' : 'Avalanche'}</button>`).join('')}</div>
    </div>
  <div class="grid g4">${kpi('Total balance', '$16,640')}${kpi('Total minimum payments', '$700 <small>/ mo</small>')}${kpi('Extra payment', '$300 <small>/ mo</small>')}${kpi('Payoff horizon', p.months + ' months', 'pos')}</div>
  <div class="card mt"><h2>Projected debt balance${inf}</h2><div class="legend" style="margin-top:10px"><span><i class="dotline"></i>With extra payment ($300/mo)</span><span><i class="dash"></i>Minimum payments only (27 months)</span></div>${debtChart(p)}
    <div class="foot-note">Projection using your current APRs and payments, month by month in exact cents. Not a guarantee of results.</div></div>
  <div class="grid mt split" style="grid-template-columns:1.12fr 1fr">
    <div class="card"><div class="card-head"><h2>Your debts (3)${inf}</h2><button class="btn sm" data-go="budget/settings">${ic('pencil')}Edit</button></div><table><thead><tr><th>Debt${S}</th><th>APR${S}</th><th>Balance${S}</th><th>Minimum${S}</th></tr></thead><tbody>
      ${[['card', 'Credit card', '21.49%', '$6,040', '$300'], ['car', 'Auto loan', '6.25%', '$8,400', '$250'], ['cap', 'Student loan', '4.75%', '$2,200', '$150']].map(([i, n, a, b, m]) => `<tr><td><span class="debt-name">${ic(i)}${n}</span></td><td>${a}</td><td><span class="cellbox">${b}</span></td><td><span class="cellbox">${m}</span></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h2>Plan details${inf}</h2><div class="detail-row" style="margin-top:14px"><span>Strategy</span><span class="select">${p.label}</span></div>
      <div class="detail-row"><span>Payoff order</span><span class="small">${p.order}</span></div>
      <div class="detail-row"><span>Rate assumptions</span><span class="select">Use current APRs</span></div>
      <div class="detail-row" style="grid-template-columns:1fr"><span style="display:flex;align-items:center">Extra payment (optional)${inf}</span></div>
      <div style="display:flex;align-items:center;gap:12px"><span class="field" style="flex:1">$300</span><span class="small">/ month</span></div></div></div>
  <div class="grid mt split" style="grid-template-columns:1.12fr 1fr">
    <div class="card"><h3>Payoff summary${inf}</h3><div class="sumrow" style="grid-template-columns:repeat(3,auto)"><div><span>Total paid</span><b>${p.paid}</b></div><div><span>Total interest</span><b>${p.interest}</b></div><div><span>Payoff horizon</span><b>${p.months} months</b></div></div></div>
    <div class="grid" style="gap:10px"><div class="tip"><span class="ok"></span>${p.tip}</div></div></div>`; };

const prefRow = (l, v, h) => `<div class="pref-row"><span class="lbl">${l}${inf}</span><span class="stepper">${v}</span>${h ? `<span class="hint">${h}</span>` : ''}</div>`;
const settings = () => `
  <div class="head"><h1 style="font-size:23px">Your planning preferences</h1><span class="spacer"></span><button class="btn primary">${ic('check')}Save my budget</button>
    <p class="sub">Set your budget inputs, cash cushion goal, and data preferences.</p></div>
  <div class="grid split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h2>Income planning${inf}</h2><p class="desc">Use your lowest saved month as the basis for planning.</p>
      <div class="pref-row" style="grid-template-columns:1fr 104px;margin-top:8px"><span class="lbl" style="font-weight:600">Basis month (lowest saved)</span><span class="select">June</span><span class="hint" style="grid-column:1">The month with the lowest takehome income in your saved data ($5,200).</span></div></div>
    <div class="card"><h2>Cash cushion goal${inf}</h2><p class="desc">A cash reserve for unexpected expenses or income changes.</p>
      <div class="pref-row" style="grid-template-columns:1fr 150px;margin-top:8px"><span class="lbl">Target amount</span><span class="stepper">$16,640</span></div>
      <div class="pref-row" style="grid-template-columns:1fr 150px"><span class="lbl">Months of expenses</span><span class="stepper">Custom</span></div></div></div>
  <div class="grid mt split" style="grid-template-columns:1.45fr 1fr;align-items:start">
    <div class="card"><h2>Detailed budget inputs${inf}</h2><p class="desc">Enter your monthly amounts. Use your takehome (after-tax) income and typical spending.</p>
      ${prefRow('Income (monthly)', '$5,350', 'Average of your 6 saved months ($5,200 to $5,500).')}${prefRow('Takehome income', '$5,200', 'Your lowest saved month, used as the planning basis.')}${prefRow('Fixed bills', '$1,600', 'Recurring essentials (housing).')}
      ${prefRow('Everyday spending', '$1,350', 'Food $550, transport $350, lifestyle $450.')}${prefRow('Debt payments', '$700', 'Minimums: credit card $300, auto $250, student $150.')}${prefRow('Savings (planned)', '$1,550', 'What is left in your lowest month after costs.')}</div>
    <div class="grid">
      <div class="card"><h2>Future bank connection<span class="planned">Planned</span>${inf}</h2><p class="desc">A secure bank connection (MCP) is planned for a future release to import your transactions automatically.</p>
        <button class="btn disabled mt">${ic('link')}Connect bank (planned)</button><p class="desc" style="margin-top:10px">Manual entry (your current method) works fully and isn’t affected.</p></div>
      <div class="card"><h2>Privacy &amp; data</h2><div class="mt">
        <div class="link-row" data-action="privacy" role="link" tabindex="0" style="cursor:pointer">${ic('lock')}<div><b>Privacy</b><small>How we use and protect your data.</small></div>${ic('chevR')}</div>
        <div class="link-row">${ic('download')}<div><b>Export my data</b><small>Download your budget data (CSV).</small></div>${ic('chevR')}</div></div></div></div></div>`;

const review = () => `
  <div class="head"><h1>Review your monthly plan</h1><span class="spacer"></span><span class="select" style="height:34px;width:110px;font-size:13.5px">November</span><button class="btn" data-go="budget/settings">${ic('pencil')}Edit plan</button></div>
  <div class="grid g4">${kpi('Income (lowest)', '$5,200')}${kpi('Planned costs', '$3,650')}${kpi('Available', '$1,550', 'pos')}${kpi('Cushion gap', '$6,040', 'neg')}</div>
  <div class="card mt"><h2>Income vs. cost <span style="font-weight:400;font-size:14px;margin-left:5px">(monthly)</span></h2>${incomeBars()}</div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h2>Plan checklist</h2><div style="margin-top:8px">${[['Income is complete', 1], ['Costs are complete', 1], ['Debt minimums are covered', 1], ['Cash cushion goal reached', 0]].map(([t, on]) => `<div class="check"><span class="box ${on ? 'on' : ''}"></span>${t}${ic('info', 'i tiny-i')}</div>`).join('')}</div></div>
    <div class="warn"><h3>${ic('warn')}$6,040 cushion gap</h3><p>You have $10,600 in cash toward a $16,640 cushion goal. Your lowest month still leaves $1,550 after costs to work with.</p></div></div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr;align-items:start">
    <div class="card"><h2>Plan arithmetic</h2><table class="arith mt"><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>
      ${[['Income (lowest month)', '$5,200'], ['Housing', '$1,600'], ['Food', '$550'], ['Transport', '$350'], ['Lifestyle', '$450'], ['Debt payments', '$700']].map(([a, b]) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`).join('')}
      <tr class="total"><td>Total planned costs</td><td class="r">$3,650</td></tr><tr class="total"><td>Available (income − costs)</td><td class="r pos">$1,550</td></tr></tbody></table></div>
    <div class="grid"><div class="card"><h2>${ic('cap')}&nbsp;Teacher-guided tradeoffs</h2><p class="desc" style="font-size:12.5px;color:var(--ink-2)">Ways to use the $1,550 available (illustrative):</p>
      ${[['Close the cushion gap first with <em>$1,550</em> a month', 'Reaches the $16,640 goal in about 4 months.', 1], ['Put $300 extra toward debt, the rest to savings', 'Matches your debt plan: debt-free in 19 months (snowball).', 0], ['Attack the 21.49% credit card first', 'Highest APR; the avalanche order pays the least interest.', 0]].map(([t, s, on]) => `<div class="option ${on ? 'on' : ''}"><span class="radio ${on ? 'on' : ''}"></span><div><b>${t}</b><small>${s}</small></div></div>`).join('')}</div></div></div>`;

const goalBlock = (icon, name, line, pct, target, saved, rem, monthly, labels = ['Target amount', 'Saved', 'Remaining', 'Monthly contribution']) => `<div class="goal"><div class="goal-top">${ic(icon)}<div><b>${name}${inf}</b><small>${line}</small></div><span class="edit" data-go="budget/settings" style="cursor:pointer">${ic('pencil')}Edit</span></div>
  <div class="bar"><span style="width:${pct}%"></span></div><div class="goal-cols"><div>${labels[0]}<span class="field">${target}${ic('edit')}</span></div><div>${labels[1]}<b>${saved}</b></div><div>${labels[2]}<b>${rem}</b></div><div>${labels[3]}<span class="field">${monthly}${ic('edit')}</span></div></div></div>`;
const goals = () => `
  <div class="head"><h1>Budget goals${inf}</h1><span class="spacer"></span><button class="btn" data-go="budget/settings">${ic('pencil')}Edit goals</button><p class="sub">Set target amounts, track progress, and stay on plan.</p></div>
  <div class="grid g4">${kpi('Emergency fund', '$16,640')}${kpi('Saved', '$10,600')}${kpi('Remaining', '$6,040')}${kpi('Monthly contribution', '$1,550')}</div>
  <div class="card mt"><div class="card-head"><h2>Goal progress (projected)</h2><div class="legend" style="margin:0"><span><i class="dotline"></i>Saved</span><span><i class="dash" style="border-color:#9cc79f"></i>Target</span></div><span class="select" style="width:96px">6 Months</span></div>${goalChart()}</div>
  <div class="grid mt split" style="grid-template-columns:1.55fr 1fr;align-items:start">
    <div class="card">${goalBlock('shieldok', 'Emergency fund', '$10,600 of $16,640 (64%)', 64, '$16,640', '$10,600', '$6,040', '$1,550')}${goalBlock('card', 'Debt-free', '$0 of $16,640 paid so far (0%) · 19 months on the snowball plan', 0, '$16,640', '$0', '$16,640', '$1,000', ['Debt to clear', 'Paid', 'Remaining', 'Monthly payment'])}</div>
    <div class="card"><h2>Cash cushion calculator${inf}</h2><p class="desc">Estimate how much cash to keep for near-term needs.</p>
      <div class="pref-row" style="grid-template-columns:1fr 92px;margin-top:10px"><span class="small">Monthly essential expenses</span><span class="field" style="justify-content:space-between">$3,650${ic('edit')}</span></div>
      <div class="pref-row" style="grid-template-columns:1fr 92px"><span class="small">Cushion (months)</span><span class="select">3 months</span></div>
      <div class="reco"><span>Recommended cushion</span><b>$10,950 <svg class="i tiny-i" viewBox="0 0 24 24"><path d="${P.info}"/></svg></b></div>
      <p class="desc" style="color:var(--ink-2);font-size:12px"><b style="color:var(--ink)">Context</b><br>Covers about 3 months of essential expenses ($3,650 × 3). Your $16,640 goal covers about 4.5 months.</p></div></div>`;


export const classicScreens = {debt, settings, review, goals};
export function setDebtPlan(k) { if (PLANS[k]) debtPlan = k; }
