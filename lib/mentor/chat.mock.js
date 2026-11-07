// MOCK of the Section A contract (docs/BUILD_PLAN.md). Section B builds against this until
// lib/mentor/chat.js exists. Numbers are computed in code from the profile (exact cents);
// candidate generation and persona picking are rule-based stand-ins for the Claude calls.
// Every response carries mode:"mock" so the UI never presents it as a live model answer.
import {randomUUID} from 'node:crypto';
import {minor, amount, divideRound} from '../finance.js';
import {snapshot} from '../profile.js';

const DISCLOSURE = 'Educational opinion, not advice from a licensed financial adviser, CPA, or attorney. Persona inspired by public teachings; not affiliated or endorsed.';
const turns = new Map(); // turnId -> {candidates, profile, snap}

// Month-by-month payoff with extra payment rolled to the first debt in `order`. Integer cents.
export function payoff(debts, extraCents, order = 'snowball') {
  let list = debts.map(d => ({name: d.name, bal: minor(d.balance), rate: BigInt(d.rateBps || 0), min: minor(d.minPayment)}));
  list.sort(order === 'avalanche' ? (a, b) => Number(b.rate - a.rate) : (a, b) => (a.bal < b.bal ? -1 : a.bal > b.bal ? 1 : 0));
  const budget = list.reduce((t, d) => t + d.min, 0n) + extraCents;
  let month = 0, interest = 0n; const paidOff = [];
  while (list.some(d => d.bal > 0n) && month < 600) {
    month++;
    let left = budget;
    for (const d of list) if (d.bal > 0n) { const i = divideRound(d.bal * d.rate, 120000n); d.bal += i; interest += i; }
    for (const d of list) if (d.bal > 0n) { const pay = d.min < d.bal ? d.min : d.bal; d.bal -= pay; left -= pay; }
    for (const d of list) if (d.bal > 0n && left > 0n) { const pay = left < d.bal ? left : d.bal; d.bal -= pay; left -= pay; }
    for (const d of list) if (d.bal === 0n && !paidOff.find(p => p.name === d.name)) paidOff.push({name: d.name, month});
  }
  return {months: month, totalInterest: amount(interest), order: paidOff, capped: month >= 600};
}

const pctOf = (cents, pct) => divideRound(cents * BigInt(pct), 100n);
const clampPos = c => (c > 0n ? c : 0n);

