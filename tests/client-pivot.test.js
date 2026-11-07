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
  let started = 0;
  const context = vm.createContext({$,state,esc:String,personas:()=>catalog,persona:id=>catalog.find(p=>p.id===id),usable:x=>Boolean(x?.built),agent:id=>({id,built:['budget','investing'].includes(id)}),localStorage:{setItem:(k,v)=>saved.set(k,v)},startChat:()=>started++,api:async()=>({profile:{personaHint:'ramsey'},snapshot:{status:'ok'}}),banner:()=>{}});
  vm.runInContext(choiceCode + intakeCode,context);
  return {$,state,saved,context,started:()=>started};
}

test('a first visit requires a real mentor choice, and cannot start a preview', () => {
  const c=client();
  vm.runInContext('openStartChoice()',c.context);
  assert.equal(c.$('#start-personas').value,'');
  c.$('#start-personas').value='preview';
  vm.runInContext('submitStartChoice({preventDefault(){}})',c.context);
  assert.equal(c.started(),0);
  assert.match(c.$('#start-choice-error').textContent,/available perspective/);
});

test('future-money choice starts the holdings specialist with the selected mentor', () => {
  const c=client();
  vm.runInContext("openStartChoice({personaId:'buffett',need:'future'})",c.context);
  vm.runInContext('submitStartChoice({preventDefault(){}})',c.context);
  assert.equal(c.state.personaId,'buffett');
  assert.equal(c.state.agentId,'investing');
  assert.equal(c.started(),1);
  assert.equal(c.$('#start-choice').open,false);
  assert.equal(JSON.parse(c.saved.get('mentor-labs-choice')).personaId,'buffett');
});

test('retirement exploration does not silently activate an unbuilt retirement agent', () => {
  const c=client();
  vm.runInContext("openStartChoice({personaId:'buffett',need:'retirement'})",c.context);
  vm.runInContext('submitStartChoice({preventDefault(){}})',c.context);
  assert.equal(c.state.need,'retirement');
  assert.equal(c.state.agentId,'budget');
});

test('updating financial inputs keeps the user-selected perspective', async () => {
  const c=client(); c.state.personaId='buffett';
  await vm.runInContext('submitQuiz({})',c.context);
  assert.equal(c.state.personaId,'buffett');
  assert.equal(c.started(),1);
});
