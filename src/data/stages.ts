import { Difficulty, PatternCell, StageDefinition } from '../types/game';

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    descentSpeed: number;
    swaySpeed: number;
    lives: number;
    scoreMultiplier: number;
    dropChance: number;
    description: string;
  }
> = {
  easy: {
    label: 'Easy',
    descentSpeed: 12,
    swaySpeed: 0.75,
    lives: 4,
    scoreMultiplier: 1,
    dropChance: 0.2,
    description: 'Relaxed loop descent · 4 shields',
  },
  normal: {
    label: 'Normal',
    descentSpeed: 18,
    swaySpeed: 1,
    lives: 3,
    scoreMultiplier: 1.25,
    dropChance: 0.16,
    description: 'Balanced arcade speed · 3 shields',
  },
  hard: {
    label: 'Hard',
    descentSpeed: 26,
    swaySpeed: 1.35,
    lives: 2,
    scoreMultiplier: 1.6,
    dropChance: 0.13,
    description: 'Rapid O(n²) descent · 2 shields',
  },
};

export const STAGES: StageDefinition[] = [
  {
    stageNumber: 1,
    name: 'Right Triangle',
    subtitle: 'Nested Ascending Loop',
    isBoss: false,
    n: 8,
    coreConditionLabel: 'i == j',
    pythonCode: [
      { lineNumber: 1, text: 'n = 8', role: 'setup' },
      { lineNumber: 2, text: 'for i in range(n):', role: 'outer_loop' },
      { lineNumber: 3, text: '    for j in range(i + 1):', role: 'inner_loop' },
      { lineNumber: 4, text: '        if i == j:', role: 'condition' },
      { lineNumber: 5, text: '            print("*", end=" ")  # Core', role: 'print_core' },
      { lineNumber: 6, text: '        else:', role: 'condition' },
      { lineNumber: 7, text: '            print("*", end=" ")', role: 'print_star' },
      { lineNumber: 8, text: '    print()', role: 'newline' },
    ],
    cppCode: [
      { lineNumber: 1, text: 'int n = 8;', role: 'setup' },
      { lineNumber: 2, text: 'for (int i = 0; i < n; i++) {', role: 'outer_loop' },
      { lineNumber: 3, text: '    for (int j = 0; j <= i; j++) {', role: 'inner_loop' },
      { lineNumber: 4, text: '        if (i == j)', role: 'condition' },
      { lineNumber: 5, text: '            cout << "* "; // Core', role: 'print_core' },
      { lineNumber: 6, text: '        else', role: 'condition' },
      { lineNumber: 7, text: '            cout << "* ";', role: 'print_star' },
      { lineNumber: 8, text: '    }', role: 'inner_loop' },
      { lineNumber: 9, text: '    cout << "\\n";', role: 'newline' },
      { lineNumber: 10, text: '}', role: 'outer_loop' },
    ],
    buildPattern: () => {
      const cells: PatternCell[] = [];
      const n = 8;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
          const isCore = i === j;
          cells.push({
            row: i,
            col: j,
            varI: i,
            varJ: j,
            isCore,
            hp: 1,
            maxHp: 1,
          });
        }
      }
      return cells;
    },
  },
  {
    stageNumber: 2,
    name: 'Inverted Triangle',
    subtitle: 'Reverse Outer Iterator',
    isBoss: false,
    n: 8,
    coreConditionLabel: 'j == i - 1 || j == 0',
    pythonCode: [
      { lineNumber: 1, text: 'n = 8', role: 'setup' },
      { lineNumber: 2, text: 'for i in range(n, 0, -1):', role: 'outer_loop' },
      { lineNumber: 3, text: '    for j in range(i):', role: 'inner_loop' },
      { lineNumber: 4, text: '        if j == i - 1:', role: 'condition' },
      { lineNumber: 5, text: '            print("*", end=" ")  # Core', role: 'print_core' },
      { lineNumber: 6, text: '        else:', role: 'condition' },
      { lineNumber: 7, text: '            print("*", end=" ")', role: 'print_star' },
      { lineNumber: 8, text: '    print()', role: 'newline' },
    ],
    cppCode: [
      { lineNumber: 1, text: 'int n = 8;', role: 'setup' },
      { lineNumber: 2, text: 'for (int i = n; i >= 1; i--) {', role: 'outer_loop' },
      { lineNumber: 3, text: '    for (int j = 0; j < i; j++) {', role: 'inner_loop' },
      { lineNumber: 4, text: '        if (j == i - 1)', role: 'condition' },
      { lineNumber: 5, text: '            cout << "* "; // Core', role: 'print_core' },
      { lineNumber: 6, text: '        else', role: 'condition' },
      { lineNumber: 7, text: '            cout << "* ";', role: 'print_star' },
      { lineNumber: 8, text: '    }', role: 'inner_loop' },
      { lineNumber: 9, text: '    cout << "\\n";', role: 'newline' },
      { lineNumber: 10, text: '}', role: 'outer_loop' },
    ],
    buildPattern: () => {
      const cells: PatternCell[] = [];
      const n = 8;
      for (let r = 0; r < n; r++) {
        const i = n - r;
        for (let j = 0; j < i; j++) {
          const isCore = j === i - 1;
          cells.push({
            row: r,
            col: j,
            varI: i,
            varJ: j,
            isCore,
            hp: 1,
            maxHp: 1,
          });
        }
      }
      return cells;
    },
  },
  {
    stageNumber: 3,
    name: 'Pyramid',
    subtitle: 'Centered Odd-Row Symmetry',
    isBoss: false,
    n: 7,
    coreConditionLabel: 'j == i',
    pythonCode: [
      { lineNumber: 1, text: 'n = 7', role: 'setup' },
      { lineNumber: 2, text: 'for i in range(n):', role: 'outer_loop' },
      { lineNumber: 3, text: '    print("  " * (n - i - 1), end="")', role: 'outer_loop' },
      { lineNumber: 4, text: '    for j in range(2 * i + 1):', role: 'inner_loop' },
      { lineNumber: 5, text: '        if j == i:', role: 'condition' },
      { lineNumber: 6, text: '            print("*", end=" ")  # Core', role: 'print_core' },
      { lineNumber: 7, text: '        else:', role: 'condition' },
      { lineNumber: 8, text: '            print("*", end=" ")', role: 'print_star' },
      { lineNumber: 9, text: '    print()', role: 'newline' },
    ],
    cppCode: [
      { lineNumber: 1, text: 'int n = 7;', role: 'setup' },
      { lineNumber: 2, text: 'for (int i = 0; i < n; i++) {', role: 'outer_loop' },
      { lineNumber: 3, text: '    for (int s = 0; s < n - i - 1; s++) cout << "  ";', role: 'outer_loop' },
      { lineNumber: 4, text: '    for (int j = 0; j < 2 * i + 1; j++) {', role: 'inner_loop' },
      { lineNumber: 5, text: '        if (j == i)', role: 'condition' },
      { lineNumber: 6, text: '            cout << "* "; // Core', role: 'print_core' },
      { lineNumber: 7, text: '        else', role: 'condition' },
      { lineNumber: 8, text: '            cout << "* ";', role: 'print_star' },
      { lineNumber: 9, text: '    }', role: 'inner_loop' },
      { lineNumber: 10, text: '    cout << "\\n";', role: 'newline' },
      { lineNumber: 11, text: '}', role: 'outer_loop' },
    ],
    buildPattern: () => {
      const cells: PatternCell[] = [];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const count = 2 * i + 1;
        const offset = n - 1 - i;
        for (let j = 0; j < count; j++) {
          const isCore = j === i;
          cells.push({
            row: i,
            col: offset + j,
            varI: i,
            varJ: j,
            isCore,
            hp: 1,
            maxHp: 1,
          });
        }
      }
      return cells;
    },
  },
  {
    stageNumber: 4,
    name: 'Giant Diamond',
    subtitle: 'Boss · Dual-Loop Matrix',
    isBoss: true,
    n: 6,
    coreConditionLabel: 'j == w // 2 || i == n - 1',
    pythonCode: [
      { lineNumber: 1, text: 'n = 6  # Boss Matrix', role: 'setup' },
      { lineNumber: 2, text: 'for r in range(2 * n - 1):', role: 'outer_loop' },
      { lineNumber: 3, text: '    i = r if r < n else 2 * n - 2 - r', role: 'outer_loop' },
      { lineNumber: 4, text: '    for j in range(2 * i + 1):', role: 'inner_loop' },
      { lineNumber: 5, text: '        if j == i or (i == n - 1 and j % 3 == 0):', role: 'condition' },
      { lineNumber: 6, text: '            print("*", end=" ")  # Core', role: 'print_core' },
      { lineNumber: 7, text: '        else:', role: 'condition' },
      { lineNumber: 8, text: '            print("*", end=" ")', role: 'print_star' },
      { lineNumber: 9, text: '    print()', role: 'newline' },
    ],
    cppCode: [
      { lineNumber: 1, text: 'int n = 6; // Boss Matrix', role: 'setup' },
      { lineNumber: 2, text: 'for (int r = 0; r < 2 * n - 1; r++) {', role: 'outer_loop' },
      { lineNumber: 3, text: '    int i = (r < n) ? r : 2 * n - 2 - r;', role: 'outer_loop' },
      { lineNumber: 4, text: '    for (int j = 0; j < 2 * i + 1; j++) {', role: 'inner_loop' },
      { lineNumber: 5, text: '        if (j == i || (i == n - 1 && j % 3 == 0))', role: 'condition' },
      { lineNumber: 6, text: '            cout << "* "; // Core', role: 'print_core' },
      { lineNumber: 7, text: '        else', role: 'condition' },
      { lineNumber: 8, text: '            cout << "* ";', role: 'print_star' },
      { lineNumber: 9, text: '    }', role: 'inner_loop' },
      { lineNumber: 10, text: '    cout << "\\n";', role: 'newline' },
      { lineNumber: 11, text: '}', role: 'outer_loop' },
    ],
    buildPattern: (difficulty: Difficulty) => {
      const cells: PatternCell[] = [];
      const n = 6;
      const totalRows = 2 * n - 1;
      for (let r = 0; r < totalRows; r++) {
        const i = r < n ? r : 2 * n - 2 - r;
        const count = 2 * i + 1;
        const offset = n - 1 - i;
        for (let j = 0; j < count; j++) {
          const isCore = j === i || (i === n - 1 && j % 3 === 0);
          // Outer shell stars on the Boss Diamond have 2 HP (3 on Hard)
          const isShell = !isCore && (j === 0 || j === count - 1 || i === n - 1);
          const hp = isShell ? (difficulty === 'hard' ? 3 : 2) : 1;
          cells.push({
            row: r,
            col: offset + j,
            varI: i,
            varJ: j,
            isCore,
            hp,
            maxHp: hp,
          });
        }
      }
      return cells;
    },
  },
];
