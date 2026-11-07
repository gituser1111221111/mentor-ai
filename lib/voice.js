// ElevenLabs speech-to-text (STT) and text-to-speech (TTS). Voice is transport only:
// ElevenLabs turns the user's audio into text, and turns an already-verified reply into audio.
// It never generates, edits, or summarizes financial content. No ElevenLabs Agent is used.
// The API key stays on the server (ELEVENLABS_API_KEY) and is never sent to the browser.

const env = k => (process.env[k] || '').trim();
const base = () => env('ELEVENLABS_BASE_URL') || 'https://api.elevenlabs.io';
export const sttModel = () => env('ELEVENLABS_STT_MODEL') || 'scribe_v1';
export const ttsModel = () => env('ELEVENLABS_TTS_MODEL') || 'eleven_flash_v2_5';
export const voiceConfigured = () => Boolean(env('ELEVENLABS_API_KEY'));

// One voice per mentor: ELEVENLABS_VOICE_<MENTOR_ID>, e.g. debt-free-coach -> ELEVENLABS_VOICE_DEBT_FREE_COACH.
// ELEVENLABS_VOICE_DEFAULT is an optional fallback for mentors without their own voice.
export const voiceEnvVar = personaId => 'ELEVENLABS_VOICE_' + String(personaId).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
export function voiceIdFor(personaId) {
  const id = env(voiceEnvVar(personaId)) || env('ELEVENLABS_VOICE_DEFAULT');
  return /^[A-Za-z0-9]{8,64}$/.test(id) ? id : null;
}
export const voicedPersonas = ids => (voiceConfigured() ? ids.filter(id => voiceIdFor(id)) : []);

export const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'];
export const MAX_AUDIO_BYTES = 5_000_000; // about 60 seconds of compressed speech, well past a question
export const MAX_SPEAK_CHARS = 2500;

export class VoiceError extends Error { constructor(status, message) { super(message); this.status = status; } }

async function call(path, init) {
  let r;
  try { r = await fetch(base() + path, {...init, headers: {'xi-api-key': env('ELEVENLABS_API_KEY'), ...init.headers}, signal: AbortSignal.timeout(30_000)}); }
  catch (e) { throw new VoiceError(502, `Voice service unreachable: ${e.message}`); }
  if (!r.ok) {
    const detail = (await r.text().catch(() => '')).slice(0, 200);
    console.error(`ElevenLabs ${path.split('?')[0]} failed: ${r.status} ${detail}`);
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

// Verified reply text in, audio out. The text is passed through unchanged.
export async function synthesize(text, voiceId) {
  const r = await call(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'audio/mpeg'},
    body: JSON.stringify({text, model_id: ttsModel()}),
  });
  return {audio: Buffer.from(await r.arrayBuffer()), type: r.headers.get('content-type')?.split(';')[0] || 'audio/mpeg'};
}
