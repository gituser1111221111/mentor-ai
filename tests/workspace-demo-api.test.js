import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';process.env.MARKET_LIVE='0';
const {createServer}=await import('../server.js');
test('automatic dashboard examples never replace personal session data',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const headers={'Content-Type':'application/json','X-Session-Id':'display-only-demo-test-01'};
 const req=async(path,body)=>{const r=await fetch(base+path,{headers,method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});assert.equal(r.status,200);return r.json();};
 try{
  const demo=await req('/api/workspace/demo');assert.equal(demo.demo,true);assert.equal(demo.budget.ready,true);assert.ok(demo.profile.portfolio.securities.length>0);
  const empty=await req('/api/workspace');assert.equal(empty.budget.ready,false);assert.equal(empty.profile,null);
  await req('/api/workspace/budget',{month:'2026-11',income:'1234.56',bills:'500',spending:'100',savings:'10',cashCushion:'50'});
  await req('/api/portfolio/upload',{csv:'symbol,value\nAAPL,234.56'});
  await req('/api/workspace/demo');const real=await req('/api/workspace');
  assert.equal(real.budget.snapshot.lowestMonth,'1234.56');assert.equal(real.review.marketValue,'234.56');assert.equal(real.profile.portfolio.source,'csv_upload');assert.equal(real.profile.portfolio.securities.length,1);
 }finally{await new Promise(r=>server.close(r));}
});
