// Live engine (A/B contract). generate (Sonnet) -> validate (code) -> pick (Haiku persona) -> respond.
// routes.js loads this automatically when ANTHROPIC_API_KEY is set; otherwise chat.mock.js.
import {randomUUID} from 'node:crypto';
import {calcLibrary} from './tools.js';
import {validateCandidates} from './validate.js';
import {generate, COACHES} from './generate.js';
import {pick} from './pick.js';
import {loadPersona} from './personas.js';
import {dollars} from './chat.mock.js';

const DISCLOSURE = 'Educational opinion, not advice from a licensed financial adviser, CPA, or attorney. Persona inspired by public teachings; not affiliated or endorsed.';
const turns = new Map();
const MIN_CANDIDATES = 3;

function base(extra) {
  return {mode: 'live', citations: [], calculations: [], memoryUpdates: [], handoff: null, disclosure: DISCLOSURE, turnId: null, candidates: [], pick: null, ...extra};
}

async function respond(turnId, personaId) {
  const t = turns.get(turnId);
  const persona = loadPersona(personaId);
  if (!persona) throw Error('That mentor is locked in this demo.');
  const p = await pick({persona, question: t.question, profile: t.profile, candidates: t.candidates, memory: t.memory});
  return base({
    personaId, personaName: persona.name, personaSource: persona.from, agentId: t.agentId, agentName: COACHES[t.agentId]?.name,
    text: dollars(p.text), citations: p.citations, calculations: p.chosen.calculations,
    memoryUpdates: p.memoryUpdates, turnId, candidates: t.candidates, pick: p.pick,
    validation: {...t.validation, replyVerified: p.replyVerified},
  });
}

export async function chat({personaId = 'debt-free-coach', agentId = 'budget', messages = [], profile = {}, memory = [], tier = 'free'} = {}) {
  if (!COACHES[agentId]) return base({text: 'That coach is coming soon.', handoff: {agentId: 'budget', reason: 'Coach locked on the free plan'}});
  const question = String(messages.filter(m => m.role === 'user').at(-1)?.content || '').slice(0, 2000);
  const library = calcLibrary(profile, question);
  if (library.snapshot.status !== 'ok') {
    return base({personaId, text: 'Before I can plan anything, I need your take-home pay for the last few months. Retake the quiz or tell me what you earned each month.'});
  }
  const gen = await generate({question, messages, profile, library, memory, agentId});
  const {candidates, dropped} = validateCandidates(gen.raw, library);
  if (candidates.length < MIN_CANDIDATES) {
    if (gen.needsInfo) return base({personaId, text: gen.needsInfo});
    throw Error('The agent could not produce enough verified options. Try rephrasing.');
  }
  const turnId = randomUUID();
  turns.set(turnId, {question, profile, memory, candidates, agentId, validation: {generated: gen.raw.length, kept: candidates.length, dropped}});
  if (turns.size > 500) turns.delete(turns.keys().next().value);
  const out = await respond(turnId, personaId);
  if (gen.needsInfo) out.text += ` One question for you: ${gen.needsInfo}`;
  return out;
}

export async function repick({turnId, personaId}) {
  if (!turns.has(turnId)) throw Error('Unknown turn; ask the question again');
  return respond(turnId, personaId);
}

export const getTurn = turnId => turns.get(turnId);
export const restoreTurn = (turnId, turn) => turns.set(turnId, turn);
