import React from 'react';
import { STAGE_NAMES_KO, UILocale, UI_TEXT } from '../i18n/translations';
import { CodeLine, Language, LiveExecutionState, StageDefinition } from '../types/game';

interface CodeViewerPanelProps {
  stage: StageDefinition;
  locale: UILocale;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  liveExec: LiveExecutionState;
  continueTimer: number;
  ippTimer: number;
}

function highlightCodeTokens(text: string): React.ReactNode {
  // Lightweight, deterministic syntax highlighter for Python & C++ loop snippets
  const commentIdx = text.indexOf('#') !== -1 ? text.indexOf('#') : text.indexOf('//');
  const codePart = commentIdx !== -1 ? text.slice(0, commentIdx) : text;
  const commentPart = commentIdx !== -1 ? text.slice(commentIdx) : '';

  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|\b(?:for|in|range|if|else|int|cout|print|end)\b|\b\d+\b)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(codePart)) !== null) {
    if (match.index > lastIndex) {
      parts.push(codePart.slice(lastIndex, match.index));
    }
    const token = match[0];
    let cls = 'text-slate-200';
    if (token.startsWith('"')) {
      cls = token.includes('*') ? 'text-emerald-400 font-semibold' : 'text-emerald-300';
    } else if (/^(for|in|if|else)$/.test(token)) {
      cls = 'text-cyan-400 font-medium';
    } else if (/^(range|print|cout|end|int)$/.test(token)) {
      cls = 'text-sky-300';
    } else if (/^\d+$/.test(token)) {
      cls = 'text-amber-300';
    }
    parts.push(
      <span key={`${match.index}-${token}`} className={cls}>
        {token}
      </span>,
    );
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < codePart.length) {
    parts.push(codePart.slice(lastIndex));
  }

  return (
    <>
      {parts}
      {commentPart && <span className="text-amber-400/90 italic">{commentPart}</span>}
    </>
  );
}

