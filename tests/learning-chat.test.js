import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';
const {createServer}=await import('../server.js');
const store=await import('../lib/store.js');
test('lesson chat shares the session while keeping study context out of displayed user history',async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const sid='lesson-chat-context-session',base='http://127.0.0.1:'+server.address().port;
 const headers={'Content-Type':'application/json','X-Session-Id':sid};
 try{
  const r=await fetch(base+'/api/chat',{method:'POST',headers,body:JSON.stringify({message:'Explain the main idea.',personaId:'debt-free-coach',agentId:'budget',learningModuleId:'budgeting'})});
  assert.equal(r.status,200);assert.match(store.session(sid).messages.find(m=>m.role==='user').content,/Current learning module: Budgeting/);
  const history=await(await fetch(base+'/api/history',{headers})).json();assert.equal(history.history.find(m=>m.role==='user').text,'Explain the main idea.');
 }finally{await new Promise(r=>server.close(r));}
});
