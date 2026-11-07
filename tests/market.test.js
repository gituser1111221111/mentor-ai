// Market data layer for the Portfolio Review and Equity Research agents. Offline: MARKET_LIVE=0 or a fake fetcher.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {summarizePortfolioCSV} from '../lib/portfolio.js';
import {marketCalcs} from '../lib/market/review.js';
import {clearMarketCache} from '../lib/market/providers.js';
import {validateCandidates, unverifiedNumbers} from '../lib/mentor/validate.js';

const sample = fs.readFileSync(new URL('../data/demo_portfolio.csv', import.meta.url), 'utf8');
const profile = {portfolio: summarizePortfolioCSV(sample)};
const TODAY = '2026-11-07';

test('portfolio review calcs: exact weights, concentration, upcoming earnings from the snapshot', async () => {
  process.env.MARKET_LIVE = '0';
  const {calcs, market} = await marketCalcs(profile, 'investing', {today: TODAY});
  const mix = calcs.find(c => c.id === 'pf_mix').result;
  assert.equal(mix.totalValue, '7827.01');
  assert.equal(mix.largestHolding.symbol, 'NVDA');
  assert.equal(mix.largestHolding.weightPercent, '28.62'); // 2240.16 / 7827.01, exact cents
  const conc = calcs.find(c => c.id === 'pf_concentration').result;
  assert.deepEqual(conc.positionsOverLimit.map(p => p.symbol), ['NVDA']);
  assert.deepEqual(conc.sectorsOverLimit.map(s => s.sector), ['Information Technology']);
  const earn = calcs.find(c => c.id === 'pf_earnings').result;
  assert.equal(earn.calls[0].symbol, 'NVDA');
  assert.equal(earn.calls[0].date, '2026-11-17');
  assert.equal(earn.calls[0].days, 10);
  assert.equal(earn.calls[0].epsEstimate, '2.48');
  assert.equal(earn.calls[0].lastQuarter.result, 'beat estimate');
  assert.deepEqual(market.sources, ['snapshot']);
  assert.equal(market.live.finnhub, false);
});

test('equity research gives one card per largest stock and skips crypto', async () => {
  process.env.MARKET_LIVE = '0';
  const {calcs} = await marketCalcs(profile, 'equity', {today: TODAY});
  assert.deepEqual(calcs.filter(c => c.name === 'company_research').map(c => c.result.symbol), ['NVDA', 'AAPL', 'MSFT', 'AVGO', 'META']);
  const nvda = calcs.find(c => c.id === 'eq_nvda').result;
  assert.equal(nvda.analysts.buyRatings, 69);
  assert.equal(nvda.analysts.targetDirection, 'above current price');
  assert.ok(calcs.some(c => c.id === 'mkt_macro'));
});

test('validator: calc-backed dates, EPS and weights pass; invented ones are dropped', async () => {
  process.env.MARKET_LIVE = '0';
  const {calcs} = await marketCalcs(profile, 'investing', {today: TODAY});
  const library = {calcs};
  const {candidates, dropped} = validateCandidates([
    {title: 'Prepare for the NVDA call', summary: 'NVDA reports on 2026-11-17, in 10 days, with a consensus EPS estimate of $2.48. It is 28.62% of your portfolio.', calcIds: ['pf_earnings', 'pf_mix'], tradeoffs: 'Earnings can move the price a lot.', risk: 'medium', timeToGoalMonths: null},
    {title: 'Invented date', summary: 'NVDA reports on 2026-12-01 with an EPS estimate of $3.10.', calcIds: ['pf_earnings'], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null},
  ], library);
  assert.equal(candidates.length, 1);
  assert.match(dropped[0].reason, /2026-12-01/);
  assert.deepEqual(unverifiedNumbers('Your weight is 30.00%', calcs), ['30.00%']);
});

test('no holdings -> asks for a portfolio instead of guessing', async () => {
  const r = await marketCalcs({}, 'investing');
  assert.equal(r.needsPortfolio, true);
  assert.deepEqual(r.calcs, []);
  assert.deepEqual((await marketCalcs(profile, 'budget')).calcs, []);
});

