// Mentor Labs dashboard (design pass). Static sample content copied from the Nov 7 reference boards;
// routes: #investing/<view> and #budget/<view>. Numbers here are illustrative, not the user's data.
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
const LOGO = {
  NVDA: '<svg class="logo" viewBox="0 0 24 18"><path d="M9 4.5c4-1 9 .5 13 4.5-4 4-9 5.5-13 4.5V11c3 .8 6-.2 8.5-2C15 7 12 6 9 6.8z M9 6.8V4.5C5 5.3 2 7 1 9c1 2 4 3.7 8 4.5V11C6.5 10.4 5 9.8 4 9c1-.8 2.5-1.6 5-2.2z" fill="#76b900"/></svg>',
  AAPL: '<svg class="logo" viewBox="0 0 24 24"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.9-.8-3.1-.8C6.8 7.4 5 8.6 4.1 10.4c-1.8 3.2-.5 7.9 1.3 10.4.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.3 3.1-2.5.9-1.4 1.3-2.8 1.4-2.9-.1 0-2.6-1-2.6-3.9zM14.1 5.8c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" fill="#111"/></svg>',
  MSFT: '<svg class="logo" viewBox="0 0 20 20"><path fill="#f25022" d="M1 1h8.5v8.5H1z"/><path fill="#7fba00" d="M10.5 1H19v8.5h-8.5z"/><path fill="#00a4ef" d="M1 10.5h8.5V19H1z"/><path fill="#ffb900" d="M10.5 10.5H19V19h-8.5z"/></svg>',
  VTI: '<svg class="logo" viewBox="0 0 20 20"><path d="M1 3h5l4 10 4-10h5l-7.5 15h-3z" fill="#9b1c1f"/></svg>',
};

const INVESTING = [['overview', 'Overview', 'home'], ['risk', 'Risk review', 'shield'], ['improve', 'Improve', 'trend'], ['holdings', 'Holdings', 'layers'], ['calendar', 'Calendar', 'calendar'], ['news', 'News', 'news'], ['guidelines', 'Guidelines', 'book']];
const BUDGET = [['overview', 'Overview', 'home'], ['cashflow', 'Cash flow', 'swap'], ['spending', 'Spending', 'pie'], ['debt', 'Debt plan', 'card'], ['goals', 'Goals', 'target'], ['review', 'Review', 'clip'], ['settings', 'Settings', 'gear']];

const teacher = (q, cls = '') => `<form class="teacher ${cls}" action="/" method="get"><div class="teacher-top"><img src="/img/mentors/credit-smart.webp" alt="AI teacher portrait (AI-generated)"><div><b>Ask your teacher</b><small>${q}</small></div></div>
  <div class="ask"><input name="ask" placeholder="Ask about these numbers..." aria-label="Ask your teacher"><button type="submit" aria-label="Send">${ic('send')}</button></div></form>`;
const kpi = (k, v, cls = '') => `<div class="kpi"><div class="k">${k}${inf}</div><div class="v ${cls}">${v}</div></div>`;
const S = '<span class="sort"></span>';

// ---------- tiny SVG chart helpers ----------
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
function walk(n, end, vol, seed, shape = 0) {
  const r = rng(seed), raw = [0];
  for (let i = 1; i < n; i++) raw.push(raw[i - 1] + (r() - .5) * vol);
  return raw.map((v, i) => { const t = i / (n - 1); return v - raw[n - 1] * t + end * t + shape * Math.sin(Math.PI * t); });
}
const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

function portfolioChart() {
  const W = 880, H = 190, L = 52, R = 14, T = 8, B = 22, n = 230;
  const y = v => T + (15 - v) / 25 * (H - T - B), x = i => L + i / (n - 1) * (W - L - R);
  const port = walk(n, 8.2, 1.7, 11, 3).map((v, i) => [x(i), y(v)]);
  const spx = walk(n, 6.1, .8, 29, 1).map((v, i) => [x(i), y(v)]);
  const grid = [15, 10, 5, 0, -5, -10].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ecebe5"/><text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v > 0 ? '+' : ''}${v === 0 ? '0' : v}%</text>`).join('');
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const xl = months.map((m, i) => `<text x="${L + 26 + i * (W - L - R - 40) / 11}" y="${H - 4}" text-anchor="middle">${m}</text>`).join('');
  const last = port.at(-1), lastS = spx.at(-1);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Portfolio vs S&P 500, one year (illustrative)">
    <defs><linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7a4f" stop-opacity=".18"/><stop offset="1" stop-color="#2b7a4f" stop-opacity="0"/></linearGradient></defs>
    ${grid}${xl}<path d="${path(port)} L${last[0]} ${H - B} L${L} ${H - B}Z" fill="url(#pf)"/>
    <path d="${path(spx)}" fill="none" stroke="#b9bcb4" stroke-width="1.4" stroke-dasharray="3 3"/><path d="${path(port)}" fill="none" stroke="#1e5a3b" stroke-width="1.8"/>
    <circle cx="${lastS[0]}" cy="${lastS[1]}" r="3" fill="#b9bcb4"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#1f8a43" stroke="#fff" stroke-width="1.5"/></svg>`;
}

