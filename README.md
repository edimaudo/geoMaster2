# geoMaster — Devvit Web

A five-round daily geographic pinpointing game built for Reddit using Devvit Web, React, TypeScript, Express, and Redis.

## What is implemented

- Compact inline post card with dispatch, date, play/resume/completed states, played-today count, community distance context, and streak.
- Dedicated expanded game entry point launched from a direct Play button click.
- Five deterministic daily rounds selected from a date + server-secret seed, with five difficulty tiers and no repeated country in a puzzle.
- Twelve-second server-authoritative round timer, pin placement, zoom/pan world map, and timeout submission.
- Bundled vector map built from local world-atlas country boundaries. No map tile service, API key, or runtime map network calls.
- Haversine scoring using the PRD's 25 km grace radius and exponential decay formula.
- Great-circle reveal line, true target, user pin, and spherical crowd centroid (including antimeridian-safe centroid aggregation).
- Result view with per-round distance inspection, coordinates, crowd comparison, and location trivia.
- Explicit one-click Reddit comment sharing and milestone user flair actions.
- Redis-backed sessions, per-round transaction guards, daily puzzle cache, subreddit crowd aggregates, daily leaderboard, and user streaks.
- UTC daily scheduler that pre-warms the puzzle and attempts to publish the daily post; a moderator menu action provides a manual/idempotent post-creation path.
- Devvit Journeys event instrumentation and unit tests for scoring, spherical math, deterministic puzzle selection, and the original country dataset.
- A separate **Classic Quiz** expanded entry point preserving the four game modes from the original `edimaudo/geoMaster` repository: Country, Flag, Capital, and Guesser.

## Geographic content sources and boundaries

The project deliberately keeps the two content sets distinct:

