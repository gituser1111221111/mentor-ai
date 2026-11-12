import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const choiceCode = source.slice(source.indexOf('let pendingAgent ='), source.indexOf('// ---------- live data connections'));
const intakeCode = source.slice(source.indexOf('async function submitQuiz('), source.indexOf('function renderIntake('));
function client() {
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, {value:'',textContent:'',innerHTML:'',showModal(){this.open=true;},close(){this.open=false;}});
    return elements.get(id);
  };
  const catalog = [{id:'ramsey',name:'Ramsey',built:true},{id:'buffett',name:'Buffett',built:true},{id:'preview',name:'Preview',built:false}];
  const state = {personaId:null,agentId:'budget',need:'question'};
  const saved = new Map();
  let started = 0, shown = null;
  const context = vm.createContext({$,state,esc:String,personas:()=>catalog,persona:id=>catalog.find(p=>p.id===id),usable:x=>Boolean(x?.built),agent:id=>({id,built:['budget','investing'].includes(id)}),localStorage:{setItem:(k,v)=>saved.set(k,v)},startChat:()=>started++,show:id=>{shown=id;},api:async()=>({profile:{personaHint:'ramsey'},snapshot:{status:'ok'}}),banner:()=>{}});
  vm.runInContext(choiceCode + intakeCode,context);
  return {$,state,saved,context,started:()=>started,shown:()=>shown};
}

test('a first visit sees the membership requirement instead of starting chat', () => {
  const c=client();
  vm.runInContext("openStartChoice({personaId:'preview'})",c.context);
  assert.equal(c.started(),0);
  assert.equal(c.shown(),'v-chat');
  assert.notEqual(c.$('#start-choice').open,true);
});

test('future-money entry also sees the membership requirement', () => {
  const c=client();
  vm.runInContext("openStartChoice({personaId:'buffett',need:'future'})",c.context);
  assert.equal(c.shown(),'v-chat');
  assert.equal(c.started(),0);
  assert.notEqual(c.$('#start-choice').open,true);
});

test('retirement exploration does not silently activate an unbuilt retirement agent', () => {
  const c=client();
  vm.runInContext("openStartChoice({personaId:'buffett',need:'retirement'})",c.context);
  assert.equal(c.shown(),'v-chat');
  assert.equal(c.started(),0);
  assert.equal(c.state.agentId,'budget');
});

test('updating financial inputs keeps the user-selected perspective', async () => {
  const c=client(); c.state.personaId='buffett';
  await vm.runInContext('submitQuiz({})',c.context);
  assert.equal(c.state.personaId,'buffett');
  assert.equal(c.started(),1);
});
