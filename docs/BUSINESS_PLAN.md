# Mentor AI: Business Plan & Build Spec (working draft)

> Working name: **Mentor AI** (placeholder, rename anytime)
> Status: v0.2, 2026-11-07. Written from the founders' pitch notes. Two-person build, one GitHub repo.
> **v0.2 change:** we no longer market bots as "talking to" a real person. Each persona is marketed by its **source metrics** ("trained on 10,000+ podcast minutes and 100 books"). The model is now a free base bot plus a few free personas, with paid unlocks for specialty bots, deeper answers, and better models. See Section 4.
> **v0.3 decisions (supersede anything below that conflicts):**
> - **One paid tier: $4.99/mo unlocks every bot and every agent.** A free base chatbot stays free. The three-tier table in 4.2 is retired.
> - **Personas guide agents.** A *persona* (e.g. the Ramsey-style Debt-Free Coach) is a way of thinking. *Agents* are the professionals (Budget, Debt, Tax, Investing, Life Planning, Business Coach). The persona tells each agent how to think about your situation.
> - **Beta: 10 young adults** who don't have the money or time for a financial advisor and don't trust AI with money advice.
> - **MVP: one real persona** (built from Dave Ramsey's public content) for a young adult seeking financial advice.
> - **Advice depth:** as specific as the user asks for, with a disclosure. No claims of being a licensed or certified adviser.
> - **Event:** RedHawk Builds 2026. Devpost due **Sun Nov 8, 10:00am ET**. Build plan and repo split: [`BUILD_PLAN.md`](BUILD_PLAN.md).

---

## 1. One-liner

An AI financial mentor platform: talk (by text or **live voice**) to AI personas built from the public books, podcasts, and interviews of well-known money figures, starting with Dave Ramsey. The personas share what they know about you, so your "Dave Ramsey" and your "Mark Cuban" give advice that fits the same life.

**Inspiration:** Autopilot (the app that lets users copy politicians' and investors' portfolios). Autopilot copies public figures' *trades*. We copy their *thinking*, built from everything they've published.

> Note on wording: the pitch calls Dave Ramsey a "politician." He's a personal-finance author and radio host, not a politician. The landing page should say "money mentors" or "finance personalities." That also keeps us from being confused with Autopilot's politician-tracking.

---

## 2. The problem and our edge

**Problem:** People pay thousands of dollars for one-on-one time with a mentor, and most never get it. Generic finance chatbots exist, but people don't trust a random bot with their money because they can't see what it's drawing from.

**Our edge: trust through known context.**
- Each persona is grounded in a named, visible source library (these 6 books, these 400 podcast episodes). Users can see what the advice is based on.
- Personas are tested against the real person's known positions (see Section 7, Eval) so they behave like that person.
- The onboarding quiz sets up trust before the first chat.

**Price anchor:** mentor-level access for **$4.99/month** instead of thousands for a single session.

---

## 3. Product

### 3.1 Landing page
- Hero with **three cards**, each a mentor face (launch lineup TBD, see Q1).
- Primary CTA goes straight into the **onboarding quiz**.

### 3.2 Onboarding quiz (first thing every user does)
Captures:
- Current portfolio and finances (income range, debt, savings, holdings)
- Investing goals and time horizon
- Risk tolerance
- Life goals and business goals (so business-focused personas have context too)
- Consent and disclaimers ("financial opinions, not financial advice")

The output is a **User Profile** that every persona can read.

### 3.3 Mentor chat
- Text chat with one persona at a time.
- **Live AI voice mode** (a scored criterion, weighted 10 in the competition rubric).
- Source transparency: a "Why Dave would say this" drawer that shows the passages used.
- A persistent **"Talk to a real advisor"** button (sponsored, see Section 4).

### 3.4 Shared memory across mentors
- Every chat writes facts back to a shared **User Memory** ("paying off $18k car loan," "wants to start a lawn-care business").
- Every persona reads the memory, so Ramsey knows what you told Cuban. Each persona gets *just enough* context: relevant facts only, not full transcripts.
- Later: **Roundtable mode**, where two mentors discuss your situation together (Ramsey vs. Cuban on "should I take on debt to start this business?").

### 3.5 Build-your-own mentor (creator side)
- The same pipeline is open to anyone: upload your content and get a chatbot that answers like you.
- Examples: a famous advisor builds an official profile; a high-school day trader builds one so friends can ask questions without texting them.
- This is also the legally clean path to growth, because creators opt in and own their likeness (see Section 6).

---

## 4. Business model (v0.2)

### 4.1 Core idea
Everyone gets a **free base chatbot** and can unlock **a few free personas** built from the thinking of people they already trust. Users pay when they want **more depth**, **better models**, or **specialty bots**.

**How we talk about personas:** never "talk to Dave Ramsey." Instead, show what the bot is built from:
> **The Debt-Free Coach**: built from 10,000+ minutes of personal-finance radio, 100 books, and 2,000 articles in the debt-snowball school of thinking. *Not affiliated with or endorsed by any person named in its sources.*

The metrics are the trust signal: users see how much material each bot learned from.

### 4.2 Tiers (RETIRED in v0.3: now Free base bot + one $4.99 tier that unlocks everything)

| | **Free** | **Plus (~$4.99/mo)** | **Pro (~$14.99/mo, optional)** |
|---|---|---|---|
| Base money chatbot | ✅ | ✅ | ✅ |
| Personas | 2–3 starter personas | All personas | All personas |
| Specialty bots (Tax, Life Planning, Business Coach…) | Locked (preview / 3 trial questions) | ✅ | ✅ |
| Model | Claude Haiku 5.5 (fast, cheap) | Claude Sonnet 5.5 (deeper answers) | Sonnet + Opus 5.5 "Deep Dive" mode |
| Message limit | Daily cap | Much higher cap | Highest cap |
| Shared memory across bots | Basic | Full | Full + exportable "money plan" |
| Live voice | Short trial | ✅ | ✅ |

### 4.3 Specialty bot catalog (paid unlocks)

| Bot | What it does | Source library idea |
|---|---|---|
| **Tax Bot (CPA-style)** | Explains deductions, filing status, side-hustle taxes, quarterly estimates | IRS publications (public domain), tax-education podcasts, CPA-authored books |
| **Business Coach** | Sales, scaling, cash flow, fundraising | Grant Cardone-style sales and "10X" strategies, Mark Cuban-style startup thinking, business podcasts |
| **Life Planning Bot** | Big goals: buying a house, marriage and money, kids, retirement timeline | Financial-planning books, retirement research |
| **Investing Coach** | Index funds, retirement accounts, risk | Bogleheads-style material, SEC Investor.gov (public) |
| **Real Estate Bot** (later) | Rentals, house hacking | Real estate podcasts and books |

Each bot shows its own source scorecard and reads the user's shared memory, so the Tax Bot knows about the side business you told the Business Coach about.

### 4.4 Other revenue (still in the plan)

| Stream | How it works |
|---|---|
| **Sponsored referrals** | "Talk to a real advisor" in money bots, and **"Talk to a real CPA"** in the Tax Bot. Advisors and CPAs pay for placement. |
| **Creator profiles** (later) | Advisors and creators opt in and host an *official* persona (no likeness risk), with a revenue share. |

### 4.5 Brainstorm: ideas to build on the new model
- **Source scorecard badge** on every bot card: "📚 100 books · 🎙 10,000 min · 📰 2,000 articles · ✅ 94% match on our fidelity test." Turns the eval (Section 7.6) into a marketing asset.
- **"Show your sources" button** under every answer. It shows which book or episode the idea came from, and it's how users check that a bot thinks the way it claims to.
- **Model upgrade as a moment:** when a free user asks something complex ("should I roll my 401k into a Roth?"), show "This question deserves a Deep Dive. Upgrade to get a more thorough answer." This is the most natural paywall trigger.
- **Bot handoffs:** the free money bot says "This is a tax question. The Tax Bot can go deeper (Plus)." Each specialty bot sells itself from inside free chats.
- **Trial questions:** let free users ask each locked bot 3 questions. A preview of the value converts better than a lock icon.
- **Money Plan export (Pro):** combine what all the bots know into one PDF plan: budget, debt payoff, tax checklist, business goals.
- **Unlock bundles:** "Side-Hustle Pack" = Business Coach + Tax Bot. "Starting Out Pack" = Debt-Free Coach + Investing Coach.
- **Pay per bot vs. subscription:** test a one-time $1.99 bot unlock against the $4.99 all-access plan.
- **Caution on wording:** "inspired by Grant Cardone's strategies" still uses a real name commercially. Safer: name the *source list* in the scorecard (factual), keep names out of bot titles and ads, and always show the "not affiliated" line. Tax Bot copy should say "tax education," not "tax advice" or "CPA."

**Market check:** Ramsey Solutions already runs **SmartVestor**, a program where advisors pay to be listed as recommended "Pros." That shows advisors will pay for referrals. It also means Ramsey Solutions is a direct competitor for those advisor dollars, so it has a business reason to object to an unlicensed "AI Dave Ramsey." [^smartvestor]

---

## 5. Data sources per persona

Goal: as much public material per person as we can get.

| Source type | Example (Dave Ramsey) | Ingestion method |
|---|---|---|
| Books | *The Total Money Makeover*, *Baby Steps Millionaires* | Licensed text or our own summaries/notes (see Section 6) |
| Podcasts / radio | *The Ramsey Show* episodes | Transcribe audio, then split into chunks with episode and timestamp |
| YouTube | Ramsey Show clips | Pull transcripts |
| Articles / blog | ramseysolutions.com articles | Scrape (only where robots.txt and the site's terms allow it) |
| Known frameworks | The 7 Baby Steps, debt snowball, "no credit cards" | Hand-written "core beliefs" file per persona (highest weight) |

Every chunk keeps its **source citation** so answers can show where an idea came from.

---

## 6. Legal and compliance (must address before public launch)

The pitch says "we'll have to do a lot of SEC guidelines." That's right, and there are three risk areas. The first two are bigger than the SEC one.

### 6.1 Voice and likeness of real people (HIGHEST RISK)
- **Dave Ramsey is based in Tennessee.** Tennessee's **ELVIS Act** (effective July 1, 2024) explicitly protects a person's *voice* against unauthorized AI simulation. It covers people who distribute tools whose main purpose is producing someone's voice or likeness without permission. A live cloned Dave Ramsey voice is exactly that. [^elvis]
- Most states also recognize a **right of publicity** (no commercial use of someone's name or face without consent). Putting a real face on a card next to a $4.99 paywall is commercial use.
- **Options:**
  1. **Demo only** (competition/private): label it a prototype, don't charge, don't launch publicly.
  2. **"Inspired-by" personas:** an original character and voice that teaches the *philosophy* ("The Debt-Free Coach, built on the debt-snowball school of thought"), with no real name, face, or cloned voice.
  3. **Licensed or opt-in mentors:** real people who sign on (the creator side, Section 3.5). This is the long-term business.

### 6.2 Copyright of books and podcasts
- Books and podcast episodes are copyrighted. Building a commercial product on full copies of them is legally contested. AI-training fair-use cases are still being decided, and some book-based cases have settled for large sums. [^copyright]
- Safer path: work from public facts, short quotes, our own summaries of the ideas (ideas themselves aren't copyrightable), and licensed content. Never output long verbatim passages.

### 6.3 Securities / investment-advice rules
- Giving *personalized* investment advice for pay can make you an investment adviser under the **Investment Advisers Act of 1940**. The "publisher's exclusion" (*Lowe v. SEC*, 1985) protects *impersonal* general commentary, and a chatbot that reads your portfolio and tells you what to do moves away from that protection. [^advisers] [^lowe]
- **Paid advisor referrals** fall under the SEC **Marketing Rule** (Rule 206(4)-1). Advisors who pay for referrals must make disclosures, so sponsored slots need clear "Sponsored" labels and disclosure language. [^marketing]
- **Mitigations:** frame output as "financial opinions and education," not recommendations to buy or sell specific securities. Keep disclaimers in the quiz and in every chat. Never execute trades. Get a securities lawyer to review before charging money.

> **Bottom line:** the cheapest way to cut risk is a launch lineup of opt-in or "inspired-by" mentors, with real famous names kept to private demos until licensed. Question Q1 asks you to decide this.

---

## 7. Software stack

### 7.1 Core app
| Layer | Pick | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Fast to build, easy deploys, big ecosystem |
| Hosting | **Vercel** | Push to main = deploy; preview URL per PR |
| Database + Auth | **Supabase** (Postgres, Auth, Storage) | One service for users, profiles, memory, and file uploads |
| Vector search | **pgvector** (inside Supabase) | Keeps embeddings next to the rest of the data, no extra service |
| Payments | **Stripe** (Checkout + Billing + Customer Portal) | $4.99 subscriptions and the free-chat limit |
| Analytics | **PostHog** | Funnels (quiz → first chat → paywall), feature flags |
| Errors | **Sentry** | Catch production errors |

### 7.2 AI layer
| Job | Pick |
|---|---|
| Mentor chat (main model) | **Claude Sonnet 5.5** (`claude-sonnet-5-5`) via Anthropic API |
| Cheap background jobs (memory extraction, chunk tagging, quiz summarizing) | **Claude Haiku 5.5** (`claude-haiku-5-5`) |
| Embeddings | **Voyage AI** (Anthropic's recommended embeddings partner) |
| Podcast/YouTube transcription | **Deepgram** or **OpenAI Whisper** (batch) |
| Prompt caching | Anthropic prompt caching on each persona's large system prompt to cut cost and latency |

### 7.3 Live voice (rubric weight: 10)
| Piece | Pick |
|---|---|
| Real-time audio transport | **LiveKit** (Agents framework) or **Pipecat** |
| Speech-to-text (streaming) | **Deepgram** |
| Text-to-speech | **ElevenLabs** (streaming). Use original or licensed voices only, **no clone of a real person without consent** (Section 6.1) |
| LLM in the loop | Claude Sonnet 5.5 with streaming |
| Target | Under ~1s from end of user speech to start of reply |

### 7.4 Ingestion pipeline (per persona)
```
sources (books/podcasts/YouTube/articles)
  → fetch / transcribe (Deepgram/Whisper)
  → clean + chunk (~500–800 tokens, keep source + timestamp)
  → tag with Haiku (topic: debt, investing, real estate, business…)
  → embed (Voyage) → pgvector
  + hand-written persona_core.md (beliefs, catchphrases, hard rules)
```

### 7.5 Shared memory design
- `user_profile`: quiz output (structured JSON)
- `user_memory_facts`: short facts pulled from each chat by Haiku, with source chat, date, and a confidence score
- On every message, the app loads: profile + top-k relevant memory facts + top-k persona chunks, then sends them to Claude
- Users can view and delete their memory facts. This is part of the trust edge.

### 7.6 Eval and testing (how we prove "acts like Dave Ramsey")
- A 50–100 question test set per persona, with the answers the real person is known to give ("Should I get a credit card for points?" → Ramsey: no).
- Score with Claude as a judge plus human spot checks. Re-run on every prompt change.
- Safety tests: refuses specific buy/sell calls, keeps disclaimers, doesn't make up quotes.

### 7.7 Dev tooling
GitHub (one repo, PRs + branch protection on `main`) · GitHub Actions (lint, typecheck, eval run) · `.env.example` for keys · Claude Code for building.

**Accounts/keys to create:** Anthropic API, Voyage AI, Supabase, Vercel, Stripe (test mode), Deepgram, ElevenLabs, LiveKit Cloud, PostHog, Sentry, GitHub.

---

## 8. MVP scope (competition demo)

**Decision (v0.2):** build **one** fully working persona. Show the rest of the catalog as cards so judges see the whole business.

1. Landing page: the base bot, the 1 live persona, plus locked cards for **Tax Bot (CPA-style), Business Coach, Life Coach**, each with its source scorecard
2. Onboarding quiz → saved profile
3. Text chat with the 1 persona via the **Claude API** (full context: persona core file + retrieved sources + user profile/memory)
4. **Live voice chat** with that persona
5. Locked bots: clicking one shows its scorecard, 1–3 sample answers, and the upgrade screen
6. Free vs. paid model switch shown in the demo (Haiku 5.5 free → Sonnet 5.5 Plus)
7. "Talk to a real advisor / CPA" button (mock sponsor)
8. Paywall and upgrade flow (Stripe test mode)

Stretch: a thin second bot (e.g. Tax Bot on IRS publications only) to demo shared memory across bots.
Out of MVP: Roundtable mode, build-your-own-mentor, advisor dashboard.

---

## 9. Open questions for the founders

**Direction**
1. **Launch lineup:** real famous names (demo only), "inspired-by" original personas, or recruited opt-in creators? Which 3 faces go on the landing page?
2. **Primary user:** college students and young adults, people in debt, new investors, or aspiring business owners?
3. **What's the win condition?** Winning the competition, real paying users, or raising money / applying to an accelerator?

**Product**
4. How many free chats before the $4.99 paywall? Does voice count more than text?
5. Can a persona give specific picks ("buy VTI"), or only frameworks and principles?
6. Do personas ever disagree openly with each other (Roundtable), or just share memory quietly?
7. Web only, or is a mobile app expected?

**Business**
8. Advisor sponsorship pricing: pay per lead, per click, or a flat monthly slot?
9. For creator profiles: free to build, and do they get a revenue share?
10. Is there a mentor or advisor you could actually get to opt in for the demo? That would beat any unlicensed persona.

**Logistics**
11. What does the starter kit require (stack, submission format, deadline, judging rubric beyond "Live AI voice: 10")?
12. Who's the second builder, and what are each person's strengths (frontend, backend, AI/data, design, pitching)?
13. Budget for API costs during the build (voice is the expensive part)?

---

## 10. Repo split (DRAFT, to finalize after the starter kit and answers)

```
mentor-ai/
├── apps/web/            # Section A: product & frontend
│   ├── landing, quiz, chat UI, voice UI
│   └── Stripe billing, paywall, advisor CTA
├── services/ai/         # Section B: AI & data
│   ├── ingestion/       # transcribe, chunk, embed
│   ├── personas/        # persona_core.md + retrieval config
│   ├── memory/          # shared memory extraction + retrieval
│   ├── voice-agent/     # LiveKit/Pipecat agent
│   └── evals/           # persona fidelity + safety tests
├── packages/shared/     # types, DB schema, API contracts (both own)
└── docs/                # this file, decisions log
```

- **Section A (Builder 1): Product & Frontend.** Landing, quiz, chat and voice UI, auth, payments, advisor placements, analytics.
- **Section B (Builder 2): AI & Data.** Ingestion, RAG, persona prompts, shared memory, voice agent, evals.
- **Shared contract:** `packages/shared` defines the `/api/chat` and `/api/voice` interfaces and the DB schema, so both sides can build in parallel without blocking each other.

---

## Sources

[^smartvestor]: Ramsey Solutions, "SmartVestor" (advisor referral program; advisors pay to participate). https://www.ramseysolutions.com/retirement/smartvestor
[^elvis]: Tennessee "Ensuring Likeness, Voice, and Image Security (ELVIS) Act of 2024," Public Chapter No. 588, signed March 21, 2024, effective July 1, 2024. Office of the Governor announcement: https://www.tn.gov/governor/news/2024/3/21/photos--gov--lee-signs-elvis-act-into-law.html
[^copyright]: U.S. Copyright Office, *Copyright and Artificial Intelligence, Part 3: Generative AI Training* (pre-publication report, May 2025). https://www.copyright.gov/ai/
[^advisers]: Investment Advisers Act of 1940, §202(a)(11), 15 U.S.C. §80b-2(a)(11) (definition of "investment adviser" and the publisher exclusion). https://www.law.cornell.edu/uscode/text/15/80b-2
[^lowe]: *Lowe v. SEC*, 472 U.S. 181 (1985) (impersonal publications are excluded from the "investment adviser" definition). https://supreme.justia.com/cases/federal/us/472/181/
[^marketing]: SEC, Investment Adviser Marketing Rule, Rule 206(4)-1 (adopted Dec. 22, 2020; compliance date Nov. 4, 2022), which covers paid testimonials, endorsements, and solicitation. https://www.sec.gov/rules-regulations/2020/12/investment-adviser-marketing

> These are pointers for the founders and a lawyer. They are not legal advice. Verify links and current status before relying on them.