function debtChart() {
  const W = 900, H = 235, L = 62, R = 16, T = 10, B = 24;
  const x = m => L + m / 28 * (W - L - R), y = v => T + (18000 - v) / 18000 * (H - T - B);
  const pts = [[0, 16640], [3, 14250], [6, 12150], [9, 10050], [12, 8100], [15, 6050], [18, 4050], [21, 2300], [24, 900], [28, 0]].map(([m, v]) => [x(m), y(v)]);
  const min = [[0, 16640], [6, 14300], [12, 11600], [18, 8500], [24, 4700], [28, 0]].map(([m, v]) => [x(m), y(v)]);
  const grid = Array.from({length: 10}, (_, i) => i * 2000).map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ecebe5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">$${v.toLocaleString()}</text>`).join('');
  const xt = [[0, 'Now'], [3, '3 mo'], [6, '6 mo'], [9, '9 mo'], [12, '12 mo'], [15, '15 mo'], [18, '18 mo'], [21, '21 mo'], [24, '24 mo'], [28, '28 mo']].map(([m, t]) => `<text x="${x(m)}" y="${H - 5}" text-anchor="middle">${t}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Projected debt balance (illustrative)">
    <defs><linearGradient id="db" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7a4f" stop-opacity=".22"/><stop offset="1" stop-color="#2b7a4f" stop-opacity=".04"/></linearGradient></defs>
    ${grid}${xt}<path d="${path(pts)} L${x(0)} ${y(0)} Z" fill="url(#db)"/>
    <path d="${smooth(min)}" fill="none" stroke="#a9aca4" stroke-width="1.4" stroke-dasharray="5 4"/>
    <path d="${path(pts)}" fill="none" stroke="#1e5a3b" stroke-width="2"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="#1e5a3b" stroke-width="1.8"/>`).join('')}</svg>`;
}
function smooth(pts) { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], mx = (a[0] + b[0]) / 2; d += ` C${mx} ${a[1]} ${mx} ${b[1]} ${b[0]} ${b[1]}`; } return d; }

function incomeBars() {
  const W = 900, H = 112, L = 110, R = 80, x = v => L + v / 6000 * (W - L - R);
  const ticks = [0, 1000, 2000, 3000, 4000, 5000, 6000].map(v => `<text x="${x(v)}" y="${H - 4}" text-anchor="middle">$${v.toLocaleString()}</text><line x1="${x(v)}" x2="${x(v)}" y1="8" y2="${H - 22}" stroke="#ecebe5"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income $5,200 vs planned cost $5,560">${ticks}
    <text x="${L - 14}" y="38" text-anchor="end" style="font-size:13px;fill:#1b1d1a">Income</text><rect x="${L}" y="24" width="${x(5200) - L}" height="20" fill="#1e5a3b"/><text x="${x(6000) + 10}" y="38" style="font-size:13px;fill:#1b1d1a">$5,200</text>
    <text x="${L - 14}" y="70" text-anchor="end" style="font-size:13px;fill:#1b1d1a">Planned cost</text><rect x="${L}" y="56" width="${x(5560) - L}" height="20" fill="#9cc79f"/><text x="${x(6000) + 10}" y="70" style="font-size:13px;fill:#1b1d1a">$5,560</text></svg>`;
}

function goalChart() {
  const W = 900, H = 160, L = 64, R = 20, T = 8, B = 22;
  const x = i => L + 30 + i * (W - L - R - 60) / 5, y = v => T + (25000 - v) / 25000 * (H - T - B);
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const saved = [4200, 5200, 6100, 7000, 7700, 8400].map((v, i) => [x(i), y(v)]);
  const target = [10000, 12100, 14300, 16500, 18600, 21000].map((v, i) => [x(i), y(v)]);
  const grid = [0, 5000, 10000, 15000, 20000, 25000].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#ecebe5"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">$${v.toLocaleString()}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Goal progress (illustrative)">
    <defs><linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b7a4f" stop-opacity=".16"/><stop offset="1" stop-color="#2b7a4f" stop-opacity=".02"/></linearGradient></defs>
    ${grid}${months.map((m, i) => `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${m}</text>`).join('')}
    <path d="${path(saved)} L${x(5)} ${y(0)} L${x(0)} ${y(0)}Z" fill="url(#gp)"/>
    <path d="${path(target)}" fill="none" stroke="#9cc79f" stroke-width="1.6" stroke-dasharray="5 4"/>${target.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#9cc79f"/>`).join('')}
    <path d="${path(saved)}" fill="none" stroke="#1e5a3b" stroke-width="2"/>${saved.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#fff" stroke="#1e5a3b" stroke-width="1.8"/>`).join('')}</svg>`;
}