test('live Finnhub data overrides the snapshot and is labeled with its source (fake fetch)', async () => {
  delete process.env.MARKET_LIVE;
  process.env.FINNHUB_API_KEY = 'test-key';
  clearMarketCache();
  const seen = [];
  const fetcher = async url => {
    seen.push(url);
    const u = new URL(url);
    const body = u.host === 'finnhub.io'
      ? u.pathname.endsWith('/quote') ? {c: 200.5, t: 1762560000}
      : u.pathname.endsWith('/calendar/earnings') ? {earningsCalendar: [{date: '2026-11-18', hour: 'amc', epsEstimate: 2.5, symbol: u.searchParams.get('symbol')}]}
      : u.pathname.endsWith('/stock/metric') ? {metric:{peTTM:22}}
      : u.pathname.endsWith('/stock/recommendation') ? [{buy: 50, strongBuy: 20, hold: 3, sell: 1, strongSell: 0, period: '2026-11-01'}]
      : u.pathname.endsWith('/company-news') ? [{headline: 'Live headline', source: 'Wire', url: 'https://example.com/a', datetime: 1762560000}]
      : {}
      : {bitcoin: {usd: 76000}};
    return {ok: true, json: async () => body};
  };
  try {
    const {calcs, market} = await marketCalcs(profile, 'equity', {fetcher, today: TODAY});
    const nvda = calcs.find(c => c.id === 'eq_nvda').result;
    assert.equal(nvda.price, '200.50');
    assert.equal(nvda.nextEarningsCall.date, '2026-11-18');
    assert.equal(nvda.nextEarningsCall.source, 'Finnhub');
    assert.equal(nvda.analysts.buyRatings, 70);
    assert.equal(nvda.analysts.source, 'Finnhub');
    assert.equal(nvda.analysts.targetSource, 'snapshot');
    assert.equal(nvda.analysts.targetAsOf, '2026-11-06');
    assert.equal(nvda.priceSource, 'Finnhub');
    assert.equal(nvda.metricSources.pe.source, 'Finnhub');
    assert.equal(nvda.metricSources.week52High.source, 'snapshot');
    assert.equal(nvda.oneYearChangePercent, null);
    assert.equal(nvda.headlines[0].title, 'Live headline');
    assert.ok(market.sources.includes('Finnhub'));
    assert.ok(seen.every(u => !u.includes('alphavantage'))); // Finnhub configured: no Alpha Vantage calls
  } finally { delete process.env.FINNHUB_API_KEY; process.env.MARKET_LIVE = '0'; clearMarketCache(); }
});


test('configured provider failure falls back to Alpha Vantage without relabeling snapshot metrics', async () => {
  delete process.env.MARKET_LIVE;
  process.env.FINNHUB_API_KEY = 'test-key'; process.env.ALPHA_VANTAGE_API_KEY = 'test-key'; clearMarketCache();
  const single = {portfolio: summarizePortfolioCSV('symbol,market_value\nAAPL,100')};
  const seen=[];
  const fetcher=async url=>{ seen.push(url); return new URL(url).host==='finnhub.io' ? {ok:false,status:503} : {ok:true,json:async()=>({'Global Quote':{'05. price':'201.50','07. latest trading day':'2026-11-05'}})}; };
  try {
    const {calcs}=await marketCalcs(single,'equity',{fetcher,today:TODAY});
    const a=calcs.find(c=>c.id==='eq_aapl').result;
    assert.equal(a.price,'201.50');assert.equal(a.priceSource,'Alpha Vantage');
    assert.equal(a.priceAsOf,'2026-11-05');assert.equal(a.metricsSource,'snapshot');
    assert.equal(a.analysts.targetSource,'snapshot');
    assert.ok(seen.some(u=>u.includes('alphavantage.co')));
  } finally {delete process.env.FINNHUB_API_KEY;delete process.env.ALPHA_VANTAGE_API_KEY;process.env.MARKET_LIVE='0';clearMarketCache();}
});

test('matching earnings estimates are not beats and zero estimates do not imply zero surprise',async()=>{
  delete process.env.MARKET_LIVE;process.env.FINNHUB_API_KEY='test-key';clearMarketCache();
  const single={portfolio:summarizePortfolioCSV('symbol,market_value\nAAPL,100')};
  const fetcher=async url=>({ok:true,json:async()=>new URL(url).pathname.endsWith('/stock/earnings')?[{actual:0,estimate:0,period:'2026-09-30'}]:{}});
  try{
    const {calcs}=await marketCalcs(single,'equity',{fetcher,today:TODAY});
    const last=calcs.find(c=>c.id==='eq_aapl').result.lastQuarter;
    assert.equal(last.result,'met estimate');assert.equal(last.surprisePercent,null);
  }finally{delete process.env.FINNHUB_API_KEY;process.env.MARKET_LIVE='0';clearMarketCache();}
});
