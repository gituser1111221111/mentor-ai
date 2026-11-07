// Thin wrapper around the Anthropic SDK: JSON-schema structured output, cached system prompt.
// Swappable client so tests never call the real API.
import Anthropic from '@anthropic-ai/sdk';

export const MODELS = {
  generate: process.env.MENTOR_GENERATE_MODEL || 'claude-sonnet-5-5',
  pick: process.env.MENTOR_PICK_MODEL || 'claude-sonnet-5-5',
};

let client;
export function setClient(c) { client = c; }
// MENTOR_API_KEY wins so a stray machine-wide ANTHROPIC_API_KEY can't shadow the project's key
// (Node's --env-file never overrides variables already set in the environment).
export const apiKey = () => process.env.MENTOR_API_KEY || process.env.ANTHROPIC_API_KEY;
function getClient() { return client ||= new Anthropic({apiKey: apiKey(), timeout: 60_000, maxRetries: 1}); }

export class ModelError extends Error {}

// system: array of text blocks (put cache_control on the stable ones).
// signal: optional AbortSignal so a speculative call can be cancelled for real (not just ignored).
export async function jsonCall({model, system, user, schema, effort = 'low', maxTokens = 8000, fallback = false, signal}) {
  const params = {
    model, max_tokens: maxTokens, system,
    messages: [{role: 'user', content: user}],
    output_config: {effort, format: {type: 'json_schema', schema}},
  };
  const c = getClient();
  const opts = signal ? {signal} : undefined;
  let res;
  if (fallback) {
    // Server-side refusal fallback (Claude API only). If the beta is unavailable, retry plain.
    try { res = await c.beta.messages.create({...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default'}, opts); }
    catch (e) { if (e instanceof Anthropic.BadRequestError) res = await c.messages.create(params, opts); else throw e; }
  } else res = await c.messages.create(params, opts);

  if (res.stop_reason === 'refusal') throw new ModelError(`model declined (${res.stop_details?.category || 'unspecified'})`);
  if (res.stop_reason === 'max_tokens') throw new ModelError('model output was cut off');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  try { return {data: JSON.parse(text), usage: res.usage, model: res.model}; }
  catch { throw new ModelError('model returned invalid JSON'); }
}
