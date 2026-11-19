# geoMaster Game Design

## Product definition

**Product name:** geoMaster  
**Devvit app slug:** `geomaster`

geoMaster is one geography game with five selectable modes. The modes are not separate games, products, or Devvit posts. The interface, navigation, app identity, and Reddit post experience are shared.

The five modes are:

| Mode | Player task | Session rules |
|---|---|---|
| **Daily Expedition** | Inspect a geographic clue and place a pin on the world map. | Five shared daily locations; 12 seconds per round; score is based on Haversine distance. |
| **Country Mode** | Given a country name, choose its flag. | Seven questions; each incorrect answer adds 60 seconds. |
| **Flag Mode** | Given a flag, choose the country. | Seven questions; each incorrect answer adds 60 seconds. |
| **Capital Mode** | Given a capital city, choose the country's flag. | Seven questions; each incorrect answer adds 60 seconds. |
| **Guesser Mode** | Use the capital, population, GDP, and beer-consumption facts to identify the country. | Seven questions; each incorrect answer adds 60 seconds. |

The four quiz modes preserve the behavior and source data in the original `edimaudo/geoMaster` repository. The Daily Expedition follows the supplied geoMaster PRD.

## Reddit experience and navigation

There are exactly two Devvit post entry points:

| Entry point | Reddit presentation | Purpose |
|---|---|---|
| `default` | Inline post card | Shows the geoMaster identity and daily challenge status. Its single **Open geoMaster** action opens the expanded game. |
| `game` | Expanded view | Opens the unified mode hub. The player selects Daily Expedition, Country Mode, Flag Mode, Capital Mode, or Guesser Mode. |

The expanded view is one application. Choosing a mode changes the active screen inside that application; it does not open a second game or a separate entry point. Each mode provides a route back to **All modes**. The daily session remains saved on the server, so returning to Daily Expedition resumes the current round when a session is in progress.

**Launch-flow change:** the original daily-only PRD flow opened Round 1 directly from the inline card. With the four existing quiz modes brought into the same game, the inline CTA now opens the shared mode hub. Daily Expedition remains the featured first option, but players can choose any of the five modes before gameplay. This is a navigation change, not a second game.

Do not add additional Devvit entry points for individual modes or introduce generic placeholder product names. Use **geoMaster** in player-facing text and `geomaster` only where a lowercase technical identifier is required.

## Mode behavior

### Daily Expedition

Daily Expedition is the location-pin challenge defined by the supplied PRD:

- Every player in a subreddit receives the same five deterministic locations for a UTC date.
- Each round presents a vetted geographic clue and an interactive world vector map.
- The player has 12 seconds to place and lock a pin. A round with no pin scores zero.
- The server calculates great-circle distance with the Haversine formula using an Earth radius of 6,371 km.
- A guess within 25 km receives 1,000 points. Beyond 25 km, the PRD's exponential distance-decay formula applies.
- Each round reveals the true location, the player's distance, the score, and available player-aggregate statistics. The current implementation aggregates these values across the geoMaster app, not separately by subreddit.
- The end state summarizes the five rounds and provides Reddit sharing and earned-flair actions where permissions allow.

The daily challenge is the featured mode on the inline post card. The inline card is a doorway into geoMaster, not a separate game.

### Country quiz modes

These four modes use the existing 56-record `COUNTRIES` dataset from the original repository's `app.js`. Each record retains the source fields: country code, country name, capital, GDP, population, and beer consumption. The data is not replaced with a new country catalogue.

A quiz session selects seven countries and provides four answer options per question. An incorrect answer adds 60 seconds to the session time. Personal best times remain separate by quiz mode and are stored in browser local storage.

## Shared experience

- Use the geoMaster name and visual identity in every mode.
- Use a single expanded mode hub as the navigation point.
- Provide a consistent return path to **All modes** from active play and result screens.
- Preserve the original quiz modes, the original country values, and per-mode personal-best records.
- Keep daily-session state and scoring server-authoritative; do not expose unplayed target coordinates to the client.

## Content boundaries and launch readiness

The original 56-country dataset is appropriate for the four quiz modes. It does not contain geographic coordinates or satellite/street-level clue imagery and must not be presented as the Daily Expedition location catalogue.

The current development package contains a separate 25-location starter catalogue and 25 synthetic SVG clue illustrations. These are development placeholders, not a verified 365+ location catalogue or real imagery of the named places. They must not be described as production-ready geographic clues. Before public launch, replace or validate the starter content against the PRD's human-reviewed location and imagery requirements, including image licensing and removal of location metadata from distributed files.

The daily reminder control is currently disabled because notification access is not available in this project. It is not an implemented opt-in feature. In addition, the current daily-post idempotency, play-count, crowd, and leaderboard Redis keys are not partitioned by subreddit. As a result, the current server does not provide independent daily posts and community statistics for multiple subreddit installations. Add subreddit-scoped keys before claiming multi-subreddit support. The inline card and results screen therefore label the current averages as geoMaster/all-player aggregates, not subreddit averages.

## Technical structure

- `src/client/index.html` and `src/client/main.tsx`: inline Reddit post card.
- `src/client/game.html` and `src/client/game.tsx`: one expanded geoMaster application.
- `src/client/GeoMasterApp.tsx`: mode hub and in-app mode routing.
- `src/client/components/ActivePlay.tsx`: Daily Expedition.
- `src/client/components/QuizMode.tsx`: Country, Flag, Capital, and Guesser modes.
- `src/server/index.ts`: Devvit API routes, menu action, and daily scheduler.
- `src/shared/countries.ts`: source country data helpers and quiz-mode definitions.
- `assets/countries.json`: 56 original country records.
- `assets/geo_catalog.json`: separate development catalogue for Daily Expedition.

`devvit.json` defines only `default` and `game` under `post.entrypoints`. The project uses a Devvit/Node server, not a Python server.

## Current implementation boundaries

The package contains the unified entrypoint structure, the five-mode selector, the four country quiz modes, and the Daily Expedition client/server flow. The package has not been fully built or playtested in a Reddit environment in this delivery, so those runtime checks remain outstanding.

The current 25-location catalogue and its 25 SVG illustrations remain development placeholders. The daily reminder control is disabled and is not an implemented notification opt-in. The current Redis keys for daily-post idempotency, play counts, crowd aggregates, and leaderboards are not partitioned by subreddit. Those values are therefore geoMaster-wide rather than independent for each subreddit. Do not describe them as subreddit-specific until those keys and the post-creation flow are updated to include the subreddit.

## Vercel configuration boundary

`vercel.json` is included using the supplied Python Function deployment reference (`@vercel/python`, `main.py`, 120-second duration, and 1,024 MB memory). The current geoMaster project does not contain `main.py`; its backend is the Devvit Node server. Therefore, this configuration is a reference only and does **not** make the Devvit game deployable to Vercel. A separate Python handler and API design would be required before using this Vercel configuration for a working Vercel deployment.
