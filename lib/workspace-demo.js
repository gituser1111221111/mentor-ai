// Display-only examples. This module never reads or writes a user session.
import fs from 'node:fs';
import {summarizePortfolioCSV} from './portfolio.js';
import {workspaceOverview} from './workspace.js';
import {minor,amount} from './finance.js';
import {snapshot} from './market/providers.js';
import {snapshotMarket} from './market/sentinel.js';
export function demoWorkspace(){
 const source=snapshot(),portfolio=summarizePortfolioCSV(fs.readFileSync(new URL('../data/demo_portfolio.csv',import.meta.url),'utf8').split(/\r?\n/).filter(line=>!line.startsWith('BTC,')).join('\n'));
 for(const position of portfolio.positions)position.costBasis=amount(minor(position.marketValue)*9n/10n);
 Object.assign(portfolio,{source:'sample_synthetic',snapshotId:'automatic-preview-portfolio',asOf:source.asOf,importedAt:null});
 const profile={incomeHistory:[{month:'2026-09',amount:'3200.00'},{month:'2026-10',amount:'3000.00'},{month:'2026-11',amount:'3400.00'}],bills:[{name:'Example fixed bills',amount:'1400.00'}],expenses:[{name:'Example everyday spending',amount:'600.00'}],debts:[{name:'Example loan',balance:'4500.00',rateBps:700,minPayment:'150.00'}],savings:'1800.00',portfolio};
 const guidelines={version:1,maxPositionPercent:10,maxSectorPercent:30,maxTop5Percent:50,maxCryptoPercent:5,maxBeta:1.15,maxVolatilityPercent:22,maxDrawdownPercent:20,maxPE:60,minHoldings:12,earningsWindowDays:14,maxLossFromCostPercent:20,maxFromHighPercent:30,maxCorrelation:.8};
 const result=workspaceOverview({profile,budgetPreferences:{cashCushion:'6000.00'},guidelines:{effective:guidelines}}),market=snapshotMarket();
 const holdings=portfolio.securities.map(h=>{const m=market.bySymbol[h.name]||{};return{symbol:h.name,price:m.price??null,priceAsOf:source.asOf,priceSource:'dated sample snapshot',nextEarnings:m.nextEarnings||null};});
 const events=holdings.filter(h=>h.nextEarnings?.date).map(h=>({...h.nextEarnings,symbol:h.symbol,source:'dated sample snapshot',sourceAsOf:source.asOf}));
 const news=source.news.filter(n=>n.tickers?.some(t=>holdings.some(h=>h.symbol===t))).filter(n=>{try{return ['http:','https:'].includes(new URL(n.url).protocol);}catch{return false;}}).map(n=>({...n,symbol:n.tickers.find(t=>holdings.some(h=>h.symbol===t)),provider:'dated sample snapshot',providerAsOf:source.asOf}));
 return structuredClone({...result,demo:true,note:'Illustrative sample only. Never saved as your inputs or sent to your teacher as your personal finances.',marketContext:{demo:true,snapshotId:portfolio.snapshotId,riskAnalysis:result.advancedRisk,holdings,events,news,economicEvents:(source.events||[]).map(e=>({...e,source:'dated sample snapshot',sourceAsOf:source.asOf})),macro:{...source.macro,snapshotAsOf:source.asOf},sources:['dated sample snapshot'],uncovered:[],windowDays:14,windowSource:'Example guideline; sample calendar dates',note:'Display-only example using dated snapshot data. These are not your holdings, quotes or upcoming events.'}});
}
