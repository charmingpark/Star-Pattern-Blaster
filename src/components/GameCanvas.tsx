import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { DIFFICULTY_CONFIG, STAGES } from '../data/stages';
import { STAGE_NAMES_KO, UILocale, UI_TEXT } from '../i18n/translations';
import {
  Difficulty,
  FloatingText,
  GameState,
  GameStats,
  Laser,
  LiveExecutionState,
  Particle,
  PowerUpDrop,
  PowerUpType,
  RowBeam,
  Shockwave,
  StarEnemy,
} from '../types/game';

interface GameCanvasProps {
  gameState: GameState;
  locale: UILocale;
  difficulty: Difficulty;
  stageNumber: number;
  autoFire: boolean;
  runId: number;
  onStatsUpdate: (stats: GameStats) => void;
  onLiveExecUpdate: (exec: LiveExecutionState) => void;
  onStageClear: () => void;
  onGameOver: () => void;
  onVictory: () => void;
  onTogglePause: () => void;
}

const ARENA_W = 900;
const ARENA_H = 660;
const SHIP_Y = ARENA_H - 46;
const DEFENSE_LINE_Y = ARENA_H - 86;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  locale,
  difficulty,
  stageNumber,
  autoFire,
  runId,
  onStatsUpdate,
  onLiveExecUpdate,
  onStageClear,
  onGameOver,
  onVictory,
  onTogglePause,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep latest props in refs for the 60fps animation loop
  const propsRef = useRef({
    gameState,
    locale,
    difficulty,
    stageNumber,
    autoFire,
    onStatsUpdate,
    onLiveExecUpdate,
    onStageClear,
    onGameOver,
    onVictory,
    onTogglePause,
  });
  propsRef.current = {
    gameState,
    locale,
    difficulty,
    stageNumber,
    autoFire,
    onStatsUpdate,
    onLiveExecUpdate,
    onStageClear,
    onGameOver,
    onVictory,
    onTogglePause,
  };

  // Mutable simulation state inside ref
  const simRef = useRef({
    shipX: ARENA_W / 2,
    shipTilt: 0,
    shipHitFlash: 0,
    pointerTargetX: null as number | null,
    pointerDown: false,
    keys: new Set<string>(),
    lasers: [] as Laser[],
    enemies: [] as StarEnemy[],
    powerUps: [] as PowerUpDrop[],
    particles: [] as Particle[],
    shockwaves: [] as Shockwave[],
    rowBeams: [] as RowBeam[],
    floatingTexts: [] as FloatingText[],
    bgStars: Array.from({ length: 65 }, () => ({
      x: Math.random() * ARENA_W,
      y: Math.random() * ARENA_H,
      speed: 12 + Math.random() * 28,
      size: Math.random() < 0.7 ? 1.2 : 2,
      alpha: 0.18 + Math.random() * 0.4,
    })),
    nextId: 1,
    fireCooldown: 0,
    revealIndex: 0,
    revealTimer: 0,
    swayTime: 0,
    screenShake: 0,
    cellSpacingX: 44,
    cellSpacingY: 38,
    stageClearedPending: false,
    stats: {
      score: 0,
      combo: 1,
      maxCombo: 1,
      comboTimer: 0,
      starsDestroyed: 0,
      shotsFired: 0,
      shotsHit: 0,
      lives: 3,
      maxLives: 3,
      stageNumber: 1,
      continueTimer: 0,
      ippTimer: 0,
    } as GameStats,
    liveExec: {
      stageNumber: 1,
      activeRole: 'setup',
      varI: 0,
      varJ: 0,
      varN: 8,
      isCoreHit: false,
      lastEventLabel: 'Ready',
      starsRemaining: 0,
      starsTotal: 0,
    } as LiveExecutionState,
    lastUiSync: 0,
  });

  // Reset full run when runId changes
  useEffect(() => {
    const diffCfg = DIFFICULTY_CONFIG[difficulty];
    const sim = simRef.current;
    sim.shipX = ARENA_W / 2;
    sim.shipTilt = 0;
    sim.shipHitFlash = 0;
    sim.lasers = [];
    sim.powerUps = [];
    sim.particles = [];
    sim.shockwaves = [];
    sim.rowBeams = [];
    sim.floatingTexts = [];
    sim.fireCooldown = 0;
    sim.screenShake = 0;
    sim.stageClearedPending = false;
    sim.stats = {
      score: 0,
      combo: 1,
      maxCombo: 1,
      comboTimer: 0,
      starsDestroyed: 0,
      shotsFired: 0,
      shotsHit: 0,
      lives: diffCfg.lives,
      maxLives: diffCfg.lives,
      stageNumber: 1,
      continueTimer: 0,
      ippTimer: 0,
    };
    propsRef.current.onStatsUpdate({ ...sim.stats });
  }, [runId, difficulty]);

  // Build stage formation when stageNumber or runId changes
  useEffect(() => {
    const stageDef = STAGES[stageNumber - 1] ?? STAGES[0];
    const sim = simRef.current;
    const cells = stageDef.buildPattern(difficulty);

    const maxCol = Math.max(...cells.map((c) => c.col), 0);
    const minCol = Math.min(...cells.map((c) => c.col), 0);
    const maxRow = Math.max(...cells.map((c) => c.row), 0);
    const gridCols = maxCol - minCol + 1;

    const spacingX = stageDef.isBoss ? 44 : 48;
    const spacingY = stageDef.isBoss ? 31 : 38;
    sim.cellSpacingX = spacingX;
    sim.cellSpacingY = spacingY;

    const totalGridW = (gridCols - 1) * spacingX;
    const startX = (ARENA_W - totalGridW) / 2;
    const startY = stageDef.isBoss ? 68 : 82;

    sim.enemies = cells.map((cell, idx) => {
      const x = startX + (cell.col - minCol) * spacingX;
      const y = startY + cell.row * spacingY;
      return {
        id: idx + 1,
        row: cell.row,
        col: cell.col,
        varI: cell.varI,
        varJ: cell.varJ,
        x,
        y,
        baseX: x,
        isCore: cell.isCore,
        hp: cell.hp,
        maxHp: cell.maxHp,
        hitFlash: 0,
        spawnAnim: 0,
        revealed: false,
      };
    });

    // Clear stray projectiles between stages
    sim.lasers = [];
    sim.powerUps = [];
    sim.rowBeams = [];
    sim.revealIndex = 0;
    sim.revealTimer = 0;
    sim.swayTime = 0;
    sim.stageClearedPending = false;
    sim.stats.stageNumber = stageNumber;

    // Ensure maxRow doesn't start too low
    if (maxRow > 9) {
      // Boss diamond fits comfortably above mid-arena
    }

    const stgName =
      propsRef.current.locale === 'ko'
        ? STAGE_NAMES_KO[stageDef.stageNumber]?.name ?? stageDef.name
        : stageDef.name;

    sim.liveExec = {
      stageNumber,
      activeRole: 'outer_loop',
      varI: cells[0]?.varI ?? 0,
      varJ: cells[0]?.varJ ?? 0,
      varN: stageDef.n,
      isCoreHit: false,
      lastEventLabel: UI_TEXT[propsRef.current.locale].compilingTrace(stgName),
      starsRemaining: sim.enemies.length,
      starsTotal: sim.enemies.length,
    };
    propsRef.current.onLiveExecUpdate({ ...sim.liveExec });
    propsRef.current.onStatsUpdate({ ...sim.stats });
  }, [stageNumber, runId, difficulty]);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') {
        if (propsRef.current.gameState === 'PLAYING') {
          e.preventDefault();
        }
      }
      if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) {
        if (
          propsRef.current.gameState === 'PLAYING' ||
          propsRef.current.gameState === 'PAUSED'
        ) {
          propsRef.current.onTogglePause();
        }
      }
      simRef.current.keys.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.code);
    };

    const onBlur = () => {
      simRef.current.keys.clear();
      simRef.current.pointerDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Main 60fps simulation & render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const spawnParticles = (
      x: number,
      y: number,
      color: string,
      count: number,
      speed = 160,
      includeAsterisk = false,
    ) => {
      const sim = simRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const mag = (0.3 + Math.random() * 0.9) * speed;
        sim.particles.push({
          x,
          y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag,
          life: 0,
          maxLife: 0.28 + Math.random() * 0.3,
          color,
          size: includeAsterisk && i === 0 ? 14 : 2 + Math.random() * 2.5,
          char: includeAsterisk && i < 2 ? '*' : undefined,
        });
      }
    };

    const maybeDropPowerUp = (enemy: StarEnemy) => {
      const sim = simRef.current;
      const diffCfg = DIFFICULTY_CONFIG[propsRef.current.difficulty];
      const chance = enemy.isCore ? diffCfg.dropChance * 2.1 : diffCfg.dropChance;
      if (Math.random() > chance) return;

      const roll = Math.random();
      let type: PowerUpType = 'ipp';
      let label = 'i++';
      if (roll < 0.34) {
        type = 'break';
        label = 'break;';
      } else if (roll < 0.67) {
        type = 'continue';
        label = 'continue;';
      } else {
        type = 'ipp';
        label = 'i++';
      }

      sim.powerUps.push({
        id: sim.nextId++,
        type,
        label,
        x: enemy.x,
        y: enemy.y,
        vy: 135,
        pulse: 0,
      });
    };

    const destroyEnemy = (
      enemy: StarEnemy,
      isChainSource = false,
      allowChainReaction = true,
    ) => {
      const sim = simRef.current;
      const diffCfg = DIFFICULTY_CONFIG[propsRef.current.difficulty];

      // Remove enemy if still present
      const idx = sim.enemies.findIndex((e) => e.id === enemy.id);
      if (idx === -1) return;
      sim.enemies.splice(idx, 1);

      // Update combo & score
      sim.stats.starsDestroyed += 1;
      sim.stats.combo = Math.min(12, sim.stats.combo + (enemy.isCore ? 2 : 1));
      sim.stats.maxCombo = Math.max(sim.stats.maxCombo, sim.stats.combo);
      sim.stats.comboTimer = 1;

      const basePts = enemy.isCore ? 250 : isChainSource ? 120 : 100;
      const pts = Math.round(basePts * sim.stats.combo * diffCfg.scoreMultiplier);
      sim.stats.score += pts;

      // Visual explosion
      const color = enemy.isCore ? '#FACC15' : '#4ADE80';
      spawnParticles(enemy.x, enemy.y, color, enemy.isCore ? 18 : 9, enemy.isCore ? 220 : 145, true);

      const t = UI_TEXT[propsRef.current.locale];
      sim.floatingTexts.push({
        x: enemy.x,
        y: enemy.y - 6,
        text: enemy.isCore ? t.corePopup(pts) : `+${pts}`,
        color: enemy.isCore ? '#FACC15' : '#4ADE80',
        life: 0,
        maxLife: 0.75,
      });

      // Live Code Viewer sync
      sim.liveExec.activeRole = enemy.isCore ? 'print_core' : 'print_star';
      sim.liveExec.varI = enemy.varI;
      sim.liveExec.varJ = enemy.varJ;
      sim.liveExec.isCoreHit = enemy.isCore;
      sim.liveExec.lastEventLabel = enemy.isCore
        ? t.coreChainTrace(enemy.varI, enemy.varJ)
        : t.clearedTrace(enemy.varI, enemy.varJ);
      sim.liveExec.starsRemaining = sim.enemies.length;

      maybeDropPowerUp(enemy);

      if (enemy.isCore && allowChainReaction) {
        soundEngine.playExplosion(true);
        sim.screenShake = Math.max(sim.screenShake, 7);
        sim.shockwaves.push({
          x: enemy.x,
          y: enemy.y,
          radius: 10,
          maxRadius: 115,
          alpha: 0.95,
          color: '#FACC15',
        });

        // Chain-reaction: destroy adjacent stars within 1.55 grid units (1 hop)
        const neighbors = sim.enemies.filter((other) => {
          if (!other.revealed) return false;
          const dr = Math.abs(other.row - enemy.row);
          const dc = Math.abs(other.col - enemy.col);
          return Math.hypot(dr, dc) <= 1.55;
        });

        neighbors.forEach((nEnemy) => {
          if (nEnemy.hp > 1) {
            nEnemy.hp -= 1;
            nEnemy.hitFlash = 0.2;
            spawnParticles(nEnemy.x, nEnemy.y, '#22D3EE', 5, 110);
          } else {
            destroyEnemy(nEnemy, true, false);
          }
        });
      } else if (!isChainSource) {
        soundEngine.playExplosion(false);
      }
    };

    const activatePowerUp = (drop: PowerUpDrop) => {
      const sim = simRef.current;
      const t = UI_TEXT[propsRef.current.locale];
      soundEngine.playPowerUp(drop.type);

      if (drop.type === 'break') {
        // Clear lowest horizontal row of stars
        const revealedEnemies = sim.enemies.filter((e) => e.revealed);
        if (revealedEnemies.length > 0) {
          const maxRow = Math.max(...revealedEnemies.map((e) => e.row));
          const rowTargets = revealedEnemies.filter((e) => e.row === maxRow);
          const beamY = rowTargets[0]?.y ?? drop.y;

          sim.rowBeams.push({
            y: beamY,
            alpha: 1,
            label: 'break; // row cleared',
          });
          sim.screenShake = Math.max(sim.screenShake, 8);
          sim.liveExec.activeRole = 'outer_loop';
          sim.liveExec.isCoreHit = false;
          sim.liveExec.lastEventLabel = t.breakTrace(maxRow);

          rowTargets.forEach((target) => {
            destroyEnemy(target, true, false);
          });
        }
        sim.floatingTexts.push({
          x: drop.x,
          y: drop.y - 16,
          text: t.breakPopup,
          color: '#FB7185',
          life: 0,
          maxLife: 1.0,
        });
      } else if (drop.type === 'continue') {
        sim.stats.continueTimer = 3.0;
        sim.liveExec.activeRole = 'condition';
        sim.liveExec.isCoreHit = false;
        sim.liveExec.lastEventLabel = t.continueTrace;
        sim.floatingTexts.push({
          x: drop.x,
          y: drop.y - 16,
          text: t.continuePopup,
          color: '#22D3EE',
          life: 0,
          maxLife: 0.95,
        });
      } else if (drop.type === 'ipp') {
        sim.stats.ippTimer = 6.0;
        sim.liveExec.activeRole = 'inner_loop';
        sim.liveExec.isCoreHit = false;
        sim.liveExec.lastEventLabel = t.ippTrace;
        sim.floatingTexts.push({
          x: drop.x,
          y: drop.y - 16,
          text: t.ippPopup,
          color: '#4ADE80',
          life: 0,
          maxLife: 0.95,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const {
        gameState: state,
        locale: currentLocale,
        difficulty: diff,
        stageNumber: stgNum,
        autoFire: isAutoFire,
      } = propsRef.current;
      const t = UI_TEXT[currentLocale];
      const sim = simRef.current;
      const stageDef = STAGES[stgNum - 1] ?? STAGES[0];
      const diffCfg = DIFFICULTY_CONFIG[diff];

      // Ambient starfield always drifts gently
      for (const s of sim.bgStars) {
        s.y += s.speed * dt * (state === 'PLAYING' ? 1 : 0.35);
        if (s.y > ARENA_H) {
          s.y = -4;
          s.x = Math.random() * ARENA_W;
        }
      }

      if (state === 'PLAYING') {
        // 1. Progressive Loop Printing Reveal
        if (sim.revealIndex < sim.enemies.length) {
          sim.revealTimer += dt;
          const interval = stageDef.isBoss ? 0.016 : 0.022;
          while (sim.revealTimer >= interval && sim.revealIndex < sim.enemies.length) {
            sim.revealTimer -= interval;
            const enemy = sim.enemies[sim.revealIndex];
            enemy.revealed = true;
            enemy.spawnAnim = 0;

            sim.liveExec.activeRole = enemy.isCore ? 'print_core' : 'print_star';
            sim.liveExec.varI = enemy.varI;
            sim.liveExec.varJ = enemy.varJ;
            sim.liveExec.isCoreHit = enemy.isCore;
            sim.liveExec.lastEventLabel = t.printingTrace(enemy.varI, enemy.varJ);

            sim.revealIndex += 1;
          }
        }

        // 2. Timers
        if (sim.stats.continueTimer > 0) {
          sim.stats.continueTimer = Math.max(0, sim.stats.continueTimer - dt);
        }
        if (sim.stats.ippTimer > 0) {
          sim.stats.ippTimer = Math.max(0, sim.stats.ippTimer - dt);
        }
        if (sim.stats.combo > 1) {
          sim.stats.comboTimer -= dt * 0.35;
          if (sim.stats.comboTimer <= 0) {
            sim.stats.combo = 1;
            sim.stats.comboTimer = 0;
          }
        }
        if (sim.shipHitFlash > 0) sim.shipHitFlash = Math.max(0, sim.shipHitFlash - dt);
        if (sim.screenShake > 0) sim.screenShake = Math.max(0, sim.screenShake - dt * 22);

        // 3. Player Ship Movement
        const moveLeft = sim.keys.has('ArrowLeft') || sim.keys.has('KeyA');
        const moveRight = sim.keys.has('ArrowRight') || sim.keys.has('KeyD');
        const shipSpeed = 460;
        let targetTilt = 0;

        if (moveLeft && !moveRight) {
          sim.shipX -= shipSpeed * dt;
          targetTilt = -0.18;
          sim.pointerTargetX = null;
        } else if (moveRight && !moveLeft) {
          sim.shipX += shipSpeed * dt;
          targetTilt = 0.18;
          sim.pointerTargetX = null;
        } else if (sim.pointerTargetX !== null) {
          const dx = sim.pointerTargetX - sim.shipX;
          const step = dx * Math.min(1, dt * 16);
          sim.shipX += step;
          targetTilt = Math.max(-0.22, Math.min(0.22, dx * 0.004));
        }

        sim.shipX = Math.max(32, Math.min(ARENA_W - 32, sim.shipX));
        sim.shipTilt += (targetTilt - sim.shipTilt) * Math.min(1, dt * 14);

        // 4. Player Shooting
        const isOverdrive = sim.stats.ippTimer > 0;
        const baseCooldown = 0.21;
        const currentCooldown = isOverdrive ? baseCooldown * 0.48 : baseCooldown;
        sim.fireCooldown = Math.max(0, sim.fireCooldown - dt);

        const wantsFire =
          sim.keys.has('Space') || sim.pointerDown || isAutoFire;

        if (wantsFire && sim.fireCooldown <= 0) {
          sim.fireCooldown = currentCooldown;
          if (isOverdrive) {
            sim.lasers.push(
              {
                id: sim.nextId++,
                x: sim.shipX - 11,
                y: SHIP_Y - 18,
                vy: -680,
                isOverdrive: true,
              },
              {
                id: sim.nextId++,
                x: sim.shipX + 11,
                y: SHIP_Y - 18,
                vy: -680,
                isOverdrive: true,
              },
            );
            sim.stats.shotsFired += 2;
          } else {
            sim.lasers.push({
              id: sim.nextId++,
              x: sim.shipX,
              y: SHIP_Y - 20,
              vy: -620,
              isOverdrive: false,
            });
            sim.stats.shotsFired += 1;
          }
          soundEngine.playShoot(isOverdrive);
        }

        // 5. Update Lasers & Check Collisions
        for (let i = sim.lasers.length - 1; i >= 0; i--) {
          const laser = sim.lasers[i];
          laser.y += laser.vy * dt;
          if (laser.y < -20) {
            sim.lasers.splice(i, 1);
            continue;
          }

          // Hit detection against revealed enemies
          let hit = false;
          for (let j = sim.enemies.length - 1; j >= 0; j--) {
            const enemy = sim.enemies[j];
            if (!enemy.revealed) continue;
            if (Math.abs(laser.x - enemy.x) < 17 && Math.abs(laser.y - enemy.y) < 17) {
              hit = true;
              sim.stats.shotsHit += 1;
              if (enemy.hp > 1) {
                enemy.hp -= 1;
                enemy.hitFlash = 0.16;
                soundEngine.playArmorHit();
                spawnParticles(enemy.x, enemy.y, '#22D3EE', 5, 110);
                sim.liveExec.activeRole = 'condition';
                sim.liveExec.varI = enemy.varI;
                sim.liveExec.varJ = enemy.varJ;
                sim.liveExec.isCoreHit = false;
                sim.liveExec.lastEventLabel = t.damagedTrace(enemy.varI, enemy.varJ);
              } else {
                destroyEnemy(enemy, false, true);
              }
              break;
            }
          }

          if (hit) {
            sim.lasers.splice(i, 1);
          }
        }

        // 6. Enemy Formation Descent & Sway
        const slowFactor = sim.stats.continueTimer > 0 ? 0.25 : 1;
        const stageFactor = 1 + (stgNum - 1) * 0.12;
        const descentRate = diffCfg.descentSpeed * stageFactor * slowFactor;
        sim.swayTime += dt * diffCfg.swaySpeed * (sim.stats.continueTimer > 0 ? 0.4 : 1);
        const swayOffset = Math.sin(sim.swayTime * 1.4) * (stageDef.isBoss ? 52 : 34);

        let breached = false;
        for (const enemy of sim.enemies) {
          if (!enemy.revealed) continue;
          enemy.spawnAnim = Math.min(1, enemy.spawnAnim + dt * 8);
          if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);

          enemy.y += descentRate * dt;
          enemy.x = enemy.baseX + swayOffset;

          if (enemy.y >= DEFENSE_LINE_Y) {
            breached = true;
          }
        }

        if (breached) {
          sim.stats.lives -= 1;
          sim.stats.combo = 1;
          sim.stats.comboTimer = 0;
          sim.shipHitFlash = 0.45;
          sim.screenShake = 11;
          soundEngine.playPlayerHit();

          if (sim.stats.lives <= 0) {
            sim.stats.lives = 0;
            propsRef.current.onStatsUpdate({ ...sim.stats });
            soundEngine.playGameOver();
            propsRef.current.onGameOver();
          } else {
            // Push formation back up slightly so player has breathing room
            for (const enemy of sim.enemies) {
              enemy.y -= 95;
            }
            sim.floatingTexts.push({
              x: sim.shipX,
              y: SHIP_Y - 36,
              text: t.shieldHitBanner,
              color: '#FB7185',
              life: 0,
              maxLife: 1.2,
            });
          }
        }

        // 7. Power-up Drops
        for (let i = sim.powerUps.length - 1; i >= 0; i--) {
          const drop = sim.powerUps[i];
          drop.y += drop.vy * dt;
          drop.pulse += dt * 6;

          if (Math.abs(drop.x - sim.shipX) < 34 && Math.abs(drop.y - SHIP_Y) < 26) {
            activatePowerUp(drop);
            sim.powerUps.splice(i, 1);
            continue;
          }
          if (drop.y > ARENA_H + 30) {
            sim.powerUps.splice(i, 1);
          }
        }

        // 8. Check Stage Clear / Victory
        if (
          sim.enemies.length === 0 &&
          sim.revealIndex >= 1 &&
          !sim.stageClearedPending
        ) {
          sim.stageClearedPending = true;
          propsRef.current.onStatsUpdate({ ...sim.stats });
          propsRef.current.onLiveExecUpdate({
            ...sim.liveExec,
            starsRemaining: 0,
            activeRole: 'newline',
            lastEventLabel: t.loopFinishedTrace,
          });

          if (stgNum >= STAGES.length) {
            soundEngine.playVictory();
            propsRef.current.onVictory();
          } else {
            soundEngine.playStageClear();
            propsRef.current.onStageClear();
          }
        }
      }

      // 9. Update VFX (Particles, Shockwaves, Row Beams, Floating Text)
      for (let i = sim.particles.length - 1; i >= 0; i--) {
        const p = sim.particles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.life >= p.maxLife) sim.particles.splice(i, 1);
      }

      for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
        const sw = sim.shockwaves[i];
        sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, dt * 9);
        sw.alpha -= dt * 2.4;
        if (sw.alpha <= 0) sim.shockwaves.splice(i, 1);
      }

      for (let i = sim.rowBeams.length - 1; i >= 0; i--) {
        const b = sim.rowBeams[i];
        b.alpha -= dt * 1.9;
        if (b.alpha <= 0) sim.rowBeams.splice(i, 1);
      }

      for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
        const ft = sim.floatingTexts[i];
        ft.life += dt;
        ft.y -= 28 * dt;
        if (ft.life >= ft.maxLife) sim.floatingTexts.splice(i, 1);
      }

      // Throttle React HUD updates (~15Hz) for silky 60fps Canvas
      if (now - sim.lastUiSync > 65) {
        sim.lastUiSync = now;
        sim.liveExec.starsRemaining = sim.enemies.length;
        propsRef.current.onStatsUpdate({ ...sim.stats });
        propsRef.current.onLiveExecUpdate({ ...sim.liveExec });
      }

      // ================= RENDER =================
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Fill deep navy/black background
      ctx.fillStyle = '#050812';
      ctx.fillRect(0, 0, w, h);

      const scale = Math.min(w / ARENA_W, h / ARENA_H);
      const offsetX = (w - ARENA_W * scale) / 2;
      const offsetY = (h - ARENA_H * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Screen shake
      if (sim.screenShake > 0.1) {
        const sx = (Math.random() - 0.5) * sim.screenShake;
        const sy = (Math.random() - 0.5) * sim.screenShake;
        ctx.translate(sx, sy);
      }

      // Subtle code-editor grid lines
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= ARENA_W; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ARENA_H);
        ctx.stroke();
      }
      for (let gy = 0; gy <= ARENA_H; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(ARENA_W, gy);
        ctx.stroke();
      }

      // Ambient drifting stars
      for (const s of sim.bgStars) {
        ctx.fillStyle = `rgba(148, 163, 184, ${s.alpha})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      // Continue slow-mo border glow
      if (sim.stats.continueTimer > 0) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
        ctx.lineWidth = 3;
        ctx.strokeRect(4, 4, ARENA_W - 8, ARENA_H - 8);
      }

      // Defense Threshold Line
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle =
        sim.shipHitFlash > 0
          ? 'rgba(251, 113, 133, 0.85)'
          : 'rgba(34, 211, 238, 0.24)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, DEFENSE_LINE_Y);
      ctx.lineTo(ARENA_W - 20, DEFENSE_LINE_Y);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(t.defenseBoundary, 24, DEFENSE_LINE_Y - 7);

      // Boss Integrity Bar in Stage 4
      if (stageDef.isBoss && state === 'PLAYING') {
        const total = Math.max(1, sim.liveExec.starsTotal);
        const pct = Math.max(0, sim.enemies.length / total);
        const barW = 280;
        const barX = (ARENA_W - barW) / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(barX, 16, barW, 8);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(barX, 16, barW * pct, 8);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, 16, barW, 8);

        ctx.fillStyle = '#FDE047';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.bossTitle(sim.enemies.length, total), ARENA_W / 2, 39);
      }

      // Row Beams (break; power-up)
      for (const beam of sim.rowBeams) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, beam.alpha);
        ctx.fillStyle = 'rgba(251, 113, 133, 0.28)';
        ctx.fillRect(0, beam.y - 16, ARENA_W, 32);
        ctx.fillStyle = '#FB7185';
        ctx.fillRect(0, beam.y - 2, ARENA_W, 4);
        ctx.restore();
      }

      // Shockwaves (Core Star chain reaction)
      for (const sw of sim.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Enemies: Literal ASCII '*' Characters
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const enemy of sim.enemies) {
        if (!enemy.revealed) continue;

        const scalePop = 0.5 + 0.5 * enemy.spawnAnim;
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.scale(scalePop, scalePop);

        if (enemy.isCore) {
          // Glowing Gold Core Star
          const pulse = 0.75 + 0.25 * Math.sin(now * 0.008 + enemy.id);
          ctx.shadowColor = '#FACC15';
          ctx.shadowBlur = 14 * pulse;

          // Subtle rotating target ring
          ctx.strokeStyle = `rgba(250, 204, 21, ${0.45 * pulse})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, -1, 14, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = enemy.hitFlash > 0 ? '#FFFFFF' : '#FACC15';
          ctx.font = '700 30px "JetBrains Mono", monospace';
          ctx.fillText('*', 0, 2);
        } else if (enemy.hp > 1) {
          // Armored Boss Diamond Star (Cyan/Purple)
          ctx.shadowColor = '#22D3EE';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-12, -13, 24, 24);

          ctx.fillStyle = enemy.hitFlash > 0 ? '#FFFFFF' : '#22D3EE';
          ctx.font = '700 26px "JetBrains Mono", monospace';
          ctx.fillText('*', 0, 2);
        } else {
          // Standard Neon Green ASCII '*'
          ctx.shadowColor = '#4ADE80';
          ctx.shadowBlur = 8;
          ctx.fillStyle = enemy.hitFlash > 0 ? '#FFFFFF' : '#4ADE80';
          ctx.font = '700 26px "JetBrains Mono", monospace';
          ctx.fillText('*', 0, 2);
        }

        ctx.restore();
      }

      // Power-Up Drops
      for (const drop of sim.powerUps) {
        ctx.save();
        ctx.translate(drop.x, drop.y);
        const color =
          drop.type === 'break'
            ? '#FB7185'
            : drop.type === 'continue'
              ? '#22D3EE'
              : '#4ADE80';

        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#0B1222';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;

        const boxW = drop.type === 'continue' ? 76 : drop.type === 'break' ? 62 : 44;
        const boxH = 24;
        ctx.beginPath();
        ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 5);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(drop.label, 0, 0.5);
        ctx.restore();
      }

      // Lasers
      for (const laser of sim.lasers) {
        ctx.save();
        ctx.shadowColor = laser.isOverdrive ? '#4ADE80' : '#22D3EE';
        ctx.shadowBlur = 10;
        ctx.fillStyle = laser.isOverdrive ? '#86EFAC' : '#67E8F9';
        ctx.fillRect(laser.x - 2, laser.y - 10, 4, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(laser.x - 1, laser.y - 8, 2, 12);
        ctx.restore();
      }

      // Sleek Spaceship
      ctx.save();
      ctx.translate(sim.shipX, SHIP_Y);
      ctx.rotate(sim.shipTilt);

      const isOverdrive = sim.stats.ippTimer > 0;
      const shipGlow = sim.shipHitFlash > 0 ? '#FB7185' : isOverdrive ? '#4ADE80' : '#22D3EE';

      // Engine thruster flame
      const flameLen = 10 + Math.random() * 8;
      ctx.fillStyle = isOverdrive ? '#4ADE80' : '#22D3EE';
      ctx.beginPath();
      ctx.moveTo(-6, 14);
      ctx.lineTo(0, 14 + flameLen);
      ctx.lineTo(6, 14);
      ctx.closePath();
      ctx.fill();

      // Main hull
      ctx.shadowColor = shipGlow;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = shipGlow;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(22, 14);
      ctx.lineTo(9, 10);
      ctx.lineTo(0, 16);
      ctx.lineTo(-9, 10);
      ctx.lineTo(-22, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit core
      ctx.shadowBlur = 0;
      ctx.fillStyle = isOverdrive ? '#86EFAC' : '#67E8F9';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(5, 3);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Particles
      for (const p of sim.particles) {
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.char) {
          ctx.font = `700 ${p.size}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.char, p.x, p.y);
        } else {
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
        ctx.restore();
      }

      // Floating Score / Power-Up Popups
      for (const ft of sim.floatingTexts) {
        const alpha = Math.max(0, 1 - ft.life / ft.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  // Convert pointer coordinates into logical arena X
  const updatePointerX = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const scale = Math.min(w / ARENA_W, h / ARENA_H);
    const offsetX = (w - ARENA_W * scale) / 2;
    const logicalX = (clientX - rect.left - offsetX) / scale;
    simRef.current.pointerTargetX = Math.max(24, Math.min(ARENA_W - 24, logicalX));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    soundEngine.unlock();
    e.currentTarget.setPointerCapture(e.pointerId);
    simRef.current.pointerDown = true;
    updatePointerX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState !== 'PLAYING') return;
    if (simRef.current.pointerDown || e.pointerType === 'mouse') {
      if (simRef.current.pointerDown) {
        updatePointerX(e.clientX);
      }
    }
  };

  const handlePointerUp = () => {
    simRef.current.pointerDown = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[420px] bg-[#050812] overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="block w-full h-full touch-none cursor-crosshair"
      />
    </div>
  );
};
