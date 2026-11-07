// End-to-end check with 15 realistic people who are struggling with money.
// Each person: profile -> Ramsey-inspired Budget Agent -> verify options and conversation history.
// Planned Plus mentors and agents must remain visible without answering as live features.
//
// Live AI:        MENTOR_API_KEY=... node scripts/evaluate-people.js [report.json]
// Practice engine: MENTOR_ENGINE=mock node scripts/evaluate-people.js [report.json]
import {writeFileSync} from 'node:fs';
// One test client sends many requests from one IP, so lift the per-IP hourly limit for this run only.
process.env.CHAT_LIMIT_PER_HOUR ||= '100000';
const {createServer} = await import('../server.js');
const {summarize} = await import('../lib/mentor/perf.js');
const {performance} = await import('node:perf_hooks');
const latency = {chat: [], expand: []}; // wall-clock ms per request (monotonic clock)

const engine = process.env.MENTOR_ENGINE === 'mock' ? 'practice' : 'live';
if (engine === 'live' && !process.env.MENTOR_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('Set MENTOR_API_KEY (live AI) or MENTOR_ENGINE=mock (practice engine).'); process.exit(2);
}
const m = (y, a) => ({month: y, amount: a});
const months = (...amts) => amts.map((a, i) => m(`2026-${String(5 + i).padStart(2, '0')}`, a));
const card = (balance, apr, min, name = 'Credit card') => ({name, balance, aprPercent: apr, minPayment: min});

