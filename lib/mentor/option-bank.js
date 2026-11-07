// Documented option ideas for a mentor (config/option-banks/<personaId>.json), e.g. the 40 Ramsey moves
// drawn from "Dave Ramsey Deep Research.md". The coach may turn relevant ideas into options; the
// validator still rejects any number not backed by a calculation.
import fs from 'node:fs';
const cache = new Map();
export function optionBank(personaId) {
  if (cache.has(personaId)) return cache.get(personaId);
  let ideas = [];
  try { ideas = JSON.parse(fs.readFileSync(new URL(`../../config/option-banks/${personaId}.json`, import.meta.url), 'utf8')).ideas || []; } catch {}
  cache.set(personaId, ideas);
  return ideas;
}
