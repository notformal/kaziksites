// ═══════════════════════════════════════════════════════════
// GAME CONTAINER — Shared Layout Wrapper for All Games
// Provides consistent structure: header, canvas area, footer
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { Settings, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

/**
 * GameContainer — Wraps all game components with consistent layout
 */
function GameContainer({ 
  children, 
  title, 
  balance,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenSettings,
  soundEnabled = true,
  onToggleSound,
}) {
  return (
    <div className={`game-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {/* ── Header ─────────────────────────────── */}
      <header className="game-header">
        <div className="game-header-left">
          <h1 className="game-title">{title}</h1>
        </div>
        
        <div className="game-header-center">
          <div className="balance-display" aria-label={`Current balance: ${balance.toLocaleString()} coins`}>
            <span className="balance-label">Balance</span>
            <span className="balance-amount">{balance.toLocaleString()}</span>
            <span className="balance-currency">coins</span>
          </div>
        </div>
        
        <div className="game-header-right">
          {onToggleSound && (
            <button 
              className="icon-btn" 
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          
          {onToggleFullscreen && (
            <button 
              className="icon-btn" 
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          
          {onOpenSettings && (
            <button 
              className="icon-btn" 
              onClick={onOpenSettings}
              aria-label="Game settings"
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </header>

      {/* ── Main Game Area ─────────────────────── */}
      <main className="game-main">
        {children}
      </main>

      {/* ── Footer (bet controls, history) ─────── */}
      <footer className="game-footer">
        <div className="footer-left">
          {/* Bet controls injected by child components */}
        </div>
        
        <div className="footer-center">
          {/* Game status messages */}
        </div>
        
        <div className="footer-right">
          {/* History panel placeholder */}
        </div>
      </footer>
    </div>
  );
}

export default GameContainer;


