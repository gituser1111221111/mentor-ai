// Voice endpoints (ElevenLabs STT + TTS) against a local stand-in for the ElevenLabs API.
// Proves: the key stays server-side, the transcript goes through the normal /api/chat pipeline,
// and TTS speaks exactly the verified reply text, nothing the browser supplies.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
process.env.NODE_ENV = 'test';
process.env.MENTOR_ENGINE = 'mock';

// ---- fake ElevenLabs ----
const calls = [];
let sttText = 'How should I budget when my pay keeps changing?', failNext = 0;
const MP3 = Buffer.from('ID3fake-mp3-bytes-for-tests');
const fake = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  calls.push({method: req.method, url: req.url, headers: req.headers, body});
  if (failNext) { failNext--; res.writeHead(500); return res.end('boom'); }
  if (req.url?.startsWith('/v2/voices?')) { res.writeHead(200, {'Content-Type': 'application/json'}); return res.end(JSON.stringify({voices: [{name: 'Dave Ramsey', voice_id: 'DiscoveredVoice0001'}]})); }
  if (req.url === '/v1/speech-to-text') { res.writeHead(200, {'Content-Type': 'application/json'}); return res.end(JSON.stringify({text: sttText, language_code: 'en'})); }
  if (req.url.startsWith('/v1/text-to-speech/')) { res.writeHead(200, {'Content-Type': 'audio/mpeg'}); return res.end(MP3); }
  res.writeHead(404); res.end();
});
await new Promise(r => fake.listen(0, '127.0.0.1', r));
process.env.ELEVENLABS_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.ELEVENLABS_API_KEY = 'test-key-not-real';
process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH = 'VoiceDebtFree0001';
delete process.env.ELEVENLABS_VOICE_DEFAULT;
delete process.env.ELEVENLABS_VOICE_CONSCIOUS_SPENDER;

