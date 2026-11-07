// Code-side checks between the model steps. The model never gets the final word on a number.
import {allowedNumbers, normMoney} from './tools.js';

const MONEY = /\$\s?\d[\d,]*(?:\.\d{1,2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b|\b\d+\.\d{2}\b/g;
const MONTHS = /\b(\d+)\s*(?:more\s+)?months?\b/gi;

// Returns the list of numbers in `text` that don't appear in `calcs`. Empty list = verified.
export function unverifiedNumbers(text, calcs) {
  const {money, ints} = allowedNumbers(calcs);
  const bad = [];
  for (const m of String(text).match(MONEY) || []) {
    const n = normMoney(m);
    if (!money.has(n) && !(n.endsWith('.00') && ints.has(Number(n.slice(0, -3))))) bad.push(m.trim());
  }
  for (const [, n] of String(text).matchAll(MONTHS)) if (!ints.has(Number(n))) bad.push(`${n} months`);
  return bad;
}

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// raw: [{title, summary, calcIds, tradeoffs, risk, timeToGoalMonths}] from the generator.
// Returns { candidates (with ids c1..cN and attached calculations), dropped: [{title, reason}] }
export function validateCandidates(raw, library, {max = 12} = {}) {
  const byId = new Map(library.calcs.map(c => [c.id, c]));
  const snapshotCalc = byId.get('snapshot');
  const kept = [], dropped = [], seen = new Set();
  for (const r of Array.isArray(raw) ? raw : []) {
    const title = String(r?.title || '').slice(0, 120), summary = String(r?.summary || '').slice(0, 600);
    if (!title || !summary) { dropped.push({title: title || '(untitled)', reason: 'missing title or summary'}); continue; }
    const ids = [...new Set((r.calcIds || []).filter(id => byId.has(id) && id !== 'snapshot'))];
    const unknown = (r.calcIds || []).filter(id => !byId.has(id));
    if (unknown.length) { dropped.push({title, reason: `referenced unknown calculation ${unknown.join(', ')}`}); continue; }
    const calcs = [snapshotCalc, ...ids.map(id => byId.get(id))].filter(Boolean);
    const bad = unverifiedNumbers(`${title} ${summary} ${r.tradeoffs || ''}`, calcs);
    if (bad.length) { dropped.push({title, reason: `numbers not backed by a calculation: ${bad.slice(0, 3).join(', ')}`}); continue; }
    const key = norm(title) + '|' + ids.sort().join(',');
    if (seen.has(key) || seen.has(norm(title))) { dropped.push({title, reason: 'duplicate'}); continue; }
    seen.add(key); seen.add(norm(title));
    const months = Number.isInteger(r.timeToGoalMonths) && allowedNumbers(calcs).ints.has(r.timeToGoalMonths) ? r.timeToGoalMonths : null;
    kept.push({
      title, summary, tradeoffs: String(r.tradeoffs || '').slice(0, 300),
      risk: ['low', 'medium', 'high'].includes(r.risk) ? r.risk : 'medium', timeToGoal: months,
      calculations: calcs.map(({name, label, inputs, result}) => ({name, label, inputs, result})),
    });
    if (kept.length === max) break;
  }
  return {candidates: kept.map((c, i) => ({id: `c${i + 1}`, ...c})), dropped};
}
