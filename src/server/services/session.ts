import { redis, settings } from '@devvit/web/server';
import { haversineKm, isValidLatLng, scoreDistanceKm } from '../../shared/geo';
import type {
  DailyPuzzle,
  InitResponse,
  PublicRound,
  PublicSessionState,
  RoundResult,
  RoundStartResponse,
  RoundSubmitResponse,
  SessionState,
  UserStats,
} from '../../shared/types';
import { buildDailyPuzzle, utcDateString } from './geoGen';

export const ROUND_DURATION_MS = 12_000;
const SUBMIT_GRACE_MS = 500;
const VECTOR_SCALE = 1_000_000;

export class GameError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = 'bad_request') {
    super(message);
    this.name = 'GameError';
  }
}

function sessionKey(postId: string, userId: string): string {
  return `geomaster:session:${postId}:${userId}`;
}

function puzzleKey(date: string): string {
  return `geomaster:puzzle:${date}`;
}

function crowdKey(date: string, round: number): string {
  return `geomaster:crowd:${date}:${round}`;
}

function userKey(userId: string): string {
  return `geomaster:user:${userId}`;
}

function leaderboardKey(date: string): string {
  return `geomaster:lb:${date}`;
}

function readJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function asInteger(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

export function publicSession(session: SessionState): PublicSessionState {
  const { postId: _postId, userId: _userId, ...safe } = session;
  return safe;
}

export async function configuredServerSalt(): Promise<string> {
  const fromSettings = await settings.get<string>('serverSalt');
  const configured = (fromSettings || process.env.SERVER_SALT || '').trim();
  if (configured.length < 24) {
    throw new GameError(
      'geoMaster is not configured yet. A moderator must set the serverSalt app secret before playtesting.',
      503,
      'server_salt_missing',
    );
  }
  return configured;
}

export async function getDailyPuzzle(date: string): Promise<DailyPuzzle> {
  const key = puzzleKey(date);
  const cached = readJson<DailyPuzzle>(await redis.get(key));
  if (cached?.rounds?.length === 5) return cached;

  const salt = await configuredServerSalt();
  const puzzle = buildDailyPuzzle(date, salt);
  // Generation is deterministic for a given date+secret, so concurrent cold starts
  // can safely write the same value without a separate distributed lock.
  await redis.set(key, JSON.stringify(puzzle));
  return puzzle;
}

export async function readUserStats(userId: string): Promise<UserStats> {
  const raw = await redis.hGetAll(userKey(userId));
  let unlockedFlairs: string[] = [];
  try {
    const parsed = JSON.parse(raw.unlockedFlairs || '[]') as unknown;
    if (Array.isArray(parsed)) unlockedFlairs = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    unlockedFlairs = [];
  }
  return {
    streak: asInteger(raw.streak),
    maxStreak: asInteger(raw.maxStreak),
    lastCompletedDate: raw.lastCompletedDate || null,
    unlockedFlairs,
  };
}

function freshSession(postId: string, userId: string, date: string, isArchive: boolean): SessionState {
  return {
    postId,
    userId,
    date,
    isArchive,
    status: 'UNSTARTED',
    currentRound: 1,
    roundStartedAt: null,
    rounds: [],
    totalScore: 0,
    hasCommented: false,
    startedAt: null,
    completedAt: null,
  };
}

export async function loadOrCreateSession(
  postId: string,
  userId: string,
  date: string,
  isArchive: boolean,
): Promise<SessionState> {
  const key = sessionKey(postId, userId);
  const existing = readJson<SessionState>(await redis.get(key));
  if (existing) return existing;
  const created = freshSession(postId, userId, date, isArchive);
  await redis.set(key, JSON.stringify(created));
  return created;
}

export async function crowdSummary(date: string, round: number): Promise<{
  centroid: { lat: number; lng: number } | null;
  averageKm: number | null;
  count: number;
}> {
  const values = await redis.hGetAll(crowdKey(date, round));
  const count = asInteger(values.count);
  if (count <= 0) return { centroid: null, averageKm: null, count: 0 };
  const points = [] as Array<{ lat: number; lng: number }>;
  const x = Number(values.sumX || 0) / VECTOR_SCALE;
  const y = Number(values.sumY || 0) / VECTOR_SCALE;
  const z = Number(values.sumZ || 0) / VECTOR_SCALE;
  const length = Math.sqrt(x * x + y * y + z * z);
  const centroid = length < 1e-12
    ? null
    : {
        lat: (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI,
        lng: (Math.atan2(y, x) * 180) / Math.PI,
      };
  const distanceMeters = Number(values.sumDistanceMeters || 0);
  return {
    centroid,
    averageKm: distanceMeters / count / 1000,
    count,
  };
}

async function averageDailyCrowdDistance(date: string): Promise<number | null> {
  const values = await Promise.all([1, 2, 3, 4, 5].map((round) => crowdSummary(date, round)));
  const averages = values.map((value) => value.averageKm).filter((value): value is number => value !== null);
  return averages.length ? averages.reduce((sum, value) => sum + value, 0) / averages.length : null;
}

export async function buildInitResponse(
  postId: string,
  userId: string,
  date: string,
  isArchive: boolean,
  session: SessionState,
): Promise<InitResponse> {
  const [puzzle, stats, playedTodayRaw, avgDistance] = await Promise.all([
    getDailyPuzzle(date),
    readUserStats(userId),
    redis.get(`geomaster:plays:${date}`),
    averageDailyCrowdDistance(date),
  ]);
  const leaderboard = leaderboardKey(date);
  const [playerCount, rank] = session.status === 'COMPLETED' && !isArchive
    ? await Promise.all([redis.zCard(leaderboard), redis.zRevRank(leaderboard, userId)])
    : [await redis.zCard(leaderboard), null];
  const percentileTop = typeof rank === 'number' && playerCount > 0
    ? Math.max(1, Math.ceil(((rank + 1) / playerCount) * 100))
    : null;
  const active = session.status !== 'COMPLETED' && session.currentRound >= 1 && session.currentRound <= 5;
  const selected = active ? puzzle.rounds[session.currentRound - 1] : null;
  const round: PublicRound | null = selected
    ? {
        round: selected.round,
        tier: selected.tier,
        clueUrl: `/clues/${selected.clueAsset}`,
        clueAlt: selected.clueAlt,
      }
    : null;

  return {
    date,
    dispatchNumber: puzzle.dispatchNumber,
    isArchive,
    playedToday: asInteger(playedTodayRaw),
    geoMasterAvgDistanceKm: avgDistance,
    status: session.status,
    currentRound: session.currentRound,
    streak: stats.streak,
    maxStreak: stats.maxStreak,
    round,
    roundStartedAt: session.roundStartedAt,
    deadlineAt: session.roundStartedAt ? session.roundStartedAt + ROUND_DURATION_MS : null,
    results: session.rounds,
    totalScore: session.totalScore,
    hasCommented: session.hasCommented,
    percentileTop: isArchive ? null : percentileTop,
    playerCount,
    earnedFlairs: session.status === 'COMPLETED' ? getEarnedFlairs(session, stats) : [],
  };
}

export async function startRound(
  postId: string,
  userId: string,
  date: string,
  isArchive: boolean,
): Promise<RoundStartResponse> {
  const key = sessionKey(postId, userId);
  const puzzle = await getDailyPuzzle(date);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const txn = await redis.watch(key);
    const raw = await txn.get(key);
    const session = readJson<SessionState>(raw);
    if (!session) {
      await txn.unwatch();
      throw new GameError('Your game session could not be found. Reload the post to begin again.', 404, 'session_missing');
    }
    if (session.status === 'COMPLETED' || session.currentRound > 5) {
      await txn.unwatch();
      const stats = await readUserStats(userId);
      return { session: publicSession(session), round: null, roundStartedAt: null, deadlineAt: null, streak: stats.streak };
    }
    if (session.roundStartedAt !== null && Date.now() > session.roundStartedAt + ROUND_DURATION_MS + SUBMIT_GRACE_MS) {
      await txn.unwatch();
      const expired = await submitRound(postId, userId, date, isArchive, session.currentRound, null, true);
      const next = expired.session;
      const nextRound = next.status === 'COMPLETED' ? null : publicRound(puzzle, next.currentRound);
      return {
        session: next,
        round: nextRound,
        roundStartedAt: next.roundStartedAt,
        deadlineAt: next.roundStartedAt ? next.roundStartedAt + ROUND_DURATION_MS : null,
        expired: true,
        reveal: expired.result,
        streak: expired.streak,
      };
    }

    if (session.roundStartedAt !== null) {
      await txn.unwatch();
      const stats = await readUserStats(userId);
      return {
        session: publicSession(session),
        round: publicRound(puzzle, session.currentRound),
        roundStartedAt: session.roundStartedAt,
        deadlineAt: session.roundStartedAt + ROUND_DURATION_MS,
        streak: stats.streak,
      };
    }

    const now = Date.now();
    const nextSession: SessionState = {
      ...session,
      status: 'IN_PROGRESS',
      startedAt: session.startedAt ?? now,
      roundStartedAt: now,
    };
    await txn.multi();
    await txn.set(key, JSON.stringify(nextSession));
    if (session.status === 'UNSTARTED') {
      await txn.incrBy(`geomaster:plays:${date}`, 1);
    }
    const committed = await txn.exec();
    if (committed === null) continue;
    const stats = await readUserStats(userId);
    return {
      session: publicSession(nextSession),
      round: publicRound(puzzle, nextSession.currentRound),
      roundStartedAt: now,
      deadlineAt: now + ROUND_DURATION_MS,
      streak: stats.streak,
    };
  }
  throw new GameError('The round could not be started because another request changed the session. Try again.', 409, 'session_conflict');
}

function publicRound(puzzle: DailyPuzzle, roundNumber: number): PublicRound | null {
  const item = puzzle.rounds[roundNumber - 1];
  if (!item) return null;
  return {
    round: item.round,
    tier: item.tier,
    clueUrl: `/clues/${item.clueAsset}`,
    clueAlt: item.clueAlt,
  };
}

function crowdContribution(lat: number, lng: number): { x: number; y: number; z: number } {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  return {
    x: Math.round(Math.cos(phi) * Math.cos(lambda) * VECTOR_SCALE),
    y: Math.round(Math.cos(phi) * Math.sin(lambda) * VECTOR_SCALE),
    z: Math.round(Math.sin(phi) * VECTOR_SCALE),
  };
}

function profileFromHash(raw: Record<string, string>): UserStats {
  let unlockedFlairs: string[] = [];
  try {
    const parsed = JSON.parse(raw.unlockedFlairs || '[]') as unknown;
    if (Array.isArray(parsed)) unlockedFlairs = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    unlockedFlairs = [];
  }
  return {
    streak: asInteger(raw.streak),
    maxStreak: asInteger(raw.maxStreak),
    lastCompletedDate: raw.lastCompletedDate || null,
    unlockedFlairs,
  };
}

function getEarnedFlairs(session: SessionState, stats: UserStats): string[] {
  if (session.rounds.length !== 5) return [];
  const distances = session.rounds.map((round) => round.distanceKm);
  const allPinned = distances.every((distance): distance is number => distance !== null);
  const average = allPinned ? distances.reduce((sum, value) => sum + value, 0) / distances.length : Number.POSITIVE_INFINITY;
  const earned: string[] = [];
  if (average < 100) earned.push('Under 100 km');
  if (stats.streak >= 7) earned.push('7-day streak');
  if (session.totalScore >= 4500) earned.push('Cartographer');
  return earned;
}

export async function submitRound(
  postId: string,
  userId: string,
  date: string,
  isArchive: boolean,
  roundNumber: number,
  guess: { lat: number; lng: number } | null,
  forceTimeout = false,
): Promise<RoundSubmitResponse> {
  const key = sessionKey(postId, userId);
  const puzzle = await getDailyPuzzle(date);
  const puzzleRound = puzzle.rounds[roundNumber - 1];
  if (!puzzleRound) throw new GameError('That coordinate does not exist.', 400, 'invalid_round');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const crowdId = crowdKey(date, roundNumber);
    const userIdKey = userKey(userId);
    const watchedKeys = guess && !isArchive ? [key, crowdId, userIdKey] : [key, userIdKey];
    const txn = await redis.watch(...watchedKeys);
    const rawSession = await txn.get(key);
    const session = readJson<SessionState>(rawSession);
    if (!session) {
      await txn.unwatch();
      throw new GameError('Your session expired. Reload the post to continue.', 404, 'session_missing');
    }

    const existingResult = session.rounds.find((item) => item.round === roundNumber);
    if (existingResult) {
      await txn.unwatch();
      const stats = await readUserStats(userId);
      const rank = !isArchive ? await redis.zRevRank(leaderboardKey(date), userId) : null;
      const count = !isArchive ? await redis.zCard(leaderboardKey(date)) : 0;
      return {
        result: existingResult,
        session: publicSession(session),
        percentileTop: typeof rank === 'number' && count > 0 ? Math.max(1, Math.ceil(((rank + 1) / count) * 100)) : null,
        playerCount: count,
        streak: stats.streak,
        earnedFlairs: getEarnedFlairs(session, stats),
      };
    }

    if (session.status !== 'IN_PROGRESS' || session.currentRound !== roundNumber || session.roundStartedAt === null) {
      await txn.unwatch();
      throw new GameError('This round is no longer active. Reload the game to sync your progress.', 409, 'round_not_active');
    }

    const elapsed = Date.now() - session.roundStartedAt;
    let acceptedGuess = guess;
    if (acceptedGuess && elapsed > ROUND_DURATION_MS + SUBMIT_GRACE_MS) acceptedGuess = null;
    if (!acceptedGuess && !forceTimeout && elapsed < ROUND_DURATION_MS) {
      await txn.unwatch();
      throw new GameError('The timer is still running.', 409, 'timer_active');
    }

    if (acceptedGuess && !isValidLatLng(acceptedGuess)) {
      await txn.unwatch();
      throw new GameError('The pin coordinates are outside the world map.', 400, 'invalid_coordinates');
    }

    const distanceKm = acceptedGuess
      ? haversineKm({ lat: acceptedGuess.lat, lng: acceptedGuess.lng }, { lat: puzzleRound.lat, lng: puzzleRound.lng })
      : null;
    const roundScore = distanceKm === null ? 0 : scoreDistanceKm(distanceKm);

    const crowdRaw = acceptedGuess && !isArchive ? await txn.hGetAll(crowdId) : await redis.hGetAll(crowdId);
    const priorCount = asInteger(crowdRaw.count);
    let sumX = Number(crowdRaw.sumX || 0);
    let sumY = Number(crowdRaw.sumY || 0);
    let sumZ = Number(crowdRaw.sumZ || 0);
    let sumDistanceMeters = Number(crowdRaw.sumDistanceMeters || 0);

    if (acceptedGuess && !isArchive && distanceKm !== null) {
      const contribution = crowdContribution(acceptedGuess.lat, acceptedGuess.lng);
      sumX += contribution.x;
      sumY += contribution.y;
      sumZ += contribution.z;
      sumDistanceMeters += Math.round(distanceKm * 1000);
    }
    const crowdCount = priorCount + (acceptedGuess && !isArchive ? 1 : 0);
    const vectorLength = Math.sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ);
    const centroid = crowdCount > 0 && vectorLength > 1e-6
      ? {
          lat: (Math.atan2(sumZ, Math.sqrt(sumX * sumX + sumY * sumY)) * 180) / Math.PI,
          lng: (Math.atan2(sumY, sumX) * 180) / Math.PI,
        }
      : null;
    const crowdAverageKm = crowdCount > 0 ? sumDistanceMeters / crowdCount / 1000 : null;

    const result: RoundResult = {
      round: roundNumber,
      locationName: puzzleRound.locationName,
      country: puzzleRound.country,
      targetLat: puzzleRound.lat,
      targetLng: puzzleRound.lng,
      guessLat: acceptedGuess?.lat ?? null,
      guessLng: acceptedGuess?.lng ?? null,
      distanceKm,
      roundScore,
      crowdCentroidLat: centroid?.lat ?? null,
      crowdCentroidLng: centroid?.lng ?? null,
      crowdAvgDistanceKm: crowdAverageKm,
      crowdCount,
      triviaTitle: puzzleRound.triviaTitle,
      triviaNote: puzzleRound.triviaNote,
    };

    const nextSession: SessionState = {
      ...session,
      rounds: [...session.rounds, result].sort((a, b) => a.round - b.round),
      currentRound: roundNumber + 1,
      roundStartedAt: null,
      totalScore: session.totalScore + roundScore,
      status: roundNumber === 5 ? 'COMPLETED' : 'IN_PROGRESS',
      completedAt: roundNumber === 5 ? Date.now() : null,
    };

    const rawProfile = await txn.hGetAll(userIdKey);
    let stats = profileFromHash(rawProfile);
    if (roundNumber === 5 && !isArchive) {
      const previousDate = new Date(`${date}T00:00:00.000Z`);
      previousDate.setUTCDate(previousDate.getUTCDate() - 1);
      const yesterday = previousDate.toISOString().slice(0, 10);
      const nextStreak = stats.lastCompletedDate === date
        ? stats.streak
        : stats.lastCompletedDate === yesterday
          ? stats.streak + 1
          : 1;
      stats = {
        ...stats,
        streak: nextStreak,
        maxStreak: Math.max(stats.maxStreak, nextStreak),
        lastCompletedDate: date,
      };
      const provisionalFlairs = getEarnedFlairs(nextSession, stats);
      stats.unlockedFlairs = Array.from(new Set([...stats.unlockedFlairs, ...provisionalFlairs]));
      nextSession.status = 'COMPLETED';
    }

    await txn.multi();
    await txn.set(key, JSON.stringify(nextSession));
    if (acceptedGuess && !isArchive && distanceKm !== null) {
      const contribution = crowdContribution(acceptedGuess.lat, acceptedGuess.lng);
      await txn.hIncrBy(crowdId, 'sumX', contribution.x);
      await txn.hIncrBy(crowdId, 'sumY', contribution.y);
      await txn.hIncrBy(crowdId, 'sumZ', contribution.z);
      await txn.hIncrBy(crowdId, 'sumDistanceMeters', Math.round(distanceKm * 1000));
      await txn.hIncrBy(crowdId, 'count', 1);
    }
    if (roundNumber === 5 && !isArchive) {
      await txn.hSet(userIdKey, {
        streak: String(stats.streak),
        maxStreak: String(stats.maxStreak),
        lastCompletedDate: stats.lastCompletedDate || '',
        unlockedFlairs: JSON.stringify(stats.unlockedFlairs),
      });
      await txn.zAdd(leaderboardKey(date), { member: userId, score: nextSession.totalScore });
    }
    const committed = await txn.exec();
    if (committed === null) continue;

    const playerCount = !isArchive ? await redis.zCard(leaderboardKey(date)) : 0;
    const rank = !isArchive ? await redis.zRevRank(leaderboardKey(date), userId) : null;
    const percentileTop = typeof rank === 'number' && playerCount > 0
      ? Math.max(1, Math.ceil(((rank + 1) / playerCount) * 100))
      : null;
    const latestStats = await readUserStats(userId);
    return {
      result,
      session: publicSession(nextSession),
      percentileTop,
      playerCount,
      streak: latestStats.streak,
      earnedFlairs: getEarnedFlairs(nextSession, latestStats),
    };
  }

  throw new GameError('Your pin could not be saved because another request changed this round. Please retry.', 409, 'submit_conflict');
}

