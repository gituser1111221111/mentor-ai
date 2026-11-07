// How many verified options the coach may propose and the mentor may choose from in one turn.
// Default 12 keeps live answers fast (voice demo). MENTOR_MAX_OPTIONS can raise it, up to 40.
const n = Number.parseInt(process.env.MENTOR_MAX_OPTIONS, 10);
export const MAX_OPTIONS = Number.isInteger(n) ? Math.min(40, Math.max(6, n)) : 12;
