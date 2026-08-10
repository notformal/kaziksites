// ═══════════════════════════════════════════════════════════
// GAME ROOM PAGE — Full-screen game room with multiple games
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import CrashGame from '../components/instant-games/crash/CrashGame.jsx';
import DiceGame from '../components/instant-games/dice/DiceGame.jsx';
import PlinkoGame from '../components/instant-games/plinko/PlinkoGame.jsx';
import LightningRouletteGame from '../components/instant-games/lightning-roulette/LightningRouletteGame.jsx';
function GameRoomPage({ onBack, balance = 10000, onBalanceChange }) {
  const [selectedGame, setSelectedGame] = useState('crash');

  const games = [
    { id: 'crash', name: 'Crash Pro', icon: '🚀' },
    { id: 'dice', name: 'Lightning Dice', icon: '⚡' },
    { id: 'plinko', name: 'Plinko Master', icon: '🔻' },
    { id: 'lightning-roulette', name: 'Lightning Roulette', icon: '⚡' },
  ];

  const handleGameSelect = (gameId) => {
    setSelectedGame(gameId);
  };

  const renderGame = () => {
    switch(selectedGame) {
      case 'crash': return <CrashGame balance={balance} onBalanceChange={onBalanceChange} />;
      case 'dice': return <DiceGame balance={balance} onBalanceChange={onBalanceChange} />;
      case 'plinko': return <PlinkoGame balance={balance} onBalanceChange={onBalanceChange} />;
      case 'lightning-roulette': return <LightningRouletteGame balance={balance} onBalanceChange={onBalanceChange} />;      default: return <CrashGame balance={balance} onBalanceChange={onBalanceChange} />;
    }
  };

  return (
    <div className="game-room">
      {/* ── Header ────────────────────────────── */}
      <header className="room-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} /> Back to Lobby
        </button>

        <div className="game-selector">
          {games.map(game => (
            <button 
              key={game.id}
              className={`game-tab ${selectedGame === game.id ? 'active' : ''}`}
              onClick={() => handleGameSelect(game.id)}
            >
              <span className="tab-icon">{game.icon}</span>
              <span>{game.name}</span>
            </button>
          ))}
        </div>

        <div className="balance-display">
          <span className="balance-label">Balance</span>
          <span className="balance-amount">{balance.toLocaleString()}</span>
          <span className="balance-currency">coins</span>
        </div>
      </header>

      {/* ── Game Area ─────────────────────────── */}
      <main className="room-main">
        {renderGame()}
      </main>

      {/* ── Inline Styles ───────────────────── */}
      <style jsx>{`
        .game-room { display: flex; flex-direction: column; height: 100vh; background: var(--bg, #0a0a0f); color: var(--text, #f0f0f5); }
        
        .room-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); }
        
        .back-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; color: var(--text, #f0f0f5); cursor: pointer; transition: all 0.2s ease; font-weight: 500; }
        .back-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-1px); }
        
        .game-selector { display: flex; gap: 0.5rem; }
        .game-tab { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; color: var(--text, #f0f0f5); cursor: pointer; transition: all 0.2s ease; font-weight: 500; }
        .game-tab:hover { background: rgba(255,255,255,0.1); }
        .game-tab.active { background: var(--accent, #7c3aed); border-color: var(--accent, #7c3aed); color: white; }
        .tab-icon { font-size: 1.25rem; }
        
        .balance-display { display: flex; align-items: baseline; gap: 0.5rem; padding: 0.5rem 1.5rem; background: rgba(255,255,255,0.05); border-radius: 999px; }
        .balance-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: var(--muted, #6b6b8d); }
        .balance-amount { font-family: 'JetBrains Mono', monospace; font-size: 1.25rem; font-weight: 700; color: var(--accent, #7c3aed); }
        .balance-currency { font-size: 0.875rem; color: var(--muted, #6b6b8d); }
        
        .room-main { flex: 1; overflow-y: auto; padding: 2rem; display: flex; align-items: center; justify-content: center; }
        
        @media (max-width: 768px) {
          .room-header { flex-direction: column; gap: 1rem; padding: 1rem; }
          .game-selector { flex-wrap: wrap; justify-content: center; }
          .balance-display { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}

export default GameRoomPage;


