import { useEffect, useMemo, useRef, useState } from 'react';
import catalog from '../../../assets/geo_catalog.json';
import type { GeoLocation, RoundResult } from '../../shared/types';
import { RevealArcOverlay } from './RevealArcOverlay';
import { VectorMap } from './VectorMap';
import { GameHeader, GameNavigation } from './GameHeader';
import { GameProgress } from './GameProgress';
import { playGameTone } from './audio';

const LOCATIONS = (catalog as { locations: GeoLocation[] }).locations;
const ROUND_MS = 12_000;
const DAILY_EXPEDITION_BEST_KEY = 'geomaster_daily_expedition_best_score';

function readBestScore(): number | null {
  try {
    const stored = localStorage.getItem(DAILY_EXPEDITION_BEST_KEY);
    if (stored === null) return null;
    const score = Number(stored);
    return Number.isFinite(score) && score >= 0 ? score : null;
  } catch {
    return null;
  }
}
const dateKey = new Date().toISOString().slice(0, 10);
function dailyLocations(): GeoLocation[] {
  let seed = Number(dateKey.replaceAll('-', ''));
  const pool = [...LOCATIONS];
  const selected: GeoLocation[] = [];
  while (selected.length < 5 && pool.length) {
    seed = (seed * 9301 + 49297) % 233280;
    selected.push(pool.splice(Math.floor((seed / 233280) * pool.length), 1)[0]);
  }
  return selected;
}
function distanceKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
  const rad = (n:number) => n * Math.PI / 180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function LocalExpedition({ onBack, onOpenSettings, soundEnabled }: { onBack?: () => void; onOpenSettings: () => void; soundEnabled: boolean }): JSX.Element {
  const locations = useMemo(dailyLocations, []);
  const [index, setIndex] = useState(0);
  const [pin, setPin] = useState<{lat:number;lng:number}|null>(null);
  const [result, setResult] = useState<RoundResult|null>(null);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [remaining, setRemaining] = useState(ROUND_MS);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(readBestScore);
  const [isNewBest, setIsNewBest] = useState(false);
  const startAt = useRef(Date.now());
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const current = locations[index];

  const submit = (guess: {lat:number;lng:number}|null) => {
    if (result || finished) return;
    const km = guess ? distanceKm(guess, current) : null;
    const score = km === null ? 0 : Math.round(5000 * Math.exp(-km / 1800));
    const next: RoundResult = {
      round: index + 1, locationName: current.name, country: current.country,
      targetLat: current.lat, targetLng: current.lng, guessLat: guess?.lat ?? null,
      guessLng: guess?.lng ?? null, distanceKm: km, roundScore: score,
      crowdCentroidLat: null, crowdCentroidLng: null, crowdAvgDistanceKm: null,
      crowdCount: 0, triviaTitle: current.triviaTitle, triviaNote: current.triviaNote,
    };
    setResult(next); setResults((old) => [...old, next]);
    playGameTone(score >= 2500 ? 'correct' : 'wrong', soundEnabledRef.current);
  };
  useEffect(() => {
    if (result || finished) return;
    startAt.current = Date.now();
    setRemaining(ROUND_MS);
    const timer = window.setInterval(() => {
      const left = Math.max(0, ROUND_MS - (Date.now() - startAt.current));
      setRemaining(left);
      if (!left) { window.clearInterval(timer); submit(null); }
    }, 100);
    return () => window.clearInterval(timer);
  }, [index, result, finished]);

  const advance = () => {
    if (index === 4) {
      const finalScore = results.reduce((sum, item) => sum + item.roundScore, 0);
      const previousBest = readBestScore();
      const hasNewBest = previousBest === null || finalScore > previousBest;
      if (hasNewBest) {
        try { localStorage.setItem(DAILY_EXPEDITION_BEST_KEY, String(finalScore)); } catch { /* Storage is optional. */ }
        setBestScore(finalScore);
      } else {
        setBestScore(previousBest);
      }
      setIsNewBest(hasNewBest);
      setFinished(true);
      return;
    }
    setIndex((n) => n + 1); setPin(null); setResult(null);
  };
  const total = results.reduce((sum, item) => sum + item.roundScore, 0);

  if (finished) return <main className="game-shell expedition-shell expedition-summary">
    <GameHeader mode="Daily Expedition" />
    <h1>Expedition complete</h1><p className="expedition-total">{total.toLocaleString()} <span>points</span></p>
    <p>{isNewBest ? 'New personal best!' : 'Your Daily Expedition result.'}</p>
    <div className="expedition-best-result"><span>Personal best</span><strong>{bestScore === null ? '—' : `${bestScore.toLocaleString()} pts`}</strong></div>
    <div className="expedition-results">{results.map((item) => <div key={item.round}><span>Location {item.round}</span><strong>{item.locationName}, {item.country}</strong><span>{item.distanceKm === null ? 'No pin placed' : `${Math.round(item.distanceKm).toLocaleString()} km away`}</span><b>{item.roundScore.toLocaleString()} pts</b></div>)}</div>
    <GameNavigation onBack={onBack || (() => undefined)} onOpenSettings={onOpenSettings} />
  </main>;

  return <main className="game-shell expedition-shell">
    <GameHeader mode="Daily Expedition" />
    <div className="game-hud">
      <GameProgress label="Location" totalSteps={5} completedSteps={index + (result ? 1 : 0)} currentStep={result ? null : index + 1} />
      <div className="timer-block" role="timer" aria-live="off" aria-label={`${(remaining/1000).toFixed(1)} seconds remaining`}><div className="timer-track"><span style={{width:`${remaining/ROUND_MS*100}%`}}/></div><strong>{(remaining/1000).toFixed(1)}<small>s</small></strong></div>
    </div>
    {result ? <section className="reveal-stage">
      <VectorMap reveal={result}/><RevealArcOverlay result={result}/>
      <div className="expedition-answer"><strong>{current.name}, {current.country}</strong><span>{result.distanceKm === null ? 'Time expired · no pin placed' : `${Math.round(result.distanceKm).toLocaleString()} km from your pin`}</span><b>{result.roundScore.toLocaleString()} points</b></div>
      <button className="primary-button next-button" type="button" onClick={advance}>{index === 4 ? 'See results' : 'Next location'}</button>
    </section> : <>
      <section className="expedition-clue-card" aria-labelledby="expedition-clue-title">
        <h1 id="expedition-clue-title">Find the right spot</h1>
        <p>Use the geographic clues to narrow down the location, then place your pin on the map.</p>
        <dl className="expedition-clue-facts">
          <div><dt>Continent</dt><dd>{current.continent}</dd></div>
          <div><dt>Country</dt><dd>{current.country}</dd></div>
          <div><dt>Feature</dt><dd>{current.clueType.replaceAll('-', ' ')}</dd></div>
        </dl>
      </section>
      <section className="map-stage"><div className="map-stage-heading"><strong>Place the pin</strong><span className="map-coordinate-readout">{pin ? `${pin.lat.toFixed(2)}°, ${pin.lng.toFixed(2)}°` : 'Select a location on the map'}</span></div><VectorMap pin={pin} interactive onPinChange={setPin}/></section>
      <div className="game-action-bar"><button className="primary-button lock-button" type="button" disabled={!pin} onClick={() => submit(pin)}>Lock in location</button></div>
    </>}
    <GameNavigation onBack={onBack || (() => undefined)} onOpenSettings={onOpenSettings} />
  </main>;
}
