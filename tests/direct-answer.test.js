// A literal "how long on minimums" question gets the minimums-only payoff the Debt plan shows,
// as a code-built option that passes the same number validation as generated options.
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.MARKET_LIVE = '0';
const {demoWorkspace} = await import('../lib/workspace-demo.js');
const {calcLibrary} = await import('../lib/mentor/tools.js');
const {directAnswer} = await import('../lib/mentor/direct.js');
const {validateCandidates} = await import('../lib/mentor/validate.js');

const library = calcLibrary(demoWorkspace().profile, '');

test('minimums payoff question gets a verified direct answer matching the Debt plan', () => {
  const r = directAnswer('How long will it take to pay off my debts with my current minimum payments?', library);
  assert.ok(r);
  assert.match(r.summary, /27 months/);
  assert.match(r.summary, /\$2,257\.38/);
  const {candidates, dropped} = validateCandidates([r], library);
  assert.equal(candidates.length, 1, JSON.stringify(dropped));
  assert.equal(candidates[0].timeToGoal, 27);
});

test('other questions get no direct answer', () => {
  assert.equal(directAnswer('How should I budget when my pay changes?', library), null);
  assert.equal(directAnswer('Should I pay extra on my credit card?', library), null);
});
