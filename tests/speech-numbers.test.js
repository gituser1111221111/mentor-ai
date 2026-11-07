// Spoken forms of financial numbers sent to ElevenLabs. Deterministic: same input, same words, every time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {speakableText as say, integerWords, dollarWords} from '../lib/speech-numbers.js';

// The amounts the voice was confusing. Each must say a different scale word.
const REQUIRED = [
  ['$100', 'one hundred dollars'],
  ['$1,000', 'one thousand dollars'],
  ['$10,000', 'ten thousand dollars'],
  ['$100,000', 'one hundred thousand dollars'],
  ['$1,000,000', 'one million dollars'],
  ['$125,450.75', 'one hundred twenty-five thousand four hundred fifty dollars and seventy-five cents'],
];
test('the six required amounts are spoken unambiguously', () => {
  for (const [input, spoken] of REQUIRED) assert.equal(say(input), spoken, input);
  const all = REQUIRED.map(([i]) => say(i));
  assert.equal(new Set(all).size, all.length);
  assert.notEqual(say('$100'), say('$100,000'));
  assert.ok(!say('$100').includes('thousand'));
});

const CASES = [
  // dollars and cents
  ['$1', 'one dollar'],
  ['$1.00', 'one dollar'],
  ['$0.01', 'one cent'],
  ['$0.50', 'fifty cents'],
  ['$.99', 'ninety-nine cents'],
  ['$1.05', 'one dollar and five cents'],
  ['$1.5', 'one dollar and fifty cents'],
  ['$45.00', 'forty-five dollars'],
  ['$725', 'seven hundred twenty-five dollars'],
  ['$1,340.00', 'one thousand three hundred forty dollars'],
  ['$9,800.00', 'nine thousand eight hundred dollars'],
  ['$2410', 'two thousand four hundred ten dollars'],
  ['$1,001', 'one thousand one dollars'],
  ['$1,010,010.10', 'one million ten thousand ten dollars and ten cents'],
  ['$999,999.99', 'nine hundred ninety-nine thousand nine hundred ninety-nine dollars and ninety-nine cents'],
  ['$0.005', 'zero point zero zero five dollars'],
  ['75¢', 'seventy-five cents'],
  // large numbers and shorthand scales
  ['$1,000,000,000', 'one billion dollars'],
  ['$1,000,000,000,000', 'one trillion dollars'],
  ['$1.2 million', 'one point two million dollars'],
  ['$2.5M', 'two point five million dollars'],
  ['$10k', 'ten thousand dollars'],
  ['$3B', 'three billion dollars'],
  ['10k', 'ten thousand'],
  // negative balances
  ['-$250.00', 'negative two hundred fifty dollars'],
  ['$-1,340.00', 'negative one thousand three hundred forty dollars'],
  ['−$80', 'negative eighty dollars'],
  ['a balance of -45', 'a balance of negative forty-five'],
  // percentages and decimals
  ['24.9%', 'twenty-four point nine percent'],
  ['24.99% APR', 'twenty-four point nine nine percent APR'],
  ['7.90%', 'seven point nine percent'],
  ['0.5%', 'zero point five percent'],
  ['-3.5%', 'negative three point five percent'],
  ['100%', 'one hundred percent'],
  ['12 percent', 'twelve percent'],
  ['24.09%', 'twenty-four point zero nine percent'],
  ['7.9', 'seven point nine'],
  ['1,340.50', 'one thousand three hundred forty point five'],
  // rates, ranges and context
  ['$45/mo', 'forty-five dollars per month'],
  ['$3,333.33/mo', 'three thousand three hundred thirty-three dollars and thirty-three cents per month'],
  ['$52,000/yr', 'fifty-two thousand dollars per year'],
  ['$1,000+', 'one thousand dollars or more'],
  ['~$500', 'about five hundred dollars'],
  ['+$200', 'plus two hundred dollars'],
  ['$100-$200', 'one hundred dollars to two hundred dollars'],
  ['3-6 months', 'three to six months'],
  ['15-20%', 'fifteen to twenty percent'],
  ['3x', 'three times'],
  ['50/30/20 rule', 'fifty thirty twenty rule'],
  ['12 months', 'twelve months'],
  // dates, ordinals and named accounts
  ['on the 1st', 'on the first'],
  ['by the 22nd', 'by the twenty-second'],
  ['2026-08-15', 'August fifteenth twenty twenty-six'],
  ['in 2026', 'in twenty twenty-six'],
  ['by 2030', 'by twenty thirty'],
  ['at 10:30 am', 'at ten thirty A M'],
  ['your 401(k)', 'your four oh one k'],
  ['a 529 plan', 'a five twenty-nine plan'],
  ['a 1099 job', 'a ten ninety-nine job'],
];
test(`${CASES.length} financial number formats`, () => {
  assert.ok(CASES.length >= 40);
  for (const [input, spoken] of CASES) assert.equal(say(input), spoken, input);
});

test('whole sentences keep their words and punctuation; only the numbers change', () => {
  assert.equal(say('Your lowest month was $1,780.00, so plan on that. Pay $45.00 on the card at 24.9% APR.'),
    'Your lowest month was one thousand seven hundred eighty dollars, so plan on that. Pay forty-five dollars on the card at twenty-four point nine percent APR.');
  assert.equal(say('Save $100. Then $100,000 is a later goal.'), 'Save one hundred dollars. Then one hundred thousand dollars is a later goal.');
  assert.equal(say('No numbers here, just a plan.'), 'No numbers here, just a plan.');
  assert.equal(say(''), '');
  assert.equal(say(undefined), '');
});

test('every digit of the value survives: no rounding, even past the safe-integer limit', () => {
  assert.equal(integerWords('9007199254740993'), 'nine quadrillion seven trillion one hundred ninety-nine billion two hundred fifty-four million seven hundred forty thousand nine hundred ninety-three');
  assert.equal(dollarWords('125,450.75'), 'one hundred twenty-five thousand four hundred fifty dollars and seventy-five cents');
  assert.equal(integerWords('1234567890123456789012'), 'one two three four five six seven eight nine zero one two three four five six seven eight nine zero one two'); // too big for scale words: read digit by digit
});

test('deterministic and fast enough for live voice', () => {
  const reply = 'Your lowest month was $1,780.00 and rent is $725.00. Put $45.00/mo on the 24.9% card, keep $420.00 saved, and aim for $1,000 by 2027-03-01. The car loan is $9,800.00 at 7.9%.';
  const first = say(reply);
  const runs = 2000, t0 = performance.now();
  for (let i = 0; i < runs; i++) assert.equal(say(reply), first);
  const perCall = (performance.now() - t0) / runs;
  assert.ok(perCall < 1, `${perCall.toFixed(3)} ms per reply`); // ElevenLabs itself takes hundreds of ms
  assert.ok(!/\d/.test(first), first);
});