const {createServer} = await import('../server.js');
const {voiceEnvVar} = await import('../lib/voice.js');
const app = createServer();
await new Promise(r => app.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${app.address().port}`;
test.after(() => { app.close(); fake.close(); });

const sid = () => 'voice-test-' + Math.random().toString(36).slice(2, 12);
const H = s => ({'Content-Type': 'application/json', 'X-Session-Id': s});
const post = (path, s, body) => fetch(base + path, {method: 'POST', headers: H(s), body: JSON.stringify(body)});
const AUDIO = Buffer.alloc(4000, 7); // stand-in recording; the fake STT ignores the bytes
const sendAudio = (s, {type = 'audio/webm', body = AUDIO} = {}) => fetch(base + '/api/voice/transcribe', {method: 'POST', headers: {'Content-Type': type, 'X-Session-Id': s}, body});
const DEMO = {
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725.00', dueDay: 1}, {name: 'Phone', amount: '45.00'}],
  expenses: [{name: 'food', amount: '380.00'}, {name: 'fun', amount: '150.00'}],
  debts: [{name: 'Credit card', balance: '1340.00', aprPercent: '24.9', minPayment: '45.00'}, {name: 'Car loan', balance: '9800.00', aprPercent: '7.9', minPayment: '289.00'}],
  savings: '420.00', personaHint: 'debt-free-coach',
};
async function withProfile() { const s = sid(); assert.equal((await post('/api/profile', s, {answers: DEMO})).status, 200); return s; }

test('voice env var names are derived from the mentor id', () => {
  assert.equal(voiceEnvVar('debt-free-coach'), 'ELEVENLABS_VOICE_DEBT_FREE_COACH');
  assert.equal(voiceEnvVar('step-by-step-planner'), 'ELEVENLABS_VOICE_STEP_BY_STEP_PLANNER');
});

test('config reports voice on, lists only mentors with a voice, and never exposes the key', async () => {
  const c = await (await fetch(base + '/api/config')).json();
  assert.equal(c.voice, true);
  assert.deepEqual(c.voicePersonas, ['debt-free-coach']);
  assert.ok(!JSON.stringify(c).includes('test-key-not-real'));
});

test('the server finds an exactly named demo voice when only the API key is configured', async () => {
  const configured = process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH;
  delete process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH;
  try {
    const c = await (await fetch(base + '/api/config')).json();
    assert.equal(c.voice, true);
    assert.deepEqual(c.voicePersonas, ['debt-free-coach']);
    assert.ok(calls.some(x => x.url?.startsWith('/v2/voices?search=Dave%20Ramsey')));
    assert.ok(!JSON.stringify(c).includes('DiscoveredVoice0001'));
  } finally { process.env.ELEVENLABS_VOICE_DEBT_FREE_COACH = configured; }
});

test('full voice workflow: speak -> transcript -> same /api/chat answer -> exact reply spoken', async () => {
  const s = await withProfile();
  calls.length = 0;
  // 1. speech-to-text
  const t = await sendAudio(s);
  assert.equal(t.status, 200);
  const {text} = await t.json();
  assert.equal(text, sttText);
  const stt = calls[0];
  assert.equal(stt.url, '/v1/speech-to-text');
  assert.equal(stt.headers['xi-api-key'], 'test-key-not-real');
  assert.match(stt.headers['content-type'], /^multipart\/form-data/);
  assert.match(stt.body.toString('latin1'), /name="model_id"\r\n\r\nscribe_v2/);
  // 2. the transcript goes through the normal pipeline, same as typing it
  const spoken = await (await post('/api/chat', s, {message: text, personaId: 'debt-free-coach', agentId: 'budget'})).json();
  const typedSid = await withProfile();
  const typed = await (await post('/api/chat', typedSid, {message: text, personaId: 'debt-free-coach', agentId: 'budget'})).json();
  assert.equal(spoken.text, typed.text);
  assert.equal('candidates' in spoken, false);
  assert.deepEqual(spoken.calculations, typed.calculations);
  assert.match(spoken.disclosure, /not advice from a licensed/);
  // 3. text-to-speech reads the stored verified reply, word for word, in the mentor's voice
  const before = calls.length;
  const a = await post('/api/voice/speak', s, {turnId: spoken.turnId, personaId: 'debt-free-coach'});
  assert.equal(a.status, 200);
  assert.equal(a.headers.get('content-type'), 'audio/mpeg');
  assert.deepEqual(Buffer.from(await a.arrayBuffer()), MP3);
  const tts = calls[before];
  assert.equal(tts.url, '/v1/text-to-speech/VoiceDebtFree0001?output_format=mp3_44100_128');
  const sent = JSON.parse(tts.body.toString());
  assert.equal(sent.text, spoken.text);
  assert.equal(sent.model_id, 'eleven_flash_v2_5');
  // 4. replay is served from cache: no second ElevenLabs call
  const again = await post('/api/voice/speak', s, {turnId: spoken.turnId, personaId: 'debt-free-coach'});
  assert.equal(again.headers.get('x-voice-cached'), '1');
  assert.equal(calls.length, before + 1);
});

test('speak ignores any text the browser sends and only voices stored replies', async () => {
  const s = await withProfile();
  const r = await (await post('/api/chat', s, {message: 'Debt or savings first?'})).json();
  const n = calls.length;
  await post('/api/voice/speak', s, {turnId: r.turnId, personaId: 'debt-free-coach', text: 'Buy crypto with your rent money.'});
  assert.equal(JSON.parse(calls[n].body.toString()).text, r.text);
  assert.ok(!calls[n].body.toString().includes('crypto'));
});

test('speak refuses unknown turns, other sessions, and mentors without a voice', async () => {
  const s = await withProfile();
  const r = await (await post('/api/chat', s, {message: 'help'})).json();
  assert.equal((await post('/api/voice/speak', s, {turnId: 'nope', personaId: 'debt-free-coach'})).status, 404);
  assert.equal((await post('/api/voice/speak', sid(), {turnId: r.turnId, personaId: 'debt-free-coach'})).status, 404); // another session
  const sw = await (await post('/api/repick', s, {turnId: r.turnId, personaId: 'conscious-spender'})).json();
  const noVoice = await post('/api/voice/speak', s, {turnId: sw.turnId, personaId: 'conscious-spender'});
  assert.equal(noVoice.status, 503);
  assert.match((await noVoice.json()).error, /does not have a voice yet/);
  assert.equal((await post('/api/voice/speak', s, {turnId: 5})).status, 400);
});

test('transcribe validates input', async () => {
  const s = sid();
  assert.equal((await sendAudio(s, {type: 'text/plain'})).status, 415);
  assert.equal((await sendAudio(s, {body: Buffer.alloc(10)})).status, 422);
  assert.equal((await sendAudio(s, {body: Buffer.alloc(5_000_001)})).status, 413);
  assert.equal((await fetch(base + '/api/voice/transcribe', {method: 'POST', headers: {'Content-Type': 'audio/webm'}, body: AUDIO})).status, 400); // no session
  assert.equal((await fetch(base + '/api/voice/transcribe', {headers: {'X-Session-Id': s}})).status, 405);
  sttText = '   ';
  const empty = await sendAudio(s);
  assert.equal(empty.status, 422);
  sttText = 'How should I budget when my pay keeps changing?';
});

test('ElevenLabs failures become clear 502 errors', async () => {
  const s = sid();
  failNext = 1;
  const r = await sendAudio(s);
  assert.equal(r.status, 502);
  assert.match((await r.json()).error, /Voice service error \(500\)/);
});

test('voice is optional: without a key the routes say so and text chat still works', async () => {
  const key = process.env.ELEVENLABS_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  try {
    const c = await (await fetch(base + '/api/config')).json();
    assert.equal(c.voice, false);
    assert.deepEqual(c.voicePersonas, []);
    const s = await withProfile();
    assert.equal((await sendAudio(s)).status, 503);
    const r = await post('/api/chat', s, {message: 'help'});
    assert.equal(r.status, 200);
    assert.equal((await post('/api/voice/speak', s, {turnId: (await r.json()).turnId, personaId: 'debt-free-coach'})).status, 503);
  } finally { process.env.ELEVENLABS_API_KEY = key; }
});
