# Strategy & Structure (v0.4, Sat Nov 7)

> **v0.6 (Sat Nov 7, evening):** Persona roster replaced (§6). Hustle Mentor (Grant Cardone) removed from the catalog, loader, mock and tests. Free tier is now **2 mentors** (Debt-Free Mentor, Conscious Spender) + 3 coaches. Conscious Spender is the second persona for the live switch. Bogle, Mr. Money Mustache, Suze Orman and Ray Dalio are out. Buffett, Kiyosaki and Housel stay. Cathie Wood, Vivian Tu, Graham Stephan, Humphrey Yang and The Money Guy Show are new. Lines below that still mention Hustle Coach are superseded by this note.

> **v0.5 (Sat Nov 7, afternoon):** Free tier = **3 mentors + 3 coaches**, all working: mentors Debt-Free Mentor, Hustle Mentor, Conscious Spender; coaching Budget, Debt, Savings & Emergency Fund. $4.99 unlocks all 10 + 10. Vocabulary: **Coaching** = the professional bot that does the work and the math; **Mentor** = the philosophy that directs it by picking among verified options. Persona display names dropped "Coach" to avoid confusion (ids unchanged).

> This file decides **what we build and how it fits together**. It supersedes any conflicting detail in BUILD_PLAN.md. Design and naming are out of scope for now.

## 1. The one-line strategy
Show the **full product shape** (screening quiz, 10 agents, 10 personas), but only **one agent and one persona are fully working**. Every other card is visible and locked. Judges score working software and accuracy (45/100), so the working slice must be real, live, and correct. The rest only has to communicate the vision.

| | Working in the demo | Visible, locked ("coming with $4.99") |
|---|---|---|
| Agents | **Budget Coach (variable income)** | 9 others (§4) |
| Personas | **Debt-Free Coach** (teammate building) + thin **Hustle Coach** for the switch | 8 others (§5) |
| Data in | Screening quiz + portfolio CSV upload | Plaid brokerage connect (sandbox button only) |

**Why the Budget agent:** it is literally Challenge #21 (variable-income budgeting), the math is fully deterministic (no market forecasts to defend), and every young adult has the problem. Debt payoff becomes one *option type inside* the budget plan, so we still show the Ramsey snowball.

**Why a thin second persona:** persona switching is our core originality point ("same facts, different pick"). The picker is only a prompt plus about 15 notes, so a second one costs about an hour. Without it, the switch button does nothing on stage. If time runs out, cut it, and the switch demo becomes a slide.

## 2. User flow (the demo path)
```
Landing ─► Screening quiz (≈2 min) ─► Profile + "your money snapshot" card
        ─► Chat with Budget Coach, Debt-Free Coach picking
             each answer = calc card + citation chips + "See all 12 options"
        ─► Switch persona ─► repick() on the SAME 12 options ─► different pick, same numbers
        ─► Locked agent/persona cards ─► $4.99 unlock screen (mocked)
```

## 3. Screening quiz
Goal: collect everything the Budget agent needs in under 2 minutes and build trust. One question per screen, with a progress bar, and every field is skippable except income.

| # | Section | Question | Field → `profile` | Type |
|---|---|---|---|---|
| 1 | Trust | Have you ever paid for financial advice? | `trust.priorAdvisor` | yes / no / couldn't afford |
| 2 | Trust | How much do you trust AI with money questions? | `trust.aiTrust` (1–5) | slider |
| 3 | Trust | What would make you trust an answer? | `trust.needs[]` | multi: show the math / show sources / a known philosophy / a human |
| 4 | Income | Does your income change month to month? | `incomeVaries` | yes / no |
| 5 | Income | What did you take home each of the last 6 months? | `incomeHistory[{month,amount}]` | 6 money inputs (or "I don't know" → the agent asks later) |
| 6 | Income | Where does it come from? | `incomeSources[]` | multi: hourly job, tips, gig/DoorDash, freelance, stipend/aid, parents |
| 7 | Bills | Fixed bills (rent, phone, car, insurance, subscriptions) | `bills[{name,amount,dueDay}]` | repeatable row |
| 8 | Spending | Roughly how much on food, gas, fun? | `expenses[{name,amount}]` | 3 money inputs |
| 9 | Debt | Any debts? | `debts[{name,balance,rateBps,minPayment}]` | repeatable row, APR in %, stored as bps |
| 10 | Savings | Cash you could reach today | `savings` | money |
| 11 | Portfolio | Do you invest? | `portfolio` | **Upload CSV** / Connect brokerage (sandbox) / Skip |
| 12 | Goals | Top goal for the next 12 months | `goals[]` | pick 1–2: stop living paycheck to paycheck, pay off debt, emergency fund, start investing, big purchase |
| 13 | Style | Pick the statement you agree with most | `personaHint` | 4 statements → suggests a persona (e.g. "Debt is the enemy" → Debt-Free Coach, "Earn your way out" → Hustle Coach) |

