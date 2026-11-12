# Mentor Labs

AI teachers grounded in researched public perspectives help users learn while working through budgeting, debt, investments and future planning. Financial freedom is a goal, not a promised result. Named public figures do not participate in or endorse the conversations.

## Current experience

- The original teacher chat screen remains visible. Visitors can type a question; Send opens a short $4.99/month payment-coming-soon dialog. Chat and voice API responses are paused. The learning guide and demo Budget/Portfolio workspace remain accessible.
- Compact expandable sections using the existing visual design.
- Thirteen optional Barone Investment Group learning modules: reading, outcomes, practice checklists, browser-local progress and a teacher-discussion handoff.
- Conversation paths and specialist tools are paused pending paid membership enrollment; unbuilt capabilities remain previews.
- Monthly budget builder, cash-cushion goal, portfolio imports, user-approved review metrics, explanation pop-ups and isolated exact-cent what-if comparisons.
- Dated holdings quotes and upcoming earnings cards, on-demand or optional foreground refresh. See [connection research](docs/CONNECTION_RESEARCH.md) for the read-only provider roadmap.
- Documents remain saved context until their facts are confirmed through structured input. Voice is paused with chat.

Intended chat offer: **$4.99/month**. Payment enrollment is coming soon; Checkout is disabled. No one can pay or start a trial in this demo.

## Development

Requires Node 22+. Run npm ci, copy .env.example to .env, and run npm run dev. The app listens on http://127.0.0.1:4180. Run npm test for offline checks.

MENTOR_API_KEY (or ANTHROPIC_API_KEY) enables generation. Without a key, chat reports unavailable. MENTOR_ENGINE=mock explicitly enables local test responses; MARKET_LIVE=0 disables market network calls for offline testing. Provider configuration is not evidence of successful retrieval. Never commit .env.

The Node server serves vanilla HTML/CSS/JavaScript. Financial tools use exact cents; generated options pass numeric checks before a researched perspective explains them. Session data uses a single-process anonymous store, not authenticated cross-device persistence. Production needs durable storage, identity and reviewed service boundaries.

See [the current pivot specification](docs/MENTOR_LABS_PIVOT.md) for provenance, capability gaps, cost measurement and release decisions. Older hackathon documents describe previous versions. The Render site tracks main. This change does not enable billing, account connections, trades or notifications.
