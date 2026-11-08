// Display-only examples. This module never reads or writes a user session.
import fs from 'node:fs';
const SENTINEL=JSON.parse(fs.readFileSync(new URL('./market/sentinel-source.json',import.meta.url),'utf8'));
import {summarizePortfolioCSV} from './portfolio.js';
import {workspaceOverview} from './workspace.js';
import {minor,amount} from './finance.js';
import {snapshot} from './market/providers.js';
import {snapshotMarket} from './market/sentinel.js';
// Sample data shown until a user adds their own. Holdings mirror the Sentinel demo; budget mirrors the approved dashboard concept.
export const SAMPLE_HOLDINGS=[['NVDA',120,95],['AAPL',40,185],['MSFT',25,410],['AVGO',40,160],['AMZN',35,180],['GOOGL',30,160],['JPM',25,210],['META',12,480],['JNJ',20,155],['TSLA',15,240],['XOM',30,112],['BTC',0.08,62000],['ETH',1.5,2600]];
export const SAMPLE_INCOME=[['2026-06','4800.00'],['2026-07','5000.00'],['2026-08','5100.00'],['2026-09','4900.00'],['2026-10','5100.00'],['2026-11','5200.00']];
export function demoWorkspace(){
 const source=snapshot();
 // The Sentinel sample portfolio (shares and average cost), valued at the dated snapshot price in exact cents.
 const rows=SAMPLE_HOLDINGS.map(([symbol,quantity,averageCost])=>{const price=(source.tickers[symbol]||source.crypto[symbol]||Object.values(SENTINEL.crypto).find(c=>c.symbol?.toUpperCase()===symbol)).price;return `${symbol},${quantity},${price},${averageCost}`;});
 const portfolio=summarizePortfolioCSV(['symbol,quantity,price,average_cost',...rows].join('\n'));
 Object.assign(portfolio,{source:'sample_synthetic',snapshotId:'automatic-preview-portfolio',asOf:source.asOf,importedAt:null});
 const profile={incomeHistory:SAMPLE_INCOME.map(([month,amount])=>({month,amount})),bills:[{name:'Housing',amount:'1600.00'}],expenses:[{name:'Food',amount:'550.00'},{name:'Transport',amount:'350.00'},{name:'Lifestyle',amount:'450.00'}],debts:[{name:'Credit card',balance:'8400.00',rateBps:2290,minPayment:'700.00'}],savings:'10600.00',portfolio};
 const guidelines={version:1,maxPositionPercent:10,maxSectorPercent:30,maxTop5Percent:50,maxCryptoPercent:5,maxBeta:1.15,maxVolatilityPercent:22,maxDrawdownPercent:20,maxPE:60,minHoldings:12,earningsWindowDays:14,maxLossFromCostPercent:20,maxFromHighPercent:30,maxCorrelation:.8};
 const result=workspaceOverview({profile,budgetPreferences:{cashCushion:'16640.00'},guidelines:{effective:guidelines}}),market=snapshotMarket();
 const holdings=portfolio.securities.map(h=>{const m=market.bySymbol[h.name]||{};return{symbol:h.name,price:m.price??null,priceAsOf:source.asOf,priceSource:'dated sample snapshot',nextEarnings:m.nextEarnings||null};});
 const events=holdings.filter(h=>h.nextEarnings?.date).map(h=>({...h.nextEarnings,symbol:h.symbol,source:'dated sample snapshot',sourceAsOf:source.asOf}));
 const news=source.news.filter(n=>n.tickers?.some(t=>holdings.some(h=>h.symbol===t))).filter(n=>{try{return ['http:','https:'].includes(new URL(n.url).protocol);}catch{return false;}}).map(n=>({...n,symbol:n.tickers.find(t=>holdings.some(h=>h.symbol===t)),provider:'dated sample snapshot',providerAsOf:source.asOf}));
 return structuredClone({...result,demo:true,note:'Illustrative sample only. Never saved as your inputs or sent to your teacher as your personal finances.',marketContext:{demo:true,snapshotId:portfolio.snapshotId,riskAnalysis:result.advancedRisk,holdings,events,news,economicEvents:(source.events||[]).map(e=>({...e,source:'dated sample snapshot',sourceAsOf:source.asOf})),macro:{...source.macro,snapshotAsOf:source.asOf},sources:['dated sample snapshot'],uncovered:[],windowDays:14,windowSource:'Example guideline; sample calendar dates',note:'Display-only example using dated snapshot data. These are not your holdings, quotes or upcoming events.'}});
}
