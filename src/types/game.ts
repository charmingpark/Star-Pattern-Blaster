export type GameState =
  | 'START'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type Language = 'python' | 'cpp';

export type PowerUpType = 'break' | 'continue' | 'ipp';

export interface CodeLine {
  lineNumber: number;
  text: string;
  role?: 'outer_loop' | 'inner_loop' | 'condition' | 'print_core' | 'print_star' | 'newline' | 'setup';
}

export interface PatternCell {
  row: number;
  col: number;
  /** Logical i variable displayed in live code viewer */
  varI: number;
  /** Logical j variable displayed in live code viewer */
  varJ: number;
  isCore: boolean;
  hp: number;
  maxHp: number;
}

export interface StageDefinition {
  stageNumber: number;
  name: string;
  subtitle: string;
  isBoss: boolean;
  n: number;
  coreConditionLabel: string;
  pythonCode: CodeLine[];
  cppCode: CodeLine[];
  buildPattern: (difficulty: Difficulty) => PatternCell[];
}

export interface StarEnemy {
  id: number;
  row: number;
  col: number;
  varI: number;
  varJ: number;
  x: number;
  y: number;
  baseX: number;
  isCore: boolean;
  hp: number;
  maxHp: number;
  hitFlash: number;
  spawnAnim: number;
  revealed: boolean;
}

export interface Laser {
  id: number;
  x: number;
  y: number;
  vy: number;
  isOverdrive: boolean;
}

export interface PowerUpDrop {
  id: number;
  type: PowerUpType;
  label: string;
  x: number;
  y: number;
  vy: number;
  pulse: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  char?: string;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface RowBeam {
  y: number;
  alpha: number;
  label: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface LiveExecutionState {
  stageNumber: number;
  activeRole: CodeLine['role'] | null;
  varI: number | null;
  varJ: number | null;
  varN: number;
  isCoreHit: boolean;
  lastEventLabel: string;
  starsRemaining: number;
  starsTotal: number;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  comboTimer: number; // 0..1
  starsDestroyed: number;
  shotsFired: number;
  shotsHit: number;
  lives: number;
  maxLives: number;
  stageNumber: number;
  continueTimer: number; // seconds remaining
  ippTimer: number; // seconds remaining
}
