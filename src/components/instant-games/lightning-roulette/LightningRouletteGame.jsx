

// ═══════════════════════════════════════════════════════════
// LIGHTNING ROULETTE GAME — Evolution Gaming Style
// European roulette + Quantum Multipliers (x50–x500)
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Zap, History, TrendingUp } from 'lucide-react';

const RED_NUMS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];

function getNumberColor(n) { return n === 0 ? 'green' : RED_NUMS.has(n) ? 'red' : 'black'; }


/* ── Lightning Roulette Game Component ─────────────── */
function LightningRouletteGame({ balance = 10000, onBalanceChange }) {
  const [balanceState, setBalance] = useState(balance);
  const [selectedChip, setSelectedChip] = useState(50);
  const [bets, setBets] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [currentSpin, setCurrentSpin] = useState(null);
  const [history, setHistory] = useState([]);
  const [lightningNumbers, setLightningNumbers] = useState([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [spinProgress, setSpinProgress] = useState(0);
  const spinIntervalRef = useRef(null);

  const placeBet = useCallback((type, target) => {
    if (gameState !== 'waiting' || selectedChip > balanceState) return;
    setBets(prev => [...prev, { type, amount: selectedChip, target }]);
    setBalance(b => b - selectedChip);
  }, [gameState, selectedChip, balanceState]);

  const clearBets = useCallback(() => {
    if (gameState !== 'waiting') return;
    const refund = bets.reduce((s, b) => s + b.amount, 0);
    setBalance(b => b + refund);
    setBets([]);
  }, [gameState, bets]);

  const spinWheel = useCallback(() => {
    if (bets.length === 0 || gameState !== 'waiting') return;
    setGameState('spinning');
    let progress = 0;
    spinIntervalRef.current = setInterval(() => {
      progress += 2; setSpinProgress(progress);
      if (progress >= 100) { clearInterval(spinIntervalRef.current); finalizeSpin(); }
    }, 60);
  }, [bets, gameState]);

  const finalizeSpin = useCallback(() => {
    const number = Math.floor(Math.random() * 37);
    const color = getNumberColor(number);
    const numLightning = [1,2,3,4,5][Math.floor(Math.random()*5)];
    const available = Array.from({length:37},(_,i)=>i).filter(n=>n!==number);
    const lights = [];
    for (let i=0;i<numLightning;i++) {
      const idx=Math.floor(Math.random()*available.length);
      const mr=Math.random(); let mult;
      if(mr<.35)mult=50;else if(mr<.6)mult=100;else if(mr<.78)mult=200;else if(mr<.9)mult=300;else if(mr<.97)mult=400;else mult=500;
      lights.push({number:available[idx],multiplier:mult}); available.splice(idx,1);
    }
    const isHit = lights.some(l=>l.number===number);
    let totalWin = 0;
    for (const bet of bets) {
      let won=false,mult=0;
      if(bet.type==='straight'){if(bet.target!==undefined&&number===bet.target){won=true;mult=isHit?(lights.find(l=>l.number===number)?.multiplier||36):36;}}
      else if(bet.type==='red'){won=color==='red';mult=2;}else if(bet.type==='black'){won=color==='black';mult=2;}
      else if(bet.type==='odd'){won=number>0&&number%2===1;mult=2;}else if(bet.type==='even'){won=number>0&&number%2===0;mult=2;}
      else if(bet.type==='low'){won=number>=1&&number<=18;mult=2;}else if(bet.type==='high'){won=number>=19&&number<=36;mult=2;}
      if(won)totalWin+=bet.amount*mult;
    }
    setBalance(b=>b+totalWin);
    setCurrentSpin({number,color,lightningNumbers:lights,isLightningHit:isHit});
    setHistory(prev=>[{number,color,lightningNumbers:lights,payout:totalWin},...prev].slice(0,20));
    setLightningNumbers(lights); setGameState('result');
    setTimeout(()=>{setBets([]);setGameState('waiting');setCurrentSpin(null);setLightningNumbers([]);setRoundNumber(r=>r+1);},4000);
  }, [bets]);

  useEffect(() => () => { if(spinIntervalRef.current) clearInterval(spinIntervalRef.current); }, []);


function getColorHex(c) { return c === 'red' ? '#dc2626' : c === 'black' ? '#1f2937' : '#16a34a'; }



  const totalBets = bets.reduce((s, b) => s + b.amount, 0);
  return (<div className="lr-game">
      <div className="lr-header"><h2 className="lr-title"><Zap size={24} style={{color:'#fbbf24',marginRight:8}}/> Lightning Roulette</h2><div className="lr-round-info">Round #{roundNumber}</div><div className="lr-balance">Balance: <span className="lr-balance-amount">{balanceState.toLocaleString()}</span></div></div>
      <div className="lr-main"><div className="lr-board-container">
        <button className={`lr-number lr-zero ${gameState==='spinning'?'lr-spinning':''}`} style={{background:'#16a34a'}} onClick={()=>placeBet('straight',0)} disabled={gameState!=='waiting'}>0</button>
        <div className="lr-number-grid">
          {Array.from({length:12},(_,i)=>(<button key={3+i*3} className="lr-number" style={{background:getColorHex(getNumberColor(3+i*3)),border:lightningNumbers.some(l=>l.number===3+i*3)?'2px solid #fbbf24':'1px solid rgba(255,255,255,.1)',boxShadow:lightningNumbers.some(l=>l.number===3+i*3)?'0 0 12px rgba(251,191,36,.6)':'none'}} onClick={()=>placeBet('straight',3+i*3)} disabled={gameState!=='waiting'}>{3+i*3}{lightningNumbers.some(l=>l.number===3+i*3)&&<span className="lr-lightning-badge"><Zap size={10}/> {lightningNumbers.find(l=>l.number===3+i*3)?.multiplier}x</span>}</button>))}
          {Array.from({length:12},(_,i)=>(<button key={2+i*3} className="lr-number" style={{background:getColorHex(getNumberColor(2+i*3)),border:lightningNumbers.some(l=>l.number===2+i*3)?'2px solid #fbbf24':'1px solid rgba(255,255,255,.1)',boxShadow:lightningNumbers.some(l=>l.number===2+i*3)?'0 0 12px rgba(251,191,36,.6)':'none'}} onClick={()=>placeBet('straight',2+i*3)} disabled={gameState!=='waiting'}>{2+i*3}{lightningNumbers.some(l=>l.number===2+i*3)&&<span className="lr-lightning-badge"><Zap size={10}/> {lightningNumbers.find(l=>l.number===2+i*3)?.multiplier}x</span>}</button>))}
          {Array.from({length:12},(_,i)=>(<button key={1+i*3} className="lr-number" style={{background:getColorHex(getNumberColor(1+i*3)),border:lightningNumbers.some(l=>l.number===1+i*3)?'2px solid #fbbf24':'1px solid rgba(255,255,255,.1)',boxShadow:lightningNumbers.some(l=>l.number===1+i*3)?'0 0 12px rgba(251,191,36,.6)':'none'}} onClick={()=>placeBet('straight',1+i*3)} disabled={gameState!=='waiting'}>{1+i*3}{lightningNumbers.some(l=>l.number===1+i*3)&&<span className="lr-lightning-badge"><Zap size={10}/> {lightningNumbers.find(l=>l.number===1+i*3)?.multiplier}x</span>}</button>))}
        </div>
        <div className="lr-outside-row">{[['RED','red'],['BLACK','black'],['ODD','odd'],['EVEN','even'],['LOW (1-18)','low'],['HIGH (19-36)','high']].map(([l,t])=>(<button key={t} className="lr-outside-bet" onClick={()=>placeBet(t)} disabled={gameState!=='waiting'}>{l}</button>))}</div>
        <div className="lr-dozen-row">{[['1st 12','dozen_1'],['2nd 12','dozen_2'],['3rd 12','dozen_3']].map(([l,t])=>(<button key={t} className="lr-dozen-bet" onClick={()=>placeBet(t)} disabled={gameState!=='waiting'}>{l}</button>))}</div>
        <div className="lr-column-row">{[['2:1','column_1'],['2:1','column_2'],['2:1','column_3']].map(([l,t])=>(<button key={t} className="lr-column-bet" onClick={()=>placeBet(t)} disabled={gameState!=='waiting'}>{l}</button>))}</div>
        <div className="lr-side-bets">{[['Any Top (8:1)','any_top'],['Any Prime (5:1)','any_prime'],['Any Star (8:1)','any_star']].map(([l,t])=>(<button key={t} className="lr-side-btn" onClick={()=>placeBet(t)} disabled={gameState!=='waiting'}>{l}</button>))}</div>
      </div><div className="lr-side-panel">
        {currentSpin && (<div className={`lr-result-card ${spinning?'lr-spinning':''}`}><div className="lr-result-number" style={{background:getColorHex(currentSpin.color)}}>{currentSpin.number}</div>{lightningNumbers.length>0&&<div className="lr-lightning-list"><Zap size={14} style={{color:'#fbbf24'}}/> Lightning: {lightningNumbers.map(l=>(<span key={l.number} className="lr-lightning-item" style={{borderColor:l.multiplier>=300?'#ef4444':l.multiplier>=100?'#f59e0b':'#6b7280'}}>{l.number}<span style={{color:l.multiplier>=300?'#ef4444':'#fbbf24'}}>{l.multiplier}x</span></span>))}</div>}</div>)}
        {gameState==='spinning'&&<div className="lr-spin-progress"><div className="lr-spin-bar" style={{width:`${spinProgress}%`}}/><span>Multiplying...</span></div>}
        {history.length>0&&<div className="lr-history"><History size={14}/> Recent: {history.slice(0,8).map((h,i)=>(<span key={i} className={`lr-history-item ${h.color}`} style={{background:getColorHex(h.color)}}>{h.number}</span>))}</div>}
        {bets.length>0&&<div className="lr-active-bets"><TrendingUp size={14}/> Bets ({bets.length}): {bets.map((b,i)=>(<span key={i} className="lr-bet-chip">{b.type}{b.target!==undefined?` ${b.target}`:''}: {b.amount}</span>))}</div>}
      </div></div><div className="lr-controls">
        <div className="lr-chips">{CHIP_VALUES.map(v=>(<button key={v} className={`lr-chip ${selectedChip===v?'active':''}`} onClick={()=>setSelectedChip(v)} disabled={gameState!=='waiting'}>{v>=1000?`${(v/1000).toFixed(0)}K`:v}</button>))}</div>
        <div className="lr-actions"><button className="lr-btn lr-clear" onClick={clearBets} disabled={gameState!=='waiting'||bets.length===0}>Clear</button><div className="lr-total-bet">Total: {totalBets}</div><button className={`lr-btn lr-spin ${gameState==='spinning'?'lr-disabled':''}`} onClick={spinWheel} disabled={gameState!=='waiting'||bets.length===0}>{gameState==='spinning'?'Spinning...':gameState==='result'?'Result!':'SPIN'}</button></div>
      </div><style jsx>{`




.lr-game{display:flex;flex-direction:column;height:100vh;background:#0a0a0f;color:#f0f0f5;font-family:'Inter',system-ui,sans-serif}
.lr-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;border-bottom:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}
.lr-title{display:flex;align-items:center;margin:0;font-size:1.5rem;font-weight:700;color:#fbbf24}
.lr-round-info{font-family:'JetBrains Mono',monospace;font-size:.875rem;color:#6b7280}
.lr-balance{display:flex;align-items:center;gap:.5rem;padding:.4rem 1.2rem;background:rgba(255,255,255,.05);border-radius:999px}
.lr-balance-amount{font-family:'JetBrains Mono',monospace;font-weight:700;color:#fbbf24;font-size:1.1rem}
.lr-main{display:flex;gap:1.5rem;padding:1.5rem;flex:1;overflow:hidden}
.lr-board-container{flex:1;display:flex;flex-direction:column;gap:.25rem;align-items:center}
.lr-zero{width:60px;height:48px;border-radius:8px 0 0 8px;color:white;font-weight:700;font-size:1.25rem;cursor:pointer;border:none}
.lr-number-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;width:100%;max-width:720px}
.lr-number{height:44px;border-radius:6px;color:white;font-weight:600;font-size:.9rem;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;transition:all .15s ease}
.lr-number:hover{opacity:.8;transform:scale(1.08);z-index:2}
.lr-lightning-badge{position:absolute;top:-6px;right:-6px;background:#fbbf24;color:#0a0a0f;font-size:.55rem;font-weight:800;padding:1px 4px;border-radius:8px;display:flex;align-items:center;gap:2px;box-shadow:0 0 8px rgba(251,191,36,.8)}
.lr-outside-row{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;width:100%;max-width:720px;margin-top:4px}
.lr-outside-bet{height:38px;border-radius:6px;background:rgba(255,255,255,.08);color:#f0f0f5;font-weight:600;font-size:.8rem;cursor:pointer;border:1px solid rgba(255,255,255,.1)}
.lr-dozen-row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:100%;max-width:720px;margin-top:4px}
.lr-dozen-bet,.lr-column-bet{height:36px;border-radius:6px;background:rgba(255,255,255,.08);color:#f0f0f5;font-weight:600;font-size:.8rem;cursor:pointer;border:1px solid rgba(255,255,255,.1)}
.lr-column-row{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;width:100%;max-width:720px;margin-top:4px}
.lr-side-bets{display:flex;gap:6px;width:100%;max-width:720px;margin-top:6px}
.lr-side-btn{flex:1;height:34px;border-radius:6px;background:rgba(139,92,246,.2);color:#c4b5fd;font-weight:600;font-size:.75rem;cursor:pointer;border:1px solid rgba(139,92,246,.3)}
.lr-side-btn:hover{background:rgba(139,92,246,.35)}
.lr-side-panel{width:280px;display:flex;flex-direction:column;gap:1rem}
.lr-result-card{background:rgba(255,255,255,.05);border-radius:12px;padding:1rem;text-align:center}
.lr-result-number{width:72px;height:72px;border-radius:50%;margin:0 auto .75rem;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:white;box-shadow:0 4px 20px rgba(0,0,0,.3)}
.lr-lightning-list{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:.5rem;font-size:.8rem;color:#9ca3af}
.lr-lightning-item{padding:2px 8px;border-radius:12px;border:1px solid;display:flex;align-items:center;gap:4px;font-family:'JetBrains Mono',monospace;font-size:.75rem}
.lr-spin-progress{background:rgba(251,191,36,.1);border-radius:8px;padding:.75rem;text-align:center;position:relative;overflow:hidden}
.lr-spin-bar{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#fbbf24,#ef4444);border-radius:8px}
.lr-spin-progress span{position:relative;z-index:1;font-weight:700;color:#fbbf24}
.lr-history{display:flex;flex-wrap:wrap;gap:4px;align-items:center;background:rgba(255,255,255,.05);border-radius:8px;padding:.75rem;font-size:.8rem;color:#9ca3af}
.lr-history-item{width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;color:white}
.lr-active-bets{background:rgba(255,255,255,.05);border-radius:8px;padding:.75rem;font-size:.8rem;color:#9ca3af;display:flex;flex-direction:column;gap:4px}
.lr-bet-chip{background:rgba(139,92,246,.2);padding:2px 8px;border-radius:12px;font-family:'JetBrains Mono',monospace;font-size:.7rem;color:#c4b5fd}
.lr-controls{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;border-top:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}
.lr-chips{display:flex;gap:6px}
.lr-chip{width:48px;height:48px;border-radius:50%;font-weight:700;font-size:.75rem;cursor:pointer;border:2px solid transparent;color:white}
.lr-chip:nth-child(1){background:#3b82f6}.lr-chip:nth-child(2){background:#ef4444}.lr-chip:nth-child(3){background:#10b981}.lr-chip:nth-child(4){background:#f59e0b}.lr-chip:nth-child(5){background:#8b5cf6}.lr-chip:nth-child(6){background:#ec4899}
.lr-chip.active{border-color:white;transform:scale(1.15);box-shadow:0 0 12px rgba(255,255,255,.3)}
.lr-actions{display:flex;align-items:center;gap:1rem}
.lr-total-bet{font-family:'JetBrains Mono',monospace;font-size:1.1rem;font-weight:700;color:#fbbf24}
.lr-btn{padding:.75rem 2rem;border-radius:999px;font-weight:700;font-size:1rem;cursor:pointer;border:none;transition:all .2s ease}
.lr-clear{background:rgba(239,68,68,.2);color:#fca5a5}
.lr-spin{background:linear-gradient(135deg,#fbbf24,#ef4444);color:white;font-size:1.1rem;padding:.875rem 3rem;box-shadow:0 4px 20px rgba(251,191,36,.3)}
.lr-spin:hover:not(.lr-disabled){transform:translateY(-2px)}
.lr-disabled{opacity:.5;cursor:not-allowed}
@media(max-width:768px){.lr-main{flex-direction:column}.lr-side-panel{width:100%;flex-direction:row;flex-wrap:wrap}}
`} export default LightningRouletteGame;