- `assets/countries.json` contains the **56 country records from the `COUNTRIES` array in the original [edimaudo/geoMaster repository](https://github.com/edimaudo/geoMaster/blob/main/app.js)**. The country names, codes, capitals, GDP, population, and beer fields are retained as provided by that source. This dataset powers the four original Classic Quiz modes. It does not contain latitude/longitude coordinates or satellite/street imagery.
- `assets/geo_catalog.json` is the separate development catalogue for the PRD's daily pinpoint challenge. It currently contains **25 starter locations**, five per round tier. These 25 locations are not claimed to come from the original country dataset.
- `assets/clues/*.svg` contains **synthetic development artwork**, not actual images of the named places. These scenes are not suitable as geographic clues for a public launch.

The PRD asks for a larger reviewed location catalogue and geographically accurate imagery. The existing 56-country source data cannot be treated as that catalogue because it has no location coordinates or clue images. Expanding the pinpoint content requires adding verified geographic locations and licensed imagery as a separate, explicit content task; the Classic Quiz content should remain the original source data.

## Requirements

- Node.js **24.18.0 or later** and npm.
- A Reddit account connected to the Reddit Developer Platform.
- A subreddit where you have moderator permissions for playtesting and flair management.

The current Devvit quickstart specifies Node.js 24.18.0+. See the [Devvit quickstart](https://developers.reddit.com/docs/quickstart).

## Install and configure

Use Node.js 24.18.0 or later (`nvm use` reads the included `.nvmrc`). Create/register a Devvit app with the slug `geomaster` in the Reddit Developer Portal, then install dependencies and authenticate with the Reddit account that owns that app:

```bash
nvm use
npm install
npx devvit login
npx devvit whoami
```

The global app secret can only be set after the app has at least one installation. Start a first playtest to create that installation:

```bash
npx devvit playtest r/geomaster-dev
```

Once the playtest is installed, stop it with `Ctrl+C` and set the global app secret used to derive the daily puzzle. Use a random value with at least 24 characters (a 32-byte random secret is recommended):

```bash
npx devvit settings set serverSalt
```

The CLI prompts for the value. It is stored in encrypted Devvit app settings and is not bundled into the client. Do not commit the secret or put it in `assets/`.

The local `.env.example` documents the same setting name for reference; the Devvit app setting is the authoritative production source.

## Playtest

The configured development subreddit is `r/geomaster-dev`. With the secret set, run both Vite watchers and the Devvit playtest:

```bash
npm run dev
```

This builds both entry points, starts client/server Vite watch builds, and launches `devvit playtest r/geomaster-dev`.

To use a different subreddit, update `devvit.json` under `dev.subreddit` and the `playtest`/`dev` scripts in `package.json`.

After playtest opens:

1. Open the geoMaster test post.
2. Use **Drop Today’s Pins** to enter the daily five-round game, or **Play classic quiz** to open the original country quiz.
3. In the daily game, tap the map to place a pin, then select **Lock In Pin** before the 12-second timer ends.
4. Complete all five daily rounds to inspect the atlas summary, post your result comment, or equip an unlocked flair.
5. In Classic Quiz, select Country, Flag, Capital, or Guesser mode and answer seven questions. Incorrect answers add 60 seconds.

The daily scheduler is set to `0 0 * * *` (00:00 UTC). It pre-warms the daily puzzle and creates one post per subreddit installation when the scheduler supplies subreddit context. A moderator can also use **Create today's geoMaster post** from the subreddit menu. Both paths share a per-date idempotency check.

## Quality checks and production build

```bash
npm run typecheck
npm test
npm run build
```

Build outputs:

- `dist/client/index.html` — inline post card.
- `dist/client/game.html` — expanded daily pinpoint game.
- `dist/client/classic.html` — expanded original four-mode country quiz.
- `dist/client/clues/` — bundled pinpoint clue image assets.
- `dist/server/index.cjs` — Devvit server bundle.

## Project map

```text
geomaster/
├── assets/
│   ├── countries.json          # 56 records from original geoMaster app.js
│   ├── geo_catalog.json        # Pinpoint development catalog (25 entries)
│   ├── friday_themes.json      # Round-five Friday theme rules
│   └── clues/                  # Synthetic development art; replace before launch
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── ActivePlay.tsx
│   │   │   ├── ClueViewer.tsx
│   │   │   ├── InlineCard.tsx
│   │   │   ├── ResultCard.tsx
│   │   │   ├── RevealArcOverlay.tsx
│   │   │   └── VectorMap.tsx
│   │   ├── public/clues/       # Vite-served clue files
│   │   ├── index.html          # Inline entry point
│   │   ├── game.html           # Expanded entry point
│   │   └── styles.css
│   ├── server/
│   │   ├── index.ts            # Devvit API routes and scheduler/menu handlers
│   │   └── services/
│   │       ├── geoGen.ts       # SHA-256 date seed and daily puzzle construction
│   │       └── session.ts      # Redis sessions, crowd, leaderboard, scoring flow
│   └── shared/
│       ├── countries.ts        # Source dataset and classic quiz generation
│       ├── geo.ts              # Haversine, scoring, spherical centroid
│       ├── puzzle.ts           # mulberry32 and tier selection
│       └── types.ts
├── tests/
├── devvit.json
├── package.json
├── .nvmrc
└── vite.*.config.ts
```

## Implementation details and intentional decisions

### Daily puzzle consistency

The server computes `uint32(SHA256(UTC_DATE + ':' + SERVER_SALT).slice(0, 8))` and seeds `mulberry32`. The catalog is bundled into the server build. Every installation with the same app-level salt and catalog version generates the same five location IDs for a UTC date. The date and dispatch are stored with each post in `postData`; old posts can be replayed as archive practice without changing the current streak or leaderboard.

Puzzle creation is deterministic and idempotent: concurrent cache misses for the same date write the same generated payload. User sessions and crowd data are stored in each subreddit installation's Redis namespace, so subreddit crowd averages and rankings remain community-specific.

### Server authority and anti-cheat

The client receives only the clue URL, clue alt text, tier, and round number for the active round. It does not receive target coordinates or location names until `/api/round/submit` succeeds. The server validates coordinates, checks elapsed server time, computes distance/score, and commits the result and crowd contribution in a Redis transaction. Refreshing after the deadline is treated as a timeout.

The app uses the PRD's 12-second limit and a 500 ms submit grace window for network transit. A pin arriving after 12.5 seconds is converted to a timeout.

### Distance and crowd math

- Haversine uses an Earth radius of 6,371 km.
- Distances at or below 25 km score 1,000 points.
- Longer distances use `round(1000 * exp(-(d - 25) / 1800))`.
- Crowd centroids are calculated by summing 3D unit-sphere vectors, not by averaging longitude/latitude, so guesses around Fiji and Alaska do not collapse toward the Prime Meridian.
- The community's mean distance includes submitted pins only; a timeout has no distance and does not contribute to the centroid or mean.

### Reddit actions

- **Post Result to Comments** only submits after the user explicitly presses the button. It uses `submitComment` with `runAs: 'USER'` and the `SUBMIT_COMMENT` permission.
- The current playtest/publish state may affect how Reddit attributes user actions before the app is approved. Verify the behavior in the intended approval state.
- Flair is set server-side using the current Reddit username and moderator-scoped Reddit access. The installing subreddit must allow the app to manage user flair and have the required flair permissions/templates configured.

### Journeys and reminders

`devvit.json` enables Journeys. The client records app ready, journey start, per-round progress, and completion. Reddit requires Journey maps to be reviewed and allowlisted before event ingestion; unapproved apps may have events dropped. No personally identifying details are included in event properties.

The reminder control is intentionally disabled in this starter. Reddit push notifications are currently a gated beta requiring an application, with eligibility aimed at established games rather than brand-new launches. The feature should be wired only after the app is accepted into that beta.

## Before public launch

- [ ] Expand the PRD pinpoint catalogue beyond its 25-location development starter, using verified coordinates and tier review.
- [ ] Replace all synthetic clue SVGs with licensed and geographically accurate visuals.
- [ ] Recheck the 56 original country records against the upstream source before any content corrections; do not silently rewrite the source values.
- [ ] Validate that no clue image reveals coordinates through EXIF/XMP or the file URL/name.
- [ ] Review all round difficulty labels and Friday theme selection with human playtests.
- [ ] Configure `serverSalt` in Devvit app settings and preserve it across releases.
- [ ] Playtest on iOS, Android, and desktop Reddit clients, including slow network and refresh/timeout paths.
- [ ] Validate subreddit flair permissions and comment attribution in the approved app state.
- [ ] Submit the Journey map for review and confirm telemetry receipts/ingestion.
- [ ] Apply for the notifications beta before enabling reminders.
- [ ] Add privacy policy and terms links in the app's listing metadata if required by the app review process.
- [ ] Run `npm test` and `npm run build` on Node 24.18.0+ before each upload.

## Current technical boundary

This repository is a source implementation based on the supplied PRD. It has not been installed into a Reddit subreddit from this environment, and a full dependency install/build could not be completed here. Run the commands above locally with Node 24.18.0+ and a logged-in Devvit CLI, then address any SDK type/API changes surfaced by the installed current package before publishing.
