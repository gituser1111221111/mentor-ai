import {MAX_OPTIONS} from './options.js';
// Code-side checks between the model steps. The model never gets the final word on a number.
import {allowedNumbers, normMoney, unitFor} from './tools.js';

const NUMBER = /(?<![\w.])[-−–]?\$?\s?(?:\d[\d,]*(?:\.\d+)?|\.\d+)(?:[a-z]+|\s+(?:thousand|million|billion|trillion)\b)?(?:\s?(?:%|percent(?:age)?\b))?/gi;
const DATE = /\b\d{4}-\d{1,2}(?:-\d{1,2})?\b/g;
const WORD_AMOUNT = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|lakh|crore)(?:[ -]+(?:and|a|point|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion|half|quarter|lakh|crore))*\s+(?:dollars?|cents?|percent|months?|years?|weeks?|days?)\b/gi;

// Values and units are checked before any pronunciation conversion. Unsupported notation fails closed.
export function unverifiedNumbers(text, calcs) {
  const {money, ints, percents} = allowedNumbers(calcs);
  const bad = [], value = String(text);
  bad.push(...(value.match(/\d[\d,.]*\.\d+\.\d+/g) || []), ...(value.match(DATE) || []), ...(value.match(WORD_AMOUNT) || []));
  const withoutDates = value.replace(DATE, ' ');
  const duration = {month:new Set(),year:new Set(),week:new Set(),day:new Set()};
  const percentCadence = {month:new Set(),year:new Set(),week:new Set(),day:new Set()};
  const cadence = {month:new Set(),year:new Set(),week:new Set(),day:new Set()};
  const walk = (obj) => {
    for (const [key,v] of Object.entries(obj || {})) {
      if (v && typeof v === 'object') {walk(v);continue;}
      if (/aprPercent|annual.*(?:Percent|Pct)/i.test(key)) percentCadence.year.add(Number(v));
      for (const unit of Object.keys(duration)) {
        if (/^\d+$/.test(String(v)) && new RegExp(`^${unit}s$|^${unit}sOf|^${unit}$`, 'i').test(key)) duration[unit].add(Number(v));
        if (/^-?\d+\.\d{2}$/.test(String(v)) && new RegExp(unit+'|'+({month:'monthly',year:'annual',week:'weekly',day:'daily'}[unit]),'i').test(key)) cadence[unit].add(normMoney(v));
      }
    }
  };
  calcs.forEach(c=>{walk(c.inputs);walk(c.result);});
  for (const match of withoutDates.matchAll(NUMBER)) {
    const m = match[0].trim(), after = withoutDates.slice(match.index + match[0].length);
    const parsed=m.match(/^([-−–]?)\$?\s?((?:\d[\d,]*|)(?:\.\d+)?)(?:\s?(%|percent(?:age)?))?$/i);
    if (!parsed) {bad.push(m);continue;}
    const [,sign,number,percent]=parsed;
    // Commas must be thousands separators, not a silently corrected decimal/grouping error.
    if (number.includes(',') && !/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(number)) {bad.push(m);continue;}
    const raw=(sign ? '-' : '')+number.replace(/,/g,'');
    const n=Number(raw), period=after.match(/^\s*(?:\/|per\s+|a\s+|each\s+|every\s+)?(monthly|yearly|annually|weekly|daily|paychecks?|months?|mo|years?|yr|weeks?|wk|days?)\b/i);
    const unit=period ? ({mo:'month',yr:'year',wk:'week',monthly:'month',yearly:'year',annually:'year',weekly:'week',daily:'day'}[period[1].toLowerCase()] || period[1].toLowerCase().replace(/s$/,'')) : null;
    const durationOnly = unit && !m.includes('$') && /^\s*(?:months?|years?|weeks?|days?)\b/.test(period[0]);
    if (percent) {if (m.includes('$') || !percents.has(n) || (unit && !percentCadence[unit]?.has(n))) bad.push(m);}
    else if (durationOnly) {if (!Number.isInteger(n) || !duration[unit]?.has(n)) bad.push(m+' '+period[0].trim());}
    else if (m.includes('$') || number.includes(',') || number.includes('.')) {
      if (!/^-?(?:\d+)?(?:\.\d{1,2})?$/.test(raw) || !money.has(normMoney(raw.startsWith('-.') ? raw.replace('-.','-0.') : raw.startsWith('.') ? '0'+raw : raw))) bad.push(m);
      else if (unit && /^\s*(?:months?|years?|weeks?|days?)\b/.test(period[0])) bad.push(m+' '+period[0].trim());
      else if (unit && !cadence[unit]?.has(normMoney(raw))) bad.push(m+' '+period[0].trim());
    } else if (unit) {if (!duration[unit]?.has(n)) bad.push(m+' '+period[0].trim());}
    else if (!ints.has(n) && !money.has(normMoney(raw))) bad.push(m);
  }
  // Bind explicit snapshot claims to their own field, not merely to any coincidentally equal value.
  const fields = {'savings':['savings'], 'total debt':['debtTotal'], 'debt total':['debtTotal'], 'essentials':['essentials','essentialsTotal'], 'lowest month':['lowestMonth'], 'average month':['averageMonth']};
  for (const [label, keys] of Object.entries(fields)) {
    const values = new Set();
    for (const c of calcs) {
      for (const key of keys) if (c.result?.[key] !== undefined) values.add(normMoney(c.result[key]));
      if (label === 'savings' && c.name === 'emergency_fund' && c.inputs?.current !== undefined) values.add(normMoney(c.inputs.current));
    }
    const claim = new RegExp(`\\b(?:your\\s+)?${label}\\s+(?:is|are|was|were|equals?)\\s+([-−]?\\$?\\d[\\d,]*(?:\\.\\d{1,2})?)(?![\\d,]|\\.\\d)`, 'gi');
    for (const m of value.matchAll(claim)) if (!values.has(normMoney(m[1].replace('−','-')))) bad.push(m[0]);
  }
  return [...new Set(bad)];
}

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

// raw: [{title, summary, calcIds, tradeoffs, risk, timeToGoalMonths}] from the generator.
// Returns { candidates (with ids c1..cN and attached calculations), dropped: [{title, reason}] }
export function validateCandidates(raw, library, {max = MAX_OPTIONS} = {}) {
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
    const months = Number.isInteger(r.timeToGoalMonths) && !unverifiedNumbers(`${r.timeToGoalMonths} months`, calcs).length ? r.timeToGoalMonths : null;
    kept.push({
      title, summary, tradeoffs: String(r.tradeoffs || '').slice(0, 300),
      risk: ['low', 'medium', 'high'].includes(r.risk) ? r.risk : 'medium', timeToGoal: months,
      calculations: calcs.map(({name, label, inputs, result}) => ({name, label, inputs, result, units: Object.fromEntries(Object.keys(result).map(k => [k, unitFor(k)]))})),
    });
    if (kept.length === max) break;
  }
  return {candidates: kept.map((c, i) => ({id: `c${i + 1}`, ...c})), dropped};
}
