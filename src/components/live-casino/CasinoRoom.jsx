// ═══════════════════════════════════════════════════════════
// CASINO ROOM — Full-screen room with real-time polling (Step 3.4.3)
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import { apiService } from '../../services/api.js';
import useTablePolling from '../../hooks/useTablePolling.js';

function CasinoRoom({ tableId, onBack, balance = 10000, onBalanceChange }) {
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [betAmount, setBetAmount] = useState(100);

  // Use polling hook for real-time updates (8 second interval)
  const { currentRound, history, loading: pollLoading } = useTablePolling(tableId, 8000);

  // Load initial table data on mount
  React.useEffect(() => { loadTableData(); }, []);

  const loadTableData = async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiService.get(`/api/live-games/tables/${tableId}`);
      setTableData(data?.table || data);
    } catch (err) { console.error('Failed to load table:', err.message); }
    finally { setLoading(false); }
  };

  const handlePlaceBet = async () => {
    try {
      await apiService.post(`/api/live-games/tables/${tableId}/start`, { amount: betAmount });
      onBalanceChange?.(balance - betAmount);
      // Polling will refresh automatically after 8s delay
    } catch (err) { setError(err.message || 'Failed to place bet'); }
  };

  if (loading) return <div className="casino-room loading"><Clock size={48} /><p>Loading table...</p></div>;
  if (error) return <div className="casino-room error"><p>{error}</p><button onClick={() => window.location.reload()}>Reload</button></div>;

  return (
    <div className="casino-room">
      <header className="room-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={20} /> Back to Tables</button>
        <h1>{tableData?.name || 'Live Casino Table'}</h1>
        <div className="room-info">
          <span><Users size={16} /> {tableData?.playersCount || 0} players</span>
          <span><Clock size={16} /> Round #{history.length > 0 ? history[0].roundNumber : 'N/A'}</span>
        </div>
      </header>

      <main className="room-main">
        {/* Dealer Info */}
        {tableData?.dealer && (
          <div className="dealer-info">
            <div className="dealer-avatar">{tableData.dealer.avatar || '🎰'}</div>
            <div className="dealer-details">
              <h3>{tableData.dealer.name}</h3>
              <p>Experience: {tableData.dealer.experience} years</p>
              <span className="language">{tableData.dealer.language || 'EN'}</span>
            </div>
          </div>
        )}

        {/* Current Round Display (from polling) */}
        {currentRound && (
          <div className={`current-round ${currentRound.result === 'win' ? 'won' : currentRound.result === 'lose' ? 'lost' : ''}`}>
            <h2>Current Round</h2>
            <div className="round-result">
              <span className="result-type">{currentRound.result?.toUpperCase()}</span>
              {currentRound.multiplier && <span className="multiplier">x{currentRound.multiplier}</span>}
            </div>
          </div>
        )}

        {/* Recent History (from polling) */}
        {history.length > 0 && (
          <div className="history-panel">
            <h3>Recent Rounds</h3>
            <div className="history-list">
              {history.slice(0, 5).map((round, i) => (
                <div key={i} className={`history-item ${round.result === 'win' ? 'won' : round.result === 'lose' ? 'lost' : ''}`}>
                  Round #{round.roundNumber || i + 1}: {round.multiplier ? `x${round.multiplier}` : round.result}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bet Placement */}
        <div className="bet-panel">
          <h3>Place Your Bet</h3>
          <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} min="10" step="50" />
          <button 
            className={`btn ${tableData?.status === 'dealing' ? 'disabled' : ''}`} 
            onClick={handlePlaceBet} 
            disabled={tableData?.status === 'dealing'}
          >
            {tableData?.status === 'dealing' ? 'Round in Progress...' : `Place Bet (${betAmount.toLocaleString()} coins)`}
          </button>
        </div>

        {/* Table Status */}
        <div className="table-status">
          <span>Status: {tableData?.status || 'Waiting'}</span>
          <span>Bet Range: {tableData?.minBet || 50} - {tableData?.maxBet || 100000} coins</span>
        </div>

        {/* Polling Status */}
        {!pollLoading && (
          <div className="polling-status">
            <small>Auto-refresh every 8 seconds</small>
          </div>
        )}
      </main>
    </div>
  );
}

export default CasinoRoom;


