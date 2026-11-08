import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';process.env.MARKET_LIVE='0';
const {createServer}=await import('../server.js');
const store=await import('../lib/store.js');
const {demoWorkspace}=await import('../lib/workspace-demo.js');
test('demo chat receives shared fictional dashboard context without overwriting personal inputs',async()=>{
 const demo=demoWorkspace();assert.equal(demo.budget.snapshot.lowestMonth,'5200.00');assert.equal(demo.budget.monthlyBalance,'1550.00');assert.equal(demo.review.marketValue,'119687.00');
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const sid='shared-demo-chat-test';const base='http://127.0.0.1:'+server.address().port;const headers={'Content-Type':'application/json','X-Session-Id':sid};
 try{
  const send=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(r.status,200);return r.json();};
  await send('/api/workspace/budget',{month:'2026-11',income:'1234.56',bills:'500',spending:'100',savings:'10',cashCushion:'50'});
  const before=structuredClone(store.session(sid).profile);
  const answer=await send('/api/chat',{message:'Summarize this budget.',personaId:'debt-free-coach',agentId:'budget',demoProfile:true});
  assert.equal(answer.demoProfile,true);assert.equal(answer.profileUpdated,false);
  assert.deepEqual(store.session(sid).profile,before);
  assert.match(store.session(sid).messages.at(-2).content,/fictional Alex Morgan/);
  assert.match(store.session(sid).messages.at(-2).content,/costs \$3650/);
  assert.equal(store.session(sid).history.at(-2).text,'Summarize this budget.');
 }finally{await new Promise(r=>server.close(r));}
});
