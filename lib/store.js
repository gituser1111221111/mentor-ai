// Single-process store keyed by an anonymous browser session id. Persists to .data/store.json.
// Single-process prototype. Production requires authenticated accounts and durable storage.
// Set STORE_FILE to a mounted persistent disk path; default Render filesystem is ephemeral.
// Optional encryption at rest: set STORE_ENCRYPTION_KEY to 32 random bytes as 64 hex characters
// (openssl rand -hex 32). The file is then AES-256-GCM encrypted and authenticated. An existing plain
// file is read once and encrypted on the next save. A file that cannot be decrypted is never
// overwritten: it is moved aside and the server starts with empty sessions.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';

const FILE = process.env.STORE_FILE || fileURLToPath(new URL('../.data/store.json', import.meta.url));
const MAX_SESSIONS = 2000, MAX_TURNS = 30;

export function storeKey(hex = process.env.STORE_ENCRYPTION_KEY) {
  const v = String(hex || '').trim();
  if (!v) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(v)) throw Error('STORE_ENCRYPTION_KEY must be 64 hex characters (openssl rand -hex 32)');
  return Buffer.from(v, 'hex');
}
export function serialize(data, key) {
  const json = JSON.stringify(data);
  if (!key) return json;
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return JSON.stringify({format: 'mentor-store-encrypted', v: 1, alg: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: body.toString('base64')});
}
export function deserialize(text, key) {
  const parsed = JSON.parse(text);
  if (parsed?.format !== 'mentor-store-encrypted') return parsed; // plain file from before encryption
  if (!key) throw Error('Session file is encrypted but STORE_ENCRYPTION_KEY is not set');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(parsed.data, 'base64')), decipher.final()]).toString('utf8'));
}
export function load(file = FILE, key = storeKey()) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return {sessions: {}}; }
  try { const data = deserialize(text, key); return data?.sessions ? data : {sessions: {}}; }
  catch (e) {
    const aside = `${file}.unreadable-${Date.now()}`;
    try { fs.renameSync(file, aside); } catch {}
    console.error(`Session store could not be read (${e.message}). Kept it at ${path.basename(aside)} and started empty.`);
    return {sessions: {}};
  }
}
export function write(data, file = FILE, key = storeKey()) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = file + '.tmp';
  fs.writeFileSync(temp, serialize(data, key), {mode: 0o600});
  fs.renameSync(temp, file);
}

const KEY = storeKey(); // a malformed key stops startup instead of silently writing plain text
let db = process.env.NODE_ENV === 'test' ? {sessions: {}} : load(FILE, KEY);

function save() {
  if (process.env.NODE_ENV === 'test') return;
  write(db, FILE, KEY);
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
