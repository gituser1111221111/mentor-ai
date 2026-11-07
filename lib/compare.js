// Mentor comparison: every mentor judges the SAME verified options from one turn.
// Nothing is regenerated or recalculated. Each mentor only re-runs the pick (repick), so the
// candidates and their numbers must come back byte-for-byte identical; we check that.
// Disagreement is reported only when picks actually differ. It is never manufactured.

// mentors: catalog entries [{id, name, inspiredBy, riskNote, affiliation, tier, built}]
// canUse(mentor) -> null if allowed, else 'locked' | 'coming-soon'
// repick(personaId) -> contract response {pick, candidates, text, citations, personaName}
export async function compareMentors({mentors, canUse, repick, limit = 10}) {
  const rows = mentors.slice(0, limit).map(m => ({m, status: canUse(m) || 'ok'}));
  const outs = await Promise.all(rows.map(async r => {
    if (r.status !== 'ok') return null;
    try { return await repick(r.m.id); } catch (e) { r.status = 'error'; r.error = e.message; return null; }
  }));

  const okOuts = outs.filter(Boolean);
  const candidates = okOuts[0]?.candidates || [];
  const fingerprint = o => JSON.stringify((o.candidates || []).map(c => [c.id, c.title, c.calculations]));
  const factsUnchanged = okOuts.every(o => fingerprint(o) === fingerprint(okOuts[0]));
  const titleOf = id => candidates.find(c => c.id === id)?.title || id;

  const mentorRows = rows.map((r, i) => {
    const o = outs[i];
    const base = {personaId: r.m.id, name: r.m.name, inspiredBy: r.m.inspiredBy, affiliation: r.m.affiliation || null, riskNote: r.m.riskNote || null, status: r.status};
    if (!o) return {...base, error: r.error || null};
    const picked = candidates.find(c => c.id === o.pick?.pickId);
    return {
      ...base,
      pickId: o.pick?.pickId, pickTitle: titleOf(o.pick?.pickId),
      rationale: o.pick?.rationale || '', text: o.text || '',
      runnersUp: (o.pick?.runnersUp || []).map(id => ({id, title: titleOf(id)})),
      citations: o.citations || [],
      optionRisk: picked ? {risk: picked.risk || null, tradeoffs: picked.tradeoffs || null} : null,
    };
  });

  // Agreement is derived only from actual picks.
  const ran = mentorRows.filter(x => x.status === 'ok' && x.pickId);
  for (const x of ran) {
    x.agreesWith = ran.filter(y => y !== x && y.pickId === x.pickId).map(y => ({personaId: y.personaId, name: y.name}));
    x.disagreesWith = ran.filter(y => y.pickId !== x.pickId).map(y => ({personaId: y.personaId, name: y.name, pickId: y.pickId, pickTitle: y.pickTitle}));
  }
  const groups = [];
  for (const x of ran) {
    let g = groups.find(g => g.pickId === x.pickId);
    if (!g) groups.push(g = {pickId: x.pickId, pickTitle: x.pickTitle, personaIds: []});
    g.personaIds.push(x.personaId);
  }
  groups.sort((a, b) => b.personaIds.length - a.personaIds.length);
  const consensus = ran.length > 1 && groups.length === 1;
  const summary = !ran.length ? 'No mentors could be compared.'
    : consensus ? `All ${ran.length} mentors picked the same option: ${groups[0].pickTitle}.`
    : groups.map(g => `${g.personaIds.length} picked "${g.pickTitle}"`).join('; ') + '.';

  return {candidates, factsUnchanged, consensus, summary, groups, mentors: mentorRows};
}
