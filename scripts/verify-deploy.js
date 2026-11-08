// Checks a deployed Mentor Labs site end to end without any secrets.
// Usage: npm run verify:live            (defaults to the Render demo)
//        npm run verify:live -- https://your-site.onrender.com
// It reads only public status routes, then asks one budgeting question and requests its audio.
// Uses at most one Claude answer and one ElevenLabs clip. It does not touch market quotes,
// so the Alpha Vantage daily limit (25 calls) is not spent.
import {randomUUID} from 'node:crypto';

const base = (process.argv[2] || process.env.VERIFY_URL || 'https://mentor-ai-ahjs.onrender.com').replace(/\/$/, '');
const sid = randomUUID();
let failed = 0;
const line = (ok, label, detail = '') => { if (ok === false) failed++; console.log(`${ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`); };
const get = async path => { const r = await fetch(base + path, {signal: AbortSignal.timeout(90_000)}); return {status: r.status, data: await r.json().catch(() => null)}; };
const post = async (path, body) => {
  const r = await fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000)});
  return r;
};

console.log(`Checking ${base} (a sleeping free Render service can take about a minute to wake)\n`);
try {
  const health = await get('/api/health');
  line(health.status === 200, 'server is up', `HTTP ${health.status}`);
  if ('mentorConfigured' in (health.data || {})) {
    line(health.data.mentorConfigured, 'Claude key is set (MENTOR_API_KEY)');
    line(health.data.voiceConfigured, 'ElevenLabs key is set (ELEVENLABS_API_KEY)');
  }
  const cfg = await get('/api/config');
  line(cfg.data?.engine === 'live', 'AI engine is live', `engine=${cfg.data?.engine}`);
  line(cfg.data?.voice === true, 'Ramsey voice resolved', `voice=${cfg.data?.voice}`);
  const market = await get('/api/market/status');
  const live = market.data?.live || {};
  line(live.alphaVantage === true, 'Alpha Vantage key is set');
  line(live.fred === true, 'FRED key is set');
  line(null, `Finnhub ${live.finnhub ? 'set' : 'not set'} (optional), SEC EDGAR ${live.secEdgar ? 'set' : 'not set'} (optional), snapshot dated ${market.data?.fallbackSnapshotAsOf}`);

  if (cfg.data?.engine === 'live') {
    const prof = await post('/api/profile', {answers: {incomeHistory: [{month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2950'}], bills: [{name: 'Rent', amount: '1100'}], expenses: [{name: 'Food', amount: '521'}], debts: [{name: 'Card', balance: '2400', aprPercent: '24.9', minPayment: '334'}], savings: '420'}});
    line(prof.status === 200, 'sample financial profile saved', `HTTP ${prof.status}`);
    const t0 = Date.now();
    const chat = await post('/api/chat', {message: 'How should I budget when my pay keeps changing?', personaId: 'debt-free-coach', agentId: 'budget'});
    const answer = await chat.json().catch(() => ({}));
    line(chat.status === 200 && Boolean(answer.text), 'Claude answered a budgeting question', `HTTP ${chat.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s${answer.code ? ' ' + answer.code : ''}`);
    if (answer.text) {
      console.log(`      "${answer.text.slice(0, 220)}${answer.text.length > 220 ? '...' : ''}"`);
      const known = ['1,780.00', '1,955.00', '175.00', '420.00'].filter(n => answer.text.includes(n));
      line(null, `answer quotes the user's figures: ${known.length ? known.map(n => '$' + n).join(', ') : 'none of the expected figures (check the answer above)'}`);
    }
    if (cfg.data?.voice && answer.text) {
      const audio = await post('/api/voice/speak', {turnId: answer.turnId || answer.voiceTurnId, personaId: 'debt-free-coach', voiceReplyId: answer.voiceReplyId});
      const bytes = audio.ok ? (await audio.arrayBuffer()).byteLength : 0;
      line(audio.ok && bytes > 1000, 'ElevenLabs returned audio', `HTTP ${audio.status}, ${bytes} bytes, ${audio.headers.get('content-type')}`);
    }
    await fetch(base + '/api/session', {method: 'DELETE', headers: {'Content-Type': 'application/json', 'X-Session-Id': sid}}).catch(() => {});
  }
} catch (e) {
  line(false, 'could not reach the site', e.name === 'TimeoutError' ? 'timed out' : e.message);
}
console.log(failed ? `\n${failed} check(s) failed. See docs/DEMO_DEPLOYMENT.md for the Render settings.` : '\nAll checks passed.');
process.exitCode = failed ? 1 : 0;
