// Robust restructure of game-gateway.js for Node 24 ESM compatibility
const fs = await import('fs');

const origCode = fs.readFileSync('./server/src/api/game-gateway.js', 'utf8');
const lines = origCode.split('\n');

let exportIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export function createGameGatewayRoutes')) { exportIdx = i; break; }
}
console.log(`Export at line ${exportIdx + 1}`);

const importLines = [];
const helperLines = [];
for (let i = 0; i < exportIdx; i++) {
  if (lines[i].match(/^\s*import\s/)) importLines.push(lines[i]);
  else helperLines.push(lines[i]);
}
const routeLines = lines.slice(exportIdx);
console.log(`Imports: ${importLines.length}, Helpers: ${helperLines.length}, Routes: ${routeLines.length}`);

let result = '';
for (const l of importLines) result += l + '\n';
result += "import { CrazyTimeEngine } from '../themed-games/crazy-time-engine.js';\n";
result += "import { CrazyTimeV2Engine } from '../themed-games/crazy-time-v2-engine.js';\n";
result += "import { LightningRouletteEngine } from '../themed-games/lightning-roulette-engine.js';\n";
result += "import { MinesPremiumEngine } from '../themed-games/mines-engine.js';\n";
result += "import { WheelOfFortuneEngine } from '../themed-games/wheel-engine.js';\n";
result += "import { FishingTankEngine } from '../themed-games/fishing-engine.js';\n";
result += "import { FootfallEngine } from '../themed-games/footfall-engine.js';\n";
result += "import { SnowRunEngine } from '../themed-games/snowrun-engine.js';\n";
result += "import { DuckRaceEngine } from '../themed-games/duckrace-engine.js';\n";
result += '\n' + routeLines[0] + '\n';

const themedBlock = `
  const THEMED_ENGINES = {
    'crazy-time-pro': new CrazyTimeEngine(),
    'crazy-time-v2': new CrazyTimeV2Engine(),
    'lightning-roulette-pro': new LightningRouletteEngine(),
    'mines-premium': new MinesPremiumEngine(),
    'wheel-of-fortune': new WheelOfFortuneEngine(),
    'fishing-tank': new FishingTankEngine(),
    'footfall': new FootfallEngine(),
    'snow-run': new SnowRunEngine(),
    'duck-race': new DuckRaceEngine(),
  };

  async function executeThemedRound(gameId, betCents, gs) {
    const engine = THEMED_ENGINES[gameId];
    if (!engine) return null;
    const ss = \`server-\${Date.now()}\`;
    const cs = gs?.clientSeed || 'client';
    const nonce = Number(gs?.nonce || Date.now());
    switch (gameId) {
      case 'crazy-time-pro': { const r=engine.spin(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.result.effectiveMultiplier}; }
      case 'crazy-time-v2': { const r=engine.spin(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.result.effectiveMultiplier}; }
      case 'lightning-roulette-pro': { const bets=gs?.bets||{red:betCents}; if(gs?.target!==undefined)bets.target=Number(gs.target); const sr=engine.generateSpin(ss,cs,nonce); const {payouts}=engine.evaluateBets(bets,sr); const tw=Object.values(payouts).reduce((s,v)=>s+v,0); return {totalWin:tw,multiplier:tw/betCents}; }
      case 'mines-premium': { const mines=Number(gs?.mines||3); let st; try{st=engine.startRound(betCents,mines,ss,cs,nonce)}catch(e){return null} for(let i=0;i<Math.min(Number(gs?.reveals||3),5)&&st.isRunning;i++){const a=Array.from({length:25},(_,x)=>x).filter(x=>!st.revealedTiles.includes(x));if(!a.length)break;engine.revealTile(st,a[parseInt(ss.substring((i*4+nonce)%Math.max(1,ss.length),(i*4+nonce+4)%Math.max(1,ss.length))||'0',16)%a.length])} const co=engine.cashOut(st); return {totalWin:co.payoutCents,multiplier:co.multiplier}; }
      case 'wheel-of-fortune': { const r=engine.spin(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.result.effectiveMultiplier}; }
      case 'fishing-tank': { const r=engine.generateRound(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.multiplier}; }
      case 'footfall': { const r=engine.playRound(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.multiplier}; }
      case 'snow-run': { const r=engine.playRound(betCents,ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.multiplier}; }
      case 'duck-race': { const r=engine.playRound(betCents,gs?.selectedDuck||'goldie',ss,cs,nonce); return {totalWin:r.payoutCents,multiplier:r.multiplier}; }
      default: return null;
    }
  }`;

let newHelperLines = [];
for (const l of helperLines) {
  if (!newHelperLines.some(x => x.includes('THEMED_ENGINES')) && l.trim().startsWith('const GAME_CATEGORIES')) {
    newHelperLines.push(themedBlock);
  }
  newHelperLines.push(l);
}

for (const l of newHelperLines) result += '  ' + l + '\n';
for (let i = 1; i < routeLines.length; i++) {
  if (routeLines[i].trim() === '') result += '\n'; else result += '  ' + routeLines[i] + '\n';
}
result = result.replace(/\}\s*$/, '');
result += '}\n';

fs.writeFileSync('./server/src/api/game-gateway.js', result);
console.log(`Written ${result.length} bytes, ${result.split('\n').length} lines`);
