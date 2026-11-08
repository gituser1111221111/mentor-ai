// Direct answers: when the user asks for a figure the calc library already holds, put a code-built option
// that states it first, so the mentor answers the literal question instead of pivoting to a different plan.
// The option still goes through validate.js like any generated option.
const MINIMUMS_PAYOFF = /\bminimum/i;
const PAYOFF_TIME = /pay ?(?:it |them |everything |my debts? )?off|debt[- ]free|how long|how many months|clear (?:my|the|all)|get rid of/i;

export function directAnswer(question, library) {
  const q = String(question || '');
  if (!(MINIMUMS_PAYOFF.test(q) && PAYOFF_TIME.test(q))) return null;
  const calc = library.calcs.find(c => c.id === 'debt_minimums');
  const s = calc?.result?.snowball;
  if (!s?.months) return null;
  const order = (s.paidOff || []).slice(0, -1).map(p => `the ${p.name.toLowerCase()} clears in month ${p.month}`);
  const last = (s.paidOff || []).at(-1);
  return {
    title: `Minimums only: debt-free in ${s.months} months`,
    summary: `Paying only your current minimums ($${calc.result.debtMinimums} total), with each paid-off minimum rolled to the next debt, you would be debt-free in ${s.months} months and pay $${Number(s.totalInterest).toLocaleString('en-US', {minimumFractionDigits: 2})} in interest.${order.length ? ` Along the way ${order.join(' and ')}.${last ? ` The ${last.name.toLowerCase()} is paid off last.` : ''}` : ''}`,
    calcIds: ['debt_minimums'],
    tradeoffs: 'Minimums alone take the longest and cost the most interest; any extra payment shortens the timeline.',
    risk: 'low',
    timeToGoalMonths: s.months,
    direct: true,
  };
}
