# Devpost submission: copy and paste

> Fill in `[brackets]` before submitting. Due **Sun Nov 8, 10:00am ET**.
> Rule we follow: only claim what works. Voice (ElevenLabs) isn't built yet, so **don't opt into the ElevenLabs prize** unless it ships and you can say where judges can hear it.

---

## Project name
[Money Mentor (working title)]

## Tagline (≤ 200 chars)
AI money mentors that can't make up numbers. They can only choose. Budget around income that changes every month, guided by a philosophy you already trust.

## Challenge
#21 Variable-income budgeting (Student and Campus Finance track), MVP option 1: plan expenses around variable monthly income.

---

## Inspiration
Jordan is 22, works part-time and drives DoorDash. Take-home pay swings from $1,780 to $2,950 a month, and essentials cost $1,955, so a bad month means being $175 short. A financial adviser is out of budget. Generic AI chatbots are free, but they sound confident and invent numbers, and people like Jordan know it. Plenty of young adults already follow money voices they trust (Dave Ramsey, Ramit Sethi, Grant Cardone) through podcasts and books. We wanted that trusted point of view applied to *their* numbers, without trusting an AI to do math.

## What it does
1. **Screening quiz (2 minutes):** six months of take-home pay, bills, spending, debts, savings, an optional portfolio CSV, goals, and one "which statement do you agree with" question that suggests a mentor.
2. **Money snapshot**, computed in code: lowest month, average, swing, essentials, and how short you'd be in your lowest month.
3. **Coaching does the work.** Pick a coach (Budget, Debt, or Savings & Emergency Fund) and ask anything. The coach proposes up to 12 distinct options, and **every number comes from exact-cents code**, not the model.
4. **Code checks every option.** Any option with a number that isn't backed by a calculation is thrown out. The "See all options" drawer shows what was proposed, kept and dropped, and why.
5. **Your mentor directs it.** The mentor (Debt-Free, Hustle or Conscious Spender, each built from public teachings and labeled "not affiliated") **picks one option by id** and explains it in its voice, with citation chips to its source notes.
6. **Switch mentors mid-chat.** Same options, same numbers, different pick. For Jordan, the Debt-Free Mentor says "build the $1,000 starter fund first." The Hustle Mentor says "your lowest month is $175 short; expand your income." On Debt Coaching, the Conscious Spender says "kill the 24.90% card first and automate it."

Free: 3 mentors and 3 coaches. Plus, $4.99/month: all 10 of each (a real Stripe Checkout subscription, running in test mode; try card 4242 4242 4242 4242).

## How we built it
- **Backend:** the RedHawk Node 22 starter kit. Its `lib/finance.js` (BigInt cents) powers every calculation: snapshot, emergency-fund gap, snowball/avalanche payoff simulation, income gap, 50/30/20 split, cut list, sinking funds, portfolio summary.
- **Generate → validate → pick:**
  - **Coaching:** Claude **Sonnet 5.5** with JSON-schema structured output. It may only quote numbers from the calc library and must name the calcs it used.
  - **Validation:** plain code. It extracts every dollar amount and month count and matches it against the referenced calculations, then drops duplicates and options that cite unknown calcs.
  - **Mentor:** Claude **Haiku 5.5**. It picks from a fixed enum of option ids, and its persona notes are prompt-cached. If its reply contains an unverified number, the app shows the option's own text instead.
  - **Switching mentors** reruns only the pick, so it's fast (~2.5 s) and the facts can't change.
- **Resilience:** if the Claude call fails (outage, refusal, bad output), a rule-based engine answers and the reply is labeled "offline fallback." Sonnet requests also turn on Anthropic's server-side refusal fallback.
- **Frontend:** vanilla JS, no build step. The quiz renders from `config/quiz.json`, and the catalog of mentors and coaches comes from `config/catalog.json`.
- **Deploy:** a Render Blueprint (`render.yaml`). The API key lives only in Render's secret environment, and each IP gets 40 model calls per hour.

## Challenges we ran into
- **False alarms from our own number check.** On the first live run it dropped 2 of 10 good options, because the user's own APR (24.90%) and the "3 months" emergency-fund target weren't marked as quotable facts. We added them to the calc library, and the next runs kept 9/9 and 10/10.
- **Forced tool calls aren't allowed on Sonnet 5.5,** so we used JSON-schema structured outputs, and a fixed `c1`–`c12` enum for the pick so the schema stays cacheable.
- **A stray machine-wide `ANTHROPIC_API_KEY`** overrode the project key locally. We added `MENTOR_API_KEY`, which takes priority.
- **Wording.** Users confused "mentor" and "coach," so we defined them on the landing page: *Coaching does the work. Your mentor directs it.*

## Accomplishments that we're proud of
- **The model never gets the final word on a number.** Every figure on screen traces to a calculation, and the UI shows the check.
- **Switching mentors changes the advice, not the facts.** That's the core idea, and it works live.
- **30 automated tests** (18 starter + 12 ours), including:
  - payoff reconciliation to the cent
  - pick integrity: only real ids can be picked, and repick leaves the options unchanged
  - invented numbers getting rejected

