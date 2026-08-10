import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCw, DollarSign, MinusCircle, XCircle, Trophy, Zap,
  Coins, Star, Target, Gamepad2, History, AlertTriangle, Building2
} from 'lucide-react';

const CHIP_VALUES = [10, 50, 100, 250, 500, 1000];
function fmtOdds(o) { return o ? o.toFixed(2) : '\u2014'; }

const BET_PANELS = [
  { id: 'number_1', label: 'x1', payout: 1, color: '#f5f5dc', bg: '#3a3a3a' },
  { id: 'number_2', label: 'x2', payout: 2, color: '#4a90d9', bg: '#1a2a4a' },
  { id: 'number_5', label: 'x5', payout: 5, color: '#e8751a', bg: '#4a2a1a' },
  { id: 'number_10', label: 'x10', payout: 10, color: '#8b5cf6', bg: '#2a1a4a' },
  { id: 'bonus_cash_bowl', label: '\ud83d\udcb0 Cash Bowl', payout: 2, color: '#22c55e', bg: '#1a3a2a' },
  { id: 'bonus_roll_up', label: '\u2b50 Roll Up', payout: 2, color: '#ec4899', bg: '#3a1a2a' },
  { id: 'bonus_rich_revival', label: '\ud83c\udfe0 Rich Revival', payout: 2, color: '#eab308', bg: '#3a3a1a' },
];


import './styles.css';
async function apiFetch(url, opts={}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...opts.headers }, ...opts });
  if (!res.ok) throw new Error('API '+res.status+' '+url);
  return res.json();
}


