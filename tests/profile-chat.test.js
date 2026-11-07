import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='live';process.env.MENTOR_API_KEY='test-only';
const {applyProfileUpdates,extractProfileUpdates,partialProfileReply}=await import('../lib/profile-chat.js');
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
test('invalid and unsupported updates fail atomically',()=>{
 const p=baseProfile();
 for(const u of [update('bills','Rent','-1','change'),update('savings','','5','not in message'),update('tier','','plus','change')]) assert.throws(()=>applyProfileUpdates(p,[u],'change'));
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
   const r=await post('/api/chat',{message:'My rent is now $1500',personaId:'value-investor'});assert.equal(r.status,200);const reply=await r.json();assert.equal(reply.profileUpdated,true);assert.equal(reply.text,'Thanks for the update.');
   const saved=await (await fetch(url+'/api/profile',{headers})).json();assert.equal(saved.profile.bills[0].amount,'1500.00');assert.equal(saved.snapshot.essentialsTotal,'1500.00');
   pause=true;const waiting=new Promise(r=>hold=r);const pending=post('/api/chat',{message:'My rent is now $1500'});await waiting;
   await post('/api/profile',{answers:{...baseProfile(),bills:[{name:'Rent',amount:'1800'}]}});release();assert.equal((await pending).status,409);
   assert.equal((await (await fetch(url+'/api/profile',{headers})).json()).profile.bills[0].amount,'1800.00');
 } finally {server.close();}
});

test('new ongoing take-home replaces the obsolete planning baseline',()=>{ const r=applyProfileUpdates(baseProfile(),[update('monthlyTakeHome','','4200','My take-home is now 4200 monthly')],'My take-home is now 4200 monthly'); assert.equal(r.profile.incomeMonthly,'4200.00'); assert.equal(snapshot(r.profile).lowestMonth,'4200.00'); });

test('fresh spoken intake saves partial debt and converts annual net income without guessing APR',async()=>{
 const message='I have $2500 debt, payment $100, ten percent monthly APY. I make $65000 a year after tax.';
 const updates=[update('debts.balance','Debt 1','2500',message),update('debts.minPayment','Debt 1','100',message),update('annualTakeHome','','65000',message)];
 const r=await extractProfileUpdates({profile:null,message,call:async()=>({data:{updates,clarification:'Annual APR or monthly?'}})});
 assert.equal(r.profile.incomeMonthly,'5416.67'); assert.equal(r.profile.pendingDebts[0].balance,'2500.00');assert.equal(r.profile.pendingDebts[0].rateBps,undefined);assert.equal(r.profile.debts.length,0);
 assert.equal(snapshot(r.profile).status,'incomplete');
 const answer=partialProfileReply(r.profile,r);assert.match(answer.text,/5,416.67/);assert.doesNotMatch(answer.text,/need a name|monthly take-home pay.*share/);
 const {unverifiedNumbers}=await import('../lib/mentor/validate.js');assert.deepEqual(unverifiedNumbers(answer.text,answer.calculations),[],'spoken reply amounts are verified');
 const second=await extractProfileUpdates({profile:r.profile,message:'It is 10% annual APR.',call:async()=>({data:{updates:[update('debts.rateBps','Debt 1','1000','10% annual APR')],clarification:''}})});
 assert.equal(second.profile.pendingDebts.length,0);assert.equal(second.profile.debts[0].balance,'2500.00');assert.equal(second.profile.debts[0].rateBps,1000);
 const follow=partialProfileReply(second.profile,second);assert.match(follow.text,/months, with/);assert.deepEqual(unverifiedNumbers(follow.text,follow.calculations),[]);
});


test('partial debt replies preserve the next clarification instead of repeating the rate-period question',()=>{
 const profile={pendingDebts:[{name:'Debt 1',balance:'2500.00',minPayment:'100.00'}],debts:[]};
 const clarification='That monthly rate exceeds this calculator supported range. What annual APR is printed on your card statement?';
 const reply=partialProfileReply(profile,{confirmed:false,changes:[],clarification},'monthly');
 assert.ok(reply.text.includes(clarification));
 assert.doesNotMatch(reply.text,/Is the interest rate an annual APR, or a monthly rate/);
});
