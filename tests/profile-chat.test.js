import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='live';process.env.MENTOR_API_KEY='test-only';
const {applyProfileUpdates,extractProfileUpdates}=await import('../lib/profile-chat.js');
const {normalizeProfile,snapshot}=await import('../lib/profile.js');
const {setClient}=await import('../lib/mentor/llm.js');
const {createServer}=await import('../server.js');
const store=await import('../lib/store.js');
const baseProfile=()=>({...normalizeProfile({incomeHistory:[{month:'2026-10',amount:'3000'}],bills:[{name:'Rent',amount:'1000',dueDay:1}],savings:'500'}).profile,documents:[{name:'notes',text:'Keep'}],portfolio:{marketValue:'1234.00'}});
const update=(field,target,value,evidence,remove=false)=>({field,target,value,evidence,remove});
test('corrections replace exact fields, preserve attachments and recalculate snapshot',()=>{
 const p=baseProfile(), message='My rent is now $1500 and savings are $900.';
 const r=applyProfileUpdates(p,[update('bills','Rent','1500',message),update('savings','','900',message)],message);
 assert.equal(r.profile.bills[0].amount,'1500.00');assert.equal(r.profile.bills[0].dueDay,1);
 assert.equal(snapshot(r.profile).lowestMonthLeftover,'1500.00');assert.equal(r.profile.savings,'900.00');
 assert.deepEqual(r.profile.documents,p.documents);assert.deepEqual(r.profile.portfolio,p.portfolio);assert.equal(p.bills[0].amount,'1000.00');
});
test('invalid, unsupported and incomplete updates fail atomically',()=>{
 const p=baseProfile();
 for(const u of [update('bills','Rent','-1','change'),update('savings','','5','not in message'),update('tier','','plus','change'),update('debts.balance','Card','100','change')]) assert.throws(()=>applyProfileUpdates(p,[u],'change'));
 assert.equal(p.savings,'500.00');
});
test('month corrections preserve other months; explicit removal clears derived income',()=>{
 const p=baseProfile(); const r=applyProfileUpdates(p,[update('incomeHistory','2026-09','2000','pay')],'pay');
 assert.equal(r.profile.incomeMonthly,'2500.00');assert.equal(r.profile.incomeHistory.length,2);
 const cleared=applyProfileUpdates(p,[update('incomeHistory','2026-10','','remove',true)],'remove');assert.equal(cleared.profile.incomeMonthly,undefined);
});
test('extractor preserves profile on hypotheticals and asks on ambiguous aggregate changes',async()=>{
 const p=baseProfile();
 for(const clarification of ['', 'What is your new total for fixed bills?']) {
 const r=await extractProfileUpdates({profile:p,message:'What if rent was 2000?',call:async()=>({data:{updates:[],clarification}})});
 assert.deepEqual(r.profile,p);assert.equal(r.changes.length,0);
 }
});
test('HTTP chat saves corrections before generation, survives reload, and protects stale requests',async()=>{
 let hold,release;let pause=false;
 const response=data=>({content:[{type:'text',text:JSON.stringify(data)}],stop_reason:'end_turn',usage:{}});
 const create=async params=>{
   if(params.output_config.format.schema.properties.updates) {
     const input=JSON.parse(params.messages[0].content);
     if(pause) { hold?.(); await new Promise(r=>release=r); }
     return response({updates:input.latestMessage.includes('rent')?[update('bills','Rent','1500',input.latestMessage)]:[],clarification:''});
   }
   assert.equal(store.session('profile-chat-test-session-01').profile.bills[0].amount,'1500.00','saved before generating reply');
   return response({kind:'conversation',reply:'Thanks for the update.',noteIds:[]});
 };
 setClient({messages:{create},beta:{messages:{create}}});
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`,headers={'Content-Type':'application/json','X-Session-Id':'profile-chat-test-session-01'};
 const post=(path,body)=>fetch(url+path,{method:'POST',headers,body:JSON.stringify(body)});
 try {
   await post('/api/profile',{answers:baseProfile()});
   const r=await post('/api/chat',{message:'My rent is now $1500',personaId:'value-investor'});assert.equal(r.status,200);assert.equal((await r.json()).profileUpdated,true);
   const saved=await (await fetch(url+'/api/profile',{headers})).json();assert.equal(saved.profile.bills[0].amount,'1500.00');assert.equal(saved.snapshot.essentialsTotal,'1500.00');
   pause=true;const waiting=new Promise(r=>hold=r);const pending=post('/api/chat',{message:'My rent is now $1500'});await waiting;
   await post('/api/profile',{answers:{...baseProfile(),bills:[{name:'Rent',amount:'1800'}]}});release();assert.equal((await pending).status,409);
   assert.equal((await (await fetch(url+'/api/profile',{headers})).json()).profile.bills[0].amount,'1800.00');
 } finally {server.close();}
});

test('new ongoing take-home replaces the obsolete planning baseline',()=>{ const r=applyProfileUpdates(baseProfile(),[update('monthlyTakeHome','','4200','My take-home is now 4200 monthly')],'My take-home is now 4200 monthly'); assert.equal(r.profile.incomeMonthly,'4200.00'); assert.equal(snapshot(r.profile).lowestMonth,'4200.00'); });
