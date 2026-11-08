import {demoWorkspace,demoContext} from './workspace-demo.js';
import {saveBudget,workspaceOverview,portfolioWatch,savePlan,whatIf} from './workspace.js';
import {chatServiceError} from './mentor/service-error.js';
import {createHash, randomUUID} from 'node:crypto';
// Mentor app routes (Section B). Mounted from server.js before the starter's Supabase routes.
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalizeProfile, snapshot} from './profile.js';
import {extractProfileUpdates, partialProfileReply, savedProfileMemory} from './profile-chat.js';
import {summarizePortfolioCSV} from './portfolio.js';
import {liveSources, snapshot as marketSnapshot} from './market/providers.js';
import * as store from './store.js';
import {PLAN} from './billing.js';
import {draftGuideline, saveGuideline, reviewPortfolio, simulatePortfolio} from './guidelines.js';
import {loadPersona} from './mentor/personas.js';
import {COACHES} from './mentor/generate.js';
import {speakableText} from './speech-numbers.js';
import {unverifiedNumbers} from './mentor/validate.js';
import {voiceConfigured, resolveVoiceIdFor, transcribe, synthesize, ttsConfigKey, sttModel, VoiceError, AUDIO_TYPES, MAX_AUDIO_BYTES, MAX_SPEAK_CHARS} from './voice.js';
import {compareMentors} from './compare.js';
import {startTimer, record, stats, TARGETS} from './mentor/perf.js';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJSON = async rel => JSON.parse(await fs.readFile(path.join(root, rel), 'utf8'));

// A catalog entry is interactive only after launch, even if its underlying prototype exists.
async function catalog() {
  const c = await readJSON('config/catalog.json');
  c.personas = c.personas.map(p => ({...p, built: p.status === 'live' && Boolean(loadPersona(p.id))}));
  c.agents = c.agents.map(a => ({...a, built: a.status === 'live' && Boolean(COACHES[a.id])}));
  // connected: this server has the key/config for a live source right now (booleans only, never keys).
  const live = liveSources();
  c.dataSources = (c.dataSources || []).map(d => ({...d, connected: d.status === 'live' && Boolean(live[d.env])}));
  return c;
}
const profileKey = s => createHash('sha256').update(JSON.stringify(s.profile || null)).digest('hex');
const contextOf = s => ({profileKey:profileKey(s), inputRevision:s.inputRevision || 0, requestSerial:s.requestSerial || 0});
const inputsCurrent = (s,c) => Boolean(c && c.profileKey === profileKey(s) && (c.inputRevision || 0) === (s.inputRevision || 0));
const changedInputs = s => {s.inputRevision = (s.inputRevision || 0) + 1;};
const currentContext = (s, c) => Boolean(inputsCurrent(s,c) && c.requestSerial === (s.requestSerial || 0));
const stale = () => Object.assign(Error('Financial information or the question changed. Ask again using your current details.'), {status:409});

// Returns null if allowed, else [status, json].
async function gate(s, {personaId, agentId}) {
  const c = await catalog();
  const checks = [[c.personas, personaId, 'mentor'], [c.agents, agentId, 'coach']];
  for (const [list, id, kind] of checks) {
    if (!id) continue;
    const item = list.find(x => x.id === id);
    if (!item) return [404, {error: `Unknown ${kind}`}];
    // Launched free mentors can use the starter budget engine; specialist launches remain independent.
    if (!item.built) return [409, {error: `${item.name} is coming soon.`, comingSoon: true}];
  }
  return null;
}

// No AI key on the server: a configuration problem, not a transient failure, so retrying cannot help.
const notConfigured = () => Object.assign(Error('AI key not configured'), {code: 'AI_NOT_CONFIGURED'});

// The rule-based engine is only available when explicitly requested for local tests.
let engine;
async function getEngine() {
  if (engine) return engine;
  if (process.env.MENTOR_ENGINE === 'mock') {
    engine = {mode: 'mock', ...(await import('./mentor/chat.mock.js'))};
    return engine;
  }
  const real = path.join(root, 'lib', 'mentor', 'chat.js');
  if ((process.env.MENTOR_API_KEY || process.env.ANTHROPIC_API_KEY) && existsSync(real)) {
    try { engine = {mode: 'live', ...(await import('./mentor/chat.js'))}; return engine; }
    catch (e) { console.error('chat.js failed to load:', e); }
  }
  engine = {mode: 'unavailable'};
  return engine;
}

