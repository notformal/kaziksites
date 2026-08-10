// ═══════════════════════════════════════════════════════════
// USE AUTH HOOK — React hook for authentication state
// Provides user data, balance, and auth actions to components
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.js';

function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from service
  useEffect(() => {
    const updateAuthState = ({ isAuthenticated: auth, user: userData }) => {
      setUser(userData);
      setIsAuthenticated(auth);
      setLoading(false);
    };

    // Initial load
    authService.checkExistingSession();
    
    // Subscribe to auth changes
    const unsubscribe = authService.onAuthChange(updateAuthState);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // ─── Login Handler ──────────────────────────────
  
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      await authService.login(email, password);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // ─── Register Handler ──────────────────────────────
  
  const register = useCallback(async (email, password, displayName) => {
    setError(null);
    try {
      await authService.register(email, password, displayName);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // ─── Logout Handler ──────────────────────────────
  
  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // ─── Balance Management ──────────────────────────────
  
  const balance = user?.balance || 0;

  const updateBalance = useCallback((newBalance) => {
    authService.updateBalance(newBalance);
  }, []);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    balance,
    login,
    register,
    logout,
    updateBalance,
  };
}

export default useAuth;


