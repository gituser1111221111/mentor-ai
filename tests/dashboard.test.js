// Dashboard routes: what-if scenarios never change saved holdings; plan saves keep chat and holdings.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test'; process.env.MENTOR_ENGINE = 'mock'; process.env.MARKET_LIVE = '0';
const {createServer} = await import('../server.js');
const {demoWorkspace} = await import('../lib/workspace-demo.js');
const {whatIf, savePlan} = await import('../lib/workspace.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => app.close());
const call = (sid, path, body, method = 'POST') => fetch(base + path, {method, headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: body ? JSON.stringify(body) : undefined});

test('sample portfolio values Sentinel holdings at snapshot prices with complete history', () => {
  const d = demoWorkspace(), a = d.advancedRisk;
  assert.equal(d.review.marketValue, '119686.70');
  assert.equal(a.history.complete, true);
  assert.deepEqual(a.history.missing, []);
  for (const k of ['beta', 'vol', 'maxDD', 'sharpe']) assert.equal(typeof a.metrics[k], 'number', k);
  assert.equal(d.budget.snapshot.essentialsTotal, '3650.00');
  assert.equal(d.budget.reserveGap, '6040.00');
});

test('trim-to-cash releases exact cents and leaves the input portfolio untouched', () => {
  const d = demoWorkspace(), before = JSON.stringify(d.profile.portfolio);
  const r = whatIf(d.profile.portfolio, d.guidelines, {symbol: 'NVDA', toPercent: 10, positionLimit: 25});
  assert.equal(JSON.stringify(d.profile.portfolio), before);
  assert.equal(r.cashReleased, '10432.93');
  const nvda = r.after.rows.find(x => x.symbol === 'NVDA'), cash = r.after.rows.find(x => x.isCash);
  assert.ok(Math.abs(nvda.weight - 10) < 0.01);
  assert.equal(cash.value, 10432.93);
  assert.ok(r.after.metrics.beta < r.before.metrics.beta);
  assert.equal(r.positionLimit, 25);
  assert.throws(() => whatIf(d.profile.portfolio, d.guidelines, {symbol: 'ZZZZ', toPercent: 5}), /Choose a holding/);
  assert.throws(() => whatIf({}, null, {symbol: 'NVDA', toPercent: 5}), /Import holdings/);
});

test('plan saves categories in exact cents and validates amounts', () => {
  const p = savePlan({categories: [{name: 'Housing', amount: '1600', fixed: true}, {name: 'Food', amount: '550.5'}], incomeHistory: [{month: '2026-11', amount: '5200'}], savings: '100'}, {debts: [{name: 'Card', balance: '100.00', rateBps: 1000, minPayment: '25.00'}]});
  assert.deepEqual(p.bills, [{name: 'Housing', amount: '1600.00'}]);
  assert.deepEqual(p.expenses, [{name: 'Food', amount: '550.50'}]);
  assert.equal(p.debts.length, 1, 'debts are kept');
  assert.throws(() => savePlan({categories: [{name: 'Food', amount: '12.345'}]}, {}), /dollar amount/);
});

test('saving the plan keeps chat history and holdings; what-if route never saves', async () => {
  const sid = 'dashboard-route-000001';
  await call(sid, '/api/profile', {answers: {incomeHistory: [{month: '2026-10', amount: '3000'}]}});
  await call(sid, '/api/portfolio/upload', {csv: 'symbol,sector,market_value_usd\nAAPL,Information Technology,3000.00\nJPM,Financials,1000.00\n'});
  assert.equal((await call(sid, '/api/chat', {message: 'How should I budget?'})).status, 200);
  const historyBefore = (await (await call(sid, '/api/history', null, 'GET')).json()).history.length;
  const saved = await call(sid, '/api/workspace/plan', {categories: [{name: 'Housing', amount: '1200', fixed: true}, {name: 'Food', amount: '400'}], cashCushion: '2000'});
  assert.equal(saved.status, 200);
  const ws = await saved.json();
  assert.equal(ws.budget.snapshot.essentialsTotal, '1600.00');
  assert.equal(ws.budget.cashCushion, '2000.00');
  assert.equal(ws.profile.portfolio.securities.length, 2);
  assert.equal((await (await call(sid, '/api/history', null, 'GET')).json()).history.length, historyBefore);
  const scenario = await (await call(sid, '/api/workspace/whatif', {symbol: 'AAPL', toPercent: 50})).json();
  assert.equal(scenario.cashReleased, '1000.00');
  const after = await (await call(sid, '/api/workspace', null, 'GET')).json();
  assert.equal(after.profile.portfolio.marketValue, '4000.00');
  assert.equal(after.profile.portfolio.securities.find(s => s.name === 'AAPL').value, '3000.00');
  assert.equal((await call(sid, '/api/workspace/whatif', {sample: true, symbol: 'NVDA', toPercent: 10})).status, 200);
});

test('saving the example plan as your own keeps its debts so totals match what was shown', () => {
  const d = demoWorkspace();
  const p = savePlan({categories: [{name: 'Housing', amount: '1600', fixed: true}, {name: 'Food', amount: '500'}, {name: 'Transport', amount: '350'}, {name: 'Lifestyle', amount: '450'}], debts: d.profile.debts, incomeHistory: d.profile.incomeHistory, savings: '10600'}, {});
  assert.equal(p.debts.length, 1);
  assert.equal(p.debts[0].minPayment, '700.00');
  assert.throws(() => savePlan({categories: [], debts: [{name: 'Card', balance: '10', rateBps: 99999, minPayment: '1'}]}, {}), /APR/);
});
