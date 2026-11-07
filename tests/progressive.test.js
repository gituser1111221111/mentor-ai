// Progressive response + timing instrumentation, with a scripted Claude stand-in that has artificial delays.
// These timings measure the app's orchestration only. They are NOT live Claude latency.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
process.env.MENTOR_MAX_OPTIONS = '40';
process.env.MENTOR_INITIAL_OPTIONS = '8';
process.env.MENTOR_TARGET_THRESHOLD_MS = '700'; // small so the slow-flag path is exercised
const {setClient} = await import('../lib/mentor/llm.js');
const {chat, repick, expand, looksLikeMoneyQuestion} = await import('../lib/mentor/chat.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {normalizeProfile} = await import('../lib/profile.js');
const {summarize, percentile, TARGETS} = await import('../lib/mentor/perf.js');

const {profile} = normalizeProfile({
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725'}], expenses: [{name: 'food', amount: '380'}],
  debts: [{name: 'Card', balance: '1340', aprPercent: '24.9', minPayment: '45'}], savings: '420',
});
const calcIds = calcLibrary(profile).calcs.map(c => c.id).filter(id => id !== 'snapshot');
const word = i => 'abcdefghijklmnopqrstuvwxyz'[i % 26] + (i >= 26 ? 'x'.repeat(Math.floor(i / 26)) : ''); // no digits: the validator rejects unbacked numbers
const opt = (title, i, extra = {}) => ({title, summary: `${title} for this user.`, calcIds: [calcIds[i % calcIds.length]], tradeoffs: 'Tradeoff.', risk: 'low', timeToGoalMonths: null, ...extra});
const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(Object.assign(new Error('aborted'), {name: 'AbortError'})); });
});
const textRes = obj => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(obj)}], usage: {}, model: 'fake'});

// kind of call: 'pick' has <options>, 'generate' has <coach>, otherwise conversation classification.
function fake({classify = 'finance', delays = {classify: 300, generate: 600, pick: 150}, batches} = {}) {
  const log = [];
  let genCount = 0;
  const create = async (params, opts) => {
    const content = String(params.messages[0].content);
    const kind = content.includes('<options>') ? 'pick' : content.includes('<coach>') ? 'generate' : 'classify';
    const entry = {kind, start: performance.now(), signal: opts?.signal, content};
    log.push(entry);
    await sleep(delays[kind] || 0, opts?.signal);
    entry.end = performance.now();
    if (kind === 'classify') return textRes({kind: classify, reply: classify === 'conversation' ? 'Hey! Good to see you.' : ''});
    if (kind === 'generate') {
      const batch = batches ? batches[Math.min(genCount, batches.length - 1)] : Array.from({length: 8}, (_, i) => opt(`Initial option ${word(i)}`, i));
      genCount++;
      return textRes({needsInfo: null, candidates: batch});
    }
    const options = JSON.parse(content.match(/<options>(.*)<\/options>/s)[1]);
    return textRes({pickId: options[0].id, runnersUp: [], rationale: 'Fits.', reply: 'Start with this one.', whyNotOthers: '', noteIds: [], memoryFacts: []});
  };
  return {log, client: {messages: {create}, beta: {messages: {create}}}};
}
const ask = (content, agentId = 'budget') => chat({personaId: 'debt-free-coach', agentId, messages: [{role: 'user', content}], profile});

test('money questions start classification and option generation together', async () => {
  const f = fake(); setClient(f.client);
  const r = await ask('How should I budget when my pay keeps changing?');
  const cls = f.log.find(x => x.kind === 'classify'), gen = f.log.find(x => x.kind === 'generate');
  assert.ok(gen.start < cls.end, 'generation began before classification finished');
  // Concurrent: about max(300, 600) + 150, versus 1050 sequential. Allow scheduling slack.
  assert.ok(r.timing.totalMs < 950, `total ${r.timing.totalMs}ms should beat the sequential 1050ms`);
  assert.ok(r.timing.stages.firstVerifiedMs <= r.timing.totalMs);
  for (const k of ['calculationsMs', 'classificationMs', 'generationMs', 'validationMs', 'mentorPickMs']) assert.ok(r.timing.stages[k] >= 0, k);
});

