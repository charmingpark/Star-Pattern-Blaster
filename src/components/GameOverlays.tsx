import React from 'react';
import { Play, RotateCcw, Trophy, AlertTriangle, Pause, Languages } from 'lucide-react';
import { STAGES } from '../data/stages';
import { DIFFICULTY_TEXT, STAGE_NAMES_KO, UILocale, UI_TEXT } from '../i18n/translations';
import { Difficulty, GameState, GameStats } from '../types/game';

interface GameOverlaysProps {
  gameState: GameState;
  locale: UILocale;
  onToggleLocale: () => void;
  difficulty: Difficulty;
  onSelectDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  onRestart: () => void;
  onResume: () => void;
  stats: GameStats;
  highScore: number;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  gameState,
  locale,
  onToggleLocale,
  difficulty,
  onSelectDifficulty,
  onStart,
  onRestart,
  onResume,
  stats,
  highScore,
}) => {
  if (gameState === 'PLAYING') return null;

  const t = UI_TEXT[locale];
  const diffText = DIFFICULTY_TEXT[locale];
  const currentStage = STAGES[stats.stageNumber - 1] ?? STAGES[0];
  const stageName =
    locale === 'ko'
      ? STAGE_NAMES_KO[currentStage.stageNumber]?.name ?? currentStage.name
      : currentStage.name;

  const accuracy =
    stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;

  if (gameState === 'STAGE_CLEAR') {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-[#060A14]/45 backdrop-blur-[2px]">
        <div className="px-8 py-6 rounded-xl bg-[#0B1222]/95 border border-emerald-500/40 text-center shadow-2xl">
          <p className="text-xs font-mono-code text-emerald-400 tracking-wide">
            {t.loopTerminated}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-slate-50">
            {t.stageCleared(currentStage.stageNumber)}
          </h2>
          <p className="mt-1.5 text-sm text-slate-300">{t.compilingNext}</p>
        </div>
      </div>
    );
  }

  if (gameState === 'PAUSED') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#060A14]/80 backdrop-blur-sm p-6">
        <div className="w-full max-w-sm rounded-xl bg-[#0B1222] border border-slate-800 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
            <Pause className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-50">{t.executionPaused}</h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {t.stage} {currentStage.stageNumber} · {stageName}
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              {t.resumeExecution}
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {t.recompileRestart}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
    const isVictory = gameState === 'VICTORY';
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#060A14]/85 backdrop-blur-sm p-6">
        <div className="w-full max-w-md rounded-xl bg-[#0B1222] border border-slate-800 p-7 shadow-2xl">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                isVictory
                  ? 'bg-amber-400/15 border-amber-400/40 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}
            >
              {isVictory ? <Trophy className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <p
                className={`text-xs font-mono-code font-medium ${
                  isVictory ? 'text-amber-300' : 'text-rose-400'
                }`}
              >
                {isVictory ? t.allLoopsDebugged : t.stackOverflow}
              </p>
              <h2 className="text-2xl font-display font-bold text-slate-50">
                {isVictory ? t.compilationVictory : t.gameOver}
              </h2>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 py-4 border-y border-slate-800/90">
            <div>
              <p className="text-xs text-slate-400">{t.linesDebugged}</p>
              <p className="mt-0.5 text-2xl font-mono-code font-bold text-emerald-400 tabular-nums">
                {stats.starsDestroyed}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t.finalScore}</p>
              <p className="mt-0.5 text-2xl font-mono-code font-bold text-cyan-300 tabular-nums">
                {stats.score.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t.peakCombo}</p>
              <p className="mt-0.5 text-lg font-mono-code font-semibold text-amber-300 tabular-nums">
                {stats.maxCombo}x
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">{t.shotAccuracy}</p>
              <p className="mt-0.5 text-lg font-mono-code font-semibold text-slate-200 tabular-nums">
                {accuracy}%
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono-code">
            <span>
              {t.stageReached}: {stats.stageNumber} / {STAGES.length}
            </span>
            <span>
              {t.bestScore}: {Math.max(highScore, stats.score).toLocaleString()}
            </span>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={onRestart}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              {t.recompileRestart}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // START (Home) screen with Korean toggle button
  const isKo = locale === 'ko';
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#060A14]/88 backdrop-blur-sm p-6 overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-[#0B1222] border border-slate-800 p-7 shadow-2xl">
        {/* Top Row: Kicker + Korean Version Toggle Button */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-mono-code text-cyan-400">{t.heroKicker}</p>

          <button
            type="button"
            role="switch"
            aria-checked={isKo}
            onClick={onToggleLocale}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isKo
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                : 'bg-[#060A14] text-slate-300 hover:text-slate-100 border-slate-700 hover:border-slate-600'
            }`}
          >
            <Languages className="w-3.5 h-3.5 text-cyan-300" />
            <span>한국어 버전</span>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                isKo ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                  isKo ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </span>
          </button>
        </div>

        <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-50 text-balance">
          {t.appTitle}
        </h1>
        <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
          {t.heroDescBefore}{' '}
          <span className="font-mono-code text-emerald-400 font-semibold">*</span> {t.heroDescMid}{' '}
          <span className="font-mono-code text-amber-300 font-semibold">*</span> {t.heroDescAfter}
        </p>

        {/* Difficulty Selector */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">{t.difficultyLabel}</span>
            <span className="text-xs font-mono-code text-slate-400">
              {diffText[difficulty].description}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-1 rounded-lg bg-[#060A14] border border-slate-800">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((level) => {
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onSelectDifficulty(level)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {diffText[level].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Reference */}
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{t.steerShip}</span>
            <span className="font-mono-code text-slate-200">{t.steerKeys}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{t.fireLaser}</span>
            <span className="font-mono-code text-slate-200">{t.fireKeys}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{t.stagesLabel}</span>
            <span className="font-mono-code text-emerald-400">{t.stagesCount}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">{t.bestScore}</span>
            <span className="font-mono-code text-amber-300 tabular-nums">
              {highScore.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onStart}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-base transition-colors cursor-pointer whitespace-nowrap shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4 fill-current" />
            {t.runCodeStart}
          </button>
        </div>
      </div>
    </div>
  );
};
