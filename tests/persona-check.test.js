import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPersona } from "../scripts/check-persona.js";

test("debt-free-coach persona data passes all checks", () => {
  const { errors, stats } = checkPersona("debt-free-coach");
  assert.deepEqual(errors, []);
  assert.ok(stats.notes >= 40 && stats.notes <= 60, `note count ${stats.notes}`);
});
