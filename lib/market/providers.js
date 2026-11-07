// Market data provider layer for the investing agents. Server-side only: keys come from env vars and
// never reach the browser. Every source is optional. Missing keys, timeouts and errors fall back to the
// dated snapshot in data/market/snapshot.json, and every field records which source supplied it.
//
//   FINNHUB_API_KEY       quotes, 52-week range, P/E, earnings calendar, EPS history, analyst ratings, company news
//   ALPHA_VANTAGE_API_KEY optional quote fallback when Finnhub is not configured (free tier: 25 calls/day)
//   FRED_API_KEY          fed funds, 2Y/10Y Treasury, unemployment
//   SEC_USER_AGENT        SEC EDGAR filings (no key; SEC requires an identifying User-Agent, e.g. "Mentor Labs you@example.com")
//   (none)                CoinGecko public price for crypto holdings
//   MARKET_LIVE=0         disable every network call (tests and offline demos)
import fs from 'node:fs';

const SNAPSHOT = JSON.parse(fs.readFileSync(new URL('../../data/market/snapshot.json', import.meta.url), 'utf8'));
const TTL_MS = Number(process.env.MARKET_CACHE_MS) || 15 * 60_000;
const TIMEOUT_MS = Number(process.env.MARKET_TIMEOUT_MS) || 3500;
const cache = new Map();
const env = k => (process.env[k] || '').trim();
const liveOn = () => process.env.MARKET_LIVE !== '0';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export const snapshot = () => SNAPSHOT;
export function liveSources() {
  const on = liveOn();
  return {
    finnhub: on && Boolean(env('FINNHUB_API_KEY')), alphaVantage: on && Boolean(env('ALPHA_VANTAGE_API_KEY')),
    fred: on && Boolean(env('FRED_API_KEY')), secEdgar: on && Boolean(env('SEC_USER_AGENT')), coingecko: on,
  };
}

