# geoMaster: Vercel browser deployment

This deploys the browser preview of **geoMaster** to Vercel. It is separate from the Reddit Devvit deployment.

## Browser build

The Vercel build reuses the existing expanded-game page at `src/client/game.html`. Vite writes the built page to `dist/client/game.html`, along with its JavaScript, CSS, and public assets. There is no `main.py`, extra `vercel.html`, or separate Node.js serverless function.

The browser preview supports Country, Flag, Capital, and Guesser. Daily Expedition remains available in the Reddit Devvit version because its round state, scoring, Redis persistence, Reddit sharing, and flair actions require Devvit server APIs and Reddit context.

## Vercel configuration

`vercel.json` uses:

- Framework: `vite`
- Build command: `npm run build:web-preview`
- Output directory: `dist/client`
- Root rewrite: `/` to `/game.html`

The `build:web-preview` script is defined in `package.json`. It runs `vite.vercel.config.ts` in the `web-preview` mode. That Vite config uses the existing `src/client/game.html` entry and writes to `dist/client`. The app detects `web-preview` mode and disables the Devvit-only Daily Expedition action in the browser preview.

## Deploy

1. Import the repository or upload the project folder to Vercel.
2. Set the Vercel project root to the `geomaster` directory (the directory containing `package.json` and `vercel.json`).
3. Keep the build command and output directory from the checked-in `vercel.json`. If Vercel dashboard settings override the file, set the build command to `npm run build:web-preview` and the output directory to `dist/client`.
4. Deploy.

Use Node.js 24.18.0 or later, matching the version specified by `.nvmrc` and `package.json`.

## Verify locally

From the project root:

```bash
npm install
npm run build:web-preview
```

Confirm that `dist/client/game.html` exists and that its referenced assets and public clue files exist under `dist/client/`.

## Devvit deployment remains separate

The Reddit app continues to use the existing Devvit client and server builds, with exactly two post entry points: `default` (inline card) and `game` (expanded geoMaster app). Use [`DEVVIT_SETUP.md`](DEVVIT_SETUP.md) for Reddit authentication, playtesting, uploading, and publishing. The Vercel browser build does not replace or deploy the Devvit server.
