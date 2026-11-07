import test from 'node:test';
import assert from 'node:assert/strict';
import {VoicePlayback} from '../public/voice-playback.js';
class Audio extends EventTarget {
  src='';currentTime=0;paused=true;
  play(){this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  load(){}
}
const blob = () => new Blob(['ID3audio'],{type:'audio/mpeg'});
const deferred = () => {let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

test('slow old fetch cannot start after a newer reply, even if transport ignores abort',async()=>{
  const p=new VoicePlayback({log:()=>{}}),old=new Audio(),latest=new Audio(),pending=deferred();
  const a=p.start(old,()=>pending.promise);await p.start(latest,async()=>blob());
  pending.resolve(blob());await a;
  assert.equal(old.paused,true);assert.equal(old.src,'');assert.equal(latest.paused,false);
});
test('Stop cancels a pending request before any audio exists',async()=>{
  const p=new VoicePlayback({log:()=>{}}),a=new Audio(),pending=deferred();let signal;
  const task=p.start(a,s=>{signal=s;return pending.promise;});p.stop();
  assert.equal(signal.aborted,true);pending.resolve(blob());await task;assert.equal(a.src,'');assert.equal(a.paused,true);
});
test('a delayed play promise cannot restore ownership after interruption',async()=>{
  const p=new VoicePlayback({log:()=>{}}),old=new Audio(),next=new Audio(),play=deferred();
  old.play=()=>play.promise;
  const task=p.start(old,async()=>blob());await new Promise(r=>setImmediate(r));
  await p.start(next,async()=>blob());play.resolve();await task;assert.equal(p.active.audio,next);assert.equal(old.src,'');
});
test('buffering, decoding errors, cancellations and playback timing have content-free diagnostics',async()=>{
 const events=[],p=new VoicePlayback({log:e=>events.push(e)}),a=new Audio();await p.start(a,async()=>blob());
 a.dispatchEvent(new Event('waiting'));a.dispatchEvent(new Event('stalled'));a.dispatchEvent(new Event('error'));
 for(const e of ['requested','received','playing','waiting','stalled','error','cancelled']) assert.ok(events.some(x=>x.event===e),e);
 assert.equal(a.src,'');assert.equal(p.active,null);assert.ok(events.every(x=>Number.isFinite(x.elapsedMs)));
});
test('unexpected formats and failed requests leave Listen retryable',async()=>{
 for(const load of [async()=>new Blob(['html'],{type:'text/html'}),async()=>{throw Error('network failure');}]){
 const p=new VoicePlayback({log:()=>{}}),a=new Audio(),states=[];await p.start(a,load,s=>states.push(s));
 assert.ok(states.includes('error'));assert.equal(p.active,null);assert.equal(a.src,'');
 }
});