## What we learned
- Splitting "who does the math" from "who has the opinion" makes an AI money product far easier to trust and to test.
- Structured outputs plus a small code validator beat asking the model to "be careful with numbers."
- Showing the check (proposed, kept, dropped) is more convincing than saying "accurate."

## What's next
- A beta with 10 young adults who have variable income
- Fuller mentors built from larger, cited source sets, plus a fidelity eval
- ElevenLabs voice
- Stripe live mode (checkout already runs end to end in test mode)
- A Plaid Investments connection instead of CSV upload
- Accounts and persistent memory
- The other 7 coaches (Tax education, Credit, Investing, Retirement…)

## Built with
`anthropic-claude-api` · `claude-sonnet-5-5` · `claude-haiku-5-5` · `node.js` · `javascript` · `html` · `css` · `render` · `redhawk-starter-kit`

---

## Required items (organizer checklist)
1. **User/problem statement:** see *Inspiration*. Young adults with variable income who can't afford an adviser and don't trust generic AI with money.
2. **Working demo:** https://mentor-ai-ahjs.onrender.com (click "Use demo profile"). Video: [YouTube/Drive link].
3. **Repository and access:** https://github.com/gituser1111221111/mentor-ai ([make it public before submitting]). Run steps are in the README: `npm ci`, put a key in `.env`, `npm run dev`, `npm test`.
4. **Data and code credits:**
   - RedHawk Builds starter kit v1.1 (finance library, CSV parser, synthetic portfolio data, server skeleton, tests)
   - Anthropic Claude API
   - Render
   - Mentor notes are short summaries of public works: *The Total Money Makeover* (Dave Ramsey), *The 10X Rule* (Grant Cardone), *I Will Teach You to Be Rich* (Ramit Sethi)
   - All user data is fictional
5. **Limitations:**
   - Educational opinion, not licensed financial, tax or legal advice.
   - Mentor fidelity hasn't been measured with an eval yet.
   - Mentors are short hand-written summaries; we're not affiliated with or endorsed by anyone named, and there are no cloned voices.
   - The coaches share one calculation library, and taxes and returns aren't forecast.
   - The store is anonymous and in-memory, and it resets on restart.
   - No real bank or brokerage connection; payments run in Stripe test mode, so no real money moves.
   - The number check matches exact values: it can't catch wrong reasoning that uses correct numbers.
   - Voice isn't built.

---

## 2-minute table pitch (script)
**0:00–0:15, the user.** "This is Jordan. 22, part-time plus DoorDash. Income swings from $1,780 to $2,950. Can't afford an adviser, and doesn't trust ChatGPT with money, because it makes numbers up."

**0:15–0:35, the idea.** "We split the job in two. *Coaching* does the work: every number is computed in code. *Your mentor* directs it, and it's built from a money philosophy you already trust. The mentor can't invent a number. It can only choose."

**0:35–1:25, demo.** Click "Use demo profile."
1. Snapshot: "Lowest month, $175 short."
2. Ask: "My hours got cut. Pay off my card or save first?"
3. Read the Debt-Free answer, and point at the calc card and a citation chip.
4. Open "See all options" and point at the number check line (proposed, kept, dropped).
5. Switch to Hustle Mentor: "Same options, same numbers, different advice, in 2 seconds."

**1:25–1:45, trust.** "30 tests: payoff math reconciles to the cent, and when a model invents a number, the code drops it. If Claude goes down, the app still answers and says so."

**1:45–2:00, business.** "Free: 3 mentors and 3 coaches. $4.99 a month unlocks all 10 of each. Next: a 10-person beta with gig workers and students."

## Likely judge questions
- **"Is this Dave Ramsey?"** No. It's a mentor built from summaries of his public teachings, labeled not affiliated, never speaking as him, and with no cloned voice.
- **"How do you stop hallucinated numbers?"** The model can only quote numbers from code-computed calculations. A validator drops any option that doesn't follow that rule, and the drawer shows every drop.
- **"Is this financial advice?"** It's education. There's a disclosure on every answer, and the app never claims to be a licensed adviser.
- **"Why would someone pay $4.99?"** Less than one coffee-shop visit a month, for advice from the philosophy you already follow, applied to your real numbers. An adviser costs hundreds of dollars.
- **"What if the model refuses or fails?"** Anthropic's server-side fallback handles refusals first. If the call still fails, our rule-based engine answers, labeled "offline fallback."

## Demo video shot list (backup, ≤ 2 min)
1. Landing page → the explainer (3 s pause)
2. Quiz: show 3 questions, then "Use demo profile"
3. Snapshot card
4. Ask the hours-cut question → answer + calc card + citation chip
5. "See all options" drawer with the number check
6. Switch to Hustle Mentor, then to Conscious Spender
7. Switch the coach to Debt Coaching and ask "How fast can I get rid of my debt?"
8. Terminal: `npm test` → 30 pass