async function runChat(args, sid, context) {
  const e = await getEngine();
  if (e.mode === 'unavailable') throw notConfigured();
  const tm = startTimer('route:chat');
  const out = await e.chat(args);
  if (!currentContext(store.session(sid), context)) throw stale();
  if (out.turnId) store.saveTurn(sid, {turnId: out.turnId, engine: e.mode, context, data: e.getTurn(out.turnId)});
  // Engine stage timings (live engine) plus the full server-side time for this request.
  record(out.timing ? {...out.timing, totalMs: tm.elapsed(), engineMs: out.timing.totalMs} : tm.finish({path: out.mode || e.mode}));
  return {...out, mode: out.mode || e.mode};
}
// Grow a turn's verified option set toward MAX_OPTIONS without changing the answer already shown.
async function runExpand(turnId, saved, sid) {
  const e = await getEngine();
  if (e.mode === 'unavailable') throw notConfigured();
  const engine = saved.engine === 'mock' ? await import('./mentor/chat.mock.js') : e;
  if (!engine.expand) return {turnId, added: [], total: saved.data?.candidates?.length || 0, note: 'The practice engine has a fixed option set.'};
  engine.restoreTurn(turnId, saved.data);
  const out = await engine.expand({turnId});
  if (!currentContext(store.session(sid), saved.context)) throw stale();
  store.saveTurn(sid, {turnId, engine: saved.engine, context:saved.context, data: engine.getTurn(turnId)});
  if (out.timing) record(out.timing);
  return out;
}
async function runRepick(args, saved) {
  const e = await getEngine();
  if (e.mode === 'unavailable') throw notConfigured();
  const mode = saved.engine;
  if (mode === 'mock') { const mock = await import('./mentor/chat.mock.js'); mock.restoreTurn(args.turnId, saved.data); return {...(await mock.repick(args)), mode: 'mock'}; }
  e.restoreTurn(args.turnId, saved.data);
  return {...(await e.repick(args)), mode: e.mode};
}

// Keep candidate generation and validation internal; the chat presents one answer.
const publicAnswer = ({candidates, pick, validation, fallbackReason, timing, ...answer}) => answer;

// Per-IP rate limit for model-backed routes (protects the API bill on a public site).
const hits = new Map();
function limited(ip, max = Number(process.env.CHAT_LIMIT_PER_HOUR) || 40) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}

const MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.csv': 'text/csv'};

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

  // Which market data sources are configured (booleans only; keys never leave the server).
  if (req.method === 'GET' && p === '/api/market/status') return [200, {live: liveSources(), fallbackSnapshotAsOf: marketSnapshot().asOf, note: 'Configured does not mean a call has succeeded; answers name the sources actually used.'}];
  if (req.method === 'GET' && p === '/api/config') {
    const e = await getEngine();
    const voiceId = voiceConfigured() ? await resolveVoiceIdFor('debt-free-coach').catch(err => { console.error('ElevenLabs voice lookup failed:', err.message); return null; }) : null;
    return [200, {quiz: await readJSON('config/quiz.json'), catalog: await catalog(), marketSnapshotAsOf: marketSnapshot().asOf, engine: e.mode, voice: Boolean(voiceId), perf: {thresholdMs: TARGETS.thresholdMs}, voicePersonas: voiceId ? ['debt-free-coach'] : [], billing: {stripe: false, enabled: false, status: 'planned', plan: PLAN}}];
  }
  if (p === '/api/workspace/demo' && req.method === 'GET') return [200,demoWorkspace()];
  if (p === '/api/workspace' && req.method === 'GET') return [200,workspaceOverview(needSession())];
  if (p === '/api/workspace/plan' && req.method === 'POST') {
    const s=needSession(),b=await body(req),profile=savePlan(b,s.profile||{});
    if(b.cashCushion!==undefined&&!/^\d+(\.\d{1,2})?$/.test(String(b.cashCushion)))throw Error('Enter the cushion goal as a dollar amount.');
    store.update(sid,x=>{changedInputs(x);x.profile=profile;x.replies={};if(b.cashCushion!==undefined)x.budgetPreferences={...(x.budgetPreferences||{}),cashCushion:Number(b.cashCushion).toFixed(2),updatedAt:new Date().toISOString()};});
    return [200,workspaceOverview(store.session(sid))];
  }
  if (p === '/api/workspace/whatif' && req.method === 'POST') {
    const b=await body(req);
    if (b.sample) { const d=demoWorkspace(); return [200,whatIf(d.profile.portfolio,d.guidelines,b)]; }
    const s=needSession(); return [200,whatIf(s.profile?.portfolio,s.guidelines?.effective,b)];
  }
  if (p === '/api/workspace/budget' && req.method === 'POST') {
    const s=needSession(),b=await body(req),next=saveBudget(b,s.profile||{});
    store.update(sid,x=>{changedInputs(x);x.profile=next.profile;x.budgetPreferences=next.budgetPreferences;});
    return [200,workspaceOverview(store.session(sid))];
  }
  if (p === '/api/workspace/market' && req.method === 'POST') {
    const s=needSession();
    if(limited('market:'+ip,30))return [429,{error:'Refresh limit reached. Try again later.'}];
    const captured=s.profile?.portfolio,version=s.guidelines?.effective?.version;
    const result=await portfolioWatch(captured,s.guidelines?.effective);
    if(captured?.snapshotId!==s.profile?.portfolio?.snapshotId||version!==s.guidelines?.effective?.version)return [409,{error:'Your inputs changed. Refresh the workspace first.'}];
    return [200,result];
  }
  if (p === '/api/profile' && req.method === 'GET') { const s = needSession(); return [200, {profile: s.profile, snapshot: s.profile ? snapshot(s.profile) : null}]; }
  if (p === '/api/profile' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const prev = store.session(sid).profile;
    const {profile, missing, errors} = normalizeProfile(b.answers || {});
    if (prev?.portfolio && !profile.portfolio) profile.portfolio = prev.portfolio;
    if (prev?.documents?.length) profile.documents = prev.documents;
    if (errors.length) return [422, {errors, missing}];
    store.update(sid, s => { changedInputs(s); s.profile = profile; s.messages = []; s.turns = {}; s.replies = {}; });
    return [200, {profile, snapshot: snapshot(profile), missing}];
  }
  if (p === '/api/portfolio/upload' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const summary = b.sample
      ? summarizePortfolioCSV(await fs.readFile(path.join(root, 'data', 'demo_portfolio.csv'), 'utf8'))
      : summarizePortfolioCSV(b.csv);
    if (b.sample) summary.source = 'sample_synthetic';
    summary.snapshotId = randomUUID();
    summary.importedAt = new Date().toISOString();
    summary.asOf = b.sample ? '2026-11-06' : null;
    store.update(sid, s => { changedInputs(s); s.profile = {...(s.profile || {}), portfolio: summary}; });
    return [200, summary];
  }
  if (p.startsWith('/api/portfolio/')) {
    const s = needSession();
    if (p === '/api/portfolio/guidelines' && req.method === 'GET') return [200, {effective:s.guidelines?.effective || null, drafts:s.guidelines?.drafts || [], history:s.guidelines?.history || []}];
    if (p === '/api/portfolio/guidelines/draft' && req.method === 'POST') {
      const b = await body(req), draft = draftGuideline(b);
      store.update(sid, x => { x.guidelines ||= {drafts:[],history:[]}; x.guidelines.drafts = [...x.guidelines.drafts,draft].slice(-20); });
      return [200, draft];
    }
    if (p === '/api/portfolio/guidelines/draft' && req.method === 'DELETE') {
      const b = await body(req);
      if (!s.guidelines?.drafts.some(d => d.id === b.draftId)) return [404,{error:'Draft not found in this session.'}];
      store.update(sid, x => { x.guidelines.drafts = x.guidelines.drafts.filter(d => d.id !== b.draftId); });
      return [200,{ok:true}];
    }
    if (p === '/api/portfolio/guidelines/save' && req.method === 'POST') {
      const b = await body(req), effective = saveGuideline(s.guidelines,b);
      store.update(sid,x => { changedInputs(x); x.replies={}; x.guidelines.effective = effective; x.guidelines.history = [...x.guidelines.history,effective].slice(-50); x.guidelines.drafts = x.guidelines.drafts.filter(d => d.id !== b.draftId); });
      return [200,effective];
    }
    if (p === '/api/portfolio/review' && req.method === 'GET') return [200,reviewPortfolio(s.profile?.portfolio,s.guidelines?.effective)];
    if (p === '/api/portfolio/simulate' && req.method === 'POST') {
      const b = await body(req);
      if (!b.snapshotId || b.snapshotId !== s.profile?.portfolio?.snapshotId) return [409,{error:'Holdings changed. Reload the portfolio review before simulating.'}];
      if (!s.guidelines?.effective || b.guidelineVersion !== s.guidelines.effective.version) return [409,{error:'Reload and use the current saved guideline version.'}];
      return [200,simulatePortfolio(s.profile?.portfolio,s.guidelines.effective)];
    }
  }
  if (p === '/api/attachment' && req.method === 'POST') {
    needSession();
    const b = await body(req);
    const name = path.basename(String(b.name || '')).slice(0, 100);
    const ext = path.extname(name).toLowerCase();
    if (!['.pdf', '.txt', '.csv', '.md'].includes(ext)) return [422, {error: 'Use a PDF, TXT, CSV, or Markdown file.'}];
    if (typeof b.base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(b.base64)) return [422, {error: 'Invalid file data.'}];
    const bytes = Buffer.from(b.base64, 'base64');
    if (!bytes.length || bytes.length > 2_000_000) return [413, {error: 'File must be under 2 MB.'}];
    let text;
    if (ext === '.pdf') {
      const {PDFParse} = await import('pdf-parse');
      const parser = new PDFParse({data: new Uint8Array(bytes)});
      try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
    } else text = bytes.toString('utf8');
    text = String(text || '').trim().slice(0, 8000);
    if (!text) return [422, {error: 'No readable text found in this file.'}];
    store.update(sid, s => { changedInputs(s); s.profile ||= {}; s.profile.documents = [...(s.profile.documents || []), {name, text}].slice(-3); });
    return [200, {name, characters: text.length, note: 'Text is available as context in chat. Document numbers are not automatically added to calculations.'}];
  }
  if (p === '/api/chat' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many messages this hour. Try again later.'}];
    const b = await body(req);
    let message = typeof b.message === 'string' ? b.message.trim().slice(0, 2000) : '';
    const rawMessage=message;
    const demo = b.demoProfile === true ? demoWorkspace() : null;
    if(demo && message) message += '\n\n'+demoContext(demo);
    if(message && typeof b.learningModuleId==='string'){const lessons=await readJSON('public/learning-modules.json');const lesson=lessons.modules.find(m=>m.id===b.learningModuleId);if(lesson)message+='\n\nCurrent learning module: '+lesson.title+'. '+lesson.summary;}
    else if(message&&typeof b.learningToolTitle==='string')message+='\n\nLearning tool in view (user context): '+b.learningToolTitle.replace(/[\r\n]/g,' ').slice(0,160);
    if (!message) throw Error('Message required');
    const personaId = b.personaId || s.profile?.personaHint || 'debt-free-coach';
    const agentId = (demo?.profile || s.profile)?.portfolio?.securities?.length && /(?:upcoming|next|scheduled).*earnings|earnings (?:call|event|report)|\bfilings?\b|my (?:portfolio|holdings)|these holdings/i.test(message) ? 'investing' : (b.agentId || 'budget');
    const blocked = await gate(s, {personaId, agentId});
    if (blocked) return blocked;
    s.requestSerial = (s.requestSerial || 0) + 1;
    s.replies = {};
    const beforeUpdate = contextOf(s);
    let profileUpdate = {changes:[]};
    if (!demo && (await getEngine()).mode === 'live') {
      try { profileUpdate = await extractProfileUpdates({profile:structuredClone(s.profile),message:rawMessage,messages:s.messages}); }
      catch { return [503,{error:'I could not check your saved inputs. Please try sending that message again; your previous inputs are unchanged.'}]; }
      if (!currentContext(s,beforeUpdate)) return [409,{error:stale().message}];
      if (profileUpdate.changes.length) store.update(sid, x => {changedInputs(x); x.profile=profileUpdate.profile; x.memory=[...x.memory.filter(m=>m.source!=='saved-profile'),...savedProfileMemory(x.profile)].slice(-50); x.replies={};});
    }
    const context = contextOf(s);
    const profile = structuredClone(demo?.profile || s.profile || normalizeProfile({}).profile);
    profile.portfolioGuidelines = demo?.guidelines || s.guidelines?.effective || null;
    profile.cashCushion = demo?.budget.cashCushion ?? s.budgetPreferences?.cashCushion ?? null;

    const messages = [...s.messages, {role: 'user', content: message}].slice(-20);
    let out;
    try { const partial = partialProfileReply(profile,profileUpdate,message); out = partial ? {...partial,personaId,agentId} : await runChat({personaId, agentId, messages, profile, inputsConfirmed:Boolean(profileUpdate.confirmed), memory: demo ? [] : structuredClone(s.memory), tier: 'included'}, sid, context); }
    catch (err) { console.error('chat unavailable:', {status:err.status,name:err.name}); return [err.status === 409 ? 409 : 503, err.status === 409 ? {error:err.message} : chatServiceError(err)]; }
    const answer = {...publicAnswer(out),agentId,demoProfile:Boolean(demo),profileUpdated:profileUpdate.changes.length>0};
    // General conversation has no comparison turn, but still needs a server-owned
    // identifier so the exact Claude reply can be synthesized safely.
    if (!answer.turnId) answer.voiceTurnId = randomUUID();
    answer.personaName = (await catalog()).personas.find(p => p.id === personaId)?.name || out.personaName;
    if (!currentContext(s, context)) return [409,{error:stale().message}];
    store.update(sid, x => { x.messages = [...messages, {role: 'assistant', content: out.text}].slice(-20); x.history = [...(x.history || []), {role: 'user', text: rawMessage}, {role: 'assistant', response: answer}].slice(-20); });
    if (!demo) store.addMemory(sid, out.memoryUpdates);
    rememberReply(sid, answer, context);
    return [200, answer];
  }
  if (p === '/api/repick' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many requests this hour.'}];
    const b = await body(req);
    if (typeof b.turnId !== 'string' || typeof b.personaId !== 'string') throw Error('turnId and personaId required');
    const blocked = await gate(s, {personaId: b.personaId});
    if (blocked) return blocked;
    const saved = s.turns?.[b.turnId];
    if (!saved) return [404, {error: 'That conversation turn is no longer available.'}];
    if (!inputsCurrent(s,saved.context)) return [409,{error:stale().message}];
    const context = contextOf(s);
    let out;
    try { out = await runRepick({turnId: b.turnId, personaId: b.personaId}, saved); }
    catch (err) { console.error('repick unavailable:', {status:err.status,name:err.name}); return [err.status === 409 ? 409 : 503, err.status === 409 ? {error:err.message} : chatServiceError(err)]; }
    const answer = publicAnswer(out);
    answer.personaName = (await catalog()).personas.find(p => p.id === b.personaId)?.name || out.personaName;
    if (!currentContext(s, context)) return [409,{error:stale().message}];
    store.update(sid, x => { x.history = [...(x.history || []), {role: 'assistant', response: answer}].slice(-20); });
    rememberReply(sid, answer, context);
    return [200, answer];
  }
  // Compare mentors on the SAME verified options from one turn. Only the pick is re-run.
  if (p === '/api/compare' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many requests this hour.'}];
    const b = await body(req);
    if (typeof b.turnId !== 'string') throw Error('turnId required');
    const saved = s.turns?.[b.turnId];
    if (!saved) return [404, {error: 'That conversation turn is no longer available.'}];
    if (!inputsCurrent(s,saved.context)) return [409,{error:stale().message}];
    const c = await catalog();
    const ids = Array.isArray(b.personaIds) && b.personaIds.length ? b.personaIds.filter(x => typeof x === 'string') : c.personas.map(x => x.id);
    const mentors = ids.map(id => c.personas.find(x => x.id === id)).filter(Boolean);
    const canUse = m => !m.built ? 'coming-soon' : null;
    const out = await compareMentors({mentors, canUse, repick: personaId => runRepick({turnId: b.turnId, personaId}, saved)});
    if (!currentContext(s, saved.context)) return [409,{error:stale().message}];
    return [200, {turnId: b.turnId, disclosure: c.disclaimer, ...out}];
  }
  // More verified options for an answer already shown. They are listed as not yet reviewed by the mentor.
  if (p === '/api/expand' && req.method === 'POST') {
    const s = needSession();
    if (limited(ip)) return [429, {error: 'Too many requests this hour.'}];
    const b = await body(req);
    if (typeof b.turnId !== 'string') throw Error('turnId required');
    const saved = s.turns?.[b.turnId];
    if (!saved) return [404, {error: 'That conversation turn is no longer available.'}];
    if (!inputsCurrent(s,saved.context)) return [409,{error:stale().message}];
    let out;
    try { out = await runExpand(b.turnId, saved, sid); }
    catch (err) { console.error('expand unavailable:', err); return [503, {error: 'Could not add more options right now. Your earlier answer is unchanged.'}]; }
    return [200, {turnId: b.turnId, total: out.total, maxOptions: out.maxOptions, reviewedByMentor: false, note: out.note,
      added: (out.added || []).map(c => ({id: c.id, title: c.title, summary: c.summary, tradeoffs: c.tradeoffs, risk: c.risk}))}];
  }
  // Development only: response timing stats (average, median, P90, P95).
  if (p === '/api/perf' && req.method === 'GET') return process.env.MENTOR_DEBUG_PERF === '1' ? [200, {targets: TARGETS, stats: stats()}] : [404, {error: 'Route not found'}];
  if (p === '/api/history' && req.method === 'GET') { const s = needSession(); return [200, {history: s.history || []}]; }
  if (p === '/api/memory' && req.method === 'GET') return [200, {memory: needSession().memory}];
  if (p === '/api/memory' && req.method === 'DELETE') { needSession(); const b = await body(req); store.update(sid, x => { x.memory = x.memory.filter(m => m.fact !== b.fact); }); return [200, {memory: store.session(sid).memory}]; }
  // Start over clears financial context, drafts and saved guidelines.
  if (p === '/api/session' && req.method === 'DELETE') { needSession(); store.update(sid, x => { changedInputs(x); x.profile = null; x.messages = []; x.history = []; x.memory = []; x.turns = {}; x.replies = {}; delete x.guidelines; delete x.budgetPreferences; }); return [200, {ok: true}]; }
  if (p === '/api/me' && req.method === 'GET') { needSession(); return [200, {tier: 'included', access: 'demo', billingActive: false}]; }
  if (p.startsWith('/api/checkout') && req.method === 'POST') {
    needSession();
    return [409, {error: 'Subscriptions are not active. The planned offer is one month free, then $2.99/month for all perspectives and features. Available demo features need no checkout.', billingActive: false, plan: PLAN}];
  }
  return null;
}

