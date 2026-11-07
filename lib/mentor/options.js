// How many verified options the coach may propose and the mentor may choose from in one turn.
// Default 40 (team decision, Nov 7): Ramsey chooses from up to 40 verified options. MENTOR_MAX_OPTIONS
// (6-40) can lower it, e.g. if live answers or voice feel too slow.
const n = Number.parseInt(process.env.MENTOR_MAX_OPTIONS, 10);
export const MAX_OPTIONS = Number.isInteger(n) ? Math.min(40, Math.max(6, n)) : 40;
