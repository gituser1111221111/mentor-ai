import {minor,amount} from './finance.js';
import {normalizeProfile,snapshot} from './profile.js';
import {getMarketData,snapshot as marketSnapshot,cryptoId} from './market/providers.js';
import {reviewPortfolio} from './guidelines.js';
import {analyzePortfolio} from './market/sentinel.js';

function newsLink(value) {
  try { const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:null; } catch {return null;}
}

export function saveBudget(input, previous = {}) {
  const fields=['income','bills','spending','savings','cashCushion'];
  for(const key of fields) if(typeof input[key]!=='string'||!/^\d+(\.\d{1,2})?$/.test(input[key])||input[key].length>16)throw Error(`Enter ${key} as a dollar amount, including 0 when none.`);
  const month=String(input.month||'');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose the month for this take-home income.');
  const incomeHistory=[...(previous.incomeHistory||[]).filter(x=>x.month!==month),{month,amount:input.income}].sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
  const {profile,errors}=normalizeProfile({...previous,incomeHistory,bills:[{name:'Monthly fixed bills',amount:input.bills}],expenses:[{name:'Monthly everyday spending',amount:input.spending}],savings:input.savings});
  if(errors.length)throw Error(errors.map(e=>e.error).join(' '));
  // Existing debts/documents/holdings are not replaced by this focused editor.
  return {profile:{...previous,...profile},budgetPreferences:{cashCushion:amount(minor(input.cashCushion)),updatedAt:new Date().toISOString()}};
}
export function budgetOverview(profile,preferences) {
  const s=snapshot(profile||{}),ready=s.status==='ok',cushion=preferences?.cashCushion??null;
  return {snapshot:s,ready,cashCushion:cushion,reserveGap:cushion===null?null:amount(minor(cushion)>minor(s.savings)?minor(cushion)-minor(s.savings):0n),monthlyBalance:ready?amount(minor(s.lowestMonth)-minor(s.essentialsTotal)):null,note:'Plan based on entered monthly costs and the lowest saved take-home month. Omitted costs are not covered. No account activity is connected.'};
}
export function workspaceOverview(session) {
  return {advancedRisk:analyzePortfolio(session.profile?.portfolio,session.guidelines?.effective),budget:budgetOverview(session.profile,session.budgetPreferences),profile:session.profile||null,review:reviewPortfolio(session.profile?.portfolio,session.guidelines?.effective),guidelines:session.guidelines?.effective||null,monitoring:'Manual imports and on-demand refresh. No background account monitoring or notifications.'};
}
export async function portfolioWatch(portfolio,guideline,{fetcher,today=new Date().toISOString().slice(0,10)}={}) {
  const symbols=[...new Set((portfolio?.securities||[]).map(x=>String(x.name).toUpperCase()).filter(x=>!['CASH','USD','US DOLLAR'].includes(x)))];
  if(!symbols.length)return {snapshotId:portfolio?.snapshotId||null,holdings:[],events:[],news:[],economicEvents:[],macro:null,sources:[],uncovered:[],note:'Import holdings to review market context.'};
  const selected=symbols.slice(0,12),market=await getMarketData(selected,{fetcher});
  const windowDays=guideline?.earningsWindowDays??45;
  const holdings=selected.map(symbol=>{const m=market.bySymbol[symbol]||{};return {symbol,company:m.name||symbol,sector:m.sector??null,sectorSource:m.sectorSource??'Unknown',sectorAsOf:m.sectorAsOf??null,price:m.price??null,priceAsOf:m.priceAsOf??null,priceSource:m.priceSource??'Unknown',nextEarnings:m.nextEarnings??null,filings:m.filings||[],news:(m.news||[]).map(n=>({...n,url:newsLink(n.url),provider:m.newsSource??'Unknown',providerAsOf:m.newsAsOf??null})).filter(n=>n.url)};});
  const events=holdings.filter(h=>h.nextEarnings?.date).map(h=>({...h.nextEarnings,symbol:h.symbol,sourceAsOf:h.nextEarnings.source==='snapshot'?'Snapshot as of '+marketSnapshot().asOf:'Calendar retrieved '+today,days:Math.round((Date.parse(h.nextEarnings.date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000),transcriptAvailable:false})).filter(e=>e.days>=0&&e.days<=windowDays).sort((a,b)=>a.date.localeCompare(b.date));
  const news=holdings.flatMap(h=>h.news.map(n=>({...n,symbol:h.symbol}))).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  const economicEvents=market.events.filter(e=>e.date>=today).map(e=>({...e,source:'snapshot',sourceAsOf:marketSnapshot().asOf}));
  // Say plainly when a price is the dated sample snapshot, and why, so it is never read as a live quote.
  const stale=holdings.filter(h=>h.priceSource==='snapshot'),fromSnapshot=stale.length,quoteProvider=stale.some(h=>cryptoId(h.symbol)?market.live.coingecko:market.live.finnhub||market.live.alphaVantage);
  const fallbackNote=fromSnapshot?`${fromSnapshot} of ${holdings.length} prices come from the dated sample snapshot (${marketSnapshot().asOf}), not live quotes, because ${quoteProvider?'the live quote provider did not respond':'no live quote provider is configured'}.`:null;
  return {fallbackNote,riskAnalysis:analyzePortfolio(portfolio,guideline,market,today),snapshotId:portfolio.snapshotId,retrievedAt:new Date().toISOString(),windowDays,windowSource:guideline?.earningsWindowDays?'Your saved guideline':'Default display window; not a saved guideline',holdings,events,news,economicEvents,macro:{...market.macro,snapshotAsOf:marketSnapshot().asOf},uncovered:symbols.slice(12),sources:market.sources,note:'Quotes are context only and do not revalue imported holdings. Event dates can change. A future call has no completed transcript here. No buy/sell recommendations.'};
}

// Budget categories from the dashboard's spending editor. Housing-style fixed costs are bills; the rest are
// everyday spending. Debt minimums stay on the user's debts. Values are exact cents; nothing else changes.
export function savePlan(input, previous = {}) {
  const rows = Array.isArray(input.categories) ? input.categories.slice(0, 25) : null;
  if (!rows) throw Error('Send the spending categories to save.');
  const clean = [];
  for (const r of rows) {
    const name = String(r?.name ?? '').trim().slice(0, 40), value = String(r?.amount ?? '').trim();
    if (!name) throw Error('Each category needs a name.');
    if (!/^\d+(\.\d{1,2})?$/.test(value) || value.length > 16) throw Error(`Enter ${name} as a dollar amount, including 0 when none.`);
    clean.push({name, amount: value, fixed: Boolean(r.fixed)});
  }
  const next = {...previous, bills: clean.filter(r => r.fixed).map(({name, amount}) => ({name, amount})), expenses: clean.filter(r => !r.fixed).map(({name, amount}) => ({name, amount}))};
  if (Array.isArray(input.debts)) next.debts = input.debts.slice(0, 25).map(d => ({name: String(d?.name ?? 'Debt').slice(0, 40), balance: String(d?.balance ?? ''), rateBps: d?.rateBps, minPayment: String(d?.minPayment ?? '')}));
  if (Array.isArray(input.incomeHistory)) {
    next.incomeHistory = input.incomeHistory.slice(0, 12).filter(x => String(x?.amount ?? '').trim() !== '').map(x => {
      const month = String(x.month || ''), value = String(x.amount).trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Each income entry needs a month.');
      if (!/^\d+(\.\d{1,2})?$/.test(value)) throw Error(`Enter income for ${month} as a dollar amount.`);
      return {month, amount: value};
    }).sort((a, b) => a.month.localeCompare(b.month));
  }
  if (input.income !== undefined) {
    const month = String(input.month || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw Error('Choose the month for this take-home income.');
    next.incomeHistory = [...(previous.incomeHistory || []).filter(x => x.month !== month), {month, amount: String(input.income)}].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  }
  if (input.savings !== undefined) next.savings = String(input.savings);
  const {profile, errors} = normalizeProfile(next);
  if (errors.length) throw Error(errors.map(e => e.error).join(' '));
  return {...previous, ...profile};
}

// What-if: trim one holding to a target share and hold the proceeds as cash. Runs the same risk engine on the
// changed copy; the saved holdings are never modified. Returns both reviews for side-by-side comparison.
export function whatIf(portfolio, guideline, {symbol, toPercent, positionLimit} = {}) {
  const total = Number(portfolio?.marketValue);
  if (!(total > 0)) throw Error('Import holdings to explore a scenario.');
  const sym = String(symbol || '').toUpperCase(), target = Number(toPercent);
  const holding = (portfolio.securities || []).find(h => String(h.name).toUpperCase() === sym);
  if (!holding) throw Error('Choose a holding from your portfolio.');
  if (!Number.isFinite(target) || target < 0 || target > 100) throw Error('Target share must be between 0% and 100%.');
  const currentCents = minor(String(holding.value)), totalCents = minor(String(portfolio.marketValue));
  const targetCents = BigInt(Math.round(Number(totalCents) * target / 100));
  const released = currentCents > targetCents ? currentCents - targetCents : 0n;
  const securities = portfolio.securities.map(h => String(h.name).toUpperCase() === sym ? {...h, value: amount(currentCents - released)} : h);
  const cashIndex = securities.findIndex(h => /^(CASH|USD|US DOLLAR)$/i.test(h.name));
  if (released > 0n) {
    if (cashIndex >= 0) securities[cashIndex] = {...securities[cashIndex], value: amount(minor(String(securities[cashIndex].value)) + released)};
    else securities.push({name: 'CASH', value: amount(released), sector: 'Cash'});
  }
  const positions = (portfolio.positions || []).map(p => String(p.symbol).toUpperCase() === sym && released > 0n ? {...p, marketValue: amount(minor(String(p.marketValue)) - released), quantity: null, costBasis: null} : p);
  const after = {...portfolio, securities, positions};
  const limit = Number(positionLimit);
  const rules = Number.isFinite(limit) && limit >= 1 && limit <= 100 ? {...(guideline || {}), maxPositionPercent: limit} : guideline;
  return {symbol: sym, fromPercent: Number(currentCents) / Number(totalCents) * 100, toPercent: target, cashReleased: amount(released), positionLimit: rules?.maxPositionPercent ?? null,
    before: analyzePortfolio(portfolio, rules), after: analyzePortfolio(after, rules), note: 'Scenario only. Your saved holdings are unchanged. Trimmed value is held as cash; no trade is placed.'};
}
