export type SessionStatus = 'UNSTARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface GeoLocation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  continent: string;
  lat: number;
  lng: number;
  tier: 1 | 2 | 3 | 4 | 5;
  clueType: string;
  triviaTitle?: string;
  triviaNote?: string;
  fridayTheme?: string;
}

export interface PuzzleRound {
  round: number;
  locationId: string;
  locationName: string;
  country: string;
  continent: string;
  clueType: string;
  lat: number;
  lng: number;
  tier: number;
  triviaTitle?: string;
  triviaNote?: string;
}

export interface DailyPuzzle {
  date: string;
  dispatchNumber: number;
  rounds: PuzzleRound[];
}

export interface RoundResult {
  round: number;
  locationName: string;
  country: string;
  targetLat: number;
  targetLng: number;
  guessLat: number | null;
  guessLng: number | null;
  distanceKm: number | null;
  roundScore: number;
  crowdCentroidLat: number | null;
  crowdCentroidLng: number | null;
  crowdAvgDistanceKm: number | null;
  crowdCount: number;
  triviaTitle?: string;
  triviaNote?: string;
}

export interface SessionState {
  postId: string;
  userId: string;
  date: string;
  isArchive: boolean;
  status: SessionStatus;
  currentRound: number;
  roundStartedAt: number | null;
  rounds: RoundResult[];
  totalScore: number;
  hasCommented: boolean;
  startedAt: number | null;
  completedAt: number | null;
}

export type PublicSessionState = Omit<SessionState, 'postId' | 'userId'>;

export interface UserStats {
  streak: number;
  maxStreak: number;
  lastCompletedDate: string | null;
  unlockedFlairs: string[];
}

export interface PublicRound {
  round: number;
  tier: number;
  country: string;
  continent: string;
  clueType: string;
}

export interface InitResponse {
  date: string;
  dispatchNumber: number;
  isArchive: boolean;
  playedToday: number;
  geoMasterAvgDistanceKm: number | null;
  status: SessionStatus;
  currentRound: number;
  streak: number;
  maxStreak: number;
  round: PublicRound | null;
  roundStartedAt: number | null;
  deadlineAt: number | null;
  results: RoundResult[];
  totalScore: number;
  hasCommented: boolean;
  percentileTop: number | null;
  playerCount: number;
  earnedFlairs: string[];
}

export interface RoundStartResponse {
  session: PublicSessionState;
  round: PublicRound | null;
  roundStartedAt: number | null;
  deadlineAt: number | null;
  expired?: boolean;
  reveal?: RoundResult;
  streak: number;
}

export interface RoundSubmitResponse {
  result: RoundResult;
  session: PublicSessionState;
  percentileTop: number | null;
  playerCount: number;
  streak: number;
  earnedFlairs: string[];
}

export interface ApiError {
  error: string;
  code?: string;
}