export async function expireRoundIfNeeded(
  postId: string,
  userId: string,
  date: string,
  isArchive: boolean,
  session: SessionState,
): Promise<SessionState> {
  if (
    session.status === 'IN_PROGRESS'
    && session.roundStartedAt !== null
    && Date.now() >= session.roundStartedAt + ROUND_DURATION_MS + SUBMIT_GRACE_MS
    && session.currentRound <= 5
  ) {
    const submitted = await submitRound(postId, userId, date, isArchive, session.currentRound, null, true);
    return {
      ...session,
      ...submitted.session,
      postId,
      userId,
    };
  }
  return session;
}

export async function getGeoMasterPlayedToday(date = utcDateString()): Promise<number> {
  return asInteger(await redis.get(`geomaster:plays:${date}`));
}

export async function createPostForToday(subredditName: string): Promise<{ postId: string; date: string; dispatchNumber: number; alreadyExists: boolean }> {
  const date = utcDateString();
  const puzzle = await getDailyPuzzle(date);
  const previous = await redis.hGet('geomaster:daily-posts', date);
  if (previous) {
    return { postId: previous, date, dispatchNumber: puzzle.dispatchNumber, alreadyExists: true };
  }
  // The hash field is an idempotency claim. If post creation fails, release it so a
  // moderator can safely retry from the subreddit menu.
  const claimed = await redis.hSetNX('geomaster:daily-post-claims', date, 'creating');
  if (!claimed) {
    const existing = await redis.hGet('geomaster:daily-posts', date);
    if (existing) return { postId: existing, date, dispatchNumber: puzzle.dispatchNumber, alreadyExists: true };
    throw new GameError('A daily geoMaster post is already being created. Try again in a moment.', 409, 'post_creation_in_progress');
  }
  try {
    const { reddit } = await import('@devvit/web/server');
    const post = await reddit.submitCustomPost({
      subredditName,
      title: `geoMaster · Dispatch #${String(puzzle.dispatchNumber).padStart(3, '0')} · ${date}`,
      entry: 'default',
      postData: { gameDate: date, dispatchNumber: puzzle.dispatchNumber },
      textFallback: {
        text: `Five coordinates. Twelve seconds each. One shared daily puzzle.\n\nOpen the geoMaster post to play today's expedition.`,
      },
      styles: {
        height: 'REGULAR',
        backgroundColor: '#F8FAFCFF',
        backgroundColorDark: '#0F172AFF',
      },
    });
    await redis.hSet('geomaster:daily-posts', { [date]: post.id });
    return { postId: post.id, date, dispatchNumber: puzzle.dispatchNumber, alreadyExists: false };
  } catch (error) {
    await redis.hDel('geomaster:daily-post-claims', [date]);
    throw error;
  }
}

