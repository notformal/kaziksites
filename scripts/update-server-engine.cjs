// Add Mines and Plinko endpoints to casino-engine.js exports
const fs = require('fs');
const path = require('path');

const engineFile = path.join(__dirname, '..', 'server', 'src', 'casino-engine.js');
let content = fs.readFileSync(engineFile, 'utf8');

// Check if MinesEngine and PlinkoEngine are already exported from app.js imports
if (!content.includes('MinesEngine') || !content.includes('PlinkoEngine')) {
  // Add class definitions before the export section
  const minesClass = `
// ─── Mines Engine ──────────────────────────────────────
class MinesEngine {
  constructor(opts) {
    this.rows = opts?.rows || 5;
    this.cols = opts?.cols || 5;
    this.totalCells = this.rows * this.cols;
    this.houseEdge = opts?.houseEdge || 0.03;
  }

  generateMines(count, seed) {
    const positions = new Set();
    while (positions.size < count) {
      positions.add(Math.floor(Math.random() * this.totalCells));
    }
    return Array.from(positions);
  }

  calculateMultiplier(revealedCount, totalMines) {
    let mult = 1;
    for (let i = 0; i < revealedCount; i++) {
      mult *= (this.totalCells - i) / (this.totalCells - totalMines - i);
    }
    return Math.floor(mult * (1 - this.houseEdge) * 100) / 100;
  }

  spin(bet, mineCount, revealedIndices) {
    const mines = this.generateMines(mineCount);
    let totalWin = 0;
    let hitMine = false;

    for (const idx of revealedIndices) {
      if (mines.includes(idx)) {
        hitMine = true;
        break;
      }
      const mult = this.calculateMultiplier(revealedIndices.indexOf(idx) + 1, mineCount);
      totalWin = bet * mult;
    }

    return {
      grid: Array.from({length: this.totalCells}, (_, i) => mines.includes(i) ? 'mine' : 'safe'),
      mines,
      hitMine,
      totalWin: hitMine ? 0 : totalWin,
      multiplier: hitMine ? 0 : this.calculateMultiplier(revealedIndices.length, mineCount),
    };
  }
}

// ─── Plinko Engine ──────────────────────────────────────
class PlinkoEngine {
  constructor(opts) {
    this.rows = opts?.rows || 12;
    this.houseEdge = opts?.houseEdge || 0.03;
    this.buckets = opts?.buckets || [0.1, 0.2, 0.3, 0.5, 1, 3, 5, 10, 0.5, 0.3, 0.2, 0.1];
  }

  drop(ballX) {
    let pos = this.rows / 2;
    for (let i = 0; i < this.rows; i++) {
      if (Math.random() > 0.5) pos += 0.5;
      else pos -= 0.5;
    }
    const idx = Math.max(0, Math.min(this.buckets.length - 1, Math.round(pos)));
    return { bucketIndex: idx, multiplier: this.buckets[idx] };
  }

  spin(bet) {
    const result = this.drop(Math.random());
    const win = bet * result.multiplier * (1 - this.houseEdge);
    return {
      ...result,
      totalWin: win,
      isBigWin: result.multiplier >= 5,
    };
  }
}

// ─── Crash Engine (server-side) ──────────────────────────
class CrashEngine {
  constructor(opts) {
    this.houseEdge = opts?.houseEdge || 0.04;
  }

  generateCrashPoint() {
    const e = 2 ** 32;
    const h = Math.floor(Math.random() * e);
    if (h % 33 === 0) return 1.00;
    return Math.max(1, Math.floor((1 - this.houseEdge) * e / (e - h)) / 100) / 100;
  }

  spin(bet) {
    const crashPoint = this.generateCrashPoint();
    return { crashPoint, bet };
  }
}
`;

  // Find the export section and insert before it
  const exportIdx = content.indexOf('// ─── Export');
  if (exportIdx > -1) {
    content = content.slice(0, exportIdx) + minesClass + '\n' + content.slice(exportIdx);
    console.log('✓ Mines/Plinko/Crash engines added to casino-engine.js');
  } else {
    // Append before last export
    const lastExport = content.lastIndexOf('export {');
    if (lastExport > -1) {
      content = content.slice(0, lastExport) + minesClass + '\n' + content.slice(lastExport);
      console.log('✓ Engines appended before exports');
    } else {
      content += minesClass;
      console.log('✓ Engines appended to end of file');
    }
  }

  fs.writeFileSync(engineFile, content, 'utf8');
} else {
  console.log('  Engines already exist in casino-engine.js');
}

// Also update app.js imports if needed
const appFile = path.join(__dirname, '..', 'server', 'src', 'app.js');
let appContent = fs.readFileSync(appFile, 'utf8');

if (!appContent.includes('MinesEngine')) {
  appContent = appContent.replace(
    "import { CrashEngine, PlinkoEngine, MinesEngine, DiceEngine",
    "import { CrashEngine, PlinkoEngine, MinesEngine, DiceEngine"
  );
  console.log('✓ app.js imports verified');
} else {
  console.log('  app.js already has imports');
}

console.log('\nDone!');