export function generateCandidates(profile) {
  const s = snapshot(profile);
  if (s.status !== 'ok') return {snap: s, candidates: [{id: 'need-info', title: 'Tell me your income first', summary: 'I need your take-home pay for the last few months before I can plan around your lowest month.', calculations: [], tradeoffs: 'No plan until we have numbers.', risk: 'none', timeToGoal: null, tags: ['need_info']}]};
  const low = minor(s.lowestMonth), avg = minor(s.averageMonth), ess = minor(s.essentialsTotal);
  const savings = minor(s.savings), short = minor(s.lowestMonthShortfall);
  const extraAvg = clampPos(avg - ess), extraLow = clampPos(low - ess);
  const debts = profile.debts || [];
  const calc = (name, inputs, result) => ({name, inputs, result});
  const snapCalc = calc('variable_income_snapshot', {months: s.months}, {lowestMonth: s.lowestMonth, averageMonth: s.averageMonth, essentials: s.essentialsTotal, lowestMonthShortfall: s.lowestMonthShortfall});
  const c = [];
  const add = (id, title, summary, calcs, tradeoffs, risk, timeToGoal, tags) => c.push({id, title, summary, calculations: [snapCalc, ...calcs], tradeoffs, risk, timeToGoal, tags});

  add('floor-budget', 'Budget from your lowest month', `Plan every month as if you only earn ${s.lowestMonth}. Anything above that goes to a "next month" buffer first.`,
    [calc('floor_budget', {floor: s.lowestMonth, essentials: s.essentialsTotal}, {leftoverInLowMonth: amount(extraLow), shortfallInLowMonth: s.lowestMonthShortfall})],
    'Very safe, but slower progress on goals.', 'low', null, ['safety', 'budget']);

  const starterTarget = 100000n; // $1,000 starter fund
  const efGap = clampPos(starterTarget - savings);
  const efMonths = extraAvg > 0n ? Number(divideRound(efGap + extraAvg - 1n, extraAvg)) : null;
  add('starter-ef', 'Build a $1,000 starter emergency fund first', `Put all money above essentials into savings until you have $1,000.00. You need ${amount(efGap)} more.`,
    [calc('emergency_fund', {target: '1000.00', current: s.savings, averageMonthLeftover: amount(extraAvg)}, {gap: amount(efGap), months: efMonths})],
    'Protects you from one bad month; debt waits a little.', 'low', efMonths, ['emergency_fund', 'debt_free']);

  const fullTarget = ess * 3n;
  const fullGap = clampPos(fullTarget - savings);
  add('full-ef', 'Save 3 months of essentials', `Target ${amount(fullTarget)} (3 × ${s.essentialsTotal}). Gap: ${amount(fullGap)}.`,
    [calc('emergency_fund', {monthsOfEssentials: 3, target: amount(fullTarget), current: s.savings, averageMonthLeftover: amount(extraAvg)}, {gap: amount(fullGap), months: extraAvg > 0n ? Number(divideRound(fullGap + extraAvg - 1n, extraAvg)) : null})],
    'Strongest cushion for swinging income; slowest on debt.', 'low', null, ['emergency_fund', 'safety']);

  if (debts.length) {
    const snow = payoff(debts, extraAvg, 'snowball');
    add('snowball', 'Debt snowball with every extra dollar', `Pay minimums on everything, then throw ${amount(extraAvg)}/mo (your average extra) at the smallest balance.`,
      [calc('debt_snowball', {debts: debts.map(d => d.name), extraMonthly: amount(extraAvg)}, snow)],
      'Fast wins and momentum; ignores interest rate order.', 'medium', snow.months, ['debt', 'debt_free']);
    const aval = payoff(debts, extraAvg, 'avalanche');
    add('avalanche', 'Debt avalanche (highest rate first)', `Same ${amount(extraAvg)}/mo extra, aimed at the highest interest rate first.`,
      [calc('debt_avalanche', {debts: debts.map(d => d.name), extraMonthly: amount(extraAvg)}, aval)],
      'Least interest paid; first payoff can take longer.', 'medium', aval.months, ['debt', 'math']);
    const half = pctOf(extraAvg, 50);
    const sweep = payoff(debts, half, 'snowball');
    add('split-sweep', 'High months: half to debt, half to savings', `Each month above your floor, split the extra: ${amount(half)} to debt, ${amount(extraAvg - half)} to savings.`,
      [calc('debt_snowball', {extraMonthly: amount(half)}, sweep)],
      'Balanced; neither goal moves at full speed.', 'low', sweep.months, ['balanced']);
  }

  const gap = short + 20000n;
  add('raise-floor', 'Raise your lowest month with extra income', `Add about ${amount(gap)}/mo in your slow months (extra shifts, a second gig) so the lowest month covers essentials plus $200.00.`,
    [calc('income_gap', {lowestMonth: s.lowestMonth, essentials: s.essentialsTotal, cushion: '200.00'}, {extraIncomeNeeded: amount(gap)})],
    'Fixes the root problem; costs time and energy.', 'medium', null, ['income', 'hustle']);

  const needs = pctOf(avg, 50), wants = pctOf(avg, 30), save = avg - needs - wants;
  add('percent-split', '50/30/20 split of your average month', `Needs ${amount(needs)}, wants ${amount(wants)}, savings/debt ${amount(save)} (from your ${s.averageMonth} average).`,
    [calc('percent_split', {base: s.averageMonth, split: '50/30/20'}, {needs: amount(needs), wants: amount(wants), saveOrDebt: amount(save), essentialsFit: ess <= needs})],
    'Simple, but uses the average, so low months will pinch.', 'medium', null, ['simple']);

  const exp = profile.expenses || [];
  const trim = exp.reduce((t, e) => t + pctOf(minor(e.amount), 20), 0n);
  add('cut-list', 'Trim everyday spending 20%', `Cut food, gas and fun by 20% each, which frees ${amount(trim)}/mo.`,
    [calc('cut_list', {categories: exp.map(e => e.name), cutPct: 20}, {freedMonthly: amount(trim)})],
    'Fast and in your control; hard to sustain if cut too deep.', 'low', null, ['budget', 'frugal']);

  add('sinking-funds', 'Sinking funds for irregular bills', 'Set aside a small fixed amount each month for car repairs, gifts and annual fees so they stop wrecking low months.',
    [calc('sinking_fund', {annualIrregular: '600.00'}, {monthly: amount(divideRound(60000n, 12n))})],
    'Smooths surprises; needs discipline to not touch it.', 'low', null, ['budget', 'safety']);

  if (profile.portfolio?.marketValue) {
    add('pause-investing', 'Pause new investing until the floor is covered', `You hold ${profile.portfolio.marketValue} invested. Keep it, but stop adding until your lowest month covers essentials.`,
      [calc('portfolio_summary', {source: 'csv_upload'}, {marketValue: profile.portfolio.marketValue, estimatedAnnualFees: profile.portfolio.estimatedAnnualFees})],
      'Frees cash now; slows long-term growth.', 'medium', null, ['debt_free', 'safety']);
    add('keep-investing', 'Keep investing a small fixed amount', 'Keep a small automatic investment going even in low months so the habit sticks.',
      [calc('portfolio_summary', {source: 'csv_upload'}, {marketValue: profile.portfolio.marketValue})],
      'Builds the habit; less cash for debt or emergencies.', 'medium', null, ['growth', 'hustle']);
  }
  return {snap: s, candidates: c.slice(0, 12).map(x => ({...x, title: dollars(x.title), summary: dollars(x.summary)}))};
}

