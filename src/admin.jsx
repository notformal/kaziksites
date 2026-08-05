import React,{useState,useEffect,useCallback,useMemo} from 'react';
import{createRoot}from'react-dom/client';
import{ShieldCheck,Users,Gamepad2,Clock,Wallet,Scroll,TrendingUp,Search,Plus,X,Check,ChevronLeft,ChevronRight,Edit3,Power,PowerOff,RefreshCw,AlertCircle,BarChart3,Activity,UserCheck,LogOut}from'lucide-react';
import'./admin.css';

const API_BASE=import.meta.env.VITE_API_URL||'http://127.0.0.1:8787/api';

// ─── Pagination Component ──────────────────────────────────────
function Pagination({page,limit,total,pages,onPageChange,onLimitChange}){
  const pagesArr=useMemo(()=>{
    const arr=[];
    const start=Math.max(1,page-2);
    const end=Math.min(pages,page+2);
    for(let i=start;i<=end;i++) arr.push(i);
    return arr;
  },[page,pages]);
  
  if(total<=limit||pages<=1) return null;
  
  return(
    <div className="pagination">
      <div className="pagination-info">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</div>
      <div className="pagination-controls">
        <button className="pagination-btn" disabled={page<=1} onClick={()=>onPageChange(page-1)}><ChevronLeft size={16}/></button>
        {pagesArr.map(p=><button key={p} className={`pagination-btn ${p===page?'active':''}`} onClick={()=>onPageChange(p)}>{p}</button>)}
        <button className="pagination-btn" disabled={page>=pages} onClick={()=>onPageChange(page+1)}><ChevronRight size={16}/></button>
      </div>
    </div>
  );
}

