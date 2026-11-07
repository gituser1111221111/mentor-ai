// Single-process store keyed by an anonymous browser session id. Persists to .data/store.json.
// Prototype only: no accounts, no encryption. Render's disk is ephemeral, which is fine for a demo.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const FILE = process.env.STORE_FILE || fileURLToPath(new URL('../.data/store.json', import.meta.url));
const MAX_SESSIONS = 2000, MAX_TURNS = 30;
let db = {sessions: {}};
try { if (process.env.NODE_ENV !== 'test') db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}

let timer;
function save() {
  if (process.env.NODE_ENV === 'test') return;
  clearTimeout(timer);
  timer = setTimeout(() => { try { fs.mkdirSync(path.dirname(FILE), {recursive: true}); fs.writeFileSync(FILE, JSON.stringify(db)); } catch (e) { console.error('store save failed', e.message); } }, 200);
}

export const validSession = id => typeof id === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(id);

export function session(id) {
  if (!db.sessions[id]) {
    const ids = Object.keys(db.sessions);
    if (ids.length >= MAX_SESSIONS) delete db.sessions[ids[0]];
    db.sessions[id] = {profile: null, memory: [], messages: [], turns: {}, created: new Date().toISOString()};
  }
  return db.sessions[id];
}

export function update(id, fn) { const s = session(id); fn(s); save(); return s; }

export function saveTurn(id, turn) {
  update(id, s => {
    s.turns[turn.turnId] = turn;
    const keys = Object.keys(s.turns);
    if (keys.length > MAX_TURNS) delete s.turns[keys[0]];
  });
}

export function addMemory(id, updates = [], source = 'chat') {
  const date = new Date().toISOString().slice(0, 10);
  update(id, s => {
    for (const u of updates) if (u?.fact && !s.memory.some(m => m.fact === u.fact)) s.memory.push({fact: String(u.fact).slice(0, 200), source, date});
    s.memory = s.memory.slice(-50);
  });
}

export function reset(id) { delete db.sessions[id]; save(); }