// Display only: "1780.00" / "$1000.00" -> "$1,780.00" / "$1,000.00". Values in calculations stay raw strings.
export const dollars = t => t.replace(/\$?((?:\d{1,3},)*\d+)\.(\d{2})(?!\s*(?:[\d%]|percent\b|percentage\b))/gi, (_, w, f) => `$${w.replace(/,/g, '').replace(/\B(?=(\d{3})+$)/g, ',')}.${f}`);

// Stand-in for the persona picker: an ordered preference list per persona.
const PREFS = {
  'debt-free-coach': (p, ids) => (minor(p.savings || '0') < 100000n ? 'starter-ef' : ids.includes('snowball') ? 'snowball' : 'floor-budget'),
  'conscious-spender': (p, ids) => (ids.includes('avalanche') ? 'avalanche' : 'cut-list'),
  'value-investor': (p, ids) => first(ids, 'avalanche', 'full-ef', 'keep-investing'),
  'asset-builder': (p, ids) => first(ids, 'raise-floor', 'split-sweep', 'keep-investing'),
  'disruptive-growth': (p, ids) => first(ids, 'keep-investing', 'full-ef', 'raise-floor'),
  'credit-smart': (p, ids) => first(ids, 'avalanche', 'starter-ef', 'keep-investing'),
  'money-psychology': (p, ids) => first(ids, 'full-ef', 'sinking-funds', 'floor-budget'),
  'real-estate-saver': (p, ids) => first(ids, 'cut-list', 'full-ef', 'keep-investing'),
  'money-basics': (p, ids) => first(ids, 'starter-ef', 'floor-budget', 'percent-split'),
  'step-by-step-planner': (p, ids) => first(ids, 'starter-ef', 'avalanche', 'full-ef'),
};
const first = (ids, ...want) => want.find(w => ids.includes(w)) || ids[0];
const mockCite = title => [{title, type: 'note', ref: 'persona notes (mock)'}];
const VOICE = {
  'debt-free-coach': {name: 'Dave Ramsey–inspired', why: 'Your income swings, so the first job is protecting yourself from the bad month. Then every extra dollar goes after debt, smallest first, so you get quick wins.', cite: [{title: 'Baby Step 1: starter emergency fund', type: 'note', ref: 'persona notes pending (mock)'}, {title: 'Debt snowball: smallest balance first', type: 'note', ref: 'persona notes pending (mock)'}]},
  'conscious-spender': {name: 'Ramit Sethi–inspired', why: 'Kill the high-interest debt first, then build a plan where you can spend guilt-free on what you love.', cite: [{title: 'Get rid of high-interest credit card debt', type: 'note', ref: 'persona notes (mock)'}]},
  'value-investor': {name: 'Warren Buffett–inspired', why: 'High-interest debt works against you every month. Clear it, keep a cash reserve so you are never forced to sell, then invest steadily for the long run.', cite: mockCite('Avoid credit card interest; keep cash on hand')},
  'asset-builder': {name: 'Robert Kiyosaki–inspired', why: 'Cutting has a floor. Build income that keeps coming in, and put money into things that pay you rather than things that cost you.', cite: mockCite('Assets put money in your pocket')},
  'disruptive-growth': {name: 'Cathie Wood–inspired', why: 'Long-term investing only works with money you will not need soon. Keep the habit going once your bills and cushion are covered.', cite: mockCite('Think in five-year horizons')},
  'credit-smart': {name: 'Vivian Tu–inspired', why: 'Card interest is the most expensive money you have. Pay it off, keep a cushion in savings, then start investing early.', cite: mockCite('Pay your card in full every month')},
  'money-psychology': {name: 'Morgan Housel–inspired', why: 'The best plan is the one with room for error. A bigger cushion beats a slightly better return when your income swings.', cite: mockCite('Leave room for error')},
  'real-estate-saver': {name: 'Graham Stephan–inspired', why: 'Your savings rate matters most. Cut what you do not value, build reserves, and invest early.', cite: mockCite('Keep fixed costs low and save the difference')},
  'money-basics': {name: 'Humphrey Yang–inspired', why: 'Start simple. A small emergency fund protects you in a low month, and that habit is the base for everything after.', cite: mockCite('An emergency fund comes first')},
  'step-by-step-planner': {name: 'Money Guy–inspired', why: 'Go in order. Cover a small emergency first, then high-interest debt, then build reserves.', cite: mockCite('Follow the financial order of operations')},
};

