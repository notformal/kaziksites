// BETBY SPORTS - Full Sports Betting Platform UI
import React, { useState, useEffect, useCallback } from 'react';
import {
  SoccerBall, Basketball, Tennis, HockeyPuck,
  DollarSign, MinusCircle, XCircle, ArrowRightLeft, BarChart3, Clock, AlertTriangle
} from 'lucide-react';

const SPORT_ICONS = { football: SoccerBall, basketball: Basketball, tennis: Tennis, hockey: HockeyPuck };
const CHIP_VALUES = [10, 50, 100, 250, 500, 1000];
function fmtOdds(o) { return o ? o.toFixed(2) : "\u2014"; }`nfunction fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr), now = new Date();
  const diffMin = Math.round((d - now) / 60000);
  if (diffMin < 0) return 'LIVE';
  if (diffMin < 1440) return Math.floor(diffMin/60)+'h '+((diffMin%60))+'m';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
} 

function BetBySports({ balance = 10000, onBalanceChange }) {
  const [balanceState, setBalance] = useState(balance);
  const [activeSport, setActiveSport] = useState('football');
  const [events, setEvents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [selectedOdds, setSelectedOdds] = useState({});
  const [betSlip, setBetSlip] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [betAmount, setBetAmount] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = useCallback(async (sport, status='upcoming') => {
    try { setLoading(true); setError(null);
      const data = await apiFetch('/api/sports/events?sport='+sport+'&status='+status);
      if (status === 'live') setLiveEvents(data.events || []);
      else setEvents(prev => { const merged=[...data.events]; prev.forEach(p=>{if(!merged.find(m=>m.id===p.id))merged.push(p)}); return merged; });
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  const loadSlip = useCallback(async () => {
    try {
      const [slipData, betsData] = await Promise.all([apiFetch('/api/sports/bets/slip'), apiFetch('/api/sports/bets/user')]);
      if (slipData.selections) setBetSlip(slipData.selections); setUserBets(betsData.bets || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    loadEvents(activeSport, 'upcoming'); loadEvents('football', 'live').catch(()=>{}); loadSlip();
  }, [activeSport]);
  useEffect(() => {
    const iv = setInterval(async () => { try { const d=await apiFetch('/api/sports/live'); setLiveEvents(d.events||[]); } catch{} }, 3000);
    return () => clearInterval(iv);
  }, []);

  const addToSlip = useCallback(async (eventId, market, selection, odds) => {
    try { await apiFetch('/api/sports/bets/slip', { method: 'POST', body: JSON.stringify({ eventId, market, selection, odds }) });
      setSelectedOdds(prev=>({...prev,[${eventId}-]:{selection,odds}})); await loadSlip();
    } catch(e){setError(e.message);}
  }, [loadSlip]);

  const removeFromSlip = useCallback(async (index) => {
    try { await apiFetch('/api/sports/bets/slip', { method: 'DELETE' });
      setSelectedOdds(prev=>{const n={...prev};delete n['_slip_'+index];return n}); await loadSlip();
    } catch(e){setError(e.message);}
  }, [loadSlip]);

  const clearAllBets = useCallback(async () => {
    try { await apiFetch('/api/sports/bets/slip', { method: 'DELETE' }); setSelectedOdds({}); setBetSlip([]); await loadSlip(); }
    catch(e){setError(e.message);}
  }, [loadSlip]);

  const placeBet = useCallback(async () => {
    if (betSlip.length===0||betAmount<10) return;
    try { await apiFetch('/api/sports/bets/submit', { method: 'POST', body: JSON.stringify({ amountCents: betAmount*100 }) });
      setBalance(b=>b-betAmount); if(onBalanceChange) onBalanceChange(balanceState-betAmount); setSelectedOdds({}); await loadSlip(); }
    catch(e){setError(e.message);}
  }, [betSlip,betAmount,balanceState,onBalanceChange,loadSlip]);

  const cashOut = useCallback(async (betId, currentOdds) => {
    try { const data=await apiFetch('/api/sports/bets/'+betId+'/cashout', { method: 'POST', body: JSON.stringify({ currentOdds }) });
      if(data.cashoutValue){setBalance(b=>b+data.cashoutValue);if(onBalanceChange)onBalanceChange(balanceState+data.cashoutValue);await loadSlip();} }
    catch(e){setError(e.message);}
  }, [balanceState,onBalanceChange,loadSlip]);

  const combinedOdds = betSlip.reduce((acc,s)=>acc*(s.odds||1),1);
  const potentialWin = (betAmount*combinedOdds).toFixed(2);

  return (
    <div className="min-h-screen bg-[#07071a] text-white font-sans">
      <header className="bg-[#0d0d2b]/95 backdrop-blur border-b border-white/6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: '#fbbf24' }}>&#9889; BetBy Sports</h1>
          <div className="flex items-center gap-3 text-sm"><span className="text-slate-400">Balance:</span><span className="font-bold text-green-400">{balanceState.toFixed(2)}</span></div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {[
            { id: 'football', label: 'Football', icon: SoccerBall, color: '#22c55e' },
            { id: 'basketball', label: 'Basketball', icon: Basketball, color: '#f97316' },
            { id: 'tennis', label: 'Tennis', icon: Tennis, color: '#eab308' },
            { id: 'hockey', label: 'Hockey', icon: HockeyPuck, color: '#3b82f6' },
          ].map(sp => (
            <button key={sp.id} onClick={() => { setActiveSport(sp.id); loadEvents(sp.id, 'upcoming'); }}
              className={lex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all }
              style={activeSport===sp.id?{backgroundColor:sp.color+'22',borderColor:sp.color,border:'1px solid '+sp.color}:{}}>
              <sp.icon size={16} />{sp.label}
              {sp.id==='football'&&liveEvents.length>0&&(<span className="flex items-center gap-1 ml-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-xs text-green-400">{liveEvents.length}</span></span>)} 
            </button>))}
        </nav>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4 flex gap-4">
        <main className="flex-1 min-w-0">
          {error && (<div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 text-sm"><AlertTriangle size={16} />{error}</div>)} 
          <section className="mb-6">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock size={18} className="text-slate-400"/>Upcoming Matches</h2>
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">{[...Array(4)].map((_,i)=>(<div key={i} className="animate-pulse h-40 bg-white/5 rounded-xl"/>))}</div>) : events.length===0 ? (
              <div className="text-center py-12 text-slate-500">No matches available</div>) : (
              <div className="grid gap-3 md:grid-cols-2">{events.map(event => (
                <EventCard key={event.id} event={event} sportIcon={SPORT_ICONS[event.sport]||BarChart3} leagueColor={LEAGUE_COLORS[event.leagueId]} leagueName={LEAGUE_NAMES[event.leagueId]} timeStr={fmtTime(event.startTime)} isSelected={!!selectedOdds[${event.id}-moneyline]} selectedSelection={selectedOdds[${event.id}-moneyline]?.selection} onToggleOdd={(m,s,o)=>addToSlip(event.id,m,s,o)}/>))}</div>
            )}
          </section>
          {liveEvents.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"/>Live Now &mdash; {liveEvents.length} events</h2>
              <div className="grid gap-3 md:grid-cols-2">{liveEvents.map(event => (
                <EventCard key={event.id} event={{...event,status:'live'}} sportIcon={SPORT_ICONS[event.sport]||BarChart3} leagueColor={LEAGUE_COLORS[event.leagueId]} leagueName={LEAGUE_NAMES[event.leagueId]} timeStr={'Live \u2022 '+((event.matchTime)||'')} isSelected={!!selectedOdds[${event.id}-moneyline]} selectedSelection={selectedOdds[${event.id}-moneyline]?.selection} onToggleOdd={(m,s,o)=>addToSlip(event.id,m,s,o)}/>))}</div>
            </section>)}
          {userBets.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><BarChart3 size={18} className="text-slate-400"/>My Bets ({userBets.length})</h2>
              <div className="bg-[#0d0d2b] rounded-xl border border-white/6 overflow-hidden">
                {userBets.slice(0, 10).map(bet => (
                  <div key={bet.id} className="px-4 py-3 border-b border-white/5 flex items-center justify-between last:border-0">
                    <div><div className="text-sm font-medium text-slate-200">{bet.selection}</div>
                      <div className="text-xs text-slate-500">{(bet.eventId||'').slice(0,8)} \u2022 {bet.market}</div></div>
                    <div className="text-right"><div className={ont-bold +(bet.status==='won'?'text-green-400':bet.status==='lost'?'text-red-400':bet.status==='cashed_out'?'text-yellow-400':'text-slate-300')}>
                      {bet.status==='won'&&'+$'+((bet.potentialWin||0).toFixed(2))}{bet.status==='lost'&&'- $'+((bet.stake||0).toFixed(2))}{(bet.status==='cashed_out'||bet.status==='pending')&&'$'+((bet.cashoutValue||bet.potentialWin||0).toFixed(2))}
                    </div><div className="text-xs text-slate-500">{fmtOdds(bet.odds)} @ {(bet.stake||0).toFixed(2)}</div></div>
                  </div>))}</div>
            </section>)}
        </main>

        <aside className="w-80 flex-shrink-0 hidden lg:block"><BetSlipPanel betSlip={betSlip} combinedOdds={combinedOdds} potentialWin={potentialWin} betAmount={betAmount} onBetAmountChange={setBetAmount} onRemove={removeFromSlip} onClearAll={clearAllBets} onPlaceBet={placeBet} onCashOut={cashOut} userBets={userBets}/></aside>
      </div>

      {betSlip.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0d0d2b]/98 backdrop-blur border-t border-white/6 p-3 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div><span className="text-sm text-slate-400">{betSlip.length} selections</span>
              <span className="ml-2 font-bold text-yellow-400">{fmtOdds(combinedOdds)}</span></div>
            <div className="flex items-center gap-2">
              <input type="number" value={betAmount} onChange={e=>setBetAmount(Math.max(1,parseInt(e.target.value)||0))}
                className="w-20 px-2 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center"/>
              <button onClick={placeBet} disabled={betSlip.length===0||betAmount<10}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-30 rounded-lg font-bold text-sm">Bet {potentialWin}</button>
            </div>
          </div>
        </div>)}
    </div>);
} 

// EVENT CARD component
function EventCard({ event, sportIcon: SportIcon, leagueColor, leagueName, timeStr, isSelected, selectedSelection, onToggleOdd }) {
  const isLive = event.status === 'live';
  const odds = event.odds || {};
  const moneyline = odds.moneyline || [];
\n  return (
    <article className={ounded-xl border transition-all hover:border-white/15 +(isSelected ? 'border-[#a855f7] bg-purple-500/5' : 'bg-[#0d0d2b]/60 border-white/6')}>
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: leagueColor }}>
          <SportIcon size={14} />{leagueName}
          {isLive && (<span className="ml-1 px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>LIVE</span>)} 
        </div>
        <span className={	ext-xs font-mono +(isLive?'text-yellow-400':'text-slate-500')}>{timeStr}</span>
      </div>
\n      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex-1 text-right pr-3">
          <span className={	ext-sm font-semibold +(isLive && event.score?.home>(event.score?.away||0)?'text-yellow-400':'')}>{event.homeTeam}</span>
          {isLive && event.score && (<div className="text-lg font-black text-white mt-0.5">{event.score.home}</div>)} 
        </div>
        <div className="px-2"><span className="text-xs text-slate-600 font-bold">VS</span></div>
        <div className="flex-1 pl-3">
          <span className={	ext-sm font-semibold +(isLive && event.score?.away>(event.score?.home||0)?'text-yellow-400':'')}>{event.awayTeam}</span>
          {isLive && event.score && (<div className="text-lg font-black text-white mt-0.5">{event.score.away}</div>)} 
        </div>
      </div>
\n      {isLive && event.stats && (
        <div className="px-4 pb-1 flex gap-3 text-[10px] text-slate-500">
          {event.stats.possessionHome!=null&&(<span>Poss: {Math.round(event.stats.possessionHome)}%</span>)} 
          {event.stats.shotsOnTargetHome!=null&&(<span>Shots: {event.stats.shotsOnTargetHome}-{event.stats.shotsOnTargetAway}</span>)} 
        </div>)}
\n      <div className="px-4 pb-3 pt-2">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: moneyline.length>0?'repeat('+moneyline.length+', 1fr)':'1fr' }}>
          {moneyline.map((o, i) => { const isSel = selectedSelection === o.name; return (
            <button key={i} onClick={() => onToggleOdd('moneyline', o.name, o.adjustedOdds)} 
              className={elative px-2 py-2 rounded-lg text-center transition-all +(isSel?'bg-purple-500/20 border border-[#a855f7] text-white':'bg-white/[0.03] border border-white/8 hover:bg-white/[0.06]')}>
              <div className="text-[10px] text-slate-500 uppercase font-medium">{o.name==='home'?'Home':o.name==='away'?'Away':o.name}</div>
              <div className={ont-bold text-sm mt-0.5 +(isSel?'text-purple-300':'text-yellow-400')}>{fmtOdds(o.adjustedOdds)}</div>
            </button>);})}
        </div>
        {odds.total && (
          <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns:'repeat(3, 1fr)' }}>
            {[{label:'Over '+odds.total.line,val:odds.total.over},{label:'Under '+odds.total.line,val:odds.total.under},...(odds.btts?[{label:'BTTS',val:Math.max(odds.btts.yes,odds.btts.no)}]:[])]
            .map((b, i) => { const isSel = selectedSelection===b.label; return (
              <button key={i} onClick={() => onToggleOdd(b.label==='BTTS'?'btts':'total_'+(b.label.startsWith('Over')?'over':'under'), b.label, b.val)} 
                className={px-2 py-1.5 rounded-lg text-center transition-all +(isSel?'bg-purple-500/20 border border-[#a855f7]':'bg-white/[0.03] border border-white/8 hover:bg-white/[0.06]')}>
                <div className="text-[10px] text-slate-500">{b.label}</div>
                <div className={ont-bold text-xs mt-0.5 +(isSel?'text-purple-300':'text-yellow-400')}>{fmtOdds(b.val)}</div>
              </button>);})}
          </div>)}
      </div>
    </article>);
} 

// BET SLIP PANEL component
function BetSlipPanel({ betSlip, combinedOdds, potentialWin, betAmount, onBetAmountChange, onRemove, onClearAll, onPlaceBet, onCashOut, userBets }) {
  return (
    <div className="sticky top-20 bg-[#0d0d2b] rounded-xl border border-white/6 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5" style={{ backgroundColor: '#0a0a22' }}>
        <h3 className="font-bold text-sm flex items-center gap-2"><DollarSign size={16} className="text-yellow-400"/>Bet Slip<span className="px-1.5 py-0.5 rounded-full bg-[#a855f7] text-white text-xs font-bold">{betSlip.length}</span></h3>
        {betSlip.length > 0 && (<button onClick={onClearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><XCircle size={12}/>Clear</button>)} 
      </div>
\n      <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
        {betSlip.length === 0 ? (<div className="py-8 text-center text-slate-500 text-sm">Select odds to add bets</div>) : betSlip.map((sel, i) => (
          <div key={sel.eventId+'-'+i} className="px-4 py-2.5 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0"><div className="text-xs text-slate-400 truncate">{(sel.eventId||'').slice(0,10)}...</div>
              <div className="font-medium text-sm text-white mt-0.5">{sel.selection} \u2014 <span className="text-yellow-400 font-bold">{fmtOdds(sel.odds)}</span></div></div>
            <button onClick={() => onRemove(i)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><MinusCircle size={16}/></button>
          </div>))}
      </div>
\n      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex gap-2 mb-2">{CHIP_VALUES.map(v => (
          <button key={v} onClick={() => onBetAmountChange(v)} 
            className={lex-1 py-1.5 rounded text-xs font-bold transition-all +(betAmount===v?'bg-yellow-400/20 text-yellow-400 border border-yellow-400':'bg-white/5 text-slate-400 hover:bg-white/10')}>
            {v>=1000?((v/1000).toFixed(0)+'K'):v}</button>))}</div>
        <input type="number" value={betAmount} onChange={e=>onBetAmountChange(Math.max(1,parseInt(e.target.value)||0))}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white text-center font-mono"/>
      </div>
\n      <div className="px-4 pb-2 space-y-1">
        <div className="flex justify-between text-xs text-slate-500"><span>Combined Odds</span><span className="text-yellow-400 font-bold">{fmtOdds(combinedOdds)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-slate-400">Potential Win</span><span className="font-bold text-green-400">{potentialWin}</span></div>
      </div>
\n      <button onClick={onPlaceBet} disabled={betSlip.length===0||betAmount<10}
        className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg font-bold text-sm transition-all mt-1">
        PLACE BET \u2014 {potentialWin}
      </button>
\n      {userBets.some(b => b.status === 'pending') && (
        <div className="px-4 py-3 border-t border-white/5 mt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><ArrowRightLeft size={12}/>Cash Out Available</h4>
          {userBets.filter(b => b.status === 'pending').slice(0, 3).map(bet => (
            <div key={bet.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
              <div className="text-xs text-slate-400 truncate">{(bet.selection||'').slice(0,20)}</div>
              <button onClick={() => onCashOut(bet.id, bet.odds)} 
                className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded text-xs font-bold transition-all">
                {(((bet.stake||0)*(bet.odds||1)*0.92)).toFixed(0)}
              </button>
            </div>))}
        </div>)}
\n      <div className="px-4 py-3 border-t border-white/5 bg-[#0a0a1a]">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div><div className="text-xs text-slate-500">Pending</div><div className="font-bold text-yellow-400">{userBets.filter(b=>b.status==='pending').length}</div></div>
          <div><div className="text-xs text-slate-500">Won</div><div className="font-bold text-green-400">{userBets.filter(b=>b.status==='won').length}</div></div>
        </div>
      </div>
    </div>);
} 


export default BetBySports;
