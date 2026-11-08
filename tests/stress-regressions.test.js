// Regressions from the live stress test (fake Claude client; mocked model responses, not live Claude).
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test'; process.env.MENTOR_ENGINE = 'live'; process.env.MENTOR_API_KEY = 'test-only';
process.env.CHAT_LIMIT_PER_HOUR = '1000'; process.env.MARKET_LIVE = '0';
const {setClient} = await import('../lib/mentor/llm.js');
const {createServer} = await import('../server.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => app.close());
const post = (sid, path, body) => fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: JSON.stringify(body)});
const textRes = data => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(data)}], usage: {}});
let lastError = null;
function fakeModel({kind = 'finance', reply = 'Here is the plan.'} = {}) {
  const create = async params => {
    if (params.output_config.format.schema.properties.updates) return textRes({updates: [], clarification: ''});
    const content = params.messages[0].content;
    if (content.includes('<coach>')) return textRes({needsInfo: null, candidates: ['Snowball', 'Budget', 'Reserve'].map(title => ({title, summary: 'Follow the plan.', calcIds: [], risk: 'low', tradeoffs: 'Slower.', timeToGoalMonths: null}))});
    if (content.includes('<options>')) { const ids = [...content.matchAll(/"id":"(c\d+)"/g)].map(m => m[1]); return textRes({pickId: ids[0] || 'c1', runnersUp: [], rationale: 'Clear first.', reply, whyNotOthers: 'Later.', noteIds: [], memoryFacts: []}); }
    if (params.output_config.format.schema.properties.kind) return textRes({kind, reply});
    return textRes({reply});
  };
  setClient({messages: {create}, beta: {messages: {create}}});
}

test('demo-profile minimums payoff question answers instead of failing', async () => {
  fakeModel();
  const r = await post('stress-demo-minimums-01', '/api/chat', {message: 'How long to pay off the debts on minimums only?', personaId: 'debt-free-coach', agentId: 'budget', demoProfile: true});
  const body = await r.json();
  assert.equal(r.status, 200, JSON.stringify(body));
});

test('money movement and trade execution requests get a clear refusal without a model call', async () => {
  let calls = 0; const create = async () => { calls++; throw new Error('model should not be called'); };
  setClient({messages: {create}, beta: {messages: {create}}});
  for (const message of ['Move $500 from my savings to pay my credit card for me right now.', 'Can you buy 10 shares of NVDA for me?', 'Could you transfer my paycheck into savings?']) {
    const r = await post('stress-guard-action-01', '/api/chat', {message, personaId: 'debt-free-coach'});
    const body = await r.json();
    assert.equal(r.status, 200);
    assert.match(body.text, /can’t move money, make payments, or place trades/);
    assert.equal(body.mode, 'guardrail');
    assert.ok(body.voiceTurnId);
  }
  assert.equal(calls, 0);
});

test('guarantee requests get an honest no-guarantee reply', async () => {
  let calls = 0; const create = async () => { calls++; throw new Error('model should not be called'); };
  setClient({messages: {create}, beta: {messages: {create}}});
  const r = await post('stress-guard-promise-1', '/api/chat', {message: 'Guarantee me I will be a millionaire by 30 if I follow your plan.', personaId: 'debt-free-coach'});
  const body = await r.json();
  assert.match(body.text, /No one can honestly guarantee that/);
  assert.equal(calls, 0);
});

test('ordinary questions about payments are not caught by the guardrail', async () => {
  const {guardrailReply} = await import('../lib/mentor/guardrails.js');
  for (const q of ['Should I pay my card now or build savings?', 'How do I transfer money between my own accounts?', 'Is it smart to buy index funds?', 'Summarize this.']) assert.equal(guardrailReply(q), null, q);
});

test('summarize this returns a code-built overview covering budget, debt and portfolio', async () => {
  const {calcLibrary} = await import('../lib/mentor/tools.js');
  const {directAnswer} = await import('../lib/mentor/direct.js');
  const {validateCandidates} = await import('../lib/mentor/validate.js');
  const {demoWorkspace} = await import('../lib/workspace-demo.js');
  const d = demoWorkspace(), lib = calcLibrary({...d.profile, cashCushion: d.budget.cashCushion}, 'Summarize this.');
  const a = directAnswer('Summarize this.', lib);
  assert.match(a.summary, /lowest month/); assert.match(a.summary, /cushion/); assert.match(a.summary, /Debt totals/); assert.match(a.summary, /portfolio is \$119,686\.70 across 13 holdings/);
  assert.equal(validateCandidates([a], lib, {max: 8}).candidates.length, 1, 'every figure is backed by a calculation');
});
