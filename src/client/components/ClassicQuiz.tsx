import { useEffect, useRef, useState } from 'react';
import {
  buildClassicQuestions,
  CLASSIC_MODES,
  flagUrl,
  type ClassicGameMode,
  type CountryRecord,
} from '../../shared/countries';

type QuizStatus = 'menu' | 'playing' | 'results';
type Question = ReturnType<typeof buildClassicQuestions>[number];

interface AnswerFeedback {
  isCorrect: boolean;
  selectedCode: string;
}

function readBestTime(mode: ClassicGameMode): number | null {
  try {
    const value = Number(localStorage.getItem(`geomaster_${mode}`));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function playTone(kind: 'correct' | 'wrong' | 'click', enabled: boolean): void {
  if (!enabled) return;
  try {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    const now = context.currentTime;
    if (kind === 'correct') {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(523.25, now);
      oscillator.frequency.setValueAtTime(659.25, now + 0.08);
      oscillator.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      oscillator.start(now);
      oscillator.stop(now + 0.28);
    } else if (kind === 'wrong') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(280, now);
      oscillator.frequency.linearRampToValueAtTime(140, now + 0.2);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
      oscillator.start(now);
      oscillator.stop(now + 0.22);
    } else {
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(420, now);
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
    }
    window.setTimeout(() => { void context.close(); }, 400);
  } catch {
    // Audio is an enhancement; quiz play must continue when it is unavailable.
  }
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function Flag({ country, option = false }: { country: CountryRecord; option?: boolean }): JSX.Element {
  return (
    <img
      className="classic-flag"
      src={flagUrl(country.code)}
      alt={option ? 'Flag option' : 'Country flag'}
      loading="lazy"
      onError={(event) => { event.currentTarget.alt = 'Flag unavailable'; }}
    />
  );
}

export function ClassicQuiz(): JSX.Element {
  const [status, setStatus] = useState<QuizStatus>('menu');
  const [mode, setMode] = useState<ClassicGameMode | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [penalties, setPenalties] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem('geomaster_sound') !== 'false'; } catch { return true; }
  });
  const [darkTheme, setDarkTheme] = useState(() => {
    try { return localStorage.getItem('geomaster_theme') !== 'light'; } catch { return true; }
  });
  const [largeText, setLargeText] = useState(false);
  const transitionRef = useRef<number | null>(null);
  const answerLocked = useRef(false);

  const currentQuestion = questions[questionIndex] || null;
  const currentMode = CLASSIC_MODES.find((item) => item.id === mode) || null;
  const liveTime = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
  const displayedTime = status === 'playing' ? liveTime + penalties : (finalTime ?? elapsedSeconds + penalties);
  const personalBests = CLASSIC_MODES.map((item) => ({ ...item, best: readBestTime(item.id) }));

  useEffect(() => {
    if (status !== 'playing' || startedAt === null) return undefined;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [status, startedAt]);

  useEffect(() => () => {
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
  }, []);

  useEffect(() => {
    if (status !== 'results' || !mode || startedAt === null) return;
    const total = Math.floor((Date.now() - startedAt) / 1000) + penalties;
    const previousBest = readBestTime(mode);
    const isRecord = previousBest === null || total < previousBest;
    setFinalTime(total);
    setBestTime(isRecord ? total : previousBest);
    setNewRecord(isRecord);
    if (isRecord) {
      try { localStorage.setItem(`geomaster_${mode}`, String(total)); } catch { /* Storage is optional. */ }
    }
  }, [status, mode, startedAt, penalties]);

  const startMode = (selectedMode: ClassicGameMode) => {
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
    playTone('click', soundEnabled);
    setMode(selectedMode);
    setQuestions(buildClassicQuestions(selectedMode, 7));
    setQuestionIndex(0);
    setPenalties(0);
    setElapsedSeconds(0);
    setFinalTime(null);
    setFeedback(null);
    setNewRecord(false);
    setStartedAt(Date.now());
    answerLocked.current = false;
    setStatus('playing');
  };

  const chooseAnswer = (country: CountryRecord) => {
    if (!currentQuestion || answerLocked.current || status !== 'playing') return;
    answerLocked.current = true;
    const isCorrect = country.code === currentQuestion.correct.code;
    if (!isCorrect) setPenalties((value) => value + 60);
    setFeedback({ isCorrect, selectedCode: country.code });
    playTone(isCorrect ? 'correct' : 'wrong', soundEnabled);

    transitionRef.current = window.setTimeout(() => {
      if (questionIndex + 1 >= questions.length) {
        setStatus('results');
      } else {
        setQuestionIndex((value) => value + 1);
        setFeedback(null);
        answerLocked.current = false;
      }
      transitionRef.current = null;
    }, 900);
  };

  const backToMenu = () => {
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
    answerLocked.current = false;
    setStatus('menu');
    setMode(null);
    setFeedback(null);
    setStartedAt(null);
  };

  const clearRecords = () => {
    try {
      for (const item of CLASSIC_MODES) localStorage.removeItem(`geomaster_${item.id}`);
    } catch { /* Storage is optional. */ }
    setBestTime(null);
    setNewRecord(false);
    setStatus('menu');
  };

  const toggleSound = () => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      try { localStorage.setItem('geomaster_sound', String(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  };

  const toggleTheme = () => {
    setDarkTheme((dark) => {
      const next = !dark;
      try { localStorage.setItem('geomaster_theme', next ? 'dark' : 'light'); } catch { /* Storage is optional. */ }
      return next;
    });
  };

  const renderPrompt = () => {
    if (!currentQuestion || !mode) return null;
    if (mode === 'country') {
      return <div className="classic-text-prompt"><span className="classic-prompt-label">Find the flag for</span><strong>{currentQuestion.correct.name}</strong></div>;
    }
    if (mode === 'flag') {
      return <div className="classic-flag-prompt"><Flag country={currentQuestion.correct} /><span>Which country does this flag belong to?</span></div>;
    }
    if (mode === 'capital') {
      return <div className="classic-text-prompt"><span className="classic-prompt-label">Which flag belongs to</span><strong>{currentQuestion.correct.capital}?</strong></div>;
    }
    return (
      <div className="classic-facts-prompt">
        <div><span>Capital</span><strong>{currentQuestion.correct.capital}</strong></div>
        <div><span>Population</span><strong>{currentQuestion.correct.pop}</strong></div>
        <div><span>GDP</span><strong>{currentQuestion.correct.gdp}</strong></div>
        <div><span>Beer / year</span><strong>{currentQuestion.correct.beer}</strong></div>
      </div>
    );
  };

  return (
    <main className={`classic-shell ${darkTheme ? 'classic-dark' : 'classic-light'} ${largeText ? 'classic-large-text' : ''}`}>
      <header className="classic-header">
        <div className="classic-brand"><span className="classic-brand-mark">G</span><span>geoMaster</span><span className="classic-tag">CLASSIC</span></div>
        <div className="classic-preferences" aria-label="Game preferences">
          <button type="button" onClick={toggleTheme}>{darkTheme ? 'Dark' : 'Light'}</button>
          <button type="button" onClick={() => setLargeText((value) => !value)}>{largeText ? 'Text + ' : 'Text'}</button>
          <button type="button" onClick={toggleSound}>Sound {soundEnabled ? 'On' : 'Off'}</button>
        </div>
      </header>

      {status === 'menu' && (
        <section className="classic-menu">
          <div className="classic-intro">
            <span className="classic-kicker">THE ORIGINAL geoMaster QUIZ</span>
            <h1>How well do you know the world?</h1>
            <p>Seven questions. Four ways to play. Every incorrect answer adds 60 seconds.</p>
          </div>
          <div className="classic-mode-grid">
            {CLASSIC_MODES.map((item) => (
              <button key={item.id} type="button" className="classic-mode-card" onClick={() => startMode(item.id)}>
                <strong>{item.title}</strong><span>{item.description}</span><i aria-hidden="true">↗</i>
              </button>
            ))}
          </div>
          <p className="classic-source-note">Country and fact values are retained from the original geoMaster dataset.</p>
          <section className="classic-records" aria-label="Personal best times">
            <div className="classic-section-heading"><h2>Personal best times</h2><button type="button" onClick={clearRecords}>Clear records</button></div>
            <div className="classic-record-grid">
              {personalBests.map((item) => (
                <div key={item.id}><span>{item.title}</span><strong>{item.best === null ? '—' : formatTime(item.best)}</strong></div>
              ))}
            </div>
          </section>
        </section>
      )}

      {status === 'playing' && currentQuestion && currentMode && (
        <section className="classic-play">
          <div className="classic-play-top">
            <button type="button" className="classic-back" onClick={backToMenu}>Quit quiz</button>
            <div className="classic-progress"><strong>Question {questionIndex + 1} / {questions.length}</strong><span>{currentMode.title}</span></div>
            <div className="classic-clock"><strong>{formatTime(displayedTime)}</strong><span>elapsed + penalties</span></div>
          </div>
          <div className="classic-progress-track"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
          <div className="classic-prompt-card">{renderPrompt()}</div>
          <div className={`classic-answer-grid ${mode === 'country' || mode === 'capital' ? 'classic-flag-grid' : ''}`} role="group" aria-label="Answer choices">
            {currentQuestion.options.map((option, index) => {
              const selected = feedback?.selectedCode === option.code;
              const isCorrect = option.code === currentQuestion.correct.code;
              const answerClass = feedback
                ? isCorrect ? 'is-correct' : selected ? 'is-wrong' : 'is-muted'
                : '';
              return (
                <button
                  type="button"
                  key={option.code}
                  className={`classic-answer ${answerClass} ${mode === 'country' || mode === 'capital' ? 'classic-answer-flag' : ''}`}
                  onClick={() => chooseAnswer(option)}
                  disabled={Boolean(feedback)}
                  aria-label={mode === 'country' || mode === 'capital' ? `Flag option ${index + 1}` : option.name}
                >
                  {mode === 'country' || mode === 'capital'
                    ? <Flag country={option} option />
                    : <span>{option.name}</span>}
                </button>
              );
            })}
          </div>
          {feedback && (
            <div className={`classic-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-wrong'}`} role="status" aria-live="polite">
              <strong>{feedback.isCorrect ? 'Correct!' : 'Not quite.'}</strong>
              {!feedback.isCorrect && <span>+60 second penalty · Answer: {currentQuestion.correct.name}</span>}
            </div>
          )}
          <div className="classic-penalty-note">Wrong answer: +60 seconds</div>
        </section>
      )}

      {status === 'results' && mode && currentMode && finalTime !== null && (
        <section className="classic-results">
          <span className="classic-kicker">{newRecord ? 'NEW PERSONAL BEST' : 'SESSION COMPLETE'}</span>
          <h1>{newRecord ? 'A new record.' : 'Quiz complete.'}</h1>
          <div className="classic-final-time"><strong>{formatTime(finalTime)}</strong><span>final time</span></div>
          <div className="classic-result-details">
            <div><span>Mode</span><strong>{currentMode.title}</strong></div>
            <div><span>Questions</span><strong>{questions.length}</strong></div>
            <div><span>Penalties</span><strong>{formatTime(penalties)}</strong></div>
            <div><span>Personal best</span><strong>{bestTime === null ? '—' : formatTime(bestTime)}</strong></div>
          </div>
          <div className="classic-result-actions">
            <button type="button" className="classic-primary" onClick={() => startMode(mode)}>Play again</button>
            <button type="button" className="classic-secondary" onClick={backToMenu}>All game modes</button>
          </div>
        </section>
      )}

      <footer className="classic-footer"><span>geoMaster</span><span>Country data from the original project</span></footer>
    </main>
  );
}
