# Mentor Roster: Research Status

Every mentor is labeled "inspired by public teachings, not affiliated or endorsed" and is never presented as an AI version of the real person. Mentors only pick among options that code already calculated and validated. The demo focuses on the Dave Ramsey–inspired mentor. The others exist for the Plus tier and for mentor comparison.

| Mentor (catalog id) | Tier | Status | Notes | Research depth | Main sources (all opened and checked) |
|---|---|---|---|---|---|
| Dave Ramsey–inspired (debt-free-coach) | Free | Built | 59 | Full | Ramsey Solutions articles, Dave Says columns, Pew interview |
| Warren Buffett–inspired (value-investor) | Plus | Built | 32 | Full | Berkshire Hathaway shareholder letters 1986–2024, with page locators |
| Money Guy–inspired (step-by-step-planner) | Plus | Built | 34 | Full | moneyguy.com FOO guide and an episode transcript with timestamps |
| Morgan Housel–inspired (money-psychology) | Plus | Built | 28 | Full | Six Collaborative Fund essays he wrote |
| Cathie Wood–inspired (disruptive-growth) | Plus | Built | 10 | Limited | Motley Fool and Wikipedia only (third-party, "reported") |
| Humphrey Yang–inspired (money-basics) | Free | Built | 14 | Limited | Motley Fool reports of his videos |
| Vivian Tu–inspired (credit-smart) | Plus | Built | 11 | Limited | Motley Fool Q&A in her words, plus reports of her videos |
| Ramit Sethi–inspired (conscious-spender) | Free | Built-in summary only | 0 files | Not started | See postponed sources below |
| Graham Stephan–inspired (real-estate-saver) | Plus | Coming soon | 0 | Not started | See postponed sources below |
| Robert Kiyosaki–inspired (asset-builder) | Plus | Coming soon | 0 | Not started | See postponed sources below |

Every note quote is under 15 words and was machine-checked word for word against the saved page text (`research/raw/`, gitignored). Run `npm run persona:check` for Ramsey, or `node scripts/check-persona.js <id>` for any mentor. Each built mentor has `evals/<id>.json` covering credit card debt vs investing, debt order, irregular income, emergency fund vs retirement, index vs concentrated growth, real estate leverage, college vs retirement, and spending vs income. Where sources take no position, the expected answer is "say so".

## Postponed (team decision, Nov 7: demo is Ramsey-only, so no deep research now)
Sources found and saved but not turned into notes:
- **Ramit Sethi:** Motley Fool interview transcript "Ramit Sethi on Spending, Renting, and Financial Conflicts" (2023-04-29, his own words), Fool pieces on emergency savings and investing before buying a home, and Wikipedia. iwillteachyoutoberich.com blocked automated access.
- **Graham Stephan:** grahamstephan.com (thin), Fool pieces on his 2023 investment plan, early mortgage payoff and emergency funds, and Wikipedia. His newsletter (newsletter.grahamstephan.com) is not on the network allowlist.
- **Robert Kiyosaki:** Wikipedia ("Robert Kiyosaki" and "Rich Dad Poor Dad"), Fool articles on "savers are losers", plus independent critiques by Mike Norman (2006) and Morgan Housel (2014) for contested fields. richdad.com blocked automated access.

## Blocked or unavailable
ark-invest.com, richdad.com, iwillteachyoutoberich.com, morningstar.com and cnbc.com returned 403 to automated access, and humphreyyang.com failed TLS. We did not try to get around any block. No books, paid content or transcripts were copied into the repo.

## Voice
Each catalog entry has `voiceIdEnv` (for example `ELEVENLABS_VOICE_VALUE_INVESTOR`) for a future original synthetic voice. Never clone or imitate the real person. The ElevenLabs speech-to-text and text-to-speech integration lives on branch `app/voice` and is not merged here yet.
