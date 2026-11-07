#!/usr/bin/env node
// Validates persona data: notes, core.md citations, sources.json counts, and evals.
// Usage: node scripts/check-persona.js [personaId]   (default: debt-free-coach)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = ["id", "title", "topics", "speaker", "source_title", "source_url", "source_date",
  "source_tier", "locator", "quote", "contested"];
const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿­]/;

export function parseNote(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (v.startsWith("\"") && v.endsWith("\"")) v = v.slice(1, -1);
    if (v.startsWith("[") && v.endsWith("]")) v = v.slice(1, -1).split(",").map(s => s.trim()).filter(Boolean);
    fields[line.slice(0, i).trim()] = v;
  }
  // The loader (lib/mentor/personas.js) reads a '# title' heading and a 'source:' line; they are not part of the summary.
  const summary = m[2].split("\n").filter(l => !/^#\s/.test(l) && !/^source:/i.test(l)).join("\n").trim();
  return { fields, summary };
}

const words = s => s.trim().split(/\s+/).filter(Boolean).length;
const sentences = s => s.split(/(?<=[.!?])\s+/).filter(x => x.trim()).length;
const urlsIn = s => (s.match(/https?:\/\/[^\s)"]+/g) || []).map(u => u.replace(/[.,]+$/, ""));

export function checkPersona(personaId = "debt-free-coach", root = ROOT) {
  const errors = [];
  const dir = join(root, "personas", personaId);
  const notesDir = join(dir, "notes");
  const sourcesPath = join(dir, "sources.json");
  const corePath = join(dir, "core.md");
  const evalPath = join(root, "evals", `${personaId}.json`);
  for (const p of [notesDir, sourcesPath, corePath]) if (!existsSync(p)) errors.push(`missing ${p}`);
  if (errors.length) return { errors, stats: {} };

  const sourcesDoc = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const sources = sourcesDoc.sources || [];
  const byUrl = new Map(sources.map(s => [s.url, s]));

  // ---- notes ----
  const notes = new Map();
  const citedBy = new Map(sources.map(s => [s.url, new Set()]));
  for (const file of readdirSync(notesDir).filter(f => f.endsWith(".md")).sort()) {
    const text = readFileSync(join(notesDir, file), "utf8");
    const where = `notes/${file}`;
    if (INVISIBLE.test(text)) errors.push(`${where}: contains invisible Unicode characters`);
    const parsed = parseNote(text);
    if (!parsed) { errors.push(`${where}: missing front matter`); continue; }
    const { fields: f, summary } = parsed;
    for (const k of REQUIRED) if (!(k in f)) errors.push(`${where}: missing field "${k}"`);
    for (const k of REQUIRED.filter(k => !["quote", "contested"].includes(k)))
      if (k in f && (f[k] === "" || (Array.isArray(f[k]) && !f[k].length))) errors.push(`${where}: empty field "${k}"`);
    if (!/^\d{3}$/.test(f.id || "")) errors.push(`${where}: id must be three digits`);
    if (!file.startsWith(`${f.id}-`)) errors.push(`${where}: filename must start with id ${f.id}-`);
    if (notes.has(f.id)) errors.push(`${where}: duplicate id ${f.id}`);
    if (f.speaker !== "Dave Ramsey") errors.push(`${where}: speaker is "${f.speaker}", must be "Dave Ramsey"`);
    const tier = Number(f.source_tier);
    if (![1, 2, 3].includes(tier)) errors.push(`${where}: source_tier must be 1-3 for a Ramsey-view note (got ${f.source_tier})`);
    const src = byUrl.get(f.source_url);
    if (!src) errors.push(`${where}: source_url not in sources.json: ${f.source_url}`);
    else {
      if (src.tier !== tier) errors.push(`${where}: tier ${tier} does not match sources.json tier ${src.tier}`);
      citedBy.get(src.url).add(f.id);
    }
    if (f.quote && words(f.quote) >= 15) errors.push(`${where}: quote has ${words(f.quote)} words (must be under 15)`);
    const n = sentences(summary);
    if (n < 2 || n > 5) errors.push(`${where}: summary has ${n} sentences (need 2 to 5)`);
    if (f.contested) {
      const urls = urlsIn(f.contested);
      if (!urls.length) errors.push(`${where}: contested field must cite a source URL`);
      for (const u of urls) {
        const s = byUrl.get(u);
        if (!s) errors.push(`${where}: contested URL not in sources.json: ${u}`);
        else { if (s.tier !== 4) errors.push(`${where}: contested source must be tier 4: ${u}`); citedBy.get(u).add(f.id); }
      }
    }
    notes.set(f.id, f);
  }

  // ---- sources.json ----
  const byType = {}, byTier = {};
  for (const s of sources) {
    for (const k of ["id", "url", "title", "date", "tier", "type", "note_ids"]) if (!(k in s)) errors.push(`sources.json ${s.id || s.url}: missing "${k}"`);
    if (!["article", "column", "transcript", "interview", "critique"].includes(s.type)) errors.push(`sources.json ${s.id}: bad type ${s.type}`);
    const actual = [...(citedBy.get(s.url) || [])].sort();
    const listed = [...(s.note_ids || [])].sort();
    if (!actual.length) errors.push(`sources.json ${s.id}: not cited by any note (do not count unused sources)`);
    if (JSON.stringify(actual) !== JSON.stringify(listed)) errors.push(`sources.json ${s.id}: note_ids ${listed} do not match notes citing it ${actual}`);
    byType[s.type] = (byType[s.type] || 0) + 1;
    byTier[String(s.tier)] = (byTier[String(s.tier)] || 0) + 1;
  }
  const sum = sourcesDoc.summary || {};
  if (sum.total_sources !== sources.length) errors.push(`sources.json summary.total_sources ${sum.total_sources} != ${sources.length}`);
  if (sum.note_count !== notes.size) errors.push(`sources.json summary.note_count ${sum.note_count} != ${notes.size} note files`);
  if (JSON.stringify(sortObj(sum.by_type)) !== JSON.stringify(sortObj(byType))) errors.push(`sources.json summary.by_type ${JSON.stringify(sum.by_type)} != ${JSON.stringify(byType)}`);
  if (JSON.stringify(sortObj(sum.by_tier)) !== JSON.stringify(sortObj(byTier))) errors.push(`sources.json summary.by_tier ${JSON.stringify(sum.by_tier)} != ${JSON.stringify(byTier)}`);

  // ---- core.md ----
  const core = readFileSync(corePath, "utf8");
  if (INVISIBLE.test(core)) errors.push("core.md: contains invisible Unicode characters");
  if (/\bI am Dave Ramsey\b|\bI'm Dave Ramsey\b/i.test(core)) errors.push("core.md: must not claim to be Dave Ramsey");
  const citeRe = /\(notes? (\d{3}(?:,\s*\d{3})*)\)/g;
  for (const m of core.matchAll(citeRe))
    for (const id of m[1].split(/,\s*/)) if (!notes.has(id)) errors.push(`core.md: cites missing note ${id}`);
  const beliefs = core.split(/^## /m).find(s => s.startsWith("Beliefs")) || "";
  if (!beliefs) errors.push("core.md: missing '## Beliefs' section");
  for (const line of beliefs.split("\n").filter(l => l.startsWith("- ")))
    if (!/\(notes? \d{3}/.test(line)) errors.push(`core.md: belief without a note citation: ${line.slice(0, 70)}`);
  if (!/never supplies? (a )?(return|number)|never states? an investment return/i.test(core)) errors.push("core.md: must state that the persona never supplies return numbers");

  // ---- evals ----
  let evalCount = 0;
  if (existsSync(evalPath)) {
    const ev = JSON.parse(readFileSync(evalPath, "utf8"));
    evalCount = (ev.questions || []).length;
    if (evalCount < 25 || evalCount > 30) errors.push(`evals: ${evalCount} questions (need 25 to 30)`);
    for (const q of ev.questions || []) {
      if (!q.question || !q.expected_stance || !(q.note_ids || []).length) errors.push(`evals ${q.id}: needs question, expected_stance, note_ids`);
      for (const id of q.note_ids || []) if (!notes.has(id)) errors.push(`evals ${q.id}: cites missing note ${id}`);
    }
  } else errors.push(`missing ${evalPath}`);

  return { errors, stats: { notes: notes.size, sources: sources.length, byType, byTier, evals: evalCount } };
}

function sortObj(o = {}) { return Object.fromEntries(Object.entries(o).sort()); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, stats } = checkPersona(process.argv[2]);
  if (errors.length) {
    console.error(`persona:check FAILED with ${errors.length} problem(s):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log(`persona:check OK. ${stats.notes} notes, ${stats.sources} sources ${JSON.stringify(stats.byType)}, tiers ${JSON.stringify(stats.byTier)}, ${stats.evals} eval questions.`);
}