export const CodeViewerPanel: React.FC<CodeViewerPanelProps> = ({
  stage,
  locale,
  language,
  onLanguageChange,
  liveExec,
  continueTimer,
  ippTimer,
}) => {
  const t = UI_TEXT[locale];
  const stageDisplayName =
    locale === 'ko'
      ? STAGE_NAMES_KO[stage.stageNumber]?.name ?? stage.name
      : stage.name;
  const lines: CodeLine[] = language === 'python' ? stage.pythonCode : stage.cppCode;
  const fileName =
    language === 'python'
      ? `stage_${stage.stageNumber}_${stage.name.toLowerCase().replace(/\s+/g, '_')}.py`
      : `stage_${stage.stageNumber}_${stage.name.toLowerCase().replace(/\s+/g, '_')}.cpp`;

  const isLineActive = (line: CodeLine): boolean => {
    if (!liveExec.activeRole) return false;
    if (liveExec.activeRole === line.role) return true;
    // Highlight condition line alongside print_core when a Core Star is triggered
    if (liveExec.isCoreHit && line.role === 'condition' && line.text.includes('if')) {
      return true;
    }
    return false;
  };

  return (
    <aside className="flex h-full flex-col bg-[#080E1C] border-t lg:border-t-0 lg:border-l border-slate-800/90 select-none overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/90 bg-[#0B1222]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 truncate font-mono-code">
            {fileName}
          </p>
          <p className="text-sm font-semibold text-slate-100 truncate">
            {t.stage} {stage.stageNumber}: {stageDisplayName}
          </p>
        </div>

        <div
          className="flex items-center gap-1 p-1 rounded-md bg-[#060A14] border border-slate-800 shrink-0"
          role="group"
          aria-label="Code language selector"
        >
          <button
            type="button"
            onClick={() => onLanguageChange('python')}
            className={`px-2.5 py-1 text-xs font-mono-code font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'python'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Python
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('cpp')}
            className={`px-2.5 py-1 text-xs font-mono-code font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              language === 'cpp'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            C++
          </button>
        </div>
      </div>

      {/* Live Loop Variables Watch Strip */}
      <div className="grid grid-cols-4 gap-2 px-4 py-2.5 border-b border-slate-800/80 bg-[#0A101F] text-xs font-mono-code">
        <div>
          <span className="text-slate-500 block text-[11px]">i</span>
          <span className="text-cyan-300 font-semibold tabular-nums">
            {liveExec.varI !== null ? liveExec.varI : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">j</span>
          <span className="text-emerald-400 font-semibold tabular-nums">
            {liveExec.varJ !== null ? liveExec.varJ : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">n</span>
          <span className="text-slate-200 font-semibold tabular-nums">{liveExec.varN}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[11px]">{t.starsVar}</span>
          <span className="text-amber-300 font-semibold tabular-nums">
            {liveExec.starsRemaining}/{liveExec.starsTotal}
          </span>
        </div>
      </div>

      {/* Live Code Listing */}
      <div className="flex-1 overflow-y-auto code-scroll px-2 py-3 bg-[#070B16]">
        <div className="space-y-0.5 font-mono-code text-[12px] sm:text-[12.5px] leading-6">
          {lines.map((line) => {
            const active = isLineActive(line);
            const isCoreActive = active && (liveExec.isCoreHit || line.role === 'print_core');
            return (
              <div
                key={line.lineNumber}
                className={`flex items-start gap-2 px-2 py-0.5 rounded transition-colors duration-100 ${
                  active
                    ? isCoreActive
                      ? 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/35'
                      : 'bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/30'
                    : 'text-slate-300'
                }`}
              >
                <span className="w-4 shrink-0 text-right select-none text-[11px] leading-6">
                  {active ? (
                    <span className={isCoreActive ? 'text-amber-300' : 'text-emerald-400'}>▶</span>
                  ) : (
                    <span className="text-slate-600">{line.lineNumber}</span>
                  )}
                </span>
                <pre className="whitespace-pre-wrap break-all font-mono-code flex-1">
                  {highlightCodeTokens(line.text)}
                </pre>
              </div>
            );
          })}
        </div>

        {/* Live Trace Line */}
        <div className="mt-4 mx-2 pt-3 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400">{t.activeTrace}</span>
            <span
              className={`font-medium truncate max-w-[180px] ${
                liveExec.isCoreHit ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {liveExec.lastEventLabel}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400">{t.coreCondition}</span>
            <span className="text-amber-300">{stage.coreConditionLabel}</span>
          </div>
        </div>
      </div>

      {/* Active Modifiers & Power-Up Guide */}
      <div className="px-4 py-3 border-t border-slate-800/90 bg-[#0B1222] space-y-2.5">
        {(continueTimer > 0 || ippTimer > 0) && (
          <div className="space-y-1.5 pb-2 border-b border-slate-800/80">
            {continueTimer > 0 && (
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-cyan-300 font-semibold">{t.continueSlowMo}</span>
                <span className="text-cyan-200 tabular-nums">{continueTimer.toFixed(1)}s</span>
              </div>
            )}
            {ippTimer > 0 && (
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-emerald-300 font-semibold">{t.ippRapidFire}</span>
                <span className="text-emerald-200 tabular-nums">{ippTimer.toFixed(1)}s</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-code font-semibold text-amber-300 shrink-0">
              {t.coreStarTitle}
            </span>
            <span className="text-slate-400 text-right">{t.coreStarDesc}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-code font-semibold text-rose-400 shrink-0">break;</span>
            <span className="text-slate-400 text-right">{t.breakDesc}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-code font-semibold text-cyan-300 shrink-0">continue;</span>
            <span className="text-slate-400 text-right">{t.continueDesc}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono-code font-semibold text-emerald-400 shrink-0">i++</span>
            <span className="text-slate-400 text-right">{t.ippDesc}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
