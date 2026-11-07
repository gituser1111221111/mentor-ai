// HTTP flow for progressive answers on the live engine path, with a scripted Claude stand-in (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MENTOR_API_KEY = 'test-not-real';
delete process.env.MENTOR_ENGINE;
delete process.env.MENTOR_DEBUG_PERF;
process.env.MENTOR_MAX_OPTIONS = '40';
process.env.MENTOR_INITIAL_OPTIONS = '8';
const {setClient} = await import('../lib/mentor/llm.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {normalizeProfile} = await import('../lib/profile.js');
const {createServer} = await import('../server.js');

const answers = {incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725'}], expenses: [{name: 'food', amount: '380'}],
  debts: [{name: 'Card', balance: '1340', aprPercent: '24.9', minPayment: '45'}], savings: '420'};
const calcIds = calcLibrary(normalizeProfile(answers).profile).calcs.map(c => c.id).filter(id => id !== 'snapshot');
const word = i => 'abcdefghijklmnopqrstuvwxyz'[i % 26] + (i >= 26 ? 'x'.repeat(Math.floor(i / 26)) : '');
const opt = (t, i) => ({title: t, summary: `${t} for this user.`, calcIds: [calcIds[i % calcIds.length]], tradeoffs: 'Tradeoff.', risk: 'low', timeToGoalMonths: null});
const textRes = obj => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(obj)}], usage: {}, model: 'fake'});
let failExpand = false, gens = 0;
const create = async params => {
 if (params.output_config.format.schema.properties.updates) return {content:[{type:'text',text:JSON.stringify({updates:[],clarification:''})}],stop_reason:'end_turn',usage:{}};
  const c = String(params.messages[0].content);
  if (c.includes('<options>')) { const o = JSON.parse(c.match(/<options>(.*)<\/options>/s)[1]); return textRes({pickId: o.at(-1).id, runnersUp: [], rationale: 'Fits.', reply: `I reviewed these and picked one.`, whyNotOthers: '', noteIds: [], memoryFacts: []}); }
  if (c.includes('<coach>')) {
    if (c.includes('already shown')) { if (failExpand) throw new Error('upstream 529'); return textRes({needsInfo: null, candidates: Array.from({length: 32}, (_, i) => opt(`More option ${word(i)}`, i))}); }
    gens++; return textRes({needsInfo: null, candidates: Array.from({length: 8}, (_, i) => opt(`First option ${word(i)} ${word(gens)}`, i))});
  }
  return textRes({kind: 'finance', reply: ''});
};
setClient({messages: {create}, beta: {messages: {create}}});

test('quiz -> fast answer -> expand to 40 -> explicit full review -> consecutive questions, nothing lost', async () => {
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const h = {'Content-Type': 'application/json', 'X-Session-Id': 'expand-route-session-0001'};
  const post = async (p, b) => { const r = await fetch(base + p, {method: 'POST', headers: h, body: JSON.stringify(b || {})}); return {status: r.status, json: await r.json()}; };
  try {
    assert.equal((await post('/api/profile', {answers})).status, 200);
    const c = await post('/api/chat', {message: 'How should I budget when my pay keeps changing?'});
    assert.equal(c.status, 200);
    assert.equal(c.json.optionsReviewed, 8);
    assert.equal(c.json.canExpand, true);
    for (const k of ['timing', 'candidates', 'pick', 'validation']) assert.equal(c.json[k], undefined, `${k} stays internal`);

    const x = await post('/api/expand', {turnId: c.json.turnId});
    assert.equal(x.status, 200);
    assert.equal(x.json.total, 40);
    assert.equal(x.json.added.length, 32);
    assert.equal(x.json.reviewedByMentor, false);
    assert.deepEqual(Object.keys(x.json.added[0]).sort(), ['id', 'risk', 'summary', 'title', 'tradeoffs']);

    const full = await post('/api/repick', {turnId: c.json.turnId, personaId: 'debt-free-coach'}); // expanded turn was persisted
    assert.equal(full.status, 200);
    assert.equal(full.json.optionsReviewed, 40);

    const c2 = await post('/api/chat', {message: 'And what about my credit card debt?'});
    assert.equal(c2.status, 200);
    assert.notEqual(c2.json.turnId, c.json.turnId);
    failExpand = true;
    const bad = await post('/api/expand', {turnId: c2.json.turnId});
    assert.equal(bad.status, 503);
    assert.match(bad.json.error, /earlier answer is unchanged/);
    failExpand = false;

    const hist = (await (await fetch(base + '/api/history', {headers: h})).json()).history;
    assert.equal(hist.filter(m => m.role === 'user').length, 2);
    assert.ok(hist.filter(m => m.role === 'assistant').length >= 3); // two answers + the full review
    assert.equal((await post('/api/repick', {turnId: c.json.turnId, personaId: 'debt-free-coach'})).status, 200); // early turn still there

    assert.equal((await fetch(base + '/api/perf')).status, 404); // dev stats hidden unless MENTOR_DEBUG_PERF=1
    assert.equal((await post('/api/expand', {turnId: 'missing'})).status, 404);
    const cfg = await (await fetch(base + '/api/config')).json();
    assert.equal(cfg.perf.thresholdMs, 10000);
  } finally { await new Promise(r => server.close(r)); }
});
