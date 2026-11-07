// Live engine (A/B contract). generate (Sonnet) -> validate (code) -> pick (Haiku persona) -> respond.
// routes.js loads this automatically when ANTHROPIC_API_KEY is set; otherwise chat.mock.js.
import {randomUUID} from 'node:crypto';
import {calcLibrary} from './tools.js';
import {validateCandidates} from './validate.js';
import {generate, COACHES} from './generate.js';
import {pick} from './pick.js';
import {loadPersona} from './personas.js';
import {dollars} from './chat.mock.js';
import {jsonCall, MODELS} from './llm.js';

const DISCLOSURE = 'Educational opinion, not advice from a licensed financial adviser, CPA, or attorney. Persona inspired by public teachings; not affiliated or endorsed.';
const turns = new Map();
const MIN_CANDIDATES = 3;
const GENERAL_SCHEMA = {type: 'object', additionalProperties: false, required: ['reply'], properties: {reply: {type: 'string'}}};

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
  const library = calcLibrary(profile);
  if (library.snapshot.status !== 'ok') {
    const persona = loadPersona(personaId);
    const {data} = await jsonCall({
      model: MODELS.pick, maxTokens: 800, schema: GENERAL_SCHEMA,
      system: [{type: 'text', text: `${persona.core}\nYou are Mentor Labs' Ramsey-inspired educational assistant. Answer the latest general money question conversationally in a few short paragraphs. Ask one useful follow-up when personal numbers are needed. Do not invent the user's finances, imply you are the real person, or give specific investment or tax instructions. Do not present an individual financial plan without their numbers. Avoid unsupported numerical claims.`}],
      user: JSON.stringify({recentConversation: messages.slice(-8), rememberedFacts: memory.slice(-5).map(m => m.fact)}),
    });
    return base({personaId, personaName: persona.name, agentId, agentName: 'Ramsey starter', text: String(data.reply || '').slice(0, 3000)});
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
