/* Sentinel — portfolio risk monitor (static demo). */
(() => {
  "use strict";

  // ---------- Config ----------
  const DEMO_HOLDINGS = [
    { ticker: "NVDA", shares: 120, cost: 95 },
    { ticker: "AAPL", shares: 40, cost: 185 },
    { ticker: "MSFT", shares: 25, cost: 410 },
    { ticker: "AVGO", shares: 40, cost: 160 },
    { ticker: "AMZN", shares: 35, cost: 180 },
    { ticker: "GOOGL", shares: 30, cost: 160 },
    { ticker: "JPM", shares: 25, cost: 210 },
    { ticker: "META", shares: 12, cost: 480 },
    { ticker: "JNJ", shares: 20, cost: 155 },
    { ticker: "TSLA", shares: 15, cost: 240 },
    { ticker: "XOM", shares: 30, cost: 112 },
    { ticker: "BTC", shares: 0.08, cost: 62000 },
    { ticker: "ETH", shares: 1.5, cost: 2600 },
  ];

  const PRESETS = {
    conservative: { maxPosition: 7, maxSector: 25, maxCrypto: 0, maxBeta: 0.9, maxVol: 15, maxDrawdown: 12, minHoldings: 20, maxTop5: 40, maxPE: 35, earningsWindow: 21, maxLossFromCost: 15, maxFromHigh: 20, maxCorr: 0.75 },
    moderate: { maxPosition: 10, maxSector: 30, maxCrypto: 5, maxBeta: 1.15, maxVol: 22, maxDrawdown: 20, minHoldings: 12, maxTop5: 50, maxPE: 60, earningsWindow: 14, maxLossFromCost: 20, maxFromHigh: 30, maxCorr: 0.8 },
    aggressive: { maxPosition: 20, maxSector: 45, maxCrypto: 15, maxBeta: 1.5, maxVol: 35, maxDrawdown: 35, minHoldings: 6, maxTop5: 70, maxPE: 120, earningsWindow: 7, maxLossFromCost: 35, maxFromHigh: 45, maxCorr: 0.9 },
  };

  const FIELDS = [
    { key: "maxPosition", label: "Max single position", unit: "%", min: 2, max: 40, step: 1, hint: "Largest weight any one holding may carry." },
    { key: "maxSector", label: "Max sector exposure", unit: "%", min: 10, max: 80, step: 1, hint: "Flags over-concentration in a single GICS sector." },
    { key: "maxTop5", label: "Max top-5 concentration", unit: "%", min: 20, max: 100, step: 1, hint: "Combined weight of your five largest positions." },
    { key: "maxCrypto", label: "Max crypto allocation", unit: "%", min: 0, max: 50, step: 1, hint: "Set to 0 to prohibit digital assets." },
    { key: "maxBeta", label: "Max portfolio beta", unit: "", min: 0.5, max: 2, step: 0.05, hint: "Sensitivity to S&P 500 moves (1.0 = market)." },
    { key: "maxVol", label: "Max annualized volatility", unit: "%", min: 8, max: 60, step: 1, hint: "Standard deviation of weekly returns, annualized." },
    { key: "maxDrawdown", label: "Max tolerated drawdown", unit: "%", min: 5, max: 60, step: 1, hint: "Worst peak-to-trough decline over the last year." },
    { key: "maxPE", label: "Valuation ceiling (P/E)", unit: "x", min: 15, max: 200, step: 5, hint: "Flags holdings priced above this earnings multiple." },
    { key: "minHoldings", label: "Minimum number of holdings", unit: "", min: 1, max: 40, step: 1, hint: "Diversification floor." },
    { key: "earningsWindow", label: "Earnings alert window", unit: "d", min: 3, max: 45, step: 1, hint: "Warn when a large position reports within this many days." },
    { key: "maxLossFromCost", label: "Stop-loss review trigger", unit: "%", min: 5, max: 60, step: 1, hint: "Flag positions down more than this from your cost basis." },
    { key: "maxFromHigh", label: "Max decline from 52-week high", unit: "%", min: 5, max: 70, step: 1, hint: "Flag holdings trading this far below their 52-week high." },
    { key: "maxCorr", label: "Correlation alert threshold", unit: "ρ", min: 0.5, max: 0.95, step: 0.05, hint: "Pairs moving together above this act like one bet (hidden concentration)." },
  ];

  const SECTORS = ["Information Technology", "Communication Services", "Consumer Discretionary", "Consumer Staples", "Financials", "Health Care", "Energy", "Industrials", "Materials", "Utilities", "Real Estate", "Crypto", "Cash", "Unknown"];
  const DEFAULT_RULES = [{ id: "r-default", scope: "holding", metric: "buyPct", op: ">=", value: 50, sev: "info" }];
  const SECTOR_COLORS = {
    "Information Technology": "#60a5fa", "Communication Services": "#a78bfa", "Consumer Discretionary": "#f472b6",
    "Consumer Staples": "#fb923c", Financials: "#34d399", "Health Care": "#2dd4bf", Energy: "#fbbf24",
    Industrials: "#677b6e", Materials: "#c084fc", Utilities: "#4ade80", "Real Estate": "#f87171", Crypto: "#f59e0b", Cash: "#385348", Unknown: "#475569",
  };
  const CRYPTO_IDS = { BTC: "bitcoin", ETH: "ethereum" };
  const BROKERS = [
    ["Robinhood", "OAuth · read-only"], ["Charles Schwab", "via SnapTrade"], ["Fidelity", "via Plaid"],
    ["Vanguard", "via Plaid"], ["E*TRADE", "via SnapTrade"], ["Coinbase", "API key · read-only"],
  ];

  // ---------- Utils ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isNum = (x) => typeof x === "number" && isFinite(x);
  const fmtUSD = (v, d = 0) => isNum(v) ? v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d }) : "—";
  const fmtPct = (v, d = 1, sign = false) => isNum(v) ? `${sign && v > 0 ? "+" : ""}${v.toFixed(d)}%` : "—";
  const fmtNum = (v, d = 2) => isNum(v) ? v.toLocaleString("en-US", { maximumFractionDigits: d }) : "—";
  const fmtCompact = (v) => isNum(v) ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : "—";
  const cls = (v) => (isNum(v) ? (v >= 0 ? "up" : "down") : "");
  let today = new Date("2026-11-06T12:00:00Z");
  const daysUntil = (iso) => Math.round((new Date(iso + "T12:00:00Z") - today) / 864e5);
  const bridgeMemory=new Map();
  const store={get:(k,f)=>bridgeMemory.has(k)?bridgeMemory.get(k):f,set:(k,v)=>bridgeMemory.set(k,v)};
  const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const std = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const cov = (a, b) => { const ma = mean(a), mb = mean(b); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb); return s / Math.max(1, a.length - 1); };
  const pctReturns = (s) => s.slice(1).map((v, i) => (s[i] ? v / s[i] - 1 : 0));

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- State ----------
  const state = {
    holdings: store.get("sentinel.holdings", DEMO_HOLDINGS),
    label: store.get("sentinel.label", "Demo portfolio"),
    settings: { ...PRESETS.moderate, excluded: [], tickerLimits: {}, sectorLimits: {}, customRules: DEFAULT_RULES, ...store.get("sentinel.settings", {}) },
    view: (location.hash || "#overview").slice(1),
    range: 52,
    sort: { key: "value", dir: -1 },
    newsFilter: "All",
    filter: "",
  };
  let mentorPayload=null,originalData=null,mentorReady=false,mentorDraft=true;
  const emit=(type,data={})=>parent.postMessage({type,...data},location.origin);
  let DATA = null;
  let A = null; // analysis result
  const charts = {};

  // ---------- Data ----------
  async function loadJSON(p) {
    try { const r = await fetch(p, { cache: "no-cache" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; }
  }

  async function loadData() {
    const [eq, mac] = await Promise.all([loadJSON("data/equities.json"), loadJSON("data/macro.json")]);
    const assets = {};
    if (eq?.tickers) for (const [sym, t] of Object.entries(eq.tickers)) assets[sym] = { ...t, type: "equity" };
    if (mac?.crypto) {
      for (const [sym, id] of Object.entries(CRYPTO_IDS)) {
        const c = mac.crypto[id];
        if (c) assets[sym] = { name: c.name, sector: "Crypto", industry: "Digital asset", price: c.price, changePct: c.changePct, marketCap: c.marketCap, pe: null, beta: null, dividendYield: 0, history: c.history || [], analyst: null, news: [], type: "crypto" };
      }
    }
    const spy = eq?.benchmark?.SPY || null;
    const sources = [...new Set([...(eq?.sources || []), ...(mac?.sources || [])])];
    return {
      assets, spy, sources,
      asOf: eq?.asOf || mac?.asOf,
      macro: mac?.macro || {},
      earnings: mac?.earningsCalendar || [],
      econ: mac?.economicEvents || [],
      marketNews: mac?.marketNews || [],
      cryptoNews: mac?.cryptoNews || [],
    };
  }

  // Price for an asset at a date: last close on/before that date (or first available).
  function priceAt(hist, iso) {
    if (!hist?.length) return null;
    let lo = 0, hi = hist.length - 1, ans = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (hist[m].d <= iso) { ans = m; lo = m + 1; } else hi = m - 1; }
    return hist[Math.max(0, ans)].c;
  }

  // ---------- Analysis ----------
  const CASH_ASSET = { name: "Cash & equivalents", sector: "Cash", industry: "Cash", price: 1, changePct: 0, pe: null, beta: 0, dividendYield: 0, analyst: null, news: [], type: "cash" };
  const posLimit = (S, t) => (isNum(S.tickerLimits?.[t]) ? S.tickerLimits[t] : S.maxPosition);
  const secLimit = (S, s) => (isNum(S.sectorLimits?.[s]) ? S.sectorLimits[s] : S.maxSector);
  const corr = (a, b) => { const sa = std(a), sb = std(b); return sa && sb ? cov(a, b) / (sa * sb) : 0; };
  const NON_SECTOR = ["Crypto", "Cash", "Unknown"];

  const PORT_METRICS = {
    beta: ["Portfolio beta", "", (c) => c.beta],
    vol: ["Annualized volatility", "%", (c) => c.vol],
    maxDD: ["Max drawdown (1Y)", "%", (c) => (isNum(c.maxDD) ? -c.maxDD : null)],
    ret1y: ["1Y return", "%", (c) => c.ret1y],
    excess: ["1Y return vs S&P 500", "%", (c) => (isNum(c.ret1y) && isNum(c.spyRet) ? c.ret1y - c.spyRet : null)],
    sharpe: ["Sharpe ratio", "", (c) => c.sharpe],
    wPE: ["Weighted P/E", "x", (c) => c.wPE],
    divYield: ["Dividend yield", "%", (c) => c.divYield],
    top5: ["Top-5 weight", "%", (c) => c.top5],
    effN: ["Effective # of holdings", "", (c) => c.effN],
    sectorsCount: ["Number of sectors held", "", (c) => c.sectorsCount],
    cash: ["Cash weight", "%", (c) => c.sectors.Cash || 0],
  };
  const HOLD_METRICS = {
    weight: ["Weight", "%"], pe: ["P/E", "x"], ret1y: ["1Y return", "%"], vol: ["Volatility", "%"], beta: ["Beta", ""],
    plPct: ["Gain/loss vs cost", "%"], fromHigh: ["% from 52-week high", "%"], upside: ["Upside to analyst target", "%"],
    buyPct: ["Analyst buy rating %", "%"], divYield: ["Dividend yield", "%"],
  };
  const fmtMetric = (v, u) => (!isNum(v) ? "—" : u === "%" ? fmtPct(v) : u === "x" ? v.toFixed(1) + "x" : v.toFixed(2));
  const opSym = (op) => (op === ">=" ? "≥" : "≤");
  const ruleText = (r) => {
    const m = (r.scope === "portfolio" ? PORT_METRICS : HOLD_METRICS)[r.metric];
    return `${r.scope === "portfolio" ? "Portfolio" : "Each holding"}: ${m ? m[0] : r.metric} ${opSym(r.op)} ${r.value}${m?.[1] || ""}`;
  };

  function analyze(holdings = state.holdings, S = state.settings) {
    const dates = (DATA.spy?.history || []).map((p) => p.d);
    const spySeries = (DATA.spy?.history || []).map((p) => p.c);
    const sr = pctReturns(spySeries);

    const rows = holdings.map((h) => {
      const isCash = h.ticker === "CASH";
      const a = isCash ? CASH_ASSET : DATA.assets[h.ticker];
      const price = a?.price ?? (isNum(h.cost) ? h.cost : null);
      const value = isNum(h.importedValue) ? h.importedValue : isNum(price) ? price * h.shares : 0;
      const series = isCash ? dates.map(() => 1) : a?.history?.length && dates.length ? dates.map((d) => priceAt(a.history, d)) : null;
      let vol = null, beta = a?.beta ?? null, ret1y = null, rets = null;
      if (series && series.length > 2) {
        rets = pctReturns(series);
        vol = std(rets) * Math.sqrt(52) * 100;
        if (beta == null) beta = cov(rets, sr) / (std(sr) ** 2 || 1);
        ret1y = (series[series.length - 1] / series[0] - 1) * 100;
      }
      const an = a?.analyst, anTot = an ? an.buy + an.hold + an.sell : 0;
      return {
        ticker: h.ticker, shares: h.shares, cost: h.cost, a, known: !!a, isCash,
        name: a?.name || "Not in data snapshot", sector: a?.sector || "Unknown",
        price, chg: a?.changePct ?? null, value, series, rets, vol, beta, ret1y,
        pe: a?.pe ?? null, divYield: (a?.dividendYield || 0) * 100,
        pl: !isCash && isNum(h.cost) && isNum(price) ? (price - h.cost) * h.shares : null,
        plPct: !isCash && isNum(h.cost) && isNum(price) && h.cost ? (price / h.cost - 1) * 100 : null,
        fromHigh: isNum(a?.week52High) && isNum(price) && a.week52High ? (price / a.week52High - 1) * 100 : null,
        upside: an && isNum(an.target) && price ? (an.target / price - 1) * 100 : null,
        buyPct: anTot ? (an.buy / anTot) * 100 : null,
      };
    });

    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    rows.forEach((r) => (r.weight = (r.value / total) * 100));
    const inv = rows.filter((r) => !r.isCash);
    let dayChg = rows.reduce((s, r) => s + (isNum(r.chg) ? r.value - r.value / (1 + r.chg / 100) : 0), 0);
    let costTotal = rows.reduce((s, r) => s + (isNum(r.cost) ? r.cost * r.shares : r.value), 0);

    let port = dates.map((_, i) => rows.reduce((s, r) => s + (r.series ? r.series[i] * r.shares : r.value), 0));
    let pr = pctReturns(port);
    let vol = port.length > 2 ? std(pr) * Math.sqrt(52) * 100 : null;
    let beta = port.length > 2 ? cov(pr, sr) / (std(sr) ** 2 || 1) : null;
    let ret1y = port.length ? (port[port.length - 1] / port[0] - 1) * 100 : null;
    let spyRet = spySeries.length ? (spySeries[spySeries.length - 1] / spySeries[0] - 1) * 100 : null;
    let peak = -Infinity; let dd = port.map((v) => { peak = Math.max(peak, v); return (v / peak - 1) * 100; });
    let maxDD = dd.length ? Math.min(...dd) : null;
    let rf = isNum(DATA.macro?.tenYear) ? DATA.macro.tenYear : 4;
    let sharpe = isNum(vol) && vol > 0 ? (ret1y - rf) / vol : null;
    let te = port.length > 2 ? std(pr.map((x, i) => x - sr[i])) * Math.sqrt(52) * 100 : null;
    const spyVol = sr.length ? std(sr) * Math.sqrt(52) * 100 : null;

    const sectors = {};
    rows.forEach((r) => (sectors[r.sector] = (sectors[r.sector] || 0) + r.weight));
    const sectorList = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
    const sectorsCount = Object.keys(sectors).filter((s) => !["Cash", "Unknown"].includes(s)).length;
    const sorted = [...inv].sort((a, b) => b.weight - a.weight);
    const top5 = sorted.slice(0, 5).reduce((s, r) => s + r.weight, 0);
    const invW = inv.reduce((s, r) => s + r.weight, 0) || 1;
    let hhi = inv.reduce((s, r) => s + (r.weight / invW) ** 2, 0);
    let effN = hhi ? 1 / hhi : 0;
    let crypto = sectors.Crypto || 0;
    let wPE = (() => { const p = inv.filter((r) => isNum(r.pe) && r.pe > 0); const w = p.reduce((s, r) => s + r.weight, 0); return w ? p.reduce((s, r) => s + r.pe * r.weight, 0) / w : null; })();
    let divYield = rows.reduce((s, r) => s + (r.divYield * r.weight) / 100, 0);

    // Correlated pairs (hidden concentration)
    const withR = inv.filter((r) => r.rets);
    const pairs = [];
    for (let i = 0; i < withR.length; i++) for (let j = i + 1; j < withR.length; j++) {
      const c = corr(withR[i].rets, withR[j].rets);
      if (c >= S.maxCorr) pairs.push({ a: withR[i].ticker, b: withR[j].ticker, c, w: withR[i].weight + withR[j].weight });
    }
    pairs.sort((x, y) => y.w - x.w);

    const held = new Set(rows.map((r) => r.ticker));
    const events = [
      ...DATA.earnings.filter((e) => held.has(e.ticker) && e.date && daysUntil(e.date) >= 0).map((e) => ({ ...e, kind: "earnings", days: daysUntil(e.date), weight: rows.find((r) => r.ticker === e.ticker)?.weight || 0 })),
      ...DATA.econ.filter((e) => e.date && daysUntil(e.date) >= 0).map((e) => ({ ...e, kind: "macro", days: daysUntil(e.date) })),
    ].sort((a, b) => a.days - b.days);

    const authoritative=mentorPayload&&!state.label.startsWith('What-if')&&holdings===state.holdings?(mentorPayload.market?.riskAnalysis||mentorPayload.workspace?.advancedRisk):null;
    if(authoritative){const m=authoritative.metrics,h=authoritative.history;
      costTotal=authoritative.rows.every(r=>r.isCash||isNum(r.costBasis))?authoritative.rows.reduce((sum,r)=>sum+(r.isCash?r.value:r.costBasis),0):null;
      dayChg=null;beta=m.beta;vol=m.vol;ret1y=m.ret1y;spyRet=m.spyRet;maxDD=isNum(m.maxDD)?-m.maxDD:null;sharpe=m.sharpe;te=m.trackingError;hhi=m.hhi??0;effN=m.effN??0;crypto=m.crypto;wPE=m.wPE;divYield=m.divYield;rf=authoritative.provenance.riskFreeRate;
      port=h.portfolio.map(x=>x/100*total);dd=h.drawdown;
      rows.forEach(r=>{const a=authoritative.rows.find(x=>x.symbol===r.ticker);if(a)Object.assign(r,{beta:a.beta,vol:a.vol,ret1y:a.ret1y,pe:a.pe,pl:a.pl,plPct:a.plPct,fromHigh:a.fromHigh,upside:a.upside,buyPct:a.buyPct,divYield:a.divYield,sector:a.sector});});
      if(!h.complete){dates.length=0;spySeries.length=0;}
    }
    const ctx = { beta, vol, maxDD, ret1y, spyRet, sharpe, wPE, divYield, top5, effN, sectorsCount, sectors };

    // ---------- Rules ----------
    const alerts = [], passes = [];
    const add = (sev, type, title, detail, key = null) => alerts.push({ sev, type, title, detail, key });
    const custom = (m, k) => (isNum(m?.[k]) ? "custom " : "");

    sorted.forEach((r) => { const L = posLimit(S, r.ticker); if (r.weight > L) add(r.weight > L * 1.5 ? "high" : "med", "position", `${r.ticker} is ${fmtPct(r.weight)} of the portfolio`, `Above your ${L}% ${custom(S.tickerLimits, r.ticker)}limit by ${fmtPct(r.weight - L)} (~${fmtUSD(((r.weight - L) / 100) * total)}).`, r.ticker); });
    sectorList.forEach(([s, w]) => { if (NON_SECTOR.includes(s)) return; const L = secLimit(S, s); if (w > L) add("high", "sector", `${s} exposure at ${fmtPct(w)}`, `Over your ${L}% ${custom(S.sectorLimits, s)}sector cap. Holdings: ${sorted.filter((r) => r.sector === s).map((r) => r.ticker).join(", ")}.`, s); });
    if (crypto > S.maxCrypto) add(S.maxCrypto === 0 || crypto > S.maxCrypto * 1.5 ? "high" : "med", "crypto", `Crypto allocation at ${fmtPct(crypto)}`, S.maxCrypto === 0 ? "Your guidelines prohibit digital assets." : `Above your ${S.maxCrypto}% crypto limit.`, "Crypto");
    (S.excluded || []).forEach((s) => { const w = sectors[s]; if (w) add("high", "excluded", `Holds excluded sector: ${s}`, `${fmtPct(w)} of the portfolio is in a sector your guidelines exclude (${sorted.filter((r) => r.sector === s).map((r) => r.ticker).join(", ")}).`, s); });
    if (top5 > S.maxTop5) add("med", "top5", `Top 5 positions are ${fmtPct(top5)} of assets`, `Above your ${S.maxTop5}% top-5 concentration limit. Effective number of holdings: ${effN.toFixed(1)}.`);
    if (isNum(beta) && beta > S.maxBeta) add("med", "beta", `Portfolio beta ${beta.toFixed(2)}`, `Above your ${S.maxBeta.toFixed(2)} ceiling; a 10% S&P drop implies roughly a ${(beta * 10).toFixed(1)}% portfolio drop.`);
    if (isNum(vol) && vol > S.maxVol) add("med", "vol", `Volatility ${fmtPct(vol)} annualized`, `Above your ${S.maxVol}% tolerance (S&P 500: ${fmtPct(spyVol)}).`);
    if (isNum(maxDD) && -maxDD > S.maxDrawdown) add("med", "dd", `1Y max drawdown ${fmtPct(maxDD)}`, `Deeper than your ${S.maxDrawdown}% drawdown tolerance.`);
    if (inv.length < S.minHoldings) add("med", "minHoldings", `Only ${inv.length} holdings`, `Below your diversification floor of ${S.minHoldings}.`);
    inv.filter((r) => isNum(r.plPct) && r.plPct < -S.maxLossFromCost).forEach((r) => add("med", "stoploss", `${r.ticker} is ${fmtPct(r.plPct)} below cost`, `Past your ${S.maxLossFromCost}% review trigger (unrealized ${fmtUSD(r.pl)}).`, r.ticker));
    pairs.slice(0, 4).forEach((p) => add(p.w > S.maxPosition * 1.5 ? "med" : "info", "corr", `${p.a} & ${p.b} move together (ρ ${p.c.toFixed(2)})`, `Combined ${fmtPct(p.w)} of the portfolio behaves like a single position.`, p.a + "|" + p.b));
    events.filter((e) => e.kind === "earnings" && e.days <= S.earningsWindow).forEach((e) =>
      add(e.weight > S.maxPosition / 2 ? "med" : "info", "earnings", `${e.ticker} reports earnings in ${e.days} day${e.days === 1 ? "" : "s"}`, `${fmtPct(e.weight)} position${isNum(e.epsEstimate) ? ` · EPS estimate ${fmtUSD(e.epsEstimate, 2)}` : ""}. Expect elevated volatility around the print.`, e.ticker));
    inv.filter((r) => isNum(r.pe) && r.pe > S.maxPE).forEach((r) => add("info", "pe", `${r.ticker} trades at ${r.pe.toFixed(0)}x earnings`, `Above your ${S.maxPE}x valuation ceiling.`, r.ticker));
    inv.filter((r) => isNum(r.fromHigh) && r.fromHigh < -S.maxFromHigh).forEach((r) => add("info", "fromHigh", `${r.ticker} is ${fmtPct(r.fromHigh)} from its 52-week high`, `Beyond your ${S.maxFromHigh}% threshold (high ${fmtUSD(r.a.week52High, 2)}).`, r.ticker));
    inv.filter((r) => !r.known).forEach((r) => add("info", "nodata", `No market data for ${r.ticker}`, isNum(r.cost) ? "Valued at your cost basis; excluded from risk statistics." : "Add a cost basis or connect a data source to include it in the review.", r.ticker));

    (S.customRules || []).forEach((rule) => {
      const ok = (v) => (rule.op === ">=" ? v >= rule.value : v <= rule.value);
      if (rule.scope === "portfolio") {
        const m = PORT_METRICS[rule.metric]; if (!m) return;
        const v = m[2](ctx);
        if (!isNum(v)) return;
        if (ok(v)) passes.push(`${ruleText(rule)} (${fmtMetric(v, m[1])})`);
        else add(rule.sev, "custom", `Your rule: ${m[0]} ${opSym(rule.op)} ${rule.value}${m[1]}`, `Currently ${fmtMetric(v, m[1])}.`, rule.id);
      } else {
        const m = HOLD_METRICS[rule.metric]; if (!m) return;
        const bad = inv.filter((r) => isNum(r[rule.metric]) && !ok(r[rule.metric]));
        if (!bad.length) passes.push(ruleText(rule));
        else add(rule.sev, "custom", `Your rule: each holding ${m[0]} ${opSym(rule.op)} ${rule.value}${m[1]}`, `${bad.length} holding${bad.length === 1 ? "" : "s"} fail: ${bad.slice(0, 6).map((r) => `${r.ticker} ${fmtMetric(r[rule.metric], m[1])}`).join(", ")}${bad.length > 6 ? "…" : ""}.`, rule.id);
      }
    });

    if (!sorted.some((r) => r.weight > posLimit(S, r.ticker))) passes.push(`All positions within limits (${S.maxPosition}% default)`);
    if (!sectorList.some(([s, w]) => !NON_SECTOR.includes(s) && w > secLimit(S, s))) passes.push(`All sectors within caps (${S.maxSector}% default)`);
    if (crypto <= S.maxCrypto) passes.push(`Crypto ${fmtPct(crypto)} within ${S.maxCrypto}% limit`);
    if (isNum(beta) && beta <= S.maxBeta) passes.push(`Beta ${beta.toFixed(2)} within ${S.maxBeta.toFixed(2)}`);
    if (isNum(vol) && vol <= S.maxVol) passes.push(`Volatility ${fmtPct(vol)} within ${S.maxVol}%`);
    if (isNum(maxDD) && -maxDD <= S.maxDrawdown) passes.push(`Drawdown ${fmtPct(maxDD)} within tolerance`);
    if (top5 <= S.maxTop5) passes.push(`Top-5 concentration ${fmtPct(top5)} within ${S.maxTop5}%`);
    if (inv.length >= S.minHoldings) passes.push(`${inv.length} holdings meets diversification floor`);
    if (!inv.some((r) => isNum(r.plPct) && r.plPct < -S.maxLossFromCost)) passes.push(`No position down more than ${S.maxLossFromCost}% from cost`);

    if(authoritative){
      if(!isNum(crypto)){for(let i=passes.length-1;i>=0;i--)if(passes[i].startsWith('Crypto '))passes.splice(i,1);}
      if(rows.some(r=>r.sector==='Unknown')){for(let i=passes.length-1;i>=0;i--)if(passes[i].startsWith('All sectors'))passes.splice(i,1);}
      if(inv.some(r=>!isNum(r.plPct))){for(let i=passes.length-1;i>=0;i--)if(passes[i].startsWith('No position down'))passes.splice(i,1);}
      for(const rule of S.customRules||[]){const metric=PORT_METRICS[rule.metric];const unavailable=rule.scope==='portfolio'?(!metric||!isNum(metric[2](ctx))):inv.some(r=>!isNum(r[rule.metric]));if(unavailable){for(let i=passes.length-1;i>=0;i--)if(passes[i].startsWith(ruleText(rule)))passes.splice(i,1);}}
      for(const c of authoritative.checks.filter(c=>c.status==='unknown'&&c.limit!=null))add('info','coverage',c.label+' - unknown',c.detail||'Required data is missing; this is not a passing check.');
    }
    const order = { high: 0, med: 1, info: 2 };
    alerts.sort((a, b) => order[a.sev] - order[b.sev]);
    const score = Math.max(0, Math.round(100 - alerts.reduce((s, a) => s + (a.sev === "high" ? 10 : a.sev === "med" ? 5 : 1), 0)));

    return { ...ctx, rows, inv, total, dayChg, costTotal, dates, port, spySeries, dd, te, rf, sectorList, hhi, crypto, pairs, events, alerts, passes, score };
  }

  // ---------- Improvement engine ----------
  // Trims positions (pro-rata within groups) until position, sector, crypto, exclusion and top-5 limits hold.
  // Proceeds are parked in CASH so total value is unchanged. `only` limits the fix to a single alert.
  function rebalance(S = state.settings, only = null) {
    const base = analyze(state.holdings, S);
    const T = base.total;
    const v = new Map(base.rows.map((r) => [r.ticker, r.value]));
    const want = (t, key) => !only || (only.type === t && (only.key == null || key == null || only.key === key));
    for (let it = 0; it < 15; it++) {
      let changed = false;
      const cut = (t, nv) => { if (v.get(t) - nv > 0.5) { v.set(t, Math.max(0, nv)); changed = true; } };
      (S.excluded || []).forEach((s) => { if (want("excluded", s)) base.inv.forEach((r) => r.sector === s && cut(r.ticker, 0)); });
      base.inv.forEach((r) => { if (want("position", r.ticker)) { const cap = (posLimit(S, r.ticker) / 100) * T; if (v.get(r.ticker) > cap) cut(r.ticker, cap); } });
      const sums = {};
      base.inv.forEach((r) => (sums[r.sector] = (sums[r.sector] || 0) + v.get(r.ticker)));
      Object.entries(sums).forEach(([s, sum]) => {
        if (NON_SECTOR.includes(s) || !want("sector", s)) return;
        const cap = (secLimit(S, s) / 100) * T;
        if (sum > cap) base.inv.forEach((r) => r.sector === s && cut(r.ticker, (v.get(r.ticker) * cap) / sum));
      });
      if (want("crypto", "Crypto")) {
        const cr = base.inv.filter((r) => r.sector === "Crypto"), sum = cr.reduce((s, r) => s + v.get(r.ticker), 0), cap = (S.maxCrypto / 100) * T;
        if (sum > cap) cr.forEach((r) => cut(r.ticker, (v.get(r.ticker) * cap) / sum));
      }
      if (want("top5", null)) {
        const top = base.inv.map((r) => r.ticker).sort((a, b) => v.get(b) - v.get(a)).slice(0, 5);
        const sum = top.reduce((s, t) => s + v.get(t), 0), cap = (S.maxTop5 / 100) * T;
        if (sum > cap) top.forEach((t) => cut(t, (v.get(t) * cap) / sum));
      }
      if (!changed) break;
    }
    const trades = base.inv.filter((r) => r.value - v.get(r.ticker) > 1).map((r) => {
      const sell = r.value - v.get(r.ticker), shares = r.price ? sell / r.price : 0;
      return { ticker: r.ticker, sector: r.sector, from: r.weight, to: (v.get(r.ticker) / T) * 100, sell, shares, gain: isNum(r.cost) && isNum(r.price) ? (r.price - r.cost) * shares : null, exit: v.get(r.ticker) < 1 };
    }).sort((a, b) => b.sell - a.sell);
    const proceeds = trades.reduce((s, t) => s + t.sell, 0);
    const cashNow = base.rows.filter((r) => r.isCash).reduce((s, r) => s + r.value, 0);
    const byT = new Map(base.rows.map((r) => [r.ticker, r]));
    const newHold = state.holdings.filter((h) => h.ticker !== "CASH").map((h) => {
      const r = byT.get(h.ticker);
      return { ...h, importedValue:isNum(h.importedValue)?Math.round(v.get(h.ticker)*100)/100:undefined, shares: r?.price ? +(v.get(h.ticker) / r.price).toFixed(6) : h.shares };
    }).filter((h) => h.shares > 1e-6);
    const cashValue=mentorPayload&&!mentorPayload.sample?Math.round((T-newHold.reduce((sum,h)=>sum+(isNum(h.importedValue)?h.importedValue:(DATA.assets[h.ticker]?.price||0)*h.shares),0))*100)/100:Math.round((proceeds+cashNow)*100)/100;
    if(cashValue>0)newHold.push({ticker:'CASH',shares:cashValue,cost:1,importedValue:cashValue});
    const after = trades.length ? analyze(newHold, S) : base;
    return { base, after, trades, proceeds, newHold };
  }

  function opportunities(base, S = state.settings) {
    const fixable = new Set(["position", "sector", "crypto", "excluded", "top5"]);
    const seen = new Set(), out = [];
    const contrib = (key, n = 3) => [...base.inv].filter((r) => isNum(r[key])).sort((x, y) => y[key] * y.weight - x[key] * x.weight).slice(0, n);
    base.alerts.forEach((a) => {
      if (a.sev === "info" && !["corr", "fromHigh", "pe"].includes(a.type)) return;
      const id = a.type + ":" + a.key; if (seen.has(id)) return; seen.add(id);
      let gain = a.sev === "high" ? 10 : a.sev === "med" ? 5 : 1, action = "";
      if (fixable.has(a.type)) {
        const sim = rebalance(S, { type: a.type, key: a.key });
        gain = sim.after.score - base.score;
        action = sim.trades.length ? `${sim.trades.slice(0, 3).map((t) => `${t.exit ? "Exit" : "Trim"} ${t.ticker} by ${fmtUSD(t.sell)}`).join(" · ")}${sim.trades.length > 3 ? ` · +${sim.trades.length - 3} more` : ""}. Frees ${fmtUSD(sim.proceeds)} to redeploy.` : "Already within limits after rounding.";
      } else if (a.type === "beta") action = `Largest beta contributors: ${contrib("beta").map((r) => `${r.ticker} (β ${r.beta.toFixed(2)}, ${fmtPct(r.weight, 0)})`).join(", ")}. Shifting weight toward lower-beta holdings or cash reduces market sensitivity.`;
      else if (a.type === "vol" || a.type === "dd") action = `Biggest volatility contributors: ${contrib("vol").map((r) => `${r.ticker} (${fmtPct(r.vol, 0)} vol, ${fmtPct(r.weight, 0)})`).join(", ")}.`;
      else if (a.type === "minHoldings") action = `Add ${S.minHoldings - base.inv.length} more positions to reach your floor, ideally in sectors you don't hold yet.`;
      else if (a.type === "corr") action = "Size these as one combined bet; their joint weight counts against your concentration budget.";
      else if (a.type === "stoploss") action = "Revisit the original thesis. An unrealized loss can also be a tax-loss harvesting candidate.";
      else if (a.type === "fromHigh") action = "Check whether the decline is consistent with your thesis or a broken trend.";
      else if (a.type === "earnings") action = "Decide position size before the print; event risk is concentrated in this name.";
      else if (a.type === "pe") action = "Valuation is above your ceiling; confirm expected growth justifies the multiple.";
      else if (a.type === "custom") action = a.detail;
      else return;
      out.push({ ...a, gain, action });
    });
    return out.sort((x, y) => y.gain - x.gain || ({ high: 0, med: 1, info: 2 }[x.sev] - { high: 0, med: 1, info: 2 }[y.sev]));
  }

  // ---------- Render: shared ----------
  const icon = {
    high: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>',
    med: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    pass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m22 4-10 10-3-3"/></svg>',
  };
  const sevLabel = { high: "breach", med: "warning", info: "note" };
  const alertHTML = (a) => `<li class="alert ${a.sev}">${icon[a.sev]}<div><b>${esc(a.title)}<span class="sev ${a.sev}">${sevLabel[a.sev]}</span></b><p>${esc(a.detail)}</p></div></li>`;
  const passHTML = (t) => `<li class="alert pass">${icon.pass}<div><b>${esc(t)}</b></div></li>`;
  const avatar = (t, sector) => `<span class="av" style="background:${SECTOR_COLORS[sector] || "#475569"}">${esc(t.slice(0, 4))}</span>`;
  const dateBox = (iso) => { const d = new Date(iso + "T12:00:00Z"); return `<div class="date"><small>${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</small><b>${d.getUTCDate()}</b></div>`; };

  function eventHTML(e) {
    const soon = e.days <= state.settings.earningsWindow;
    if (e.kind === "earnings") {
      const time = e.time === "bmo" ? "Before open" : e.time === "amc" ? "After close" : "Time TBA";
      return `<li class="event">${dateBox(e.date)}<div><div class="t">${esc(e.ticker)} earnings</div><div class="s">${time}${isNum(e.epsEstimate) ? ` · EPS est. ${fmtUSD(e.epsEstimate, 2)}` : ""} · ${fmtPct(e.weight)} of portfolio</div></div><span class="pill ${soon ? "soon" : ""}">${e.days === 0 ? "today" : `in ${e.days}d`}</span></li>`;
    }
    return `<li class="event">${dateBox(e.date)}<div><div class="t">${esc(e.title || e.name || e.event || "Economic release")}</div><div class="s">${esc(e.description || e.detail || "Macro event")}</div></div><span class="pill macro">in ${e.days}d</span></li>`;
  }

  function allNews() {
    const items = [];
    A.rows.forEach((r) => (r.a?.news || []).forEach((n) => items.push({ ...n, tickers: [r.ticker] })));
    const held = new Set(A.rows.map((r) => r.ticker));
    DATA.marketNews.forEach((n) => items.push({ ...n, tickers: (n.tickers || []).filter((t) => held.has(t)), market: true }));
    if (A.crypto > 0) DATA.cryptoNews.forEach((n) => items.push({ ...n, tickers: ["Crypto"] }));
    const seen = new Set();
    return items.filter((n) => n.title && !seen.has(n.title) && seen.add(n.title)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
  const newsHTML = (n) => `<li><a href="${esc(n.url || "#")}" target="_blank" rel="noopener noreferrer"><span class="h">${esc(n.title)}</span><span class="m">${(n.tickers || []).map((t) => `<span class="tk">${esc(t)}</span>`).join("")}${n.market && !(n.tickers || []).length ? '<span class="tk">Market</span>' : ""}<span>${esc(n.source || "")}</span><span>${esc(String(n.date || "").slice(0, 10))}</span>${n.sentiment ? `<span class="sent ${esc(n.sentiment)}">${esc(n.sentiment)}</span>` : ""}</span></a></li>`;

  // ---------- Charts ----------
  function chartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color = "#8a8781";
    Chart.defaults.font.family = 'Inter, Arial, sans-serif';
    Chart.defaults.font.size = 10;
    Chart.defaults.borderColor = "#efeeeb";
    Chart.defaults.plugins.tooltip.backgroundColor = "#dfe8e0";
    Chart.defaults.plugins.tooltip.borderColor = "#b3c3b4";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: 'Inter, Arial, sans-serif', weight: "600" };
    Chart.defaults.plugins.tooltip.bodyFont = { family: 'Inter, Arial, sans-serif' };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) Chart.defaults.animation = false;
  }
  function draw(id, cfg) {
    if (!window.Chart) return;
    charts[id]?.destroy();
    const el = document.getElementById(id);
    if (el) charts[id] = new Chart(el, cfg);
  }
  const monthTick = (dates) => (v, i) => { const d = dates[i]; if (!d) return ""; const prev = dates[i - 1]; return !prev || prev.slice(5, 7) !== d.slice(5, 7) ? new Date(d + "T12:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }) : ""; };

  function limitLine(value, label) {
    return {
      id: "limit-" + label,
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart; const x = scales.x.getPixelForValue(value);
        ctx.save(); ctx.strokeStyle = "#f87171"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = "#f87171"; ctx.font = '600 11px "Fira Code", monospace';
        ctx.fillText(`limit ${value}%`, Math.min(x + 6, chartArea.right - 60), chartArea.bottom - 6); ctx.restore();
      },
    };
  }

  function drawOverviewCharts() {
    const n = Math.min(state.range + 1, A.dates.length);
    const dates = A.dates.slice(-n), p = A.port.slice(-n), s = A.spySeries.slice(-n);
    const pi = p.map((v) => (v / p[0]) * 100), si = s.map((v) => (v / s[0]) * 100);
    draw("perfChart", {
      type: "line",
      data: { labels: dates, datasets: [
        { label: "Your portfolio", data: pi, borderColor: "#155c49", backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "rgba(21,92,73,.18)"); g.addColorStop(1, "rgba(21,92,73,0)"); return g; }, fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
        { label: "S&P 500 (SPY)", data: si, borderColor: "#64748b", borderDash: [5, 4], tension: 0.3, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4 },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y.toFixed(1)} (${fmtPct(c.parsed.y - 100, 1, true)})`, afterBody: (items) => items[0].datasetIndex === 0 || items.length ? [`Value: ${fmtUSD(p[items[0].dataIndex])}`] : [] } } },
        scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: monthTick(dates) } }, y: { ticks: { callback: (v) => v.toFixed(0) } } },
      },
    });

    const sl = A.sectorList;
    draw("sectorChart", {
      type: "doughnut",
      data: { labels: sl.map((x) => x[0]), datasets: [{ data: sl.map((x) => +x[1].toFixed(2)), backgroundColor: sl.map((x) => SECTOR_COLORS[x[0]] || "#475569"), borderColor: "#fffefa", borderWidth: 3, hoverOffset: 6 }] },
      options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed.toFixed(1)}%` } } } },
    });
  }

  function drawRiskCharts() {
    const S = state.settings;
    const pos = [...A.inv].sort((a, b) => b.weight - a.weight);
    const bar = (labels, values, limit, colorFn) => ({
      type: "bar",
      data: { labels, datasets: [{ data: values, backgroundColor: values.map(colorFn), borderRadius: 4, barThickness: 14 }] },
      options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.x.toFixed(1)}% (limit ${limit}%)` } } },
        scales: { x: { suggestedMax: Math.max(limit * 1.25, ...values) , ticks: { callback: (v) => v + "%" } }, y: { grid: { display: false }, ticks: { font: { family: 'Inter, Arial, sans-serif', size: 11 } } } } },
      plugins: [limitLine(limit, labels.length)],
    });
    draw("weightChart", bar(pos.map((r) => r.ticker), pos.map((r) => +r.weight.toFixed(2)), S.maxPosition, (v, i) => (v > posLimit(S, pos[i].ticker) ? "#f87171" : "#60a5fa")));
    const sl = A.sectorList.filter(([s]) => !NON_SECTOR.includes(s));
    draw("sectorBarChart", bar(sl.map((x) => x[0].replace("Information Technology", "Info Tech").replace("Communication Services", "Comm Services").replace("Consumer Discretionary", "Cons Discretionary")), sl.map((x) => +x[1].toFixed(2)), S.maxSector, (v, i) => (v > secLimit(S, sl[i][0]) ? "#f87171" : "#a78bfa")));

    draw("ddChart", {
      type: "line",
      data: { labels: A.dates, datasets: [{ label: "Drawdown", data: A.dd.map((v) => +v.toFixed(2)), borderColor: "#f87171", backgroundColor: "rgba(248,113,113,.15)", fill: true, tension: 0.25, borderWidth: 1.5, pointRadius: 0 }] },
      options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y.toFixed(1)}% from peak` } } },
        scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0, callback: monthTick(A.dates) } }, y: { max: 0, ticks: { callback: (v) => v + "%" } } } },
    });

    const pts = A.inv.filter((r) => isNum(r.vol) && isNum(r.ret1y));
    draw("scatterChart", {
      type: "bubble",
      data: { datasets: [{ data: pts.map((r) => ({ x: +r.vol.toFixed(1), y: +r.ret1y.toFixed(1), r: Math.max(4, Math.sqrt(r.weight) * 3.2), t: r.ticker, w: r.weight })), backgroundColor: pts.map((r) => (SECTOR_COLORS[r.sector] || "#475569") + "b3"), borderColor: pts.map((r) => SECTOR_COLORS[r.sector] || "#475569") }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.raw.t}: vol ${c.raw.x}%, 1Y ${fmtPct(c.raw.y, 1, true)}, weight ${c.raw.w.toFixed(1)}%` } } },
        scales: { x: { title: { display: true, text: "Annualized volatility %" } }, y: { title: { display: true, text: "1Y return %" } } } },
      plugins: [{ id: "lbl", afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '500 10px "Fira Code", monospace'; ctx.fillStyle = "#385348"; ch.getDatasetMeta(0).data.forEach((el, i) => ctx.fillText(pts[i].ticker, el.x + el.options.radius + 3, el.y + 3)); ctx.restore(); } }],
    });
  }

  // ---------- Views ----------
  function renderOverview() {
    const plTot = isNum(A.costTotal)?A.total-A.costTotal:null;
    const k = [
      ["Portfolio value", fmtUSD(A.total), mentorPayload?`<span class="muted">Fictional demo portfolio</span>`:`<span class="${cls(A.dayChg)}">${A.dayChg >= 0 ? "+" : ""}${fmtUSD(A.dayChg)} today</span>`],
      ["Unrealized P/L", `<span class="${cls(plTot)}">${isNum(plTot) && plTot >= 0 ? "+" : ""}${fmtUSD(plTot)}</span>`, `<span class="${cls(plTot)}">${fmtPct(isNum(plTot) ? (plTot / A.costTotal) * 100 : null, 1, true)} on cost</span>`],
      [mentorPayload?"Historical mix return":"1Y return", `<span class="${cls(A.ret1y)}">${fmtPct(A.ret1y, 1, true)}</span>`, `<span class="muted">S&amp;P ${fmtPct(A.spyRet, 1, true)}</span>`],
      ["Risk health", `${A.score}<small class="mentor-score-outof">/100</small>`, `<span class="muted">${mentorPayload?.sample?"Example":mentorDraft?"Draft":"Saved"} guideline review</span>`],
    ];
    $("#kpis").innerHTML = k.map(([a, b, c]) => `<div class="kpi"><div class="k">${a}</div><div class="v">${b}</div><div class="d">${c}</div></div>`).join("");

    const sc = A.score, color = sc >= 80 ? "var(--up)" : sc >= 55 ? "var(--warn)" : "var(--down)";
    const highs = A.alerts.filter((a) => a.sev === "high").length, meds = A.alerts.filter((a) => a.sev === "med").length;
    const verdict = mentorPayload&&!mentorPayload.sample&&mentorDraft?"Draft review":mentorPayload&&!mentorPayload.sample&&A.alerts.some(a=>a.type==='coverage')?"Coverage incomplete":sc >= 80 ? "Within your guidelines" : sc >= 55 ? "Needs attention" : "Off-policy";
    $("#score").innerHTML = `<div class="ring" style="--p:${sc};--c:${color}"><b>${sc}</b></div><div><strong>${verdict}</strong><p>${highs} breach${highs === 1 ? "" : "es"} · ${meds} warning${meds === 1 ? "" : "s"} against ${mentorPayload&&!mentorPayload.sample&&mentorDraft?'draft/example guidelines (not saved)':mentorPayload?.sample?'example guidelines':'your saved guidelines'}.</p></div>`;
    const top = A.alerts.filter((a) => a.sev !== "info").slice(0, 5);
    $("#alertsMini").innerHTML = top.length ? top.map(alertHTML).join("") : passHTML("No breaches against your guidelines");

    $("#sectorLegend").innerHTML = A.sectorList.map(([s, w]) => `<li class="${w > secLimit(state.settings, s) && !NON_SECTOR.includes(s) ? "over" : ""}"><i style="background:${SECTOR_COLORS[s] || "#475569"}"></i><span>${esc(s)}</span><span>${fmtPct(w)}</span></li>`).join("");
    const ev = A.events.filter((e) => e.days <= 30).slice(0, 6);
    $("#eventsMini").innerHTML = ev.length ? ev.map(eventHTML).join("") : `<li class="empty">No scheduled catalysts for your holdings in the next 30 days.</li>`;
    const nw = allNews().slice(0, 5);
    $("#newsMini").innerHTML = nw.length ? nw.map(newsHTML).join("") : `<li class="empty">No recent headlines in the snapshot.</li>`;
    $("#overviewHoldings tbody").innerHTML=A.rows.slice().sort((a,b)=>b.value-a.value).slice(0,6).map(r=>`<tr><td><span class="monarch-asset-icon">${esc(r.ticker.slice(0,1))}</span><span><strong>${esc(r.ticker)}</strong><small>${esc(r.name||r.sector)}</small></span></td><td class="num">${fmtUSD(r.value,2)}</td><td class="num">${fmtPct(r.weight)}</td></tr>`).join('');
    $("#overviewExposure").innerHTML = A.sectorList.slice(0,4).map(([sector,weight])=>`<div><span>${esc(sector)}</span><i><b style="width:${Math.max(0,Math.min(100,weight))}%"></b></i><strong>${fmtPct(weight)}</strong></div>`).join("");
    $("#overviewMetrics").innerHTML = [["Beta",isNum(A.beta)?A.beta.toFixed(2):"—"],["Volatility",fmtPct(A.vol)],["Sharpe",isNum(A.sharpe)?A.sharpe.toFixed(2):"—"],["Max drawdown",fmtPct(A.maxDD)]].map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
    drawOverviewCharts();
  }

  function renderRisk() {
    $("#alertsFull").innerHTML = A.alerts.map(alertHTML).join("") + A.passes.map(passHTML).join("");
    $("#ruleSummary").textContent = `${A.alerts.filter((a) => a.sev !== "info").length} flagged · ${A.passes.length} passing`;
    const m = [
      ["Annualized volatility", fmtPct(A.vol)], ["Realized beta (1Y weekly)", isNum(A.beta) ? A.beta.toFixed(2) : "—"],
      ["1Y return", fmtPct(A.ret1y, 1, true)], ["S&P 500 1Y", fmtPct(A.spyRet, 1, true)],
      ["Max drawdown", fmtPct(A.maxDD)], [`Sharpe (rf ${fmtPct(A.rf, 2)})`, isNum(A.sharpe) ? A.sharpe.toFixed(2) : "—"],
      ["Tracking error", fmtPct(A.te)], ["Herfindahl index", A.hhi.toFixed(3)],
      ["Effective # of holdings", A.effN.toFixed(1)], ["Top-5 weight", fmtPct(A.top5)],
      ["Weighted P/E", isNum(A.wPE) ? A.wPE.toFixed(1) + "x" : "—"], ["Dividend yield", fmtPct(A.divYield, 2)],
      ["Crypto weight", fmtPct(A.crypto)], ["Largest sector", A.sectorList[0] ? `${A.sectorList[0][0].replace("Information Technology", "Info Tech")} ${fmtPct(A.sectorList[0][1], 0)}` : "—"],
    ];
    $("#metrics").innerHTML = m.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("");
    drawRiskCharts();
  }

  function renderHoldings() {
    const S = state.settings, f = state.filter.toLowerCase();
    const { key, dir } = state.sort;
    const rows = A.rows.filter((r) => !f || r.ticker.toLowerCase().includes(f) || r.sector.toLowerCase().includes(f) || r.name.toLowerCase().includes(f))
      .sort((a, b) => { const x = a[key], y = b[key]; if (typeof x === "string") return dir * x.localeCompare(y); return dir * ((isNum(x) ? x : -1e15) - (isNum(y) ? y : -1e15)); });
    const maxW = Math.max(...A.rows.map((r) => r.weight), S.maxPosition);
    $("#holdTable tbody").innerHTML = rows.map((r) => {
      const an = r.a?.analyst; const tot = an ? an.buy + an.hold + an.sell : 0;
      const up = an && isNum(an.target) && r.price ? (an.target / r.price - 1) * 100 : null;
      return `<tr>
        <td><div class="asset">${avatar(r.ticker, r.sector)}<div><b>${esc(r.ticker)}</b><small>${esc(r.name)}</small></div></div></td>
        <td>${esc(r.sector)}${r.known ? "" : ' <span class="flag">· no data</span>'}${(S.excluded || []).includes(r.sector) ? ' <span class="flag">· excluded</span>' : ""}</td>
        <td class="num">${fmtNum(r.shares, 4)}</td>
        <td class="num" title="${esc(r.a?._quoteSource||'snapshot')} ${esc(r.a?._quoteAsOf||DATA.asOf)}">${fmtUSD(r.price, 2)}</td>
        <td class="num ${cls(r.chg)}">${fmtPct(r.chg, 2, true)}</td>
        <td class="num">${fmtUSD(r.value)}</td>
        <td class="num"><span class="wbar ${!r.isCash && r.weight > posLimit(S, r.ticker) ? "over" : ""}"><i style="width:${(r.weight / maxW) * 60}px"></i>${fmtPct(r.weight)}</span></td>
        <td class="num ${cls(r.pl)}">${isNum(r.pl) ? `${r.pl >= 0 ? "+" : ""}${fmtUSD(r.pl)} <small>(${fmtPct(r.plPct, 0, true)})</small>` : "—"}</td>
        <td class="num ${cls(r.ret1y)}">${fmtPct(r.ret1y, 1, true)}</td>
        <td class="num">${isNum(r.beta) ? r.beta.toFixed(2) : "—"}</td>
        <td class="num ${isNum(r.pe) && r.pe > S.maxPE ? "down" : ""}">${isNum(r.pe) ? r.pe.toFixed(1) : "—"}</td>
        <td>${an && tot ? `<div title="${an.buy} buy · ${an.hold} hold · ${an.sell} sell · target ${fmtUSD(an.target, 2)}"><div class="an"><i style="width:${(an.buy / tot) * 100}%"></i><i style="width:${(an.hold / tot) * 100}%"></i><i style="width:${(an.sell / tot) * 100}%"></i></div><small class="muted">${Math.round((an.buy / tot) * 100)}% buy${isNum(up) ? ` · tgt ${fmtPct(up, 0, true)}` : ""}</small></div>` : '<span class="muted">—</span>'}</td>
        <td><button class="icon-btn rm" data-rm="${esc(r.ticker)}" aria-label="Remove ${esc(r.ticker)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg></button></td>
      </tr>`;
    }).join("");
    $$("#holdTable th[data-sort]").forEach((th) => { if (th.dataset.sort === key) th.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending"); else th.removeAttribute("aria-sort"); });
  }

  function renderCalendar() {
    $("#eventsFull").innerHTML = A.events.length ? A.events.map(eventHTML).join("") : `<li class="empty">No upcoming earnings or macro events found for your holdings in the data snapshot.</li>`;
    $("#calNote").textContent = `alerts within ${state.settings.earningsWindow} days`;
    const M = DATA.macro || {}, notes = M.asOfNotes || {};
    const row = (label, k, unit = "%") => [label, isNum(M[k]) ? `${M[k].toFixed(2)}${unit}` : "—", notes[k]];
    const items = [row("Fed funds rate", "fedFunds"), row("10Y Treasury", "tenYear"), row("2Y Treasury", "twoYear"), row("CPI inflation (YoY)", "cpiYoY"), row("Unemployment", "unemployment")];
    if (isNum(M.tenYear) && isNum(M.twoYear)) items.push(["2s10s curve", `${((M.tenYear - M.twoYear) * 100).toFixed(0)} bps`]);
    $("#macroList").innerHTML = items.map(([a, b, n]) => `<div><dt>${a}${n ? `<br><small class="hint">${esc(n)}</small>` : ""}</dt><dd>${b}</dd></div>`).join("");
  }

  function renderNews() {
    const items = allNews();
    const tags = ["All", ...new Set(items.flatMap((n) => (n.tickers?.length ? n.tickers : ["Market"])))];
    if (!tags.includes(state.newsFilter)) state.newsFilter = "All";
    $("#newsChips").innerHTML = tags.map((t) => `<button type="button" class="chip" aria-pressed="${t === state.newsFilter}" data-news="${esc(t)}">${esc(t)}</button>`).join("");
    const f = state.newsFilter;
    const shown = items.filter((n) => f === "All" || (n.tickers?.length ? n.tickers.includes(f) : f === "Market"));
    $("#newsFull").innerHTML = shown.length ? shown.map(newsHTML).join("") : `<li class="empty">No headlines for this filter in the snapshot.</li>`;
  }

  // ----- Guidelines (settings) -----
  const GROUPS = [
    ["Concentration", ["maxPosition", "maxSector", "maxTop5", "maxCrypto", "minHoldings", "maxCorr"]],
    ["Market risk", ["maxBeta", "maxVol", "maxDrawdown"]],
    ["Holding-level", ["maxPE", "maxLossFromCost", "maxFromHigh", "earningsWindow"]],
  ];
  const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
  const fmtSetting = (f, v) => (["maxBeta", "maxCorr"].includes(f.key) ? Number(v).toFixed(2) : `${v}${f.unit === "d" ? " days" : f.unit}`);

  function renderSettings() {
    const S = state.settings;
    $("#settingsGrid").innerHTML = GROUPS.map(([g, keys]) => `<fieldset><legend>${g}</legend><div class="settings-grid">${keys.map((k) => {
      const f = FIELDS.find((x) => x.key === k);
      return `<div class="field"><div class="field-top"><label for="n-${k}">${f.label}</label><span class="numwrap"><input type="number" inputmode="decimal" id="n-${k}" data-key="${k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${S[k]}" /><span class="unit">${f.unit === "d" ? "days" : f.unit}</span></span></div><input type="range" id="f-${k}" data-key="${k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${S[k]}" aria-label="${f.label} slider" /><p class="hint">${f.hint}</p></div>`;
    }).join("")}</div></fieldset>`).join("");
    $("#excludeChips").innerHTML = SECTORS.filter((s) => !["Unknown", "Cash"].includes(s)).map((s) => `<button type="button" class="chip ex" data-ex="${esc(s)}" aria-pressed="${(S.excluded || []).includes(s)}">${esc(s)}</button>`).join("");
    markPreset();
    renderOverrides();
    populateMetrics();
    renderRuleList();
  }
  function markPreset() {
    const match = Object.entries(PRESETS).find(([, p]) => Object.keys(p).every((k) => p[k] === state.settings[k]));
    $$("#presetSeg button").forEach((b) => b.classList.toggle("on", match?.[0] === b.dataset.preset));
  }
  function renderOverrides() {
    const S = state.settings;
    const tick = [...new Set(state.holdings.map((h) => h.ticker).filter((t) => t !== "CASH"))].sort();
    $("#ovTicker").innerHTML = tick.map((t) => `<option>${esc(t)}</option>`).join("");
    $("#ovSector").innerHTML = SECTORS.filter((s) => !NON_SECTOR.includes(s)).map((s) => `<option>${esc(s)}</option>`).join("");
    const li = (kind, k, v, def) => `<li><span><b>${esc(k)}</b> limit <span class="mono">${v}%</span> <span class="muted">· default ${def}%</span></span><button type="button" class="icon-btn rm" data-ovrm="${kind}" data-k="${esc(k)}" aria-label="Remove override for ${esc(k)}">${TRASH}</button></li>`;
    $("#ovTickerList").innerHTML = Object.entries(S.tickerLimits || {}).map(([k, v]) => li("ticker", k, v, S.maxPosition)).join("") || '<li class="empty">No position overrides. Every holding uses the default limit.</li>';
    $("#ovSectorList").innerHTML = Object.entries(S.sectorLimits || {}).map(([k, v]) => li("sector", k, v, S.maxSector)).join("") || '<li class="empty">No sector overrides. Every sector uses the default cap.</li>';
  }
  function populateMetrics() {
    const M = $("#ruleScope").value === "portfolio" ? PORT_METRICS : HOLD_METRICS;
    $("#ruleMetric").innerHTML = Object.entries(M).map(([k, m]) => `<option value="${k}">${m[0]}${m[1] ? ` (${m[1]})` : ""}</option>`).join("");
  }
  function renderRuleList() {
    $("#ruleList").innerHTML = (state.settings.customRules || []).map((r) => `<li><span>${esc(ruleText(r))} <span class="sev ${r.sev}">${sevLabel[r.sev]}</span></span><button type="button" class="icon-btn rm" data-rulerm="${esc(r.id)}" aria-label="Delete rule">${TRASH}</button></li>`).join("") || '<li class="empty">No custom rules yet.</li>';
  }

  // ----- Areas of improvement -----
  let LAST_PLAN = null;
  function renderImprove() {
    const S = state.settings;
    const plan = (LAST_PLAN = rebalance(S));
    const b = plan.base, a = plan.after;
    const bigPos = (x) => { const r = [...x.inv].sort((p, q) => q.weight - p.weight)[0]; return r ? `${r.ticker} ${fmtPct(r.weight, 0)}` : "—"; };
    const bigSec = (x) => { const s = x.sectorList.find(([k]) => !["Cash", "Unknown"].includes(k)); return s ? fmtPct(s[1], 0) : "—"; };
    const cmp = (label, from, to, note) => `<div class="kpi"><div class="k">${label}</div><div class="v cmp">${from}<span class="arrow" aria-label="to">→</span><span class="to">${to}</span></div><div class="d muted">${note}</div></div>`;
    const dScore = a.score - b.score;
    $("#impKpis").innerHTML = [
      cmp("Health score", b.score, a.score, plan.trades.length ? `<span class="up">+${dScore} pts</span> if the plan is applied` : "No trades needed"),
      cmp("Largest position", bigPos(b), bigPos(a), `limit ${S.maxPosition}%`),
      cmp("Largest sector", bigSec(b), bigSec(a), `cap ${S.maxSector}%`),
      cmp("Beta", isNum(b.beta) ? b.beta.toFixed(2) : "—", isNum(a.beta) ? a.beta.toFixed(2) : "—", `ceiling ${S.maxBeta.toFixed(2)}`),
      cmp("Volatility", fmtPct(b.vol, 0), fmtPct(a.vol, 0), `tolerance ${S.maxVol}%`),
    ].join("");

    const opps = opportunities(b, S);
    $("#opps").innerHTML = opps.length ? opps.map((o) => `<li class="opp ${o.sev}"><div class="opp-gain"><b>${o.gain > 0 ? "+" + o.gain : "·"}</b><small>${o.gain > 0 ? "pts" : ""}</small></div><div><b>${esc(o.title)}<span class="sev ${o.sev}">${sevLabel[o.sev]}</span></b><p>${esc(o.action)}</p></div></li>`).join("") : '<li class="empty">Your portfolio meets every guideline you have set. Tighten a parameter or add a custom rule to stress-test it.</li>';

    // Coverage gaps
    const heldSec = new Set(b.inv.map((r) => r.sector));
    const missing = SECTORS.filter((s) => !NON_SECTOR.includes(s) && !heldSec.has(s) && !(S.excluded || []).includes(s));
    $("#gaps").innerHTML = `<p class="muted">${b.sectorsCount} of 11 GICS sectors held.${missing.length ? " No exposure to:" : ""}</p>${missing.length ? `<div class="chips">${missing.map((s) => `<span class="chip static"><i style="background:${SECTOR_COLORS[s]}"></i>${esc(s)}</span>`).join("")}</div><p class="hint">Sectors you don't hold are where redeployed proceeds would add the most diversification within your caps.</p>` : ""}`;
    $("#pairs").innerHTML = b.pairs.slice(0, 6).map((p) => `<li><span><b>${esc(p.a)}</b> + <b>${esc(p.b)}</b></span><span class="mono muted">ρ ${p.c.toFixed(2)} · ${fmtPct(p.w)}</span></li>`).join("") || `<li class="empty">No pairs above your ρ ${S.maxCorr.toFixed(2)} threshold.</li>`;
    const losers = b.inv.filter((r) => isNum(r.pl) && r.pl < 0).sort((x, y) => x.pl - y.pl);
    const noCost = b.inv.filter((r) => !isNum(r.cost)).map((r) => r.ticker);
    const realized = plan.trades.reduce((s, t) => s + (t.gain || 0), 0);
    $("#tax").innerHTML = [
      plan.trades.length ? `<li><span>Plan realizes an estimated</span><span class="mono ${realized >= 0 ? "up" : "down"}">${realized >= 0 ? "+" : ""}${fmtUSD(realized)}</span></li>` : "",
      ...losers.map((r) => `<li><span><b>${esc(r.ticker)}</b> unrealized loss <span class="muted">(harvesting candidate)</span></span><span class="mono down">${fmtUSD(r.pl)}</span></li>`),
      noCost.length ? `<li><span class="muted">No cost basis for ${esc(noCost.join(", "))}; gains can't be estimated.</span></li>` : "",
    ].join("") || '<li class="empty">No tax notes.</li>';

    // Plan table
    $("#planNote").textContent = plan.trades.length
      ? `Trims ${plan.trades.length} position${plan.trades.length === 1 ? "" : "s"} (pro-rata within over-limit groups) until position, sector, crypto, top-5 and exclusion limits all hold. ${fmtUSD(plan.proceeds)} of proceeds is parked as cash in the what-if.`
      : "No trades needed: position, sector, crypto, top-5 and exclusion limits are all satisfied.";
    $("#planTable tbody").innerHTML = plan.trades.map((t) => `<tr><td><div class="asset">${avatar(t.ticker, t.sector)}<div><b>${esc(t.ticker)}</b><small>${t.exit ? "exit position" : "trim"}</small></div></div></td><td class="num">${fmtPct(t.from)}</td><td class="num">${fmtPct(t.to)}</td><td class="num down">−${fmtUSD(t.sell)}</td><td class="num">${fmtNum(t.shares, t.shares < 1 ? 4 : 1)}</td><td class="num ${cls(t.gain)}">${isNum(t.gain) ? `${t.gain >= 0 ? "+" : ""}${fmtUSD(t.gain)}` : "—"}</td></tr>`).join("")
      + (plan.trades.length ? `<tr class="total"><td><div class="asset">${avatar("CASH", "Cash")}<div><b>CASH</b><small>proceeds to redeploy</small></div></div></td><td class="num">${fmtPct(b.sectors.Cash || 0)}</td><td class="num">${fmtPct(a.sectors.Cash || 0)}</td><td class="num up">+${fmtUSD(plan.proceeds)}</td><td></td><td></td></tr>` : "");
    $("#applyWhatIf").disabled = !plan.trades.length;
    $("#revertWhatIf").hidden = !store.get("sentinel.original", null);
  }

  function bindExtra() {
    // Exact numeric entry (commit on change so typing isn't clamped mid-keystroke)
    $("#settingsGrid").addEventListener("change", (e) => {
      if (e.target.type !== "number") return;
      const k = e.target.dataset.key, f = FIELDS.find((x) => x.key === k);
      let v = parseFloat(e.target.value);
      if (!isNum(v)) { e.target.value = state.settings[k]; return; }
      v = Math.min(f.max, Math.max(f.min, v));
      e.target.value = v; $("#f-" + k).value = v;
      state.settings[k] = v; saveSettings();
    });
    const addOverride = (kind) => {
      const sel = $(kind === "ticker" ? "#ovTicker" : "#ovSector"), inp = $(kind === "ticker" ? "#ovTickerVal" : "#ovSectorVal");
      const v = parseFloat(inp.value), key = kind === "ticker" ? "tickerLimits" : "sectorLimits";
      if (!sel.value || !(v > 0 && v <= 100)) { toast("Enter a limit between 0 and 100%"); inp.focus(); return; }
      state.settings[key] = { ...(state.settings[key] || {}), [sel.value]: v };
      inp.value = ""; saveSettings(); renderOverrides(); toast(`${sel.value} limit set to ${v}%`);
    };
    $("#ovTickerAdd").addEventListener("click", () => addOverride("ticker"));
    $("#ovSectorAdd").addEventListener("click", () => addOverride("sector"));
    $("#ruleScope").addEventListener("change", populateMetrics);
    $("#ruleAdd").addEventListener("click", () => {
      const v = parseFloat($("#ruleVal").value);
      if (!isNum(v)) { $("#ruleErr").textContent = "Enter a numeric threshold."; $("#ruleVal").focus(); return; }
      $("#ruleErr").textContent = "";
      const rule = { id: "r" + Date.now().toString(36), scope: $("#ruleScope").value, metric: $("#ruleMetric").value, op: $("#ruleOp").value, value: v, sev: $("#ruleSev").value };
      state.settings.customRules = [...(state.settings.customRules || []), rule];
      $("#ruleVal").value = ""; saveSettings(); renderRuleList(); toast("Rule added and checked");
    });
    document.addEventListener("click", (e) => {
      const o = e.target.closest("[data-ovrm]");
      if (o) { const key = o.dataset.ovrm === "ticker" ? "tickerLimits" : "sectorLimits"; const m = { ...state.settings[key] }; delete m[o.dataset.k]; state.settings[key] = m; saveSettings(); renderOverrides(); }
      const r = e.target.closest("[data-rulerm]");
      if (r) { state.settings.customRules = (state.settings.customRules || []).filter((x) => x.id !== r.dataset.rulerm); saveSettings(); renderRuleList(); }
    });
    // Share guidelines as JSON
    $("#exportGuides").addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(state.settings, null, 2)], { type: "application/json" }));
      Object.assign(document.createElement("a"), { href: url, download: "risk-guidelines.json" }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000); toast("Guidelines exported");
    });
    $("#importGuides").addEventListener("click", () => $("#importFile").click());
    $("#importFile").addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(String(rd.result)), next = { ...state.settings };
          Object.keys(PRESETS.moderate).forEach((k) => { if (isNum(j[k])) next[k] = j[k]; });
          if (Array.isArray(j.excluded)) next.excluded = j.excluded.filter((s) => SECTORS.includes(s));
          ["tickerLimits", "sectorLimits"].forEach((k) => { if (j[k] && typeof j[k] === "object") next[k] = Object.fromEntries(Object.entries(j[k]).filter(([, v]) => isNum(v))); });
          if (Array.isArray(j.customRules)) next.customRules = j.customRules.filter((r) => r && ["portfolio", "holding"].includes(r.scope) && isNum(r.value) && ["<=", ">="].includes(r.op) && ["high", "med", "info"].includes(r.sev));
          state.settings = next; saveSettings(); renderSettings(); toast("Guidelines imported");
        } catch { toast("That file isn't a valid guidelines JSON."); }
        e.target.value = "";
      };
      rd.readAsText(file);
    });
    // What-if
    $("#applyWhatIf").addEventListener("click", () => {
      if (!LAST_PLAN?.trades.length) return;
      if (!store.get("sentinel.original", null)) store.set("sentinel.original", { holdings: state.holdings, label: state.label });
      saveHoldings(LAST_PLAN.newHold, "What-if: rebalanced");
      toast("What-if applied. Revert anytime from Improve.");
      setView("overview");
    });
    $("#revertWhatIf").addEventListener("click", () => {
      const o = store.get("sentinel.original", null); if (!o) return;
      store.set("sentinel.original", null); saveHoldings(o.holdings, o.label); toast("Reverted to original holdings");
    });
    // Linking a new portfolio discards any what-if baseline
    ["#applyLink", "#loadDemo"].forEach((s) => $(s).addEventListener("click", () => store.set("sentinel.original", null), true));
  }

  function renderChrome() {
    const n = A.alerts.filter((a) => a.sev === "high" || a.sev === "med").length;
    const b = $("#alertCount"); b.hidden = !n; b.textContent = n;
    $("#portfolioLabel").textContent = `${state.label} · ${A.rows.length} holdings · ${fmtUSD(A.total)}`;
    const names = DATA.sources.length ? DATA.sources : ["Snapshot unavailable"];
    $("#sourceList").innerHTML = names.map((s) => `<li><span class="dot ${DATA.sources.length ? "" : "off"}"></span>${esc(s)}</li>`).join("");
    $("#asOf").textContent = DATA.asOf ? `Snapshot ${new Date(DATA.asOf).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "";
  }

  const RENDER = { overview: renderOverview, risk: renderRisk, improve: renderImprove, holdings: renderHoldings, calendar: renderCalendar, news: renderNews, settings: renderSettings };
  const TITLES = { overview: "Overview", risk: "Risk review", improve: "Areas of improvement", holdings: "Holdings", calendar: "Calendar", news: "News", settings: "Your guidelines" };

  function render() {
    A = analyze();
    renderChrome();
    (RENDER[state.view] || renderOverview)();
    renderDesignDetails();
  }

  function setView(v) {
    if (!RENDER[v]) v = "overview";
    state.view = v;
    $$(".nav button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === v)));
    $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + v));
    $("#viewTitle").textContent = v === "overview" ? "Your portfolio" : TITLES[v];
    if (location.hash !== "#" + v) history.replaceState(null, "", "#" + v);
    render();
    window.scrollTo({ top: 0 });
  }

  // ---------- Persistence ----------
  function saveHoldings(h, label) {
    if(label==='Demo portfolio'&&parent!==window){hydrate({sample:true,workspace:mentorPayload?.workspace});return;}
    if(parent!==window&&!label.startsWith('What-if')&&label!=='Demo portfolio'&&h!==bridgeMemory.get('mentor.baseline')){
      const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"';
      const csv='symbol,quantity,price,average_cost,sector,market_value\n'+h.map(x=>[x.ticker,x.shares,DATA.assets[x.ticker]?.price??(x.ticker==='CASH'?1:null),x.cost,DATA.assets[x.ticker]?.sector??'',isNum(x.importedValue)?x.importedValue:''].map(cell).join(',')).join('\n');
      emit('mentor-portfolio-import',{csv});return;
    }

    state.holdings = h; state.label = label;
    store.set("sentinel.holdings", h); store.set("sentinel.label", label);
    render();
  }
  let saveT;
  function saveSettings() {
    mentorDraft=true;
    store.set("sentinel.settings", state.settings);
    $("#savedMsg").textContent = "Draft updated · review and approve to save";
    clearTimeout(saveT); saveT = setTimeout(() => ($("#savedMsg").textContent = ""), 1800);
    A = analyze(); renderChrome();
    $$("#presetSeg button").forEach((b) => b.classList.remove("on"));
    const match = Object.entries(PRESETS).find(([, p]) => Object.keys(p).every((k) => p[k] === state.settings[k]));
    if (match) $(`#presetSeg [data-preset="${match[0]}"]`).classList.add("on");
  }

  // ---------- Parsing ----------
  function normTicker(t) { return String(t || "").trim().toUpperCase().replace(/^\$/, "").replace(/-USD$/, ""); }
  function parsePaste(text) {
    const out = [], bad = [];
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
      const parts = line.split(/[\s,;\t]+/).filter(Boolean);
      const t = normTicker(parts[0]), q = parseFloat(String(parts[1] || "").replace(/[$,]/g, "")), c = parseFloat(String(parts[2] || "").replace(/[$,]/g, ""));
      if (!/^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) || !(q > 0)) bad.push(i + 1); else out.push({ ticker: t, shares: q, cost: isNum(c) && c > 0 ? c : null });
    });
    return { out: merge(out), bad };
  }
  function parseCSV(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const hi = rows.findIndex((r) => r.some((c) => /symbol|ticker/i.test(c)));
    if (hi < 0) throw new Error("Couldn't find a ticker/symbol column.");
    const h = rows[hi].map((c) => c.trim().toLowerCase());
    const ti = h.findIndex((c) => /^(symbol|ticker)/.test(c));
    const qi = h.findIndex((c) => /(shares|quantity|qty|units)/.test(c));
    let ci = h.findIndex((c) => /(avg|average).*(cost|price)|cost.*(share|unit)|cost_basis|cost basis/.test(c));
    const totalCost = ci >= 0 && /total/.test(h[ci]);
    if (qi < 0) throw new Error("Couldn't find a shares/quantity column.");
    const num = (s) => parseFloat(String(s || "").replace(/[$,\s]/g, ""));
    const out = rows.slice(hi + 1).map((r) => {
      const t = normTicker(r[ti]), sh = num(r[qi]); let c = ci >= 0 ? num(r[ci]) : NaN;
      if (totalCost && sh) c = c / sh;
      return { ticker: t, shares: sh, cost: isNum(c) && c > 0 ? c : null };
    }).filter((x) => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(x.ticker) && x.shares > 0);
    return merge(out);
  }
  function merge(list) {
    const m = new Map();
    list.forEach((x) => { const e = m.get(x.ticker); if (!e) m.set(x.ticker, { ...x }); else { const tot = e.shares + x.shares; e.cost = isNum(e.cost) && isNum(x.cost) ? (e.cost * e.shares + x.cost * x.shares) / tot : e.cost ?? x.cost; e.shares = tot; } });
    return [...m.values()];
  }

  // ---------- Export ----------
  function exportReview() {
    const S = state.settings, lines = [
      `# Portfolio risk review — ${state.label}`, `Snapshot: ${DATA.asOf || "n/a"} · Sources: ${DATA.sources.join(", ")}`, "",
      `Value ${fmtUSD(A.total)} · 1Y ${fmtPct(A.ret1y, 1, true)} (S&P ${fmtPct(A.spyRet, 1, true)}) · Beta ${A.beta?.toFixed(2)} · Vol ${fmtPct(A.vol)} · Max DD ${fmtPct(A.maxDD)} · Health score ${A.score}/100`, "",
      "## Guidelines", ...FIELDS.map((f) => `- ${f.label}: ${fmtSetting(f, S[f.key])}`), `- Excluded sectors: ${(S.excluded || []).join(", ") || "none"}`, "",
      "## Flags", ...A.alerts.map((a) => `- [${sevLabel[a.sev]}] ${a.title} — ${a.detail}`), "", "## Passing", ...A.passes.map((p) => `- ${p}`), "",
      "## Areas of improvement", ...opportunities(A).map((o) => `- ${o.gain > 0 ? `(+${o.gain} pts) ` : ""}${o.title}: ${o.action}`), "",
      ...(() => { const p = rebalance(); return p.trades.length ? ["## Rebalance plan (to meet guidelines)", "| Ticker | From | To | Sell | Shares |", "|---|---|---|---|---|", ...p.trades.map((t) => `| ${t.ticker} | ${fmtPct(t.from)} | ${fmtPct(t.to)} | ${fmtUSD(t.sell)} | ${fmtNum(t.shares, 4)} |`), `Health score ${p.base.score} → ${p.after.score}`, ""] : []; })(),
      "## Custom rules & overrides", ...(S.customRules || []).map((r) => `- ${ruleText(r)}`), ...Object.entries(S.tickerLimits || {}).map(([k, v]) => `- ${k} position limit ${v}%`), ...Object.entries(S.sectorLimits || {}).map(([k, v]) => `- ${k} sector cap ${v}%`), "",
      "## Holdings", "| Ticker | Sector | Qty | Value | Weight |", "|---|---|---|---|---|", ...[...A.rows].sort((a, b) => b.weight - a.weight).map((r) => `| ${r.ticker} | ${r.sector} | ${r.shares} | ${fmtUSD(r.value)} | ${fmtPct(r.weight)} |`), "",
      "## Upcoming", ...A.events.map((e) => `- ${e.date}: ${e.kind === "earnings" ? e.ticker + " earnings" : e.title || e.name}`), "",
      "_Flags compare holdings against user-set guidelines. Not investment advice._",
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "portfolio-risk-review.md" });
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Review exported as Markdown");
  }

  // ---------- Events ----------
  function bind() {
    $$(".nav button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goto]"); if (g) setView(g.dataset.goto);
      const r = e.target.closest("[data-rm]");
      if (r) { const t = r.dataset.rm; saveHoldings(state.holdings.filter((h) => h.ticker !== t), state.label.includes("(edited)") ? state.label : state.label + " (edited)"); toast(`Removed ${t}`); }
      const n = e.target.closest("[data-news]"); if (n) { state.newsFilter = n.dataset.news; renderNews(); }
    });
    window.addEventListener("hashchange", () => setView(location.hash.slice(1)));

    $$("#rangeSeg button").forEach((b) => b.addEventListener("click", () => { state.range = +b.dataset.range; $$("#rangeSeg button").forEach((x) => x.classList.toggle("on", x === b)); drawOverviewCharts(); }));
    $$("#holdTable th[data-sort]").forEach((th) => th.addEventListener("click", () => { const k = th.dataset.sort; state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (["ticker", "sector"].includes(k) ? 1 : -1) }; renderHoldings(); }));
    $("#holdFilter").addEventListener("input", (e) => { state.filter = e.target.value; renderHoldings(); });

    // Settings
    $("#settingsGrid").addEventListener("input", (e) => {
      const k = e.target.dataset.key; if (!k || e.target.type !== "range") return;
      state.settings[k] = parseFloat(e.target.value);
      $("#n-" + k).value = state.settings[k];
      saveSettings();
    });
    $("#excludeChips").addEventListener("click", (e) => {
      const c = e.target.closest("[data-ex]"); if (!c) return;
      const s = c.dataset.ex, ex = new Set(state.settings.excluded || []);
      ex.has(s) ? ex.delete(s) : ex.add(s); state.settings.excluded = [...ex];
      c.setAttribute("aria-pressed", String(ex.has(s))); saveSettings();
    });
    $$("#presetSeg button").forEach((b) => b.addEventListener("click", () => { Object.assign(state.settings, PRESETS[b.dataset.preset]); saveSettings(); renderSettings(); toast(`${b.textContent} profile applied`); }));
    $("#resetSettings").addEventListener("click", () => { state.settings = { ...PRESETS.moderate, excluded: [], tickerLimits: {}, sectorLimits: {}, customRules: DEFAULT_RULES }; saveSettings(); renderSettings(); toast("Guidelines reset to Moderate"); });
    $("#exportBtn").addEventListener("click", exportReview);

    // Link dialog
    const dlg = $("#linkDialog");
    let pending = null, pendingCSV=null, ltab = "connect";
    $("#linkBtn").addEventListener("click", () => {
      $("#pasteBox").value = state.holdings.map((h) => `${h.ticker} ${h.shares??""}${isNum(h.cost) ? " " + +h.cost.toFixed(2) : ""}`).join("\n");
      $("#pasteErr").textContent = ""; $("#csvMsg").textContent = ""; pending = null; pendingCSV=null;
      dlg.showModal();
    });
    $$(".tabs2 button").forEach((b) => b.addEventListener("click", () => {
      ltab = b.dataset.ltab;
      $$(".tabs2 button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      $$(".ltab").forEach((p) => (p.hidden = p.dataset.lpanel !== ltab));
    }));
    $("#brokers").innerHTML = BROKERS.map(([n, s]) => `<button type="button" class="broker" data-broker="${esc(n)}"><b>${esc(n)}</b><small>${esc(s)}</small></button>`).join("");
    const goTab = (name) => { const t = document.querySelector(`.tabs2 button[data-ltab="${name}"]`); if (t) t.click(); };
    $("#brokers").addEventListener("click", (e) => { const b = e.target.closest("[data-broker]"); if (b) { goTab("paste"); $("#pasteErr").textContent = `${b.dataset.broker} connections are a placeholder in this demo. Paste your holdings here instead, or upload a CSV.`; } });
    const readFile = (file) => {
      const r = new FileReader();
      r.onload = () => { pendingCSV=String(r.result); try { pending = parseCSV(String(r.result)); $("#csvMsg").className = "ok"; $("#csvMsg").textContent = `Parsed ${pending.length} positions from ${file.name}.`; } catch (err) { pending = null; $("#csvMsg").className = "err"; $("#csvMsg").textContent = parent!==window&&pendingCSV?"File selected. Review portfolio will validate it against your saved workspace.":err.message; } };
      r.readAsText(file);
    };
    $("#csvFile").addEventListener("change", (e) => e.target.files[0] && readFile(e.target.files[0]));
    const drop = $("#drop");
    ["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));
    $("#applyLink").addEventListener("click", () => {
      if (ltab === "paste") {
        const { out, bad } = parsePaste($("#pasteBox").value);
        if (bad.length) { $("#pasteErr").textContent = `Couldn't read line${bad.length > 1 ? "s" : ""} ${bad.join(", ")}. Use TICKER QTY [COST].`; return; }
        if (!out.length) { $("#pasteErr").textContent = "Add at least one position."; return; }
        saveHoldings(out, "My portfolio"); dlg.close(); toast(`Reviewing ${out.length} positions`); setView("risk");
      } else if (ltab === "csv") {
        if(parent!==window&&pendingCSV){emit("mentor-portfolio-import",{csv:pendingCSV});dlg.close();return;}
        if (!pending?.length) { $("#csvMsg").className = "err"; $("#csvMsg").textContent = "Choose a CSV first."; return; }
        saveHoldings(pending, "Imported portfolio"); dlg.close(); toast(`Imported ${pending.length} positions`); setView("risk");
      } else { goTab("paste"); $("#pasteErr").textContent = "Broker links aren't live in this demo. Paste your holdings below, upload a CSV, or load the demo portfolio."; }
    });
    $("#loadDemo").addEventListener("click", () => { saveHoldings(DEMO_HOLDINGS, "Demo portfolio"); dlg.close(); toast("Demo portfolio loaded"); });
  }

  function renderDesignDetails(){
    const kpi=(label,value)=>`<article class="kpi"><div class="k">${label}</div><div class="v">${value}</div></article>`;
    $('#riskSummary').innerHTML=[['Beta',isNum(A.beta)?A.beta.toFixed(2):'—'],['Volatility',fmtPct(A.vol)],['Max drawdown',fmtPct(A.maxDD)],['Sharpe ratio',isNum(A.sharpe)?A.sharpe.toFixed(2):'—']].map(x=>kpi(...x)).join('');
    $('#holdingsSummary').innerHTML=[['Total value',fmtUSD(A.total)],['Total cost',fmtUSD(A.costTotal)],['Unrealized gain',fmtUSD(isNum(A.costTotal)?A.total-A.costTotal:null)],['Holdings',String(A.rows.length)]].map(x=>kpi(...x)).join('');
    const cells=Array.from({length:35},(_,i)=>{const day=i;return `<div class="calendar-cell">${day>0&&day<=30?`<span>${day}</span>${A.events.filter(e=>String(e.date).startsWith('2026-11')&&new Date(e.date).getUTCDate()===day).slice(0,2).map(e=>`<small>${esc(e.ticker||e.name||'Event')}</small>`).join('')}`:''}</div>`;});
    $('#calendarGrid').innerHTML=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<b>${x}</b>`).join('')+cells.join('');
    $('#newsWatchlist').innerHTML=A.rows.slice(0,5).map(r=>`<div><span>${esc(r.ticker)}</span><strong>${fmtUSD(r.value)}</strong></div>`).join('');
  }
  // ---------- Mentor same-origin integration ----------
  const settingMap={maxPosition:'maxPositionPercent',maxSector:'maxSectorPercent',maxTop5:'maxTop5Percent',maxCrypto:'maxCryptoPercent',maxBeta:'maxBeta',maxVol:'maxVolatilityPercent',maxDrawdown:'maxDrawdownPercent',maxPE:'maxPE',minHoldings:'minHoldings',earningsWindow:'earningsWindowDays',maxLossFromCost:'maxLossFromCostPercent',maxFromHigh:'maxFromHighPercent',maxCorr:'maxCorrelation'};
  function hydrate(payload){
    mentorPayload=payload;if(!mentorReady)return;
    DATA=structuredClone(originalData);bridgeMemory.set('sentinel.original',null);
    if(payload.sample&&!payload.workspace?.profile?.portfolio){state.holdings=structuredClone(DEMO_HOLDINGS);state.label='Sample portfolio';state.settings={...PRESETS.moderate,excluded:[],tickerLimits:{},sectorLimits:{},customRules:structuredClone(DEFAULT_RULES)};today=new Date('2026-11-06T12:00:00Z');}
    else{
      const w=payload.workspace,p=w.profile?.portfolio,g=w.guidelines||{},risk=payload.market?.riskAnalysis||w.advancedRisk;
      state.settings={...PRESETS.moderate,excluded:g.excludedSectors||[],tickerLimits:g.tickerLimits||{},sectorLimits:g.sectorLimits||{},customRules:(g.customRules||[]).map(r=>({...r,sev:r.severity||r.sev||'info'}))};
      for(const[k,v]of Object.entries(settingMap))if(isNum(g[v]))state.settings[k]=g[v];
      const positions=new Map((p?.positions||[]).map(x=>[x.symbol,x]));
      state.holdings=(p?.securities||[]).map(x=>{const position=positions.get(x.name)||{};return{ticker:x.name,shares:position.quantity??null,cost:position.quantity>0&&position.costBasis!=null?Number(position.costBasis)/position.quantity:null,importedValue:Number(x.value)};});
      mentorDraft=!g.version;state.label=payload.sample?'Alex Morgan · fictional portfolio':'Your imported portfolio';today=payload.sample?new Date('2026-11-06T12:00:00Z'):new Date();
      for(const r of risk?.rows||[]){const asset=DATA.assets[r.symbol]||{};DATA.assets[r.symbol]={...asset,name:r.company,price:r.price,_quoteSource:r.priceSource,_quoteAsOf:r.priceAsOf,sector:r.sector,pe:r.pe,dividendYield:r.divYield==null?null:r.divYield/100,analyst:asset.analyst||null};}
      for(const h of payload.market?.holdings||[])if(DATA.assets[h.symbol]){DATA.assets[h.symbol].price=h.price;DATA.assets[h.symbol]._quoteSource=h.priceSource;DATA.assets[h.symbol]._quoteAsOf=h.priceAsOf;}
      DATA.sources=payload.market?.sources||['Dated snapshot'];DATA.asOf=risk?.provenance?.snapshotAsOf||DATA.asOf;
      if(payload.market?.macro)DATA.macro=payload.market.macro;
      if(payload.market?.events)DATA.earnings=payload.market.events.map(e=>({...e,ticker:e.symbol}));
      if(payload.market?.economicEvents)DATA.econ=payload.market.economicEvents;
      if(payload.market?.news){for(const asset of Object.values(DATA.assets))asset.news=[];for(const n of payload.market.news){if(DATA.assets[n.symbol])(DATA.assets[n.symbol].news||=[]).push(n);}}
      bridgeMemory.set('mentor.baseline',state.holdings);
    }
    document.querySelector('#view-overview .card-h h2').textContent=payload.sample?'Historical mix vs S&P 500':'Historical current mix vs S&P 500';
    $('#mentor-context-note').textContent=payload.sample?'Alex Morgan is a fictional demo profile. Your teacher uses these same sample holdings and budget.':'Imported values remain unchanged by quote refresh. History illustrates the current mix, not account returns. Unsaved controls are draft guidelines. What-if values and tax notes are estimates, not tax-lot accounting. Quote context: '+(payload.market?.holdings||[]).map(h=>h.symbol+' '+h.priceSource+' '+(h.priceAsOf||'date unknown')).join('; ')+'. Macro: '+(payload.market?.macro?.source||'dated snapshot')+'.';
    $('#mentor-base-disclosure').textContent=payload.sample?'Market data is a dated snapshot for illustration. Flags compare the example holdings against example limits; not investment advice.':'Quotes and economic data may come from configured providers or dated fallback sources; see quote dates and sources above. Imported values are unchanged. Flags compare holdings against saved or explicitly labeled draft review limits; not investment advice.';
    render();
  }
  window.MentorPortfolio={hydrate,setView,status:message=>toast(message),getState:()=>({sample:mentorPayload?.sample,holdings:state.holdings,settings:state.settings,analysis:A})};
  window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='mentor-portfolio-hydrate')hydrate(e.data.payload);});
  // ---------- Boot ----------
  async function boot() {
    DATA = await loadData();originalData=structuredClone(DATA);
    chartDefaults();
    bind();
    bindExtra();
    if (!Object.keys(DATA.assets).length) toast("Market data snapshot failed to load.");
    mentorReady=true;
    const settings=$('#view-settings');const actions=document.createElement('div');actions.className='mentor-approval';actions.innerHTML='<button type="button" class="btn primary" id="mentor-approve">Review &amp; approve guidelines</button><button type="button" class="btn ghost" id="mentor-refresh">Refresh market context</button><button type="button" class="btn ghost" id="mentor-teacher">Ask your teacher</button>';settings.prepend(actions);
    document.querySelectorAll('[data-demo-teacher]').forEach(b=>b.onclick=()=>emit('mentor-portfolio-teacher',{question:'Explain Alex Morgan’s sample '+(TITLES[state.view]||'portfolio')+' and help me understand these numbers.'}));
    $('#overviewTeacher').onclick=()=>emit('mentor-portfolio-teacher',{question:mentorPayload?.sample?'Summarize Alex Morgan’s sample portfolio, its holdings and risk metrics.':'Help me understand my portfolio, its risk metrics, and the tradeoffs in my holdings.'});
    $('#mentor-approve').onclick=()=>emit('mentor-portfolio-guidelines',{settings:structuredClone(state.settings)});$('#mentor-refresh').onclick=()=>emit('mentor-portfolio-refresh');$('#mentor-teacher').onclick=()=>emit('mentor-portfolio-teacher',{question:mentorPayload?.sample?'Explain Alex Morgan’s demo portfolio risk metrics and guidelines.':'Explain the risk metrics and guidelines in my portfolio.'});
    if(mentorPayload)hydrate(mentorPayload);setView(state.view);emit('mentor-portfolio-ready');
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
