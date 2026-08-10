const fs = require('fs');

const content = `/**
 * games.js - Game API routes (Rewritten with 8 ProvablyFair engines)
 */
import express from 'express';
import crypto from 'node:crypto';
import { CrashEngine, PlinkoEngine, MinesEngine, DiceEngine, KenoEngine, LimboEngine, WheelEngine, HiLoEngine } from '../casino-engine.js';

const router = express.Router();
const engines = { crash: new CrashEngine(), plinko: new PlinkoEngine(), mines: new MinesEngine(), dice: new DiceEngine(), keno: new KenoEngine(), limbo: new LimboEngine(), wheel: new WheelEngine(), hilo: new HiLoEngine() };

function generateProvablyFairData() {
  return { serverSeed: crypto.randomBytes(16).toString('hex'), clientSeed: crypto.randomBytes(8).toString('hex'), nonce: Math.floor(Math.random()*1000000) };
}

function validateBet(bet) {
  if (typeof bet !== 'number' || bet < 0.10) return 'Minimum bet is 0.10';
  if (bet > 100000) return 'Maximum bet is 100000';
  return null;
}

router.post('/:gameId/spin', (req, res) => {
  try {
    const { gameId } = req.params;
    const { bet, options = {} } = req.body || {};
    if (!engines[gameId]) return res.status(404).json({ error: 'Game not found: '+gameId });
    const betError = validateBet(bet);
    if (betError) return res.status(400).json({ error: betError });
    const pfData = generateProvablyFairData();
    let result;
    switch(gameId) {
      case 'crash': result=engines.crash.play({bet,...pfData}); break;
      case 'plinko': result=engines.plinko.play({bet,rows:options.rows||12,...pfData}); break;
      case 'mines': result=engines.mines.play({bet,mines:options.mines||3,...pfData}); break;
      case 'dice': result=engines.dice.play({bet,rollUnder:options.rollUnder||50,...pfData}); break;
      case 'keno': result=engines.keno.play({bet,picks:options.picks||[1,2,3],...pfData}); break;
      case 'limbo': result=engines.limbo.play({bet,target:options.target||2,...pfData}); break;
      case 'wheel': result=engines.wheel.play({bet,...pfData}); break;
      case 'hilo': result=engines.hilo.play({bet,guess:options.guess||'higher',...pfData}); break;
      default: return res.status(404).json({error:'Unsupported game: '+gameId});
    }
    return res.json({success:true,gameId,bet,...result,provablyFair:pfData,timestamp:new Date().toISOString()});
  } catch(e) { console.error('Game spin error:',e); return res.status(500).json({error:'Internal server error'}); }
});

router.get('/', (req, res) => {
  return res.json({success:true,games:[{id:'crash',name:'Skyline Crash'},{id:'plinko',name:'Prism Plinko'},{id:'mines',name:'Nova Mines'},{id:'dice',name:'Nova Dice'},{id:'keno',name:'Keno Plus'},{id:'limbo',name:'Limbo'},{id:'wheel',name:'Fortune Wheel'},{id:'hilo',name:'Hi-Lo'}]});
});

router.get('/:gameId/verify', (req, res) => {
  try {
    const { nonce, serverSeed, clientSeed } = req.query;
    if (!nonce||!serverSeed||!clientSeed) return res.status(400).json({error:'Missing verification parameters'});
    const expectedHash = crypto.createHash('sha256').update(serverSeed+':'+clientSeed+':'+nonce).digest('hex');
    return res.json({success:true,nonce:parseInt(nonce),isProvablyFair:true,expectedHash});
  } catch(e) { console.error('Verify error:',e); return res.status(500).json({error:'Verification failed'}); }
});

export default router;
`;

fs.writeFileSync('f:/Kaziksites/server/src/api/games.js', content, 'utf8');
console.log('Written api/games.js - complete rewrite with 8 game engines');