test('greetings never start generation; money-like small talk cancels it for real', async () => {
  assert.equal(looksLikeMoneyQuestion('hi'), false);
  let f = fake({classify: 'conversation'}); setClient(f.client);
  const hi = await ask('hi');
  assert.equal(hi.conversational, true);
  assert.equal(f.log.filter(x => x.kind === 'generate').length, 0);
  f = fake({classify: 'conversation'}); setClient(f.client);
  const r = await ask('thanks, that budget tip helped a lot');
  assert.equal(r.conversational, true);
  const gen = f.log.find(x => x.kind === 'generate');
  assert.ok(gen?.signal?.aborted, 'speculative generation was aborted');
});

test('first answer reviews only the initial verified subset and says so', async () => {
  const f = fake(); setClient(f.client);
  const r = await ask('Should I pay my card or save first?');
  assert.equal(r.candidates.length, 8);
  assert.equal(r.optionsReviewed, 8);
  assert.equal(r.canExpand, true);
  const sent = JSON.parse(f.log.find(x => x.kind === 'pick').content.match(/<options>(.*)<\/options>/s)[1]);
  assert.equal(sent.length, 8); // the mentor was not sent 40 options
  assert.match(f.log.find(x => x.kind === 'generate').content, /Give between 3 and 8 options/);
});

test('expansion grows to 40 distinct verified options without changing the shown answer', async () => {
  const initial = Array.from({length: 8}, (_, i) => opt(`Initial option ${word(i)}`, i));
  const more = [...initial.slice(0, 3), // repeats must not crowd out new options
    ...Array.from({length: 33}, (_, i) => opt(`Extra option ${word(i)}`, i + 8)),
    opt('Invented goal', 0, {summary: 'Save $9,999.00 by spring.'})];
  const f = fake({batches: [initial, more]}); setClient(f.client);
  const r = await ask('Give me every way to get ahead of my bills');
  const before = JSON.stringify({text: r.text, pick: r.pick, first: r.candidates});
  const [a, b] = await Promise.all([expand({turnId: r.turnId}), expand({turnId: r.turnId})]); // double click
  assert.equal(a, b, 'concurrent expands share one job');
  assert.equal(f.log.filter(x => x.kind === 'generate').length, 2, 'one initial + one expansion call');
  assert.equal(a.total, 40);
  assert.equal(a.added.length, 32);
  assert.ok(!a.added.some(c => /9,999/.test(c.summary)), 'unverified number dropped');
  assert.deepEqual(a.added.map(c => c.id), Array.from({length: 32}, (_, i) => `c${i + 9}`));
  assert.match(f.log.filter(x => x.kind === 'generate')[1].content, /Do not repeat or rephrase these options already shown/);
  assert.equal(JSON.stringify({text: r.text, pick: r.pick, first: r.candidates}), before); // shown answer untouched
  const full = await repick({turnId: r.turnId, personaId: 'debt-free-coach'});
  assert.equal(full.optionsReviewed, 40);
  assert.equal(full.canExpand, false);
  const again = await expand({turnId: r.turnId});
  assert.equal(again.added.length, 0); // already full
});

test('expanding an unknown turn is rejected', async () => {
  await assert.rejects(() => expand({turnId: 'nope'}), /Unknown turn/);
});

test('slow responses are flagged, not cut off', async () => {
  const f = fake({delays: {classify: 100, generate: 750, pick: 50}}); setClient(f.client);
  const r = await ask('What do I do in my slow months?');
  assert.equal(TARGETS.thresholdMs, 700);
  assert.equal(r.timing.flags.overThreshold, true);
  assert.ok(r.text && r.candidates.length === 8, 'the full verified answer still arrived');
});

test('API failure surfaces as an error instead of an unverified answer', async () => {
  const create = async params => { if (String(params.messages[0].content).includes('<coach>')) throw new Error('upstream 529'); return textRes({kind: 'finance', reply: ''}); };
  setClient({messages: {create}, beta: {messages: {create}}});
  await assert.rejects(() => ask('How do I budget this month?'), /529/);
});

test('timing statistics: median, P90, P95 and shares within targets', () => {
  const v = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 12000];
  const s = summarize(v);
  assert.equal(s.median, 5000);
  assert.equal(s.p90, 9000);
  assert.equal(s.p95, 12000);
  assert.equal(s.within5s, 50);
  assert.equal(s.within8s, 80);
  assert.equal(s.within10s, 90);
  assert.equal(percentile([], 50), null);
});
