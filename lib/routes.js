// Mentor app routes (Section B). Mounted from server.js before the starter's Supabase routes.
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeProfile, snapshot} from './profile.js';
import {summarizePortfolioCSV} from './portfolio.js';
import * as store from './store.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJSON = async rel => JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));

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
    return [200, {quiz: await readJSON('config/quiz.json'), catalog: await readJSON('config/catalog.json'), engine: e.mode, voice: Boolean(process.env.ELEVENLABS_API_KEY)}];
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
    const messages = [...s.messages, {role: 'user', content: message}].slice(-20);
    const out = await runChat({personaId: b.personaId || s.profile.personaHint || 'debt-free-coach', agentId: b.agentId || 'budget', messages, profile: s.profile, memory: s.memory, tier: 'free'});
    store.update(sid, x => { x.messages = [...messages, {role: 'assistant', content: out.text}].slice(-20); });
    store.addMemory(sid, out.memoryUpdates);
    return [200, out];
  }
  if (p === '/api/repick' && req.method === 'POST') {
    needSession();
    if (limited(ip)) return [429, {error: 'Too many requests this hour.'}];
    const b = await body(req);
    if (typeof b.turnId !== 'string' || typeof b.personaId !== 'string') throw Error('turnId and personaId required');
    return [200, await runRepick({turnId: b.turnId, personaId: b.personaId})];
  }
  if (p === '/api/memory' && req.method === 'GET') return [200, {memory: needSession().memory}];
  if (p === '/api/session' && req.method === 'DELETE') { needSession(); store.reset(sid); return [200, {ok: true}]; }
  if (p === '/api/checkout' && req.method === 'POST') {
    needSession();
    return [200, {mode: 'mock', message: 'Payments are mocked in this demo. Production: one $4.99/mo plan via Stripe Checkout (test mode).'}];
  }
  return null;
}