function pickFor(personaId, profile, candidates) {
  const ids = candidates.map(c => c.id);
  const want = (PREFS[personaId] || PREFS['debt-free-coach'])(profile, ids);
  const pickId = ids.includes(want) ? want : ids[0];
  const runnersUp = ids.filter(i => i !== pickId).slice(0, 2);
  const v = VOICE[personaId] || VOICE['debt-free-coach'];
  return {pick: {pickId, runnersUp, rationale: v.why, whyNotOthers: `Considered ${ids.length} options; ${runnersUp.join(' and ')} were close.`}, voice: v};
}

function respond(turnId, personaId, profile, snap, candidates) {
  const {pick, voice} = pickFor(personaId, profile, candidates);
  const chosen = candidates.find(c => c.id === pick.pickId);
  const lead = snap.status === 'ok'
    ? `Your lowest month was ${snap.lowestMonth} and your essentials are ${snap.essentialsTotal}. ` : '';
  return {
    mode: 'mock', personaId, personaName: voice.name,
    text: dollars(`${lead}${chosen.title}. ${chosen.summary} ${pick.rationale}`),
    citations: voice.cite, calculations: chosen.calculations, memoryUpdates: [],
    handoff: null, disclosure: DISCLOSURE, turnId, candidates, pick,
  };
}

export async function chat({personaId = 'debt-free-coach', agentId = 'budget', messages = [], profile = {}, memory = [], tier = 'free'} = {}) {
  if (!['budget', 'debt', 'savings'].includes(agentId)) return {mode: 'mock', text: 'That coach is coming soon.', citations: [], calculations: [], memoryUpdates: [], handoff: {agentId: 'budget', reason: 'Only the Budget Coach is live'}, disclosure: DISCLOSURE, turnId: null, candidates: [], pick: null};
  const {snap, candidates} = generateCandidates(profile);
  const turnId = randomUUID();
  turns.set(turnId, {profile, snap, candidates});
  if (turns.size > 500) turns.delete(turns.keys().next().value);
  return respond(turnId, personaId, profile, snap, candidates);
}

export async function repick({turnId, personaId}) {
  const t = turns.get(turnId);
  if (!t) throw Error('Unknown turn; ask the question again');
  return respond(turnId, personaId, t.profile, t.snap, t.candidates);
}

export const getTurn = turnId => turns.get(turnId);
export const restoreTurn = (turnId, turn) => turns.set(turnId, turn);
