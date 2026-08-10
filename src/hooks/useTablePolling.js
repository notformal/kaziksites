// ═══════════════════════════════════════════════════════════
// USE TABLE POLLING — Hook for real-time live casino updates
// Polls table history every 8 seconds and returns round data
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api.js';

/**
 * useTablePolling — Polls live casino table for new rounds
 * 
 * @param {string} tableId - ID of the table to poll
 * @param {number} intervalMs - Polling interval in milliseconds (default: 8000)
 * @returns {Object} { currentRound, history, loading, error }
 */
function useTablePolling(tableId, intervalMs = 8000) {
  const [currentRound, setCurrentRound] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll function
  const pollTable = useCallback(async () => {
    if (!tableId) return;

    try {
      const data = await apiService.get(`/api/live-games/tables/${tableId}/history?limit=10`);
      
      if (data?.history && Array.isArray(data.history)) {
        setHistory(data.history);
        
        // Update current round with latest result
        if (data.history.length > 0) {
          const latestRound = data.history[0];
          setCurrentRound(latestRound);
          
          // Clear error on successful poll
          setError(null);
        }
      } else if (data?.result) {
        // Single round result format
        setCurrentRound(data.result);
        setError(null);
      }
      
      setLoading(false);
    } catch (err) {
      console.warn('Polling failed:', err.message);
      setError(err.message || 'Failed to poll table');
      setLoading(false);
    }
  }, [tableId]);

  // Initial load and polling setup
  useEffect(() => {
    // Load immediately on mount
    pollTable();

    // Set up interval for subsequent polls
    if (tableId) {
      const interval = setInterval(pollTable, intervalMs);
      
      // Cleanup on unmount or when tableId changes
      return () => clearInterval(interval);
    }
  }, [tableId, intervalMs, pollTable]);

  // Manual refresh function
  const refresh = useCallback(() => {
    pollTable();
  }, [pollTable]);

  return {
    currentRound,
    history,
    loading,
    error,
    refresh,
  };
}

export default useTablePolling;


