# Mentor Labs

**The vision: hundreds of specialist AI agents, guided by mentor perspectives people already trust.** This demo starts with a six-question intake and free Ramsey-inspired chat, plus a visible library of ten mentors and sixteen agent specialties.

RedHawk Builds 2026 · Challenge #21, Variable-income budgeting (Student and Campus Finance track), MVP option 1: plan expenses around variable monthly income.

**Live demo:** https://mentor-ai-ahjs.onrender.com. Render may take a moment to deploy a new main commit.

---

## The user and the problem

Jordan, 22, works part-time and drives DoorDash. Take-home pay swings from **$1,780 to $2,950** a month. Monthly essentials are **$1,955**, so in a bad month Jordan is **$175 short**. Jordan can't afford a financial adviser and doesn't trust a generic chatbot with money: chatbots sound confident and make numbers up.

We fix one workflow: **getting a budget plan that's built around the lowest month**, explained from a philosophy the user already trusts, with every number checkable.

## How it works

```
six questions on one page ──► code computes every number (exact cents)
                     │  lowest month, shortfall, emergency-fund gap,
                     │  snowball/avalanche payoff, income gap, splits…
                     ▼
   ① COACHING (Claude Sonnet 5.5): the professional
       proposes up to 12 options, may only quote numbers from those calculations
                     ▼
   ② VALIDATION (code): drops any option with a number not backed by a
       calculation, plus duplicates and options citing calcs that don't exist
                     ▼
   ③ MENTOR (Claude Haiku 5.5): the philosophy
       picks ONE option by id (a fixed enum), explains it in its voice, cites its notes.
       If its reply contains an unverified number, the app shows the option's own text instead.
                     ▼
   conversational answer + expandable sources and calculations

Switch mentor ──► step ③ only: same options, same numbers, different pick (~2.5 s)

Submit intake ──► Ramsey-inspired chat opens immediately
```

- **Coaching** = a specialist bot (Budget, Debt, Savings & Emergency Fund) that does the work and the math.
- **Mentor** = a money philosophy that directs the coach by choosing among its verified options. Mentors are built from summaries of public teachings and labeled *"inspired by; not affiliated or endorsed."* No mentor claims to be a real person, and there are no cloned voices.

**Available now:** Ramsey-inspired starter chat with budgeting support is free and is the sole interactive mentor and agent pairing. The other nine mentors and fifteen agent specialties are visible as the planned Plus library. Every agent card has a `+` badge. Checkout is test mode only; no real charge is made.

## What actually works (and what doesn't)

| Feature | Status |
|---|---|
| Six questions shown together → direct chat with a computed snapshot | Works; only income is required |
| Portfolio CSV upload → value, sector mix, fees (`portfolioSummary`) | Works. No brokerage login; the sample file is synthetic |
| Financial document upload (PDF, TXT, CSV, Markdown, up to 2 MB) | Extracted text is chat context; its figures are not promoted into verified calculations |
| Free Ramsey-inspired chat after intake | Works with Claude when configured; explicit local mock mode is available for testing |
| Personalized chat: generate → validate → pick | Works for the Ramsey budgeting starter |
| Persona switch on the same options (`repick`) | Engine support exists; additional mentor pairings are not launched |
| Internal number check | Checks money, percentages, dates and other numeric claims against calculations; the public chat shows the answer and optional source/calculation details |
| Conversation and memory | Restores after refresh on the same server instance; users can remove remembered facts |
| Claude unavailable | Chat returns a clear retry message; the rule-based engine runs only when `MENTOR_ENGINE=mock` is explicitly set for local testing |
| $4.99/month Plus (Stripe Checkout) | Works in **Stripe test mode**: a real hosted checkout and subscription, verified on the server before Plus unlocks. Use card 4242 4242 4242 4242. Live keys are refused in code |
| Additional mentors and agents | Nine mentors and fifteen more agent specialties are shown in the gallery, selector, and chat rail as planned Plus entries; they cannot be used as if live |
| Document picker and portfolio URL | Documents upload to the session for chat context; URL is a browser-session reference, with no brokerage connection |
| Direct brokerage connection (Plaid) | **Not built**; the portfolio link is reference-only |
| Voice (ElevenLabs) | Tap **Talk live** once for hands-free turns: microphone silence ends your question, ElevenLabs transcribes it, Claude answers, ElevenLabs speaks the answer, and listening resumes. Tap **End call** to stop. Requires the server-side key and a configured voice; text chat works without them. |

## Run it locally

Requires Node 22+.

```bash
npm ci
cp .env.example .env      # then put your Anthropic key on the MENTOR_API_KEY= line
npm run dev               # http://127.0.0.1:4180
npm test                  # offline tests, no network or key needed
npm run eval:chat         # live answer-quality scenarios; requires MENTOR_API_KEY
```