// 15 people with real money problems. Amounts are illustrative, not real people.
export const PEOPLE = [
  {name: 'Jordan, 22, DoorDash + part-time retail', q: 'My income changes every month. How do I budget so I stop running short?',
    a: {incomeHistory: months('2310', '2950', '2120', '2640', '1780', '2410'), bills: [{name: 'Rent', amount: '725'}, {name: 'Phone', amount: '45'}, {name: 'Car insurance', amount: '138'}], expenses: [{name: 'food', amount: '380'}, {name: 'gas', amount: '160'}], debts: [card('1340', '24.9', '45'), {name: 'Car loan', balance: '9800', aprPercent: '7.9', minPayment: '289'}], savings: '420'}},
  {name: 'Maya, 20, college student, server with tips', q: 'My tips are all over the place. What should I pay first in a slow week?',
    a: {incomeHistory: months('1450', '980', '1620', '1100', '870', '1300'), bills: [{name: 'Rent share', amount: '550'}, {name: 'Phone', amount: '40'}], expenses: [{name: 'food', amount: '250'}], debts: [card('620', '27.4', '25')], savings: '150'}},
  {name: 'Luis, 24, construction, slow winters', q: 'Work dries up every winter. How do I get through the slow months?',
    a: {incomeHistory: months('4200', '4600', '4100', '3900', '2100', '1500'), bills: [{name: 'Rent', amount: '1100'}, {name: 'Truck insurance', amount: '160'}], expenses: [{name: 'food', amount: '450'}, {name: 'gas', amount: '300'}], debts: [{name: 'Truck loan', balance: '18400', aprPercent: '7.9', minPayment: '389'}], savings: '800'}},
  {name: 'Aisha, 27, single mom, hourly nurse aide', q: "I'm behind on two bills this month. What do I cover first?",
    a: {incomeHistory: months('2600', '2450', '2700', '2300', '2550', '2400'), bills: [{name: 'Rent', amount: '1150'}, {name: 'Childcare', amount: '600'}, {name: 'Utilities', amount: '210'}, {name: 'Phone', amount: '60'}], expenses: [{name: 'food', amount: '450'}], debts: [card('3100', '26.0', '95')], savings: '60'}},
  {name: 'Tyler, 23, first salaried job, wants to invest', q: 'I have some savings and student loans. Should I start investing now?',
    a: {incomeHistory: months('3000', '3000', '3000', '3000', '3000', '3000'), bills: [{name: 'Rent', amount: '900'}, {name: 'Phone', amount: '50'}], expenses: [{name: 'food', amount: '350'}], debts: [{name: 'Student loan', balance: '8000', aprPercent: '5.5', minPayment: '90'}], savings: '5000'}},
  {name: 'Priya, 29, freelance designer', q: 'Clients pay late and unevenly. How much should I keep as a cushion?',
    a: {incomeHistory: months('6200', '1800', '4500', '0', '5100', '3300'), bills: [{name: 'Rent', amount: '1400'}, {name: 'Health insurance', amount: '320'}, {name: 'Software', amount: '90'}], expenses: [{name: 'food', amount: '400'}], debts: [], savings: '2500'}},
  {name: 'Marcus, 31, three credit cards maxed', q: 'I have three credit cards. Which one do I pay off first?',
    a: {incomeHistory: months('3800', '3750', '3900', '3800', '3850', '3800'), bills: [{name: 'Rent', amount: '1200'}, {name: 'Car insurance', amount: '140'}], expenses: [{name: 'food', amount: '500'}], debts: [card('900', '29.9', '35', 'Store card'), card('4200', '22.0', '120', 'Visa'), card('7600', '18.5', '210', 'Mastercard')], savings: '300'}},
  {name: 'Emily, 25, buy-now-pay-later stack', q: "I've got a bunch of buy now pay later plans. How do I get out?",
    a: {incomeHistory: months('2900', '2850', '3000', '2950', '2900', '2950'), bills: [{name: 'Rent', amount: '1000'}, {name: 'Phone', amount: '55'}], expenses: [{name: 'food', amount: '350'}], debts: [{name: 'BNPL plans', balance: '1450', aprPercent: '0', minPayment: '160'}, card('2200', '24.0', '70')], savings: '200'}},
  {name: 'Dev, 26, upside-down car loan', q: 'My car payment is killing me. Should I keep paying or sell it?',
    a: {incomeHistory: months('3300', '3250', '3400', '3300', '3350', '3300'), bills: [{name: 'Rent', amount: '1050'}, {name: 'Car insurance', amount: '210'}], expenses: [{name: 'food', amount: '400'}, {name: 'gas', amount: '180'}], debts: [{name: 'Car loan', balance: '31000', aprPercent: '11.9', minPayment: '640'}], savings: '700'}},
  {name: 'Grace, 34, medical bills after ER visit', q: 'I have medical bills I can not pay right now. What should I do?',
    a: {incomeHistory: months('3600', '3550', '3600', '3500', '3600', '3550'), bills: [{name: 'Rent', amount: '1300'}, {name: 'Utilities', amount: '180'}], expenses: [{name: 'food', amount: '450'}], debts: [{name: 'Medical bill', balance: '5400', aprPercent: '0', minPayment: '100'}, card('1100', '25.0', '40')], savings: '0'}},
  {name: 'Sam, 21, rideshare driver, no savings', q: 'I have zero savings. How do I start an emergency fund on gig pay?',
    a: {incomeHistory: months('1900', '2300', '1600', '2100', '1500', '2000'), bills: [{name: 'Rent', amount: '700'}, {name: 'Car insurance', amount: '190'}, {name: 'Phone', amount: '45'}], expenses: [{name: 'food', amount: '300'}, {name: 'gas', amount: '350'}], debts: [{name: 'Car loan', balance: '7200', aprPercent: '9.5', minPayment: '230'}], savings: '0'}},
  {name: 'Rachel, 28, overspends eating out', q: 'I keep going over budget on food and fun. How do I stop?',
    a: {incomeHistory: months('4100', '4100', '4100', '4100', '4100', '4100'), bills: [{name: 'Rent', amount: '1450'}, {name: 'Phone', amount: '70'}, {name: 'Streaming', amount: '45'}], expenses: [{name: 'food', amount: '900'}, {name: 'fun', amount: '600'}], debts: [card('3800', '23.0', '110')], savings: '400'}},
  {name: 'Kenji, 30, commission sales', q: 'Some months I make a lot, some barely anything. Where should extra money go?',
    a: {incomeHistory: months('2500', '7800', '3100', '9200', '2800', '4600'), bills: [{name: 'Rent', amount: '1500'}, {name: 'Car insurance', amount: '150'}], expenses: [{name: 'food', amount: '500'}], debts: [{name: 'Student loan', balance: '22000', aprPercent: '6.8', minPayment: '250'}, card('2600', '21.0', '80')], savings: '1500'}},
  {name: 'Tasha, 33, payday loan cycle', q: 'I keep taking payday loans to make it to the next check. How do I break this?',
    a: {incomeHistory: months('2200', '2250', '2200', '2150', '2200', '2200'), bills: [{name: 'Rent', amount: '950'}, {name: 'Utilities', amount: '160'}, {name: 'Phone', amount: '50'}], expenses: [{name: 'food', amount: '400'}], debts: [{name: 'Payday loan (illustrative rate)', balance: '800', aprPercent: '99', minPayment: '160'}, card('1500', '28.0', '50')], savings: '0'}},
  {name: 'Noah, 19, no income history yet', q: 'Make me a budget.', missingIncome: true,
    a: {incomeHistory: [], bills: [{name: 'Phone', amount: '40'}], expenses: [{name: 'food', amount: '150'}], debts: [], savings: '50'}},
];

const COACHES = ['budget'];
const RAMSEY = 'debt-free-coach';

