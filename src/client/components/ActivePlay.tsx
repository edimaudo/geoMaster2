import { useCallback, useEffect, useRef, useState } from 'react';
import { telemetry } from '@devvit/analytics/client/reddit';
import type {
  InitResponse,
  PublicRound,
  RoundResult,
  RoundStartResponse,
  RoundSubmitResponse,
} from '../../shared/types';
import { ResultCard } from './ResultCard';
import { RevealArcOverlay } from './RevealArcOverlay';
import { VectorMap } from './VectorMap';
import { GameHeader, GameNavigation } from './GameHeader';
import { GameProgress } from './GameProgress';
import { playGameTone } from './audio';

interface LatLng { lat: number; lng: number }
interface ApiError { error?: string }
interface TelemetryClient {
  appReady?: () => void | Promise<void>;
  startJourney?: () => void | Promise<void>;
  progress: (event: { progress: number; action?: string }) => void | Promise<void>;
  endJourney: (event: { complete: boolean; game?: { win?: boolean; score?: number } }) => void | Promise<void>;
}

const journeys = telemetry as unknown as TelemetryClient;

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options?.headers || {}) },
  });
  const body = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(body.error || 'The game could not complete that action.');
  return body;
}

function post(): RequestInit {
  return { method: 'POST', body: '{}' };
}

function formatTime(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1);
}

