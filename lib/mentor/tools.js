// Calculation library: every number the model may use comes from here (exact cents, lib/finance.js).
// The generator references calcs by id; validate.js rejects any money figure not found in them.
import {generateCandidates} from './chat.mock.js';

// Returns { snapshot, calcs: [{id, name, label, inputs, result}] }
export function calcLibrary(profile) {
  const {snap, candidates} = generateCandidates(profile);
  if (snap.status !== 'ok') return {snapshot: snap, calcs: []};
  const calcs = [{id: 'snapshot', name: 'variable_income_snapshot', label: 'Income vs essentials', inputs: {months: snap.months}, result: {
    lowestMonth: snap.lowestMonth, highestMonth: snap.highestMonth, averageMonth: snap.averageMonth, swing: snap.swing,
    essentials: snap.essentialsTotal, fixedBills: snap.fixedBillsTotal, everydaySpending: snap.expensesTotal, debtMinimums: snap.debtMinimumsTotal,
    lowestMonthShortfall: snap.lowestMonthShortfall, lowestMonthLeftover: snap.lowestMonthLeftover,
    averageMonthLeftover: snap.averageMonthLeftover, savings: snap.savings, debtTotal: snap.debtTotal,
  }}];
  // The user's own debt facts (balances, APRs, minimums) are quotable too.
  if (profile.debts?.length) calcs[0].result.debts = profile.debts.map(d => ({name: d.name, balance: d.balance, aprPercent: (d.rateBps / 100).toFixed(2), minPayment: d.minPayment}));
  for (const c of candidates) {
    const calc = c.calculations.at(-1);
    if (!calc || calc.name === 'variable_income_snapshot') continue;
    calcs.push({id: c.id, name: calc.name, label: c.title, inputs: calc.inputs, result: calc.result});
  }
  return {snapshot: snap, calcs};
}

// All numbers that appear anywhere in a set of calcs, normalized for comparison.
export function allowedNumbers(calcs) {
  const money = new Set(), ints = new Set();
  const walk = v => {
    if (v === null || v === undefined) return;
    if (typeof v === 'object') return Object.values(v).forEach(walk);
    const s = String(v);
    if (/^-?\d+\.\d{2}$/.test(s)) money.add(normMoney(s));
    else if (/^-?\d+$/.test(s)) ints.add(Number(s));
  };
  calcs.forEach(c => { walk(c.inputs); walk(c.result); });
  return {money, ints};
}

export const normMoney = s => {
  const n = String(s).replace(/[$,\s]/g, '');
  const [w, f = ''] = n.split('.');
  return `${BigInt(w || '0')}.${(f + '00').slice(0, 2)}`;
};
