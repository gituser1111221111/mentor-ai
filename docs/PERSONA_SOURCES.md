# Persona Sources Report: Debt-Free Coach

Built from Dave Ramsey's public teachings. Not affiliated with or endorsed by him.

Research date 2026-11-07. Pages were downloaded to `research/raw/` (gitignored, never committed). Notes are written in my own words. Each note has at most one quote under 15 words, and a script checked every quote word-for-word against the saved page text before the note was written. Run `npm run persona:check` to re-validate the data.

## What was collected

- 59 notes in `personas/debt-free-coach/notes/`
- 32 sources in `sources.json`, every one cited by at least one note
  - 18 first-party articles (Tier 1, ramseysolutions.com)
  - 10 "Dave Says" syndicated columns (Tier 2, first-person letters answered by Dave Ramsey)
  - 1 interview transcript (Tier 3, Pew Charitable Trusts "After the Fact" episode 38, with clear speaker labels)
  - 3 critiques (Tier 4, used only in `contested` fields, never as Ramsey's view)
- 0 books, 0 podcast episodes, 0 tweets, 0 forum posts
- 28 eval questions in `evals/debt-free-coach.json`

Suggested honest UI line: "Built from 29 public Dave Ramsey sources (18 articles, 10 columns, 1 interview), checked against 3 independent critiques."

### Byline policy (approved by the team on 2026-11-07)

Ramsey Solutions articles carry a company byline ("Ramsey Solutions"), not Dave Ramsey personally. They are first-party and present his plan, so their notes use `speaker: Dave Ramsey` and add a `byline` field that shows the real byline. Articles bylined by co-hosts (Rachel Cruze, George Kamel, Jade Warshaw) were rejected under the speaker rule, even on ramseysolutions.com. The "Dave Says" columns and the Pew interview are Dave Ramsey speaking in first person.

## Coverage by topic (primary topic per note)

| Topic | Notes | Target | Note IDs |
|---|---|---|---|
| Budgeting and irregular income | 20 | 12 | 001 to 020 |
| Debt and the snowball | 8 | 8 | 021 to 028 |
| Emergency fund | 7 | 5 | 029 to 035 |
| Baby Steps order | 6 | 5 | 036 to 041 |
| Investing and retirement | 7 | 5 | 042 to 048 |
| Credit cards, cars, student loans | 8 | 5 | 049 to 057 (053 removed) |
| Home buying | 3 | none | 058 to 060 |

Challenge 21 notes (variable income, shortfall months, gig and commission pay) are 001, 002, 004, 005, 007 to 012, 014, 016, 017, 020, 026, 034.

## What I could not find or reach

- Books. Skipped by rule. No legal full text.
- Tweets and X posts. Skipped by rule. The API is paid and scraping breaks the terms.
- Forums. Skipped by rule. There is no official Ramsey forum.
- Podcast transcripts. podcasts.happyscribe.com and www.tapesearch.com both returned HTTP 403 to automated requests, so there are no episode notes and no timestamps. The only Tier 3 source is the Pew transcript.
- Tip and server income. I found no first-party page or column specifically about budgeting restaurant tips. Tip income is covered through the general irregular-income notes (001, 005) and the commission notes (007 to 009). The eval question on tips (q03) relies on those.
- The 8 percent retirement withdrawal rule. It is discussed in Kitces and The Motley Fool, but I did not open a Ramsey source stating it, so there is no note for it.
- Original "Dave Says" dates on CBN. All three cbn.com column pages show 2022-12-10, which looks like a site migration date. These notes record it as "page date 2022-12-10 (original column date not shown)".
- Baby Steps page date. The page at /dave-ramsey-7-baby-steps-b25070 shows no date. Recorded as "undated (accessed 2026-11-07)".
- Debit card fraud protection. Ramsey's column claims debit cards have the same fraud protection as credit cards. I found no independent source to confirm or dispute it, so the team dropped the note (formerly 053). Note IDs were not renumbered, so 053 is intentionally missing.

## Rejected sources

Co-host bylines on ramseysolutions.com (speaker rule):
- /budgeting/how-to-win-with-money-in-7-easy-baby-steps (Rachel Cruze, written in her first person)
- /budgeting/budget-percentages (Rachel Cruze)
- /budgeting/envelope-system-explained (Rachel Cruze)
- /budgeting/how-to-budget-money-with-low-income (Rachel Cruze)
- /debt/should-i-pay-off-my-car-early (Rachel Cruze)
- /debt/the-debt-free-difference (Rachel Cruze)
- /real-estate/how-much-house-can-i-afford (Rachel Cruze)
- /real-estate/tips-for-first-time-home-buyers (Rachel Cruze)
- /saving/quick-guide-to-your-emergency-fund (Rachel Cruze)
- /saving/stop-the-panic-sinking-fund (Rachel Cruze)
- /budgeting/how-to-make-a-zero-based-budget (George Kamel)
- /debt/how-the-debt-snowball-method-works (George Kamel)
- /budgeting/stop-living-paycheck-to-paycheck (Jade Warshaw)
- /saving/side-hustle-ideas (Jade Warshaw)
- /debt/how-to-pay-off-student-loans-quickly (Jade Warshaw)

Could not retrieve the column text:
- www.ktsa.com "Dave Says" pages. One page loaded but served only site navigation, and two returned HTTP 403.
- www.cullmantimes.com "Dave Says" column. The network proxy refused the connection.
- podcasts.happyscribe.com and www.tapesearch.com. HTTP 403.

Not opened (duplicates or outside scope):
- www1.cbn.com, www2.cbn.com and secure.cbn.com copies of columns. These are mirror hosts. I used cbn.com originals where they existed and skipped the rest.
- help.ramseysolutions.com support articles. These are company policy, not teaching.

Opened, first-party and usable, but not cited, so not counted:
- /budgeting/pay-yourself-first-budgeting, /debt/the-truth-about-car-payments, /saving/pay-cash-for-car (overlapped with notes already written)
- Dave Says "Show Him the Numbers" (marriage topic, off scope), "Control Your Mind and Money" (cut to stay within 60 notes), "Are Debit Cards Safe for Online Purchases?" (2022-11-28, its only note was dropped because the fraud-protection claim could not be verified), and CBN "Airline Miles and Credit Cards" (overlapped with the credit card points column)

Content farms. I did not open or cite joingerald.com, ourstate.com, fightcancer.org, blogspot reposts, GOBankingRates, Yahoo or AOL rewrites. None appeared in the sources I needed.

## Contested claims

| Note | Ramsey's stated view | Disputed by |
|---|---|---|
| 022, 024 | Snowball (smallest balance first) over avalanche | Kitces (Tharp, 2021) on math. Wikipedia "Debt snowball method" cites studies on both sides |
| 038, 039 | Pause investing, including employer match, until debt-free with a full emergency fund | The Motley Fool (Hartill, 2020), item 1 |
| 044 | Actively managed growth stock funds over index funds | The Motley Fool, item 2 |
| 045 | 12 percent average return | The Motley Fool, item 3 (average vs. compound growth, inflation, about 7 percent real per Shiller). Kitces calls it widely disliked and defends it only as motivation |
| 057 | College without borrowing | Kitces, section on student loans (unrealistic for expensive professional degrees) |

Internal tension, not an outside dispute. Note 001 (irregular income article) says budget from the lowest month. Note 007 (commission income article) says the absolute lowest month can be too conservative and a realistic floor is acceptable. `core.md` resolves this by defaulting to the lowest month and allowing the floor only for commission pay with at least six months of history and a clear outlier.

## Hard-rule compliance

- Every note's speaker is Dave Ramsey. The script rejects anything else.
- No Tier 4 source is used as Ramsey's view. The script enforces tiers 1 to 3 for note sources and tier 4 for contested sources.
- No full articles, transcripts or book text are committed. `research/raw/` is gitignored.
- No photos of Dave Ramsey are downloaded or referenced.
- `core.md` says the persona never supplies return numbers and is never written as Ramsey in the first person.
