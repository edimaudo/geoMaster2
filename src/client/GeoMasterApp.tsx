import { useCallback, useEffect, useState } from 'react';
import { ActivePlay } from './components/ActivePlay';
import { LocalExpedition } from './components/LocalExpedition';
import { QuizMode } from './components/QuizMode';
import { GameSettings, type TextSizeChoice, type ThemeChoice } from './components/GameSettings';
import { QUIZ_MODES, type QuizModeId } from '../shared/countries';

const QUIZ_MODE_DESCRIPTIONS: Record<QuizModeId, string> = {
  country: 'Find the flag that belongs to each country',
  flag: 'Name the country behind each flag',
  capital: 'Choose the flag for each capital city',
  guesser: 'Read the clues. Work out the country',
};

interface AppSettings {
  soundEnabled: boolean;
  theme: ThemeChoice;
  textSize: TextSizeChoice;
}

function readAppSettings(): AppSettings {
  try {
    return {
      soundEnabled: localStorage.getItem('geomaster_sound') !== 'false',
      theme: localStorage.getItem('geomaster_theme') === 'light' ? 'light' : 'dark',
      textSize: (['small', 'medium', 'large'].includes(localStorage.getItem('geomaster_text_size') || '')
        ? localStorage.getItem('geomaster_text_size') : 'medium') as TextSizeChoice,
    };
  } catch {
    return { soundEnabled: true, theme: 'dark', textSize: 'medium' };
  }
}

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

const DAILY_EXPEDITION_BEST_KEY = 'geomaster_daily_expedition_best_score';

function readBestExpeditionScore(): number | null {
  try {
    const stored = localStorage.getItem(DAILY_EXPEDITION_BEST_KEY);
    if (stored === null) return null;
    const score = Number(stored);
    return Number.isFinite(score) && score >= 0 ? score : null;
  } catch {
    return null;
  }
}

function formatExpeditionScore(score: number | null): string {
  return score === null ? '—' : `${score.toLocaleString()} pts`;
}

function ModeHub({
  onDaily,
  onQuiz,
  onOpenSettings,
}: {
  onDaily: () => void;
  onQuiz: (mode: QuizModeId) => void;
  onOpenSettings: () => void;
}): JSX.Element {
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const records = [
    { id: 'daily-expedition', displayTitle: 'Daily Expedition', displayBest: formatExpeditionScore(readBestExpeditionScore()) },
    ...QUIZ_MODES.map((mode) => ({
      id: mode.id,
      displayTitle: mode.title.replace(/\s+Mode$/i, ''),
      displayBest: formatTime(readBestTime(mode.id)),
    })),
  ];

  const clearRecords = () => {
    try {
      for (const mode of QUIZ_MODES) localStorage.removeItem(`geomaster_${mode.id}`);
      localStorage.removeItem(DAILY_EXPEDITION_BEST_KEY);
    } catch {
      // Browser storage is optional; gameplay does not depend on it.
    }
    setRecordsVersion((value) => value + 1);
    setConfirmClear(false);
  };

  return (
    <main className="hub-shell">
      <header className="hub-header">
        <div className="hub-brand" aria-label="geoMaster">geoMaster</div>
      </header>
      <h1 className="sr-only">geoMaster games</h1>

      <section className="hub-mode-list" aria-label="geoMaster game modes">
        <button className="hub-mode-row mode-expedition" type="button" onClick={onDaily}>
          <span className="hub-mode-copy"><strong>Daily Expedition</strong><span>Find the right spot</span></span>
        </button>
        {QUIZ_MODES.map((mode) => (
          <button key={mode.id} className={`hub-mode-row mode-${mode.id}`} type="button" onClick={() => onQuiz(mode.id)}>
            <span className="hub-mode-copy"><strong>{mode.title.replace(/\s+Mode$/i, '')}</strong><span>{QUIZ_MODE_DESCRIPTIONS[mode.id]}</span></span>
          </button>
        ))}
      </section>

      <section className="hub-records" aria-label="All game personal bests">
        <div className="hub-record-heading">
          <h2>Personal Bests</h2>
          <button type="button" onClick={() => setConfirmClear(true)}>Clear records</button>
        </div>
        <div className="hub-record-grid" key={recordsVersion}>
          {records.map((mode) => (
            <div key={mode.id}><span>{mode.displayTitle}</span><strong>{mode.displayBest}</strong></div>
          ))}
        </div>
        {confirmClear && (
          <div className="hub-clear-confirm" role="group" aria-labelledby="clear-records-title">
            <span id="clear-records-title">Clear all five game personal bests?</span>
            <button type="button" onClick={clearRecords}>Clear</button>
            <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        )}
      </section>

      <button className="hub-settings-button" type="button" onClick={onOpenSettings}>Settings</button>
    </main>
  );
}

export function GeoMasterApp(): JSX.Element {
  const isVercelWebBuild = import.meta.env.MODE === 'web-preview';
  const [view, setView] = useState<'hub' | 'daily' | 'quiz'>('hub');
  const [quizMode, setQuizMode] = useState<QuizModeId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(readAppSettings);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  useEffect(() => {
    try {
      localStorage.setItem('geomaster_sound', String(settings.soundEnabled));
      localStorage.setItem('geomaster_theme', settings.theme);
      localStorage.setItem('geomaster_text_size', settings.textSize);
    } catch {
      // Settings remain available in memory when storage is unavailable.
    }
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.textSize = settings.textSize;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', settings.theme === 'dark' ? '#19192d' : '#f5f1e9');
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const returnToModes = () => {
    setQuizMode(null);
    setView('hub');
  };

  return (
    <div className={`geomaster-app theme-${settings.theme}`}>
      {view === 'daily' ? (
        isVercelWebBuild
          ? <LocalExpedition onBack={returnToModes} onOpenSettings={openSettings} soundEnabled={settings.soundEnabled} />
          : <ActivePlay onBack={returnToModes} onOpenSettings={openSettings} soundEnabled={settings.soundEnabled} />
      ) : view === 'quiz' && quizMode ? (
        <QuizMode mode={quizMode} onBack={returnToModes} soundEnabled={settings.soundEnabled} onOpenSettings={openSettings} />
      ) : (
        <ModeHub
          onDaily={() => setView('daily')}
          onQuiz={(mode) => { setQuizMode(mode); setView('quiz'); }}
          onOpenSettings={openSettings}
        />
      )}

      {settingsOpen && (
        <GameSettings
          soundEnabled={settings.soundEnabled}
          theme={settings.theme}
          textSize={settings.textSize}
          onSoundChange={(value) => updateSetting('soundEnabled', value)}
          onThemeChange={(value) => updateSetting('theme', value)}
          onTextSizeChange={(value) => updateSetting('textSize', value)}
          onClose={closeSettings}
        />
      )}
    </div>
  );
}
