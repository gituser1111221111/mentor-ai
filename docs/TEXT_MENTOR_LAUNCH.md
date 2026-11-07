# Text mentor launch: Buffett and Wood

Reviewed 2026-11-07. This change adds perspective and conversation support, not an equity research engine or new financial models.

## Available now

- `value-investor`: Warren Buffett; 44 notes across 19 sources (18 primary letters and one existing secondary article), 19 evaluation scenarios.
- `disruptive-growth`: Cathie Wood / ARK; 25 primary-source notes across 8 sources, 18 evaluation scenarios.
- Both are live, free text previews. Ramsey remains the only voice-enabled mentor. Seven other mentor perspectives remain planned.

Buffett's existing research was retained and expanded with 12 company-analysis notes. Wood's 10 thin third-party notes were replaced by primary-source summaries and expanded to 25. Scenario files are review rubrics, not a claim that all scenarios have been run against a live model. These are curated prompt context and source notes, not fine-tuned models, exhaustive archives, or thousands of hours of training data.

## Research basis and corrections

Buffett additions: [1986 owner earnings and allocation](https://www.berkshirehathaway.com/letters/1986.html), [1989 business quality](https://www.berkshirehathaway.com/letters/1989.html), [1992 growth and value](https://www.berkshirehathaway.com/letters/1992.html), [1996 competence](https://www.berkshirehathaway.com/letters/1996.html), [2007 moats and capital requirements](https://www.berkshirehathaway.com/letters/2007ltr.pdf), [2011 repurchases](https://www.berkshirehathaway.com/letters/2011ltr.pdf), and [2013 ownership and indexing](https://www.berkshirehathaway.com/letters/2013ltr.pdf).

Wood additions: [investment process](https://www.ark-invest.com/investment-process), [scoring criteria](https://helpcenter.ark-funds.com/arks-investment-process), [philosophy](https://helpcenter.ark-funds.com/what-is-arks-investment-philosophy), [learning curves](https://www.ark-invest.com/wrights-law), [FAQ](https://www.ark-invest.com/faq), [Wood's dated 2024 letter](https://europe.ark-funds.com/wp-content/uploads/2024/07/ARK-Invest-What-We-Do-A-Letter-To-Investors.pdf), [public model documentation](https://github.com/ARKInvest/ARK-Invest-Tesla-Valuation-Model), and [updated model methodology](https://www.ark-invest.com/articles/valuation-models/arks-expected-share-price-for-tesla-2031).

Corrections: growth and value are not opposites in Buffett's framework; ARK explicitly incorporates valuation; model horizon and holding horizon are different concepts. Company research is permitted without turning the persona into a personalized stock recommender. Institutional ARK research is attributed to the company, and historical examples are dated. Application safeguards and synthesized research questions are marked as such, not invented investor doctrine. All source-specific records, locators and limits live in each persona's `sources.json` and `notes/`.

## Integration boundary for the equity research work

Use existing persona IDs `value-investor` and `disruptive-growth`. `loadPersona(id)` supplies core and note material to the verified-option picker. Text conversation now receives bounded, persona-specific research context and returns only validated source IDs as citations. The general-money prompt no longer hardcodes Ramsey. Qualitative research-framework questions can be answered without requiring a budget profile. Numerical recommendations retain the existing validation flow.

This mentor implementation adds no agent capability, data connector or calculator; the merge preserves the separately developed market integration. The concurrent live-financial-data change landed during this task and was merged intact; equity and portfolio agents are now live through that upstream work. Retain the same persona IDs and keep company facts, as-of dates, units and verified calculations separate from interpretation. Never let a perspective modify verified input facts, claim live market access without a tool result, or use the historical model examples as current recommendations.

## Validation

116 automated tests passed, including free access for the new mentors, general-prompt identity isolation, bounded source retrieval, citation filtering, and voice endpoint rejection for text-only mentors. Both persona data checkers pass. Browser checks covered direct card entry, switching all three live mentors, voice button visibility, and a 390-pixel mobile layout.
