# Read-only connection plan

Researched November 7, 2026 against provider documentation. This is a shortlist, not a claim of a completed connection or verified commercial entitlement.

## What to build first

Use a bank-data provider for budgeting, a supported read-only brokerage connection for actual holdings, and a separate market/event layer for explanations. Refreshing a price does not refresh an account. Keep `holdingsAsOf`, `priceAsOf`, `calendarAsOf`, `retrievedAt`, provider and coverage separate.

| Need | Candidate | Freshness / limits | Tonight |
|---|---|---|---|
| Spending and debt | Plaid Transactions + Liabilities | Institution-dependent fields and periodic updates; not a continuous purchase stream | Manual budget inputs; connection preview |
| Brokerage holdings | Plaid Investments | At least daily on market days; optional on-demand refresh; exact institution coverage must be tested | CSV import; connection preview |
| Brokerage alternative | SnapTrade read-only | Daily or on-request supported holdings by plan; broker-dependent freshness; cached transactions are delayed | Connection preview |
| Quotes and earnings schedule | Existing Finnhub provider / Alpha Vantage fallback | Check endpoint entitlement and exchange licensing; source dates can differ from retrieval time | Existing configured adapters or explicitly dated snapshot |
| Company filings | SEC EDGAR | Submission history and XBRL facts update as filings disseminate; not an earnings-call transcript service | Existing server-side adapter if configured |
| Earnings audio/transcripts | Quartr API | Licensed event/audio/transcript content; provider access and cost required | Preview; no transcript fabrication |

Plaid documents periodic bank activity and investment refreshes. On-demand refresh is a separate capability; institution and product support must be checked. [Financial Insights](https://plaid.com/docs/financial-insights/), [Investments](https://plaid.com/docs/investments/).

SnapTrade distinguishes read-only connections from trade-enabled ones. Its Real-time holdings plan fetches supported brokerage data on request; Daily caches holdings. It recommends active-view polling no more often than every ten minutes per account. Transactions remain daily and delayed on both plans. [Connection access](https://docs.snaptrade.com/reference/Connections/Connections_detailBrokerageAuthorization), [Freshness plans](https://docs.snaptrade.com/docs/realtime-data), [Sync status](https://docs.snaptrade.com/docs/syncing).

Finnhub's earnings-calendar API is the existing candidate for scheduled events. Entitlements, redistribution terms and actual successful responses must be verified before advertising live coverage. [Earnings calendar](https://finnhub.io/docs/api/earnings-calendar).

SEC provides public company submissions and XBRL financial data without API keys, with access-policy requirements and server-side requests. [EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces).

Quartr describes live/historical earnings audio, transcripts, filings and presentations. Evaluate a licensed API agreement before implementing transcript ingestion. [Quartr API](https://quartr.com/products/quartr-api).

## Implementation sequence

1. Authenticated, account-isolated durable storage; consent, deletion and revocation. Retain CSV/manual alternatives.
2. Test representative supported institutions in the chosen provider flow. Never request broker passwords in a Mentor Labs form. Use read-only scope only.
3. Queue verified webhooks, deduplicate, reconcile snapshots and pending/posted transactions, then rerun the user's saved guideline version. Missing data stays unknown.
4. Map symbols/security identifiers and currencies explicitly. Quotes plus confirmed quantities can support a separately labeled valuation; imported values alone cannot.
5. Notify only after opt-in and a material change, with frequency/pause controls. Tonight has foreground market refresh only, not background account monitoring or notifications.
6. Price the actual provider agreement, linked-account count, refreshes and trial cohort before production. The customer offer remains one month free then $2.99/month; provider plans do not become customer tiers.

## Earnings explanation flow

An upcoming event card gives the holding, scheduled date, source and age. “Explain this event” prepares a question for the selected teacher. The backend retrieves available research context using the same holdings and saved metrics. Explain observed facts, a source-supported principle, possible interpretations and questions to investigate. A future call has no completed transcript; a threshold breach is not a sell signal. Do not imply the public figure personally reviewed the account or currently holds the generated opinion.

Tonight's optional five-minute foreground refresh only re-requests the existing market-context layer (which has its own caches). It does not poll SnapTrade or Plaid, and must not be reused as a brokerage polling policy without provider-specific changes.