async function run() {
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  try {
    for (const [i, person] of PEOPLE.entries()) {
      const sid = `eval-person-${String(i + 1).padStart(2, '0')}-${Date.now()}`;
      const H = {'Content-Type': 'application/json', 'X-Session-Id': sid};
      const call = async (method, path, body) => {
        const t0 = performance.now();
        const r = await fetch(base + path, {method, headers: H, body: body ? JSON.stringify(body) : undefined});
        const out = {status: r.status, json: await r.json().catch(() => ({}))};
        out.ms = Math.round(performance.now() - t0);
        if (path === '/api/chat' && r.status === 200) latency.chat.push(out.ms);
        if (path === '/api/expand' && r.status === 200) latency.expand.push(out.ms);
        return out;
      };
      const out = {person: person.name, question: person.q, checks: {}, turns: [], problems: []};
      const fail = (k, msg) => { out.checks[k] = false; out.problems.push(msg); };
      const ok = k => { if (out.checks[k] !== false) out.checks[k] = true; };
      try {
        const prof = await call('POST', '/api/profile', {answers: {...person.a, personaHint: RAMSEY}});
        prof.status === 200 ? ok('quiz') : fail('quiz', `profile ${prof.status} ${JSON.stringify(prof.json).slice(0, 120)}`);
        out.snapshot = prof.json.snapshot ? {status: prof.json.snapshot.status, lowestMonth: prof.json.snapshot.lowestMonth, essentials: prof.json.snapshot.essentialsTotal, shortfall: prof.json.snapshot.lowestMonthShortfall} : null;

        if (person.missingIncome) {
          const c = await call('POST', '/api/chat', {message: person.q, personaId: RAMSEY, agentId: 'budget'});
          const answers = c.status === 200 && Boolean(c.json.text) && /not advice from a licensed/i.test(c.json.disclosure || '');
          answers ? ok('generalAnswer') : fail('generalAnswer', `expected an educational reply, got ${c.status}: ${(c.json.text || c.json.error || '').slice(0, 120)}`);
          out.turns.push({coach: 'budget', text: c.json.text});
          out.passed = Object.values(out.checks).every(Boolean); results.push(out);
          console.log(`${out.passed ? 'PASS' : 'FAIL'}  ${String(i + 1).padStart(2)}. ${person.name} | general answer: ${out.checks.generalAnswer}${out.problems.length ? ' | ' + out.problems.join('; ') : ''}`);
          continue;
        }

        let messagesSent = 0, optionIds = new Set(), firstTurn = null;
        for (const coach of COACHES) {
          const c = await call('POST', '/api/chat', {message: person.q, personaId: RAMSEY, agentId: coach});
          messagesSent++;
          if (c.status !== 200 || !c.json.text) { fail('chat', `${coach}: ${c.status} ${(c.json.error || '').slice(0, 120)}`); continue; }
          ok('chat');
          const r = c.json;
          if (!/not advice from a licensed/i.test(r.disclosure || '')) fail('disclosure', `${coach}: disclosure missing`); else ok('disclosure');
          if (!r.turnId) fail('turnSaved', `${coach}: no turnId`); else ok('turnSaved');
          if (engine === 'live' && !(r.citations || []).length) fail('cited', `${coach}: no citations`); else ok('cited');
          // Options Ramsey chose from (same verified set; only the pick is re-run).
          const cmp = await call('POST', '/api/compare', {turnId: r.turnId, personaIds: [RAMSEY]});
          const cands = cmp.json.candidates || [];
          const pick = cmp.json.mentors?.[0];
          if (cmp.status !== 200 || !cands.length) fail('options', `${coach}: no options (${cmp.status})`); else ok('options');
          if (pick && !cands.some(x => x.id === pick.pickId)) fail('pickInSet', `${coach}: pick ${pick.pickId} not in option set`); else ok('pickInSet');
          cands.forEach(x => optionIds.add(x.title.trim().toLowerCase())); // distinct options, not per-coach repeats
          firstTurn ||= r.turnId;
          out.turns.push({coach, ramseyAnswer: r.text, citations: (r.citations || []).map(x => x.title), options: cands.map(x => x.title), ramseyPick: pick?.pickTitle, mode: r.mode});
        }
        out.optionCount = optionIds.size;
        // Progressive answer: expand the first turn toward the full option set without changing what was shown.
        if (firstTurn) {
          const before = await call('POST', '/api/compare', {turnId: firstTurn, personaIds: [RAMSEY]});
          const x = await call('POST', '/api/expand', {turnId: firstTurn});
          const after = await call('POST', '/api/compare', {turnId: firstTurn, personaIds: [RAMSEY]});
          const shown = (before.json.candidates || []).map(c => c.title);
          const keptShown = shown.every((t, k) => after.json.candidates?.[k]?.title === t);
          const distinct = new Set((after.json.candidates || []).map(c => c.title.trim().toLowerCase())).size;
          out.expansion = {status: x.status, ms: x.ms, added: x.json.added?.length ?? 0, total: x.json.total ?? null, distinct, note: x.json.note || null};
          x.status === 200 && keptShown && distinct === (after.json.candidates || []).length ? ok('expansionConsistent')
            : fail('expansionConsistent', `expand ${x.status}, shown options kept: ${keptShown}, distinct ${distinct}`);
        }
        out.optionCount >= 3 ? ok('verifiedOptions') : fail('verifiedOptions', `only ${out.optionCount} verified options`);

        // Planned perspectives are gated before and after the test-mode Plus unlock.
        const sw = await call('POST', '/api/repick', {turnId: firstTurn, personaId: 'conscious-spender'});
        sw.status === 402 ? ok('mentorGate') : fail('mentorGate', `expected 402, got ${sw.status}`);
        await call('POST', '/api/checkout/demo');
        const planned = await call('POST', '/api/repick', {turnId: firstTurn, personaId: 'conscious-spender'});
        planned.status === 409 ? ok('plannedMentor') : fail('plannedMentor', `expected 409, got ${planned.status}`);
        const plannedAgent = await call('POST', '/api/chat', {message: person.q, personaId: RAMSEY, agentId: 'debt'});
        plannedAgent.status === 409 ? ok('plannedAgent') : fail('plannedAgent', `expected 409, got ${plannedAgent.status}`);
        const all = await call('POST', '/api/compare', {turnId: firstTurn});
        const ran = (all.json.mentors || []).filter(x => x.status === 'ok');
        out.comparison = {summary: all.json.summary, factsUnchanged: all.json.factsUnchanged, ran: ran.map(x => `${x.name}: ${x.pickTitle}`), notRun: (all.json.mentors || []).filter(x => x.status !== 'ok').map(x => `${x.name} (${x.status}${x.error ? ': ' + x.error.slice(0, 60) : ''})`)};
        all.status === 200 && all.json.factsUnchanged ? ok('compareSameFacts') : fail('compareSameFacts', `compare ${all.status} factsUnchanged=${all.json.factsUnchanged}`);
        ran.length === 1 && ran[0].personaId === RAMSEY ? ok('onlyFlagshipRan') : fail('onlyFlagshipRan', `${ran.length} mentors answered`);
        (all.json.mentors || []).filter(x => x.status === 'coming-soon').length === 9 ? ok('plannedMentorsVisible') : fail('plannedMentorsVisible', 'planned mentors missing from comparison');
        const ids = new Set(all.json.candidates?.map(x => x.id));
        ran.every(x => ids.has(x.pickId)) ? ok('mentorPicksInSet') : fail('mentorPicksInSet', 'a mentor picked outside the option set');

        // Nothing lost: history holds every question and answer, the first turn is still re-pickable.
        const hist = await call('GET', '/api/history');
        const h = hist.json.history || [];
        const users = h.filter(x => x.role === 'user').length, bots = h.filter(x => x.role === 'assistant').length;
        users >= messagesSent && bots >= messagesSent ? ok('historyComplete') : fail('historyComplete', `history has ${users} questions / ${bots} answers for ${messagesSent} questions`);
        const again = await call('POST', '/api/repick', {turnId: firstTurn, personaId: RAMSEY});
        again.status === 200 ? ok('earlyTurnKept') : fail('earlyTurnKept', `first turn no longer available (${again.status})`);
        (await call('GET', '/api/memory')).status === 200 ? ok('memory') : fail('memory', 'memory endpoint failed');
      } catch (e) { fail('crash', e.message); }
      out.passed = Object.values(out.checks).every(Boolean);
      results.push(out);
      console.log(`${out.passed ? 'PASS' : 'FAIL'}  ${String(i + 1).padStart(2)}. ${person.name}${out.optionCount ? ` | ${out.optionCount} options` : ''}${out.problems.length ? ' | ' + out.problems.join('; ') : ''}`);
    }
  } finally { await new Promise(r => server.close(r)); }
  const passed = results.filter(r => r.passed).length;
  const timing = {chat: summarize(latency.chat), expand: summarize(latency.expand)};
  const report = {engine, ranAt: new Date().toISOString(), passed, total: results.length, timing, results};
  const file = process.argv[2];
  if (file) writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(`\n${engine} engine: ${passed}/${results.length} people passed every check.${file ? ` Full report: ${file}` : ''}`);
  const fmt = t => t.count ? `n=${t.count} avg ${t.avg}ms median ${t.median}ms p90 ${t.p90}ms p95 ${t.p95}ms min ${t.min}ms max ${t.max}ms | <=5s ${t.within5s}% <=8s ${t.within8s}% <=10s ${t.within10s}%` : 'no samples';
  console.log(`Answer latency (${engine === 'live' ? 'LIVE Claude' : 'practice engine, NOT Claude'}): ${fmt(timing.chat)}`);
  console.log(`Expand latency: ${fmt(timing.expand)}`);
  if (passed !== results.length) process.exitCode = 1;
}
run();
