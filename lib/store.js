// Single-process store keyed by an anonymous browser session id. Persists to .data/store.json.
// Single-process prototype. Production requires authenticated accounts and durable storage.
// Set STORE_FILE to a mounted persistent disk path; default Render filesystem is ephemeral.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const FILE = process.env.STORE_FILE || fileURLToPath(new URL('../.data/store.json', import.meta.url));
const MAX_SESSIONS = 2000, MAX_TURNS = 30;
let db = {sessions: {}};
try { if (process.env.NODE_ENV !== 'test') db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}

function save() {
  if (process.env.NODE_ENV === 'test') return;
  fs.mkdirSync(path.dirname(FILE), {recursive: true});
  const temp = FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(db), {mode: 0o600});
  fs.renameSync(temp, FILE);
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
