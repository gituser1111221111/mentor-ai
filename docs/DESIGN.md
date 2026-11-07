# Design guide (v2, Nov 7)

## Direction

The interface uses a spacious, monochrome product style inspired by the Autopilot reference the project owner provided. It keeps the product's existing quiz, snapshot, mentor selection, and coaching flow. The name and monogram are temporary.

The landing page begins with a centered app mark, one direct headline, a short explanation, and two actions. A row of CSS-built phone previews shows the product's actual concepts: mentor choice, a sample lowest-month snapshot, and coaching. The previews are illustrative; real values and recommendations remain in the application screens.

## System

| Token | Value | Use |
|---|---|---|
| `--paper` | `#ffffff` | Primary canvas |
| `--paper-2` | `#f5f6f7` | Quiet surfaces |
| `--ink` | `#17191c` | Text and primary controls |
| `--rule` | `#e4e6e8` | Borders and separators |
| `--ochre` | `#a83434` | Shortfalls and errors |

- **Inter** is used for headings and numerical emphasis. **DM Sans** is used for interface copy.
- Buttons are rounded pills; cards and inputs have softer corners. Focus rings remain visible.
- The landing sections alternate white and soft gray. The quiz, snapshot, chat, and dialogs use the same type, color, and control styling.
- At small widths, the preview row shows three overlapping phones. The page has no horizontal scrolling; the chat mentor rail scrolls within its own area.
- Decorative phone previews are hidden from screen readers as individual pieces and described by the gallery label. The functional app remains keyboard accessible.
- Reduced-motion users do not get hover transforms or animated scrolling.

## Product language

**Coaching** is the specialist that computes options. A **mentor** chooses among those verified options using a stated philosophy. A different mentor can choose differently without changing the numbers. Avoid suggesting that any mentor is the real person who inspired it.

## Character art

The product currently uses monograms for mentor cards. If portraits are added, use original characters in one consistent style and do not use a real person's likeness. Export each at 4:5, at least 600×750, then set its path in `config/catalog.json`.