Without a key, the app shows that AI chat is unavailable. `MENTOR_API_KEY` takes priority over `ANTHROPIC_API_KEY`. Set `MENTOR_ENGINE=mock` only for an explicit local test session.

**Deploy:** `render.yaml` is a Render Blueprint (free Node 22 web service, `HOST=0.0.0.0`). Set `MENTOR_API_KEY` as a secret in Render's Environment settings. Each IP is limited to 40 model calls per hour (`CHAT_LIMIT_PER_HOUR`).

## Accuracy and tests

`npm test` uses a fake Claude client and never calls the network. `npm run eval:chat` runs four live scenarios covering a shortfall, debt versus savings, a good month and missing income. It checks mechanics and prints answers for human review.

- **Valid input:** quiz answers produce an exact-cents snapshot (`$1,780.00` low, `$2,380.00` average, `$1,634.00` essentials in the test profile).
- **Missing or invalid input:** the intake requires one month of income; bad dollar amounts and APRs over 100% are rejected with the field named.
- **Reconciliation:** debt payoff simulations reconcile to the cent (total paid = principal + interest), and in the test case avalanche pays no more interest than snowball.
- **Pick integrity:**
  - The mentor can only pick an id that exists.
  - Repick keeps the options byte-identical.
  - An invented `$9,999.00` option is dropped.
  - A mentor reply with an invented `$5,000.00` is replaced with the verified option text.
- **Request shape:** JSON-schema structured output, no forced `tool_choice` (Sonnet 5.5 rejects it), prompt caching on system prompts.

**Live smoke tests (Nov 7, Jordan's profile):** first answer ~13 s, mentor switch ~2.6 s, and 9 of 9 and 10 of 10 proposed options passed the number check. The first live run dropped 2 good options as false alarms (the user's own APR and the "3 months" target weren't quotable); we fixed that and re-ran.

## Repo map

```
server.js                 starter-kit server + our routes (lib/routes.js) + static UI
config/quiz.json          six-question intake spec
config/catalog.json       10 mentors + 16 specialist agents, free/plus tiers, explainer text
lib/profile.js            quiz → validated profile + money snapshot (cents)
lib/portfolio.js          brokerage CSV → portfolioSummary
lib/store.js, routes.js   anonymous session store, /api/* routes, rate limit, Claude availability errors
lib/mentor/tools.js       calc library: the only numbers the model may use
lib/mentor/generate.js    coaching step (Sonnet 5.5), per-coach focus
lib/mentor/validate.js    number check, dedupe, unknown-calc rejection
lib/mentor/pick.js        mentor step (Haiku 5.5), enum pick, reply number check
lib/mentor/personas.js    loads personas/<id>/core.md + notes/*.md, else built-in summaries
lib/mentor/chat.js        live engine (chat, repick); chat.mock.js = explicit local test engine
public/                   vanilla JS UI: landing, one-page intake, chat
docs/                     business plan, build plan, strategy, Devpost text
```

## Limitations (honest)

- **Educational opinion, not advice** from a licensed financial adviser, CPA, or attorney. The disclosure shows under every answer.
- **Mentor fidelity still needs human evaluation.** The live scenario script checks mechanics and basic relevance; it does not establish an advice-quality or source-fidelity score.
- **Coaches share one calculation library.** Debt and Savings coaching differ from Budget only in focus. Taxes, investment returns and pay changes aren't forecast.
- **Single-instance, anonymous store.** Sessions, chat turns, and extracted document text are saved to a local JSON file without encryption at rest. Render's free-service disk is ephemeral. Use redacted or test documents only.
- **No real bank or brokerage connection, and no real payments.** Documents and portfolio links are showcase fields; the CSV importer is functional.
- **The number check matches exact values.** It can't catch wrong reasoning that uses correct numbers, and it can reject a valid rephrasing (for example, a rounded number).
- Not affiliated with or endorsed by Dave Ramsey, Ramsey Solutions, Ramit Sethi or anyone else named.

## Credits

- **RedHawk Builds starter kit v1.1:** exact-cents finance library (`lib/finance.js`), CSV parser, synthetic portfolio data, server skeleton, tests
- **Anthropic Claude API:** Claude Sonnet 5.5 (coaching), Claude Haiku 5.5 (mentors), `@anthropic-ai/sdk`
- **Render:** hosting
- **Mentor sources:** public summaries of *The Total Money Makeover* (Dave Ramsey) and *I Will Teach You to Be Rich* (Ramit Sethi). Each citation chip names its source.
- Built with help from Claude Code.

The original starter-kit README is kept in [README.txt](README.txt).
