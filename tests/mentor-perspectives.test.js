import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV='test';
process.env.MENTOR_ENGINE='live';
process.env.MENTOR_API_KEY='fixture-not-real';
process.env.ELEVENLABS_API_KEY='fixture-not-real';
process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH='VoiceFixture0001';
const {setClient}=await import('../lib/mentor/llm.js');
const {loadPersona,researchNotes,researchCitations}=await import('../lib/mentor/personas.js');
const {createServer}=await import('../server.js');
const calls=[];
let finance=false;
const create=async p=>{
 if (p.output_config.format.schema.properties.updates) return {content:[{type:'text',text:JSON.stringify({updates:[],clarification:''})}],stop_reason:'end_turn',usage:{}};
 calls.push(p);
 const classifier=Boolean(p.output_config.format.schema.properties.kind);
 const wood=p.system[0].text.includes('# Cathie Wood');
 const data=classifier && finance ? {kind:'finance',reply:'',noteIds:[]} : {kind:'conversation',reply:wood?'Test the adoption thesis and its funding risks.':'Examine owner earnings and maintenance investment.',noteIds:wood?['007','not-a-source']:['033','not-a-source']};
 return {content:[{type:'text',text:JSON.stringify(data)}],stop_reason:'end_turn',usage:{}};
};
setClient({messages:{create},beta:{messages:{create}}});
const app=createServer();await new Promise(r=>app.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.address().port}`;
test.after(()=>app.close());
const post=(path,sid,body)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Id':sid},body:JSON.stringify(body)});

test('launched text mentors are available to free users; voice remains Ramsey only',async()=>{
 const config=await (await fetch(base+'/api/config')).json();
 for(const id of ['value-investor','disruptive-growth']){
  const p=config.catalog.personas.find(p=>p.id===id);
  assert.equal(p.built,true);assert.equal(p.tier,'free');assert.equal(p.textOnly,true);
  const r=await post('/api/chat','new-mentor-free-'+id,{personaId:id,agentId:'budget',message:'Explain owner earnings and valuation.'});
  assert.equal(r.status,200);const reply=await r.json();assert.equal(reply.personaId,id);
  const voice=await post('/api/voice/speak','new-mentor-free-'+id,{personaId:id,turnId:reply.voiceTurnId||reply.turnId});
  assert.equal(voice.status,503);assert.match((await voice.json()).error,/does not have a voice/);
 }
 assert.deepEqual(config.voicePersonas,['debt-free-coach']);
 assert.equal(config.catalog.agents.find(a=>a.id==='equity').built,true,'preserve the concurrently launched equity engine');
});

test('switching perspectives and no-profile finance use selected persona rather than Ramsey',async()=>{
 for(const id of ['value-investor','disruptive-growth']){
  finance=true;calls.length=0;
  const r=await post('/api/chat','new-mentor-switch-context',{personaId:id,message:'How should I begin managing my money?'});
  const body=await r.json();assert.equal(r.status,200);assert.equal(body.personaId,id);
  assert.equal(calls.length,2);
  const general=calls[1].system[0].text;
  assert.ok(general.includes(loadPersona(id).name));
  assert.ok(!general.includes("Ramsey-inspired educational assistant"));
  assert.ok(!general.includes("Never claim to be Dave Ramsey"));
 }
 finance=false;
});

test('research retrieval is bounded, relevant, persona-isolated and rejects fabricated citations',()=>{
 const b=loadPersona('value-investor'), w=loadPersona('disruptive-growth');
 const bnotes=researchNotes(b,[{role:'user',content:'Explain owner earnings and maintenance reinvestment'}]);
 assert.ok(bnotes.some(n=>n.id==='033'));assert.ok(bnotes.length<=6);
 assert.ok(bnotes.every(n=>b.notes.includes(n)));
 const wnotes=researchNotes(w,[{role:'user',content:'Explain valuation, adoption and dilution'}]);
 assert.ok(wnotes.some(n=>n.id==='007'||n.id==='021'));
 assert.ok(wnotes.every(n=>w.notes.includes(n)));
 assert.deepEqual(researchCitations(bnotes,['fabricated']),[]);
 assert.equal(researchCitations(bnotes,['033','033','fabricated']).length,1);
 assert.match(researchCitations(bnotes,['033'])[0].url,/berkshirehathaway/);
});

test('qualitative drafts with unsupported amounts get one bounded retry and remain validated',async()=>{
 let n=0;
 const rewrite=async p=>{
  if(p.output_config.format.schema.properties.updates) return {content:[{type:"text",text:JSON.stringify({updates:[],clarification:""})}],stop_reason:"end_turn",usage:{}};
  n++;
  if(n===2)assert.match(p.system.at(-1).text,/without numerical examples/);
  return {content:[{type:'text',text:JSON.stringify({kind:'conversation',reply:n===1?'A business produces $99.00.':'Owner earnings account for necessary reinvestment.',noteIds:[]})}],stop_reason:'end_turn',usage:{}};
 };
 setClient({messages:{create:rewrite},beta:{messages:{create:rewrite}}});
 try{
  const r=await post('/api/chat','qualitative-retry-mentor',{personaId:'value-investor',message:'Explain owner earnings conceptually.'});
  const answer=await r.json();assert.equal(r.status,200);assert.equal(n,2);
  assert.equal(answer.text,'Owner earnings account for necessary reinvestment.');assert.ok(!answer.text.includes('99'));
 }finally{setClient({messages:{create},beta:{messages:{create}}});}
});
