// ElevenLabs speech-to-text (STT) and text-to-speech (TTS). Voice is transport only:
// ElevenLabs turns the user's audio into text, and turns an already-verified reply into audio.
// It never generates, edits, or summarizes financial content. No ElevenLabs Agent is used.
// The API key stays on the server (ELEVENLABS_API_KEY) and is never sent to the browser.

import {NUMBER_WORDS_VERSION} from './speech-numbers.js';

const env = k => (process.env[k] || '').trim();
const base = () => env('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io';
export const sttModel = () => env('ELEVENLABS_STT_MODEL') || 'scribe_v2';
export const ttsModel = () => env('ELEVENLABS_TTS_MODEL') || 'eleven_flash_v2_5';
export const voiceConfigured = () => Boolean(env('ELEVENLABS_API_KEY'));
// ElevenLabs' own text normalization: 'auto' (their default), 'on' or 'off'. ElevenLabs documents that
// 'on' is Enterprise-only for eleven_flash_v2_5 and eleven_turbo_v2_5, so the default stays 'auto' and
// a plan that cannot use 'on' is never sent it unless someone sets it. Our own normalizer
// (lib/speech-numbers.js) already spells out every amount before the text gets here.
export const textNormalization = () => (['auto', 'on', 'off'].includes(env('ELEVENLABS_TEXT_NORMALIZATION')) ? env('ELEVENLABS_TEXT_NORMALIZATION') : 'auto');

// The demo uses only the voice assigned to the Dave Ramsey-inspired mentor.
export const voiceEnvVar = personaId => 'ELEVENLABS_VOICE_' + String(personaId).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
export function voiceIdFor(personaId) {
  if (personaId !== 'debt-free-coach') return null;
  const id = env(voiceEnvVar(personaId)) || env('ELEVENLABS_VOICE_ID');
  return /^[A-Za-z0-9]{8,64}$/.test(id) ? id : null;
}
let discoveredVoice;
let discoveryUntil = 0;
export async function resolveVoiceIdFor(personaId) {
  if (!voiceConfigured() || personaId !== 'debt-free-coach') return null;
  const configured = voiceIdFor(personaId);
  if (configured) return configured;
  if (Date.now() < discoveryUntil) return discoveredVoice;
  // A key alone is enough when the account has one voice named exactly "Dave Ramsey".
  // We never choose a partial match or send a voice ID to the browser.
  const r = await call('/v2/voices?search=Dave%20Ramsey&page_size=100', {method: 'GET'});
  const voices = (await r.json()).voices || [];
  const exact = voices.filter(v => v.name?.trim().toLowerCase() === 'dave ramsey');
  discoveredVoice = exact.length === 1 && /^[A-Za-z0-9]{8,64}$/.test(exact[0].voice_id) ? exact[0].voice_id : null;
  discoveryUntil = Date.now() + (discoveredVoice ? 300_000 : 30_000);
  return discoveredVoice;
}

export const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'];
export const MAX_AUDIO_BYTES = 5_000_000; // about 60 seconds of compressed speech, well past a question
export const MAX_SPEAK_CHARS = 2500;

export class VoiceError extends Error { constructor(status, message) { super(message); this.status = status; } }

async function call(path, init) {
  let r;
  try { r = await fetch(base() + path, {...init, headers: {'xi-api-key': env('ELEVENLABS_API_KEY'), ...init.headers}, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000)}); }
  catch (e) { throw new VoiceError(502, `Voice service unreachable: ${e.message}`); }
  if (!r.ok) {
    await r.body?.cancel();
    console.error(`ElevenLabs request failed: ${r.status}`);
    throw new VoiceError(502, r.status === 401 ? 'Voice service rejected the server key.' : `Voice service error (${r.status}).`);
  }
  return r;
}

// Audio bytes in, transcript out. The transcript is plain text that then goes through /api/chat
// exactly like a typed message.
export async function transcribe(audio, mime) {
  const form = new FormData();
  form.append('model_id', sttModel());
  form.append('file', new Blob([audio], {type: mime}), 'question.' + (mime.split('/')[1] || 'webm').split(';')[0]);
  const data = await (await call('/v1/speech-to-text', {method: 'POST', body: form})).json();
  return String(data.text || '').replace(/\s+/g, ' ').trim();
}

// Speakable text in, audio out. The caller passes the verified reply after speakableText(), which only
// changes how numbers are written (digits to words). Nothing else is edited here.
// Omit voice_settings so ElevenLabs uses this voice's saved settings. Fixed app-side
// overrides previously replaced the user's delivery settings (including stability/style).
// The distinct cache policy prevents reusing clips generated with those overrides.
export const ttsConfigKey = () => JSON.stringify({model:ttsModel(),settings:'elevenlabs-saved-voice-v1',format:'mp3_44100_128',normalization:textNormalization(),numberWords:NUMBER_WORDS_VERSION});
export async function synthesize(text, voiceId, {signal} = {}) {
  const r = await call(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST', signal, headers: {'Content-Type': 'application/json', Accept: 'audio/mpeg'},
    body: JSON.stringify({text, model_id: ttsModel(), apply_text_normalization: textNormalization()}),
  });
  const type = r.headers.get('content-type')?.split(';')[0];
  if (type !== 'audio/mpeg') { await r.body?.cancel(); throw new VoiceError(502,'Voice service returned an unexpected audio format.'); }
  const audio = Buffer.from(await r.arrayBuffer());
  if (!audio.length) throw new VoiceError(502,'Voice service returned empty audio.');
  return {audio, type};
}
