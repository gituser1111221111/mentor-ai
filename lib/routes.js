// Mentor app routes (Section B). Mounted from server.js before the starter's Supabase routes.
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeProfile, snapshot} from './profile.js';
import {summarizePortfolioCSV} from './portfolio.js';
import * as store from './store.js';
import {createCheckout, confirmCheckout, stripeConfigured, PLAN} from './billing.js';
import {loadPersona} from './mentor/personas.js';
import {COACHES} from './mentor/generate.js';
import {voiceConfigured, voicedPersonas, voiceIdFor, transcribe, synthesize, sttModel, VoiceError, AUDIO_TYPES, MAX_AUDIO_BYTES, MAX_SPEAK_CHARS} from './voice.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJSON = async rel => JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));

// Catalog with live availability: a mentor is "built" when its persona loads (built-in or the
// teammate's personas/<id>/ files); a coach is built when the engine has a focus for it.
async function catalog() {
  const c = await readJSON('config/catalog.json');
  c.personas = c.personas.map(p => ({...p, built: Boolean(loadPersona(p.id))}));
  c.agents = c.agents.map(a => ({...a, built: Boolean(COACHES[a.id])}));
  return c;
}
const isPlus = s => s.tier === 'plus';
// Returns null if allowed, else [status, json].
async function gate(s, {personaId, agentId}) {
  const c = await catalog();
  const checks = [[c.personas, personaId, 'mentor'], [c.agents, agentId, 'coach']];
  for (const [list, id, kind] of checks) {
    if (!id) continue;
    const item = list.find(x => x.id === id);
    if (!item) return [404, {error: `Unknown ${kind}`}];
    if (item.tier === 'plus' && !isPlus(s)) return [402, {error: `${item.name} is part of Plus.`, upgrade: true}];
    if (!item.built) return [409, {error: `${item.name} is coming soon.`, comingSoon: true}];
  }
  return null;
}

// Real engine when Section A's chat.js exists and a key is set; otherwise the mock.
let engine;
async function getEngine() {
  if (engine) return engine;
  const real = path.join(root, 'lib', 'mentor', 'chat.js');
  if ((process.env.MENTOR_API_KEY || process.env.ANTHROPIC_API_KEY) && existsSync(real) && process.env.MENTOR_ENGINE !== 'mock') {
    try { engine = {mode: 'live', ...(await import('./mentor/chat.js'))}; return engine; }
    catch (e) { console.error('chat.js failed to load, using mock:', e.message); }
  }
  engine = {mode: 'mock', ...(await import('./mentor/chat.mock.js'))};
  return engine;
}

// If the live model fails (outage, refusal, bad output), answer from the mock so the demo never
// dead-ends, and label it. Turns remember which engine made them so repick goes to the same one.
const turnEngine = new Map();
async function runChat(args) {
  const e = await getEngine();
  try {
    const out = await e.chat(args);
    if (out.turnId) turnEngine.set(out.turnId, e.mode);
    return {...out, mode: out.mode || e.mode};
  } catch (err) {
    if (e.mode !== 'live') throw err;
    console.error('live engine failed, using mock:', err.message);
    const mock = await import('./mentor/chat.mock.js');
    const out = await mock.chat(args);
    if (out.turnId) turnEngine.set(out.turnId, 'mock');
    return {...out, mode: 'mock-fallback', fallbackReason: err.message};
  }
}
async function runRepick(args) {
  const e = await getEngine();
  if (turnEngine.get(args.turnId) === 'mock' && e.mode === 'live') return {...(await (await import('./mentor/chat.mock.js')).repick(args)), mode: 'mock-fallback'};
  return {...(await e.repick(args)), mode: e.mode};
}

// Per-IP rate limit for model-backed routes (protects the API bill on a public site).
const hits = new Map();
function limited(ip, max = Number(process.env.CHAT_LIMIT_PER_HOUR) || 40) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}

const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.csv': 'text/csv'};

