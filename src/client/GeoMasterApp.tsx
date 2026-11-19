import { useState } from 'react';
import { ActivePlay } from './components/ActivePlay';
import { QuizMode } from './components/QuizMode';
import { QUIZ_MODES, type QuizModeId } from '../shared/countries';

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
}: {
  onDaily: () => void;
  onQuiz: (mode: QuizModeId) => void;
}): JSX.Element {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const records = QUIZ_MODES.map((mode) => ({ ...mode, best: readBestTime(mode.id) }));

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
        <div className="hub-brand"><span className="hub-brand-mark" aria-hidden="true">G</span><span>geoMaster</span></div>
      </header>

      <section className="hub-intro">
        <h1>Choose a mode</h1>
      </section>

      <section className="hub-mode-grid" aria-label="geoMaster game modes">
        <button className="hub-mode-card hub-mode-card-expedition" type="button" onClick={onDaily}>
          <strong>Daily Expedition</strong>
          <span>Five shared locations · 12 seconds to place each pin.</span>
        </button>
        {QUIZ_MODES.map((mode) => (
          <button key={mode.id} className="hub-mode-card" type="button" onClick={() => onQuiz(mode.id)}>
            <strong>{mode.title}</strong>
            <span>{mode.description} · 7 questions · +60 seconds per wrong answer.</span>
          </button>
        ))}
      </section>

      <section className="hub-records" aria-label="Quiz mode personal bests">
        <div className="hub-record-heading">
          <h2>Personal best times</h2>
          <button type="button" onClick={() => setConfirmClear(true)}>Clear records</button>
        </div>
        <div className="hub-record-grid" key={recordsVersion}>
          {records.map((mode) => (
            <div key={mode.id}><span>{mode.title}</span><strong>{formatTime(mode.best)}</strong></div>
          ))}
        </div>
        {confirmClear && (
          <div className="hub-clear-confirm" role="alertdialog" aria-label="Confirm clearing records">
            <span>Clear all four quiz records?</span>
            <button type="button" onClick={clearRecords}>Clear</button>
            <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </section>
    </main>
  );
}

export function GeoMasterApp(): JSX.Element {
  const [view, setView] = useState<'hub' | 'daily' | 'quiz'>('hub');
  const [quizMode, setQuizMode] = useState<QuizModeId | null>(null);
  const returnToModes = () => {
    setQuizMode(null);
    setView('hub');
  };

  if (view === 'daily') return <ActivePlay onBack={returnToModes} />;
  if (view === 'quiz' && quizMode) return <QuizMode mode={quizMode} onBack={returnToModes} />;

  return (
    <ModeHub
      onDaily={() => setView('daily')}
      onQuiz={(mode) => { setQuizMode(mode); setView('quiz'); }}
    />
  );
}
