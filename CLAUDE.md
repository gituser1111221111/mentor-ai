# Mentor AI (RedHawk Builds 2026, Challenge #21)

Start every session by reading:
- `docs/STRATEGY_AND_STRUCTURE.md`: **v0.4, newest, wins on conflicts.** Quiz, 10 agents/10 personas (1 live each), portfolio upload, deploy, repo layout. Specs: `config/quiz.json`, `config/catalog.json`
- `docs/BUILD_PLAN.md`: architecture, the A/B chat-module contract, the two builder sections, timeline, acceptance checks
- `docs/BUSINESS_PLAN.md`: business context (the v0.3 box at the top supersedes older sections)
- `docs/SUBMISSION.md`: Devpost requirements, schedule, Devpost draft, final checklist
- `context/team-brief.txt` and `LLM-STARTER-PACK.txt`: starter-kit rules

## Locked decisions
- Challenge 21, Variable-income budgeting, MVP option 1: plan expenses around variable monthly income. User: young adult with uneven income who can't afford an advisor and doesn't trust AI.
- **Generate, then pick:** agents (persona-neutral) produce ~12 candidate options with all numbers from code tools. Code validates them. The persona only picks one by id (enum) and explains. `repick()` swaps the persona without changing the facts.
- MVP persona: Debt-Free Coach, built from Dave Ramsey's public teachings and labeled "not affiliated." Plus a thin second persona (Hustle Coach) for the switch demo. Never "I am Dave Ramsey." No voice clone.
- Business model: free base bot; one $4.99/mo tier unlocks all agents and personas. Specific answers allowed, always with a disclosure (not licensed advice).
- Stack: starter Node 22 backend (`server.js`, `lib/`), Claude API (`claude-sonnet-5-5` to generate, `claude-haiku-5-5` to pick and for memory), ElevenLabs STT/TTS, Stripe test mode, static UI in `public/`.
- All money is a USD decimal string, with math in exact cents via `lib/finance.js`. The model never does arithmetic.

## What's built (Section B, Sat Nov 7)
- `npm run dev` → http://127.0.0.1:4180 (landing → quiz → snapshot → chat). "Use demo profile" skips the quiz.
- `lib/profile.js` (quiz → profile + snapshot, cents), `lib/portfolio.js` (CSV → `portfolioSummary`), `lib/store.js` (anonymous session store, `.data/`), `lib/routes.js` (all `/api/*` app routes + static `public/`), `public/` (vanilla JS UI).
- `lib/mentor/chat.mock.js` implements the A/B contract with code-computed candidates and rule-based picks; responses say `mode: "mock"`.
- **Live engine (`lib/mentor/chat.js`, written by Ryan's session):** `tools.js` builds the calc library in code → `generate.js` (Sonnet 5.5, JSON-schema output, server-side refusal fallback) proposes ≤12 options citing calc ids → `validate.js` drops any option with a number not in the calcs, duplicates, unknown calcs → `pick.js` (Haiku 5.5, persona notes cached, `pickId` enum c1..c12) picks + replies; an unverified number in the reply swaps in the option's own text → `repick()` reruns only the pick. No forced `tool_choice` (400s on Sonnet 5.5).
- **Personas:** `personas.js` loads `personas/<id>/core.md` + `notes/*.md` (note title = first `# heading`, optional `source:` line; note id = filename) and falls back to built-in summaries. Teammate: drop files there; no code change needed.
- **Engine switch:** live when `MENTOR_API_KEY` or `ANTHROPIC_API_KEY` is set (MENTOR wins; this PC has a stray invalid `ANTHROPIC_API_KEY`). Any live failure falls back to the mock, labeled "offline fallback". `MENTOR_ENGINE=mock` forces mock.
- Deploy: set `HOST=0.0.0.0`, `ANTHROPIC_API_KEY`, optional `CHAT_LIMIT_PER_HOUR` (default 40/IP).

## Ownership
- Section A (teammate): `lib/mentor/`, `personas/`, `agents/`, `evals/`, `tests/mentor.test.js`
- Section B (Ryan): `server.js` routes, `public/`, `lib/store.js`, voice, Stripe, `docs/`, Devpost

Deadline: Devpost due Sun Nov 8, 2026, 10:00am ET. Run `npm test` before every push. Never commit `.env`.
