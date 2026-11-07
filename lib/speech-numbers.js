// Deterministic number-to-words for text-to-speech only.
// It rewrites how amounts are SAID. It never changes a value, never rounds, and is never applied to
// stored, displayed or calculated text. Input is the already-verified reply. Output goes only to ElevenLabs.
// Every rewrite keeps every digit of the original value: "$125,450.75" becomes
// "one hundred twenty-five thousand four hundred fifty dollars and seventy-five cents".

// Bump when the spoken rules change, so cached audio made under older rules is not replayed.
export const NUMBER_WORDS_VERSION = 1;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion'];
const ORD = {one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth'};

function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100, out = [];
  if (h) out.push(ONES[h], 'hundred');
  if (r >= 20) out.push(TENS[Math.floor(r / 10)] + (r % 10 ? '-' + ONES[r % 10] : ''));
  else if (r || !h) out.push(ONES[r]);
  return out.join(' ');
}

// Whole number given as a digit string (any length up to quadrillions). Uses BigInt so nothing rounds.
export function integerWords(digits) {
  const s = String(digits).replace(/^0+(?=\d)/, '');
  if (!/^\d+$/.test(s)) throw new Error(`not a whole number: ${digits}`);
  if (s.length > 18) return s.split('').map(d => ONES[d]).join(' '); // beyond quadrillions, read each digit
  let n = BigInt(s);
  if (n === 0n) return 'zero';
  const parts = [];
  for (let i = 0; n > 0n; i++, n /= 1000n) {
    const chunk = Number(n % 1000n);
    if (chunk) parts.unshift(under1000(chunk) + (SCALES[i] ? ' ' + SCALES[i] : ''));
  }
  return parts.join(' ');
}

// "24.9" -> "twenty-four point nine". Fraction digits are read one by one, as written,
// so "24.09" and "24.9" never sound the same.
export function decimalWords(text) {
  const [i, f] = String(text).replace(/,/g, '').split('.');
  const whole = integerWords(i || '0');
  return f ? `${whole} point ${f.split('').map(d => ONES[d]).join(' ')}` : whole;
}

export function ordinalWords(digits) {
  const w = integerWords(digits);
  const m = w.match(/^(.*?)([a-z]+)$/);
  const last = m[2];
  const ord = ORD[last] || (last.endsWith('y') ? last.slice(0, -1) + 'ieth' : last + 'th');
  return m[1] + ord;
}

const MULT = {k: 'thousand', thousand: 'thousand', m: 'million', mm: 'million', mil: 'million', million: 'million',
  b: 'billion', bn: 'billion', billion: 'billion', t: 'trillion', tn: 'trillion', trillion: 'trillion'};
const PER = {mo: 'month', month: 'month', yr: 'year', year: 'year', y: 'year', wk: 'week', week: 'week', hr: 'hour', hour: 'hour', day: 'day', paycheck: 'paycheck'};

// A dollar amount (digits with optional commas and cents) plus optional scale word.
// "1,000" -> "one thousand dollars", "0.50" -> "fifty cents", "1.05" -> "one dollar and five cents",
// "1.5" + "million" -> "one point five million dollars".
export function dollarWords(num, scale) {
  const clean = num.replace(/,/g, '');
  if (scale) return `${decimalWords(clean)} ${MULT[scale.toLowerCase()]} dollars`;
  let [d, c = ''] = clean.split('.');
  d ||= '0';
  if (c.length > 2) return `${decimalWords(clean)} dollars`; // fractions of a cent: read as written
  if (c.length === 1) c += '0'; // "$1.5" is one dollar and fifty cents
  const cents = c ? Number(c) : 0;
  const dollars = BigInt(d);
  const dPart = dollars === 0n ? '' : `${integerWords(d)} ${dollars === 1n ? 'dollar' : 'dollars'}`;
  const cPart = cents ? `${integerWords(String(cents))} ${cents === 1 ? 'cent' : 'cents'}` : '';
  if (dPart && cPart) return `${dPart} and ${cPart}`;
  return dPart || cPart || 'zero dollars';
}

// Financial terms with digits that are names, not quantities.
const TERMS = [
  [/\b401\s?\(?k\)?(?![\w])/gi, 'four oh one k'],
  [/\b403\s?\(?b\)?(?![\w])/gi, 'four oh three b'],
  [/\b457\s?\(?b\)?(?![\w])/gi, 'four fifty-seven b'],
  [/\b529(?=\s+(?:plan|account|savings))/gi, 'five twenty-nine'],
  [/\b1099(?=\b|-)/g, 'ten ninety-nine'],
  [/\bW-?2\b/g, 'W two'],
  [/\b24\/7\b/g, 'twenty-four seven'],
];
const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

const NUM = '\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?|\\.\\d+';
const SCALE = '(?:\\s?(?:thousand|million|billion|trillion)\\b|(?:k|K|mm|MM|M|bn|B|tn|T)(?![A-Za-z]))';
const PERIOD = '\\s?\\/\\s?(mo|month|yr|year|wk|week|hr|hour|day|paycheck)\\b';
const MINUS = '[-\\u2212\\u2013]';

