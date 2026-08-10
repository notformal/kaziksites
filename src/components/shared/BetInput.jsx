// ═══════════════════════════════════════════════════════════
// BET INPUT — Reusable bet amount input field
// ═══════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';

/**
 * BetInput — Number input for betting with validation
 */
function BetInput({ 
  value = 0, 
  min = 0.1, 
  max = 25000, 
  step = 10,
  onChange,
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    const numValue = parseFloat(newValue);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      onChange?.(numValue);
    } else if (newValue === '' || newValue === '0') {
      onChange?.(min);
    }
  }, [min, max, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = Math.min(value + step, max);
    setInputValue(newValue.toString());
    onChange?.(newValue);
  }, [value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = Math.max(value - step, min);
    setInputValue(newValue.toString());
    onChange?.(newValue);
  }, [value, step, min, onChange]);

  return (
    <div className="bet-input">
      <button 
        className="bet-btn bet-btn-decrement" 
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        aria-label="Decrease bet"
      >
        -
      </button>
      
      <input
        type="number"
        className="bet-input-field"
        value={inputValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label="Bet amount"
      />
      
      <button 
        className="bet-btn bet-btn-increment" 
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        aria-label="Increase bet"
      >
        +
      </button>
    </div>
  );
}

export default BetInput;


