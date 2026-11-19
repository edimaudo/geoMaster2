# geoMaster: Devvit setup and deployment

This guide covers the Reddit Devvit version of **geoMaster**. geoMaster is one game with five modes. The Reddit post has two entry points only: an inline card (`default`) and one expanded app (`game`) containing the mode selector and all five modes.

## Requirements

- Node.js **24.18.0 or later** and npm.
- A Reddit account connected to the Reddit Developer Platform.
- A subreddit you moderate for a custom playtest. Custom playtest subreddits must have fewer than 200 subscribers.

## 1. Open the project and install packages

In Terminal, change to the `geomaster` project folder and run:

```bash
npm install
```

Check that Node.js is new enough:

```bash
node --version
npm --version
```

The project includes an `.nvmrc` file for Node version managers that support it. With `nvm` installed, run:

```bash
nvm install
nvm use
```

## 2. Sign in to Devvit

```bash
npx devvit login
npx devvit whoami
```

The browser sign-in connects the CLI to your Reddit account. Devvit handles Reddit authentication for this app; you do not need to create a separate Reddit API client ID or client secret.

## 3. Check the project before uploading

Run the checks from the project folder. `npm test` runs the TypeScript check and unit tests.

```bash
npm test
npm run build
```

Resolve any errors before uploading the app.

## 4. Upload the app for private development

```bash
npx devvit upload
```

This uploads the app to your Apps directory as a private app. Devvit also creates a private playtest subreddit for the app if one does not already exist.

## 5. Configure the daily puzzle secret

The daily coordinate generator uses a global app setting named `serverSalt`. Set it through the Devvit CLI:

```bash
npx devvit settings set serverSalt
```

When prompted, enter a long random secret (at least 24 characters; 32 random bytes is a suitable target). Keep it private. Do not put the value in source code, `assets/`, or a committed `.env` file.

To verify that the setting exists:

```bash
npx devvit settings list
```

## 6. Start a playtest

Start the project's watchers and Devvit playtest:

```bash
npm run dev
```

The script builds the client and server, watches both for changes, and starts `devvit playtest`. Open the playtest URL printed by the CLI in a browser where you are signed in to Reddit. Changes saved during the playtest are installed automatically.

To use a different subreddit that you moderate and that has fewer than 200 subscribers, set the `DEVVIT_SUBREDDIT` variable when starting the project. This keeps the client and server watchers running as well as the playtest process:

```bash
DEVVIT_SUBREDDIT=YOUR_TEST_SUBREDDIT npm run dev
```

Do not include the `r/` prefix in the variable value.

Press `Ctrl+C` in the terminal to end the playtest session. The installed playtest version remains on the test subreddit.

## 7. Test the game on Reddit

1. Open the geoMaster post in the playtest subreddit.
2. Confirm the inline post displays the geoMaster name and the daily challenge status.
3. Select **Open geoMaster**. Confirm the expanded view shows one mode selector.
4. Open **Daily Expedition** and test pin placement, the 12-second timer, round reveal, and final summary.
5. Return to **All modes** and test Country Mode, Flag Mode, Capital Mode, and Guesser Mode.
6. Confirm each quiz contains seven questions and that an incorrect answer adds 60 seconds.
7. Check that each mode can return to the single mode selector.
8. Confirm the displayed averages are currently geoMaster-wide, not subreddit-specific. The current server keys are not partitioned by subreddit.
9. Test the app in Reddit's mobile and desktop clients, including a refresh during an active Daily Expedition.

## 8. Review logs

To stream logs from an installation:

```bash
npx devvit logs r/YOUR_TEST_SUBREDDIT geomaster --since 15m
```

Replace `YOUR_TEST_SUBREDDIT` with the actual subreddit name.

## 9. Upload and submit for review

When the playtest is ready:

```bash
npx devvit upload
```

To submit the app for review:

```bash
npx devvit publish
```

To submit for public review:

```bash
npx devvit publish --public
```

Publishing submits the app for Reddit review; it does not bypass the review process. Once the app is approved and available to install, add it to a subreddit you moderate:

```bash
npx devvit install r/YOUR_SUBREDDIT geomaster
```

## Deployment distinction

The full five-mode game runs on Reddit through Devvit. The optional Vercel build is a separate static browser build: it supports the four country quiz modes, while Daily Expedition remains available in the Reddit version because it depends on Devvit server APIs, Redis, and Reddit context. Vercel does not run or replace the Devvit server. See [`VERCEL_DEPLOYMENT.md`](VERCEL_DEPLOYMENT.md) for the browser build.

## Official Devvit references

- [Devvit app quickstart](https://developers.reddit.com/docs/0.14/quickstart)
- [Devvit CLI reference](https://developers.reddit.com/docs/guides/tools/devvit_cli)
- [Playtest guide](https://developers.reddit.com/docs/guides/tools/playtest)
- [Devvit Web configuration](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration)
- [View modes and entry points](https://developers.reddit.com/docs/capabilities/server/launch_screen_and_entry_points/view_modes_entry_points)
