// ═══════════════════════════════════════════════════════════
// DICE GAME — Lightning Dice game UI (simplified)
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import GameContainer from '../../components/game/GameContainer';
import BetInput from '../../components/shared/BetInput';
import ChipSelector from '../../components/shared/ChipSelector';

function DiceGame({ balance = 10000, onBalanceChange }) {
  const [gameState, setGameState] = useState('waiting');
  const [selectedTotal, setSelectedTotal] = useState(null);
  const [betAmount, setBetAmount] = useState(100);
  const [rollResult, setRollResult] = useState(null);
  const [lightningNumbers, setLightningNumbers] = useState(new Set());
  const [activeBets, setActiveBets] = useState([]);

  const generateLightning = useCallback(() => {
    const numbers = Array.from({ length: 15 }, (_, i) => i + 3);
    return new Set(numbers.sort(() => Math.random() - 0.5).slice(0, 3));
  }, []);

  const rollDice = useCallback(() => {
    if (activeBets.length === 0) return;
    
    setGameState('rolling');
    
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      
      let totalPayout = 0;
      const results = activeBets.map(bet => {
        const isWinner = bet.chosenTotal === total;
        let multiplier = 4.374;
        if (lightningNumbers.has(total)) {
          multiplier = Math.floor(Math.random() * 98) + 2;
        }
        const payout = isWinner ? Math.round(bet.amount * multiplier) : 0;
        totalPayout += payout;
        return { ...bet, won: isWinner, payout };
      });
      
      setRollResult({ dice: [d1, d2, d3], total, results });
      setActiveBets(results);
      setGameState('finished');
      
      if (totalPayout > 0) onBalanceChange?.(balance + totalPayout);
    }, 1500);
  }, [activeBets, balance, lightningNumbers, onBalanceChange]);

  const placeBet = useCallback(() => {
    if (gameState !== 'waiting') return;
    
    const newBet = { id: `bet-${Date.now()}`, amount: betAmount, chosenTotal: selectedTotal };
    setActiveBets(prev => [...prev, newBet]);
    onBalanceChange?.(balance - betAmount);
  }, [gameState, betAmount, selectedTotal, balance, onBalanceChange]);

  const resetGame = useCallback(() => {
    setGameState('waiting'); setSelectedTotal(null); 
    setActiveBets([]); setRollResult(null);
    setLightningNumbers(generateLightning());
  }, [generateLightning]);

  useEffect(() => { setLightningNumbers(generateLightning()); }, [generateLightning]);

  const baseOdds = { 3: 243.0, 4: 72.9, 5: 29.16, 6: 14.58, 7: 9.72, 8: 7.29, 9: 5.832, 10: 4.86, 11: 4.374, 12: 4.374, 13: 4.86, 14: 5.832, 15: 7.29, 16: 9.72, 17: 14.58 };

  return (
    <GameContainer title="Lightning Dice" balance={balance} onToggleFullscreen={() => {}} soundEnabled={true}>
      <div className="dice-game-area">
        <div className="lightning-display">
          <h3>⚡ Lightning Numbers</h3>
          <div className="lightning-numbers">
            {Array.from(lightningNumbers).map(num => (
              <div key={num} className="lightning-number"><span>{num}</span><small>x{Math.floor(Math.random() * 98) + 2}</small></div>
            ))}
          </div>
        </div>

        <div className="dice-board">
          {Array.from({ length: 15 }, (_, i) => i + 3).map(num => (
            <button key={num} 
              className={`number-btn ${selectedTotal === num ? 'selected' : ''}`}
              onClick={() => selectedTotal !== num && setSelectedTotal(num)}
              disabled={gameState !== 'waiting'}
            >
              <span>{num}</span><small>x{baseOdds[num].toFixed(2)}</small>
            </button>
          ))}
        </div>

        {rollResult && (
          <div className={`roll-result ${rollResult.results?.some(r => r.won) ? 'won' : 'lost'}`}>
            <div className="dice-visual">
              {[...Array(3)].map((_, i) => <div key={i} className="die">{rollResult.dice[i]}</div>)}
            </div>
            <div className="result-message">
              {rollResult.results?.some(r => r.won) 
                ? `🎉 Won ${rollResult.results.reduce((sum, r) => sum + r.payout, 0).toLocaleString()} coins!`
                : `Crashed at ${rollResult.total}`
              }
            </div>
          </div>
        )}

        <div className="bets-panel">
          <h3>Active Bets ({activeBets.length})</h3>
          {activeBets.map(bet => (
            <div key={bet.id} className={`bet-item ${bet.won ? 'won' : ''}`}>
              <span>Total: {bet.chosenTotal}</span>
              <span>{bet.amount.toLocaleString()} coins</span>
              {bet.won && <span className="payout">+{bet.payout?.toLocaleString()}</span>}
            </div>
          ))}
        </div>
      </div>

      <footer className="dice-footer">
        <div className="bet-controls">
          <BetInput value={betAmount} onChange={setBetAmount} min={10} max={balance} />
          <ChipSelector chips={[50, 100, 500]} value={betAmount} onChange={setBetAmount} />
        </div>

        <div className="action-buttons">
          {gameState === 'waiting' ? (
            activeBets.length > 0 
              ? <button className="btn btn-primary" onClick={rollDice}>Roll Dice</button>
              : <button className="btn btn-secondary" disabled>Select a number and place bet</button>
          ) : gameState === 'rolling' 
            ? <button className="btn btn-disabled">Rolling...</button>
            : <button className="btn btn-primary" onClick={resetGame}>New Round</button>
          }
        </div>
      </footer>
    </GameContainer>
  );
}

export default DiceGame;


