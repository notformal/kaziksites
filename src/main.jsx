import React,{useCallback,useEffect,useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import{Search,Menu,X,ChevronRight,Star,ShieldCheck,Gamepad2,Gift,UserRound,Volume2,VolumeX,Home,Heart,Globe,Sparkles,RotateCw as Wheel, Trophy,Crown}from'lucide-react';
import{useDialog}from'./useDialog';import{games,categories,getGameStats}from'./catalog';import{themes,getThemeForBrand}from'./themes';import{consent,setConsent,track}from'./analytics';import{api}from'./api';import AccountPanel from'./AccountPanel';import{LANGUAGES,t,getLang,setLang}from'./i18n';import'./styles.css';import'./game.css';import'./account.css';import'./mobile-nav.css';

// ─── Brand detection ──────────────────────────────────────
const brand=import.meta.env.VITE_BRAND||new URLSearchParams(location.search).get('brand')||'aurora';
const theme=themes[brand]||themes.aurora;
document.title=`${theme.name} — Social Casino`;

// ─── Particle Background Component ────────────────────────
function ParticleBackground(){
  const particles=useMemo(()=>{
    const count=theme.particleCount||20;
    return Array.from({length:count},(_,i)=>({
      id:i,
      left:Math.random()*100+'%',
      size:2+Math.random()*6+'px',
      duration:8+Math.random()*15+'s',
      delay:Math.random()*10+'s',
      opacity:0.08+Math.random()*0.12,
    }));
  },[theme.particleCount,theme.particleColor]);
  
  return <div className="particle-bg" aria-hidden="true">
    {particles.map(p=><div key={p.id} className="particle" style={{
      left:p.left,
      width:p.size,
      height:p.size,
      background:theme.particleColor||'var(--accent)',
      animationDuration:p.duration,
      animationDelay:p.delay,
      opacity:p.opacity,
    }}/>)}
  </div>;
}

// ─── i18n language switcher ───────────────────────────────
function LangSwitch(){
  const[langKey,setLangKey]=useState(getLang());
  const codes=LANGUAGES.map(l=>l.code);
  return <button className="iconBtn langBtn" aria-label="Switch language" title={t('account_language')} onClick={()=>{
    const idx=codes.indexOf(langKey);
    const next=codes[(idx+1)%codes.length];
    setLang(next);
    setLangKey(next);
  }}><Globe size={16}/> {(LANGUAGES.find(l=>l.code===langKey)||LANGUAGES[0]).flag}</button>;
}

// ─── Daily Spin Wheel Component ───────────────────────────
function DailySpinWheel({onClaim,hasClaimedToday}){
  const[spinning,setSpinning]=useState(false);
  const[rotation,setRotation]=useState(0);
  const[showResult,setShowResult]=useState(null);
  
  const multipliers=theme.dailyRewardMultiplier||1.2;
  const baseReward=250;
  const reward=Math.round(baseReward*multipliers);
  
  const handleSpin=()=>{
    if(spinning||hasClaimedToday)return;
    setSpinning(true);
    const extraRotation=720+Math.random()*360;
    const newRotation=rotation+extraRotation;
    setRotation(newRotation);
    
    setTimeout(()=>{
      setSpinning(false);
      setShowResult(reward);
      onClaim(reward);
      track('daily_spin_claim',{amount:reward,brand});
    },3000);
  };
  
  if(hasClaimedToday&&showResult)return(
    <div className="spinWheelModal">
      <div className="spinWheelContent">
        <Sparkles size={48} color={theme.accent}/>
        <h3>{t('toast_won')}</h3>
        <div className="spinResultAmount">+{showResult.toLocaleString()}</div>
        <small>{t('toast_saved')}</small>
      </div>
    </div>
  );
  
  return(
    <div className="spinWheelContainer">
      <div className="spinWheelHeader">
        <Wheel size={24} color={theme.accent}/>
        <span>{t('nav_rewards')}</span>
      </div>
      <div 
        className={`spinWheel ${spinning?'spinning':''}`} 
        style={{
          transform:`rotate(${rotation}deg)`,
          '--wheel-color1':theme.accent,
          '--wheel-color2':theme.accent2,
        }}
      >
        {Array.from({length:8},(_,i)=>{
          const angle=i*45;
          const isBonus=[0,2,4,6].includes(i);
          return(
            <div key={i} className={`wheelSegment ${isBonus?'bonus':''}`} style={{
              transform:`rotate(${angle}deg)`,
              background:isBonus?theme.accent:'transparent',
            }}>
              {isBonus?<span>×{Math.round(multipliers*10)/10}</span>:null}
            </div>
          );
        })}
        <div className="wheelCenter">
          <Crown size={20} color="#fff"/>
        </div>
      </div>
      <div className="wheelPointer" style={{borderTopColor:theme.accent}}/>
      
      {!hasClaimedToday&&!spinning&&(
        <button className="spinBtn join" onClick={handleSpin}>
          <Sparkles size={16}/> {t('hero_explore')}
        </button>
      )}
      
      {hasClaimedToday&&showResult&&(
        <div className="claimedBadge">
          <Trophy size={14}/> +{showResult.toLocaleString()} {t('game_balance').toLowerCase()}
        </div>
      )}
    </div>
  );
}

// ─── Stats Counter Component ──────────────────────────────
function AnimatedStats(){
  const stats=getGameStats();
  const[playerCount,setPlayerCount]=useState(0);
  
  useEffect(()=>{
    const target=theme.playerCount||10000;
    const step=Math.ceil(target/60);
    let current=0;
    const interval=setInterval(()=>{
      current=Math.min(current+step,target);
      setPlayerCount(current);
      if(current>=target)clearInterval(interval);
    },30);
    return()=>clearInterval(interval);
  },[theme.playerCount]);
  
  return(
    <div className="liveStats">
      <span><Sparkles size={14} color={theme.accent}/> {playerCount.toLocaleString()} {t('online_players')}</span>
      <span><Gamepad2 size={14} color={theme.accent}/> {stats.total} {t('nav_games').toLowerCase()}</span>
      <span><Trophy size={14} color={theme.accent}/> {stats.featured} ★</span>
    </div>
  );
}

// ─── Game Card Component ──────────────────────────────────
function GameCard({g,onPlay,onFavorite,favorite}){
  return(
    <article className="game" style={{'--h':g.hue}}>
      <button className="gameMain" onClick={()=>onPlay(g)} aria-label={`Play ${g.title}`}>
        <span className={`art ${g.cover?'hasCover':''}`}>
          {g.cover?<img src={g.cover} alt="" loading="lazy" decoding="async"/>:<b>{g.icon}</b>}
          {g.hot&&<i>HOT</i>}
          {g.new&&<em>NEW</em>}
        </span>
        <span className="gameMeta">
          <strong>{g.title}</strong>
          <small>
            {g.studio}
            <span><Star size={11} fill="currentColor"/> {g.rating}</span>
          </small>
        </span>
        <span className="play">{t('game_play')}</span>
      </button>
      <button className={`favoriteBtn ${favorite?'saved':''}`} onClick={()=>onFavorite(g)} aria-label={`${favorite?'Remove':'Add'} ${g.title} ${favorite?'from':'to'} favorites`}>
        <Heart fill={favorite?'currentColor':'none'}/>
      </button>
    </article>
  );
}

// ─── Demo / Game Modal ────────────────────────────────────
function Demo({game,onClose}){
  const[score,setScore]=useState(0);
  const[muted,setMuted]=useState(true);
  const dialogRef=useDialog(onClose);
  
  return(
    <div className="modal" role="dialog" aria-modal="true" aria-label={game.title} ref={dialogRef} tabIndex={-1}>
      <div className={`demo ${game.url?'realGame':''}`}>
        <div className="demoHead">
          <div>
            <small>{game.url?'SELF-HOSTED GAME':'NOW PLAYING'}</small>
            <b>{game.title}</b>
          </div>
          {!game.url&&<button onClick={()=>setMuted(!muted)} aria-label={muted?'Unmute game sound':'Mute game sound'} aria-pressed={muted}>
            {muted?<VolumeX/>:<Volume2/>}
          </button>}
          <button onClick={onClose} aria-label="Close game"><X/></button>
        </div>
        {game.url?
          <><iframe title={game.title} src={game.url} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" onLoad={()=>track('game_load_success',{game:game.id})}/>
           <small className="disclaimer">{game.license} licensed · Self-hosted · No real money or prizes</small></>:
          <><div className="reels">
            {[0,1,2].map(n=><div key={n} className={score>0?'spinning':''}>{games[(score+n*13)%games.length].icon}</div>)}
          </div>
          <p>{t('game_balance')} <b>{1000+score*25}</b></p>
          <button className="spin" onClick={()=>{setScore(s=>s+1);track('demo_spin',{game:game.id})}}>
            {t('game_spin')}
          </button>
          <small className="disclaimer">{t('consent_desc')}</small></>
        }
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────
function App(){
  const[cat,setCat]=useState('All');
  const[q,setQ]=useState('');
  const[limit,setLimit]=useState(24);
  const[active,setActive]=useState(null);
  const[menu,setMenu]=useState(false);
  const[notice,setNotice]=useState(!consent());
  const[account,setAccount]=useState(false);
  const[user,setUser]=useState(null);
  const[favorites,setFavorites]=useState([]);
  const[recents,setRecents]=useState([]);
  const[dailyReward,setDailyReward]=useState(null);
  const[hasClaimedToday,setHasClaimedToday]=useState(false);
  
  // Check if user claimed daily reward today
  useEffect(()=>{
    const lastClaim=localStorage.getItem('daily-reward-date');
    const today=new Date().toDateString();
    if(lastClaim===today){
      setHasClaimedToday(true);
      setDailyReward(parseInt(localStorage.getItem('daily-reward-amount')||'0'));
    }
  },[]);
  
  const handleClaimReward=(amount)=>{
    const today=new Date().toDateString();
    localStorage.setItem('daily-reward-date',today);
    localStorage.setItem('daily-reward-amount',String(amount));
    setDailyReward(amount);
    setHasClaimedToday(true);
  };
  
  const favIds=useMemo(()=>new Set(favorites.map(x=>x.gameId)),[favorites]);
  const recentIds=useMemo(()=>new Set(recents.map(x=>x.gameId)),[recents]);
  
  const matches=useCallback(g=>(
    cat==='All'||
    cat==='Popular'&&g.hot||
    cat==='Favorites'&&favIds.has(g.id)||
    cat==='Recent'&&recentIds.has(g.id)||
    g.category===cat
  )&&g.title.toLowerCase().includes(q.toLowerCase()),[cat,q,favIds,recentIds]);
  
  const shown=useMemo(()=>games.filter(matches).slice(0,limit),[matches,limit]);
  
  const play=g=>{
    track('game_open',{game:g.id,category:g.category});
    if(api.hasSession())api.played(g.id).then(()=>setRecents(r=>[{gameId:g.id},...r.filter(x=>x.gameId!==g.id)])).catch(()=>{});
    setActive(g);
  };
  
  const toggleFavorite=async g=>{
    if(!api.hasSession()){setAccount(true);return}
    const saved=favIds.has(g.id);
    try{
      saved?await api.removeFavorite(g.id):await api.addFavorite(g.id);
      setFavorites(xs=>saved?xs.filter(x=>x.gameId!==g.id):[{gameId:g.id},...xs]);
      track(saved?'favorite_remove':'favorite_add',{game:g.id});
    }catch(err){console.warn('Favorite update failed',err)}
  };
  
  const accountData=useCallback((next,data)=>{
    setUser(next);
    setFavorites(data?.favorites||[]);
    setRecents(data?.recents||[]);
  },[]);
  
  return(
    <main style={{'--accent':theme.accent,'--accent2':theme.accent2}} data-brand={brand}>
      <ParticleBackground/>
      <a className="skipLink" href="#games">Skip to games</a>
      
      {/* ── Header ─────────────────────────────────────── */}
      <header>
        <a className="logo" href="#top"><Gamepad2/><span>{theme.name}</span></a>
        <nav>
          <a href="#games">{t('nav_games')}</a>
          <a href="#rewards">{t('nav_rewards')}</a>
          <a href="#about">{t('nav_about')}</a>
        </nav>
        <div className="actions">
          <a className="iconBtn" href="/admin.html" aria-label="Admin Panel" title="Admin Panel" style={{fontSize:'12px'}}>⚙️</a>
          <LangSwitch/>
          <button className="iconBtn" aria-label="Account" onClick={()=>setAccount(true)}><UserRound/></button>
          <button className="join" onClick={()=>{track('join_click');setAccount(true)}}>
            {user?t('nav_profile'):t('account_join')}
          </button>
          <button className="iconBtn mobile" aria-label="Open navigation" onClick={()=>setMenu(!menu)}>
            {menu?<X/>:<Menu/>}
          </button>
        </div>
      </header>
      
      {menu&&<div className="mobileNav">
        <a href="#games">{t('nav_games')}</a>
        <a href="#rewards">{t('nav_rewards')}</a>
        <a href="#about">{t('nav_about')}</a>
      </div>}
      
      {/* ── Bottom Mobile Nav ──────────────────────────── */}
      <div className="bottomNav">
        <a href="#top"><Home/>{t('nav_games').split(' ')[0]}</a>
        <a href="#games"><Gamepad2/>{t('nav_games')}</a>
        <a href="#rewards"><Gift/>{t('nav_rewards')}</a>
        <button onClick={()=>setAccount(true)}><UserRound/>{t('nav_profile')}</button>
      </div>
      
      {/* ── Hero Section ───────────────────────────────── */}
      <section className="hero" id="top">
        <div className="heroGlow"/>
        <div className="heroCopy">
          <span className="eyebrow">{theme.tag}</span>
          <h1>{theme.hero}</h1>
          <p>{theme.copy}</p>
          <div className="heroCtas">
            <a className="join big" href="#games" onClick={()=>track('hero_play')}>
              {t('hero_explore')} <ChevronRight/>
            </a>
            <a className="secondary howLink" href="#about">{t('hero_how')}</a>
          </div>
          <span className="online"><i/> {theme.badge}</span>
        </div>
        <div className="heroVisual">
          <div className="orb" style={{background:theme.orbGradient}}>
            <span>7</span><span>★</span><span>♛</span>
          </div>
        </div>
      </section>
      
      {/* ── Live Stats ─────────────────────────────────── */}
      <AnimatedStats/>
      
      {/* ── Trust Bar ──────────────────────────────────── */}
      <section className="trust">
        <span><ShieldCheck/>{t('trust_fair')}</span>
        <span><Gift/>{t('trust_daily')}</span>
        <span><Gamepad2/>{t('trust_games')}</span>
      </section>
      
      {/* ── Daily Reward Section ───────────────────────── */}
      <section className="dailyRewardSection">
        <div className="dailyRewardContent">
          <Sparkles size={32} color={theme.accent}/>
          <div>
            <h2>{t('reward_title')}</h2>
            <p>{t('reward_desc')}</p>
            <small style={{color:theme.accent}}>{theme.welcomeBonus||'5000 FREE COINS + 10 SPINS'}</small>
          </div>
        </div>
        <DailySpinWheel onClaim={handleClaimReward} hasClaimedToday={hasClaimedToday}/>
      </section>
      
      {/* ── Games Library ──────────────────────────────── */}
      <section className="library" id="games">
        <div className="sectionHead">
          <div><span className="eyebrow">THE COLLECTION</span><h2>{t('library_title')}</h2></div>
          <label className="search"><Search/><input value={q} onChange={e=>{setQ(e.target.value);setLimit(24)}} placeholder={t('library_search')} aria-label={t('library_search')}/></label>
        </div>
        <div className="filters">
          {categories.map(c=><button className={cat===c?'active':''} onClick={()=>{setCat(c);setLimit(24);track('category_select',{category:c})}} key={c}>{c}</button>)}
        </div>
        <div className="grid">
          {shown.map(g=><GameCard key={g.id} g={g} onPlay={play} onFavorite={toggleFavorite} favorite={favIds.has(g.id)}/>)}</div>
        {shown.length===0&&<div className="emptyState">
          <Heart/><h3>{t('common_none')}</h3>
          <p>{cat==='Favorites'?t('library_empty_fav'):cat==='Recent'?t('library_empty_rec'):t('library_empty_other')}</p>
        </div>}
        {shown.length<games.filter(matches).length&&<button className="load" onClick={()=>setLimit(x=>x+24)}>{t('library_load_more')}</button>}
      </section>
      
      {/* ── Loyalty Tiers ─────────────────────────────── */}
      <section className="loyaltySection">
        <div className="loyaltyContent">
          <span className="eyebrow">{t('nav_rewards')}</span>
          <h2>{t('reward_title')}</h2>
          <div className="loyaltyTiers">
            {theme.loyaltyTier?.map((tier,i)=>(
              <div key={i} className={`loyaltyTier ${i===0?'active':''}`}>
                <span className="tierIcon">{tier.split(' ')[0]}</span>
                <span className="tierName">{tier.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* ── Footer ─────────────────────────────────────── */}
      <footer id="about">
        <a className="logo" href="#top"><Gamepad2/>{theme.name}</a>
        <p>{t('footer_rights')}</p>
        <small>© 2026 {theme.name} · <a href="./legal.html#privacy">{t('legal_privacy')}</a> · <a href="./legal.html#responsible">{t('legal_responsible')}</a> · 18+</small>
      </footer>
      
      {/* ── Modals ─────────────────────────────────────── */}
      {active&&<Demo game={active} onClose={()=>setActive(null)}/>}
      {account&&<AccountPanel onClose={()=>setAccount(false)} onUser={accountData}/>}
      {notice&&!active&&!account&&<div className="consent">
        <div><b>{t('consent_title')}</b><p>{t('consent_desc')}</p></div>
        <button onClick={()=>{setConsent(false);setNotice(false)}}>{t('consent_no')}</button>
        <button className="join" onClick={()=>{setConsent(true);setNotice(false);track('consent_granted')}}>{t('consent_yes')}</button>
      </div>}
    </main>
  );
}

// Expose i18n setter for LangSwitch to access
if(typeof window!=='undefined') window.__i18nSetLang=setLang;

createRoot(document.getElementById('root')).render(<App/>);