export async function setEquippedFlair(userId: string, username: string, subredditName: string, session: SessionState): Promise<string> {
  if (session.status !== 'COMPLETED') {
    throw new GameError('Complete all five coordinates before equipping a geoMaster flair.', 409, 'game_not_completed');
  }
  const stats = await readUserStats(userId);
  const earned = getEarnedFlairs(session, stats);
  if (earned.length === 0) {
    throw new GameError('No geoMaster flair has been unlocked yet.', 403, 'no_flair_earned');
  }
  const selected = earned.includes('Cartographer')
    ? 'Cartographer'
    : earned.includes('7-day streak')
      ? '7-Day Streak'
      : 'Under 100 km';
  const { reddit } = await import('@devvit/web/server');
  await reddit.setUserFlair({
    username,
    subredditName,
    text: selected,
    backgroundColor: '#0E7490',
    textColor: 'light',
  });
  return selected;
}

export async function markCommented(postId: string, userId: string): Promise<void> {
  const key = sessionKey(postId, userId);
  const txn = await redis.watch(key);
  const session = readJson<SessionState>(await txn.get(key));
  if (!session) {
    await txn.unwatch();
    throw new GameError('Your result could not be found.', 404, 'session_missing');
  }
  if (session.hasCommented) {
    await txn.unwatch();
    return;
  }
  await txn.multi();
  await txn.set(key, JSON.stringify({ ...session, hasCommented: true }));
  const committed = await txn.exec();
  if (committed === null) throw new GameError('The comment status changed. Reload and try again.', 409, 'share_conflict');
}

export async function getSession(postId: string, userId: string): Promise<SessionState | null> {
  return readJson<SessionState>(await redis.get(sessionKey(postId, userId)));
}

export function currentUtcDate(): string {
  return utcDateString();
}
