import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';process.env.MARKET_LIVE='0';
const {saveBudget,budgetOverview,portfolioWatch}=await import('../lib/workspace.js');
const {draftGuideline,reviewPortfolio,simulatePortfolio}=await import('../lib/guidelines.js');
const {marketCalcs}=await import('../lib/market/review.js');
const {clearMarketCache,snapshot:marketSnapshot}=await import('../lib/market/providers.js');
const {createServer}=await import('../server.js');
const store=await import('../lib/store.js');
const inputs={month:'2026-11',income:'2000.01',bills:'1000',spending:'500',savings:'200',cashCushion:'600'};
test('budget builder preserves debt and documents and reconciles monthly balance in cents',()=>{
 const prev={debts:[{name:'Card',balance:'1000.00',rateBps:1000,minPayment:'75.01'}],documents:[{name:'notes.md',text:'context'}],portfolio:{marketValue:'12.00'}};
 const saved=saveBudget(inputs,prev),view=budgetOverview(saved.profile,saved.budgetPreferences);
 assert.equal(view.monthlyBalance,'425.00');assert.equal(view.reserveGap,'400.00');assert.deepEqual(saved.profile.documents,prev.documents);assert.equal(saved.profile.debts[0].minPayment,'75.01');assert.equal(saved.profile.portfolio.marketValue,'12.00');assert.equal(prev.incomeHistory,undefined);
 const low=saveBudget({...inputs,month:'2026-12',income:'1000'},saved.profile);assert.equal(budgetOverview(low.profile,low.budgetPreferences).monthlyBalance,'-575.01');
});
test('budget fields require explicit amounts and do not turn unknowns into zero',()=>{
 for(const income of ['',null,100,'-1','Infinity','1.001'])assert.throws(()=>saveBudget({...inputs,income}));
 assert.throws(()=>saveBudget({...inputs,month:'2026-13'}));assert.equal(budgetOverview(null,null).monthlyBalance,null);assert.equal(budgetOverview(null,null).reserveGap,null);
});
test('personal multi-metric guidelines flag real breaches and missing sector coverage',()=>{
 const rule={...draftGuideline({maxPositionPercent:60,maxSectorPercent:50,maxTop5Percent:70,minHoldings:3,earningsWindowDays:30}),version:1};
 const portfolio={marketValue:'1000',securities:[{name:'A',value:'700'},{name:'B',value:'300'}],sectors:[{name:'Technology',value:'1000'}]};
 const r=reviewPortfolio(portfolio,rule);assert.equal(r.breaches.length,4);
 const unknown=reviewPortfolio({...portfolio,sectors:[{name:'Unknown',value:'1000'}]},rule);assert.deepEqual(unknown.unknownChecks,['sector-coverage']);
 const scenario=simulatePortfolio(portfolio,rule);assert.equal(scenario.reconciliation.difference,'0.00');assert.ok(scenario.after.unknownChecks.includes('sector-coverage'));assert.ok(scenario.after.breaches.some(c=>c.id==='top-five'));
 for(const bad of [{minHoldings:1.5},{earningsWindowDays:366},{maxSectorPercent:0},{maxTop5Percent:'90'}])assert.throws(()=>draftGuideline({maxPositionPercent:50,...bad}));
});
test('market watch keeps imported valuation distinct, limits coverage, and filters elapsed events',async()=>{
 const portfolio={snapshotId:'import-a',marketValue:'999.00',securities:[{name:'NVDA',value:'999.00'}]};
 const before=JSON.stringify(portfolio),r=await portfolioWatch(portfolio,{earningsWindowDays:30},{today:'2026-11-07'});
 assert.equal(r.snapshotId,'import-a');assert.equal(r.holdings[0].priceSource,'snapshot');assert.equal(r.windowSource,'Your saved guideline');assert.equal(JSON.stringify(portfolio),before);assert.ok(r.events.every(e=>e.days>=0&&e.days<=30&&!e.transcriptAvailable));
 const later=await portfolioWatch(portfolio,null,{today:'2099-01-01'});assert.deepEqual(later.events,[]);
 const many=await portfolioWatch({...portfolio,securities:Array.from({length:14},(_,i)=>({name:'TEST'+i,value:'1'}))},null);assert.equal(many.holdings.length,12);assert.equal(many.uncovered.length,2);
});
test('teacher market calculations use saved personal limits instead of illustrative defaults',async()=>{
 const p={portfolio:{securities:[{name:'NVDA',value:'90'},{name:'AAPL',value:'10'}]},portfolioGuidelines:{version:7,maxPositionPercent:95,earningsWindowDays:7}};
 const r=await marketCalcs(p,'investing');const c=r.calcs.find(c=>c.id==='pf_concentration');assert.equal(c.result.singlePositionLimitPercent,'95');assert.equal(c.result.sectorLimitPercent,null);assert.deepEqual(c.result.positionsOverLimit,[]);assert.equal(c.result.guidelineVersion,7);
 assert.equal(r.calcs.find(c=>c.id==='pf_earnings').inputs.windowDays,7);
});

