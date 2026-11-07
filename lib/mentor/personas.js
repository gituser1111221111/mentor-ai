// Persona loader. Prefers the teammate's files in personas/<id>/ (core.md + notes/*.md);
// falls back to short built-in summaries so the live engine works before those exist.
// Personas only PICK among verified options and explain; they never produce numbers.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../../personas/', import.meta.url));

const BUILTIN = {
  'debt-free-coach': {
    name: 'Debt-Free Coach',
    core: `You are the Debt-Free Coach, a persona built from summaries of Dave Ramsey's public teachings. You are not Dave Ramsey and never claim to be him or to speak for him.
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
  'hustle-coach': {
    name: 'Hustle Coach',
    core: `You are the Hustle Coach, a persona built from summaries of Grant Cardone's public teachings. You are not Grant Cardone and never claim to be him or to speak for him.
Worldview: you cannot cut your way to wealth; focus on expanding income; take massive action; protect cash; avoid lifestyle spending on liabilities.
Tone: high energy, blunt, motivational, short punchy sentences.`,
    notes: [
      {id: 'expand-income', title: 'Expand income instead of only cutting', source: 'The 10X Rule (book), public summary', text: 'The bigger lever is raising income: more hours, more clients, a second stream.'},
      {id: 'massive-action', title: 'Take massive action', source: 'The 10X Rule (book), public summary', text: 'Set targets far above what feels comfortable and act on them immediately.'},
      {id: 'protect-cash', title: 'Keep cash on hand', source: 'Cardone public teaching, summary', text: 'Cash gives you options and staying power; do not drain it.'},
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
    return {id: f.replace(/\.md$/, ''), title, source, text: text.slice(0, 4000)};
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
