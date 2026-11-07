# Mentor Labs (RedHawk Builds 2026, Challenge #21)

Current product direction (Nov 7): free Ramsey-inspired starter chat, optional six-screen intake, ten visible mentors and sixteen visible specialist agents. Interactive: the free Ramsey budgeting starter, plus (Plus tier) the Portfolio Review and Equity Research agents with the Buffett- and Cathie Wood-inspired mentors, backed by live market data (see below). All agent cards show `+`; all other mentor and agent entries belong to the planned Plus library and explain their status when selected. The context hub previews document selection and portfolio URLs; holdings CSV import works. Do not claim a thousands-of-hours source corpus has already been processed.

Start every session by reading:
- `docs/STRATEGY_AND_STRUCTURE.md`: historical v0.4 plan. Use the current catalog and this file for the 16-agent, single-demo MVP. Specs: `config/quiz.json`, `config/catalog.json`
- `docs/BUILD_PLAN.md`: architecture, the A/B chat-module contract, the two builder sections, timeline, acceptance checks
- `docs/BUSINESS_PLAN.md`: business context (the v0.3 box at the top supersedes older sections)
- `docs/DEVPOST.md`: paste-ready Devpost text, pitch script, Q&A. `README.md`: public repo README
- `docs/SUBMISSION.md`: Devpost requirements, schedule, Devpost draft, final checklist
- `context/team-brief.txt` and `LLM-STARTER-PACK.txt`: starter-kit rules

## Locked decisions
- Challenge 21, Variable-income budgeting, MVP option 1: plan expenses around variable monthly income. User: young adult with uneven income who can't afford an advisor and doesn't trust AI.
- **Generate, then pick:** agents (persona-neutral) produce up to 40 candidate options (`MENTOR_MAX_OPTIONS`, default 40; Ramsey's coach also draws on the 40-idea bank in `config/option-banks/debt-free-coach.json` from the deep research) with all numbers from code tools. Code validates them. The persona only picks one by id (enum) and explains. `repick()` swaps the persona without changing the facts.
- MVP persona: Debt-Free Coach, built from Dave Ramsey's public teachings and labeled "not affiliated." Conscious Spender (built-in, from Ramit Sethi's public teachings) remains prototype code but is not launched. Hustle Coach (Grant Cardone) was removed in v0.6. Never "I am Dave Ramsey." No voice clone.
- Mentor portraits are AI-generated editorial likenesses of the public figures who inspire each philosophy. Label them as generated and maintain clear non-affiliation language; the figures do not speak for or endorse the app.
- Business model: free Ramsey-inspired starter; one $4.99/mo test-mode tier previews the Plus library. Only built features are interactive. Specific answers include a disclosure (not licensed advice).
- Stack: starter Node 22 backend (`server.js`, `lib/`), Claude API (`claude-sonnet-5-5` to generate, `claude-haiku-5-5` to pick and for memory), ElevenLabs STT/TTS, Stripe test mode, static UI in `public/`.
- All money is a USD decimal string, with math in exact cents via `lib/finance.js`. The model never does arithmetic.

## What's built (Section B, Sat Nov 7)
- `npm run dev` → http://127.0.0.1:4180 (landing → free chat, or optional intake → snapshot → chat). "See a sample plan" skips the intake.
- `lib/profile.js` (quiz → profile + snapshot, cents), `lib/portfolio.js` (CSV → `portfolioSummary`), `lib/store.js` (anonymous session store, `.data/`), `lib/routes.js` (all `/api/*` app routes + static `public/`), `public/` (vanilla JS UI).
- `lib/mentor/chat.mock.js` implements the A/B contract with code-computed candidates and rule-based picks; responses say `mode: "mock"`.
- **Live engine (`lib/mentor/chat.js`, written by Ryan's session):** `tools.js` builds the calc library in code → `generate.js` (Sonnet 5.5, JSON-schema output, server-side refusal fallback) proposes up to `MAX_OPTIONS` (default 40) options citing calc ids → `validate.js` drops any option with a number not in the calcs, duplicates, unknown calcs → `pick.js` (Haiku 5.5, persona notes cached, `pickId` enum c1..cMAX_OPTIONS) picks + replies; an unverified number in the reply swaps in the option's own text → `repick()` reruns only the pick. No forced `tool_choice` (400s on Sonnet 5.5).
- **Personas:** `personas.js` loads `personas/<id>/core.md` + `notes/*.md` (note title = first `# heading`, optional `source:` line; note id = filename) and falls back to built-in summaries. Teammate: drop files there; no code change needed.
- **Progressive answers (perf):** classification and the first option round run concurrently (generation starts early only for money-like messages and is aborted for small talk). The mentor answers from `MENTOR_INITIAL_OPTIONS` (default 8) and the answer says how many it reviewed; `POST /api/expand` adds verified options up to `MAX_OPTIONS` (40) without changing the shown answer; repick then reviews all. Stage timings via `lib/mentor/perf.js` (monotonic clock), dev stats at `/api/perf` with `MENTOR_DEBUG_PERF=1`. See `docs/PERFORMANCE.md`.
- **Engine switch:** live when `MENTOR_API_KEY` or `ANTHROPIC_API_KEY` is set (MENTOR wins). Production never silently falls back to the rule-based mock; failures return a retry message. `MENTOR_ENGINE=mock` forces the local test engine.
- Deploy: set `HOST=0.0.0.0`, `ANTHROPIC_API_KEY`, optional `CHAT_LIMIT_PER_HOUR` (default 40/IP).

## Market data (investing agents, Nov 7)
- `lib/market/providers.js`: server-side fetchers, all optional: Finnhub (`FINNHUB_API_KEY`), FRED (`FRED_API_KEY`), SEC EDGAR (`SEC_USER_AGENT`, no key), CoinGecko (no key), Alpha Vantage quote fallback (`ALPHA_VANTAGE_API_KEY`). 15-min cache, 3.5 s timeout, `MARKET_LIVE=0` disables network. Falls back to `data/market/snapshot.json` (Nov 6 pull from the Sentinel dashboard) and labels every field's source.
- `lib/market/review.js`: holdings + market data -> calcs (`pf_mix`, `pf_concentration`, `pf_earnings`, `pf_risk`, `pf_news`, `eq_<ticker>`, `mkt_macro`). The investing agents quote only these; `validate.js` now accepts YYYY-MM-DD dates and negative percents that appear in calcs.
- `GET /api/market/status` shows which sources are configured. Sample portfolio `data/demo_portfolio.csv` uses real tickers (synthetic values). Tests: `tests/market.test.js` (uses snapshot dates; NVDA's 2026-11-17 call drops out of the window after that date).

## Ownership
- Section A (teammate): `lib/mentor/`, `personas/`, `agents/`, `evals/`, `tests/mentor.test.js`
- Section B (Ryan): `server.js` routes, `public/`, `lib/store.js`, voice, Stripe, `docs/`, Devpost

Deadline: Devpost due Sun Nov 8, 2026, 10:00am ET. Run `npm test` before every push. Never commit `.env`.
