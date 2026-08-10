// ═══════════════════════════════════════════════════════════
// CRASH GAME — Real-time multiplier crash game UI (Part 1)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameContainer from '../../components/game/GameContainer';
import BetInput from '../../components/shared/BetInput';
import ChipSelector from '../../components/shared/ChipSelector';

/**
 * CrashGame — Main crash game component with real-time multiplier display
 */
function CrashGame({ balance = 10000, onBalanceChange }) {
  const [gameState, setGameState] = useState('waiting');
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(null);
  const [activeBets, setActiveBets] = useState([]);
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState(null);
  
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // ─── Game Logic ──────────────────────────────────────
  const startGame = useCallback(() => {
    if (activeBets.length === 0) return;
    
    setGameState('running');
    setCurrentMultiplier(1.0);
    
    const newCrashPoint = Math.max(1.0, parseFloat((Math.random() * 10 + 1).toFixed(2)));
    setCrashPoint(newCrashPoint);
    
    startTimeRef.current = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const newMultiplier = Math.exp(0.1 * elapsed);
      
      if (newMultiplier >= crashPoint) {
        setGameState('crashed');
        setCurrentMultiplier(crashPoint);
        setActiveBets(prev => prev.map(bet => ({ ...bet, cashedOut: false, payout: 0 })));
      } else {
        setCurrentMultiplier(parseFloat(newMultiplier.toFixed(2)));
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [activeBets, crashPoint]);

  const cashOut = useCallback((betId) => {
    if (gameState !== 'running') return;
    
    setActiveBets(prev => prev.map(bet => {
      if (bet.id === betId && !bet.cashedOut) {
        const payout = Math.round(bet.amount * currentMultiplier);
        onBalanceChange?.(balance + payout - bet.amount);
        return { ...bet, cashedOut: true, payout };
      }
      return bet;
    }));
  }, [gameState, currentMultiplier, balance, onBalanceChange]);

  const placeBet = useCallback(() => {
    if (gameState !== 'waiting') return;
    
    const newBet = { id: `bet-${Date.now()}`, amount: betAmount, cashedOut: false, payout: 0, autoCashout };
    setActiveBets(prev => [...prev, newBet]);
    onBalanceChange?.(balance - betAmount);
  }, [gameState, betAmount, autoCashout, balance, onBalanceChange]);

  const resetGame = useCallback(() => {
    setGameState('waiting');
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    setActiveBets([]);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => { return () => animationRef.current && cancelAnimationFrame(animationRef.current); }, []);

  // ─── Render ──────────────────────────────────────
  return (
    <GameContainer title="Crash Pro" balance={balance} onToggleFullscreen={() => {}} soundEnabled={true}>
      <div className="crash-game-area">
        <div className={`crash-display ${gameState}`}>
          <div className="multiplier-value">{currentMultiplier.toFixed(2)}x</div>
          
          {gameState === 'waiting' && <div className="status-message">Place your bets...</div>}
          {gameState === 'running' && <div className="status-message running">Game in progress...</div>}
          {gameState === 'crashed' && <div className="status-message crashed">Crashed at {crashPoint?.toFixed(2)}x</div>}
        </div>

        <div className="bets-panel">
          <h3>Active Bets ({activeBets.length})</h3>
          {activeBets.map(bet => (
            <div key={bet.id} className={`bet-item ${bet.cashedOut ? 'cashed-out' : ''}`}>
              <span className="bet-amount">{bet.amount.toLocaleString()} coins</span>
              {bet.cashedOut ? (
                <span className="bet-payout">+{bet.payout?.toLocaleString()}</span>
              ) : gameState === 'running' ? (
                <button className="cashout-btn" onClick={() => cashOut(bet.id)}>Cash Out ({currentMultiplier.toFixed(2)}x)</button>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <footer className="crash-footer">
        <div className="bet-controls">
          <BetInput value={betAmount} onChange={setBetAmount} min={10} max={balance} />
          <ChipSelector chips={[50, 100, 500, 1000, 5000]} value={betAmount} onChange={setBetAmount} />
        </div>

        <div className="action-buttons">
          {gameState === 'waiting' ? (
            <button className="btn btn-primary" onClick={placeBet} disabled={balance < betAmount}>Place Bet ({betAmount.toLocaleString()} coins)</button>
          ) : gameState === 'running' ? (
            <div className="auto-cashout-control">
              <label>Auto Cashout:</label>
              <input type="number" value={autoCashout || ''} onChange={(e) => setAutoCashout(e.target.value ? parseFloat(e.target.value) : null)} placeholder="None" min="1.01" step="0.1" />
            </div>
          ) : (
            <button className="btn btn-primary" onClick={resetGame}>New Round</button>
          )}
        </div>
      </footer>
    </GameContainer>
  );
}

export default CrashGame;


