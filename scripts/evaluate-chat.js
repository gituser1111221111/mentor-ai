// Run with: npm run eval:chat (requires MENTOR_API_KEY or ANTHROPIC_API_KEY).
// Automated checks cover mechanics; review printed answers for usefulness and source fidelity.
import {normalizeProfile} from '../lib/profile.js';
import {chat} from '../lib/mentor/chat.js';

if (!process.env.MENTOR_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error('Set MENTOR_API_KEY to run the live chat evaluation.');
  process.exit(2);
}

const base = {
  incomeHistory: [{month: '2026-08', amount: '2950'}, {month: '2026-09', amount: '1780'}, {month: '2026-10', amount: '2410'}],
  bills: [{name: 'Rent', amount: '725'}, {name: 'Phone', amount: '45'}, {name: 'Insurance', amount: '138'}],
  expenses: [{name: 'Food', amount: '380'}, {name: 'Gas', amount: '160'}],
  debts: [{name: 'Credit card', balance: '1340', aprPercent: '24.9', minPayment: '45'}, {name: 'Car', balance: '9800', aprPercent: '7.9', minPayment: '289'}],
  savings: '420', goals: ['stop_paycheck_to_paycheck', 'pay_off_debt'],
};

const scenarios = [
  {name: 'Low month shortfall', question: 'My hours dropped. What should I cover first?', answers: {...base, bills: [...base.bills, {name: 'Utilities', amount: '300'}]}, terms: /low|short|essential|bill|income/i},
  {name: 'Debt versus savings', question: 'Should I pay my card or build savings first?', answers: base, terms: /debt|card|save|fund|cash/i},
  {name: 'Good month', question: 'What should I do with extra income in a good month?', answers: base, terms: /extra|month|save|debt|fund/i, forbidden: /\d+\s+months?\s+of\s+good.month\s+money/i},
  {name: 'Missing income', question: 'Make me a budget.', answers: {...base, incomeHistory: []}, noModel: true, terms: /take-home pay/i},
];

let failed = 0;
for (const s of scenarios) {
  const {profile} = normalizeProfile(s.answers);
  try {
    const r = await chat({personaId: 'debt-free-coach', agentId: 'budget', messages: [{role: 'user', content: s.question}], profile});
    const checks = {
      live: r.mode === 'live', enoughOptions: s.noModel || r.validation?.kept >= 3,
      numberChecked: s.noModel || r.validation?.replyVerified === true,
      relevant: s.terms.test(r.text), calculationMeaning: !s.forbidden?.test(r.text),
      sourced: s.noModel || r.citations?.some(c => c.url?.startsWith('https://')),
    };
    if (Object.values(checks).some(v => !v)) failed++;
    console.log(JSON.stringify({scenario: s.name, checks, answer: r.text, citations: r.citations?.map(c => c.url)}));
  } catch (e) { failed++; console.error(JSON.stringify({scenario: s.name, error: e.message})); }
}
console.log(`Live evaluation: ${scenarios.length - failed}/${scenarios.length} passed automated checks. Review answers for advice quality.`);
if (failed) process.exitCode = 1;