**Output:** the quiz writes `profile` (the contract in BUILD_PLAN.md) and shows a snapshot card that code computes: lowest month, average, swing, fixed bills total, and the **shortfall in the lowest month**. That card is the "aha" before the chat even starts.

**Validation (acceptance check 2):** money must parse with `minor()`; negative values are rejected; missing income → the snapshot shows "need your income to plan" and the agent's first message asks for it.

Spec file: `config/quiz.json` (the UI renders from it, so questions can change without touching code).

## 4. The portfolio question: upload vs. "connect Robinhood"
**Recommendation: CSV upload works for real. "Connect brokerage" is a Plaid sandbox button. No direct Robinhood link.**

- **Robinhood has no public API for third-party apps to read a customer's stock portfolio.** The unofficial libraries log in with the user's Robinhood username, password and MFA code. That breaks Robinhood's terms, breaks the kit rule ("fictional or authorized data only; keep secrets on the backend"), and is the opposite of the trust story. A judge asking "how did you get their Robinhood data?" would sink us.
- **The legitimate route is an aggregator (Plaid Investments)**, which is how real fintech apps read brokerage holdings. The starter kit already has `plaidSandboxItem()` in `lib/sandboxes.js`. Use it for the demo only, labeled "sandbox: fake institution." Production would mean Plaid Link plus Plaid's approval, which we put on the roadmap slide.
- **The CSV upload is a real, working feature today.** Robinhood and most brokerages let users download statements or exports. We accept a simple CSV (`security, sector, market_value_usd, annual_fee_bps`), and `portfolioSummary()` in `lib/finance.js` already computes the total value, sector mix and estimated annual fees in exact cents. Demo it with `data/portfolio_holdings.csv` (synthetic).
- **Use for the Budget agent:** the portfolio is context only. ("You have $X invested while your lowest month is $Y short. Debt-Free Coach would pause investing; Hustle Coach would keep it.") That's a great persona-switch moment.

## 5. Agent roster (10 "professionals")
Agents are **persona-neutral calculators plus option generators**. They never pick and they never do math in prose.

| # | Agent | Job | Core tools (code) | Status |
|---|---|---|---|---|
| 1 | **Budget Coach** | Plan around variable income | `variable_income_plan`, `budget_check`, `emergency_fund`, `debt_snowball` | **LIVE** |
| 2 | Debt Coach | Payoff order and timelines | `debt_snowball`, `debt_avalanche`, `loanSchedule` | locked |
| 3 | Savings / Emergency Fund | How much and how fast | `emergency_fund` | locked |
| 4 | Investing Coach | Portfolio mix and fees (education) | `portfolioSummary` | locked |
| 5 | Retirement Coach | 401k/IRA growth projections | `retirement_growth` | locked |
| 6 | Tax Education | Withholding and 1099 basics for gig income | `quarterly_estimate` (education) | locked |
| 7 | Credit Coach | Utilization and score factors | `utilization` | locked |
| 8 | Income / Side Hustle | Raise the floor month | `income_gap` | locked |
| 9 | Life Planning | Big goals (car, move, school) | `goal_timeline` | locked |
| 10 | Business Coach | Freelancer/self-employed basics | `runway` (kit) | locked |

## 6. Persona roster (10 "how to think" guides)
Personas only **pick and explain**. Each is built from a named public body of work, marketed by source metrics ("built from X hours of public podcasts, Y books"), always labeled **"inspired by public teachings; not affiliated or endorsed."** No real names in the persona's own voice, no cloned voices.

| # | Persona (working name) | Built from the public work of | Philosophy in one line | Status |
|---|---|---|---|---|
| 1 | **Debt-Free Mentor** | Dave Ramsey | Debt is the enemy; baby steps; cash only | **LIVE**, free |
| 2 | Value Investor | Warren Buffett | Long-term investing in good businesses, low-cost index funds for most people | locked |
| 3 | Asset Builder | Robert Kiyosaki | Buy assets, not liabilities. Real estate, entrepreneurship and cash flow | locked (leverage claims need contested fields) |
| 4 | Disruptive Growth | Cathie Wood | Concentrated long-term bets on emerging technologies like AI | locked (must not steer to individual stocks or funds) |
| 5 | Credit-Smart Starter | Vivian Tu | Use credit on purpose, negotiate your pay, start investing early | locked |
| 6 | **Conscious Spender** | Ramit Sethi | Spend big on what you love, cut the rest | **LIVE**, free, second persona for the switch |
| 7 | Money Psychology | Morgan Housel | Behavior over spreadsheets; room for error | locked |
| 8 | Real Estate Saver | Graham Stephan | Save hard, invest early, build toward real estate and financial independence | locked |
| 9 | Money Basics | Humphrey Yang | Plain-language investing, taxes and compound interest | locked |
| 10 | Step-by-Step Planner | Brian Preston and Bo Hanson (The Money Guy Show) | Financial steps in a set order, from employer match to retirement | locked |

