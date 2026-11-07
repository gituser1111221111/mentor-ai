// Mentor comparison: same verified options, only the pick changes; disagreement only when real.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MENTOR_ENGINE = 'mock';
delete process.env.STRIPE_TEST_SECRET_KEY;
const {compareMentors} = await import('../lib/compare.js');
const {createServer} = await import('../server.js');

const CANDS = [{id: 'c1', title: 'Pay the card first', calculations: [{name: 'x', result: {a: '1.00'}}], risk: 'low', tradeoffs: 'Slower investing.'},
  {id: 'c2', title: 'Keep investing', calculations: [{name: 'y', result: {b: '2.00'}}], risk: 'medium', tradeoffs: 'Card interest keeps running.'}];
const M = (id, extra = {}) => ({id, name: id.toUpperCase(), inspiredBy: 'Someone', tier: 'free', built: true, ...extra});
const fakeRepick = picks => async id => ({candidates: CANDS, pick: {pickId: picks[id], runnersUp: [], rationale: `${id} reason`}, text: `${id} says`, citations: [{title: 'n', ref: 'r'}]});

test('disagreement is reported only where picks actually differ', async () => {
  const r = await compareMentors({mentors: [M('a'), M('b'), M('c')], canUse: () => null, repick: fakeRepick({a: 'c1', b: 'c1', c: 'c2'})});
  assert.equal(r.factsUnchanged, true);
  assert.equal(r.consensus, false);
  const a = r.mentors.find(m => m.personaId === 'a');
  assert.deepEqual(a.agreesWith.map(x => x.personaId), ['b']);
  assert.deepEqual(a.disagreesWith.map(x => x.personaId), ['c']);
  assert.equal(a.pickTitle, 'Pay the card first');
  assert.equal(r.groups[0].personaIds.length, 2);
});

test('no manufactured disagreement when every mentor picks the same option', async () => {
  const r = await compareMentors({mentors: [M('a'), M('b')], canUse: () => null, repick: fakeRepick({a: 'c2', b: 'c2'})});
  assert.equal(r.consensus, true);
  assert.ok(r.mentors.every(m => m.disagreesWith.length === 0));
  assert.match(r.summary, /All 2 mentors picked the same option/);
});

test('locked and unbuilt mentors are listed but never run; errors are contained', async () => {
  let calls = 0;
  const repick = async id => { calls++; if (id === 'e') throw Error('boom'); return fakeRepick({a: 'c1'})(id); };
  const r = await compareMentors({mentors: [M('a'), M('p', {tier: 'plus'}), M('u', {built: false}), M('e')],
    canUse: m => (m.tier === 'plus' ? 'locked' : !m.built ? 'coming-soon' : null), repick});
  assert.equal(calls, 2);
  assert.deepEqual(r.mentors.map(m => m.status), ['ok', 'locked', 'coming-soon', 'error']);
});

test('factsUnchanged is false if any mentor returned different options', async () => {
  const repick = async id => ({candidates: id === 'b' ? [{...CANDS[0], calculations: [{name: 'x', result: {a: '9.99'}}]}] : CANDS, pick: {pickId: 'c1'}});
  const r = await compareMentors({mentors: [M('a'), M('b')], canUse: () => null, repick});
  assert.equal(r.factsUnchanged, false);
});

test('API: live mentors judge the same verified options while planned mentors stay visible', async () => {
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = {'Content-Type': 'application/json', 'X-Session-Id': 'compare-test-session-0001'};
  const post = (p, b) => fetch(base + p, {method: 'POST', headers: h, body: JSON.stringify(b || {})});
  try {
    const answers = {age: 22, incomeHistory: [{month: '2026-08', amount: '3000'}, {month: '2026-09', amount: '3000'}, {month: '2026-10', amount: '3000'}],
      bills: [{name: 'Rent', amount: '900.00'}], expenses: [{name: 'food', amount: '350.00'}],
      debts: [{name: 'Student loan', balance: '8000.00', aprPercent: '5.5', minPayment: '90.00'}], savings: '5000.00', goals: ['start_investing']};
    assert.equal((await post('/api/profile', {answers})).status, 200);
    const chat = await (await post('/api/chat', {message: 'I want to start investing. What should I do first?'})).json();
    assert.ok(chat.turnId);

    const free = await (await post('/api/compare', {turnId: chat.turnId})).json();
    assert.equal(free.factsUnchanged, true);
    const ids = free.candidates.map(c => c.id);
    assert.ok(ids.length >= 3);
    assert.ok(free.mentors.filter(m => m.status === 'locked').length >= 1); // Plus mentors stay gated
    for (const m of free.mentors.filter(m => m.status === 'ok')) assert.ok(ids.includes(m.pickId), `${m.personaId} picked outside the set`);

    assert.equal((await (await post('/api/checkout/demo')).json()).tier, 'plus');
    const plus = await (await post('/api/compare', {turnId: chat.turnId})).json();
    const ran = plus.mentors.filter(m => m.status === 'ok');
    assert.deepEqual(ran.map(m => m.personaId), ['debt-free-coach', 'value-investor', 'disruptive-growth']);
    assert.ok(plus.mentors.some(m => m.personaId === 'money-psychology' && m.status === 'coming-soon'));
    assert.deepEqual(plus.candidates, free.candidates); // same options on every call, nothing recalculated
    for (const m of ran) {
      assert.ok(ids.includes(m.pickId));
      for (const d of m.disagreesWith) assert.notEqual(d.pickId, m.pickId); // never a fake disagreement
      for (const a of m.agreesWith) assert.equal(ran.find(x => x.personaId === a.personaId).pickId, m.pickId);
    }
    assert.equal((await post('/api/compare', {turnId: 'nope'})).status, 404);
    assert.equal((await fetch(base + '/api/compare', {method: 'POST', headers: {...h, 'X-Session-Id': 'other-session-00000001'}, body: JSON.stringify({turnId: chat.turnId})})).status, 404);
  } finally { await new Promise(r => server.close(r)); }
});
