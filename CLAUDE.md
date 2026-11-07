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

## Ownership
- Section A (teammate): `lib/mentor/`, `personas/`, `agents/`, `evals/`, `tests/mentor.test.js`
- Section B (Ryan): `server.js` routes, `public/`, `lib/store.js`, voice, Stripe, `docs/`, Devpost

Deadline: Devpost due Sun Nov 8, 2026, 10:00am ET. Run `npm test` before every push. Never commit `.env`.