const CURRENCY = new RegExp(
  `(~|\\babout\\s|\\+)?(${MINUS})?\\$\\s?(${MINUS})?(${NUM})(${SCALE})?(\\+)?(?:${PERIOD})?`, 'g');
const CENTS_SIGN = new RegExp(`(${MINUS})?(\\d+)\\s?\\u00a2`, 'g');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ISO_DATE = /\b((?:19|20)\d{2})-(0?[1-9]|1[0-2])(?:-(0?[1-9]|[12]\d|3[01]))?\b/g;
const CLOCK = /\b([01]?\d|2[0-3]):([0-5]\d)\s?(am|pm|a\.m\.|p\.m\.)?(?![\w])/gi;
const RANGE_DASH = /(\$\s?[\d.,]+(?:\s?(?:k|K|M|B|thousand|million|billion))?)\s?[-–—]\s?(?=\$?\d)/g;
const NUM_RANGE = /(?<![\w.,$])(\d+(?:\.\d+)?)\s?[-–]\s?(\d+(?:\.\d+)?)(?=\s?(?:%|percent|months?|years?|weeks?|days?|times|x\b|paychecks?))/g;
const PERCENT = new RegExp(`(?<![\\w.])(${MINUS})?(${NUM})\\s?(%|percent\\b)`, 'g');
const ORDINAL = /\b(\d+)(st|nd|rd|th)\b/g;
const TIMES = /(?<![\w.])(\d+(?:\.\d+)?)x(?![\w])/g;
const YEAR = new RegExp(`((?:${MONTH}\\.?\\s+(?:\\d{1,2},?\\s+)?|\\b(?:in|by|since|until|of|year)\\s+))(19\\d{2}|20\\d{2})\\b`, 'g');
const RATIO = /(?<![\w.,$])(\d{1,3})\/(\d{1,3})(?:\/(\d{1,3}))?(?![\w/])/g;
const SIGNED = new RegExp(`(?<![\\w.,])(${MINUS})(${NUM})(?![\\w])`, 'g');
const PLAIN = new RegExp(`(?<![\\w.,])(${NUM})(${SCALE})?(?![\\w])`, 'g');

function yearWords(y) {
  const n = Number(y);
  if (n >= 2000 && n <= 2009) return integerWords(y);
  const hi = integerWords(y.slice(0, 2)), lo = Number(y.slice(2));
  return lo === 0 ? `${hi} hundred` : `${hi} ${lo < 10 ? 'oh ' : ''}${integerWords(String(lo))}`;
}
const trimZeros = n => (n.includes('.') ? n.replace(/\.?0+$/, '') : n);

// The function the TTS path calls. Pure, synchronous, no I/O.
export function speakableText(input) {
  let t = String(input ?? '');
  if (!/\d/.test(t)) return t; // nothing to do, the common case for short conversational replies
  for (const [re, said] of TERMS) t = t.replace(re, said);
  t = t.replace(ISO_DATE, (_m, y, mo, d) => `${MONTHS[Number(mo) - 1]} ${d ? ordinalWords(String(Number(d))) + ' ' : ''}${yearWords(y)}`);
  t = t.replace(CLOCK, (_m, h, mi, ap) => `${integerWords(h)}${mi === '00' ? (ap ? '' : " o'clock") : ' ' + (mi[0] === '0' ? 'oh ' + ONES[mi[1]] : integerWords(mi))}${ap ? ' ' + ap.replace(/\./g, '').toUpperCase().split('').join(' ') : ''}`);
  t = t.replace(RANGE_DASH, '$1 to ');
  t = t.replace(NUM_RANGE, '$1 to $2');
  t = t.replace(CURRENCY, (_m, approx, neg1, neg2, num, scale, plus, per) => {
    const sign = neg1 || neg2 ? 'negative ' : approx === '+' ? 'plus ' : '';
    const pre = approx && approx !== '+' ? 'about ' : '';
    const words = dollarWords(num, scale?.trim());
    return `${pre}${sign}${words}${plus ? ' or more' : ''}${per ? ` per ${PER[per.toLowerCase()]}` : ''}`;
  });
  t = t.replace(CENTS_SIGN, (_m, neg, n) => `${neg ? 'negative ' : ''}${integerWords(n)} ${n === '1' ? 'cent' : 'cents'}`);
  t = t.replace(PERCENT, (_m, neg, num) => `${neg ? 'negative ' : ''}${decimalWords(trimZeros(num.replace(/,/g, '')))} percent`);
  t = t.replace(YEAR, (_m, pre, y) => pre + yearWords(y));
  t = t.replace(ORDINAL, (_m, n) => ordinalWords(n));
  t = t.replace(TIMES, (_m, n) => `${decimalWords(n)} times`);
  t = t.replace(RATIO, (_m, a, b, c) => [a, b, c].filter(Boolean).map(integerWords).join(' '));
  t = t.replace(SIGNED, (_m, _neg, num) => `negative ${decimalWords(num)}`);
  t = t.replace(PLAIN, (_m, num, scale) => decimalWords(trimZeros(num)) + (scale ? ' ' + MULT[scale.trim().toLowerCase()] : ''));
  return t.replace(/[ \t]{2,}/g, ' ');
}
