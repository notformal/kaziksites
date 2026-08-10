// ═══════════════════════════════════════════════════════════
// LOGIN PAGE — User authentication (simplified)
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';

function LoginPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    try {
      let result;
      if (isRegister) {
        if (!displayName) { alert('Enter display name'); setLoading(false); return; }
        result = await register(email, password, displayName);
      } else {
        result = await login(email, password);
      }
      if (result?.success) onLoginSuccess?.();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <header className="auth-header">
          <Gamepad2 size={48} />
          <h1>Nova Casino</h1>
          <p>Social Casino Platform — Play Free</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Display Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required={!isRegister} />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>

          <div className="form-footer">
            {isRegister 
              ? <p>Already have an account? <button type="button" onClick={() => setIsRegister(false)}>Sign In</button></p>
              : <p>Don't have an account? <button type="button" onClick={() => setIsRegister(true)}>Create Account</button></p>
            }
          </div>
        </form>

        <footer className="auth-footer">
          <p>Demo Mode: Any email/password works (no real money)</p>
          <small>© 2026 Nova Casino — Social Gaming Platform</small>
        </footer>
      </div>

      <style jsx>{`
        .auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: var(--bg, #0a0a0f); color: var(--text, #f0f0f5); padding: 2rem; }
        .auth-container { width: 100%; max-width: 420px; background: rgba(255,255,255,0.03); border-radius: 24px; padding: 3rem; border: 1px solid rgba(255,255,255,0.1); }
        .auth-header { text-align: center; margin-bottom: 2rem; }
        .auth-header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; margin: 1rem 0 0.5rem 0; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
        .auth-header p { color: var(--muted, #6b6b8d); font-size: 0.875rem; }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--text, #f0f0f5); }
        .form-group input { width: 100%; padding: 0.875rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: var(--text, #f0f0f5); font-size: 1rem; outline: none; }
        .form-group input:focus { border-color: var(--accent, #7c3aed); box-shadow: 0 0 0 3px rgba(124,58,237,0.2); }
        .btn { width: 100%; padding: 1rem; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; color: white; }
        .btn-primary { background: linear-gradient(135deg, var(--accent, #7c3aed), var(--accent2, #06b6d4)); }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(124,58,237,0.4); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-footer { text-align: center; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); color: var(--muted, #6b6b8d); font-size: 0.875rem; }
        .form-footer button { background: none; border: none; color: var(--accent, #7c3aed); cursor: pointer; font-weight: 600; text-decoration: underline; }
        .auth-footer { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); color: var(--muted, #6b6b8d); }
        .auth-footer small { display: block; margin-top: 0.5rem; font-size: 0.75rem; }
      `}</style>
    </div>
  );
}

export default LoginPage;


