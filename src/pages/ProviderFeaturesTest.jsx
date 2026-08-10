// ═══════════════════════════════════════════════════════════
// PROVIDER FEATURES TEST — Verify live casino provider features (minimal)
// ═══════════════════════════════════════════════════════════

import React from 'react';
import { apiService } from '../services/api.js';

function ProviderFeaturesTest({ onBack }) {
  const [testResults, setTestResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Get providers
      try {
        const providers = await apiService.get('/api/live-games/providers');
        results.push({ name: 'Get Providers', status: 'PASS', message: `Found ${providers?.totalGames || 0} games across ${providers?.providers?.length || 0} providers` });
      } catch (err) { results.push({ name: 'Get Providers', status: 'FAIL', error: err.message }); }

      // Test 2: Get tables with provider filter
      try {
        const evolutionTables = await apiService.get('/api/live-games/tables?provider=evolution');
        results.push({ name: 'Evolution Tables', status: (evolutionTables?.tables?.length || 0) > 0 ? 'PASS' : 'WARN', message: `Found ${(evolutionTables?.tables?.length || 0)} Evolution tables` });

        const pragmaticTables = await apiService.get('/api/live-games/tables?provider=pragmatic');
        results.push({ name: 'Pragmatic Tables', status: (pragmaticTables?.tables?.length || 0) > 0 ? 'PASS' : 'WARN', message: `Found ${(pragmaticTables?.tables?.length || 0)} Pragmatic tables` });
      } catch (err) { results.push({ name: 'Get Tables by Provider', status: 'FAIL', error: err.message }); }

      // Test 3: Check for lightning features in blackjack
      try {
        const allTables = await apiService.get('/api/live-games/tables');
        const lightningBlackjacks = (allTables?.tables || []).filter(t => t.gameType === 'blackjack' && t.features?.includes('lightningMultipliers'));
        results.push({ name: 'Lightning Blackjack', status: lightningBlackjacks.length > 0 ? 'PASS' : 'INFO', message: `Found ${lightningBlackjacks.length} Lightning Blackjack tables` });
      } catch (err) { results.push({ name: 'Lightning Check', status: 'FAIL', error: err.message }); }

      // Test 4: Check for VIP features in baccarat
      try {
        const allTables = await apiService.get('/api/live-games/tables');
        const vipBaccarats = (allTables?.tables || []).filter(t => t.gameType === 'baccarat' && t.features?.includes('vip'));
        results.push({ name: 'VIP Baccarat', status: vipBaccarats.length > 0 ? 'PASS' : 'INFO', message: `Found ${vipBaccarats.length} VIP Baccarat tables` });
      } catch (err) { results.push({ name: 'VIP Check', status: 'FAIL', error: err.message }); }

      // Test 5: Check for game show features
      try {
        const allTables = await apiService.get('/api/live-games/tables');
        const gameShows = (allTables?.tables || []).filter(t => t.gameType === 'game-show');
        results.push({ name: 'Game Shows', status: gameShows.length > 0 ? 'PASS' : 'INFO', message: `Found ${gameShows.length} Game Show tables` });
      } catch (err) { results.push({ name: 'Game Shows Check', status: 'FAIL', error: err.message }); }

    } catch (err) {
      results.push({ name: 'General Test', status: 'ERROR', error: err.message });
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <div className="provider-test">
      <header>
        <h1>Provider Features Test</h1>
        <p>Testing live casino provider-specific features</p>
      </header>

      <main>
        <button onClick={runTests} disabled={loading} className="btn-primary">
          {loading ? 'Running Tests...' : 'Run All Tests'}
        </button>

        {testResults.length > 0 && (
          <div className="results">
            <h2>Test Results</h2>
            {testResults.map((result, i) => (
              <div key={i} className={`result-item ${result.status.toLowerCase()}`}>
                <div className="result-header">
                  <span className={`status-badge ${result.status.toLowerCase()}`}>{result.status}</span>
                  <h3>{result.name}</h3>
                </div>
                {result.message && <p className="message">{result.message}</p>}
                {result.error && <p className="error">{result.error}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ProviderFeaturesTest;