// ---------- voice (ElevenLabs STT + TTS) ----------
// Every verified reply this session received from /api/chat or /api/repick, keyed by turn and mentor.
// /api/voice/speak only reads from here, so ElevenLabs can only ever voice text the pipeline already
// returned and showed. The browser never sends text to be spoken.
function rememberReply(sid, out, context) {
  const id = out?.voiceTurnId || out?.turnId;
  if (!id || !out.personaId || typeof out.text !== 'string' || !out.text) return;
  out.voiceReplyId = createHash('sha256').update(out.text).digest('hex');
  store.update(sid, s => {
    s.replies ||= {};
    // Amounts in the reply that its own calculations do not back. This is an answer-accuracy problem,
    // not a pronunciation one: the speech boundary refuses it instead of speaking it.
    const calculations = structuredClone(out.calculations || []);
    const amountCheck = unverifiedNumbers(out.text, calculations);
    const reply = {context, calculations, text: out.text, disclosure: out.disclosure || '', amountCheck, at: new Date().toISOString()};
    s.replies[`${id}:${out.personaId}:${out.voiceReplyId}`] = reply;
    s.replies[`${id}:${out.personaId}`] = reply;
    while (Object.keys(s.replies).length > 60) delete s.replies[Object.keys(s.replies)[0]];
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
      if (audio.length < 1000) return json(422, {error: 'That recording was too short. Try speaking a little longer.'});
      if (limited(ip)) return json(429, {error: 'Too many voice requests this hour. Type your question instead.'});
      const vt = startTimer('voice:stt');
      const text = (await vt.time('speechToTextMs', () => transcribe(audio, mime))).slice(0, 2000);
      record(vt.finish({bytes: audio.length}));
      if (!text) return json(422, {error: "We didn't catch any words. Try again closer to the mic, or type your question."});
      return json(200, {text, model: sttModel()});
    }

    if (p === '/api/voice/speak') {
      let b; try { b = JSON.parse((await rawBody(req, 10_000)).toString() || '{}'); } catch { return json(400, {error: 'Send JSON with turnId and personaId.'}); }
      if (typeof b.turnId !== 'string' || typeof b.personaId !== 'string') return json(400, {error: 'turnId and personaId required'});
      const replyKey = `${b.turnId}:${b.personaId}` + (b.voiceReplyId ? `:${b.voiceReplyId}` : '');
      const reply = store.session(sid).replies?.[replyKey];
      if (!reply) return json(404, {error: 'That answer is no longer available to read aloud. Ask again.'});
      if (!currentContext(store.session(sid), reply.context)) return json(409,{error:'This answer belongs to older financial information or an earlier question. Ask again.'});
      const amountCheck = unverifiedNumbers(reply.text, reply.calculations || []);
      if (amountCheck.length || reply.amountCheck?.length) return json(422,{error:'This answer contains financial values that could not be verified. Please request a new answer.'});
      const voiceId = await resolveVoiceIdFor(b.personaId);
      if (!voiceId) return json(503, {error: 'This mentor does not have a voice yet. The written answer is above.'});
      if (reply.text.length > MAX_SPEAK_CHARS) return json(413, {error: 'This answer is too long to read aloud.'});
      const key = `${sid}:${voiceId}:${ttsConfigKey()}:${createHash('sha256').update(reply.text).digest('hex')}`;
      const started = performance.now(), requestId = /^[a-zA-Z0-9-]{1,64}$/.test(req.headers['x-voice-request-id'] || '') ? req.headers['x-voice-request-id'] : randomUUID();
      const log = (event, extra = {}) => console.info('[voice]', JSON.stringify({event,requestId,elapsedMs:Math.round(performance.now()-started),...extra}));
      const abort = new AbortController();
      const cancel = () => { if (!res.writableEnded) {abort.abort();log('generation-cancelled');} };
      if (res.destroyed) return true;
      res.once('close',cancel);
      try {
        let clip = audioCache.get(key), cached = Boolean(clip);
        log('generation-start',{cached});
        if (!clip) {
          if (limited(ip)) return json(429, {error: 'Too many voice requests this hour. The written answer is above.'});
          const vt = startTimer('voice:tts');
          const spoken = await vt.time('numberWordsMs', async () => speakableText(reply.text));
          if (!currentContext(store.session(sid), reply.context)) return json(409,{error:stale().message});
          clip = await vt.time('textToSpeechMs', () => synthesize(spoken, voiceId, {signal:abort.signal}));
          record(vt.finish({chars:reply.text.length}));
          if (abort.signal.aborted) return true;
          if (!currentContext(store.session(sid), reply.context)) return json(409,{error:stale().message});
          audioCache.set(key, clip);
          if (audioCache.size > 50) audioCache.delete(audioCache.keys().next().value);
        }
        if (!currentContext(store.session(sid), reply.context)) return json(409,{error:stale().message});
        log('generation-complete',{cached,bytes:clip.audio.length});
        res.writeHead(200, {'Content-Type': clip.type, 'Content-Length': clip.audio.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Voice-Cached': cached ? '1' : '0', 'X-Voice-Request-Id':requestId, 'X-Amount-Check': reply.amountCheck?.length ? 'unverified' : 'ok', 'Server-Timing':`tts;dur=${Math.round(performance.now()-started)}`});
        res.end(clip.audio);
        return true;
      } catch (error) {
        if (abort.signal.aborted) return true;
        log('generation-error',{name:error.name});throw error;
      } finally {res.off('close',cancel);}
    }
    return json(404, {error: 'Route not found'});
  } catch (e) {
    if (!(e instanceof VoiceError)) console.error('voice route failed:', e.message);
    return json(e.status || 400, {error: e.message});
  }
}