export async function serveStatic(req, res, p) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const pub = path.join(root, 'public');
  const file = path.resolve(pub, '.' + decodeURIComponent(p === '/' ? '/index.html' : p));
  if (!file.startsWith(pub + path.sep)) return false;
  const target = existsSync(file) ? file : existsSync(file + '.html') ? file + '.html' : null;
  if (!target) return false;
  res.writeHead(200, {'Content-Type': MIME[path.extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache'});
  res.end(req.method === 'HEAD' ? undefined : await fs.readFile(target));
  return true;
}

// Returns [status, json] or null if the route isn't ours.
export async function mentorRoutes(req, p, body) {
  const sid = req.headers['x-session-id'];
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
  const needSession = () => { if (!store.validSession(sid)) throw Error('Missing session id'); return store.session(sid); };

  if (req.method === 'GET' && p === '/api/config') {
    const e = await getEngine();
    return [200, {quiz: await readJSON('config/quiz.json'), catalog: await catalog(), engine: e.mode, voice: voiceConfigured(), voicePersonas: voicedPersonas((await readJSON('config/catalog.json')).personas.map(x => x.id)), billing: {stripe: stripeConfigured(), plan: PLAN}}];
  }
  if (p === '/api/profile' && req.method === 'GET') { const s = needSession(); return [200, {profile: s.profile, snapshot: s.profile ? snapshot(s.profile) : null}]; }
  if (p === '/api/profile' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const prev = store.session(sid).profile;
    const {profile, missing, errors} = normalizeProfile(b.answers || {});
    if (prev?.portfolio && !profile.portfolio) profile.portfolio = prev.portfolio;
    if (errors.length) return [422, {errors, missing}];
    store.update(sid, s => { s.profile = profile; s.messages = []; });
    return [200, {profile, snapshot: snapshot(profile), missing}];
  }
  if (p === '/api/portfolio/upload' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const summary = b.sample
      ? summarizePortfolioCSV(await fs.readFile(path.join(root, 'data', 'demo_portfolio.csv'), 'utf8'))
      : summarizePortfolioCSV(b.csv);
    if (b.sample) summary.source = 'sample_synthetic';
    store.update(sid, s => { s.profile = {...(s.profile || {}), portfolio: summary}; });
    return [200, summary];
  }
  if (p === '/api/chat' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many messages this hour. Try again later.'}];
    const b = await body(req);
    const message = typeof b.message === 'string' ? b.message.trim().slice(0, 2000) : '';
    if (!message) throw Error('Message required');
    if (!s.profile) return [409, {error: 'Take the quiz first so the coach has your numbers.'}];
    const personaId = b.personaId || s.profile.personaHint || 'debt-free-coach', agentId = b.agentId || 'budget';
    const blocked = await gate(s, {personaId, agentId});
    if (blocked) return blocked;
    const messages = [...s.messages, {role: 'user', content: message}].slice(-20);
    const out = await runChat({personaId, agentId, messages, profile: s.profile, memory: s.memory, tier: s.tier || 'free'});
    store.update(sid, x => { x.messages = [...messages, {role: 'assistant', content: out.text}].slice(-20); });
    store.addMemory(sid, out.memoryUpdates);
    rememberReply(sid, out);
    return [200, out];
  }
  if (p === '/api/repick' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many requests this hour.'}];
    const b = await body(req);
    if (typeof b.turnId !== 'string' || typeof b.personaId !== 'string') throw Error('turnId and personaId required');
    const blocked = await gate(s, {personaId: b.personaId});
    if (blocked) return blocked;
    const out = await runRepick({turnId: b.turnId, personaId: b.personaId});
    rememberReply(sid, out);
    return [200, out];
  }
  if (p === '/api/memory' && req.method === 'GET') return [200, {memory: needSession().memory}];
  // Start over clears answers and chat but keeps the plan (a Plus purchase survives).
  if (p === '/api/session' && req.method === 'DELETE') { needSession(); store.update(sid, x => { x.profile = null; x.messages = []; x.memory = []; x.turns = {}; x.replies = {}; }); return [200, {ok: true}]; }
  if (p === '/api/me' && req.method === 'GET') { const s = needSession(); return [200, {tier: s.tier || 'free', plusVia: s.plus?.via || null}]; }
  if (p === '/api/checkout' && req.method === 'POST') {
    needSession();
    if (!stripeConfigured()) return [200, {mode: 'demo', message: 'Stripe is not configured on this server, so Plus can be unlocked in demo mode.'}];
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    return [200, {mode: 'stripe', ...(await createCheckout(sid, `${proto}://${req.headers.host}`))}];
  }
  if (p === '/api/checkout/confirm' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const r = await confirmCheckout(sid, b.checkoutId);
    if (!r.ok) return [402, {error: r.reason}];
    store.update(sid, s => { s.tier = 'plus'; s.plus = {via: 'stripe_test', subscription: r.subscription, at: new Date().toISOString()}; });
    return [200, {tier: 'plus', via: 'stripe_test'}];
  }
  if (p === '/api/checkout/demo' && req.method === 'POST') {
    needSession();
    if (stripeConfigured()) return [409, {error: 'Use Stripe checkout on this server.'}];
    store.update(sid, s => { s.tier = 'plus'; s.plus = {via: 'demo', at: new Date().toISOString()}; });
    return [200, {tier: 'plus', via: 'demo'}];
  }
  return null;
}

// ---------- voice (ElevenLabs STT + TTS) ----------
// Every verified reply this session received from /api/chat or /api/repick, keyed by turn and mentor.
// /api/voice/speak only reads from here, so ElevenLabs can only ever voice text the pipeline already
// returned and showed. The browser never sends text to be spoken.
function rememberReply(sid, out) {
  if (!out?.turnId || !out.personaId || typeof out.text !== 'string' || !out.text) return;
  store.update(sid, s => {
    s.replies ||= {};
    s.replies[`${out.turnId}:${out.personaId}`] = {text: out.text, disclosure: out.disclosure || '', at: new Date().toISOString()};
    const keys = Object.keys(s.replies);
    if (keys.length > 30) delete s.replies[keys[0]];
  });
}
const audioCache = new Map(); // replays of the same answer cost no ElevenLabs credits
async function rawBody(req, max) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new VoiceError(413, 'That recording is too long. Keep questions under a minute.'); chunks.push(c); }
  return Buffer.concat(chunks);
}

