import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Shield, Volume2, VolumeX, Zap } from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { CodeViewerPanel } from './components/CodeViewerPanel';
import { GameCanvas } from './components/GameCanvas';
import { GameOverlays } from './components/GameOverlays';
import { DIFFICULTY_CONFIG, STAGES } from './data/stages';
import { STAGE_NAMES_KO, UILocale, UI_TEXT } from './i18n/translations';
import { Difficulty, GameState, GameStats, Language, LiveExecutionState } from './types/game';

const HIGH_SCORE_KEY = 'star_pattern_blaster_high_score';
const LOCALE_KEY = 'star_pattern_blaster_locale';

export default function App() {
  const [locale, setLocale] = useState<UILocale>(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      return saved === 'ko' ? 'ko' : 'en';
    } catch {
      return 'en';
    }
  });

  const [gameState, setGameState] = useState<GameState>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [language, setLanguage] = useState<Language>('python');
  const [stageNumber, setStageNumber] = useState<number>(1);
  const [autoFire, setAutoFire] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [runId, setRunId] = useState<number>(1);

  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [stats, setStats] = useState<GameStats>(() => ({
    score: 0,
    combo: 1,
    maxCombo: 1,
    comboTimer: 0,
    starsDestroyed: 0,
    shotsFired: 0,
    shotsHit: 0,
    lives: DIFFICULTY_CONFIG.normal.lives,
    maxLives: DIFFICULTY_CONFIG.normal.lives,
    stageNumber: 1,
    continueTimer: 0,
    ippTimer: 0,
  }));

  const [liveExec, setLiveExec] = useState<LiveExecutionState>({
    stageNumber: 1,
    activeRole: 'setup',
    varI: 0,
    varJ: 0,
    varN: STAGES[0].n,
    isCoreHit: false,
    lastEventLabel: UI_TEXT[locale].readyToExec,
    starsRemaining: 36,
    starsTotal: 36,
  });

  const stageTimerRef = useRef<number | null>(null);

  const clearStageTimer = () => {
    if (stageTimerRef.current !== null) {
      window.clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearStageTimer();
  }, []);

  const handleToggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next: UILocale = prev === 'en' ? 'ko' : 'en';
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      setLiveExec((le) => ({
        ...le,
        lastEventLabel:
          gameState === 'START' ? UI_TEXT[next].readyToExec : le.lastEventLabel,
      }));
      return next;
    });
  }, [gameState]);

  const persistHighScore = useCallback((score: number) => {
    setHighScore((prev) => {
      if (score > prev) {
        try {
          localStorage.setItem(HIGH_SCORE_KEY, String(score));
        } catch {
          // Ignore storage quota errors
        }
        return score;
      }
      return prev;
    });
  }, []);

  const handleStart = useCallback(() => {
    clearStageTimer();
    soundEngine.unlock();
    setStageNumber(1);
    setRunId((r) => r + 1);
    setGameState('PLAYING');
  }, []);

  const handleRestart = useCallback(() => {
    clearStageTimer();
    soundEngine.unlock();
    setStageNumber(1);
    setRunId((r) => r + 1);
    setGameState('PLAYING');
  }, []);

  const handleStageClear = useCallback(() => {
    clearStageTimer();
    setGameState('STAGE_CLEAR');
    stageTimerRef.current = window.setTimeout(() => {
      setStageNumber((prev) => Math.min(STAGES.length, prev + 1));
      setGameState('PLAYING');
    }, 1500);
  }, []);

  const handleGameOver = useCallback(() => {
    clearStageTimer();
    setGameState('GAME_OVER');
  }, []);

  const handleVictory = useCallback(() => {
    clearStageTimer();
    setGameState('VICTORY');
  }, []);

  const handleTogglePause = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleStatsUpdate = useCallback(
    (nextStats: GameStats) => {
      setStats(nextStats);
      if (nextStats.score > highScore) {
        persistHighScore(nextStats.score);
      }
    },
    [highScore, persistHighScore],
  );

  const t = UI_TEXT[locale];
  const currentStage = STAGES[stageNumber - 1] ?? STAGES[0];
  const currentStageName =
    locale === 'ko'
      ? STAGE_NAMES_KO[currentStage.stageNumber]?.name ?? currentStage.name
      : currentStage.name;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#060A14] text-slate-100 overflow-hidden">
      {/* Top Arcade HUD Bar */}
      <header className="flex items-center justify-between gap-6 px-5 py-2.5 bg-[#090F1E] border-b border-slate-800/90 shrink-0">
        {/* Brand Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
            {t.appTitle}
          </span>
        </div>

        {/* Live Telemetry: Stage, Score, Combo, Shields */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono-code">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-slate-400">{t.stage}</span>
            <span className="text-cyan-300 font-semibold tabular-nums">
              {stageNumber}/{STAGES.length}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className={currentStage.isBoss ? 'text-amber-300 font-semibold' : 'text-slate-200'}>
              {currentStageName}
            </span>
          </div>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-slate-400">{t.score}</span>
            <span className="text-emerald-400 font-bold text-sm tabular-nums">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-slate-400">{t.combo}</span>
            <span
              className={`font-bold tabular-nums ${
                stats.combo >= 5 ? 'text-amber-300' : 'text-cyan-300'
              }`}
            >
              {stats.combo}x
            </span>
            <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  stats.combo >= 5 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.round(stats.comboTimer * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 whitespace-nowrap" aria-label={`${t.shields}: ${stats.lives}`}>
            <span className="text-slate-400 mr-1">{t.shields}</span>
            {Array.from({ length: stats.maxLives }).map((_, idx) => {
              const active = idx < stats.lives;
              return (
                <Shield
                  key={idx}
                  className={`w-4 h-4 transition-colors ${
                    active ? 'text-cyan-400 fill-cyan-400/25' : 'text-slate-700'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Functional Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAutoFire((v) => !v)}
            aria-pressed={autoFire}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              autoFire
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-[#060A14] text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {autoFire ? t.autoFireOn : t.autoFireOff}
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? t.audio : t.muted}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#060A14] text-slate-300 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-300" />}
            {muted ? t.muted : t.audio}
          </button>

          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <button
              type="button"
              onClick={handleTogglePause}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#060A14] text-slate-200 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {gameState === 'PAUSED' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                  {t.resume}
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  {t.pause}
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Compact Mobile Telemetry Strip */}
      <div className="flex md:hidden items-center justify-between px-4 py-1.5 bg-[#080D1B] border-b border-slate-800/80 text-xs font-mono-code shrink-0">
        <span className="text-cyan-300">
          {t.stage} {stageNumber}/{STAGES.length}
        </span>
        <span className="text-emerald-400 font-bold tabular-nums">
          {stats.score.toLocaleString()}
        </span>
        <span className="text-amber-300 tabular-nums">{stats.combo}x</span>
        <span className="text-slate-300 tabular-nums">
          {t.shields} {stats.lives}/{stats.maxLives}
        </span>
      </div>

      {/* Main 70 / 30 Split Workspace */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[7fr_3fr]">
        {/* Left 70%: Game Canvas & Overlays */}
        <section className="relative min-h-[420px] h-full overflow-hidden">
          <GameCanvas
            gameState={gameState}
            locale={locale}
            difficulty={difficulty}
            stageNumber={stageNumber}
            autoFire={autoFire}
            runId={runId}
            onStatsUpdate={handleStatsUpdate}
            onLiveExecUpdate={setLiveExec}
            onStageClear={handleStageClear}
            onGameOver={handleGameOver}
            onVictory={handleVictory}
            onTogglePause={handleTogglePause}
          />
          <GameOverlays
            gameState={gameState}
            locale={locale}
            onToggleLocale={handleToggleLocale}
            difficulty={difficulty}
            onSelectDifficulty={setDifficulty}
            onStart={handleStart}
            onRestart={handleRestart}
            onResume={handleTogglePause}
            stats={stats}
            highScore={highScore}
          />
        </section>

        {/* Right 30%: Live Code Viewer */}
        <CodeViewerPanel
          stage={currentStage}
          locale={locale}
          language={language}
          onLanguageChange={setLanguage}
          liveExec={liveExec}
          continueTimer={stats.continueTimer}
          ippTimer={stats.ippTimer}
        />
      </main>
    </div>
  );
}
