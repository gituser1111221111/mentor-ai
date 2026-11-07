# Design guide (v4, Nov 7)

## Direction

Mentor Labs takes broad cues from investing sites such as Autopilot, Betterment, Wealthfront, and Public: prominent product context, confident typography, and clear next steps. It has its own editorial look with warm paper, evergreen, and mentor portraits.

The hero leads with trust and the free Ramsey-inspired chat. The landing page explains the three-step flow, the sourced-method idea, ten visible mentor perspectives, sixteen agent specialties, and the context hub. The intake is optional and six screens. The chat opens immediately for general questions; a personal snapshot follows the intake.

## System

| Token | Value | Use |
|---|---|---|
| `--paper` | `#faf9f5` | Page canvas |
| `--paper-2` | `#edf2eb` | Quiet surfaces |
| `--ink` | `#17332b` | Primary text |
| `--green` | `#155c49` | Primary action and selected state |
| `--rule` | `#d9e1d8` | Borders and separators |
| `--ochre` | `#a84032` | Shortfalls and errors |

- **Newsreader** is the editorial headline face. **DM Sans** handles interface copy. **Inter** supplies tabular numbers.
- The hero uses a dark evergreen field; internal app screens return to warm paper and white cards.
- Buttons are rounded pills. Portrait cards, snapshot panels, and form choices have softer corners.
- Keep visible focus rings, clear selected states, readable contrast, and reduced-motion support.
- The landing page is responsive. Mentor images retain a 4:5 crop and load lazily below the fold.

## Portraits

`public/img/mentors/<id>.webp` contains ten optimized, AI-generated editorial likenesses. The Step-by-Step Planner image shows both Brian Preston and Bo Hanson. The image paths live in `config/catalog.json` and appear on the landing page, mentor chooser, and chat rail. Portraits are 640×800 WebP assets, about 32–67 KB each.

Always describe them as AI-generated likenesses. Every card names the real figure whose public teaching inspired the mentor. The app must clearly state that these figures are not affiliated with or endorsing the product. A portrait is visual identification; it does not turn the mentor into the person or authorize a voice clone.

## Product language

**Agents** have a specialty, such as debt consolidation, portfolio review, equity research, tax, or business coaching. A **mentor** brings a distinct public-teaching perspective to that specialty. All agent cards use a simple `+` badge. Ramsey-inspired guidance with budgeting support is the sole working flagship; other agents and mentors belong to the planned Plus library. If selected, they explain that they are being built. The long-term corpus and hundreds-of-agents language must be framed as a vision until implemented. The context hub must distinguish document and link previews from the functional CSV import.


## Mentor-first homepage (Nov 7, current)

The first screen is the mentor library, followed by how mentors are built,
the specialist library, how agents are built, a compact API directory, and pricing.
Conversation examples, evidence, context, and FAQ follow pricing.
No section rail or custom scroll navigation. Keep the native browser scrollbar.
Header and mentor-library actions open the existing context hub.

Free mentor and agent cards use sage green; Plus uses warm gold with text badges.
API names, provider marks, and short status labels render from catalog.dataSources.
Provider logos/site icons are hosted locally; provenance is in public/img/providers/SOURCES.md.
The thousands-of-hours research library is an ambition, not a claim about processed material.
Use existing project components and tokens; the 21st CLI is unavailable on this host.
