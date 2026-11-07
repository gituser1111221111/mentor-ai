// Section B acceptance checks: valid input, missing/invalid input, money reconciliation, pick integrity.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MENTOR_ENGINE = 'mock';
const {normalizeProfile, snapshot} = await import('../lib/profile.js');
const {summarizePortfolioCSV} = await import('../lib/portfolio.js');
const {chat, repick, payoff, generateCandidates} = await import('../lib/mentor/chat.mock.js');
const {minor} = await import('../lib/finance.js');
const {createServer} = await import('../server.js');
const store = await import('../lib/store.js');

const answers = {
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1,780.00'}, {month: '2026-10', amount: '$2410.00'}],
  bills: [{name: 'Rent', amount: '725.00', dueDay: 1}, {name: 'Phone', amount: '45.00'}],
  expenses: [{name: 'food', amount: '380.00'}, {name: 'fun', amount: '150.00'}],
  debts: [{name: 'Card', balance: '1340.00', aprPercent: '24.9', minPayment: '45.00'}, {name: 'Car', balance: '9800.00', aprPercent: '7.9', minPayment: '289.00'}],
  savings: '420.00',
};

test('valid quiz answers give an exact-cents snapshot', () => {
  const {profile, errors} = normalizeProfile(answers);
  assert.deepEqual(errors, []);
  assert.equal(profile.debts[0].rateBps, 2490);
  const s = snapshot(profile);
  assert.equal(s.status, 'ok');
  assert.equal(s.lowestMonth, '1780.00');
  assert.equal(s.averageMonth, '2380.00');
  assert.equal(s.swing, '1170.00');
  assert.equal(s.essentialsTotal, '1634.00'); // 770 bills + 530 spending + 334 minimums
  assert.equal(s.lowestMonthLeftover, '146.00');
  assert.equal(s.lowestMonthShortfall, '0.00');
});

test('missing income asks for it; invalid money is rejected with the field', () => {
  const {profile, missing} = normalizeProfile({savings: '10'});
  assert.ok(missing.includes('incomeHistory'));
  assert.equal(snapshot(profile).status, 'need_income');
  const bad = normalizeProfile({incomeHistory: [{month: '2026-10', amount: 'lots'}], debts: [{name: 'x', balance: '5', aprPercent: '250', minPayment: '1'}]});
  assert.equal(bad.errors.length, 2);
  assert.match(bad.errors[0].field, /incomeHistory/);
});

test('snowball payoff reconciles: total paid = principal + interest, to the cent', () => {
  const debts = [{name: 'A', balance: '500.00', rateBps: 2000, minPayment: '25.00'}, {name: 'B', balance: '1200.00', rateBps: 600, minPayment: '40.00'}];
  const r = payoff(debts, 10000n, 'snowball');
  assert.equal(r.order[0].name, 'A');
  assert.equal(r.capped, false);
  // budget is 165.00/mo; final month may be partial, so total paid is between (months-1) and months budgets
  const paid = minor('1700.00') + minor(r.totalInterest);
  assert.ok(paid <= BigInt(r.months) * 16500n && paid > BigInt(r.months - 1) * 16500n);
  const aval = payoff(debts, 10000n, 'avalanche');
  assert.ok(minor(aval.totalInterest) <= minor(r.totalInterest));
});

test('pick integrity: persona picks an existing candidate; repick keeps the same options', async () => {
  const {profile} = normalizeProfile(answers);
  const r = await chat({personaId: 'debt-free-coach', agentId: 'budget', messages: [{role: 'user', content: 'help'}], profile});
  assert.equal(r.mode, 'mock');
  const ids = r.candidates.map(c => c.id);
  assert.ok(r.candidates.length >= 8 && r.candidates.length <= 12);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(r.pick.pickId));
  assert.equal(r.pick.pickId, 'starter-ef'); // savings < $1,000
  const h = await repick({turnId: r.turnId, personaId: 'conscious-spender'});
  assert.deepEqual(h.candidates, r.candidates);
  assert.notEqual(h.pick.pickId, r.pick.pickId);
  assert.match(r.disclosure, /not advice from a licensed/);
});

