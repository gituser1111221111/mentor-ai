// Shared fictional demo profile (Alex Morgan) for the dashboards and for teacher chat when the visitor has
// not added their own numbers. Never reads or writes a user session.
import fs from 'node:fs';
import {summarizePortfolioCSV} from './portfolio.js';
import {workspaceOverview} from './workspace.js';
import {minor,amount} from './finance.js';
import {snapshot} from './market/providers.js';
import {snapshotMarket} from './market/sentinel.js';
const SENTINEL=JSON.parse(fs.readFileSync(new URL('./market/sentinel-source.json',import.meta.url),'utf8'));

// Holdings mirror the Sentinel demo (shares and average cost), valued at the dated snapshot price in exact
// cents, so every risk metric has a full year of weekly history. Budget mirrors the approved concept.
export const SAMPLE_HOLDINGS=[['NVDA',120,95],['AAPL',40,185],['MSFT',25,410],['AVGO',40,160],['AMZN',35,180],['GOOGL',30,160],['JPM',25,210],['META',12,480],['JNJ',20,155],['TSLA',15,240],['XOM',30,112],['BTC',0.08,62000],['ETH',1.5,2600]];

export function demoWorkspace(){
 const source=snapshot();
 const rows=SAMPLE_HOLDINGS.map(([symbol,quantity,averageCost])=>{const price=(source.tickers[symbol]||source.crypto[symbol]||Object.values(SENTINEL.crypto).find(c=>c.symbol?.toUpperCase()===symbol)).price;return `${symbol},${quantity},${price},${averageCost}`;});
 const portfolio=summarizePortfolioCSV(['symbol,quantity,price,average_cost',...rows].join('\n'));
 Object.assign(portfolio,{source:'sample_synthetic',snapshotId:'mentor-alex-demo-v2',asOf:source.asOf,importedAt:null,importNote:'Fictional Alex Morgan demo holdings. Market history is dated context, not actual account performance.'});
 const profile={demoIdentity:{name:'Alex Morgan',fictional:true},incomeHistory:[{month:'2026-06',amount:'5200.00'},{month:'2026-07',amount:'5300.00'},{month:'2026-08',amount:'5400.00'},{month:'2026-09',amount:'5250.00'},{month:'2026-10',amount:'5450.00'},{month:'2026-11',amount:'5500.00'}],bills:[{name:'Housing',amount:'1600.00'}],expenses:[{name:'Food',amount:'550.00'},{name:'Transport',amount:'350.00'},{name:'Lifestyle',amount:'450.00'}],debts:[{name:'Credit card',balance:'6040.00',rateBps:2149,minPayment:'300.00'},{name:'Auto loan',balance:'8400.00',rateBps:625,minPayment:'250.00'},{name:'Student loan',balance:'2200.00',rateBps:475,minPayment:'150.00'}],savings:'10600.00',portfolio};
 const guidelines={version:1,maxPositionPercent:10,maxSectorPercent:30,maxTop5Percent:50,maxCryptoPercent:5,maxBeta:1.15,maxVolatilityPercent:22,maxDrawdownPercent:20,maxPE:60,minHoldings:12,earningsWindowDays:14,maxLossFromCostPercent:20,maxFromHighPercent:30,maxCorrelation:.8};
 const result=workspaceOverview({profile,budgetPreferences:{cashCushion:'16640.00'},guidelines:{effective:guidelines}}),market=snapshotMarket();
 const holdings=portfolio.securities.map(h=>{const m=market.bySymbol[h.name]||{};return{symbol:h.name,price:m.price??null,priceAsOf:source.asOf,priceSource:'dated sample snapshot',nextEarnings:m.nextEarnings||null};});
 const events=holdings.filter(h=>h.nextEarnings?.date).map(h=>({...h.nextEarnings,symbol:h.symbol,source:'dated sample snapshot',sourceAsOf:source.asOf}));
 const news=source.news.filter(n=>n.tickers?.some(t=>holdings.some(h=>h.symbol===t))).filter(n=>{try{return ['http:','https:'].includes(new URL(n.url).protocol);}catch{return false;}}).map(n=>({...n,symbol:n.tickers.find(t=>holdings.some(h=>h.symbol===t)),provider:'dated sample snapshot',providerAsOf:source.asOf}));
 return structuredClone({...result,demo:true,note:'Fictional Alex Morgan demo profile shared with your teacher. Never saved as your personal finances.',marketContext:{demo:true,snapshotId:portfolio.snapshotId,riskAnalysis:result.advancedRisk,holdings,events,news,economicEvents:(source.events||[]).map(e=>({...e,source:'dated sample snapshot',sourceAsOf:source.asOf})),macro:{...source.macro,snapshotAsOf:source.asOf},sources:['dated sample snapshot'],uncovered:[],windowDays:14,windowSource:'Example guideline; sample calendar dates',note:'Display-only example using dated snapshot data. These are not your holdings, quotes or upcoming events.'}});
}

// The note added to a demo chat message, built from the same computed figures the dashboard shows.
export function demoContext(d=demoWorkspace()){
 const s=d.budget.snapshot,p=d.profile.portfolio,cost=(p.positions||[]).reduce((t,x)=>t+(x.costBasis?minor(x.costBasis):0n),0n),value=minor(p.marketValue);
 const top=(d.advancedRisk.rows||[]).filter(r=>!r.isCash).slice(0,3).map(r=>r.symbol).join(', ');
 return `Demo context: The dashboards show fictional Alex Morgan, not the visitor. Answer questions such as "summarize this" using this shared fictional profile. Do not ask for imports. Do not treat these figures as the visitor's real finances. The monthly plan uses lowest saved income $${s.lowestMonth}, costs $${s.essentialsTotal}, available $${d.budget.monthlyBalance}, current cash $${s.savings} and cash cushion goal $${d.budget.cashCushion}. The portfolio value is $${p.marketValue} with $${amount(cost)} cost basis and $${amount(value-cost)} unrealized gain across ${p.securities.length} holdings, largest ${top}. For a generic summary, cover BOTH budget and portfolio. Discuss portfolio metrics from the provided profile; historical returns are current-mix backcasts.`;
}
