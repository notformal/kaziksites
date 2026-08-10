// ═══════════════════════════════════════════════════════════
// CASINO BROWSER — Live Casino table browser with API integration (minimal)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiService } from '../../services/api.js';

function CasinoBrowser({ onTableSelect }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    setLoading(true); setError(null);
    try {
      let data;
      try {
        data = await apiService.get('/api/games');
        if (data && data.games) setGames(data.games);
        else if (Array.isArray(data)) setGames(data);
      } catch (e) { console.warn('API not available:', e.message); setGames([]); }
    } catch (err) { setError(err.message || 'Failed to load games'); }
    finally { setLoading(false); }
  };

  const providers = [...new Set(games.map(g => g.provider))];
  
  const filteredGames = games.filter(game => {
    const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = !selectedProvider || game.provider === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  if (loading) return <div className="casino-browser loading"><Loader2 size={48} /><p>Loading...</p></div>;
  if (error) return <div className="casino-browser error"><p>{error}</p><button onClick={loadGames}>Retry</button></div>;

  return (
    <div className="casino-browser">
      <header className="browser-header">
        <h1>Live Casino</h1>
        <input type="text" placeholder="Search games..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <div>{providers.map(p => (
          <button key={p} className={`filter-btn ${selectedProvider === p ? 'active' : ''}`} onClick={() => setSelectedProvider(selectedProvider === p ? null : p)}>{p}</button>
        ))}</div>
      </header>

      <main className="browser-main">
        {filteredGames.map(game => (
          <button key={game.id} className="game-card" onClick={() => onTableSelect?.(game)}>
            <span className="provider">{game.provider}</span>
            <h3>{game.name}</h3>
            <p>{game.description || game.type}</p>
          </button>
        ))}
      </main>
    </div>
  );
}

export default CasinoBrowser;


