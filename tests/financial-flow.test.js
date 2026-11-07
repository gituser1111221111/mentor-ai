import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='live';process.env.MENTOR_API_KEY='test-only';
process.env.ELEVENLABS_API_KEY='test-only';process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH='VoiceAudit000001';process.env.CHAT_LIMIT_PER_HOUR='1000';
const {setClient}=await import('../lib/mentor/llm.js');
const {createServer}=await import('../server.js');
const store=await import('../lib/store.js');
let speechCalls=0,delaySpeech=null,onSpeech=()=>{};
const fake=http.createServer(async(req,res)=>{for await(const _ of req){}speechCalls++;onSpeech();if(delaySpeech)await delaySpeech;res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end('ID3fixture');});
await new Promise(r=>fake.listen(0,'127.0.0.1',r));process.env.ELEVENLABS_BASE_URL=`http://127.0.0.1:${fake.address().port}`;
const app=createServer();await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
test.after(()=>{app.close();fake.close();});
const input=savings=>({incomeHistory:[{month:'2026-10',amount:'3000'}],bills:[{name:'Rent',amount:'1000'}],savings});
const post=(sid,path,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Id':sid},body:JSON.stringify(body)});
const textRes=data=>({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(data)}],usage:{}});
function model({kind='finance',reply='Keep $420.00 in savings.',needsInfo=null,onGenerate=async()=>{},onClassify=async()=>{}}={}){
 const calls=[];
 const create=async params=>{
  const content=params.messages[0].content;calls.push(content);
  if(content.includes('<coach>')){await onGenerate();return textRes({needsInfo,candidates:['Reserve','Budget','Review'].map(title=>({title,summary:'Keep the current savings available.',calcIds:['starter-ef'],risk:'low',tradeoffs:'Debt waits.',timeToGoalMonths:null}))});}
  if(content.includes('<options>'))return textRes({pickId:'c1',runnersUp:[],rationale:'Keep a buffer.',reply,whyNotOthers:'Other choices can wait.',noteIds:['029'],memoryFacts:[]});
  if(Boolean(params.output_config.format.schema.properties.kind)) {await onClassify();return textRes({kind,reply});}
  return textRes({reply});
 };setClient({messages:{create},beta:{messages:{create}}});return calls;
}
async function setup(id){await post(id,'/api/profile',{answers:input('420')});}

test('conversational and no-profile model amounts are checked before display or ElevenLabs',async()=>{
 for(const [id,kind,hasProfile] of [['audit-conversation-0001','conversation',true],['audit-general-00000001','finance',false]]){
  if(hasProfile)await setup(id);model({kind,reply:'Save $9999 tomorrow.'});
  const r=await (await post(id,'/api/chat',{message:'Help me budget'})).json();assert.doesNotMatch(r.text,/9999/);
  const audio=await post(id,'/api/voice/speak',{turnId:r.voiceTurnId,personaId:'debt-free-coach',voiceReplyId:r.voiceReplyId});assert.equal(audio.status,200);
 }
});
test('an appended model question cannot bypass the chosen reply validation',async()=>{
 const id='audit-followup-0000001';await setup(id);model({needsInfo:'Can you pay $9999 each week?'});
 const r=await (await post(id,'/api/chat',{message:'Help me budget'})).json();assert.doesNotMatch(r.text,/9999/);
});
test('a new unverified amount is not added to a stale profile or treated as calculated',async()=>{
 const id='audit-new-amount-00001';await setup(id);const calls=model();
 for (const message of ['I now earn $2000. What should I save?','I now earn two thousand each month. What should I save?']) {
  const r=await (await post(id,'/api/chat',{message})).json();
  assert.match(r.text,/update your financial details/i);assert.equal(calls.length,0);
 }
});
test('changed inputs during generation cannot restore a stale turn or speech receipt',async()=>{
 const id='audit-input-race-00001';await setup(id);
 let release,started;const waiting=new Promise(r=>release=r),begun=new Promise(r=>started=r);
 model({onGenerate:async()=>{started();await waiting;}});
 const pending=post(id,'/api/chat',{message:'Help me budget'});await begun;
 await post(id,'/api/profile',{answers:input('2000')});release();
 assert.equal((await pending).status,409);assert.deepEqual(store.session(id).turns,{});assert.deepEqual(store.session(id).replies,{});
});
test('a newer question wins over a slower older request',async()=>{
 const id='audit-question-race-001';await setup(id);
 let release,started,count=0;const waiting=new Promise(r=>release=r),begun=new Promise(r=>started=r);
 model({onGenerate:async()=>{if(++count===1){started();await waiting;}}});
 const pending=post(id,'/api/chat',{message:'Help me budget'});await begun;
 const latest=await post(id,'/api/chat',{message:'Should I save first?'});assert.equal(latest.status,200);const result=await latest.json();release();
 assert.equal((await pending).status,409);assert.equal(store.session(id).history.at(-1).response.turnId,result.turnId);
});
test('old cached audio and repicks are rejected after portfolio or attachment changes',async()=>{
 const id='audit-stale-cache-00001';await setup(id);model();
 const r=await (await post(id,'/api/chat',{message:'Help me budget'})).json();
 assert.equal((await post(id,'/api/voice/speak',{turnId:r.turnId,personaId:'debt-free-coach'})).status,200);
 const before=speechCalls;
 await post(id,'/api/attachment',{name:'updated.txt',base64:Buffer.from('New financial context').toString('base64')});
 assert.equal((await post(id,'/api/voice/speak',{turnId:r.turnId,personaId:'debt-free-coach'})).status,409);
 assert.equal((await post(id,'/api/repick',{turnId:r.turnId,personaId:'debt-free-coach'})).status,409);assert.equal(speechCalls,before);
});
test('the final speech boundary recomputes validation instead of trusting a cached ok flag',async()=>{
 const id='audit-last-boundary-001';await setup(id);model();const r=await (await post(id,'/api/chat',{message:'Help me budget'})).json();
 const record=store.session(id).replies[`${r.turnId}:debt-free-coach`];record.text='Save $9999 per week.';record.amountCheck=[];
 const before=speechCalls;
 assert.equal((await post(id,'/api/voice/speak',{turnId:r.turnId,personaId:'debt-free-coach'})).status,422);assert.equal(speechCalls,before);
});

test('an input change while synthesis is running prevents old audio from being returned',async()=>{
 const id='audit-synthesis-race-001';await setup(id);model();const r=await (await post(id,'/api/chat',{message:'Help me budget'})).json();
 let release,started;delaySpeech=new Promise(resolve=>release=resolve);const begun=new Promise(resolve=>started=resolve);onSpeech=started;
 try{
  const pending=post(id,'/api/voice/speak',{turnId:r.turnId,personaId:'debt-free-coach'});await begun;
  await post(id,'/api/profile',{answers:input('2000')});release();
  assert.equal((await pending).status,409);
 }finally{release();delaySpeech=null;onSpeech=()=>{};}
});

test('starting over with an empty profile still invalidates an in-flight general reply',async()=>{
 const id='audit-empty-reset-00001';
 let release,started;const waiting=new Promise(r=>release=r),begun=new Promise(r=>started=r);
 model({kind:'conversation',reply:'Hello there.',onClassify:async()=>{started();await waiting;}});
 const pending=post(id,'/api/chat',{message:'Hi'});await begun;
 await fetch(base+'/api/session',{method:'DELETE',headers:{'X-Session-Id':id,'Content-Type':'application/json'},body:'{}'});release();
 assert.equal((await pending).status,409);assert.deepEqual(store.session(id).history,[]);
});
