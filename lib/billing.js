// Subscription offer only. Checkout stays disabled until trial and consent terms are decided.
export const PLAN = Object.freeze({name:'Mentor Labs', amountCents:299, currency:'usd', interval:'month', trialLabel:'One month free', allInclusive:true, status:'planned'});
export const stripeConfigured = () => false;
export async function createCheckout() { throw Error('Subscriptions are not active. Trial and billing terms are pending.'); }
export async function confirmCheckout() { return {ok:false,reason:'Subscriptions are not active.'}; }
