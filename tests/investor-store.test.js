// Risk tolerance and investment horizon reach the mentor; the session file can be encrypted at rest.
// Uses a fake Claude client (no network). These are mocked model responses, not live Claude results.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.NODE_ENV = 'test'; process.env.MENTOR_ENGINE = 'live'; process.env.MENTOR_API_KEY = 'test-only';
process.env.CHAT_LIMIT_PER_HOUR = '1000'; process.env.MARKET_LIVE = '0';
const {normalizeProfile} = await import('../lib/profile.js');
const {saveBudget} = await import('../lib/workspace.js');
const {serialize, deserialize, load, write, storeKey} = await import('../lib/store.js');
const {setClient} = await import('../lib/mentor/llm.js');
const {createServer} = await import('../server.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => app.close());
const post = (sid, p, body) => fetch(base + p, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: JSON.stringify(body)});
const textRes = data => ({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify(data)}], usage: {}});
function fakeModel() {
  const calls = [];
  const create = async params => {
    if (params.output_config.format.schema.properties.updates) return textRes({updates: [], clarification: ''});
    const content = params.messages[0].content; calls.push(content);
    if (content.includes('<coach>')) return textRes({needsInfo: null, candidates: ['Reserve', 'Budget', 'Review'].map(title => ({title, summary: 'Keep savings available.', calcIds: [], risk: 'low', tradeoffs: 'Slower.', timeToGoalMonths: null}))});
    if (content.includes('<options>')) return textRes({pickId: 'c1', runnersUp: [], rationale: 'Safety first.', reply: 'Keep your savings available.', whyNotOthers: 'Later.', noteIds: [], memoryFacts: []});
    if (params.output_config.format.schema.properties.kind) return textRes({kind: 'finance', reply: ''});
    return textRes({reply: ''});
  };
  setClient({messages: {create}, beta: {messages: {create}}});
  return calls;
}
const base6 = {incomeHistory: [{month: '2026-10', amount: '3000'}], bills: [{name: 'Rent', amount: '1000'}], savings: '500'};

test('risk tolerance and horizon are validated, optional, and survive a budget save', () => {
  const ok = normalizeProfile({...base6, riskTolerance: 'conservative', investmentHorizon: 'long'});
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.profile.riskTolerance, 'conservative');
  assert.equal(ok.profile.investmentHorizon, 'long');
  const unset = normalizeProfile({...base6, riskTolerance: '', investmentHorizon: undefined});
  assert.equal('riskTolerance' in unset.profile, false);
  assert.equal('investmentHorizon' in unset.profile, false);
  const bad = normalizeProfile({...base6, riskTolerance: 'yolo', investmentHorizon: '30 years'});
  assert.deepEqual(bad.errors.map(e => e.field), ['riskTolerance', 'investmentHorizon']);
  const next = saveBudget({month: '2026-11', income: '3000.00', bills: '1000.00', spending: '0', savings: '500.00', cashCushion: '0'}, ok.profile);
  assert.equal(next.profile.riskTolerance, 'conservative');
  assert.equal(next.profile.investmentHorizon, 'long');
});

test('the mentor receives the stated risk tolerance and horizon, and "not provided" when unset', async () => {
  let calls = fakeModel();
  assert.equal((await post('investor-profile-set-01', '/api/profile', {answers: {...base6, riskTolerance: 'conservative', investmentHorizon: 'short'}})).status, 200);
  assert.equal((await post('investor-profile-set-01', '/api/chat', {message: 'Should I invest my savings?', personaId: 'debt-free-coach', agentId: 'budget'})).status, 200);
  for (const tag of ['<coach>', '<options>']) {
    const content = calls.find(c => c.includes(tag));
    assert.ok(content, `${tag} call ran`);
    assert.match(content, /"riskTolerance":"conservative"/);
    assert.match(content, /"investmentHorizon":"short \(needs the money within three years\)"/);
  }
  calls = fakeModel();
  await post('investor-profile-none-1', '/api/profile', {answers: base6});
  await post('investor-profile-none-1', '/api/chat', {message: 'Should I invest my savings?', personaId: 'debt-free-coach', agentId: 'budget'});
  assert.match(calls.find(c => c.includes('<coach>')), /"riskTolerance":"not provided","investmentHorizon":"not provided"/);
  assert.equal((await post('investor-profile-bad-01', '/api/profile', {answers: {...base6, riskTolerance: 'yolo'}})).status, 422);
});

