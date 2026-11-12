// Planned chat subscription. Checkout remains disabled until payment enrollment is ready.
export const PLAN = Object.freeze({name:'Mentor Labs chat', amountCents:499, currency:'usd', interval:'month', allInclusive:false, status:'coming_soon'});
export const stripeConfigured = () => false;
export async function createCheckout() { throw Error('Chat payment is coming soon. Checkout is not available yet.'); }
export async function confirmCheckout() { return {ok:false,reason:'Subscriptions are not active.'}; }
