# Demo deployment: credentials and Render setup

Audit date: November 7, 2026 (branch `fix/demo-reliability-audit`). No live provider call was verified from the audit environment: it had no API keys and its network blocked every provider host except Anthropic.

## Minimum credentials

| Variable | Needed for | Required for demo |
|---|---|---|
| `MENTOR_API_KEY` (or `ANTHROPIC_API_KEY`) | AI mentor chat, input extraction | Yes |
| `ELEVENLABS_API_KEY` | Voice input and spoken answers | For voice |
| `ELEVENLABS_VOICE_DEBT_FREE_COACH` | Ramsey-inspired mentor's voice ID | For voice (or name an account voice exactly "Dave Ramsey") |
| `FINNHUB_API_KEY` | Live quotes, earnings dates, ratings, news | Optional |
| `FRED_API_KEY` | Live rates and unemployment | Optional |
| `SEC_USER_AGENT` | SEC filing links (no key, identifying text only) | Optional |
| `ALPHA_VANTAGE_API_KEY` | Quote fallback | Optional |

Without the market keys, portfolio prices and events come from `data/market/snapshot.json` and are labeled "snapshot" with its date. A market refresh now also says how many prices are snapshot values and why.

Not used by the app: Supabase (`SUPABASE_*`), LlamaParse (`LLAMA_CLOUD_API_KEY`), FDIC, Stripe and Plaid. Supabase and LlamaParse serve only the starter's `/api/teams`, `/api/datasets` and `/api/documents` routes, which the frontend never calls, and now load only when one of those routes is hit. FDIC, Stripe and Plaid helpers are not wired to any route.

## Render steps

1. Render Dashboard > the `mentor-ai` service > Environment.
2. Add `MENTOR_API_KEY` with the Anthropic key. Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_DEBT_FREE_COACH` for voice. Add any market keys you have.
3. Confirm `HOST` is `0.0.0.0` (render.yaml sets it).
4. Save, which redeploys. Then check, in a browser:
   - `/api/health`: `mentorConfigured` and `voiceConfigured` should be `true`. These are booleans only; they show a value is set, not that the provider accepted it.
   - `/api/config`: `engine` should be `live`, and `voice` should be `true` once the voice ID resolves.
   - `/api/market/status`: which market sources are configured.
   - Ask one budgeting question and press Listen once. That is the only real check that the keys work.

If the service was created from the Blueprint, a later Blueprint sync will list the new `sync: false` entries in render.yaml and ask for values. Values already set in the dashboard are not overwritten.

## Sessions

Each browser gets an anonymous id in `localStorage`. Profile, budget, cash cushion goal, imported holdings, guidelines and chat history are stored on the server by that id in `.data/store.json`, so they survive navigation and page refreshes. Lesson progress and the chosen mentor stay in the browser. No API key ever reaches the browser.

On Render's free plan the disk is reset on every deploy and restart, and an idle free service sleeps after about 15 minutes. After that, demo sessions start empty. For the demo, open the site a few minutes early and avoid redeploying during the presentation. A paid instance with a disk and `STORE_FILE=/var/data/store.json` keeps sessions, but that stores financial details in plain JSON tied to an anonymous id, which needs authenticated accounts and encryption before real users.
