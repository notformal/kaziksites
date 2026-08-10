// ═══════════════════════════════════════════════════════════
// CHIP SELECTOR — Chip denomination selector for quick bets
// ═══════════════════════════════════════════════════════════

import React, { useCallback } from 'react';

const DEFAULT_CHIPS = [10, 50, 100, 500, 1000, 5000];

/**
 * ChipSelector — Quick bet denomination selector
 */
function ChipSelector({ 
  chips = DEFAULT_CHIPS,
  value = 0,
  onChange,
  disabled = false,
}) {
  const handleChipClick = useCallback((chipValue) => {
    if (!disabled) {
      onChange?.(chipValue);
    }
  }, [disabled, onChange]);

  return (
    <div className="chip-selector" role="group" aria-label="Bet denomination">
      {chips.map((chipValue) => (
        <button
          key={chipValue}
          className={`chip-btn ${value === chipValue ? 'active' : ''}`}
          onClick={() => handleChipClick(chipValue)}
          disabled={disabled || value >= chipValue}
          aria-label={`${chipValue.toLocaleString()} coins`}
          aria-pressed={value === chipValue}
        >
          <span className="chip-value">{chipValue >= 1000 ? `${(chipValue / 1000).toFixed(0)}K` : chipValue}</span>
        </button>
      ))}
    </div>
  );
}

export default ChipSelector;


