import {jsonCall, MODELS} from './llm.js';

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['kind', 'reply'],
  properties: {
    kind: {type: 'string', enum: ['conversation', 'finance']},
    reply: {type: 'string'},
  },
};

export async function conversationTurn({persona, messages, signal}) {
  const recent = messages.slice(-12).map(m => ({role: m.role, content: String(m.content).slice(0, 2000)}));
  const {data} = await jsonCall({
    model: MODELS.pick, schema: SCHEMA, maxTokens: 450, signal,
    system: [{type: 'text', text: `${persona.core}\n\nYou are chatting naturally with the user. Decide whether their latest message asks for financial guidance, a budget, debt or savings advice, or analysis of their numbers. If so, return kind finance and an empty reply; a separate verified system handles it. Otherwise return kind conversation and a brief, warm response to the latest message in context. A greeting deserves a greeting. Answer ordinary follow-ups naturally. Do not introduce money advice unasked, invent personal facts, quote financial numbers, or claim to be the public figure who inspired this persona.`, cache_control: {type: 'ephemeral'}}],
    user: JSON.stringify(recent),
  });
  return {kind: data.kind, reply: String(data.reply || '').trim().slice(0, 1200)};
}
