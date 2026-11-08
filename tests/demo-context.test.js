// The mentor sees the same budget and portfolio context the workspace shows, and market fallbacks are labeled.
// Uses a fake Claude client (no network). These are mocked model responses, not live Claude results.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test'; process.env.MENTOR_ENGINE = 'live'; process.env.MENTOR_API_KEY = 'test-only';
process.env.CHAT_LIMIT_PER_HOUR = '1000'; process.env.MARKET_LIVE = '0';
const {setClient} = await import('../lib/mentor/llm.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {portfolioWatch} = await import('../lib/workspace.js');
const {createServer} = await import('../server.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => app.close());
const post = (sid, path, body) => fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: JSON.stringify(body)});
const textRes = data => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(data)}], usage: {}});
function fakeModel() {
  const calls = [];
  const create = async params => {
    if (params.output_config.format.schema.properties.updates) return textRes({updates: [], clarification: ''});
    const content = params.messages[0].content; calls.push(content);
    if (content.includes('<coach>')) return textRes({needsInfo: null, candidates: ['Cushion', 'Budget', 'Review'].map(title => ({title, summary: 'Build the cushion first.', calcIds: ['cash_cushion'], risk: 'low', tradeoffs: 'Debt waits.', timeToGoalMonths: null}))});
    if (content.includes('<options>')) return textRes({pickId: 'c1', runnersUp: [], rationale: 'Cushion first.', reply: 'You need $580.00 more to reach your $1,000.00 cushion.', whyNotOthers: 'Later.', noteIds: [], memoryFacts: []});
    if (params.output_config.format.schema.properties.kind) return textRes({kind: 'finance', reply: ''});
    return textRes({reply: ''});
  };
  setClient({messages: {create}, beta: {messages: {create}}});
  return calls;
}
const profile = (savings, cashCushion) => ({incomeHistory: [{month: '2026-10', amount: '1780.00'}], bills: [{name: 'Rent', amount: '1100.00'}], expenses: [{name: 'Food', amount: '521.00'}], debts: [], savings, cashCushion});

test('cash cushion goal and gap are computed in exact cents in their own calc', () => {
  const lib = calcLibrary(profile('420.00', '1000.00'));
  assert.deepEqual(lib.calcs.find(c => c.id === 'cash_cushion').result, {cashCushionGoal: '1000.00', savings: '420.00', cashCushionGap: '580.00'});
  assert.equal(calcLibrary(profile('1500.00', '1000.00')).calcs.find(c => c.id === 'cash_cushion').result.cashCushionGap, '0.00');
  assert.equal(calcLibrary(profile('420.00', '1000.10')).calcs.find(c => c.id === 'cash_cushion').result.cashCushionGap, '580.10');
  assert.equal(calcLibrary(profile('420.00', null)).calcs.some(c => c.id === 'cash_cushion'), false);
  // The snapshot baseline that expand() compares against is unchanged by the cushion.
  assert.deepEqual(calcLibrary(profile('420.00', '1000.00')).calcs[0], calcLibrary(profile('420.00', null)).calcs[0]);
});

test('a budget saved in the workspace reaches the mentor with its cushion goal and verified figures', async () => {
  const sid = 'demo-context-budget-0001', calls = fakeModel();
  await post(sid, '/api/profile', {answers: {incomeHistory: [{month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2950'}], debts: [{name: 'Card', balance: '2400', aprPercent: '24.9', minPayment: '334'}]}});
  const csv = 'symbol,sector,market_value_usd\nAAPL,Information Technology,3000.00\nMSFT,Information Technology,1000.00\n';
  assert.equal((await post(sid, '/api/portfolio/upload', {csv})).status, 200);
  const saved = await (await post(sid, '/api/workspace/budget', {month: '2026-11', income: '2410.00', bills: '1100.00', spending: '521.00', savings: '420.00', cashCushion: '1000.00'})).json();
  assert.equal(saved.budget.snapshot.essentialsTotal, '1955.00');
  assert.equal(saved.profile.portfolio.securities.length, 2, 'holdings survive a budget save');
  const r = await post(sid, '/api/chat', {message: 'How should I budget when my pay keeps changing?', personaId: 'debt-free-coach', agentId: 'budget'});
  assert.equal(r.status, 200);
  const answer = await r.json();
  const coach = calls.find(c => c.includes('<coach>'));
  assert.ok(coach, 'generation ran');
  assert.match(coach, /"cash_cushion"/);
  assert.match(coach, /"cashCushionGap":"580\.00"/);
  assert.match(coach, /"lowestMonth":"1780\.00"/);
  assert.match(coach, /"essentials":"1955\.00"/);
  assert.match(answer.text, /\$580\.00/, 'the verified cushion gap can be quoted');
});

test('market refresh says when prices are the dated snapshot and why', async () => {
  const portfolio = {snapshotId: 's1', securities: [{name: 'AAPL', value: '3000.00'}, {name: 'MSFT', value: '1000.00'}]};
  const offline = await portfolioWatch(portfolio, null);
  assert.ok(offline.holdings.every(h => h.priceSource === 'snapshot'));
  assert.match(offline.fallbackNote, /2 of 2 prices come from the dated sample snapshot \(\d{4}-\d{2}-\d{2}\), not live quotes, because no live quote provider is configured/);
  process.env.MARKET_LIVE = '1'; process.env.FINNHUB_API_KEY = 'test-only';
  try {
    const failing = async () => { throw new Error('provider down'); };
    const down = await portfolioWatch(portfolio, null, {fetcher: failing});
    assert.ok(down.holdings.every(h => h.priceSource === 'snapshot'));
    assert.match(down.fallbackNote, /because the live quote provider did not respond/);
    const ok = async url => ({ok: true, json: async () => (String(url).includes('/quote?') ? {c: 101.5, t: 1794000000} : {})});
    const live = await portfolioWatch(portfolio, null, {fetcher: ok});
    assert.ok(live.holdings.every(h => h.priceSource === 'Finnhub'));
    assert.equal(live.fallbackNote, null);
  } finally { process.env.MARKET_LIVE = '0'; delete process.env.FINNHUB_API_KEY; }
});