test('no income -> only a need-info candidate', () => {
  const {candidates} = generateCandidates(normalizeProfile({}).profile);
  assert.deepEqual(candidates.map(c => c.id), ['need-info']);
});

test('portfolio CSV upload summarizes in cents and rejects junk', () => {
  const s = summarizePortfolioCSV('symbol,sector,market_value\nVTI,Broad market,"1,000.50"\nAAPL,Tech,250.25\n');
  assert.equal(s.marketValue, '1250.75');
  assert.equal(s.holdings, 2);
  assert.throws(() => summarizePortfolioCSV('symbol,market_value\nVTI,abc\n'));
  assert.throws(() => summarizePortfolioCSV('a,b\n'));
});

test('API: quiz -> chat -> repick, static UI, and traversal blocked', async () => {
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = {'Content-Type': 'application/json', 'X-Session-Id': 'test-session-0000000001'};
  try {
    assert.equal((await fetch(base + '/')).status, 200);
    assert.equal((await fetch(base + '/..%2fserver.js')).status, 404);
    const starter = await fetch(base + '/api/chat', {method: 'POST', headers: h, body: JSON.stringify({message: 'How do I start budgeting?'})});
    assert.equal(starter.status, 200);
    assert.match((await starter.json()).text, /written budget/i);
    const cfg = await (await fetch(base + '/api/config')).json();
    assert.equal(cfg.catalog.agents.length, 16);
    assert.equal(cfg.catalog.personas.length, 10);
    assert.equal(cfg.quiz.questions.length, 6);
    assert.deepEqual(cfg.catalog.personas.filter(p => p.tier === 'free').map(p => p.id), ['debt-free-coach']);
    assert.deepEqual(cfg.catalog.personas.filter(p => p.built).map(p => p.id), ['debt-free-coach']);
    assert.deepEqual(cfg.catalog.agents.filter(a => a.built).map(a => a.id), ['budget']);
    assert.ok(cfg.catalog.agents.every(a => a.tier === 'plus' && a.name.endsWith('Agent')));
    const p = await fetch(base + '/api/profile', {method: 'POST', headers: h, body: JSON.stringify({answers})});
    assert.equal(p.status, 200);
    const attachment = await fetch(base + '/api/attachment', {method: 'POST', headers: h, body: JSON.stringify({name: 'statement.txt', base64: Buffer.from('Monthly statement for review').toString('base64')})});
    assert.equal(attachment.status, 200);
    assert.equal((await (await fetch(base + '/api/profile', {headers: h})).json()).profile.documents[0].name, 'statement.txt');
    assert.equal((await fetch(base + '/api/attachment', {method: 'POST', headers: h, body: JSON.stringify({name: 'photo.exe', base64: 'YWJj'})})).status, 422);
    const bad = await fetch(base + '/api/profile', {method: 'POST', headers: h, body: JSON.stringify({answers: {incomeHistory: [{amount: '-5'}]}})});
    assert.equal(bad.status, 422);
    const c = await (await fetch(base + '/api/chat', {method: 'POST', headers: h, body: JSON.stringify({message: 'How do I budget?'})})).json();
    assert.ok(c.turnId);
    assert.equal((await fetch(base + '/api/chat', {method: 'POST', headers: h, body: JSON.stringify({message: 'hi', agentId: 'debt'})})).status, 402);
    assert.equal((await fetch(base + '/api/chat', {method: 'POST', headers: h, body: JSON.stringify({message: 'hi', personaId: 'conscious-spender'})})).status, 402);
    await fetch(base + '/api/checkout/demo', {method: 'POST', headers: h, body: '{}'});
    assert.equal(c.personaName, 'Dave Ramsey–inspired');
    assert.equal('candidates' in c, false);
    assert.equal('validation' in c, false);
    assert.equal((await fetch(base + '/api/repick', {method: 'POST', headers: h, body: JSON.stringify({turnId: c.turnId, personaId: 'conscious-spender'})})).status, 409);
    const r = await (await fetch(base + '/api/repick', {method: 'POST', headers: h, body: JSON.stringify({turnId: c.turnId, personaId: 'debt-free-coach'})})).json();
    assert.equal(r.personaName, 'Dave Ramsey–inspired');
    assert.equal('candidates' in r, false);
    const history = await (await fetch(base + '/api/history', {headers: h})).json();
    assert.deepEqual(history.history.map(x => x.role), ['user', 'assistant', 'assistant']);
    assert.equal(history.history[1].response.turnId, c.turnId);
    assert.equal(history.history[2].response.personaId, 'debt-free-coach');
    const other = {'X-Session-Id': 'test-session-0000000002', 'Content-Type': 'application/json'};
    assert.equal((await fetch(base + '/api/repick', {method: 'POST', headers: other, body: JSON.stringify({turnId: c.turnId, personaId: 'debt-free-coach'})})).status, 404);
    assert.deepEqual((await (await fetch(base + '/api/history', {headers: other})).json()).history, []);
    store.addMemory('test-session-0000000001', [{fact: 'Prefers a cash buffer'}]);
    assert.equal((await (await fetch(base + '/api/memory', {headers: h})).json()).memory.length, 1);
    await fetch(base + '/api/memory', {method: 'DELETE', headers: h, body: JSON.stringify({fact: 'Prefers a cash buffer'})});
    assert.deepEqual((await (await fetch(base + '/api/memory', {headers: h})).json()).memory, []);
    assert.equal((await fetch(base + '/api/profile')).status, 400); // no session header
  } finally { await new Promise(r => server.close(r)); }
});

