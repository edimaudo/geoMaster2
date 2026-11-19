# geoMaster

geoMaster is one Reddit geography game with five modes: Daily Expedition, Country Mode, Flag Mode, Capital Mode, and Guesser Mode.

## Reddit layout

The app has two Devvit post entry points:

- `default`: the compact inline post card.
- `game`: the expanded geoMaster app, including the mode selector and all five modes.

The modes are screens inside one application. They are not separate games or separate Devvit entry points.

## Modes

- **Daily Expedition:** five daily geographic locations, a 12-second pin-placement round, Haversine scoring, reveal, and a shared subreddit result summary.
- **Country Mode:** country name to flag.
- **Flag Mode:** flag to country name.
- **Capital Mode:** capital city to flag.
- **Guesser Mode:** country facts to country name.

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
- `assets/clues/`: synthetic SVG development illustrations. These are not geographically accurate production imagery.

## Development checks

Use Node.js 24.18.0 or later.

```bash
npm install
npm test
npm run build
```

For setup and deployment, follow [`DEVVIT_SETUP.md`](DEVVIT_SETUP.md).

## Vercel configuration

`vercel.json` is included as the requested Python Function reference. It targets `main.py` with `@vercel/python`, but this Devvit project does not currently contain a Python handler. The Vercel file does not deploy the Reddit-hosted Devvit app.

## Content readiness

The original country dataset and the Daily Expedition location catalogue are separate. The current Daily Expedition catalogue has 25 development locations, and the SVG clue illustrations are synthetic placeholders. Both require content review and replacement with verified location data and properly licensed geographic imagery before a public launch. Daily-post idempotency, play counts, crowd aggregates, and leaderboards are currently app-wide rather than subreddit-scoped; multi-subreddit support is not complete. The daily reminder control is disabled and does not currently register notifications.
