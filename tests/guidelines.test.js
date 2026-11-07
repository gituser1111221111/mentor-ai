import test from 'node:test';
import assert from 'node:assert/strict';
import {draftGuideline,saveGuideline,reviewPortfolio,simulatePortfolio} from '../lib/guidelines.js';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';
const {createServer}=await import('../server.js');
const portfolio={snapshotId:'snapshot-1',marketValue:'1000.01',securities:[{name:'AAPL',value:'750.01'},{name:'BND',value:'250.00'}]};
const draft=draftGuideline({maxPositionPercent:50});
const guideline=saveGuideline({drafts:[draft]},{draftId:draft.id,userConfirmation:true});
test('guideline draft requires approval, validates limits and keeps unknown data unknown',()=>{
  for(const maxPositionPercent of [NaN,Infinity,-1,0,101,1.111,'50'])assert.throws(()=>draftGuideline({maxPositionPercent}));
  assert.equal(draftGuideline({maxPositionPercent:33.33}).maxPositionPercent,33.33);
  assert.throws(()=>saveGuideline({drafts:[draft]},{draftId:draft.id}),/approval/);
  assert.throws(()=>saveGuideline({drafts:[]},{draftId:draft.id,userConfirmation:true}),/not found/);
  assert.equal(reviewPortfolio(null,guideline).checks[0].status,'unknown');
  assert.equal(reviewPortfolio(portfolio,null).checks[0].status,'unknown');
  assert.equal(reviewPortfolio({...portfolio,marketValue:'2000'},guideline).checks[0].status,'unknown');
  assert.match(reviewPortfolio(portfolio,guideline).coverage.priceFreshness,/Unknown/);
});
test('concentration uses exact cents, merges symbol casing and scenario reconciles without mutating baseline',()=>{
  const baseline=JSON.stringify(portfolio),review=reviewPortfolio(portfolio,guideline);
  assert.deepEqual(review.breaches.map(c=>c.symbol),['AAPL']);
  const simulated=simulatePortfolio(portfolio,guideline);
  assert.equal(simulated.cashAdded,'250.01');
  assert.equal(simulated.reconciliation.difference,'0.00');
  assert.deepEqual(simulated.after.breaches,[]);
  assert.equal(JSON.stringify(portfolio),baseline);
  const split={marketValue:'100',securities:[{name:'aapl',value:'40'},{name:'AAPL',value:'40'},{name:'BND',value:'20'}]};
  assert.equal(reviewPortfolio(split,guideline).breaches[0].percent,80);
});
test('guideline API scopes drafts, versions and scenarios to the session and latest import',async()=>{
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,method='GET',body,sid='guideline-session-owner-001')=>fetch(base+path,{method,headers:{'X-Session-Id':sid,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  try {
    const uploaded=await (await req('/api/portfolio/upload','POST',{csv:'symbol,market_value\nAAPL,750.01\nBND,250\n'})).json();
    const d=await (await req('/api/portfolio/guidelines/draft','POST',{maxPositionPercent:50})).json();
    assert.equal((await (await req('/api/portfolio/guidelines')).json()).effective,null);
    assert.equal((await req('/api/portfolio/guidelines/save','POST',{draftId:d.id})).status,400);
    assert.equal((await req('/api/portfolio/guidelines/save','POST',{draftId:d.id,userConfirmation:true},'guideline-session-other-001')).status,400);
    const effective=await (await req('/api/portfolio/guidelines/save','POST',{draftId:d.id,userConfirmation:true})).json();assert.equal(effective.version,1);
    const params={snapshotId:uploaded.snapshotId,guidelineVersion:effective.version};
    assert.equal((await req('/api/portfolio/simulate','POST',params)).status,200);
    assert.equal((await req('/api/portfolio/simulate','POST',params,'guideline-session-other-001')).status,409);
    assert.equal((await req('/api/portfolio/simulate','POST',{...params,guidelineVersion:2})).status,409);
    const saved=await (await req('/api/profile')).json();assert.equal(saved.profile.portfolio.marketValue,'1000.01');
    const d2=await (await req('/api/portfolio/guidelines/draft','POST',{maxPositionPercent:60})).json();
    await req('/api/portfolio/guidelines/draft','DELETE',{draftId:d2.id});
    assert.equal((await (await req('/api/portfolio/guidelines')).json()).effective.version,1);
    await req('/api/portfolio/upload','POST',{csv:'symbol,market_value\nAAPL,500\n'});
    assert.equal((await req('/api/portfolio/simulate','POST',params)).status,409);
    assert.equal((await (await req('/api/portfolio/review')).json()).breaches.length,1);
    await req('/api/session','DELETE');assert.equal((await (await req('/api/portfolio/guidelines')).json()).effective,null);
  } finally {await new Promise(r=>server.close(r));}
});
