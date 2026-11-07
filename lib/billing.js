// Stripe Checkout (TEST MODE ONLY) for the $4.99/month Plus plan. No webhooks: after Stripe
// redirects back, the server retrieves the Checkout Session and verifies it belongs to this
// browser session and is complete. Live keys are refused (prototype; no real money moves).
import {randomUUID} from 'node:crypto';
import {requestJSON} from './sources.js';

export const PLAN = {name: 'Plus', amountCents: 499, currency: 'usd', interval: 'month'};
const key = () => process.env.STRIPE_TEST_SECRET_KEY || '';
export const stripeConfigured = () => key().startsWith('sk_test_');

function stripe(path, {method = 'GET', form, fetcher = fetch} = {}) {
  if (!stripeConfigured()) throw Error('Stripe test key not configured');
  const headers = {Authorization: `Bearer ${key()}`};
  let body;
  if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; headers['Idempotency-Key'] = randomUUID(); body = new URLSearchParams(form); }
  return requestJSON('https://api.stripe.com/v1' + path, {method, headers, body}, fetcher);
}

// Returns { url } to redirect the browser to Stripe-hosted checkout.
export async function createCheckout(sessionId, origin, {fetcher} = {}) {
  const u = new URL(origin);
  if (!['http:', 'https:'].includes(u.protocol)) throw Error('Bad origin');
  const form = {
    mode: 'subscription',
    client_reference_id: sessionId,
    success_url: `${u.origin}/?checkout=success&cs={CHECKOUT_SESSION_ID}`,
    cancel_url: `${u.origin}/?checkout=cancel`,
    'line_items[0][quantity]': '1',
  };
  if (process.env.STRIPE_PRICE_ID) form['line_items[0][price]'] = process.env.STRIPE_PRICE_ID;
  else Object.assign(form, {
    'line_items[0][price_data][currency]': PLAN.currency,
    'line_items[0][price_data][unit_amount]': String(PLAN.amountCents),
    'line_items[0][price_data][recurring][interval]': PLAN.interval,
    'line_items[0][price_data][product_data][name]': 'Mentor Labs Plus (test-mode preview)',
  });
  const s = await stripe('/checkout/sessions', {method: 'POST', form, fetcher});
  return {url: s.url, id: s.id};
}

// Verifies a completed checkout for this browser session. Returns {ok, reason?}.
export async function confirmCheckout(sessionId, checkoutId, {fetcher} = {}) {
  if (!/^cs_test_[A-Za-z0-9]+$/.test(checkoutId || '')) return {ok: false, reason: 'Not a test-mode checkout id'};
  const s = await stripe(`/checkout/sessions/${checkoutId}`, {fetcher});
  if (s.client_reference_id !== sessionId) return {ok: false, reason: 'Checkout belongs to a different session'};
  if (s.status !== 'complete') return {ok: false, reason: `Checkout is ${s.status}`};
  return {ok: true, subscription: s.subscription || null, livemode: Boolean(s.livemode)};
}
