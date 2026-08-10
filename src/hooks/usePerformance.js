// ═══════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATIONS — React.memo, caching, debounce
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * useDebounce — Debounce hook for API calls and rapid updates
 */
export function useDebounce(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * useCachedData — Cache API responses to reduce network requests
 */
export function useCachedData(fetchFn, key = 'default', ttlMs = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Check cache first
    const cached = localStorage.getItem(`cache_${key}`);
    if (cached) {
      try {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttlMs && mounted) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      } catch (e) { /* Invalid cache */ }
    }

    // Fetch fresh data
    const fetchData = async () => {
      try {
        const result = await fetchFn();
        if (!mounted) return;
        
        setData(result);
        setLoading(false);
        
        // Cache the response
        localStorage.setItem(`cache_${key}`, JSON.stringify({
          data: result,
          timestamp: Date.now(),
        }));
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();

    return () => { mounted = false; };
  }, [key, ttlMs]); // Only re-fetch when key changes

  const clearCache = useCallback(() => {
    localStorage.removeItem(`cache_${key}`);
  }, [key]);

  return { data, loading, error, refresh: fetchData, clearCache };
}

/**
 * useOptimizedState — Memoized state for expensive computations
 */
export function useOptimizedState(initialValue) {
  const [value, setValue] = useState(initialValue);
  
  const memoizedValue = useMemo(() => value, [value]);
  
  return { value: memoizedValue, setValue };
}

/**
 * TableCard — Memoized table card component for performance
 */
export const TableCard = React.memo(function TableCard({ game, onClick }) {
  // All props are memoized by React.memo
  return (
    <button 
      className="game-card" 
      onClick={() => onClick?.(game)}
      aria-label={`Play ${game.name}`}
    >
      <div className="card-header">
        <span className="provider-badge">{game.provider}</span>
        {game.features?.includes('lightningMultipliers') && (
          <span className="feature-badge lightning">⚡ Lightning</span>
        )}
      </div>
      <div className="card-body">
        <h3>{game.name}</h3>
        <p>{game.description || `Live ${game.type}`}</p>
      </div>
    </button>
  );
});

TableCard.displayName = 'TableCard';