// ---------- investing screens ----------
const holdings = () => `
  <div class="head"><h1>Holdings${inf}</h1><span class="spacer"></span>
    <button class="btn">${ic('upload')}Import CSV</button><button class="btn">${ic('plus')}Add holding</button><button class="btn ghost">${ic('plug')}Broker connection — planned</button></div>
  <div class="grid g4">${kpi('Total value', '$119,687')}${kpi('Total cost', '$104,540')}${kpi('Total gain', '+$15,147<small>(+14.5%)</small>', 'pos')}${kpi('Holdings count', '4')}</div>
  <div class="notice"><span class="ok">${ic('check')}</span><b>Import complete</b> — 4 holdings added from portfolio.csv <span class="dotsep">·</span> Nov 20, 2024 at 10:24 AM <a href="#investing/holdings">View details</a></div>
  <div class="card mt"><div class="card-head"><h2>Portfolio value</h2><div class="pill-group"><button>3M</button><button>6M</button><button class="on">1Y</button></div></div>
    <div class="legend"><span><i></i>Portfolio <span>+8.2% (1Y)</span></span><span><i class="dash"></i>S&amp;P 500 <span>+6.1% (1Y)</span></span></div>${portfolioChart()}
    <div class="foot-note">Illustrative data. Not a recommendation to buy or sell any security.</div></div>
  <div class="card mt"><div class="card-head"><h2>Holdings (4)${inf}</h2><button class="btn sm">${ic('pencil')}Edit</button></div><div class="table-wrap"><table>
    <thead><tr><th>Symbol${S}</th><th>Name${S}</th><th>Sector${S}</th><th class="r">Quantity${S}</th><th class="r">Market value${S}</th><th class="r">Cost basis${S}</th><th class="r">Weight${S}</th></tr></thead><tbody>
    ${[['NVDA', 'NVIDIA Corporation', 'Technology', 100, '$28,800', '$24,000', '24.1%'], ['AAPL', 'Apple Inc.', 'Technology', 60, '$24,360', '$21,600', '20.4%'], ['MSFT', 'Microsoft Corporation', 'Technology', 80, '$20,160', '$17,600', '16.8%'], ['VTI', 'Vanguard Total Stock Market ETF', 'Broad market', 200, '$17,940', '—', '15.0%']]
      .map(([s, n, sec, q, mv, cb, w]) => `<tr><td><span class="sym">${LOGO[s]}${s}</span></td><td class="small">${n}</td><td class="small">${sec}</td><td class="r"><span class="cellbox">${q}</span></td><td class="r">${mv}</td><td class="r">${cb}</td><td class="r">${w}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h3>Portfolio summary${inf}</h3><div class="sumrow"><div><span>Value</span><b>$119,687</b></div><div><span>Cost basis</span><b>$104,540</b></div><div><span>Gain ($)</span><b class="pos">+$15,147</b></div><div><span>Gain (%)</span><b class="pos">+14.5%</b></div></div></div>
    ${teacher('Questions about your holdings or next steps?')}</div>`;

const stepRow = (l, h, v) => `<div class="rule-row"><span class="lbl">${l}${inf}</span><span class="stepper">${v}</span><span class="hint">${h}</span></div>`;
const guidelines = () => `
  <div class="head"><h1 style="font-size:23px">Your portfolio guidelines</h1><span class="saved">Saved</span><span class="updated">Last updated Nov 20</span><span class="spacer"></span>
    <button class="btn">${ic('reset')}Reset</button><button class="btn primary">${ic('check')}Save guidelines</button>
    <p class="sub">Set the rules that keep your portfolio aligned with your goals and risk tolerance.</p></div>
  <div class="grid g2">
    <div class="card"><h2>Concentration${inf}</h2><p class="desc">Control how much to put in a single stock, sector, or top holdings.</p>
      ${stepRow('Single position limit', 'Max portfolio weight in any one stock.', '≤ 8%')}${stepRow('Sector limit', 'Max total weight in any one sector (e.g., Tech).', '≤ 25%')}${stepRow('Top 5 holdings', 'Max combined weight of your five largest holdings.', '≤ 40%')}</div>
    <div class="card"><h2>Risk${inf}</h2><p class="desc">Keep portfolio risk within a comfortable range.</p>
      ${stepRow('Beta (vs. market)', 'Portfolio sensitivity to market moves (1.00 = market).', '≤ 1.20')}${stepRow('Volatility (annual)', 'Expected annual price variation (standard deviation).', '≤ 22%')}${stepRow('Max drawdown', 'Largest acceptable peak-to-trough decline (e.g., -18%).', '≥ -18%')}</div>
    <div class="card"><h2>Diversification${inf}</h2><p class="desc">Build a more resilient portfolio across assets and cash.</p>
      ${stepRow('Minimum holdings', 'Keep at least this many total positions.', '≥ 15')}${stepRow('Cash bounds', 'Target range for cash / cash-like holdings.', '5% – 15%')}${stepRow('Crypto allocation', 'Max portfolio weight in crypto (e.g., BTC, ETH).', '≤ 5%')}</div>
    <div class="card"><h2>Valuation${inf}</h2><p class="desc">Prefer reasonable valuations and income where it fits.</p>
      ${stepRow('P/E (trailing)', 'Avoid stocks with trailing P/E above this level.', '≤ 28')}${stepRow('Dividend yield', 'Prefer holdings with at least this dividend yield (if applicable).', '≥ 1.5%')}</div>
  </div>
  <div class="card mt collapse">${ic('chevR')}<div><b>Overrides &amp; exclusions${inf}</b><small>Allow limited exceptions or exclude specific securities, sectors, or themes.</small></div></div>
  <div class="card mt collapse">${ic('plus')}<div><b>Add a custom rule</b><small>Create an additional rule using a metric, condition, and limit.</small></div>
    <span class="field" style="margin-left:auto;width:196px;color:var(--muted);font-size:12px">Example: EV/EBITDA ≤ 15</span><button class="btn sm ghost" style="background:var(--line-2)">Add rule</button></div>
  <div style="display:flex;justify-content:flex-end;margin-top:10px">${teacher('How will these guidelines affect my portfolio?').replace('class="teacher ', 'style="width:345px" class="teacher ')}</div>`;

const news = () => `
  <div class="head"><h1>News on your holdings</h1><span class="spacer"></span><button class="btn">${ic('refresh')}Refresh</button></div>
  <div style="display:flex;gap:18px;align-items:center"><div class="search">${ic('search')}Search topics, companies, or tickers...</div><div class="pill-group"><button class="on" style="padding:6px 24px">All</button><button>My holdings</button><button>Macro</button></div></div>
  <div class="digest mt"><div><h3>${ic('doc')}Today’s digest</h3><p>A quick view of items that may be relevant to your portfolio.</p></div>
    <div><b>Tech stocks edge higher</b><small>MarketWatch • Nov 12</small></div><div><b>Rates seen steady for now</b><small>Bloomberg • Nov 12</small></div><div><b>Energy sector shows strength</b><small>Reuters • Nov 12</small></div></div>
  <div class="grid mt split" style="grid-template-columns:1.6fr 1fr;align-items:start">
    <div><h2 style="font-size:17px;margin:4px 0 12px">Recent coverage</h2><div class="grid" style="gap:14px">
      ${[['NVDA', 'NVIDIA outlines next phase of AI roadmap at developer event', 'MarketWatch • Nov 12, 10:24 AM'], ['AAPL', 'Apple reports quarterly results, reaffirms year outlook', 'Reuters • Nov 12, 9:41 AM'], ['MSFT', 'Microsoft expands cloud features for enterprise customers', 'Bloomberg • Nov 11, 4:27 PM']]
        .map(([t, h, s]) => `<article class="story"><span class="ticker">${t}</span><div><b>${h}</b><small>${s}</small></div>${ic('ext')}</article>`).join('')}</div></div>
    <div class="grid"><div class="card"><div class="card-head"><h3>Watchlist</h3><button class="btn sm">Edit</button></div><table><thead><tr><th>Ticker</th><th class="r">Price</th><th class="r">Change</th></tr></thead><tbody>
      ${[['NVDA', '$493.20', '+2.4%'], ['AAPL', '$189.65', '+0.7%'], ['MSFT', '$415.30', '+1.1%'], ['VTI', '$244.10', '+0.5%']].map(([t, p, c]) => `<tr><td><b>${t}</b></td><td class="r">${p}</td><td class="r pos">${c}<span class="dotg"></span></td></tr>`).join('')}</tbody></table></div>
      <div class="card"><h3>Market context${inf}</h3><table class="mt"><tbody>
      ${[['S&amp;P 500', '5,986.20', '+0.6%', 'pos'], ['Nasdaq', '18,590.14', '+0.9%', 'pos'], ['10-yr yield', '4.29%', '−0.03 pp', 'neg'], ['VIX', '14.8', '−0.7', '']].map(([n, v, c, k]) => `<tr><td><b>${n}</b></td><td class="r">${v}</td><td class="r ${k}">${c}</td></tr>`).join('')}</tbody></table></div></div></div>
  ${teacher('How might this news affect my holdings?', 'float')}`;

function calendar() {
  const weeks = [[27, 28, 29, 30, 31, 1, 2], [3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16], [17, 18, 19, 20, 21, 22, 23], [24, 25, 26, 27, 28, 29, 30]];
  const ev = {5: 'NVDA', 14: 'AAPL'};
  const cells = weeks.map((w, wi) => `<div class="cal-w">${w.map(d => { const mute = wi === 0 && d > 7; return `<div class="${mute ? 'mute' : ''}${!mute && d === 20 ? ' today' : ''}">${d}${!mute && ev[d] ? `<span class="ev">${ev[d]}</span>` : ''}</div>`; }).join('')}</div>`).join('');
  return `
  <div class="head"><h1>Investing calendar${inf}</h1><span class="spacer"></span><button class="btn">${ic('refresh')}Refresh</button><span class="updated"><i>Last updated: Nov 20, 2024</i></span>
    <p class="sub">Earnings, key events, and market dates in one place.</p></div>
  <div class="pill-group"><button class="on" style="padding:5px 24px">Earnings</button><button style="padding:5px 24px">Macro events</button></div>
  <div class="card mt"><div class="card-head"><div style="display:flex;align-items:center;gap:22px"><button class="btn sm">${ic('chevL')}</button><b style="font-size:16px;display:flex;align-items:center;gap:6px">November 2024 ${ic('chevD')}</b><button class="btn sm">${ic('chevR')}</button></div>
    <div class="pill-group"><button style="padding:5px 26px">Week</button><button class="on" style="padding:5px 26px">Month</button></div></div>
    <div class="cal"><div class="cal-h">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div>${d}</div>`).join('')}</div>${cells}</div>
    <div class="cal-legend"><span>Earnings</span><span class="o">Other event</span><em>Earnings dates are company-reported and may change.</em></div></div>
  <div class="grid mt split" style="grid-template-columns:1.3fr 1fr">
    <div class="card"><div class="card-head"><h3>Upcoming earnings${inf}</h3><a class="small" style="color:var(--green);font-weight:600;text-decoration:none" href="#investing/calendar">View all ›</a></div><table><thead><tr><th>Symbol</th><th>Event</th><th>Date${S}</th><th>Source${S}</th></tr></thead><tbody>
      ${[['NVDA', 'Earnings (Q3 FY25)', 'Nov 5, 2024'], ['AAPL', 'Earnings (Q4 FY24)', 'Nov 14, 2024'], ['MSFT', 'Earnings (Q1 FY25)', 'Nov 26, 2024']].map(([s, e, d]) => `<tr><td><span class="sym">${LOGO[s]}${s}</span></td><td class="small">${e}</td><td class="small">${d}</td><td class="small">Company</td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Key macro events${inf}</h3><div class="mt">${[['FOMC meeting', 'Nov 6–7, 2024'], ['CPI (Oct)', 'Nov 13, 2024'], ['PCE (Oct)', 'Nov 29, 2024'], ['Jobs report (Nov)', 'Dec 6, 2024']].map(([e, d]) => `<div class="mac">${ic('calendar')}<span>${e}</span><span>${d}</span></div>`).join('')}</div></div></div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h3>Earnings dates${inf}</h3><div class="counts"><div><b>3</b><span>Confirmed</span></div><div><b>0</b><span>Tentative</span></div><div><b>2</b><span>Unknown</span></div></div></div>
    ${teacher('Which earnings should I watch this month?').replace('these numbers', 'these events')}</div>`;
}

// ---------- budget screens ----------
const debt = () => `
  <div class="head"><h1>Debt plan${inf}</h1><span class="spacer"></span><span class="plan-label">Plan:</span><div class="pill-group"><button class="on" style="padding:5px 18px">Snowball</button><button style="padding:5px 18px">Avalanche</button></div>
    <button class="btn" style="margin-left:16px">${ic('gear')}Rate assumptions</button></div>
  <div class="grid g4">${kpi('Total balance', '$16,640')}${kpi('Total minimum payments', '$420 <small>/ mo</small>')}${kpi('Extra payment', '$300 <small>/ mo</small>')}${kpi('Payoff horizon', '28 months', 'pos')}</div>
  <div class="card mt"><h2>Projected debt balance${inf}</h2><div class="legend" style="margin-top:10px"><span><i class="dotline"></i>With extra payment ($300/mo)</span><span><i class="dash"></i>Minimum payments only</span></div>${debtChart()}
    <div class="foot-note">Illustrative projection using your rates and payments. Not a guarantee of results.</div></div>
  <div class="grid mt split" style="grid-template-columns:1.12fr 1fr">
    <div class="card"><div class="card-head"><h2>Your debts (3)${inf}</h2><button class="btn sm">${ic('pencil')}Edit</button></div><table><thead><tr><th>Debt${S}</th><th>APR${S}</th><th>Balance${S}</th><th>Minimum${S}</th></tr></thead><tbody>
      ${[['card', 'Credit card', '21.49%', '$6,040', '$180'], ['car', 'Auto loan', '6.25%', '$8,400', '$200'], ['cap', 'Student loan', '4.75%', '$2,200', '$40']].map(([i, n, a, b, m]) => `<tr><td><span class="debt-name">${ic(i)}${n}</span></td><td>${a}</td><td><span class="cellbox">${b}</span></td><td><span class="cellbox">${m}</span></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h2>Plan details${inf}</h2><div class="detail-row" style="margin-top:14px"><span>Strategy</span><span class="select">Snowball (smallest balance first)</span></div>
      <div class="detail-row"><span>Rate assumptions</span><span class="select">Use current APRs</span></div>
      <div class="detail-row" style="grid-template-columns:1fr"><span style="display:flex;align-items:center">Extra payment (optional)${inf}</span></div>
      <div style="display:flex;align-items:center;gap:12px"><span class="field" style="flex:1">$300</span><span class="small">/ month</span></div></div></div>
  <div class="grid mt split" style="grid-template-columns:1.12fr 1fr">
    <div class="card"><h3>Payoff summary${inf}</h3><div class="sumrow" style="grid-template-columns:repeat(3,auto)"><div><span>Total paid</span><b>$24,980</b></div><div><span>Total interest</span><b>$8,340</b></div><div><span>Payoff horizon</span><b>28 months</b></div></div></div>
    <div class="grid" style="gap:10px"><div class="tip"><span class="ok"></span>The snowball method can build momentum<br>by paying off smaller debts first.</div>${teacher('Questions about your debt plan or payments?')}</div></div>`;

const prefRow = (l, v, h) => `<div class="pref-row"><span class="lbl">${l}${inf}</span><span class="stepper">${v}</span>${h ? `<span class="hint">${h}</span>` : ''}</div>`;
const settings = () => `
  <div class="head"><h1 style="font-size:23px">Your planning preferences</h1><span class="spacer"></span><button class="btn primary">${ic('check')}Save my budget</button>
    <p class="sub">Set your budget inputs, cash cushion goal, and data preferences.</p></div>
  <div class="grid split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h2>Income planning${inf}</h2><p class="desc">Use your lowest saved month as the basis for planning.</p>
      <div class="pref-row" style="grid-template-columns:1fr 104px;margin-top:8px"><span class="lbl" style="font-weight:600">Basis month (lowest saved)</span><span class="select">October</span><span class="hint" style="grid-column:1">The month with the lowest takehome income in your saved data.</span></div></div>
    <div class="card"><h2>Cash cushion goal${inf}</h2><p class="desc">A cash reserve for unexpected expenses or income changes.</p>
      <div class="pref-row" style="grid-template-columns:1fr 150px;margin-top:8px"><span class="lbl">Target amount</span><span class="stepper">$12,000</span></div>
      <div class="pref-row" style="grid-template-columns:1fr 150px"><span class="lbl">Months of expenses</span><span class="stepper">3 months</span></div></div></div>
  <div class="grid mt split" style="grid-template-columns:1.45fr 1fr;align-items:start">
    <div class="card"><h2>Detailed budget inputs${inf}</h2><p class="desc">Enter your monthly amounts. Use your takehome (after-tax) income and typical spending.</p>
      ${prefRow('Income (monthly)', '$6,200', 'Total monthly income (before or after tax).')}${prefRow('Takehome income', '$5,200', 'Your monthly income after taxes and deductions.')}${prefRow('Fixed bills', '$1,750', 'Recurring essentials (e.g., housing, utilities, insurance).')}
      ${prefRow('Everyday spending', '$1,250', 'Variable spending (e.g., groceries, dining, transport).')}${prefRow('Debt payments', '$700', 'Total monthly debt payments (e.g., loans, credit cards).')}${prefRow('Savings (planned)', '$800', 'Amount you plan to save or invest each month.')}</div>
    <div class="grid">
      <div class="card"><h2>Future bank connection<span class="planned">Planned</span>${inf}</h2><p class="desc">A secure bank connection (MCP) is planned for a future release to import your transactions automatically.</p>
        <button class="btn disabled mt">${ic('link')}Connect bank (planned)</button><p class="desc" style="margin-top:10px">Manual entry (your current method) works fully and isn’t affected.</p></div>
      <div class="card"><h2>Privacy &amp; data</h2><div class="mt">
        <div class="link-row">${ic('lock')}<div><b>Privacy</b><small>How we use and protect your data.</small></div>${ic('chevR')}</div>
        <div class="link-row">${ic('download')}<div><b>Export my data</b><small>Download your budget data (CSV).</small></div>${ic('chevR')}</div></div></div></div></div>
  <div style="display:flex;justify-content:flex-end;margin-top:12px">${teacher('Is my cash cushion and monthly plan a good fit?').replace('class="teacher ', 'style="width:350px" class="teacher ')}</div>`;

const review = () => `
  <div class="head"><h1>Review your monthly plan</h1><span class="spacer"></span><span class="select" style="height:34px;width:110px;font-size:13.5px">November</span><button class="btn">${ic('pencil')}Edit plan</button></div>
  <div class="grid g4">${kpi('Income (lowest)', '$5,200')}${kpi('Planned costs', '$5,560')}${kpi('Available', '−$360', 'neg')}${kpi('Cushion gap', '$360', 'neg')}</div>
  <div class="card mt"><h2>Income vs. cost <span style="font-weight:400;font-size:14px;margin-left:5px">(monthly)</span></h2>${incomeBars()}</div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr">
    <div class="card"><h2>Plan checklist</h2><div style="margin-top:8px">${[['Income is complete', 1], ['Costs are complete', 1], ['Debt minimums are covered', 1], ['Cushion target (≥10%)', 0]].map(([t, on]) => `<div class="check"><span class="box ${on ? 'on' : ''}"></span>${t}${ic('info', 'i tiny-i')}</div>`).join('')}</div></div>
    <div class="warn"><h3>${ic('warn')}$360 shortfall</h3><p>Your planned costs are $360 above your income. Consider tradeoffs to close the gap.</p></div></div>
  <div class="grid mt split" style="grid-template-columns:1fr 1fr;align-items:start">
    <div class="card"><h2>Plan arithmetic</h2><table class="arith mt"><thead><tr><th>Item</th><th class="r">Amount</th></tr></thead><tbody>
      ${[['Income (lowest month)', '$5,200'], ['Housing', '$1,600'], ['Food', '$550'], ['Transport', '$350'], ['Lifestyle', '$450'], ['Debt payments', '$700'], ['Other', '$1,910']].map(([a, b]) => `<tr><td>${a}</td><td class="r">${b}</td></tr>`).join('')}
      <tr class="total"><td>Total planned costs</td><td class="r">$5,560</td></tr><tr class="avail"><td>Available (income − costs)</td><td class="r">−$360</td></tr></tbody></table></div>
    <div class="grid"><div class="card"><h2>${ic('cap')}&nbsp;Teacher-guided tradeoffs</h2><p class="desc" style="font-size:12.5px;color:var(--ink-2)">Ways to close the $360 gap (illustrative):</p>
      ${[['Reduce discretionary spending by <em>$360</em>', 'e.g., dining out, subscriptions, or shopping.', 1], ['Adjust a planned cost by $360', 'e.g., lower a variable category like lifestyle.', 0], ['Use extra income of $360', 'e.g., a small side project or a one-time bonus.', 0]].map(([t, s, on]) => `<div class="option ${on ? 'on' : ''}"><span class="radio ${on ? 'on' : ''}"></span><div><b>${t}</b><small>${s}</small></div></div>`).join('')}</div>
      ${teacher('Which tradeoff best fits my goals?')}</div></div>`;

const goalBlock = (icon, name, line, pct, target, saved, rem, monthly) => `<div class="goal"><div class="goal-top">${ic(icon)}<div><b>${name}${inf}</b><small>${line}</small></div><span class="edit">${ic('pencil')}Edit</span></div>
  <div class="bar"><span style="width:${pct}%"></span></div><div class="goal-cols"><div>Target amount<span class="field">${target}${ic('edit')}</span></div><div>Saved<b>${saved}</b></div><div>Remaining<b>${rem}</b></div><div>Monthly contribution<span class="field">${monthly}${ic('edit')}</span></div></div></div>`;
const goals = () => `
  <div class="head"><h1>Budget goals${inf}</h1><span class="spacer"></span><button class="btn">${ic('pencil')}Edit goals</button><p class="sub">Set target amounts, track progress, and stay on plan.</p></div>
  <div class="grid g4">${kpi('Emergency fund', '$12,000')}${kpi('Saved', '$8,400')}${kpi('Remaining', '$3,600')}${kpi('Monthly contribution', '$600')}</div>
  <div class="card mt"><div class="card-head"><h2>Goal progress (total)</h2><div class="legend" style="margin:0"><span><i class="dotline"></i>Saved</span><span><i class="dash" style="border-color:#9cc79f"></i>Target</span></div><span class="select" style="width:96px">6 Months</span></div>${goalChart()}</div>
  <div class="grid mt split" style="grid-template-columns:1.55fr 1fr;align-items:start">
    <div class="card">${goalBlock('shieldok', 'Emergency fund', '$8,400 of $12,000 (70%)', 70, '$12,000', '$8,400', '$3,600', '$600')}${goalBlock('car', 'Move fund', '$3,000 of $8,000 (38%)', 38, '$8,000', '$3,000', '$5,000', '$500')}${goalBlock('cap', 'Education', '$4,500 of $10,000 (45%)', 45, '$10,000', '$4,500', '$5,500', '$400')}</div>
    <div class="card"><h2>Cash cushion calculator${inf}</h2><p class="desc">Estimate how much cash to keep for near-term needs.</p>
      <div class="pref-row" style="grid-template-columns:1fr 92px;margin-top:10px"><span class="small">Monthly essential expenses</span><span class="field" style="justify-content:space-between">$3,200${ic('edit')}</span></div>
      <div class="pref-row" style="grid-template-columns:1fr 92px"><span class="small">Cushion (months)</span><span class="select">3 months</span></div>
      <div class="reco"><span>Recommended cushion</span><b>$9,600 <svg class="i tiny-i" viewBox="0 0 24 24"><path d="${P.info}"/></svg></b></div>
      <p class="desc" style="color:var(--ink-2);font-size:12px"><b style="color:var(--ink)">Context</b><br>Covers about 3 months of essential expenses ($3,200 × 3).</p></div></div>
  <div style="display:flex;justify-content:flex-end;margin-top:12px">${teacher('How can I adjust my goals to build my emergency fund faster?').replace('these numbers', 'your goals').replace('class="teacher ', 'style="width:360px" class="teacher ')}</div>`;

const placeholder = (ws, label, links) => `<div class="head"><h1>${label}</h1></div><div class="placeholder"><p>This view is next in the redesign.</p><p>${links.map(([v, l]) => `<a href="#${ws}/${v}">${l}</a>`).join(' · ')}</p></div>`;

const SCREENS = {
  investing: {holdings, guidelines, news, calendar},
  budget: {debt, settings, review, goals},
};
const DEFAULT = {investing: 'holdings', budget: 'debt'};

function render() {
  const [wsRaw, viewRaw] = location.hash.replace(/^#/, '').split('/');
  const ws = wsRaw === 'budget' ? 'budget' : 'investing';
  const items = ws === 'budget' ? BUDGET : INVESTING;
  const view = items.some(([id]) => id === viewRaw) ? viewRaw : DEFAULT[ws];
  document.querySelector('#seg').innerHTML = ['investing', 'budget'].map(w => `<a href="#${w}/${DEFAULT[w]}" class="${w === ws ? 'on' : ''}">${w === 'budget' ? 'Budget' : 'Investing'}</a>`).join('');
  document.querySelector('#nav').innerHTML = items.map(([id, label, icon]) => `<a href="#${ws}/${id}" class="${id === view ? 'on' : ''}" ${id === view ? 'aria-current="page"' : ''}>${ic(icon)}${label}</a>`).join('');
  const fn = SCREENS[ws][view];
  const label = items.find(([id]) => id === view)[1];
  document.querySelector('#main').innerHTML = fn ? fn() : placeholder(ws, label, Object.keys(SCREENS[ws]).map(v => [v, items.find(([id]) => id === v)[1]]));
  document.title = `${label} · ${ws === 'budget' ? 'Budget' : 'Investing'} · Mentor Labs`;
}
document.querySelector('#user').innerHTML = ic('user');
document.querySelector('#guide-icons').innerHTML = ic('book');
document.querySelector('#guide-chev').innerHTML = ic('chevR', 'i chev');
document.querySelector('#avail-icon').innerHTML = ic('msg');
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();
