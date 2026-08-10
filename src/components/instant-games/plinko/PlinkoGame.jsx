// ═══════════════════════════════════════════════════════════
// PLINKO GAME — Physics-based ball drop game UI (simplified)
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import GameContainer from '../../components/game/GameContainer';
import BetInput from '../../components/shared/BetInput';
import ChipSelector from '../../components/shared/ChipSelector';

function PlinkoGame({ balance = 10000, onBalanceChange }) {
  const [gameState, setGameState] = useState('waiting');
  const [betAmount, setBetAmount] = useState(100);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [currentMultiplier, setCurrentMultiplier] = useState(null);
  const [payout, setPayout] = useState(0);
  const [history, setHistory] = useState([]);

  const riskConfig = {
    low: { multipliers: [8.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 8.6], volatility: 'low' },
    medium: { multipliers: [33, 4.2, 1.6, 1.1, 0.3, 1.1, 1.6, 4.2, 33], volatility: 'medium' },
    high: { multipliers: [110, 41, 10, 5, 1.5, 5, 10, 41, 110], volatility: 'high' },
  };

  const dropBall = useCallback(() => {
    if (gameState !== 'waiting') return;
    
    setGameState('dropping');
    setCurrentMultiplier(null);
    setPayout(0);
    
    setTimeout(() => {
      const config = riskConfig[riskLevel];
      
      // Weighted random selection towards center for medium/high risk
      let bucketIndex;
      if (riskLevel === 'low') {
        bucketIndex = Math.floor(Math.random() * config.multipliers.length);
      } else {
        const weights = config.multipliers.map((m, i) => 
          riskLevel === 'high' ? (i === 0 || i === config.multipliers.length - 1 ? 2 : 8) : 5
        );
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < config.multipliers.length; i++) {
          random -= weights[i];
          if (random <= 0) { bucketIndex = i; break; }
        }
        if (bucketIndex === undefined) bucketIndex = Math.floor(config.multipliers.length / 2);
      }
      
      const multiplier = config.multipliers[bucketIndex];
      const calculatedPayout = Math.round(betAmount * multiplier);
      
      setCurrentMultiplier(multiplier);
      setPayout(calculatedPayout);
      setGameState('finished');
      setHistory(prev => [{ multiplier, payout: calculatedPayout }, ...prev].slice(0, 10));
      
      if (multiplier > 1) onBalanceChange?.(balance + calculatedPayout - betAmount);
      else onBalanceChange?.(-betAmount);
    }, 2000);
  }, [gameState, betAmount, riskLevel, balance, onBalanceChange, riskConfig]);

  const resetGame = useCallback(() => {
    setGameState('waiting'); setCurrentMultiplier(null); setPayout(0);
  }, []);

  return (
    <GameContainer title="Plinko Master" balance={balance} onToggleFullscreen={() => {}} soundEnabled={true}>
      <div className="plinko-game-area">
        <div className="risk-selector">
          <h3>Risk Level</h3>
          <div className="risk-buttons">
            {['low', 'medium', 'high'].map(level => (
              <button key={level} className={`risk-btn ${riskLevel === level ? 'active' : ''}`} onClick={() => setRiskLevel(level)} disabled={gameState !== 'waiting'}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="plinko-board">
          <div className={`board-display ${gameState}`}>
            {currentMultiplier !== null ? (
              <div className="multiplier-result">
                <div className="result-multiplier">{currentMultiplier.toFixed(1)}x</div>
                {currentMultiplier > 1 && <div className="result-payout">+{payout.toLocaleString()} coins</div>}
              </div>
            ) : (
              <div className="waiting-message">Drop the ball...</div>
            )}
          </div>

          <div className="multiplier-buckets">
            {riskConfig[riskLevel].multipliers.map((mult, i) => (
              <div key={i} className={`bucket ${currentMultiplier === mult ? 'active' : ''}`}><span>{mult.toFixed(1)}x</span></div>
            ))}
          </div>
        </div>

        {history.length > 0 && (
          <div className="history-panel">
            <h3>Last Results</h3>
            <div className="history-list">
              {history.map((item, i) => (
                <div key={i} className={`history-item ${item.multiplier >= 1 ? 'win' : 'loss'}`}>{item.multiplier.toFixed(1)}x</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="plinko-footer">
        <div className="bet-controls">
          <BetInput value={betAmount} onChange={setBetAmount} min={10} max={balance} />
          <ChipSelector chips={[50, 100, 500, 1000]} value={betAmount} onChange={setBetAmount} />
        </div>

        <div className="action-buttons">
          {gameState === 'waiting' ? (
            <button className="btn btn-primary" onClick={dropBall}>Drop Ball ({betAmount.toLocaleString()} coins)</button>
          ) : gameState === 'dropping' ? (
            <button className="btn btn-disabled">Dropping...</button>
          ) : (
            <button className="btn btn-primary" onClick={resetGame}>Play Again</button>
          )}
        </div>
      </footer>
    </GameContainer>
  );
}

export default PlinkoGame;


