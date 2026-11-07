# Design guide (v3, Nov 7)

## Direction

Mentor AI takes broad cues from investing sites such as Autopilot, Betterment, Wealthfront, and Public: prominent product context, confident typography, and clear next steps. It has its own editorial look with warm paper, evergreen, and mentor portraits. The name and monogram remain temporary.

The hero pairs a concise explanation with a featured mentor portrait and an illustrative snapshot from the demo profile. The landing page then explains the three-step flow, presents all mentors with visible faces, shows the coaching specialties, and answers common questions. The existing quiz, snapshot, mentor selection, and chat flow remain intact.

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

**Coaching** is the specialist that computes options. A **mentor** chooses among verified options using a stated philosophy. A different mentor can choose differently without changing the numbers. Keep the distinction clear in the hero, mentor cards, and chat header.
