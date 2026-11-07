// No AI or voice key on the server: the app must say so plainly, keep non-AI features working,
// and never echo configuration. Runs in its own process so the engine sees no key.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
for (const k of ['MENTOR_API_KEY', 'ANTHROPIC_API_KEY', 'MENTOR_ENGINE', 'ELEVENLABS_API_KEY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) delete process.env[k];
process.env.MARKET_LIVE = '0';
const {createServer} = await import('../server.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => app.close());
const sid = 'missing-credentials-0001';
const post = (path, body) => fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: JSON.stringify(body)});

test('health reports which services are configured as booleans only', async () => {
  const h = await (await fetch(base + '/api/health')).json();
  assert.equal(h.ok, true);
  assert.equal(h.mentorConfigured, false);
  assert.equal(h.voiceConfigured, false);
  assert.equal(h.supabaseConfigured, false);
});

test('chat without an AI key explains the setup problem instead of asking the user to retry', async () => {
  const cfg = await (await fetch(base + '/api/config')).json();
  assert.equal(cfg.engine, 'unavailable');
  assert.equal((await post('/api/profile', {answers: {incomeHistory: [{month: '2026-10', amount: '2000'}], bills: [{name: 'Rent', amount: '900'}]}})).status, 200);
  const r = await post('/api/chat', {message: 'How should I budget?'});
  assert.equal(r.status, 503);
  const body = await r.json();
  assert.equal(body.code, 'AI_NOT_CONFIGURED');
  assert.match(body.error, /not set up/);
  assert.doesNotMatch(body.error, /try again/i);
  assert.doesNotMatch(JSON.stringify(body), /MENTOR_API_KEY|ANTHROPIC|sk-ant/);
});

test('budget, portfolio and voice routes still respond without AI, voice or Supabase credentials', async () => {
  const budget = await post('/api/workspace/budget', {month: '2026-11', income: '2410.00', bills: '1100.00', spending: '521.00', savings: '420.00', cashCushion: '1000.00'});
  assert.equal(budget.status, 200);
  assert.equal((await budget.json()).budget.reserveGap, '580.00');
  const up = await post('/api/portfolio/upload', {csv: 'symbol,sector,market_value_usd\nAAPL,Information Technology,3000.00\nJPM,Financials,1000.00\n'});
  assert.equal(up.status, 200);
  assert.equal((await up.json()).marketValue, '4000.00');
  const speak = await post('/api/voice/speak', {turnId: 'none', personaId: 'debt-free-coach'});
  assert.equal(speak.status, 503);
  assert.equal((await speak.json()).voice, false);
});