// ─── Toast Container ──────────────────────────────────────────
function ToastContainer({toasts}){
  return(
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type==='success'?<Check size={18}/>:t.type==='error'?<AlertCircle size={18}/>:<AlertCircle size={18}/>}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────
function LoadingSpinner(){
  return(
    <div className="loading-overlay">
      <div className="spinner"/>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────
function AdminDashboard(){
  const[page,setPage]=useState('dashboard');
  const[data,setData]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[sidebarOpen,setSidebarOpen]=useState(false);
  
  // Pagination & filter states
  const[p,setP]=useState(1);
  const[pl,setPl]=useState(20);
  const[sq,setSq]=useState('');
  const[kq,setKq]=useState('');
  const[uq,setUq]=useState('');
  const[gq,setGq]=useState('');
  const[uq2,setUq2]=useState('');
  
  // Modal state
  const[modalOpen,setModalOpen]=useState(false);
  const[editingGame,setEditingGame]=useState(null);
  const[editForm,setEditForm]=useState({});
  
  // ─── Toast notifications ──────────────────────────────────
  const toast=useCallback((msg,type='success')=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500);
  },[]);
  
  // ─── API helper ───────────────────────────────────────────
  const adminApi=useCallback(async(path,options={})=>{
    const token=sessionStorage.getItem('casino_session');
    if(!token) throw new Error('No session — please login first');
    const r=await fetch(`${API_BASE}/api/admin${path}`,{
      ...options,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,...options.headers}
    });
    if(!r.ok){
      const body=await r.json().catch(()=>({error:'request_failed'}));
      throw new Error(body.error||`http_${r.status}`);
    }
    return r.json();
  },[]);
  
  // ─── Data fetching ────────────────────────────────────────
  const fetchData=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      let result;
      const params=new URLSearchParams();
      if(['users','sessions','wallet','history','audit'].includes(page)){
        params.set('page',p);
        params.set('limit',pl);
      }
      if(page==='users'&&sq) params.set('search',sq);
      if(page==='wallet'){
        if(kq) params.set('kind',kq);
        if(uq) params.set('userId',uq);
      }
      if(page==='history'){
        if(gq) params.set('gameId',gq);
        if(uq2) params.set('userId',uq2);
      }
      
      const qs=params.toString();
      const path=qs?`/${page}${qs?'?'+qs:''}`:`/${page}`;
      
      switch(page){
        case 'dashboard': result=await adminApi('/dashboard'); break;
        case 'users': result=await adminApi(path); break;
        case 'games': result=await adminApi('/games'); break;
        case 'sessions': result=await adminApi(path); break;
        case 'wallet': result=await adminApi(path); break;
        case 'history': result=await adminApi(path); break;
        case 'audit': result=await adminApi(path); break;
        case 'trends': result=await adminApi('/stats/trends'); break;
        default: result=null;
      }
      setData(result);
    }catch(e){setError(e.message);setData(null);}
    finally{setLoading(false);}
  },[page,p,pl,sq,kq,uq,gq,uq2,adminApi]);
  
  useEffect(()=>{fetchData();},[fetchData]);
  
  // ─── Sidebar navigation ───────────────────────────────────
  const navItems=[
    {id:'dashboard',label:'Dashboard',icon:<BarChart3 size={18}/>,section:'overview'},
    {id:'users',label:'Users',icon:<Users size={18}/>,section:'management'},
    {id:'games',label:'Games',icon:<Gamepad2 size={18}/>,section:'management'},
    {id:'sessions',label:'Sessions',icon:<Clock size={18}/>,section:'monitoring'},
    {id:'wallet',label:'Wallet',icon:<Wallet size={18}/>,section:'monitoring'},
    {id:'history',label:'Game History',icon:<Scroll size={18}/>,section:'monitoring'},
    {id:'trends',label:'Trends',icon:<TrendingUp size={18}/>,section:'analytics'},
    {id:'audit',label:'Audit Log',icon:<LogOut size={18}/>,section:'analytics'},
  ];
  
  const navSections=useMemo(()=>{
    const sections={};
    navItems.forEach(n=>{
      if(!sections[n.section]) sections[n.section]=[];
      sections[n.section].push(n);
    });
    return sections;
  },[]);
  
  // ─── Render page content ──────────────────────────────────
  const renderPage=()=>{
    switch(page){
      case 'dashboard': return renderDashboard();
      case 'users': return renderUsers();
      case 'games': return renderGames();
      case 'sessions': return renderSessions();
      case 'wallet': return renderWallet();
      case 'history': return renderHistory();
      case 'trends': return renderTrends();
      case 'audit': return renderAudit();
      default: return <div>Unknown page</div>;
    }
  };
  
  // ─── Dashboard ────────────────────────────────────────────
  const renderDashboard=()=>{
    if(!data) return null;
    const{users,wallet:ws,games:gs,sessions,topGames}=data;
    return(<>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Users</span>
            <div className="stat-card-icon purple"><Users size={20}/></div>
          </div>
          <div className="stat-card-value">{users.totalUsers.toLocaleString()}</div>
          <div className="stat-card-change positive">+{users.newUsers7d} this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Active Sessions</span>
            <div className="stat-card-icon green"><Clock size={20}/></div>
          </div>
          <div className="stat-card-value">{sessions.activeSessions}</div>
          <div className="stat-card-change">{sessions.activeUsers} players online</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Rounds</span>
            <div className="stat-card-icon yellow"><Gamepad2 size={20}/></div>
          </div>
          <div className="stat-card-value">{gs.totalRounds.toLocaleString()}</div>
          <div className="stat-card-change">{gs.activeUsers} active players</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">House Edge</span>
            <div className="stat-card-icon red"><Activity size={20}/></div>
          </div>
          <div className="stat-card-value">${gs.houseEdge.toLocaleString()}</div>
          <div className="stat-card-change">RTP: {gs.rtp}</div>
        </div>
      </div>
      
      <div className="chart-container">
        <h3>Top Games by Volume</h3>
        {topGames&&topGames.length>0?(
          <div className="chart-placeholder">
            {topGames.slice(0,10).map((g,i)=>(
              <div key={i} className="chart-bar" style={{height:`${Math.max(4,(g.totalBet/(topGames[0].totalBet||1))*100)}%`}}>
                <div className="tooltip">{g.game_id}: ${(g.totalBet/100).toFixed(0)}</div>
              </div>
            ))}
          </div>
        ):(
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No data yet</h3>
            <p>Game activity will appear here once players start playing.</p>
          </div>
        )}
      </div>
      
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Wallet Overview</h3>
        </div>
        <div style={{padding:'24px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'20px'}}>
          <div>
            <div className="game-config-meta-label">Total Deposits</div>
            <div className="game-config-meta-value" style={{color:'var(--admin-success)'}}>${ws.totalDepositsDollars.toLocaleString()}</div>
          </div>
          <div>
            <div className="game-config-meta-label">Total Withdrawals</div>
            <div className="game-config-meta-value" style={{color:'var(--admin-danger)'}}>${ws.totalWithdrawalsDollars.toLocaleString()}</div>
          </div>
          <div>
            <div className="game-config-meta-label">Transactions</div>
            <div className="game-config-meta-value">{ws.totalTransactions.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </>);
  };
  
  // ─── Users page ───────────────────────────────────────────
  const renderUsers=()=>{
    if(!data) return null;
    const{data:usersList,pagination}=data;
    return(<>
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>User Management</h3>
          <div className="data-table-search">
            <Search size={14} style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',color:'var(--admin-text-muted)'}}/>
            <input type="text" placeholder="Search users..." value={sq} onChange={e=>{setSq(e.target.value);setP(1)}} style={{paddingLeft:'36px'}} />
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Games Played</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u=>(
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{u.display_name?.[0]?.toUpperCase()||'U'}</div>
                    <div>
                      <div className="user-name">{u.display_name}</div>
                      <div className="user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge ${u.role==='admin'?'badge-warning':'badge-neutral'}`}>{u.role}</span></td>
                <td>${(u.balanceDollars||0).toFixed(2)}</td>
                <td>{u.totalGames||0}</td>
                <td>{u.lastPlayed?new Date(u.lastPlayed).toLocaleDateString():'Never'}</td>
                <td>
                  <button className="btn btn-sm btn-secondary" onClick={async()=>{
                    try{
                      const newRole=u.role==='admin'?'player':'admin';
                      await adminApi(`/users/${u.id}/role`,{method:'PUT',body:JSON.stringify({role:newRole})});
                      toast(`User role updated to ${newRole}`);
                      fetchData();
                    }catch(e){toast(e.message,'error')}
                  }}>
                    {u.role==='admin'?'Demote':'Promote'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={setP} onLimitChange={setPl} />
      </div>
    </>);
  };
  
  // ─── Games page ───────────────────────────────────────────
  const renderGames=()=>{
    if(!data) return null;
    const{data:gamesList}=data;
    return(<>
      <div className="games-grid">
        {gamesList.map(g=>(
          <div key={g.game_id} className="game-config-card">
            <div className="game-config-card-header">
              <span className="game-config-card-title">{g.name}</span>
              <label className="toggle" title={g.is_active===1?'Game is active':'Game is disabled'}>
                <input type="checkbox" defaultChecked={g.is_active===1} onChange={async(e)=>{
                  try{await adminApi(`/games/${g.game_id}`,{method:'PUT',body:JSON.stringify({isActive:e.target.checked})});toast('Game updated')}catch(err){toast(err.message,'error')}
                }} />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="game-config-card-meta">
              <div className="game-config-meta-item">
                <div className="game-config-meta-label">RTP</div>
                <div className="game-config-meta-value">{g.rtpPercent}</div>
              </div>
              <div className="game-config-meta-item">
                <div className="game-config-meta-label">Volatility</div>
                <div className="game-config-meta-value">
                  <span className={`badge ${g.volatility==='high'?'badge-danger':g.volatility==='medium'?'badge-warning':'badge-success'}`}>{g.volatility}</span>
                </div>
              </div>
              <div className="game-config-meta-item">
                <div className="game-config-meta-label">Total Rounds</div>
                <div className="game-config-meta-value">{g.totalRounds||0}</div>
              </div>
              <div className="game-config-meta-item">
                <div className="game-config-meta-label">Active Players</div>
                <div className="game-config-meta-value">{g.activePlayers||0}</div>
              </div>
            </div>
            <div className="game-config-card-actions">
              <button className="btn btn-sm btn-secondary" onClick={()=>{setEditingGame(g);setEditForm({rtp:g.rtp,volatility:g.volatility,minBet:g.min_bet,maxBet:g.max_bet});setModalOpen(true)}}>
                <Edit3 size={14}/> Edit Config
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Game Config Modal */}
      {modalOpen&&editingGame&&(
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit: {editingGame.name}</h3>
              <button className="btn btn-icon btn-secondary" onClick={()=>setModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">RTP (0.90 - 0.99)</label>
                  <input className="form-input" type="number" step="0.01" min="0.90" max="0.99" value={editForm.rtp} onChange={e=>setEditForm(f=>({...f,rtp:parseFloat(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Volatility</label>
                  <select className="form-select" value={editForm.volatility} onChange={e=>setEditForm(f=>({...f,volatility:e.target.value}))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Min Bet (cents)</label>
                  <input className="form-input" type="number" value={editForm.minBet} onChange={e=>setEditForm(f=>({...f,minBet:parseInt(e.target.value)}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Bet (cents)</label>
                  <input className="form-input" type="number" value={editForm.maxBet} onChange={e=>setEditForm(f=>({...f,maxBet:parseInt(e.target.value)}))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async()=>{
                try{
                  await adminApi(`/games/${editingGame.game_id}`,{method:'PUT',body:JSON.stringify(editForm)});
                  toast('Game configuration updated');
                  setModalOpen(false);
                  fetchData();
                }catch(e){toast(e.message,'error')}
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>);
  };
  
  // ─── Sessions page ────────────────────────────────────────
  const renderSessions=()=>{
    if(!data) return null;
    const{data:sessionsList,pagination}=data;
    return(<>
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Active Game Sessions</h3>
          <button className="btn btn-sm btn-secondary" onClick={fetchData}><RefreshCw size={14}/> Refresh</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Game</th>
              <th>Balance Before</th>
              <th>Rounds Played</th>
              <th>Created</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {sessionsList.map(s=>(
              <tr key={s.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{s.display_name?.[0]?.toUpperCase()||'U'}</div>
                    <div>
                      <div className="user-name">{s.display_name}</div>
                      <div className="user-email">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-neutral">{s.game_id}</span></td>
                <td>${s.balanceBeforeDollars.toFixed(2)}</td>
                <td>{s.roundsPlayed||0}</td>
                <td>{new Date(s.created_at*1000).toLocaleString()}</td>
                <td>{new Date(s.expires_at*1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={setP} onLimitChange={setPl} />
      </div>
    </>);
  };
  
  // ─── Wallet page ──────────────────────────────────────────
  const renderWallet=()=>{
    if(!data) return null;
    const{data:ledger,pagination}=data;
    return(<>
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Wallet Ledger</h3>
          <div style={{display:'flex',gap:'8px'}}>
            <select className="form-select" style={{width:'auto'}} value={kq} onChange={e=>{setKq(e.target.value);setP(1)}}>
              <option value="">All Types</option>
              <option value="bet">Bets</option>
              <option value="win">Wins</option>
              <option value="welcome">Welcome Bonus</option>
              <option value="daily_reward">Daily Reward</option>
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map(l=>(
              <tr key={l.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{l.display_name?.[0]?.toUpperCase()||'U'}</div>
                    <div>
                      <div className="user-name">{l.display_name}</div>
                      <div className="user-email">{l.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className={`badge ${l.kind==='win'?'badge-success':l.kind==='bet'?'badge-danger':'badge-neutral'}`}>{l.kind.replace('_',' ')}</span></td>
                <td style={{color:l.amount>0?'var(--admin-success)':'var(--admin-danger)',fontWeight:600}}>
                  {l.amount>0?'+':''}${(l.amountDollars).toFixed(2)}
                </td>
                <td>{new Date(l.created_at+'Z').toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={setP} onLimitChange={setPl} />
      </div>
    </>);
  };
  
  // ─── History page ─────────────────────────────────────────
  const renderHistory=()=>{
    if(!data) return null;
    const{data:historyList,pagination}=data;
    return(<>
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Game History</h3>
          <div style={{display:'flex',gap:'8px'}}>
            <select className="form-select" style={{width:'auto'}} value={gq} onChange={e=>{setGq(e.target.value);setP(1)}}>
              <option value="">All Games</option>
              {data.gamesList&&data.gamesList.map(g=><option key={g.game_id} value={g.game_id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Game</th>
              <th>Bet</th>
              <th>Win</th>
              <th>Multiplier</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {historyList.map(h=>(
              <tr key={h.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{h.display_name?.[0]?.toUpperCase()||'U'}</div>
                    <div>
                      <div className="user-name">{h.display_name}</div>
                      <div className="user-email">{h.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-neutral">{h.game_id}</span></td>
                <td>${(h.betDollars).toFixed(2)}</td>
                <td style={{color:'var(--admin-success)',fontWeight:600}}>${(h.winDollars).toFixed(2)}</td>
                <td><span className={`badge ${h.multiplier>=5?'badge-danger':h.multiplier>=2?'badge-warning':'badge-neutral'}`}>{h.multiplier.toFixed(2)}x</span></td>
                <td>{new Date(h.created_at*1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={setP} onLimitChange={setPl} />
      </div>
    </>);
  };
  
  // ─── Trends page ──────────────────────────────────────────
  const renderTrends=()=>{
    if(!data) return null;
    const{dailyStats,gameDailyStats,userRegistrations}=data;
    return(<>
      <div className="chart-container">
        <h3>Daily Transactions (30 days)</h3>
        {dailyStats&&dailyStats.length>0?(
          <div className="chart-placeholder">
            {dailyStats.slice(-14).map((d,i)=>(
              <div key={i} className="chart-bar" style={{height:`${Math.max(4,(d.transactions/(dailyStats[dailyStats.length-1].transactions||1))*100)}%`}}>
                <div className="tooltip">{d.day}: {d.transactions} txns</div>
              </div>
            ))}
          </div>
        ):(
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <h3>No trend data yet</h3>
            <p>Trends will appear once there is transaction activity.</p>
          </div>
        )}
      </div>
      
      <div className="chart-container">
        <h3>Daily Game Activity (30 days)</h3>
        {gameDailyStats&&gameDailyStats.length>0?(
          <div className="chart-placeholder">
            {gameDailyStats.slice(-14).map((g,i)=>(
              <div key={i} className="chart-bar" style={{height:`${Math.max(4,(g.rounds/(gameDailyStats[gameDailyStats.length-1].rounds||1))*100)}%`}}>
                <div className="tooltip">{g.day}: {g.rounds} rounds</div>
              </div>
            ))}
          </div>
        ):(
          <div className="empty-state">
            <div className="empty-state-icon">🎰</div>
            <h3>No game activity yet</h3>
          </div>
        )}
      </div>
      
      <div className="data-table-wrapper">
        <div className="data-table-header"><h3>User Registrations (Last 14 Days)</h3></div>
        <table className="data-table">
          <thead><tr><th>Date</th><th>New Users</th></tr></thead>
          <tbody>
            {(userRegistrations||[]).slice(-14).reverse().map(r=>(
              <tr key={r.day}>
                <td>{r.day}</td>
                <td>{r.newUsers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>);
  };
  
  // ─── Audit Log page ───────────────────────────────────────
  const renderAudit=()=>{
    if(!data) return null;
    const{data:logs,pagination}=data;
    return(<>
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3>Admin Audit Log</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Admin</th>
              <th>Action</th>
              <th>Type</th>
              <th>Details</th>
              <th>IP</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l=>(
              <tr key={l.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{l.admin_name?.[0]?.toUpperCase()||'A'}</div>
                    <div>
                      <div className="user-name">{l.admin_name}</div>
                      <div className="user-email">{l.admin_email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-neutral">{l.action}</span></td>
                <td>{l.target_type||'—'}</td>
                <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.details?'📋 '+JSON.parse(l.details):'—'}</td>
                <td style={{fontSize:12,color:'var(--admin-text-muted)'}}>{l.ip_address}</td>
                <td>{new Date(l.created_at*1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={setP} onLimitChange={setPl} />
      </div>
    </>);
  };
  
  // ─── Main render ──────────────────────────────────────────
  return(
    <div className="admin-layout">
      <ToastContainer toasts={toasts}/>
      
      {/* Mobile toggle */}
      <button className="admin-mobile-toggle" onClick={()=>setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen?<X size={24}/>:<Users size={24}/>}
      </button>
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen?'open':''}`}>
        <div className="admin-sidebar-header">
          <h1>
            <span className="icon"><ShieldCheck size={18}/></span>
            Admin Panel
          </h1>
        </div>
        
        <nav className="admin-nav">
          {Object.entries(navSections).map(([key,items])=>(
            <div key={key} className="admin-nav-section">
              <div className="admin-nav-section-title">{key}</div>
              {items.map(item=>(
                <button key={item.id} className={`admin-nav-item ${page===item.id?'active':''}`} onClick={()=>{setPage(item.id);setSidebarOpen(false)}}>
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-avatar"><UserCheck size={16}/></div>
            <div className="admin-user-details">
              <div className="admin-user-name">Administrator</div>
              <div className="admin-user-role">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="admin-main">
        <header className="admin-header">
          <h2>{navItems.find(n=>n.id===page)?.label||'Dashboard'}</h2>
          <div className="admin-header-actions">
            {page!=='dashboard'&&page!=='trends'&&page!=='audit'&&(
              <button className="btn btn-sm btn-secondary" onClick={fetchData}><RefreshCw size={14}/> Refresh</button>
            )}
            <button className="btn btn-sm btn-danger" onClick={()=>{sessionStorage.removeItem('casino_session');window.location.hash='#';window.location.reload()}}>
              <LogOut size={14}/> Logout
            </button>
          </div>
        </header>
        
        <main className="admin-content">
          {loading&&<LoadingSpinner/>}
          {error&&!(data)&&(
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <h3>Error Loading Data</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchData} style={{marginTop:'16px'}}>Retry</button>
            </div>
          )}
          {!loading&&!error&&renderPage()}
        </main>
      </div>
    </div>
  );
}

// Mount
createRoot(document.getElementById('admin-root')).render(<AdminDashboard/>);