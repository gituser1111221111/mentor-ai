// Requires Playwright and Chromium. Uses a generated tone, not a claim of speech quality.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),cp=require('node:child_process');
(async()=>{
 process.env.NODE_ENV='test';process.env.MENTOR_ENGINE='mock';process.env.CHAT_LIMIT_PER_HOUR='1000';
 process.env.ELEVENLABS_API_KEY='local-test-key';process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH='VoiceDebtFree0001';
 const mp3=fs.readFileSync(new URL('../tests/fixtures/playback-tone.mp3',`file://${__filename}`));
 const spoken=[];
 const fake=http.createServer(async(req,res)=>{let text='';for await(const c of req)text+=c;spoken.push(JSON.parse(text));await new Promise(r=>setTimeout(r,20));res.writeHead(200,{'Content-Type':'audio/mpeg'});res.end(mp3);});
 await new Promise(r=>fake.listen(0,'127.0.0.1',r));process.env.ELEVENLABS_BASE_URL=`http://127.0.0.1:${fake.address().port}`;
 const {createServer}=await import('../server.js');
 const store=await import('../lib/store.js');
 const {unverifiedNumbers}=await import('../lib/mentor/validate.js');
 const {calcLibrary}=await import('../lib/mentor/tools.js');
 const {normalizeProfile}=await import('../lib/profile.js');
 const profile=normalizeProfile({incomeHistory:[{month:'2026-10',amount:'3000'}],bills:[{name:'Rent',amount:'1000'}],savings:'420'}).profile;
 const short='Keep your emergency savings available for unexpected bills.';
 const long=('Start with a plan you can keep when income changes. Keep money for essential bills accessible, and review your debt minimums before assigning extra money. A higher investment return is uncertain, while a bill still needs to be paid when it is due. Avoid borrowing to cover ordinary spending. If a plan leaves you without money for an unexpected expense, revisit the tradeoff before committing. ').repeat(4);
 const lengths=[short,long].map((text,i)=>{
  if(unverifiedNumbers(text,calcLibrary(profile).calcs).length)throw Error('Invalid numeric fixture');
  const turnId='length-fixture-'+i;store.update('voice-length-00000001',s=>{s.replies||={};s.replies[`${turnId}:debt-free-coach`]={text};});
  return {turnId,personaId:'debt-free-coach',text};
 });const app=createServer();await new Promise(r=>app.listen(0,'127.0.0.1',r));
 let browser;
 try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage();const browserEvents=[];page.on('console',msg=>{if(msg.text().startsWith('[voice] '))try{browserEvents.push(JSON.parse(msg.text().slice(8)));}catch{}});await page.goto(`http://127.0.0.1:${app.address().port}`);
 const questions=['How should I budget?','Explain a longer debt payoff plan.','What does $1,340.00 in card debt mean?','Should I build a $1,000 fund?','Save or pay debt first?','What about the highest APR?','Explain the snowball.','My income changes every month.','Can I invest with credit card debt?','What about rent and groceries?','How do I prepare for car repairs?','What should I do in a good month?','How much emergency savings?','How much emergency savings?','Explain my next financial step slowly.'];
 const results=await page.evaluate(async ({questions,lengths})=>{
  const {VoicePlayback}=await import('/voice-playback.js'),sid='voice-browser-00000001',headers={'Content-Type':'application/json','X-Session-Id':sid};
  const post=(p,b)=>fetch(p,{method:'POST',headers,body:JSON.stringify(b)});
  await post('/api/profile',{answers:{incomeHistory:[{month:'2026-10',amount:'3000'}],bills:[{name:'Rent',amount:'1000'}],debts:[{name:'Card',balance:'1340',aprPercent:'24.9',minPayment:'45'}],savings:'420'}});
  const events=[],p=new VoicePlayback({log:e=>events.push(e)}),timings=[],expectedTexts=[];
  for (const [i,question] of [...questions,'short verified fixture','long verified fixture'].entries()){
   let r;if(i<questions.length){const res=await post('/api/chat',{message:question,personaId:'debt-free-coach',agentId:'budget'});if(!res.ok)throw Error(await res.text());r=await res.json();}else r=lengths[i-questions.length];
   expectedTexts.push(r.text);
   const audio=document.createElement('audio');document.body.append(audio);
   const ended=new Promise((resolve,reject)=>{audio.addEventListener('ended',resolve,{once:true});audio.addEventListener('error',()=>reject(Error('decode error')),{once:true});});
   const start=performance.now();let playing;
   audio.addEventListener('playing',()=>playing=performance.now()-start,{once:true});
   await p.start(audio,async signal=>{const out=await fetch('/api/voice/speak',{method:'POST',signal,headers:i>=questions.length ? {...headers,'X-Session-Id':'voice-length-00000001'} : headers,body:JSON.stringify({turnId:r.turnId,personaId:r.personaId,voiceReplyId:r.voiceReplyId})});if(!out.ok)throw Error(await out.text());return out.blob();});
   if(!p.active)throw Error('Playback failed: '+question);
   await Promise.race([ended,new Promise((_,reject)=>setTimeout(()=>reject(Error('Playback timeout: '+question)),5000))]);timings.push({question,replyChars:r.text.length,playingMs:Math.round(playing),duration:audio.duration});p.stop('scenario-complete');audio.remove();
  }
  // Deliberately ignore abort in an old loader to prove token checks independently prevent replay.
  const a=new Audio();
  let release;const delayed=new Promise(r=>release=r);const old=p.start(a,()=>delayed);
  p.stop('new-question');release(new Blob(['stale'],{type:'audio/mpeg'}));await old;
  if(a.src || !a.paused)throw Error('Cancelled old request restarted');
  return {timings,expectedTexts,errors:events.filter(e=>e.event==='error'||e.event==='playback-error'),midPlaybackWaiting:events.filter(e=>e.event==='waiting'&&e.interruption).length,cancellationPassed:true};
 },{questions,lengths});
 const unchangedFullTextPayloads=spoken.every(s=>results.expectedTexts.includes(s.text));delete results.expectedTexts;
 if(!unchangedFullTextPayloads || results.errors.length || results.timings.length!==17)throw Error(JSON.stringify(results));
 await page.evaluate(()=>localStorage.setItem('sid','voice-browser-00000001'));
 await page.reload();await page.locator('#msg').waitFor({state:'visible'});
 await page.locator('[data-listen]').last().click();
 await page.locator('#msg').fill('What should I do with extra income?');
 await page.locator('#composer').evaluate(form=>form.requestSubmit());
 await page.waitForFunction(()=>document.querySelectorAll('.msg.bot').length>10);
 const typedInterruptionLogged=browserEvents.some(e=>e.event==='cancelled'&&e.reason==='new-question');
 if(!typedInterruptionLogged)throw Error('Typed interruption did not cancel audio');
 const source=cp.execFileSync('git',['show','47a9a63:public/app.js'],{encoding:'utf8'});
 const start=source.indexOf('function stopPlayback()'),end=source.indexOf('\nfunction setupVoice()',start);
 await page.route('**/latency-fixture',async route=>{await new Promise(r=>setTimeout(r,20));await route.fulfill({body:mp3,contentType:'audio/mpeg'});});
 const latency=await page.evaluate(async source=>{
  const {VoicePlayback}=await import('/voice-playback.js');
  const old=new Function('voice','sid','note',source.replace("fetch('/api/voice/speak'","fetch('/latency-fixture'")+ ';return {speakReply,stopPlayback};')({audio:null},'test',()=>{});
  const next=new VoicePlayback({log:()=>{}}),times={before:[],after:[]};
  for(let i=0;i<15;i++)for(const kind of ['before','after']){
   const el=document.createElement('div');el.className='msg';el.innerHTML='<button data-listen>Listen</button><div class="voice-player"><audio></audio><p class="fine"></p></div>';document.body.append(el);
   const audio=el.querySelector('audio'),started=performance.now();
   const playing=new Promise(r=>audio.addEventListener('playing',()=>r(performance.now()-started),{once:true}));
   if(kind==='before')await old.speakReply(el,{turnId:'test',personaId:'debt-free-coach'});
   else await next.start(audio,async signal=>(await fetch('/latency-fixture',{signal})).blob());
   times[kind].push(await playing);
   if(kind==='before'){old.stopPlayback();URL.revokeObjectURL(audio.src);}else next.stop();el.remove();
  }
  const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];return {samplesPerVersion:15,beforeMedianMs:median(times.before),afterMedianMs:median(times.after)};
 },source.slice(start,end));
 console.log(JSON.stringify({latency,typedInterruptionLogged,scenarioCount:17,uniqueSynthesisCalls:spoken.length,unchangedFullTextPayloads,...results},null,2));
 }finally{await browser?.close();await new Promise(r=>app.close(r));await new Promise(r=>fake.close(r));}
})().catch(e=>{console.error(e);process.exit(1)});
