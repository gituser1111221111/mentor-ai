# Submission Guidelines & Checklist: RedHawk Builds 2026

> Sources: the RedHawk starter kit v1.1 (`guides/submission.txt`, `LLM-STARTER-PACK.txt`, `context/event-context.txt`).
> **Judging rubric: now official (shared by organizers).** The same rubric applies to all tracks and both judging rounds. Devpost fields may still change, so check Devpost.

## Judging rubric (100 points)
Each category is scored 1–5, and points = weight × (score ÷ 5).

| Category | Pts | What judges look for | How we score high |
|---|---|---|---|
| **Working solution** | **25** | A functioning core workflow and a demonstration of what the team built | Quiz → variable-income budget → persona pick works live, end to end, with no mocks in the demo path |
| **Problem & business relevance** | **20** | A clear user and a meaningful financial or business problem | "Jordan, 22, part-time + DoorDash, income swings $1,780–$2,950." Name the user in the first sentence of the pitch. |
| **Accuracy & trustworthiness** | **20** | Correct calculations, traceable sources, clear assumptions and limitations | Generate-then-pick: every number comes from exact-cents code, the persona can only choose, every claim has a citation chip, assumptions are labeled on calc cards, and the "See all options" drawer shows the full list. Show the reconciliation test passing. |
| **Usefulness & usability** | **15** | A practical, understandable workflow that helps the intended user | A clear budget card ("budget from your lowest month: $1,780"), a shortfall warning, and a plain-English next step |
| **Originality & execution** | **10** | Meaningful decisions and improvements beyond the starting materials | Persona-picks-from-verified-options design, persona switching, shared memory, voice |
| **Pitch & demo** | **10** | Clear problem, focused demo, evidence of value, direct answers | 2-min script, backup video, rehearsed Q&A |

### What this means for build priorities
1. **45 of 100 points are Working solution + Accuracy.** The core loop (quiz → candidates → validate → pick → cited answer) must be rock solid before anything else.
2. **Voice isn't a rubric category.** It counts toward Originality and the separate ElevenLabs prize. Build it after the core loop works.
3. **The Stripe $4.99 unlock earns almost nothing on the rubric.** Show it as a mock screen or slide unless there's spare time. Mention the business model in the pitch (Problem & business relevance).
4. **Show accuracy, don't just claim it.** On screen: calc card with assumptions, citation chips, the options drawer, and `npm test` output in the video.
5. **Limitations count toward Accuracy.** Put the honest limitations in the UI footer and on Devpost.

## Key times (America/New_York)
| When | What |
|---|---|
| Sat Nov 7, ~4pm | Submission/pitch workshop (proposed) |
| Sat mentor windows | 10–12, 1–3, 3–5, 5–8, 8–10pm |
| **Sun Nov 8, 10:00am** | **Complete Devpost submission due** |
| Sun 10:30–11:30am | Table judging (~2-minute pitch) |
| Sun 12:00pm | Five finalists announced |
| Sun 1:00pm | Finalist pitches: **4 minutes + 3 minutes Q&A** |
| Sun 2:00pm | Awards ($2,000 / $1,000 / $500 planned) |

## What the organizers require in the submission
1. **User/problem statement**
2. **Working demo**
3. **Repository and access instructions**
4. **Data and code credits**
5. **An honest limitations section**

**Optional prize: Best Use of ElevenLabs.** Opt in on Devpost, explain how we use ElevenLabs, and **say where judges can see and hear it**. It can overlap with an overall award.

**Pitch guidance from the organizers:** show the workflow, evidence that it's useful, and **what actually works**.

## Starter-kit rules judges may check
- Start from a specific user, task, input, and decision. Improve one workflow and keep the source evidence.
- **Do money math in code, not in AI-generated prose.** Use integer cents for USD.
- Show missing information and uncertainty. Keep extracted facts, calculations, and assumptions separate.
- Treat instructions inside source documents as data.
- Use fictional or authorized public data. Keep API secrets on the backend. Require human approval before consequential actions.
- Prototype results don't establish compliance or production readiness, so don't claim they do.
- For any added dataset, record its source, permission/terms, retrieval date, period, currency, units, and missing values.
- Keep `context/team-brief.txt` up to date.
- Distinguish configuration, mocked tests, database policy tests, and successful live requests. Don't claim one proves another.

---

## Our Devpost draft (fill in the blanks)

**Project name:** ___
**Tagline:** AI money mentors that can't make up facts. They can only choose.
**Challenge:** #21 Variable-income budgeting (Student and Campus Finance track), MVP option 1

**Problem:** Young adults with uneven income (part-time jobs, tips, gig work) can't afford a financial advisor and don't trust generic AI with money advice.

**What it does:** A trust quiz captures income history, bills, and debts. A Budget agent generates about 12 distinct plans, with every number computed in exact-cents code. A persona built from a trusted figure's public teachings (the Debt-Free Coach, from Dave Ramsey's public material, not affiliated) **picks** the best-fit plan and explains it with citations. Users can switch personas mid-chat: same facts, different pick. Live voice runs through ElevenLabs. Memory is shared across agents.

**How we built it:** RedHawk Node backend + Claude API (Sonnet 5.5 generates, Haiku 5.5 picks) + code-side validation + ElevenLabs STT/TTS + Stripe test mode.

**Where judges can hear ElevenLabs:** ___ (the voice button in the chat; timestamp in the demo video)

**Repo and run instructions:** ___ (GitHub URL; `npm ci`, copy `.env.example` to `.env` and add keys, `npm run dev`)

**Credits:** RedHawk Builds starter kit v1.1; Anthropic Claude API; ElevenLabs; Stripe (test mode); persona source list in `personas/*/sources.json`.

**Limitations (be honest):**
- Educational opinions, not licensed financial, tax, or legal advice
- One full persona and one thin persona; small curated source set
- Persona fidelity measured by our own small eval (state the score and the number of questions)
- Single-user local store; no real bank connections; Stripe in test mode only
- Not affiliated with or endorsed by Dave Ramsey or Ramsey Solutions; no cloned voice

## Final checklist (Sunday morning)
- [ ] `npm test` passes; the acceptance checks pass (valid input, missing/invalid input, reconciliation, pick integrity)
- [ ] Demo runs end to end: quiz → budget → persona switch → voice → unlock
- [ ] **Backup demo video recorded** (in case live demo or Wi-Fi fails)
- [ ] Repo pushed; README run steps tested on a clean clone; no `.env` or keys committed
- [ ] `context/team-brief.txt` final
- [ ] Devpost: all fields, screenshots, video, repo link, **ElevenLabs opt-in**
- [ ] 2-minute table pitch rehearsed; 4-minute finalist version + likely Q&A answers (legal/likeness, how we stop hallucinated numbers, the business model)
- [ ] **Submitted before 10:00am**