function coord(value: number, axis: 'lat' | 'lng'): string {
  const direction = axis === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${Math.abs(value).toFixed(2)}° ${direction}`;
}

interface Props { onBack?: () => void; onOpenSettings: () => void; soundEnabled: boolean; }

export function ActivePlay({ onBack, onOpenSettings, soundEnabled }: Props): JSX.Element {
  const [data, setData] = useState<InitResponse | null>(null);
  const [round, setRound] = useState<PublicRound | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [revealed, setRevealed] = useState<RoundResult | null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [finalResponse, setFinalResponse] = useState<RoundSubmitResponse | null>(null);
  const [remaining, setRemaining] = useState(12_000);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);
  const submitLock = useRef(false);
  const nextTimeout = useRef<number | null>(null);
  const revealRef = useRef<RoundResult | null>(null);
  const submitRef = useRef<(guess: LatLng | null) => Promise<void>>(async () => undefined);

  const clearNextTimeout = () => {
    if (nextTimeout.current !== null) {
      window.clearTimeout(nextTimeout.current);
      nextTimeout.current = null;
    }
  };

  const startNextRound = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const started = await api<RoundStartResponse>('/api/round/start', post());
      if (started.reveal) {
        revealRef.current = started.reveal;
        setRevealed(started.reveal);
        setResults((previous) => previous.some((item) => item.round === started.reveal!.round)
          ? previous
          : [...previous, started.reveal!].sort((a, b) => a.round - b.round));
        setRound(started.round);
        setDeadlineAt(null);
        setRemaining(0);
        clearNextTimeout();
        if (started.session.status === 'COMPLETED') {
          nextTimeout.current = window.setTimeout(() => {
            void api<InitResponse>('/api/init').then((latest) => {
              setData(latest);
              setResults(latest.results);
              setRevealed(null);
              setRound(null);
            }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The atlas summary could not load.'));
          }, 2500);
        } else {
          nextTimeout.current = window.setTimeout(() => { void startNextRound(); }, 2500);
        }
        return;
      }
      setRound(started.round);
      setPin(null);
      setRevealed(null);
      revealRef.current = null;
      setDeadlineAt(started.deadlineAt);
      setRemaining(started.deadlineAt ? Math.max(0, started.deadlineAt - Date.now()) : 12_000);
      submitLock.current = false;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The next coordinate could not be loaded.');
    } finally {
      setBusy(false);
    }
  }, []);

  const finishSummary = useCallback((response: RoundSubmitResponse) => {
    setFinalResponse(response);
    setRound(null);
    setPin(null);
    setDeadlineAt(null);
    setBusy(false);
    setData((previous) => previous ? {
      ...previous,
      status: 'COMPLETED',
      currentRound: 6,
      round: null,
      roundStartedAt: null,
      deadlineAt: null,
      results: response.session.rounds,
      totalScore: response.session.totalScore,
      hasCommented: false,
      percentileTop: response.percentileTop,
      playerCount: response.playerCount,
      streak: response.streak,
      earnedFlairs: response.earnedFlairs,
    } : previous);
    void journeys.progress({ progress: 1.0, action: 'all_coordinates_completed' });
    void journeys.endJourney({ complete: true, game: { win: true, score: response.session.totalScore } });
  }, []);

  const submitGuess = useCallback(async (guess: LatLng | null) => {
    if (!round || submitLock.current || revealed) return;
    submitLock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await api<RoundSubmitResponse>('/api/round/submit', {
        method: 'POST',
        body: JSON.stringify({ round: round.round, lat: guess?.lat ?? null, lng: guess?.lng ?? null }),
      });
      revealRef.current = response.result;
      setRevealed(response.result);
      setResults(response.session.rounds);
      playGameTone(response.result.roundScore >= 2500 ? 'correct' : 'wrong', soundEnabled);
      setPin(guess);
      setDeadlineAt(null);
      setRemaining(0);
      if (response.session.status !== 'COMPLETED') {
        void journeys.progress({
          progress: response.result.round / 5,
          action: response.result.distanceKm === null ? 'coordinate_timed_out' : 'coordinate_locked',
        });
      }
      if (response.session.status === 'COMPLETED') {
        setFinalResponse(response);
        clearNextTimeout();
        nextTimeout.current = window.setTimeout(() => finishSummary(response), 2500);
      } else {
        clearNextTimeout();
        nextTimeout.current = window.setTimeout(() => { void startNextRound(); }, 2500);
      }
    } catch (reason) {
      submitLock.current = false;
      setError(reason instanceof Error ? reason.message : 'Your pin could not be locked. Try again.');
      setBusy(false);
    }
  }, [round, revealed, startNextRound, finishSummary, soundEnabled]);

  submitRef.current = submitGuess;

  useEffect(() => {
    let active = true;
    void journeys.appReady?.();
    void journeys.startJourney?.();
    const initialise = async () => {
      try {
        const initial = await api<InitResponse>('/api/init');
        if (!active) return;
        setData(initial);
        setResults(initial.results);
        setShared(initial.hasCommented);
        if (initial.status === 'COMPLETED') {
          setRound(null);
          return;
        }
        if (initial.roundStartedAt && initial.deadlineAt && initial.round) {
          setRound(initial.round);
          setDeadlineAt(initial.deadlineAt);
          setRemaining(Math.max(0, initial.deadlineAt - Date.now()));
          return;
        }
        const started = await api<RoundStartResponse>('/api/round/start', post());
        if (!active) return;
        if (started.reveal) {
          setRevealed(started.reveal);
          setResults((previous) => previous.some((item) => item.round === started.reveal!.round)
            ? previous
            : [...previous, started.reveal!].sort((a, b) => a.round - b.round));
          setRound(started.round);
          setDeadlineAt(null);
          if (started.session.status === 'COMPLETED') {
            nextTimeout.current = window.setTimeout(() => {
              void api<InitResponse>('/api/init').then((latest) => {
                setData(latest);
                setResults(latest.results);
                setRevealed(null);
                setRound(null);
              }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The atlas summary could not load.'));
            }, 2500);
          } else {
            nextTimeout.current = window.setTimeout(() => { void startNextRound(); }, 2500);
          }
        } else {
          setRound(started.round);
          setDeadlineAt(started.deadlineAt);
          setRemaining(started.deadlineAt ? Math.max(0, started.deadlineAt - Date.now()) : 12_000);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'geoMaster could not load. Refresh this post to retry.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialise();
    return () => {
      active = false;
      clearNextTimeout();
    };
  }, [startNextRound]);

  useEffect(() => {
    if (!deadlineAt || !round || revealed || data?.status === 'COMPLETED') return;
    const tick = () => {
      const left = Math.max(0, deadlineAt - Date.now());
      setRemaining(left);
      if (left <= 0 && !submitLock.current) void submitRef.current(null);
    };
    tick();
    const interval = window.setInterval(tick, 75);
    return () => window.clearInterval(interval);
  }, [deadlineAt, round, revealed, data?.status]);

  useEffect(() => () => clearNextTimeout(), []);

  const timeValue = formatTime(remaining);
  const ratio = Math.max(0, Math.min(100, (remaining / 12_000) * 100));
  const timerTone = remaining <= 1500 ? 'timer-critical' : remaining <= 3000 ? 'timer-warning' : '';
  const completedResults = finalResponse?.session.rounds || results;
  const summaryData = data && data.status === 'COMPLETED' ? data : null;

  useEffect(() => {
    if (!summaryData) return;
    try {
      const stored = localStorage.getItem('geomaster_daily_expedition_best_score');
      const previousBest = stored === null ? null : Number(stored);
      if (previousBest === null || !Number.isFinite(previousBest) || summaryData.totalScore > previousBest) {
        localStorage.setItem('geomaster_daily_expedition_best_score', String(summaryData.totalScore));
      }
    } catch {
      // Personal-best storage is optional and does not affect the shared session.
    }
  }, [summaryData?.status, summaryData?.totalScore]);

  if (loading) {
    return <main className="game-shell game-loading" aria-live="polite"><GameHeader mode="Daily Expedition" /><p>Loading Daily Expedition…</p><div className="loading-line" /><GameNavigation onBack={onBack || (() => undefined)} onOpenSettings={onOpenSettings} /></main>;
  }

  if (summaryData) {
    return (
      <ResultCard
        data={summaryData}
        results={completedResults}
        totalScore={finalResponse?.session.totalScore ?? summaryData.totalScore}
        percentileTop={finalResponse?.percentileTop ?? summaryData.percentileTop}
        playerCount={finalResponse?.playerCount ?? summaryData.playerCount}
        streak={finalResponse?.streak ?? summaryData.streak}
        earnedFlairs={finalResponse?.earnedFlairs ?? summaryData.earnedFlairs}
        hasCommented={shared || summaryData.hasCommented}
        onShared={() => setShared(true)}
        onBack={onBack}
        onOpenSettings={onOpenSettings}
      />
    );
  }

  if (error && !round && !revealed) {
    return <main className="game-shell game-error"><GameHeader mode="Daily Expedition" /><h1>Daily Expedition paused</h1><p role="alert">{error}</p><div className="game-error-actions"><button className="primary-button" type="button" onClick={() => window.location.reload()}>Reload geoMaster</button></div><GameNavigation onBack={onBack || (() => undefined)} onOpenSettings={onOpenSettings} /></main>;
  }

  return (
    <main className="game-shell">
      <GameHeader mode="Daily Expedition" />
      <div className="game-hud">
        <GameProgress
          label="Location"
          totalSteps={5}
          completedSteps={results.length}
          currentStep={revealed ? null : (round?.round ?? null)}
        />
        <div className={`timer-block ${timerTone}`} role="timer" aria-live="off" aria-label={`${timeValue} seconds remaining`}>
          <div className="timer-track"><span style={{ width: `${ratio}%` }} /></div>
          <strong>{timeValue}<small>s</small></strong>
        </div>
      </div>

      {error && <p className="game-inline-error" role="alert">{error}</p>}

      {revealed ? (
        <section className="reveal-stage" aria-label={`Round ${revealed.round} revealed`}>
          <VectorMap reveal={revealed} />
          <RevealArcOverlay result={revealed} />
          <button className="primary-button next-button" type="button" onClick={() => { clearNextTimeout(); if (finalResponse?.session.status === 'COMPLETED') finishSummary(finalResponse); else if (revealed.round === 5) { void api<InitResponse>('/api/init').then((latest) => { setData(latest); setResults(latest.results); setRevealed(null); setRound(null); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The atlas summary could not load.')); } else void startNextRound(); }}>
            {revealed.round === 5 ? 'View Atlas Summary' : 'Next Coordinate'}
          </button>
        </section>
      ) : (
        <>
          <section className="expedition-clue-card" aria-labelledby="expedition-clue-title">
            <h1 id="expedition-clue-title">Find the right spot</h1>
            <p>Use the geographic clues to narrow down the location, then place your pin on the map.</p>
            {round ? <dl className="expedition-clue-facts">
              <div><dt>Continent</dt><dd>{round.continent}</dd></div>
              <div><dt>Country</dt><dd>{round.country}</dd></div>
              <div><dt>Feature</dt><dd>{round.clueType.replaceAll('-', ' ')}</dd></div>
            </dl> : <p>Loading the next location…</p>}
          </section>
          <section className="map-stage">
            <div className="map-stage-heading"><div><strong>Where are we?</strong></div><span className="map-coordinate-readout" aria-live="polite">{pin ? `${coord(pin.lat, 'lat')} · ${coord(pin.lng, 'lng')}` : 'No pin placed'}</span></div>
            <VectorMap pin={pin} interactive onPinChange={setPin} />
          </section>
          <div className="game-action-bar">
            <button className="primary-button lock-button" type="button" onClick={() => void submitGuess(pin)} disabled={!pin || busy || !round}>
              {busy ? 'Locking coordinate…' : 'Lock In Pin'}
            </button>
          </div>
        </>
      )}
      <GameNavigation onBack={onBack || (() => undefined)} onOpenSettings={onOpenSettings} />
    </main>
  );
}
