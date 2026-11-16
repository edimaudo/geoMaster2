import express, { type NextFunction, type Request, type Response } from 'express';
import { createTelemetryRouter } from '@devvit/analytics/server/reddit';
import { context, createServer, getServerPort, reddit } from '@devvit/web/server';
import {
  GameError,
  buildInitResponse,
  createPostForToday,
  currentUtcDate,
  expireRoundIfNeeded,
  getDailyPuzzle,
  getSession,
  loadOrCreateSession,
  markCommented,
  readUserStats,
  setEquippedFlair,
  startRound,
  submitRound,
} from './services/session';
import { isIsoDate } from './services/geoGen';
import type { RoundResult } from '../shared/types';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(createTelemetryRouter());

interface PlayerContext {
  postId: string;
  userId: string;
  subredditName: string;
  date: string;
  isArchive: boolean;
}

function getPlayerContext(): PlayerContext {
  const { postId, userId, subredditName, postData } = context;
  if (!postId || !userId || !subredditName) {
    throw new GameError('Open geoMaster from a Reddit post while signed in to play.', 401, 'missing_reddit_context');
  }
  const postDate = postData && typeof postData === 'object'
    ? (postData as Record<string, unknown>).gameDate
    : undefined;
  const date = isIsoDate(postDate) ? postDate : currentUtcDate();
  return { postId, userId, subredditName, date, isArchive: date !== currentUtcDate() };
}

function sendError(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof GameError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error('[geoMaster] request failed', error);
  res.status(500).json({ error: 'geoMaster could not complete that request. Please retry.', code: 'internal_error' });
}

function makeShareText(result: RoundResult[], totalScore: number, streak: number, dispatchNumber: number): string {
  const distanceGrid = result
    .map((round) => round.distanceKm === null ? '—' : `${Math.round(round.distanceKm).toLocaleString()}km`)
    .join(' | ');
  const mean = result.filter((round) => round.distanceKm !== null);
  const avg = mean.length
    ? Math.round(mean.reduce((sum, round) => sum + (round.distanceKm || 0), 0) / mean.length)
    : null;
  return [
    `geoMaster #${String(dispatchNumber).padStart(3, '0')} — ${totalScore.toLocaleString()}/5,000 (Avg: ${avg === null ? '—' : `${avg} km`})`,
    distanceGrid,
    `Streak: ${streak}`,
  ].join('\n');
}

app.get('/api/init', async (_req, res, next) => {
  try {
    const player = getPlayerContext();
    const session = await loadOrCreateSession(
      player.postId,
      player.userId,
      player.date,
      player.isArchive,
    );
    const current = await expireRoundIfNeeded(
      player.postId,
      player.userId,
      player.date,
      player.isArchive,
      session,
    );
    const payload = await buildInitResponse(
      player.postId,
      player.userId,
      player.date,
      player.isArchive,
      current,
    );
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/round/start', async (_req, res, next) => {
  try {
    const player = getPlayerContext();
    const payload = await startRound(
      player.postId,
      player.userId,
      player.date,
      player.isArchive,
    );
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/round/submit', async (req, res, next) => {
  try {
    const player = getPlayerContext();
    const { round, lat, lng } = req.body as { round?: unknown; lat?: unknown; lng?: unknown };
    if (!Number.isInteger(round) || Number(round) < 1 || Number(round) > 5) {
      throw new GameError('Choose a valid round before locking your pin.', 400, 'invalid_round');
    }
    const noPin = lat === null && lng === null;
    const hasPin = typeof lat === 'number' && Number.isFinite(lat)
      && typeof lng === 'number' && Number.isFinite(lng);
    if (!noPin && !hasPin) {
      throw new GameError('The selected map pin is invalid. Place it again and retry.', 400, 'invalid_coordinates');
    }
    const payload = await submitRound(
      player.postId,
      player.userId,
      player.date,
      player.isArchive,
      Number(round),
      hasPin ? { lat: Number(lat), lng: Number(lng) } : null,
      false,
    );
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/share', async (_req, res, next) => {
  try {
    const player = getPlayerContext();
    const session = await getSession(player.postId, player.userId);
    if (!session || session.status !== 'COMPLETED' || session.rounds.length !== 5) {
      throw new GameError('Complete all five coordinates before sharing your result.', 409, 'game_not_completed');
    }
    if (session.hasCommented) {
      res.json({ posted: true, alreadyPosted: true });
      return;
    }
    const puzzle = await getDailyPuzzle(player.date);
    await reddit.submitComment({
      id: player.postId,
      text: makeShareText(session.rounds, session.totalScore, (await readUserStats(player.userId)).streak, puzzle.dispatchNumber),
      runAs: 'USER',
    });
    await markCommented(player.postId, player.userId);
    res.json({ posted: true, alreadyPosted: false });
  } catch (error) {
    next(error);
  }
});

app.post('/api/flair', async (_req, res, next) => {
  try {
    const player = getPlayerContext();
    if (player.isArchive) {
      throw new GameError('Archived practice rounds do not unlock or equip daily flairs.', 403, 'archive_flair_disabled');
    }
    const session = await getSession(player.postId, player.userId);
    if (!session) throw new GameError('Your completed result could not be found.', 404, 'session_missing');
    const username = await reddit.getCurrentUsername();
    if (!username) throw new GameError('Your Reddit username could not be verified.', 401, 'username_missing');
    const flair = await setEquippedFlair(player.userId, username, player.subredditName, session);
    res.json({ equipped: true, flair });
  } catch (error) {
    next(error);
  }
});

// Called by the UTC cron task. It pre-warms the deterministic puzzle and publishes
// the daily post when Devvit supplies subreddit context. The moderator menu action
// below is an idempotent fallback for installations without scheduler context.
app.post('/internal/scheduler/daily-drop', async (_req, res, next) => {
  try {
    const date = currentUtcDate();
    const puzzle = await getDailyPuzzle(date);
    const { subredditName } = context;
    if (!subredditName) {
      res.json({ warmed: true, published: false, date, dispatchNumber: puzzle.dispatchNumber, reason: 'subreddit_context_unavailable' });
      return;
    }
    const post = await createPostForToday(subredditName);
    res.json({
      warmed: true,
      published: true,
      alreadyExists: post.alreadyExists,
      postId: post.postId,
      date,
      dispatchNumber: puzzle.dispatchNumber,
    });
  } catch (error) {
    next(error);
  }
});

// Subreddit moderator menu action: daily post creation is explicit and idempotent.
app.post('/internal/menu/create-daily-post', async (_req, res, next) => {
  try {
    const { subredditName } = context;
    if (!subredditName) throw new GameError('Open this action from a subreddit moderator menu.', 400, 'missing_subreddit');
    const created = await createPostForToday(subredditName);
    res.json({
      showToast: {
        text: created.alreadyExists
          ? `Today's geoMaster post already exists (Dispatch #${created.dispatchNumber}).`
          : `geoMaster Dispatch #${created.dispatchNumber} was created.`,
        appearance: 'success',
      },
      postId: created.postId,
      date: created.date,
    });
  } catch (error) {
    next(error);
  }
});

app.use(sendError);

const server = createServer(app);
server.on('error', (error) => console.error(`[geoMaster] server error: ${error.stack || error.message}`));
server.listen(getServerPort());