async function getJSON(url, {headers = {}, ttl = TTL_MS, fetcher = fetch} = {}) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  const res = await fetcher(url, {headers: {Accept: 'application/json', ...headers}, signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (!res.ok) throw Error(`${new URL(url).host} ${res.status}`);
  const data = await res.json();
  cache.set(url, {at: Date.now(), data});
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  return data;
}
const settle = async p => { try { return await p; } catch (e) { return {__error: e.message}; } };

// ---------- Finnhub ----------
async function finnhub(symbol, o) {
  const k = encodeURIComponent(env('FINNHUB_API_KEY')), s = encodeURIComponent(symbol), b = 'https://finnhub.io/api/v1';
  const from = today(), to = addDays(from, 120), newsFrom = addDays(from, -10);
  const [quote, metric, cal, eps, recs, news] = await Promise.all([
    settle(getJSON(`${b}/quote?symbol=${s}&token=${k}`, o)),
    settle(getJSON(`${b}/stock/metric?symbol=${s}&metric=all&token=${k}`, {...o, ttl: 6 * 3600_000})),
    settle(getJSON(`${b}/calendar/earnings?from=${from}&to=${to}&symbol=${s}&token=${k}`, {...o, ttl: 6 * 3600_000})),
    settle(getJSON(`${b}/stock/earnings?symbol=${s}&limit=4&token=${k}`, {...o, ttl: 6 * 3600_000})),
    settle(getJSON(`${b}/stock/recommendation?symbol=${s}&token=${k}`, {...o, ttl: 6 * 3600_000})),
    settle(getJSON(`${b}/company-news?symbol=${s}&from=${newsFrom}&to=${from}&token=${k}`, o)),
  ]);
  const out = {};
  if (num(quote?.c)) Object.assign(out, {price: num(quote.c), priceAsOf: quote.t ? new Date(quote.t * 1000).toISOString().slice(0, 10) : from, priceSource: 'Finnhub'});
  const m = metric?.metric;
  if (m) Object.assign(out, {week52High: num(m['52WeekHigh']), week52Low: num(m['52WeekLow']), pe: num(m.peTTM ?? m.peBasicExclExtraTTM), metricsSource: 'Finnhub'});
  const next = (cal?.earningsCalendar || []).filter(e => e.date >= from).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (next) out.nextEarnings = {date: next.date, time: next.hour || null, epsEstimate: num(next.epsEstimate), source: 'Finnhub'};
  const last = Array.isArray(eps) ? eps.find(e => num(e.actual) !== null) : null;
  if (last) out.lastEarnings = {date: last.period, epsActual: num(last.actual), epsEstimate: num(last.estimate), source: 'Finnhub'};
  const r = Array.isArray(recs) ? recs[0] : null;
  if (r) out.analyst = {buy: (r.buy || 0) + (r.strongBuy || 0), hold: r.hold || 0, sell: (r.sell || 0) + (r.strongSell || 0), period: r.period, source: 'Finnhub'};
  if (Array.isArray(news)) out.news = news.slice(0, 3).map(n => ({title: String(n.headline).slice(0, 200), source: n.source, url: n.url, date: new Date(n.datetime * 1000).toISOString().slice(0, 10)}));
  return out;
}

async function alphaQuote(symbol, o) {
  const d = await getJSON(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(env('ALPHA_VANTAGE_API_KEY'))}`, {...o, ttl: 60 * 60_000});
  const q = d?.['Global Quote'];
  return num(q?.['05. price']) ? {price: num(q['05. price']), priceAsOf: q['07. latest trading day'], priceSource: 'Alpha Vantage'} : {};
}

// ---------- SEC EDGAR (no key) ----------
let cikMap = null;
async function secFilings(symbol, o) {
  const headers = {'User-Agent': env('SEC_USER_AGENT')};
  if (!cikMap) {
    const t = await getJSON('https://www.sec.gov/files/company_tickers.json', {...o, headers, ttl: 7 * 86400_000});
    cikMap = new Map(Object.values(t).map(x => [String(x.ticker).toUpperCase(), String(x.cik_str).padStart(10, '0')]));
  }
  const cik = cikMap.get(symbol.toUpperCase());
  if (!cik) return [];
  const sub = await getJSON(`https://data.sec.gov/submissions/CIK${cik}.json`, {...o, headers, ttl: 6 * 3600_000});
  const r = sub?.filings?.recent;
  if (!r?.form) return [];
  const out = [];
  for (let i = 0; i < r.form.length && out.length < 3; i++) {
    if (!['10-K', '10-Q', '8-K'].includes(r.form[i])) continue;
    if (r.form[i] === '8-K' && out.some(f => f.form === '8-K')) continue;
    const acc = r.accessionNumber[i].replace(/-/g, '');
    out.push({form: r.form[i], date: r.filingDate[i], url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${r.primaryDocument[i]}`, source: 'SEC EDGAR'});
  }
  return out;
}

// ---------- FRED ----------
async function fredMacro(o) {
  const k = encodeURIComponent(env('FRED_API_KEY'));
  const series = {fedFunds: 'DFF', tenYear: 'DGS10', twoYear: 'DGS2', unemployment: 'UNRATE'};
  const out = {asOfNotes: {}};
  await Promise.all(Object.entries(series).map(async ([key, id]) => {
    const d = await settle(getJSON(`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${k}&file_type=json&sort_order=desc&limit=5`, {...o, ttl: 6 * 3600_000}));
    const obs = (d?.observations || []).find(x => num(x.value) !== null);
    if (obs) { out[key] = num(obs.value); out.asOfNotes[key] = `${obs.date} (FRED ${id})`; }
  }));
  return out;
}

async function coingecko(ids, o) {
  if (!ids.length) return {};
  const d = await getJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.map(encodeURIComponent).join(',')}&vs_currencies=usd`, {...o, ttl: 5 * 60_000});
  return d || {};
}

const CRYPTO = {BTC: 'bitcoin', 'BTC-USD': 'bitcoin', ETH: 'ethereum', 'ETH-USD': 'ethereum', SOL: 'solana', 'SOL-USD': 'solana', DOGE: 'dogecoin', 'DOGE-USD': 'dogecoin'};
export const cryptoId = s => CRYPTO[String(s).toUpperCase()] || null;

// Returns {asOf, live, sources, bySymbol: {SYM: {...fields, sources}}, macro, events, news}
export async function getMarketData(symbols, {fetcher} = {}) {
  const o = fetcher ? {fetcher} : {};
  const live = liveSources();
  const syms = [...new Set(symbols.map(s => String(s).toUpperCase()))].slice(0, 12);
  const used = new Set();
  const bySymbol = {};
  const cryptoIds = syms.map(cryptoId).filter(Boolean);
  const [cg, macroLive] = await Promise.all([
    live.coingecko && cryptoIds.length ? settle(coingecko([...new Set(cryptoIds)], o)) : {},
    live.fred ? settle(fredMacro(o)) : null,
  ]);
  await Promise.all(syms.map(async sym => {
    const cid = cryptoId(sym);
    const snap = cid ? Object.values(SNAPSHOT.crypto).find(c => c.id === cid) : SNAPSHOT.tickers[sym];
    const base = snap ? {
      name: snap.name, sector: snap.sector, industry: snap.industry || null, price: snap.price, priceAsOf: SNAPSHOT.asOf, priceSource: 'snapshot',
      pe: snap.pe ?? null, week52High: snap.week52High ?? null, week52Low: snap.week52Low ?? null, weeklyCloses: snap.weeklyCloses || [],
      analyst: snap.analyst ? {...snap.analyst, source: 'snapshot'} : null,
      nextEarnings: SNAPSHOT.earnings[sym] && SNAPSHOT.earnings[sym].date >= today() ? {date: SNAPSHOT.earnings[sym].date, time: SNAPSHOT.earnings[sym].time, epsEstimate: SNAPSHOT.earnings[sym].epsEstimate, source: 'snapshot'} : null,
      lastEarnings: SNAPSHOT.earnings[sym]?.last ? {...SNAPSHOT.earnings[sym].last, source: 'snapshot'} : null,
      news: SNAPSHOT.news.filter(n => n.tickers?.includes(sym)).slice(0, 3), filings: [],
    } : {name: sym, sector: null, price: null, weeklyCloses: [], news: [], filings: [], analyst: null, nextEarnings: null, lastEarnings: null};
    if (snap) used.add('snapshot');
    if (cid) {
      const p = num(cg?.[cid]?.usd);
      if (p) { Object.assign(base, {price: p, priceAsOf: today(), priceSource: 'CoinGecko'}); used.add('CoinGecko'); }
      base.sector = 'Crypto';
    } else {
      const [fh, av, sec] = await Promise.all([
        live.finnhub ? settle(finnhub(sym, o)) : null,
        live.alphaVantage && !live.finnhub ? settle(alphaQuote(sym, o)) : null,
        live.secEdgar ? settle(secFilings(sym, o)) : null,
      ]);
      for (const [src, data] of [['Finnhub', fh], ['Alpha Vantage', av]]) {
        if (!data || data.__error) continue;
        const {analyst, news, ...rest} = data;
        for (const [k, v] of Object.entries(rest)) if (v !== null && v !== undefined) base[k] = v;
        // Keep the snapshot's price target (Finnhub's is a paid endpoint) but take live rating counts.
        if (analyst) base.analyst = {...(base.analyst || {}), ...analyst};
        if (news?.length) base.news = news;
        if (Object.keys(data).length) used.add(src);
      }
      if (Array.isArray(sec) && sec.length) { base.filings = sec; used.add('SEC EDGAR'); }
    }
    bySymbol[sym] = base;
  }));
  const macro = {...SNAPSHOT.macro, asOfNotes: {...SNAPSHOT.macro.asOfNotes}, source: 'snapshot'};
  if (macroLive && !macroLive.__error && Object.keys(macroLive.asOfNotes).length) {
    Object.assign(macro, macroLive, {asOfNotes: {...macro.asOfNotes, ...macroLive.asOfNotes}, source: 'FRED (live) + snapshot'});
    used.add('FRED');
  }
  const asOf = Object.values(bySymbol).map(b => b.priceAsOf).filter(Boolean).sort().at(-1) || SNAPSHOT.asOf;
  return {asOf, live, sources: [...used], bySymbol, macro, events: SNAPSHOT.economicEvents.filter(e => e.date >= today())};
}

export const clearMarketCache = () => { cache.clear(); cikMap = null; };