test('the intake form offers both questions as optional and sends them', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="intake-risk"[\s\S]*?<option value="">Prefer not to say<\/option>[\s\S]*?value="conservative"[\s\S]*?value="moderate"[\s\S]*?value="aggressive"/);
  assert.match(html, /id="intake-horizon"[\s\S]*?<option value="">Not sure yet<\/option>[\s\S]*?value="short"[\s\S]*?value="medium"[\s\S]*?value="long"/);
  assert.match(js, /riskTolerance: \$\('#intake-risk'\)\.value, investmentHorizon: \$\('#intake-horizon'\)\.value/);
});

const KEY_HEX = 'a'.repeat(64), OTHER_HEX = 'b'.repeat(64);
const sample = {sessions: {'abcdefabcdefabcdef': {profile: {incomeHistory: [{month: '2026-10', amount: '1780.00'}], savings: '420.00'}, memory: [], messages: [], turns: {}}}};

test('encrypted session file round-trips and hides financial details', () => {
  const key = storeKey(KEY_HEX);
  const text = serialize(sample, key);
  assert.doesNotMatch(text, /1780|420\.00|abcdefabcdef|incomeHistory/);
  assert.match(text, /"alg":"aes-256-gcm"/);
  assert.deepEqual(deserialize(text, key), sample);
  assert.notEqual(serialize(sample, key), text, 'a fresh IV each save');
  assert.equal(serialize(sample, null), JSON.stringify(sample), 'no key keeps the plain format');
  assert.equal(storeKey(''), null);
  assert.throws(() => storeKey('not-hex'), /64 hex characters/);
});

test('a tampered, wrong-key or keyless encrypted file is kept aside, never overwritten', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mentor-store-'));
  const file = path.join(dir, 'store.json');
  const key = storeKey(KEY_HEX);
  write(sample, file, key);
  const original = fs.readFileSync(file, 'utf8');
  assert.deepEqual(load(file, key), sample);
  const tampered = JSON.parse(original); tampered.data = Buffer.from('x'.repeat(40)).toString('base64');
  assert.throws(() => deserialize(JSON.stringify(tampered), key));
  for (const wrong of [storeKey(OTHER_HEX), null]) {
    write(sample, file, key);
    const errors = []; const orig = console.error; console.error = m => errors.push(m);
    try { assert.deepEqual(load(file, wrong), {sessions: {}}); } finally { console.error = orig; }
    assert.equal(fs.existsSync(file), false, 'unreadable file moved, not overwritten');
    const aside = fs.readdirSync(dir).filter(f => f.includes('.unreadable-'));
    assert.ok(aside.length, 'kept aside');
    assert.match(errors.join(' '), /could not be read/);
    assert.doesNotMatch(errors.join(' '), new RegExp(KEY_HEX));
  }
  fs.rmSync(dir, {recursive: true, force: true});
});

test('an existing plain session file is read with a key set and encrypted on the next save', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mentor-store-'));
  const file = path.join(dir, 'store.json');
  write(sample, file, null);
  const key = storeKey(KEY_HEX);
  const data = load(file, key);
  assert.deepEqual(data, sample);
  write(data, file, key);
  assert.match(fs.readFileSync(file, 'utf8'), /mentor-store-encrypted/);
  assert.deepEqual(load(file, key), sample);
  if(process.platform !== 'win32') assert.equal((fs.statSync(file).mode & 0o777).toString(8), '600');
  fs.rmSync(dir, {recursive: true, force: true});
});