function MonopolyLiveGame({ balance = 10000, onBalanceChange }) {
  const [balanceState, setBalance] = useState(balance);
  const [sessionId, setSessionId] = useState(null);
  const [bets, setBets] = useState([]);
  const [selectedOdds, setSelectedOdds] = useState({});
  const [betSlip, setBetSlip] = useState([]);
  const [currentSpin, setCurrentSpin] = useState(null);
  const [history, setHistory] = useState([]);
  const [betAmount, setBetAmount] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [bonusActive, setBonusActive] = useState(null);
  const [bonusResult, setBonusResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/monopoly-live/session/create').then(r => {
      if (r.success) { setSessionId(r.sessionId); setLoading(false); }
      else setError(r.error);
    }).catch(e => setError(e.message));
  }, []);

  const loadSlip = useCallback(async () => {
    try {
      const data = await apiFetch('/api/monopoly-live/bets/slip');
      if (data.selections) setBetSlip(data.selections);
    } catch {}
  }, []);

  useEffect(() => { if (sessionId) loadSlip(); }, [sessionId, loadSlip]);


  const addToSlip = useCallback(async (betTypeId) => {
    if (!sessionId || spinning) return;
    try {
      await apiFetch('/api/monopoly-live/bets/slip', {
        method: 'POST', body: JSON.stringify({ betTypeId, amountCents: betAmount * 100 })
      });
      setSelectedOdds(prev => ({ ...prev, [betTypeId]: true }));
      await loadSlip();
    } catch (e) { setError(e.message); }
  }, [sessionId, betAmount, spinning, loadSlip]);

  const removeFromSlip = useCallback(async () => {
    try {
      await apiFetch('/api/monopoly-live/bets/slip', { method: 'DELETE' });
      setSelectedOdds({}); setBetSlip([]); await loadSlip();
    } catch (e) { setError(e.message); }
  }, [loadSlip]);

  const clearAllBets = useCallback(async () => {
    try {
      await apiFetch('/api/monopoly-live/bets/slip', { method: 'DELETE' });
      setSelectedOdds({}); setBetSlip([]); await loadSlip();
    } catch (e) { setError(e.message); }
  }, [loadSlip]);

  const spin = useCallback(async () => {
    if (!sessionId || betSlip.length === 0 || spinning) return;
    try {
      setSpinning(true); setError(null);
      const data = await apiFetch('/api/monopoly-live/spin', { method: 'POST' });
      if (data.success) {
        setCurrentSpin(data.spin);
        setBalance(b => b + data.spin.totalPayout - betSlip.reduce((s,b) => s+b.amount,0));
        if (onBalanceChange) onBalanceChange(balanceState + data.spin.totalPayout - betSlip.reduce((s,b)=>s+b.amount,0));
        setSelectedOdds({}); setBetSlip([]);
        const hist = await apiFetch('/api/monopoly-live/history');
        setHistory(hist.history || []);
        if (data.spin.resultSeg.type === 'bonus') {
          setBonusActive(data.spin.resultSeg.name);
          const bonusData = await apiFetch(`/api/monopoly-live/bonus/${data.spin.resultSeg.name}`, { method: 'POST' });
          setBonusResult(bonusData);
          setTimeout(() => { setBonusActive(null); setBonusResult(null); }, 5000);
        }
      } else setError(data.error);
    } catch (e) { setError(e.message); }
    finally { setSpinning(false); }
  }, [sessionId, betSlip, spinning, balanceState, onBalanceChange]);


  const combinedOdds = betSlip.reduce((acc, s) => acc * (s.odds || 1), 1);
  const potentialWin = (betAmount * combinedOdds).toFixed(2);

  return (
    <div className="min-h-screen bg-[#0a1a0a] text-white font-sans">
      {/* Header */}
      <header className="bg-[#0d2b0d]/95 backdrop-blur border-b border-green-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#22c55e' }}>
            &#x1F3C0; Monopoly Live
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Balance:</span>
            <span className="font-bold text-green-400">${'$'}{balanceState.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Main Game Area */}
        <main className="flex-1 min-w-0">
          {error && (<div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 text-sm"><AlertTriangle size={16} />{error}</div>)}

          {/* Wheel + Result */}
          <section className="mb-8">
            <div className="bg-[#0d2b0d] rounded-2xl border border-green-500/20 p-6 relative overflow-hidden">
              {spinning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="text-center">
                    <RotateCw size={48} className="text-green-400 animate-spin mx-auto mb-3" />
                    <p className="text-lg font-bold text-white">Spinning...</p>
                  </div>
                </div>
              )}

              {/* Wheel Visualization */}
              <div className="flex justify-center mb-8">
                <div className={`relative w-52 h-52 md:w-72 md:h-72 rounded-full border-4 border-green-500/50 bg-gradient-to-br from-green-900 to-emerald-900 flex items-center justify-center shadow-2xl ${spinning ? 'wheel-spinning-ml' : ''}`}>
                  {currentSpin && currentSpin.resultSeg ? (
                    <div className="text-center">
                      {currentSpin.resultSeg.type === 'bonus' ? (
                        <span className="text-6xl">{BET_PANELS.find(b => b.id === `bonus_${currentSpin.resultSeg.name}`)?.label?.split(' ')[0] || '\ud83c\udfe0'}</span>
                      ) : (
                        <span className="text-7xl font-black text-white">{currentSpin.resultSeg.value}x</span>
                      )}
                      <p className="text-sm mt-2 text-slate-300">
                        {currentSpin.resultSeg.type === 'bonus' ? currentSpin.resultSeg.name.toUpperCase() : 'Number Hit'}
                      </p>
                    </div>
                  ) : (
                    <span className="text-7xl font-black text-white/50">?</span>
                  )}
                </div>
              </div>

              {/* Result Display */}
              {currentSpin && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 border border-green-500/30 mb-6 result-flash-green">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Result</p>
                      <p className="text-2xl font-black text-white">
                        {currentSpin.resultSeg.type === 'bonus' ? (
                          <span className="flex items-center gap-2">{BET_PANELS.find(b => b.id === `bonus_${currentSpin.resultSeg.name}`)?.label} <Trophy size={20} className="text-green-400" /></span>
                        ) : `${currentSpin.resultSeg.value}x`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Payout</p>
                      <p className="text-2xl font-black text-green-400">${'$'}{currentSpin.totalPayout.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bet Panels */}
              <div className="grid gap-2 md:gap-3 grid-cols-4 md:grid-cols-7">
                {BET_PANELS.map(panel => (
                  <button key={panel.id} onClick={() => addToSlip(panel.id)}
                    disabled={spinning || !sessionId}
                    className={`relative p-3 md:p-4 rounded-xl border transition-all active:scale-95 touch-manipulation ${selectedOdds[panel.id] ? 'border-[#22c55e] bg-green-500/20 scale-105' : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06]'} disabled:opacity-30`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: panel.color }}>{panel.label}</span>
                      {selectedOdds[panel.id] && (<span className="px-1.5 py-0.5 rounded-full bg-[#22c55e] text-white text-[10px] font-bold">✓</span>)}
                    </div>
                    <div className="text-2xl font-black" style={{ color: panel.color }}>{panel.payout}x</div>
                  </button>))}
              </div>

              {/* Spin Button + Bet Amount */}
              <div className="flex items-center justify-between gap-4 mt-6">
                <div className="flex items-center gap-2">
                  {CHIP_VALUES.map(v => (
                    <button key={v} onClick={() => setBetAmount(v)}
                      className={'px-3 py-2 rounded-lg text-sm font-bold transition-all '+(betAmount===v?'bg-green-400/20 text-green-400 border border-green-400':'bg-white/5 text-slate-400 hover:bg-white/10')}>
                      {v>=1000?((v/1000).toFixed(0)+'K'):v}
                    </button>))}
                </div>
                <button onClick={spin} disabled={!sessionId||betSlip.length===0||spinning}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-20 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all flex items-center gap-3">
                  <RotateCw size={20} className={spinning?'animate-spin':''}/>
                  SPIN ${'$'}{potentialWin}
                </button>
              </div>

            </div>
          </section>

          {/* Bonus Round Display */}
          {bonusActive && bonusResult && (
            <section className="mb-8">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl border border-green-500/30 p-6 text-center bonus-appear-ml">
                <h3 className="text-2xl font-black mb-4 flex items-center justify-center gap-2 glow-pulse-green">
                  {BET_PANELS.find(b => b.id === `bonus_${bonusActive}`)?.label}
                  <Trophy size={28} className="text-green-400" />
                </h3>

                {/* Cash Bowl */}
                {bonusActive === 'cash_bowl' && (
                  <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                    {bonusResult.result.bowls.map((bowl, i) => (
                      <div key={i} className={'p-4 rounded-xl border-2 transition-all '+(i===bonusResult.result.selected?'border-yellow-400 bg-yellow-400/20':'border-white/10 bg-white/5')}>
                        <div className="text-sm text-slate-400 mb-1">Bowl #{bowl.id}</div>
                        <div className="text-2xl font-black text-green-400">{bowl.multiplier}x</div>
                      </div>))}
                  </div>)}

                {/* Roll Up */}
                {bonusActive === 'roll_up' && (
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-5xl font-black text-white">{bonusResult.result.dice.join(' + ')} = {bonusResult.result.totalRoll}</div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-sm text-slate-400 mb-2">Stars Collected</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {bonusResult.result.stars.map((star, i) => (
                          <div key={i} className="px-3 py-1 rounded-lg bg-green-400/20 border border-green-400/50 text-sm font-bold">{star.multiplier}x</div>))}
                      </div>
                    </div>
                  </div>)}

                {/* Rich Revival */}
                {bonusActive === 'rich_revival' && (
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">{bonusResult.result.multiplier}x</div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-sm text-slate-400 mb-2">Position: {bonusResult.result.playerPos}</p>
                      <p className="text-sm text-slate-400 mb-2">Chance Card</p>
                      <div className="bg-yellow-400/20 rounded-lg p-3 border border-yellow-400/50 text-center font-bold">{bonusResult.result.chanceCard.text}</div>
                    </div>
                  </div>)}

                <p className="text-lg mt-4 text-slate-300">Final Multiplier: <span className="font-black text-green-400">{bonusResult.finalMultiplier}x</span></p>
              </div>
            </section>
          )}

          {/* History */}
          {history.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><History size={18} className="text-slate-400" />Recent Spins</h2>
              <div className="bg-[#0d2b0d] rounded-xl border border-white/6 overflow-hidden">
                <div className="flex overflow-x-auto divide-x divide-white/5">
                  {history.slice(0, 20).map((spin, i) => (
                    <div key={i} className={'px-4 py-3 flex-shrink-0 text-center border-r border-white/5 last:border-0 '+(spin.resultSeg.type==='bonus'?'bg-green-500/10':'')}>
                      {spin.resultSeg.type === 'bonus' ? (
                        <span className="text-lg">{BET_PANELS.find(b => b.id === `bonus_${spin.resultSeg.name}`)?.label?.split(' ')[0] || '\ud83c\udfe0'}</span>
                      ) : (<span className="text-lg font-black text-white">{spin.resultSeg.value}x</span>)}
                    </div>))}
                </div>
              </div>
            </section>
          )}

        </main>

        {/* Sidebar - Bet Slip */}
        <aside className="w-80 flex-shrink-0 hidden lg:block">
          <div className="sticky top-20 bg-[#0d2b0d] rounded-xl border border-white/6 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/5" style={{ backgroundColor: '#0a1a0a' }}>
              <h3 className="font-bold text-sm flex items-center gap-2"><DollarSign size={16} className="text-green-400"/>Bet Slip<span className="px-1.5 py-0.5 rounded-full bg-[#22c55e] text-white text-xs font-bold">{betSlip.length}</span></h3>
              {betSlip.length > 0 && (<button onClick={clearAllBets} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><XCircle size={12}/>Clear</button>)}
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
              {betSlip.length === 0 ? (<div className="py-8 text-center text-slate-500 text-sm">Select odds to add bets</div>) : betSlip.map((sel, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div><div className="text-xs text-slate-400 truncate">{(sel.betTypeId||'').slice(0,15)}...</div>
                    <div className="font-medium text-sm text-white mt-0.5">{BET_PANELS.find(b=>b.id===sel.betTypeId)?.label||sel.betTypeId} — <span className="text-green-400 font-bold">{fmtOdds(sel.odds)}</span></div></div>
                  <button onClick={removeFromSlip} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><MinusCircle size={16}/></button>
                </div>))}
            </div>

            <div className="px-4 py-3 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs text-slate-500"><span>Combined Odds</span><span className="text-green-400 font-bold">{fmtOdds(combinedOdds)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Potential Win</span><span className="font-bold text-green-400">${'$'}{potentialWin}</span></div>
            </div>

          </div>
        </aside>
      </div>
    </div>);
}

export default MonopolyLiveGame;

