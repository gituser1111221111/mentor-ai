import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { checkPersona } from "../scripts/check-persona.js";

const catalog = JSON.parse(readFileSync(new URL("../config/catalog.json", import.meta.url), "utf8"));
const built = readdirSync(new URL("../personas/", import.meta.url), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

test("debt-free-coach persona data passes all checks", () => {
  const { errors, stats } = checkPersona("debt-free-coach");
  assert.deepEqual(errors, []);
  assert.ok(stats.notes >= 40 && stats.notes <= 60, `note count ${stats.notes}`);
});

test("every persona folder is in the catalog and passes the checker", () => {
  const ids = new Set(catalog.personas.map(p => p.id));
  for (const id of built) {
    assert.ok(ids.has(id), `personas/${id} is not in config/catalog.json`);
    const { errors, stats } = checkPersona(id);
    assert.deepEqual(errors, [], `${id}: ${errors.slice(0, 5).join("; ")}`);
    // Fully researched mentors need 25+ notes. Mentors whose primary sources were blocked or thin are
    // marked researchDepth "limited" in sources.json and need 10+ (team decision, Nov 7).
    const depth = JSON.parse(readFileSync(new URL(`../personas/${id}/sources.json`, import.meta.url), "utf8")).researchDepth || "full";
    const min = depth === "limited" ? 10 : 25;
    assert.ok(stats.notes >= min, `${id}: only ${stats.notes} notes (needs ${min} for ${depth} research)`);
  }
});
