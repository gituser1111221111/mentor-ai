// Shared fictional demo profile for dashboards and explicitly requested demo chat. Never writes user data.
import {summarizePortfolioCSV} from './portfolio.js';
import {workspaceOverview} from './workspace.js';
import {snapshot} from './market/providers.js';
import {snapshotMarket} from './market/sentinel.js';
export function demoWorkspace(){
 const source=snapshot(),portfolio=summarizePortfolioCSV(`symbol,sector,market_value,cost_basis
NVDA,Information Technology,28800,16000
AAPL,Information Technology,24360,15000
MSFT,Information Technology,20160,13000
VTI,Broad Market,17940,14000
VEA,International Equity,28427,18480`);
 Object.assign(portfolio,{source:'sample_synthetic',snapshotId:'mentor-alex-demo-v1',asOf:source.asOf,importedAt:null,importNote:'Fictional Alex Morgan demo holdings. Market history is dated context, not actual account performance.'});
 const profile={demoIdentity:{name:'Alex Morgan',fictional:true},incomeHistory:[{month:'2026-06',amount:'5200.00'},{month:'2026-07',amount:'5300.00'},{month:'2026-08',amount:'5400.00'},{month:'2026-09',amount:'5250.00'},{month:'2026-10',amount:'5450.00'},{month:'2026-11',amount:'5500.00'}],bills:[{name:'Housing',amount:'1600.00'}],expenses:[{name:'Food',amount:'550.00'},{name:'Transport',amount:'350.00'},{name:'Lifestyle',amount:'450.00'}],debts:[{name:'Credit card',balance:'6040.00',rateBps:2149,minPayment:'300.00'},{name:'Auto loan',balance:'8400.00',rateBps:625,minPayment:'250.00'},{name:'Student loan',balance:'2200.00',rateBps:475,minPayment:'150.00'}],savings:'10600.00',portfolio};
 const guidelines={version:1,maxPositionPercent:10,maxSectorPercent:30,maxTop5Percent:50,maxCryptoPercent:5,maxBeta:1.15,maxVolatilityPercent:22,maxDrawdownPercent:20,maxPE:60,minHoldings:12,earningsWindowDays:14,maxLossFromCostPercent:20,maxFromHighPercent:30,maxCorrelation:.8};
 const result=workspaceOverview({profile,budgetPreferences:{cashCushion:'16640.00'},guidelines:{effective:guidelines}}),market=snapshotMarket();
 const holdings=portfolio.securities.map(h=>{const m=market.bySymbol[h.name]||{};return{symbol:h.name,price:m.price??null,priceAsOf:source.asOf,priceSource:'dated sample snapshot',nextEarnings:m.nextEarnings||null};});
 const events=holdings.filter(h=>h.nextEarnings?.date).map(h=>({...h.nextEarnings,symbol:h.symbol,source:'dated sample snapshot',sourceAsOf:source.asOf}));
 const news=source.news.filter(n=>n.tickers?.some(t=>holdings.some(h=>h.symbol===t))).filter(n=>{try{return ['http:','https:'].includes(new URL(n.url).protocol);}catch{return false;}}).map(n=>({...n,symbol:n.tickers.find(t=>holdings.some(h=>h.symbol===t)),provider:'dated sample snapshot',providerAsOf:source.asOf}));
 return structuredClone({...result,demo:true,note:'Fictional Alex Morgan demo profile shared with your teacher. Never saved as your personal finances.',marketContext:{demo:true,snapshotId:portfolio.snapshotId,riskAnalysis:result.advancedRisk,holdings,events,news,economicEvents:(source.events||[]).map(e=>({...e,source:'dated sample snapshot',sourceAsOf:source.asOf})),macro:{...source.macro,snapshotAsOf:source.asOf},sources:['dated sample snapshot'],uncovered:[],windowDays:14,windowSource:'Example guideline; sample calendar dates',note:'Display-only example using dated snapshot data. These are not your holdings, quotes or upcoming events.'}});
}
