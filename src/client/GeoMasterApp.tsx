import { useState } from 'react';
import { ActivePlay } from './components/ActivePlay';
import { LocalExpedition } from './components/LocalExpedition';
import { QuizMode } from './components/QuizMode';
import { QUIZ_MODES, type QuizModeId } from '../shared/countries';

const QUIZ_MODE_DESCRIPTIONS: Record<QuizModeId, string> = {
  country: 'Find the flag for each country.',
  flag: 'Identify the country shown by each flag.',
  capital: 'Match each capital to its flag.',
  guesser: 'Use country facts to identify the country.',
};

function readBestTime(mode: QuizModeId): number | null {
  try {
    const value = Number(localStorage.getItem(`geomaster_${mode}`));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function ModeHub({
  onDaily,
  onQuiz,
  dailyAvailable,
}: {
  onDaily: () => void;
  onQuiz: (mode: QuizModeId) => void;
  dailyAvailable: boolean;
}): JSX.Element {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const records = QUIZ_MODES.map((mode) => ({ ...mode, displayTitle: mode.title, best: readBestTime(mode.id) }));

  const clearRecords = () => {
    try {
      for (const mode of QUIZ_MODES) localStorage.removeItem(`geomaster_${mode.id}`);
    } catch {
      // Browser storage is optional; game play does not depend on it.
    }
    setRecordsVersion((value) => value + 1);
    setConfirmClear(false);
  };

  return (
    <main className="hub-shell">
      <header className="hub-header">
        <div className="hub-brand">geoMaster</div>
      </header>

      <section className="hub-intro">
        <h1>Choose a Game</h1>
      </section>

      <section className="hub-mode-grid" aria-label="geoMaster game modes">
        <button
          className="hub-mode-card hub-mode-card-expedition"
          type="button"
          onClick={onDaily}
          disabled={!dailyAvailable}
          aria-describedby={!dailyAvailable ? 'daily-expedition-platform-note' : undefined}
        >
          <strong>Daily Expedition</strong>
          <span id={!dailyAvailable ? 'daily-expedition-platform-note' : undefined}>
            {dailyAvailable
              ? 'Five locations. Place a pin on the world map.'
              : 'Five locations. Place a pin on the world map.'}
          </span>
        </button>
        {QUIZ_MODES.map((mode) => (
          <button key={mode.id} className="hub-mode-card" type="button" onClick={() => onQuiz(mode.id)}>
            <strong>{mode.title}</strong>
            <span>{QUIZ_MODE_DESCRIPTIONS[mode.id]}</span>
          </button>
        ))}
      </section>

      <section className="hub-records" aria-label="Quiz mode personal bests">
        <div className="hub-record-heading">
          <h2>Quiz personal bests</h2>
          <button type="button" onClick={() => setConfirmClear(true)}>Clear records</button>
        </div>
        <div className="hub-record-grid" key={recordsVersion}>
          {records.map((mode) => (
            <div key={mode.id}><span>{mode.displayTitle}</span><strong>{formatTime(mode.best)}</strong></div>
          ))}
        </div>
        {confirmClear && (
          <div className="hub-clear-confirm" role="group" aria-labelledby="clear-records-title">
            <span id="clear-records-title">Clear all four quiz personal bests?</span>
            <button type="button" onClick={clearRecords}>Clear</button>
            <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </section>
    </main>
  );
}

export function GeoMasterApp(): JSX.Element {
  const isVercelWebBuild = import.meta.env.MODE === 'web-preview';
  const [view, setView] = useState<'hub' | 'daily' | 'quiz'>('hub');
  const [quizMode, setQuizMode] = useState<QuizModeId | null>(null);
  const returnToModes = () => {
    setQuizMode(null);
    setView('hub');
  };

  if (view === 'daily') return isVercelWebBuild
    ? <LocalExpedition onBack={returnToModes} />
    : <ActivePlay onBack={returnToModes} />;
  if (view === 'quiz' && quizMode) return <QuizMode mode={quizMode} onBack={returnToModes} />;

  return (
    <ModeHub
      dailyAvailable={true}
      onDaily={() => setView('daily')}
      onQuiz={(mode) => { setQuizMode(mode); setView('quiz'); }}
    />
  );
}
