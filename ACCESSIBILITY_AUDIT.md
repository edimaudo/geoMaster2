# geoMaster accessibility and visual consistency audit

Updated: 2026-11-26

## Changes in this revision

- Aligned the five landing-page game choices to one shared, centered text block. The game title and its description use identical alignment and width rules across Daily Expedition, Country, Flag, Capital and Guesser.
- Changed the Daily Expedition personal-best placeholder from `Not set` to an em dash, matching the four quiz-mode placeholders. A completed expedition score continues to display in points.
- Removed the visible `Question N / 7` line from quiz gameplay. The numbered steps are now the only visible progress indicator, matching Daily Expedition. The ordered list retains an accessible name and marks the current step with `aria-current="step"`.
- Kept the game type in the centered header only. The Country-mode prompt now says `Choose the flag that matches` before the country name, and the duplicate `Game: Country` result-detail row was removed.
- Standardized the button design across the landing mode choices, compact feed CTA, answer choices, primary actions, secondary actions, bottom navigation, Settings, segmented controls, record actions and map controls. The shared design uses Inter, a common 14px corner radius, consistent tactile depth/pressed feedback and visible keyboard focus. Mode buttons retain distinct colours to identify the game.
- Increased light-mode muted-text contrast and corrected feedback, timer warning/critical, clue accent and result-score colours for the corresponding theme.
- Kept the same component structure and theme variables for light and dark modes.
- Added `npm run audit:contrast`, a dependency-free, repeatable contrast audit.

## WCAG contrast results

Ratios are computed from the authored sRGB foreground/background colours using the WCAG relative-luminance formula. Normal text requires at least 4.5:1. Focus indicators and relevant component boundaries are checked against a 3:1 target.

### Landing-page mode labels and descriptions

Descriptions inherit the exact same foreground as their mode title, with no opacity reduction.

| Mode | Text | Button fill | Contrast | WCAG AA |
|---|---|---|---:|---|
| Daily Expedition | `#FFFFFF` | `#5242B8` | 7.42:1 | Pass |
| Country | `#FFFFFF` | `#1F5E9C` | 6.69:1 | Pass |
| Flag | `#FFFFFF` | `#A83D2F` | 6.22:1 | Pass |
| Capital | `#FFFFFF` | `#5A439F` | 7.67:1 | Pass |
| Guesser | `#26233A` | `#E7B64C` | 8.09:1 | Pass |

### Primary and secondary buttons

| State | Text / surface | Contrast | WCAG AA |
|---|---|---:|---|
| Primary normal | `#FFFFFF` / `#4F42B7` | 7.51:1 | Pass |
| Primary hover | `#FFFFFF` / `#40349F` | 9.50:1 | Pass |
| Secondary, light | `#29273C` / `#FFFDF8` | 14.25:1 | Pass |
| Secondary, dark | `#FBFAFF` / `#272741` | 13.92:1 | Pass |
| Correct answer, light | `#17354B` / `#EAF4FA` | 11.42:1 | Pass |
| Correct answer, dark | `#F5FAFF` / `#1E3B55` | 11.04:1 | Pass |
| Wrong answer, light | `#4C201C` / `#FFF0ED` | 12.37:1 | Pass |
| Wrong answer, dark | `#FFF7F5` / `#4B292E` | 12.00:1 | Pass |

### Theme text and surfaces

| Theme | Pair | Contrast | WCAG AA |
|---|---|---:|---|
| Light | Main text `#29273C` on page `#F5F1E9` | 12.86:1 | Pass |
| Light | Muted text `#53516A` on surface `#FFFDF8` | 7.50:1 | Pass |
| Light | Muted text `#53516A` on secondary surface `#EEE9DF` | 6.30:1 | Pass |
| Dark | Main text `#FBFAFF` on page `#19192D` | 16.60:1 | Pass |
| Dark | Muted text `#C6C3D6` on surface `#272741` | 8.38:1 | Pass |
| Dark | Muted text `#C6C3D6` on secondary surface `#343451` | 6.94:1 | Pass |

### Feedback, timer and progress

| State | Pair | Contrast | WCAG AA |
|---|---|---:|---|
| Correct feedback, light | `#175D85` on `#FFFDF8` | 7.02:1 | Pass |
| Correct feedback, dark | `#8DCEF4` on `#272741` | 8.44:1 | Pass |
| Incorrect feedback, light | `#A4332B` on `#FFFDF8` | 6.69:1 | Pass |
| Incorrect feedback, dark | `#FFAAA1` on `#272741` | 7.93:1 | Pass |
| Timer warning, light | `#8A5B0A` on `#FFFDF8` | 5.77:1 | Pass |
| Timer warning, dark | `#FFD078` on `#272741` | 10.01:1 | Pass |
| Timer critical, light | `#A4332B` on `#FFFDF8` | 6.69:1 | Pass |
| Timer critical, dark | `#FFAAA1` on `#272741` | 7.93:1 | Pass |
| Completed step number | `#FFFFFF` on `#1F5E9C` | 6.69:1 | Pass |
| Current step number | `#FFFFFF` on `#5242B8` | 7.42:1 | Pass |
| Upcoming step, light | `#53516A` on `#EEE9DF` | 6.30:1 | Pass |
| Upcoming step, dark | `#C6C3D6` on `#343451` | 6.94:1 | Pass |

### Focus indicators and control boundaries

| Theme | Pair | Contrast | WCAG 2.2 target |
|---|---|---:|---|
| Light focus | `#4939B5` against `#F5F1E9` | 7.35:1 | Pass (3:1) |
| Dark focus | `#B7AFFF` against `#19192D` | 8.69:1 | Pass (3:1) |
| Light button outline | `#29273C` against `#F5F1E9` | 12.86:1 | Pass (3:1) |
| Dark button outline | `#F4F0FF` against `#19192D` | 15.39:1 | Pass (3:1) |

Run the deterministic colour check with:

```sh
npm run audit:contrast
```

The script currently reports 35 of 35 authored colour-pair checks passing.

## Scope and limitations

This report documents source-level colour-pair calculations and the design changes in this revision. It is not a complete WCAG 2.2 AA conformance certification. A complete audit still requires runtime tests of all screens and states, keyboard-only operation and focus order, screen-reader announcements, 200% and 400% zoom/reflow, map interactions, reduced motion, error states and manual testing with assistive technology. The full Vite build and project typecheck have not been run because dependencies are not installed in this environment; source syntax and CSS parsing were checked separately.