// Binary in/out, so it writes the response itself. Returns true when it handled the request.
export async function voiceRoutes(req, res, p) {
  if (!p.startsWith('/api/voice/')) return false;
  const json = (code, data) => { res.writeHead(code, {'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}); res.end(JSON.stringify(data)); return true; };
  try {
    if (req.method !== 'POST') return json(405, {error: 'Use POST.'});
    const sid = req.headers['x-session-id'];
    if (!store.validSession(sid)) return json(400, {error: 'Missing session id'});
    if (!voiceConfigured()) return json(503, {error: 'Voice is not set up on this server. Text chat still works.', voice: false});
    const ip = 'voice:' + ((req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress);

    if (p === '/api/voice/transcribe') {
      const mime = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      if (!AUDIO_TYPES.includes(mime)) return json(415, {error: 'Send the recording as audio (webm, ogg, mp4, mpeg or wav).'});
      const audio = await rawBody(req, MAX_AUDIO_BYTES);
      if (audio.length < 1000) return json(422, {error: 'That recording was too short. Hold the mic button while you talk.'});
      if (limited(ip)) return json(429, {error: 'Too many voice requests this hour. Type your question instead.'});
      const text = (await transcribe(audio, mime)).slice(0, 2000);
      if (!text) return json(422, {error: "We didn't catch any words. Try again closer to the mic, or type your question."});
      return json(200, {text, model: sttModel()});
    }

    if (p === '/api/voice/speak') {
      let b; try { b = JSON.parse((await rawBody(req, 10_000)).toString() || '{}'); } catch { return json(400, {error: 'Send JSON with turnId and personaId.'}); }
      if (typeof b.turnId !== 'string' || typeof b.personaId !== 'string') return json(400, {error: 'turnId and personaId required'});
      const reply = store.session(sid).replies?.[`${b.turnId}:${b.personaId}`];
      if (!reply) return json(404, {error: 'That answer is no longer available to read aloud. Ask again.'});
      const voiceId = voiceIdFor(b.personaId);
      if (!voiceId) return json(503, {error: 'This mentor does not have a voice yet. The written answer is above.'});
      if (reply.text.length > MAX_SPEAK_CHARS) return json(413, {error: 'This answer is too long to read aloud.'});
      const key = `${sid}:${b.turnId}:${b.personaId}:${voiceId}`;
      let clip = audioCache.get(key), cached = Boolean(clip);
      if (!clip) {
        if (limited(ip)) return json(429, {error: 'Too many voice requests this hour. The written answer is above.'});
        clip = await synthesize(reply.text, voiceId);
        audioCache.set(key, clip);
        if (audioCache.size > 50) audioCache.delete(audioCache.keys().next().value);
      }
      res.writeHead(200, {'Content-Type': clip.type, 'Content-Length': clip.audio.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Voice-Cached': cached ? '1' : '0'});
      res.end(clip.audio);
      return true;
    }
    return json(404, {error: 'Route not found'});
  } catch (e) {
    if (!(e instanceof VoiceError)) console.error('voice route failed:', e.message);
    return json(e.status || 400, {error: e.message});
  }
}