test('Plus gating: locked mentor -> 402, demo unlock without Stripe, unbuilt -> coming soon', async () => {
  delete process.env.STRIPE_TEST_SECRET_KEY;
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = {'Content-Type': 'application/json', 'X-Session-Id': 'test-session-plus-000001'};
  const post = (p, b) => fetch(base + p, {method: 'POST', headers: h, body: JSON.stringify(b || {})});
  try {
    await post('/api/profile', {answers});
    assert.equal((await post('/api/chat', {message: 'hi', personaId: 'value-investor'})).status, 402);
    assert.equal((await post('/api/chat', {message: 'hi', agentId: 'tax'})).status, 402);
    assert.equal((await (await post('/api/checkout')).json()).mode, 'demo');
    assert.equal((await (await post('/api/checkout/demo')).json()).tier, 'plus');
    assert.equal((await (await fetch(base + '/api/me', {headers: h})).json()).tier, 'plus');
    const soon = await post('/api/chat', {message: 'hi', personaId: 'value-investor'});
    assert.equal(soon.status, 409);
    assert.match((await soon.json()).error, /coming soon/);
    assert.equal((await post('/api/chat', {message: 'hi', agentId: 'debt'})).status, 409);
    await fetch(base + '/api/session', {method: 'DELETE', headers: h});
    assert.equal((await (await fetch(base + '/api/me', {headers: h})).json()).tier, 'plus'); // start over keeps Plus
  } finally { await new Promise(r => server.close(r)); }
});

test('Stripe confirm checks session ownership and completion (fake Stripe)', async () => {
  process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_fake';
  const {confirmCheckout, createCheckout} = await import('../lib/billing.js');
  const fake = body => async () => ({ok: true, json: async () => body});
  assert.equal((await confirmCheckout('me', 'cs_test_abc', {fetcher: fake({client_reference_id: 'me', status: 'complete', subscription: 'sub_1'})})).ok, true);
  assert.match((await confirmCheckout('me', 'cs_test_abc', {fetcher: fake({client_reference_id: 'other', status: 'complete'})})).reason, /different session/);
  assert.match((await confirmCheckout('me', 'cs_test_abc', {fetcher: fake({client_reference_id: 'me', status: 'open'})})).reason, /open/);
  assert.equal((await confirmCheckout('me', 'cs_live_abc')).ok, false);
  let sent; await createCheckout('me', 'https://x.example', {fetcher: async (u, o) => (sent = o.body, {ok: true, json: async () => ({url: 'https://checkout.stripe.com/x', id: 'cs_test_1'})})});
  assert.equal(sent.get('mode'), 'subscription');
  assert.equal(sent.get('line_items[0][price_data][unit_amount]'), '499');
  assert.equal(sent.get('client_reference_id'), 'me');  delete process.env.STRIPE_TEST_SECRET_KEY;
});