The locked list lives in `config/catalog.json`, so the UI renders the cards from data.

## 7. How a chat turn works (unchanged core, now concrete)
```
user msg + profile + memory
   │
   ▼  ① Budget agent (Sonnet 5.5 + tools) → 12 candidate plans, every number from a tool call
   ▼  ② validate.js (code): numbers match the tool outputs, no duplicates, required fields present
   ▼  ③ persona picker (Haiku 5.5, persona notes cached): choose_option({pickId ∈ enum}, rationale, citations)
   ▼  ④ response builder (code): text from the persona, numbers re-inserted from the chosen candidate
   ▼
{ text, citations, calculations, candidates, pick, disclosure, turnId }
persona switch → repick({turnId, personaId}) reruns ③ only; same candidates, same numbers
```
Candidate option types for the Budget agent (about 12 per turn, varied): bare-bones floor budget, floor plus snowball, floor plus emergency-fund first, percent-of-income split, high-month sweep to debt, high-month sweep to savings, pause investing, keep investing at a minimum, add a side income target, a sinking-fund plan for irregular bills, a cut-list (top 3 cuts), and "need more info."

## 8. Making it live on a website (what you need to connect)
GitHub Pages can't do this: the Claude API key must stay on a server. Deploy the Node server as-is:

| Need | Recommendation | Who does it |
|---|---|---|
| Hosting | **Render** (free Web Service, deploys from GitHub on push). Railway or Fly also work. | Ryan: sign in to Render with GitHub and pick this repo |
| Claude API key | `ANTHROPIC_API_KEY`, set in Render's environment settings, **never in the repo** | whoever's account pays |
| ElevenLabs key | `ELEVENLABS_API_KEY`, same place (later) | same |
| Server tweak | `server.js` binds `127.0.0.1`. Render needs `0.0.0.0`, so read `HOST` from env (a 1-line change) | Ryan, Section B |
| Cost guard | Public site plus a live key means abuse risk: per-IP rate limit (for example 20 turns/hour), `max_tokens` caps, and a daily spend cap in the Anthropic console | Ryan |
| Offline fallback | If no key is set, serve `chat.mock.js` so the demo never shows a blank screen | already in the contract |

Start/build commands on Render: build `npm ci`, start `npm start`, Node 22.

## 9. Repo structure (target)
```
server.js                 routes: /api/quiz, /api/profile, /api/portfolio/upload, /api/chat, /api/repick, /api/memory, /api/voice/*, /api/checkout
config/
  quiz.json               screening quiz spec (§3)          ← B
  catalog.json            10 agents + 10 personas, live/locked (§5–6) ← shared
lib/
  finance.js, citations.js, sandboxes.js, csv.js   (starter kit, don't edit)
  store.js                local JSON store for profile + memory   ← B
  portfolio.js            CSV → portfolioSummary()                ← B
  mentor/                 chat.js, chat.mock.js, tools.js, generate.js, validate.js, pick.js ← A
agents/budget.md          agent system prompt (+ 9 stubs)         ← A
personas/debt-free-coach/ core.md, notes/*.md, sources.json       ← A (in progress)
personas/hustle-coach/    core.md, notes/                          ← A
public/                   index.html (landing), quiz.html, chat.html, app.js ← B
evals/, tests/            mentor.test.js (A), app.test.js (B)
docs/                     plans + Devpost
```

## 10. Build order (today → Sunday 10am)
1. **Contract + mock (now):** `chat.mock.js` returns the full response shape, so B builds the UI without waiting on A.
2. **B: quiz + snapshot card** from `config/quiz.json`, then `/api/profile`.
3. **A: `variable_income_plan` tool + tests**, then the Budget agent generating 12 candidates.
4. **A: Debt-Free Coach picker**, then switch the mock to the real `chat()`.
5. **B: chat UI** (calc card, citation chips, options drawer, persona switcher) and **deploy to Render** as soon as anything works, so we're never debugging deploys at 3am.
6. **A: Hustle Coach thin picker** → `repick()` on stage.
7. **B: portfolio CSV upload**, locked cards, mocked $4.99 screen.
8. Voice (ElevenLabs), then Devpost, video, and pitch.

## 11. Open decisions (need an answer from you)
- Whose Anthropic account pays for the live site (and set a spend cap)?
- Keep the thin Hustle Coach for the live switch, or show the switch as a slide?
- When to make the repo public for judges (it's private now; flip it before submission)?
