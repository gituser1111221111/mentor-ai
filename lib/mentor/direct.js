// Direct answers: when the user asks for a figure the calc library already holds, put a code-built option
// that states it first, so the mentor answers the literal question instead of pivoting to a different plan.
// The option still goes through validate.js like any generated option.
const MINIMUMS_PAYOFF = /\bminimum/i;
const PAYOFF_TIME = /pay ?(?:it |them |everything |my debts? )?off|debt[- ]free|how long|how many months|clear (?:my|the|all)|get rid of/i;

// "Summarize this" / "give me an overview": a code-built summary of budget, cushion, debt and portfolio.
const SUMMARY = /^\s*(?:please\s+)?(?:summari[sz]e|sum (?:it|this|everything) up|(?:give me |what'?s )?(?:a |an |my )?(?:quick )?(?:summary|overview|recap))\b/i;
const usd = v => `$${Number(v).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
function summaryAnswer(library) {
  const s = library.calcs.find(c => c.id === 'snapshot')?.result;
  if (!s) return null;
  const parts = [`Your lowest month brings in ${usd(s.lowestMonth)} against ${usd(s.essentials)} of essentials, so ${Number(s.lowestMonthShortfall) > 0 ? `that month is ${usd(s.lowestMonthShortfall)} short` : `that month leaves ${usd(s.lowestMonthLeftover)}`}.`];
  const ids = ['snapshot'];
  const cushion = library.calcs.find(c => c.id === 'cash_cushion')?.result;
  if (cushion) { parts.push(`You have ${usd(cushion.savings)} saved toward a ${usd(cushion.cashCushionGoal)} cushion, ${Number(cushion.cashCushionGap) > 0 ? `${usd(cushion.cashCushionGap)} to go` : 'already reached'}.`); ids.push('cash_cushion'); }
  const debt = library.calcs.find(c => c.id === 'debt_minimums')?.result;
  if (debt) { parts.push(`Debt totals ${usd(debt.debtTotal)}, with minimum payments totaling ${usd(debt.debtMinimums)}${debt.snowball?.months ? `, about ${debt.snowball.months} months to clear on minimums alone` : ''}.`); ids.push('debt_minimums'); }
  const pf = library.calcs.find(c => c.id === 'portfolio_summary')?.result;
  if (pf) { parts.push(`Your portfolio is ${usd(pf.portfolioValue)} across ${pf.holdingsCount} holdings, the largest being ${pf.largestHolding} at ${usd(pf.largestHoldingValue)}.`); ids.push('portfolio_summary'); }
  return {title: 'Your money at a glance', summary: parts.join(' '), calcIds: ids, tradeoffs: 'A snapshot, not a plan: pick one area to work on next.', risk: 'low', timeToGoalMonths: null, direct: true};
}

export function directAnswer(question, library) {
  const q = String(question || '');
  if (SUMMARY.test(q)) return summaryAnswer(library);
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
