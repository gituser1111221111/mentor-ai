// Fixed, code-written replies for requests the product must never fulfil, checked before any model call.
// Mentor Labs never moves money, pays bills, places trades or promises outcomes.
const ACTION = /\b(?:can|could|would|will)\s+you\s+(?:please\s+)?(?:move|transfer|send|wire|pay|deposit|withdraw|buy|sell|trade|invest|place|open|close)\b|\b(?:move|transfer|send|wire|withdraw)\b[^.?!]{0,60}\b(?:for me|right now|on my behalf)\b|\b(?:buy|sell|trade|place an? (?:order|trade))\b[^.?!]{0,40}\bfor me\b/i;
const GUARANTEE = /\b(?:guarantee|promise)\b[^.?!]{0,80}\b(?:rich|millionaire|million|return|profit|wealthy|retire|double|triple|money)\b|\bwill i (?:definitely|for sure|100%)\b/i;

export function guardrailReply(message) {
  const m = String(message || '');
  if (ACTION.test(m)) return 'I can’t move money, make payments, or place trades. Mentor Labs never connects to or acts on your accounts, and every decision stays with you. What I can do is help you think the move through with your own numbers first: what it costs, what it protects, and what you’d give up. Want to walk through it?';
  if (GUARANTEE.test(m)) return 'No one can honestly guarantee that, and I won’t promise returns or outcomes. Results depend on income, spending, markets and time, and none of those are certain. What I can do is help you build the habits that make progress more likely: a written budget, a cash cushion, and a plan for debt. Want to start with where you are today?';
  return null;
}
