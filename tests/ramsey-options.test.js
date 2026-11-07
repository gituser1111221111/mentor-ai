// Dave Ramsey-inspired mentor choosing from a LARGE option set (MENTOR_MAX_OPTIONS=40), seeded by the
// 40-idea option bank built from "Dave Ramsey Deep Research.md" (config/option-banks/debt-free-coach.json).
// Uses a scripted stand-in for Claude, so it proves the mechanics (what Ramsey receives and what he is
// allowed to return), not the quality of his judgment. Live judgment: npm run eval:people with a key.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MENTOR_MAX_OPTIONS = '40';
const {MAX_OPTIONS} = await import('../lib/mentor/options.js');
const {setClient} = await import('../lib/mentor/llm.js');
const {chat, repick} = await import('../lib/mentor/chat.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {normalizeProfile} = await import('../lib/profile.js');
const {loadPersona} = await import('../lib/mentor/personas.js');

const {profile} = normalizeProfile({
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725'}, {name: 'Phone', amount: '45'}],
  expenses: [{name: 'food', amount: '380'}],
  debts: [{name: 'Card', balance: '1340', aprPercent: '24.9', minPayment: '45'}, {name: 'Car', balance: '9800', aprPercent: '7.9', minPayment: '289'}],
  savings: '420',
});
const calcIds = calcLibrary(profile).calcs.map(c => c.id).filter(id => id !== 'snapshot');
const {optionBank} = await import('../lib/mentor/option-bank.js');
const BANK = optionBank('debt-free-coach');
// The scripted coach turns all 40 bank ideas into options, plus two that must be dropped.
const GENERATED = [...BANK.map((idea, i) => ({title: idea.title, summary: `${idea.title} for this user.`, calcIds: [calcIds[i % calcIds.length]],
  tradeoffs: 'Has costs and benefits.', risk: 'low', timeToGoalMonths: null})),
  {title: 'Invented savings goal', summary: 'Save $9,999.00 by spring.', calcIds: [calcIds[0]], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null},
  {title: BANK[0].title, summary: 'Duplicate of the first idea.', calcIds: [calcIds[0]], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null}];
const textRes = obj => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(obj)}], usage: {}, model: 'fake'});
function fakeClient(pickFor) {
  const calls = [];
  const create = async params => {
    calls.push(params);
    const m = String(params.messages[0].content).match(/<options>(.*)<\/options>/s);
    if (!m) return textRes({needsInfo: null, candidates: GENERATED}); // generation step
    const options = JSON.parse(m[1]);
    return textRes(pickFor(options, params));
  };
  return {calls, messages: {create}, beta: {messages: {create}}};
}
const idOf = (options, title) => options.find(o => o.title === title)?.id;

test('the option limit is configurable up to 40 and the Ramsey bank has 40 ideas from the deep research', () => {
  assert.equal(MAX_OPTIONS, 40);
  assert.equal(BANK.length, 40);
  assert.ok(BANK.every(b => b.findings.length && !/\d/.test(b.title))); // traceable to findings, no numbers
});

test('Ramsey receives 40 verified options, his full rules and all notes, and picks one by id', async () => {
  const ramsey = loadPersona('debt-free-coach');
  assert.equal(ramsey.from, 'files');
  const fake = fakeClient(options => ({pickId: idOf(options, BANK[0].title),
    runnersUp: [idOf(options, BANK[1].title), idOf(options, BANK[7].title)],
    rationale: 'Baby Step 1 protects the bad month.', reply: 'Start with the starter emergency fund, then the snowball.',
    whyNotOthers: 'Leases, cards and payday loans add debt.', noteIds: ['029', '049', 'made-up'], memoryFacts: []}));
  setClient(fake);
  const r = await chat({personaId: 'debt-free-coach', agentId: 'budget', messages: [{role: 'user', content: 'Where do I start?'}], profile});
  assert.equal(r.mode, 'live');
  assert.equal(r.candidates.length, 40);                       // 42 proposed: invented number and duplicate dropped
  assert.equal(new Set(r.candidates.map(c => c.title)).size, 40);
  const genCall = fake.calls.find(c => String(c.messages[0].content).includes('<coach>')); // the option-generation step
  assert.match(genCall.messages[0].content, /<option_ideas>/);  // coach was given the 40 Ramsey ideas
  assert.ok(BANK.every(b => genCall.messages[0].content.includes(b.title)));

  const isPick = c => String(c.messages[0].content).includes('<options>');
  const pickCall = fake.calls.find(isPick);
  const sent = JSON.parse(pickCall.messages[0].content.match(/<options>(.*)<\/options>/s)[1]);
  assert.equal(sent.length, 40);                                // Ramsey saw every option
  const schemaText = JSON.stringify(pickCall);
  for (let i = 1; i <= 40; i++) assert.ok(schemaText.includes(`"c${i}"`), `c${i} allowed`);
  assert.ok(!schemaText.includes('"c41"'));                     // nothing outside the set is allowed
  const system = pickCall.system.map(b => b.text).join('\n');
  assert.match(system, /Dave Ramsey/);
  assert.match(system, /How this persona picks/);               // his picker rules from core.md
  assert.match(system, /Reject outright/);
  assert.equal((system.match(/^\[\d{3}\]/gm) || []).length, ramsey.notes.length); // all 59 notes
  assert.ok(pickCall.system.some(b => b.cache_control?.type === 'ephemeral'));

  assert.equal(r.candidates.find(c => c.id === r.pick.pickId).title, BANK[0].title);
  assert.equal(r.pick.pickedValidly, true);
  assert.deepEqual(r.citations.map(c => c.noteId), ['029', '049']); // invented note id dropped
  assert.match(r.disclosure, /not advice from a licensed/);
});

test('an invented pick outside the 40 is caught, and switching mentors keeps the same 40 options', async () => {
  let n = 0;
  const fake = fakeClient((options, params) => {
    n++;
    const isSethi = JSON.stringify(params.system).includes('Conscious Spender');
    if (n === 1) return {pickId: 'c55', runnersUp: [], rationale: 'x', reply: 'Do something new.', whyNotOthers: '', noteIds: [], memoryFacts: []};
    return {pickId: idOf(options, isSethi ? BANK[2].title : BANK[1].title), runnersUp: [], rationale: 'Fits.',
      reply: 'Here is the plan.', whyNotOthers: '', noteIds: [], memoryFacts: []};
  });
  setClient(fake);
  const r = await chat({personaId: 'debt-free-coach', agentId: 'debt', messages: [{role: 'user', content: 'Which debt first?'}], profile});
  assert.equal(r.pick.pickedValidly, false);                    // c55 does not exist
  assert.ok(r.candidates.some(c => c.id === r.pick.pickId));    // falls back to a real option
  const nonPick = () => fake.calls.filter(c => !String(c.messages[0].content).includes('<options>')).length;
  const beforeSwitch = nonPick();
  const again = await repick({turnId: r.turnId, personaId: 'debt-free-coach'});
  assert.equal(again.candidates.find(c => c.id === again.pick.pickId).title, BANK[1].title);
  const sethi = await repick({turnId: r.turnId, personaId: 'conscious-spender'});
  assert.deepEqual(sethi.candidates, r.candidates);             // same 40 options and numbers
  assert.equal(sethi.candidates.find(c => c.id === sethi.pick.pickId).title, BANK[2].title);
  assert.equal(nonPick(), beforeSwitch); // switching mentors only re-runs the pick, never regenerates options
});
