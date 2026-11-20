# geoMaster

geoMaster is one Reddit geography game with five modes: Daily Expedition, Country, Flag, Capital, and Guesser.

## Reddit layout

The app has two Devvit post entry points:

- `default`: the compact inline post card.
- `game`: the expanded geoMaster app, including the mode selector and all five modes.

The modes are screens inside one application. They are not separate games or separate Devvit entry points.

## Modes

- **Daily Expedition:** five daily geographic locations, a 12-second pin-placement round, Haversine scoring, reveal, and a shared subreddit result summary.
- **Country:** country name to flag.
- **Flag:** flag to country name.
- **Capital:** capital city to flag.
- **Guesser:** country facts to country name.

The four quiz modes retain the 56 country records and quiz behavior from the original `edimaudo/geoMaster` repository. Each quiz session has seven questions, and incorrect answers add 60 seconds.

## Project files

- [`GAME_DESIGN.md`](GAME_DESIGN.md): unified game definition, mode behavior, navigation, and content boundaries.
- [`DEVVIT_SETUP.md`](DEVVIT_SETUP.md): setup, playtest, and deployment instructions for Reddit Devvit.
- `devvit.json`: only the `default` and `game` post entry points.
- `src/client/GeoMasterApp.tsx`: expanded mode hub and mode routing.
- `src/client/components/ActivePlay.tsx`: Daily Expedition.
- `src/client/components/QuizMode.tsx`: the four country quiz modes.
- `assets/countries.json`: 56 source country records from the original project.
- `assets/geo_catalog.json`: separate 25-location development catalogue for Daily Expedition.

## Development checks

Use Node.js 24.18.0 or later.

```bash
npm install
npm test
npm run build
```

For setup and deployment, follow [`DEVVIT_SETUP.md`](DEVVIT_SETUP.md).

## Vercel browser build

The project includes a Vercel browser build with all five modes. Daily Expedition runs locally in the browser using a date-seeded set of five locations, a 12-second pin timer, map reveals, and distance scoring. Browser-preview results are local to that session and do not use Reddit accounts, Redis, community averages, or shared leaderboards. The Devvit deployment retains its server-backed session and community features.

Vercel runs `npm run build:web-preview` and serves `dist/client`. The build uses the existing `src/client/game.html` entry point and produces `dist/client/game.html`; the root rewrite points to that generated file. The Devvit `default` and `game` entry points are unchanged.

See [`VERCEL_DEPLOYMENT.md`](VERCEL_DEPLOYMENT.md) for deployment instructions.

## Content readiness

The original country dataset and the Daily Expedition location catalogue are separate. The current Daily Expedition catalogue has 25 development locations and requires content review, coordinate validation, and expansion before a public launch. Gameplay uses structured text clues (continent, country, and feature category) rather than synthetic SVG illustrations. Daily-post idempotency, play counts, crowd aggregates, and leaderboards are currently app-wide rather than subreddit-scoped; multi-subreddit support is not complete. The daily reminder control is disabled and does not currently register notifications.
