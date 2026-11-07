# Design guide (v1, Nov 7)

## Direction: "a well-kept ledger"
Young adults with uneven pay who don't trust AI with money. The site should feel like a careful notebook kept by someone who reads a lot of money books: calm, specific, checkable. No fintech neon, no AI sparkle.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f4f1ea` | page background (never pure white) |
| `--ink` | `#1d1b16` | text, rules, button outlines |
| `--green` | `#1f4d3a` | the one brand color: primary buttons, "on" states, kickers |
| `--ochre` | `#a85a17` | the one accent: shortfalls, months below essentials, Plus tags |
| `--rule` | `#d8d1c1` | 1px dividers (we use rules, not shadows) |

Dark mode swaps every token (see `styles.css`).

**Type**
- **Fraunces** (serif): headlines and the mentor's voice in chat. It echoes the books the mentors come from.
- **Public Sans**: UI and body. It's plain and trustworthy.
- **IBM Plex Mono**: every number. Verified math reads like a receipt.

**Rules we keep**
- One 3px radius everywhere.
- No drop shadows, gradients or glass effects.
- No emojis or stock icon sets.
- No em dashes in copy.
- No fake testimonials. The hero sample is real output from the live app.
- Loading uses a skeleton with staged steps, not a spinner.

## Vocabulary (use exactly these)
- **Coaching** is the professional, a specialist bot that does the work and the math. Write "Budget Coaching" or "your coach."
- **Mentor** is the philosophy that *directs* the coach by choosing among verified options. Write "Debt-Free Mentor directing Budget Coaching."
- **Plus** is the $4.99/month plan. **Free** means 3 mentors and 3 coaches.
- **Number check** is the code validation. Write "number check: 9 of 9 passed."
- Never write "advisor," "financial advice," or "I am [real person]."

## Flow
Landing → quiz (13 questions, one per screen, each section says *why we ask*) → **Your numbers** (a monthly bar chart against an essentials line, plus stats) → **Choose your mentor** and **choose your coaching** → chat (rail on the left with mentors and coaches, header naming who is directing whom, answer + receipt + sources + "See all N options").

## Character art (team: 10 mentors)
Each mentor has an image slot. Until art exists, the UI shows a monogram.
1. Export each portrait at **4:5, at least 600×750**, WebP or PNG. Keep one consistent style across all 10, and use the same background tone family as `--paper-2` (`#ebe6da`) so they sit on the page.
2. **Don't make it look like the real person.** These are original characters "inspired by" a philosophy, not likenesses of Dave Ramsey, Grant Cardone and the others. This is the right-of-publicity line.
3. Save as `public/img/mentors/<id>.webp`. The ids are in `config/catalog.json` (for example `debt-free-coach`, `hustle-coach`, `conscious-spender`, `index-investor`…).
4. Set `"image": "/img/mentors/<id>.webp"` on that mentor in `config/catalog.json`. No code change is needed.

## Payments
Stripe Checkout runs in **test mode only** (`sk_test_…`). Live keys are refused in code. Without a key, the unlock button says "Unlock Plus (demo, no payment)." With a key, it redirects to Stripe and the server verifies the completed session before granting Plus.
