// Portfolio Review and Equity Research calculations. Every number an investing agent may quote is
// computed here in code from the user's holdings plus the dated market data, then validated like any
// other calc (lib/mentor/validate.js). Weights use exact cents; market figures are copied, not derived,
// except simple percent changes rounded to two decimals.
import {minor, amount} from '../finance.js';
import {getMarketData, cryptoId} from './providers.js';

export const MARKET_AGENTS = new Set(['investing', 'equity']);
export const LIMITS = {singlePositionPercent: '25.00', sectorPercent: '40.00', earningsWindowDays: 45};

const p2 = x => (x === null || x === undefined || !Number.isFinite(x) ? null : (Math.round(x * 100) / 100).toFixed(2));
const money = x => (x === null || x === undefined || !Number.isFinite(Number(x)) ? null : Number(x).toFixed(2));
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const bpsPercent = (part, total) => (total ? amount((part * 10000n + total / 2n) / total) : null); // cents ratio -> "12.34"
const TIMES = {amc: 'after market close', bmo: 'before market open', dmh: 'during market hours'};

// Holdings from the uploaded CSV summary (lib/portfolio.js keeps security_id as the symbol).
export function holdingsOf(profile) {
  const secs = profile?.portfolio?.securities || [];
  return secs.map(s => ({symbol: String(s.name).toUpperCase(), cents: minor(s.value)})).filter(h => h.cents > 0n).sort((a, b) => (b.cents > a.cents ? 1 : -1));
}

function priceStats(m) {
  const closes = (m.weeklyCloses || []).map(([, c]) => c).filter(Number.isFinite);
  const yearAgo = closes.length >= 50 ? closes[0] : null;
  return {
    belowHighPercent: m.price && m.week52High ? p2((1 - m.price / m.week52High) * 100) : null,
    aboveLowPercent: m.price && m.week52Low ? p2((m.price / m.week52Low - 1) * 100) : null,
    oneYearChangePercent: m.price && yearAgo ? p2((m.price / yearAgo - 1) * 100) : null,
  };
}

function lastQuarter(m) {
  const l = m.lastEarnings;
  if (!l || !Number.isFinite(l.epsActual) || !Number.isFinite(l.epsEstimate)) return null;
  const surprise = l.epsEstimate ? ((l.epsActual - l.epsEstimate) / Math.abs(l.epsEstimate)) * 100 : null;
  return {date: l.date, epsActual: money(l.epsActual), epsEstimate: money(l.epsEstimate), result: l.epsActual >= l.epsEstimate ? 'beat estimate' : 'missed estimate', surprisePercent: p2(Math.abs(surprise)), source: l.source};
}

function nextCall(m, asOf) {
  const n = m.nextEarnings;
  if (!n?.date) return null;
  return {date: n.date, days: daysBetween(asOf, n.date), timing: TIMES[n.time] || n.time || 'time not announced', epsEstimate: money(n.epsEstimate), source: n.source};
}

function analystView(m) {
  const a = m.analyst;
  if (!a) return null;
  const target = Number.isFinite(a.target) ? a.target : null;
  return {buyRatings: a.buy, holdRatings: a.hold, sellRatings: a.sell, targetPrice: money(target),
    targetVsPricePercent: target && m.price ? p2(Math.abs(target / m.price - 1) * 100) : null,
    targetDirection: target && m.price ? (target >= m.price ? 'above current price' : 'below current price') : null, source: a.source};
}

