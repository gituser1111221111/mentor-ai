// Quiz answers -> validated profile + money snapshot. All math in integer cents (lib/finance.js).
import {minor, amount, divideRound} from './finance.js';

const money = (v, field, errors) => {
  if (v === undefined || v === null || v === '') return null;
  try {
    const value = String(v).trim().replace(/^\$\s*/, '');
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value)) throw Error('Ambiguous money format');
    return minor(value.replace(/,/g, ''));
  }
  catch { errors.push({field, error: 'Enter a dollar amount like 725 or 725.50'}); return null; }
};
const text = (v, max = 60) => typeof v === 'string' ? v.trim().slice(0, max) : '';

// Returns { profile, missing, errors }. profile money fields are USD decimal strings.
export function normalizeProfile(input = {}) {
  const errors = [], missing = [];
  const p = {name: text(input.name, 40) || undefined, incomeVaries: input.incomeVaries !== false};

  const history = Array.isArray(input.incomeHistory) ? input.incomeHistory : [];
  p.incomeHistory = [];
  history.slice(0, 12).forEach((m, i) => {
    const c = money(m?.amount, `incomeHistory[${i}]`, errors);
    if (c !== null) p.incomeHistory.push({month: text(m.month, 7) || `m${i + 1}`, amount: amount(c)});
  });
  if (!p.incomeHistory.length) missing.push('incomeHistory');

  const rows = (list, key, cols) => (Array.isArray(list) ? list : []).slice(0, 25).flatMap((r, i) => {
    const out = {name: text(r?.name) || `${key} ${i + 1}`};
    for (const [col, kind] of cols) {
      if (kind === 'money') { const c = money(r?.[col], `${key}[${i}].${col}`, errors); if (c === null) return []; out[col] = amount(c); }
      if (kind === 'day') { const d = Number(r?.[col]); if (Number.isInteger(d) && d >= 1 && d <= 31) out[col] = d; }
      if (kind === 'bps') {
        // accept aprPercent ("7.9") or rateBps (790)
        if (r?.rateBps === undefined && r?.aprPercent !== undefined && !/^\d+(?:\.\d{1,2})?%?$/.test(String(r.aprPercent).trim())) { errors.push({field:`${key}[${i}].rate`, error:'Use an APR with at most two decimal places.'}); return []; }
        const raw = r?.rateBps ?? (r?.aprPercent !== undefined ? Math.round(Number(String(r.aprPercent).replace('%', '')) * 100) : undefined);
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > 10000) { errors.push({field: `${key}[${i}].rate`, error: 'APR must be between 0% and 100%'}); return []; }
        out.rateBps = n;
      }
    }
    return [out];
  });
  p.bills = rows(input.bills, 'bills', [['amount', 'money'], ['dueDay', 'day']]);
  p.expenses = rows(input.expenses, 'expenses', [['amount', 'money']]);
  p.debts = rows(input.debts, 'debts', [['balance', 'money'], ['rate', 'bps'], ['minPayment', 'money']]);

  const s = money(input.savings, 'savings', errors);
  p.savings = amount(s ?? 0n);
  if (s === null) missing.push('savings');
  p.goals = (Array.isArray(input.goals) ? input.goals : []).map(g => text(g, 40)).filter(Boolean).slice(0, 3);
  p.incomeSources = (Array.isArray(input.incomeSources) ? input.incomeSources : []).map(g => text(g, 30)).filter(Boolean);
  p.trust = typeof input.trust === 'object' && input.trust ? {
    priorAdvisor: text(input.trust.priorAdvisor, 20) || undefined,
    aiTrust: Number.isInteger(input.trust.aiTrust) ? Math.min(5, Math.max(1, input.trust.aiTrust)) : undefined,
    needs: Array.isArray(input.trust.needs) ? input.trust.needs.map(n => text(n, 30)) : [],
  } : {};
  p.personaHint = text(input.personaHint, 40) || 'debt-free-coach';
  p.retirementPct = Number.isInteger(input.retirementPct) ? input.retirementPct : 0;
  if (input.portfolio && typeof input.portfolio === 'object') p.portfolio = input.portfolio; // already summarized by lib/portfolio.js
  if (p.incomeHistory.length) {
    const total = p.incomeHistory.reduce((t, m) => t + minor(m.amount), 0n);
    p.incomeMonthly = amount(divideRound(total, BigInt(p.incomeHistory.length)));
  }
  return {profile: p, missing, errors};
}

const sum = (list, key) => list.reduce((t, r) => t + minor(r[key]), 0n);

// The "aha" card shown after the quiz. Pure code, no model.
export function snapshot(profile) {
  const bills = sum(profile.bills || [], 'amount');
  const expenses = sum(profile.expenses || [], 'amount');
  const debtMins = sum(profile.debts || [], 'minPayment');
  const essentials = bills + expenses + debtMins;
  const base = {
    fixedBillsTotal: amount(bills), expensesTotal: amount(expenses), debtMinimumsTotal: amount(debtMins),
    essentialsTotal: amount(essentials), savings: profile.savings || '0.00',
    debtTotal: amount(sum(profile.debts || [], 'balance')),
    portfolioValue: profile.portfolio?.marketValue ?? null,
  };
  const months = (profile.incomeHistory || []).map(m => minor(m.amount));
  if (!months.length) return {status: 'need_income', ...base, message: 'We need your take-home pay for recent months to plan.'};
  const low = months.reduce((a, b) => (b < a ? b : a));
  const high = months.reduce((a, b) => (b > a ? b : a));
  const avg = divideRound(months.reduce((a, b) => a + b, 0n), BigInt(months.length));
  const lowGap = low - essentials;
  return {
    status: 'ok', ...base, months: months.length,
    lowestMonth: amount(low), highestMonth: amount(high), averageMonth: amount(avg), swing: amount(high - low),
    lowestMonthShortfall: amount(lowGap < 0n ? -lowGap : 0n),
    lowestMonthLeftover: amount(lowGap > 0n ? lowGap : 0n),
    averageMonthLeftover: amount(avg - essentials > 0n ? avg - essentials : 0n),
    averageMonthShortfall: amount(essentials - avg > 0n ? essentials - avg : 0n),
    assumptions: [
      `Based on ${months.length} month(s) of take-home pay you entered.`,
      'Essentials = fixed bills + everyday spending + debt minimum payments.',
      'Average is rounded to the nearest cent. No taxes or pay changes are forecast.',
    ],
  };
}
