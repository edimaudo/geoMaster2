import { useEffect, useRef, useState } from 'react';
import {
  buildQuizQuestions,
  QUIZ_MODES,
  flagUrl,
  type QuizModeId,
  type CountryRecord,
} from '../../shared/countries';

type QuizStatus = 'playing' | 'results';
type Question = ReturnType<typeof buildQuizQuestions>[number];

interface AnswerFeedback {
  isCorrect: boolean;
  selectedCode: string;
}

function readBestTime(mode: QuizModeId): number | null {
  try {
    const value = Number(localStorage.getItem(`geomaster_${mode}`));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function playTone(kind: 'correct' | 'wrong', enabled: boolean): void {
  if (!enabled) return;
  try {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    const duration = kind === 'correct' ? 0.24 : 0.22;
    const startFrequency = kind === 'correct' ? 660 : 330;
    const endFrequency = kind === 'correct' ? 880 : 247;

    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration * 0.78);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.026, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => { void context.close(); };
    if (context.state === 'suspended') void context.resume();
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
      className="quiz-flag"
      src={flagUrl(country.code)}
      alt={option ? `Flag of ${country.name}` : 'Flag shown in the question'}
      loading="lazy"
      onError={(event) => { event.currentTarget.alt = 'Flag unavailable'; }}
    />
  );
}

interface Props { mode: QuizModeId; onBack: () => void; }

export function QuizMode({ mode, onBack }: Props): JSX.Element {
  const [status, setStatus] = useState<QuizStatus>('playing');
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
  const currentMode = QUIZ_MODES.find((item) => item.id === mode) || null;
  const liveTime = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
  const displayedTime = status === 'playing' ? liveTime + penalties : (finalTime ?? elapsedSeconds + penalties);

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

  const startMode = (selectedMode: QuizModeId) => {
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
    setQuestions(buildQuizQuestions(selectedMode, 7));
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

  useEffect(() => {
    startMode(mode);
    // The selected mode is fixed for this mounted game session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setFeedback(null);
    onBack();
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
    if (!currentQuestion) return null;
    if (mode === 'country') {
      return <div className="quiz-text-prompt"><span className="quiz-prompt-label">Find the flag for</span><strong>{currentQuestion.correct.name}</strong></div>;
    }
    if (mode === 'flag') {
      return <div className="quiz-flag-prompt"><Flag country={currentQuestion.correct} /><span>Which country does this flag belong to?</span></div>;
    }
    if (mode === 'capital') {
      return <div className="quiz-text-prompt"><span className="quiz-prompt-label">Which flag belongs to</span><strong>{currentQuestion.correct.capital}?</strong></div>;
    }
    return (
      <div className="quiz-facts-prompt">
        <div><span>Capital</span><strong>{currentQuestion.correct.capital}</strong></div>
        <div><span>Population</span><strong>{currentQuestion.correct.pop}</strong></div>
        <div><span>GDP</span><strong>{currentQuestion.correct.gdp}</strong></div>
        <div><span>Beer / year</span><strong>{currentQuestion.correct.beer}</strong></div>
      </div>
    );
  };

  return (
    <main className={`quiz-shell ${darkTheme ? 'quiz-dark' : 'quiz-light'} ${largeText ? 'quiz-large-text' : ''}`}>
      <header className="quiz-header">
        <div className="quiz-brand"><span>geoMaster</span><span className="quiz-tag">{currentMode?.title}</span></div>
        <div className="quiz-preferences" role="group" aria-label="Game preferences">
          <button type="button" onClick={toggleTheme} aria-pressed={darkTheme} aria-label="Color theme">{darkTheme ? 'Dark theme' : 'Light theme'}</button>
          <button type="button" onClick={() => setLargeText((value) => !value)} aria-pressed={largeText} aria-label="Larger text">{largeText ? 'Standard text' : 'Larger text'}</button>
          <button type="button" onClick={toggleSound} aria-pressed={soundEnabled}>Sound {soundEnabled ? 'On' : 'Off'}</button>
        </div>
      </header>

      {status === 'playing' && currentQuestion && currentMode && (
        <section className="quiz-play">
          <div className="quiz-play-top">
            <button type="button" className="quiz-back" onClick={backToMenu}>All games</button>
            <div className="quiz-progress"><strong>Question {questionIndex + 1} / {questions.length}</strong><span>{currentMode.title}</span></div>
            <div className="quiz-clock" role="timer" aria-live="off"><strong>{formatTime(displayedTime)}</strong><span>Elapsed + penalties</span></div>
          </div>
          <div className="quiz-progress-track" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={questionIndex + 1} aria-valuetext={`Question ${questionIndex + 1} of ${questions.length}`}><span aria-hidden="true" style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
          <div className="quiz-prompt-card">{renderPrompt()}</div>
          <div className={`quiz-answer-grid ${mode === 'country' || mode === 'capital' ? 'quiz-flag-grid' : ''}`} role="group" aria-label="Answer choices">
            {currentQuestion.options.map((option) => {
              const selected = feedback?.selectedCode === option.code;
              const isCorrect = option.code === currentQuestion.correct.code;
              const answerClass = feedback
                ? isCorrect ? 'is-correct' : selected ? 'is-wrong' : 'is-muted'
                : '';
              return (
                <button
                  type="button"
                  key={option.code}
                  className={`quiz-answer ${answerClass} ${mode === 'country' || mode === 'capital' ? 'quiz-answer-flag' : ''}`}
                  onClick={() => chooseAnswer(option)}
                  disabled={Boolean(feedback)}
                  aria-label={option.name}
                >
                  {mode === 'country' || mode === 'capital'
                    ? <Flag country={option} option />
                    : <span>{option.name}</span>}
                </button>
              );
            })}
          </div>
          {feedback && (
            <div className={`quiz-feedback ${feedback.isCorrect ? 'feedback-correct' : 'feedback-wrong'}`} role="status" aria-live="polite">
              <strong>{feedback.isCorrect ? 'Correct!' : 'Not quite.'}</strong>
              {!feedback.isCorrect && <span>+60 second penalty · Answer: {currentQuestion.correct.name}</span>}
            </div>
          )}
          <div className="quiz-penalty-note">Wrong answer: +60 seconds</div>
        </section>
      )}

      {status === 'results' && currentMode && finalTime !== null && (
        <section className="quiz-results">
          <span className="quiz-kicker">{newRecord ? 'NEW PERSONAL BEST' : 'SESSION COMPLETE'}</span>
          <h1>{newRecord ? 'A new record.' : 'Quiz complete.'}</h1>
          <div className="quiz-final-time"><strong>{formatTime(finalTime)}</strong><span>final time</span></div>
          <div className="quiz-result-details">
            <div><span>Game</span><strong>{currentMode.title}</strong></div>
            <div><span>Questions</span><strong>{questions.length}</strong></div>
            <div><span>Penalties</span><strong>{formatTime(penalties)}</strong></div>
            <div><span>Personal best</span><strong>{bestTime === null ? '—' : formatTime(bestTime)}</strong></div>
          </div>
          <div className="quiz-result-actions">
            <button type="button" className="quiz-primary" onClick={() => startMode(mode)}>Play again</button>
            <button type="button" className="quiz-secondary" onClick={backToMenu}>All games</button>
          </div>
        </section>
      )}

    </main>
  );
}