// Builds the calc list for an investing agent. Returns {calcs, market, needsPortfolio}.
export async function marketCalcs(profile, agentId, {fetcher, today = new Date().toISOString().slice(0, 10)} = {}) {
  if (!MARKET_AGENTS.has(agentId)) return {calcs: [], market: null};
  const holdings = holdingsOf(profile);
  if (!holdings.length) return {calcs: [], market: null, needsPortfolio: true};
  const market = await getMarketData(holdings.map(h => h.symbol), {fetcher});
  const asOf = today;
  const total = holdings.reduce((s, h) => s + h.cents, 0n);
  const sourceLine = `${market.sources.join(', ') || 'no market data'}; prices as of ${market.asOf}`;
  const rows = holdings.map(h => {
    const m = market.bySymbol[h.symbol] || {};
    return {h, m, symbol: h.symbol, value: amount(h.cents), weightPercent: bpsPercent(h.cents, total), sector: m.sector || (cryptoId(h.symbol) ? 'Crypto' : 'Unknown')};
  });

  // Sector weights (exact cents).
  const sectors = new Map();
  for (const r of rows) sectors.set(r.sector, (sectors.get(r.sector) || 0n) + r.h.cents);
  const sectorRows = [...sectors].sort((a, b) => (b[1] > a[1] ? 1 : -1)).map(([sector, c]) => ({sector, value: amount(c), weightPercent: bpsPercent(c, total)}));
  const top3 = rows.slice(0, 3).reduce((s, r) => s + r.h.cents, 0n);
  const overLimit = (list, key) => list.filter(x => Number(x.weightPercent) > Number(LIMITS[key]));

  const macro = {id: 'mkt_macro', name: 'macro_backdrop', label: 'Rates, inflation and jobs backdrop', inputs: {source: market.macro.source}, result: {
    fedFundsPercent: p2(market.macro.fedFunds), tenYearTreasuryPercent: p2(market.macro.tenYear), twoYearTreasuryPercent: p2(market.macro.twoYear),
    inflationYoYPercent: p2(market.macro.cpiYoY), unemploymentPercent: p2(market.macro.unemployment),
    upcomingEvents: market.events.slice(0, 3).map(e => ({date: e.date, days: daysBetween(asOf, e.date), event: e.title})),
  }};

  const calcs = [];
  if (agentId === 'investing') {
    calcs.push({id: 'pf_mix', name: 'portfolio_allocation', label: 'Portfolio allocation', inputs: {holdingsCount: rows.length, source: sourceLine}, result: {
      totalValue: amount(total), holdingsCount: rows.length,
      largestHolding: {symbol: rows[0].symbol, value: rows[0].value, weightPercent: rows[0].weightPercent},
      topThreeWeightPercent: bpsPercent(top3, total),
      holdings: rows.map(r => ({symbol: r.symbol, value: r.value, weightPercent: r.weightPercent, sector: r.sector})),
      sectors: sectorRows, estimatedAnnualFees: profile.portfolio.estimatedAnnualFees,
    }});
    calcs.push({id: 'pf_concentration', name: 'concentration_check', label: 'Concentration vs simple limits', inputs: {singlePositionLimitPercent: LIMITS.singlePositionPercent, sectorLimitPercent: LIMITS.sectorPercent}, result: {
      singlePositionLimitPercent: LIMITS.singlePositionPercent, sectorLimitPercent: LIMITS.sectorPercent,
      positionsOverLimit: overLimit(rows.map(r => ({symbol: r.symbol, weightPercent: r.weightPercent})), 'singlePositionPercent'),
      sectorsOverLimit: overLimit(sectorRows.map(s => ({sector: s.sector, weightPercent: s.weightPercent})), 'sectorPercent'),
      note: 'Limits are common rule-of-thumb guardrails used for illustration, not personal recommendations.',
    }});
    const upcoming = rows.map(r => ({r, c: nextCall(r.m, asOf)})).filter(x => x.c && x.c.days >= 0 && x.c.days <= LIMITS.earningsWindowDays)
      .sort((a, b) => a.c.days - b.c.days).map(({r, c}) => ({symbol: r.symbol, weightPercent: r.weightPercent, ...c, lastQuarter: lastQuarter(r.m)}));
    calcs.push({id: 'pf_earnings', name: 'upcoming_earnings_calls', label: `Earnings calls in the next ${LIMITS.earningsWindowDays} days`, inputs: {windowDays: LIMITS.earningsWindowDays, source: sourceLine}, result: {
      count: upcoming.length, calls: upcoming,
      later: rows.map(r => ({symbol: r.symbol, c: nextCall(r.m, asOf)})).filter(x => x.c && x.c.days > LIMITS.earningsWindowDays).slice(0, 6).map(x => ({symbol: x.symbol, date: x.c.date})),
    }});
    calcs.push({id: 'pf_risk', name: 'holding_risk_flags', label: 'Holding-level risk flags', inputs: {source: sourceLine, rangeWeeks: 52}, result: {
      holdings: rows.map(r => {
        const s = priceStats(r.m), flags = [];
        if (Number(r.weightPercent) > Number(LIMITS.singlePositionPercent)) flags.push('position above the single-holding limit');
        if (Number(s.belowHighPercent) >= 20) flags.push('trading well below its 52-week high');
        if (Number(r.m.pe) >= 35) flags.push('high valuation (price-to-earnings)');
        if (r.sector === 'Crypto') flags.push('crypto: very high volatility');
        const c = nextCall(r.m, asOf);
        if (c && c.days >= 0 && c.days <= 14) flags.push('earnings call within two weeks');
        return {symbol: r.symbol, weightPercent: r.weightPercent, price: money(r.m.price), priceToEarnings: money(r.m.pe), ...s, flags};
      }),
    }});
    const heads = rows.flatMap(r => (r.m.news || []).map(n => ({symbol: r.symbol, title: n.title, source: n.source, url: n.url}))).slice(0, 6);
    if (heads.length) calcs.push({id: 'pf_news', name: 'recent_headlines', label: 'Recent headlines on your holdings', inputs: {source: sourceLine}, result: {headlines: heads}});
    calcs.push(macro);
  } else {
    // Equity Research: one research card per largest holding (stocks only).
    for (const r of rows.filter(r => r.sector !== 'Crypto' && r.m.price).slice(0, 5)) {
      calcs.push({id: `eq_${r.symbol.toLowerCase().replace(/[^a-z0-9]/g, '')}`, name: 'company_research', label: `${r.m.name || r.symbol} (${r.symbol})`, inputs: {symbol: r.symbol, source: sourceLine, rangeWeeks: 52}, result: {
        symbol: r.symbol, company: r.m.name, sector: r.sector, industry: r.m.industry, yourValue: r.value, weightPercent: r.weightPercent,
        price: money(r.m.price), priceAsOf: r.m.priceAsOf, priceToEarnings: money(r.m.pe), week52High: money(r.m.week52High), week52Low: money(r.m.week52Low),
        ...priceStats(r.m), nextEarningsCall: nextCall(r.m, asOf), lastQuarter: lastQuarter(r.m), analysts: analystView(r.m),
        latestFilings: (r.m.filings || []).map(f => ({form: f.form, date: f.date, url: f.url})),
        headlines: (r.m.news || []).slice(0, 3).map(n => ({title: n.title, source: n.source, url: n.url})),
      }});
    }
    calcs.push(macro);
  }
  return {calcs, market: {asOf: market.asOf, sources: market.sources, live: market.live}};
}
