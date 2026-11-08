// Calculation library: every number the model may use comes from here (exact cents, lib/finance.js).
// The generator references calcs by id; validate.js rejects any money figure not found in them.
import {generateCandidates, payoff} from './chat.mock.js';
import {minor, amount} from '../finance.js';

// Returns { snapshot, calcs: [{id, name, label, inputs, result}] }
export function calcLibrary(profile, question = '') {
  const {snap, candidates} = generateCandidates(profile);
  if (snap.status !== 'ok') return {snapshot: snap, calcs: []};
  const calcs = [{id: 'snapshot', name: 'variable_income_snapshot', label: 'Income vs essentials', inputs: {months: snap.months}, result: {
    lowestMonth: snap.lowestMonth, highestMonth: snap.highestMonth, averageMonth: snap.averageMonth, swing: snap.swing,
    essentials: snap.essentialsTotal, fixedBills: snap.fixedBillsTotal, everydaySpending: snap.expensesTotal, debtMinimums: snap.debtMinimumsTotal,
    lowestMonthShortfall: snap.lowestMonthShortfall, lowestMonthLeftover: snap.lowestMonthLeftover,
    averageMonthLeftover: snap.averageMonthLeftover, savings: snap.savings, debtTotal: snap.debtTotal,
  }}];
  // A user-stated dollar amount may be repeated back, but is labeled as their input.
  // This never authorizes the model to calculate with it or claim it was verified.
  const stated = [...String(question).matchAll(/\$([\d,]+)(?:\.(\d{1,2}))?(?![\d.])/g)]
    .map(([, whole, cents = '']) => `${BigInt(whole.replace(/,/g, ''))}.${(cents + '00').slice(0, 2)}`)
    .slice(0, 5);
  if (stated.length) calcs[0].result.userStatedAmounts = stated;
  // The user's own debt facts (balances, APRs, minimums) are quotable too.
  if (profile.debts?.length) calcs[0].result.debts = profile.debts.map(d => ({name: d.name, balance: d.balance, aprPercent: (d.rateBps / 100).toFixed(2), minPayment: d.minPayment}));
  // The cash cushion goal the user saved in the Budget workspace, and the gap to it, computed in exact cents.
  // A separate calc so the snapshot baseline that expand() compares against is unchanged.
  if (/^\d+\.\d{2}$/.test(profile.cashCushion || '')) {
    const goal = minor(profile.cashCushion), saved = minor(snap.savings || '0.00');
    calcs.push({id: 'cash_cushion', name: 'cash_cushion_goal', label: 'Your saved cash cushion goal', inputs: {savings: snap.savings, goal: profile.cashCushion},
      result: {cashCushionGoal: profile.cashCushion, savings: snap.savings, cashCushionGap: amount(goal > saved ? goal - saved : 0n)}});
  }
  for (const c of candidates) {
    const calc = c.calculations.at(-1);
    if (!calc || calc.name === 'variable_income_snapshot') continue;
    calcs.push({id: c.id, name: calc.name, label: c.title, inputs: calc.inputs, result: calc.result});
  }
  // Minimum-payments-only payoff (freed minimums roll over), the same figure the dashboard's Debt plan shows.
  if (profile.debts?.length) {
    const fmt = r => ({months: r.capped ? null : r.months, totalInterest: r.totalInterest, paidOff: r.order.map(o => ({name: o.name, month: o.month}))});
    const snow = payoff(profile.debts, 0n, 'snowball'), aval = payoff(profile.debts, 0n, 'avalanche');
    calcs.push({id: 'debt_minimums', name: 'debt_payoff_minimums_only', label: 'Debt payoff on current minimums only', inputs: {extraPerMonth: '0.00'},
      result: {snowball: fmt(snow), avalanche: fmt(aval), debtTotal: snap.debtTotal, debtMinimums: snap.debtMinimumsTotal}});
  }
  // Portfolio at a glance, from imported values (exact cents). Lets a general summary cover holdings too.
  const held = (profile.portfolio?.securities || []).filter(h => /^\d+(\.\d{1,2})?$/.test(String(h.value)));
  if (held.length) {
    const top = [...held].sort((a, b) => (minor(String(b.value)) > minor(String(a.value)) ? 1 : -1))[0];
    const total = held.reduce((t, h) => t + minor(String(h.value)), 0n);
    calcs.push({id: 'portfolio_summary', name: 'portfolio_at_a_glance', label: 'Your imported portfolio', inputs: {source: 'imported values'},
      result: {portfolioValue: amount(total), holdingsCount: held.length, largestHolding: String(top.name), largestHoldingValue: amount(minor(String(top.value)))}});
  }
  return {snapshot: snap, calcs};
}

// All numbers that appear anywhere in a set of calcs, normalized for comparison.
export function allowedNumbers(calcs) {
  const money = new Set(), ints = new Set(), percents = new Set(), dates = new Set();
  const walk = (v, key = '') => {
    if (v === null || v === undefined || ['userStatedAmounts','name','source'].includes(key)) return;
    if (typeof v === 'object') return Object.entries(v).forEach(([k, value]) => walk(value, k));
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return void dates.add(s);
    if (/percent|pct/i.test(key) && /^-?\d+(?:\.\d+)?$/.test(s)) { percents.add(Number(s)); if (s.startsWith('-')) percents.add(Number(s.slice(1))); }
    else if (key === 'split' && /^\d+(?:\/\d+)+$/.test(s)) s.split('/').forEach(n => ints.add(Number(n)));
    else if (/^-?\d+\.\d{2}$/.test(s)) money.add(normMoney(s));
    else if (/^-?\d+$/.test(s)) ints.add(Number(s));
  };
  calcs.forEach(c => { walk(c.inputs); walk(c.result); });
  return {money, ints, percents, dates};
}

export const unitFor = key => /percent|pct|apr/i.test(key) ? 'percent' : /^(months|years|monthsOfEssentials|.*Count|.*Months|.*Years)$/i.test(key) ? 'count' : 'money';

export const normMoney = s => {
  const n = String(s).replace(/[$,\s]/g, '');
  const [w, f = ''] = n.split('.');
  const negative = w.startsWith('-');
  return `${negative ? '-' : ''}${BigInt((negative ? w.slice(1) : w) || '0')}.${(f + '00').slice(0, 2)}`;
};
