import { useState } from 'react';
import type { InitResponse, RoundResult } from '../../shared/types';
import { formatDistance } from '../../shared/geo';
import { VectorMap } from './VectorMap';
import { GameHeader } from './GameHeader';

interface Props {
  data: InitResponse;
  results: RoundResult[];
  totalScore: number;
  percentileTop: number | null;
  playerCount: number;
  streak: number;
  earnedFlairs: string[];
  hasCommented: boolean;
  onShared: () => void;
  onBack?: () => void;
  onOpenSettings: () => void;
}

async function postAction(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  const body = await response.json() as { error?: string; [key: string]: unknown };
  if (!response.ok) throw new Error(body.error || 'The action could not be completed.');
  return body;
}

function flairTitle(flairs: string[]): string {
  if (flairs.includes('Cartographer')) return 'Cartographer';
  if (flairs.includes('7-day streak')) return '7-Day Streak';
  return 'Under 100 km';
}

export function ResultCard({
  data,
  results,
  totalScore,
  percentileTop,
  playerCount,
  streak,
  earnedFlairs,
  hasCommented,
  onShared,
  onBack,
  onOpenSettings,
}: Props): JSX.Element {
  const [selectedRound, setSelectedRound] = useState(1);
  const [shareBusy, setShareBusy] = useState(false);
  const [flairBusy, setFlairBusy] = useState(false);
  const [equipped, setEquipped] = useState('');
  const [actionError, setActionError] = useState('');
  const selected = results.find((item) => item.round === selectedRound) || results[0] || null;
  const pinned = results.filter((item) => item.distanceKm !== null);
  const avgKm = pinned.length
    ? pinned.reduce((sum, item) => sum + (item.distanceKm || 0), 0) / pinned.length
    : null;

  const handleShare = async () => {
    setShareBusy(true);
    setActionError('');
    try {
      await postAction('/api/share');
      onShared();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The result could not be posted.');
    } finally {
      setShareBusy(false);
    }
  };

  const handleFlair = async () => {
    setFlairBusy(true);
    setActionError('');
    try {
      const response = await postAction('/api/flair');
      setEquipped(String(response.flair || flairTitle(earnedFlairs)));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The flair could not be equipped.');
    } finally {
      setFlairBusy(false);
    }
  };

  return (
    <main className="result-shell">
      <GameHeader mode="Daily Expedition" onOpenSettings={onOpenSettings} />
      <header className="result-heading">
        <div>
          
          <h1>Your atlas is ready.</h1>
          <p>Dispatch #{String(data.dispatchNumber).padStart(3, '0')} · {data.date} UTC</p>
        </div>
      </header>

      <section className="score-hero" aria-label="Daily score summary">
        <div className="score-total"><strong>{totalScore.toLocaleString()}</strong><span>/ 5,000 pts</span></div>
        <div className="score-details">
          <div><strong>{percentileTop === null || data.isArchive ? '—' : `Top ${percentileTop}%`}</strong><span>{data.isArchive ? 'Practice archive' : `${playerCount.toLocaleString()} geoMaster players`}</span></div>
          <div><strong>{streak} day{streak === 1 ? '' : 's'}</strong><span>Current streak</span></div>
          <div><strong>{avgKm === null ? 'No pins' : formatDistance(avgKm)}</strong><span>Average error</span></div>
        </div>
      </section>

      <section className="atlas-inspection">
        <div className="section-head"><div><h2>Inspect your route</h2></div><span className="muted-small">Select a round</span></div>
        <div className="round-strip" role="tablist" aria-label="Inspect individual rounds">
          {results.map((result) => (
            <button
              key={result.round}
              type="button"
              role="tab"
              aria-selected={selectedRound === result.round}
              className={`round-result-pill ${selectedRound === result.round ? 'selected' : ''}`}
              onClick={() => setSelectedRound(result.round)}
            >
              <span>R{result.round}</span>
              <strong>{formatDistance(result.distanceKm)}</strong>
              
            </button>
          ))}
        </div>
        {selected && (
          <div className="selected-round-panel" role="tabpanel">
            <VectorMap reveal={selected} compact />
            <div className="selected-location">
              <div><h3>{selected.locationName}</h3><p>{selected.country}</p></div>
              <div className="coordinates-line">{selected.targetLat.toFixed(2)}° {selected.targetLat >= 0 ? 'N' : 'S'} · {Math.abs(selected.targetLng).toFixed(2)}° {selected.targetLng >= 0 ? 'E' : 'W'}</div>
              <div className="comparison-line">
                <span>Your error <strong>{formatDistance(selected.distanceKm)}</strong></span>
                <span>All players <strong>{formatDistance(selected.crowdAvgDistanceKm)}</strong></span>
                <span>Round score <strong>{selected.roundScore.toLocaleString()}</strong></span>
              </div>
              {selected.triviaTitle && <div className="trivia-note"><strong>{selected.triviaTitle}</strong><p>{selected.triviaNote}</p></div>}
            </div>
          </div>
        )}
      </section>

      {!data.isArchive && (
        <section className="community-actions">
          <div className="action-row">
            <div><strong>Share your expedition</strong><p>Add your score to the expedition discussion.</p></div>
            <button className="primary-button action-button" type="button" onClick={handleShare} disabled={hasCommented || shareBusy}>
              {hasCommented ? 'Posted ✓' : shareBusy ? 'Posting…' : 'Post Result to Comments'}
            </button>
          </div>
          {earnedFlairs.length > 0 && (
            <div className="action-row flair-row">
              <div><strong>Milestone unlocked</strong><p>{equipped ? `Equipped: ${equipped}` : `You earned the ${flairTitle(earnedFlairs)} flair.`}</p></div>
              <button className="secondary-button action-button" type="button" onClick={handleFlair} disabled={flairBusy || Boolean(equipped)}>
                {equipped ? 'Equipped ✓' : flairBusy ? 'Equipping…' : `Equip “${flairTitle(earnedFlairs)}” Flair`}
              </button>
            </div>
          )}
          <div className="action-row reminder-row">
            <div><strong>Daily dispatch reminder</strong><p>Get notified when tomorrow’s coordinates arrive at 00:00 UTC.</p></div>
            <button className="secondary-button reminder-button" type="button" disabled aria-disabled="true">Unavailable</button>
          </div>
          <p className="platform-note">Daily reminders are not available yet.</p>
        </section>
      )}

      {actionError && <p className="action-error" role="alert">{actionError}</p>}
      {onBack && <button className="primary-button expedition-back-button" type="button" onClick={onBack}>Back to games</button>}
    </main>
  );
}
