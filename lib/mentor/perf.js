// Response timing on a monotonic clock (performance.now), with configurable targets.
// Targets flag slow responses; they never cut off a calculation or mark advice as verified early.
import {performance} from 'node:perf_hooks';

const num = (k, d) => { const n = Number(process.env[k]); return Number.isFinite(n) && n > 0 ? n : d; };
export const TARGETS = {
  firstVerifiedMs: num('MENTOR_TARGET_FIRST_MS', 5000),   // first verified recommendation
  preferredMs: num('MENTOR_TARGET_PREFERRED_MS', 8000),   // preferred complete response
  thresholdMs: num('MENTOR_TARGET_THRESHOLD_MS', 10000),  // flagged as slow beyond this
};

export function startTimer(label = 'request') {
  const t0 = performance.now();
  const stages = {};
  const open = new Map();
  return {
    start(name) { open.set(name, performance.now()); },
    end(name) { const s = open.get(name); if (s !== undefined) { stages[name] = round(performance.now() - s); open.delete(name); } return stages[name]; },
    async time(name, fn) { this.start(name); try { return await fn(); } finally { this.end(name); } },
    mark(name) { stages[name] = round(performance.now() - t0); },
    elapsed: () => round(performance.now() - t0),
    finish(extra = {}) {
      const totalMs = round(performance.now() - t0);
      const firstVerified = stages.firstVerifiedMs ?? null;
      return {label, totalMs, stages: {...stages}, flags: {
        firstVerifiedWithinTarget: firstVerified !== null ? firstVerified <= TARGETS.firstVerifiedMs : null,
        withinPreferred: totalMs <= TARGETS.preferredMs,
        overThreshold: totalMs > TARGETS.thresholdMs,
      }, ...extra};
    },
  };
}
const round = ms => Math.round(ms * 10) / 10;

// Rolling samples for development stats (average, median, P90, P95). In-memory only.
const samples = [];
export function record(timing) {
  samples.push(timing);
  if (samples.length > 500) samples.shift();
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const s = Object.entries(timing.stages).map(([k, v]) => `${k}=${v}ms`).join(' ');
    console.log(`[perf] ${timing.label} total=${timing.totalMs}ms ${s}${timing.flags.overThreshold ? ' OVER_THRESHOLD' : ''}`);
  }
  if (timing.flags.overThreshold) console.warn(`[perf] ${timing.label} exceeded ${TARGETS.thresholdMs}ms (${timing.totalMs}ms)`);
}
export function percentile(values, p) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const i = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[i];
}
export function summarize(values) {
  if (!values.length) return {count: 0};
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return {count: values.length, avg: round(avg), median: percentile(values, 50), p90: percentile(values, 90), p95: percentile(values, 95),
    min: Math.min(...values), max: Math.max(...values),
    within5s: share(values, 5000), within8s: share(values, 8000), within10s: share(values, 10000)};
}
const share = (values, ms) => Math.round((values.filter(v => v <= ms).length / values.length) * 1000) / 10;
export function stats() {
  const by = {};
  for (const s of samples) {
    (by[s.label] ||= {total: [], firstVerified: [], stages: {}}).total.push(s.totalMs);
    if (s.stages.firstVerifiedMs != null) by[s.label].firstVerified.push(s.stages.firstVerifiedMs);
    for (const [k, v] of Object.entries(s.stages)) (by[s.label].stages[k] ||= []).push(v);
  }
  return Object.fromEntries(Object.entries(by).map(([label, d]) => [label, {
    total: summarize(d.total), firstVerified: summarize(d.firstVerified),
    stages: Object.fromEntries(Object.entries(d.stages).map(([k, v]) => [k, summarize(v)])),
  }]));
}
export const resetStats = () => { samples.length = 0; };
