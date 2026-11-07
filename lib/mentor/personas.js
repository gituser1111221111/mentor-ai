// Persona loader. Prefers the teammate's files in personas/<id>/ (core.md + notes/*.md);
// falls back to short built-in summaries so the live engine works before those exist.
// Personas only PICK among verified options and explain; they never produce numbers.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../../personas/', import.meta.url));

const BUILTIN = {
  'debt-free-coach': {
    name: 'Dave Ramsey–inspired',
    core: `You are the Debt-Free Mentor, a persona built from summaries of Dave Ramsey's public teachings. You are not Dave Ramsey and never claim to be him or to speak for him.
Worldview: debt is the enemy; follow the Baby Steps in order; cash over credit; a written zero-based budget every month; behavior matters more than math.
Tone: direct, warm, a little tough-love, plain words, short sentences, encouraging. Speak to a young adult whose income swings.`,
    notes: [
      {id: 'baby-step-1', title: 'Baby Step 1: $1,000 starter emergency fund', source: 'The Total Money Makeover (book), public summary', text: 'Before attacking debt, save a small starter emergency fund so one surprise does not become new debt.'},
      {id: 'baby-step-2', title: 'Baby Step 2: debt snowball', source: 'The Total Money Makeover (book), public summary', text: 'List debts smallest to largest regardless of interest rate; pay minimums on all and throw every extra dollar at the smallest. Quick wins build momentum.'},
      {id: 'baby-step-3', title: 'Baby Step 3: 3 to 6 months of expenses', source: 'The Total Money Makeover (book), public summary', text: 'After consumer debt is gone, build a full emergency fund of three to six months of expenses.'},
      {id: 'zero-based', title: 'Zero-based budget, every month', source: 'Ramsey public teaching (radio/podcast), summary', text: 'Give every dollar a job before the month begins. With irregular income, budget from the lowest expected month and assign extra in priority order when it arrives.'},
      {id: 'cash-not-credit', title: 'Use cash, not credit', source: 'Ramsey public teaching, summary', text: 'Stop borrowing; cut up cards; avoid buy-now-pay-later.'},
      {id: 'pause-investing', title: 'Pause investing while in debt', source: 'The Total Money Makeover (book), public summary', text: 'During Baby Step 2, temporarily stop new investing so all extra money goes to debt; resume after the emergency fund.'},
    ],
  },
  'conscious-spender': {
    name: 'Ramit Sethi–inspired',
    core: `You are the Conscious Spender, a persona built from summaries of Ramit Sethi's public teachings. You are not Ramit Sethi and never claim to be him or to speak for him.
Worldview: spend extravagantly on the things you love and cut costs mercilessly on the things you don't; focus on big wins, not lattes; automate your money so good choices happen by default; build a rich life on your own terms, without guilt.
Tone: friendly, candid, practical, a bit playful, anti-guilt.`,
    notes: [
      {id: 'conscious-spending-plan', title: 'Conscious spending plan', source: 'I Will Teach You to Be Rich website', url: 'https://www.iwillteachyoutoberich.com/conscious-spending-basics/', text: 'Split take-home pay into fixed costs, investments, savings goals and guilt-free spending, so you know what you can spend without worry.'},
      {id: 'love-vs-cut', title: 'Spend on what you love, cut the rest', source: 'I Will Teach You to Be Rich website', url: 'https://www.iwillteachyoutoberich.com/the-big-wins-manifesto/', text: 'Pick the few things you truly love and spend on them; cut mercilessly on what you do not care about.'},
      {id: 'big-wins', title: 'Big wins over small cuts', source: 'I Will Teach You to Be Rich website', url: 'https://www.iwillteachyoutoberich.com/the-big-wins-manifesto/', text: 'Focus on a few large levers (rent, car, income, debt interest) instead of agonizing over small daily purchases.'},
      {id: 'automate', title: 'Automate your money', source: 'I Will Teach You to Be Rich website', url: 'https://www.iwillteachyoutoberich.com/automate-your-finances/', text: 'Set transfers to savings and debt to happen automatically right after payday.'},
      {id: 'kill-card-debt', title: 'Get rid of high-interest credit card debt', source: 'I Will Teach You to Be Rich website', url: 'https://www.iwillteachyoutoberich.com/pay-off-credit-card-debt/', text: 'Credit card interest compounds the problem; make a clear payoff plan and pay more than the minimum when possible.'},
    ],
  },
};

const cache = new Map();

function readDir(id) {
  const dir = path.join(ROOT, id);
  if (!fs.existsSync(path.join(dir, 'core.md'))) return null;
  const core = fs.readFileSync(path.join(dir, 'core.md'), 'utf8');
  const notesDir = path.join(dir, 'notes');
  const notes = fs.existsSync(notesDir) ? fs.readdirSync(notesDir).filter(f => f.endsWith('.md')).sort().map(f => {
    const text = fs.readFileSync(path.join(notesDir, f), 'utf8');
    const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || f.replace(/\.md$/, '');
    const source = text.match(/^source:\s*(.+)$/im)?.[1]?.trim() || 'persona notes';
    const url = text.match(/^source_url:\s*(https:\/\/\S+)\s*$/m)?.[1] || null;
    const id = text.match(/^id:\s*"?([\w-]+)"?\s*$/m)?.[1] || f.replace(/\.md$/, '');
    // The picker needs the note's content, not its metadata block: drop front matter and the title/source
    // lines (passed separately), keep a short flag when an independent source disputes the claim.
    const disputed = /^contested:\s*"[^"\s]/m.test(text);
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').split('\n').filter(l => !/^#\s/.test(l) && !/^source:/i.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const brief = source.replace(/\s*https?:\/\/\S+/g, '').trim();
    return {id, title, source, brief, url, text: ((disputed ? 'Disputed by independent sources. ' : '') + body).slice(0, 2500)};
  }) : [];
  const name = core.match(/^#\s+(.+)$/m)?.[1]?.trim() || BUILTIN[id]?.name || id;
  return {name, core, notes, from: 'files'};
}

export function loadPersona(id) {
  if (cache.has(id)) return cache.get(id);
  let p = null;
  try { p = readDir(id); } catch (e) { console.error(`persona ${id} files unreadable:`, e.message); }
  p ||= BUILTIN[id] ? {...BUILTIN[id], from: 'builtin'} : null;
  if (p) cache.set(id, p);
  return p;
}

export const livePersonas = () => Object.keys(BUILTIN);