test('dashboard context keeps snapshot sector/news dates separate from fresh quotes',async()=>{
 const previous={live:process.env.MARKET_LIVE,key:process.env.FINNHUB_API_KEY};
 process.env.MARKET_LIVE='1';process.env.FINNHUB_API_KEY='dashboard-test-key';clearMarketCache();
 const fetcher=async url=>({ok:true,json:async()=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/quote'))return {c:123.45,t:Date.parse('2026-11-07T12:00:00Z')/1000};
  if(path.endsWith('/company-news'))return ['https://example.com/news','javascript:alert(1)','data:text/html,unsafe'].map(url=>({headline:'Source-backed headline',source:'Example publisher',url,datetime:Date.parse('2026-11-07T10:00:00Z')/1000}));
  return {};
 }});
 try{
  const portfolio={snapshotId:'dated-dashboard',securities:[{name:'NVDA',value:'999.00'},{name:'UNLISTED',value:'1.00'}]};
  const result=await portfolioWatch(portfolio,null,{today:'2026-11-07',fetcher});
  const holding=result.holdings.find(h=>h.symbol==='NVDA');
  assert.equal(holding.priceSource,'Finnhub');assert.equal(holding.priceAsOf,'2026-11-07');
  assert.equal(holding.sectorSource,'snapshot');assert.equal(holding.sectorAsOf,marketSnapshot().asOf);
  assert.equal(result.holdings.find(h=>h.symbol==='UNLISTED').sector,null);
  assert.equal(result.news[0].provider,'Finnhub');assert.equal(result.news[0].date,'2026-11-07');
  assert.equal(result.news[0].source,'Example publisher');
  assert.equal(holding.news.length,1);assert.ok(result.news.every(n=>new URL(n.url).protocol==='https:'));
  assert.equal(result.macro.snapshotAsOf,marketSnapshot().asOf);assert.ok(result.macro.asOfNotes.cpiYoY);
  assert.ok(result.economicEvents.every(e=>e.date>='2026-11-07'&&e.source==='snapshot'&&e.sourceAsOf===marketSnapshot().asOf));
  assert.equal(portfolio.securities[0].value,'999.00');
 }finally{
  for(const [key,value]of [['MARKET_LIVE',previous.live],['FINNHUB_API_KEY',previous.key]])if(value===undefined)delete process.env[key];else process.env[key]=value;
  clearMarketCache();
 }
});
test('workspace API saves only to its session and routes earnings questions behind the single chat',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const sid='workspace-owner-session-001',other='workspace-other-session-002';
 const req=(path,method='GET',body,id=sid)=>fetch(base+path,{method,headers:{'Content-Type':'application/json','X-Session-Id':id},body:body?JSON.stringify(body):undefined});
 try{
  assert.equal((await req('/api/workspace/budget','POST',inputs)).status,200);
  const own=await(await req('/api/workspace')).json();assert.equal(own.budget.monthlyBalance,'500.01');assert.equal((await(await req('/api/workspace','GET',null,other)).json()).budget.ready,false);
  await req('/api/portfolio/upload','POST',{sample:true});
  const chat=await(await req('/api/chat','POST',{personaId:'debt-free-coach',agentId:'budget',message:'Explain the upcoming earnings call for my holdings.'})).json();
  assert.equal(chat.agentId,'investing');
  const budgetTurn=await(await req('/api/chat','POST',{personaId:'debt-free-coach',agentId:'budget',message:'Explain my budget.'})).json();
  assert.ok(budgetTurn.turnId);
  const draft=await(await req('/api/portfolio/guidelines/draft','POST',{maxPositionPercent:20})).json();
  await req('/api/portfolio/guidelines/save','POST',{draftId:draft.id,userConfirmation:true});
  assert.equal((await req('/api/repick','POST',{turnId:budgetTurn.turnId,personaId:'debt-free-coach'})).status,409);
  await req('/api/session','DELETE');assert.equal(store.session(sid).budgetPreferences,undefined);
 }finally{await new Promise(r=>server.close(r));}
});
