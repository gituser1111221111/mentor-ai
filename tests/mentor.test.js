// Live engine tests with a fake Anthropic client (no network, no key needed).
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const {setClient} = await import('../lib/mentor/llm.js');
const {chat, repick} = await import('../lib/mentor/chat.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {unverifiedNumbers, validateCandidates} = await import('../lib/mentor/validate.js');
const {normalizeProfile} = await import('../lib/profile.js');

const {profile} = normalizeProfile({
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725'}, {name: 'Phone', amount: '45'}],
  expenses: [{name: 'food', amount: '380'}, {name: 'fun', amount: '150'}],
  debts: [{name: 'Card', balance: '1340', aprPercent: '24.9', minPayment: '45'}, {name: 'Car', balance: '9800', aprPercent: '7.9', minPayment: '289'}],
  savings: '420',
});

const textRes = obj => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(obj)}], usage: {}, model: 'fake'});
function fakeClient({generated, picks}) {
  const calls = [];
  const create = async params => {
    calls.push(params);
    if (params.model.includes('sonnet')) return textRes({needsInfo: null, candidates: generated});
    const persona = params.system[0].text.includes('Hustle') ? 'hustle' : 'debt';
    return textRes(picks[persona]);
  };
  return {calls, messages: {create}, beta: {messages: {create}}};
}

test('number check: copied numbers pass, invented ones are caught', () => {
  const lib = calcLibrary(profile);
  const snap = lib.calcs.filter(c => c.id === 'snapshot');
  assert.deepEqual(unverifiedNumbers('Your lowest month was $1,780.00, essentials 1634.00', snap), []);
  assert.deepEqual(unverifiedNumbers('Save $1,000 a month', snap), ['$1,000']);
  const ef = lib.calcs.filter(c => c.id === 'starter-ef');
  assert.deepEqual(unverifiedNumbers('Need $580.00 more over 2 months', [...snap, ...ef]), []);
  assert.deepEqual(unverifiedNumbers('in 7 months', [...snap, ...ef]), ['7 months']);
});

const GOOD = [
  {title: 'Starter fund first', summary: 'Save the $580.00 gap to reach $1,000.00.', calcIds: ['starter-ef'], tradeoffs: 'Debt waits.', risk: 'low', timeToGoalMonths: 2},
  {title: 'Snowball the card', summary: 'Put extra toward the smallest debt first.', calcIds: ['snowball'], tradeoffs: 'Ignores rates.', risk: 'medium', timeToGoalMonths: null},
  {title: 'Raise your floor', summary: 'Add income in slow months.', calcIds: ['raise-floor'], tradeoffs: 'Costs time.', risk: 'medium', timeToGoalMonths: null},
  {title: 'Invented number', summary: 'Save $9,999.00 by spring.', calcIds: ['starter-ef'], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null},
  {title: 'Snowball the card', summary: 'Duplicate.', calcIds: ['snowball'], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null},
  {title: 'Ghost calc', summary: 'Uses a calc that does not exist.', calcIds: ['made-up'], tradeoffs: 'x', risk: 'low', timeToGoalMonths: null},
];

test('validateCandidates drops invented numbers, duplicates and unknown calcs', () => {
  const {candidates, dropped} = validateCandidates(GOOD, calcLibrary(profile));
  assert.deepEqual(candidates.map(c => c.id), ['c1', 'c2', 'c3']);
  assert.equal(dropped.length, 3);
  assert.deepEqual(dropped.map(d => d.reason.split(':')[0]), ['numbers not backed by a calculation', 'duplicate', 'referenced unknown calculation made-up']);
  assert.equal(candidates[0].calculations[0].name, 'variable_income_snapshot');
  assert.equal(candidates[0].timeToGoal, 2);
});

test('live chat: structured outputs, cached prompts, persona picks by id, repick keeps options', async () => {
  const fake = fakeClient({generated: GOOD, picks: {
    debt: {pickId: 'c1', runnersUp: ['c2', 'c9'], rationale: 'Protect the bad month first.', reply: 'Get that $580.00 saved, then go after the card.', whyNotOthers: 'Income is slower.', noteIds: ['029', 'fake-note'], memoryFacts: ['Wants to pay off the card']},
    hustle: {pickId: 'c3', runnersUp: ['c1'], rationale: 'Grow income.', reply: 'You need $5,000.00 more a month. Go get it.', whyNotOthers: 'Cutting is small.', noteIds: ['expand-income'], memoryFacts: []},
  }});
  setClient(fake);
  const r = await chat({personaId: 'debt-free-coach', agentId: 'budget', messages: [{role: 'user', content: 'Debt or savings first?'}], profile});
  assert.equal(r.mode, 'live');
  assert.equal(r.pick.pickId, 'c1');
  assert.deepEqual(r.pick.runnersUp, ['c2']); // c9 doesn't exist
  assert.equal(r.text, 'Get that $580.00 saved, then go after the card.');
  assert.deepEqual(r.citations.map(c => c.noteId), ['029']); // file note id (Baby Step 1); unknown note dropped
  assert.equal(r.validation.kept, 3);
  assert.equal(r.memoryUpdates[0].fact, 'Wants to pay off the card');
  // request shape: no forced tool_choice, JSON schema output, cache_control on system
  for (const call of fake.calls) {
    assert.equal(call.tool_choice, undefined);
    assert.equal(call.output_config.format.type, 'json_schema');
    assert.ok(call.system.some(b => b.cache_control?.type === 'ephemeral'));
  }
  assert.equal(fake.calls[0].model, 'claude-sonnet-5-5');
  assert.equal(fake.calls[1].model, 'claude-haiku-5-5');

  const h = await repick({turnId: r.turnId, personaId: 'hustle-coach'});
  assert.deepEqual(h.candidates, r.candidates);
  assert.equal(h.pick.pickId, 'c3');
  assert.equal(fake.calls.length, 3); // repick = one pick call, no regeneration
  // hustle reply invented $5,000.00 -> replaced with the option's own verified text
  assert.equal(h.validation.replyVerified, false);
  assert.ok(!h.text.includes('5,000'));
  assert.match(h.text, /Raise your floor/);
});

test('no income: asks for it without calling the model', async () => {
  const fake = fakeClient({generated: [], picks: {}});
  setClient(fake);
  const r = await chat({messages: [{role: 'user', content: 'help'}], profile: normalizeProfile({}).profile});
  assert.match(r.text, /take-home pay/);
  assert.equal(fake.calls.length, 0);
});

test('refusal or too few verified options raises (routes then fall back to mock)', async () => {
  setClient({messages: {create: async () => ({stop_reason: 'refusal', stop_details: {category: 'general_harms'}, content: []})}, beta: {messages: {create: async () => ({stop_reason: 'refusal', stop_details: {category: 'general_harms'}, content: []})}}});
  await assert.rejects(chat({messages: [{role: 'user', content: 'x'}], profile}), /declined/);
  setClient(fakeClient({generated: GOOD.slice(3), picks: {}}));
  await assert.rejects(chat({messages: [{role: 'user', content: 'x'}], profile}), /enough verified options/);
});
