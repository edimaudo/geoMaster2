# geoMaster accessibility contrast review

Date: 2026-11-25

## Changes in this revision

- Removed the visible landing-page `Choose a Game` heading and its explanatory line. A visually hidden `geoMaster games` level-one heading remains for assistive technology; the visible wordmark leads directly into the five game choices.
- Replaced the mode-button colour pairs with explicit foreground and background colours. Guesser now uses dark text on a gold background rather than the low-contrast light/lavender text treatment.
- Removed opacity from the mode descriptions so small text has the same contrast as each mode title.
- Kept the page surfaces and neutral text theme-aware in both light and dark themes.
- Added a visible focus outline for buttons and a high-contrast inset focus indicator for the coloured mode buttons.
- Underlined the text-only Clear records action so it is not identified by colour alone.
- Strengthened the Settings button boundary in both themes.

## Contrast results

Ratios below were calculated from the authored sRGB CSS colours using the WCAG relative-luminance formula. Normal text requires at least 4.5:1 under WCAG 2.2 SC 1.4.3. Relevant control boundaries and focus indicators require at least 3:1 under SC 1.4.11 and SC 2.4.11.

### Mode button text

| Mode | Text / background | Contrast | Result |
|---|---|---:|---|
| Daily Expedition | `#FFFFFF` / `#6558C9` | 5.54:1 | Pass |
| Country | `#FFFFFF` / `#286AA6` | 5.67:1 | Pass |
| Flag | `#FFFFFF` / `#C04E3B` | 4.78:1 | Pass |
| Capital | `#FFFFFF` / `#7965C7` | 4.67:1 | Pass |
| Guesser | `#29273C` / `#E3B34F` | 7.47:1 | Pass |

The same foreground/background pair is used for each button's smaller description text. No opacity is applied.


### Mode button boundaries against the page

| Mode | Button / dark page `#19192D` | Button / light page `#F5F1E9` | Result |
|---|---:|---:|---|
| Daily Expedition | 3.11:1 | 4.92:1 | Pass |
| Country | 3.04:1 | 5.03:1 | Pass |
| Flag | 3.61:1 | 4.24:1 | Pass |
| Capital | 3.69:1 | 4.14:1 | Pass |
| Guesser | 8.89:1 | 1.72:1 | Dark keyline is used in light mode |

The Guesser keyline `#29273C` contrasts 7.47:1 against its gold button and 12.86:1 against the light page, so its boundary remains visible in light mode.

### Theme text and surfaces

| Theme | Pair | Contrast | Result |
|---|---|---:|---|
| Dark | Main text `#FBFAFF` on page `#19192D` | 16.60:1 | Pass |
| Dark | Muted text `#C6C3D6` on surface `#272741` | 8.38:1 | Pass |
| Dark | Main text `#FBFAFF` on surface `#272741` | 13.92:1 | Pass |
| Light | Main text `#29273C` on page `#F5F1E9` | 12.86:1 | Pass |
| Light | Muted text `#686579` on surface `#FFFDF8` | 5.54:1 | Pass |
| Light | Main text `#29273C` on surface `#FFFDF8` | 14.25:1 | Pass |

### Visible control boundaries

| Theme / control | Boundary / adjacent surface | Contrast | Result |
|---|---|---:|---|
| Dark Settings | `#8685A8` / page `#19192D` | 4.87:1 | Pass |
| Dark Settings | `#8685A8` / surface `#272741` | 4.08:1 | Pass |
| Light Settings | `#8B867B` / page `#F5F1E9` | 3.22:1 | Pass |
| Light Settings | `#8B867B` / surface `#FFFDF8` | 3.57:1 | Pass |
| Light Guesser | `#29273C` keyline / gold `#E3B34F` | 7.47:1 | Pass |

The coloured mode buttons also contrast against the page surfaces at 3:1 or better in both themes, except Guesser on the light page; its dark keyline provides the required visible boundary and is itself high contrast against both the gold fill and light page.

## Scope and limitations

This is a source-level colour-contrast and focus-style review, not a complete WCAG conformance certification. The checks cover the revised landing-page palette, theme text/surface pairs, Settings boundaries and authored button focus treatment. Full WCAG 2.2 AA validation still requires runtime testing of every screen and state, including keyboard-only operation, focus order and visibility, screen-reader names/announcements, zoom and text resizing, reflow, map interaction, error states, reduced motion, and manual assistive-technology checks. The full application build and browser-based accessibility scan were not run in this environment because project dependencies are not installed and the available Node.js version is below the version declared in `package.json`.


## 2026-11-26 progress and gameplay update

- Replaced the expedition-only segmented progress indicator with the shared numbered-step pills used by Daily Expedition and all four quiz modes. Each step is exposed as an ordered list item, with the current step marked using `aria-current="step"` and a screen-reader label.
- Removed the duplicate visible `Round X of 5` / `Location X of 5` captions where the numbered progress pills already show the active and completed steps.
- Removed the duplicated quiz-mode label displayed beneath the question count. The game type remains in the centered game header.
- Reworked the Daily Expedition HUD into two explicit columns: progress pills and a minimum-width timer block. The next-location action has a fixed minimum height and a full responsive width within its content frame.
- Added a Daily Expedition personal-best record based on highest completed score out of 25,000. It is stored locally in the browser/device, separate from any Reddit community leaderboard. It displays `Not set` until the player completes an expedition.

### Numbered progress pill text contrast

| State | Text / background | Contrast | WCAG AA normal text |
|---|---|---:|---|
| Completed | `#FFFFFF` / `#2E79A8` | 4.75:1 | Pass |
| Current | `#FFFFFF` / `#6658D8` | 5.31:1 | Pass |
| Upcoming, dark | `#C6C3D6` / `#343451` | 6.94:1 | Pass |
| Upcoming, light | `#686579` / `#EEE9DF` | 4.66:1 | Pass |

The updated checks are limited to authored progress colours and UI structure. They do not certify runtime WCAG conformance for every screen or interaction.
