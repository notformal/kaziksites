import React from "react";
import {
  ChevronRight,
  Gamepad2,
  Gift,
  HelpCircle,
  Home,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

function AccountAction({ user, onAccount }) {
  return (
    <>
      <button className="iconBtn" aria-label="Account" onClick={onAccount}>
        <UserRound />
      </button>
      <button className="join" onClick={onAccount}>
        {user ? "PROFILE" : "JOIN FREE"}
      </button>
    </>
  );
}

function MobileNavigation({ onAccount }) {
  return (
    <div className="bottomNav">
      <a href="#top"><Home />Home</a>
      <a href="#games"><Gamepad2 />Games</a>
      <a href="#rewards"><Gift />Rewards</a>
      <button onClick={onAccount}><UserRound />Profile</button>
    </div>
  );
}

function UtilityLayers({ menu, setMenu, setHelp, onAccount }) {
  return (
    <>
      {menu && (
        <div className="mobileNav">
          <a href="#games" onClick={() => setMenu(false)}>Games</a>
          <a href="#rewards" onClick={() => setMenu(false)}>Rewards</a>
          <a href="#about" onClick={() => setMenu(false)}>About</a>
          <button className="navButton" onClick={() => { setHelp(true); setMenu(false); }}>Help</button>
        </div>
      )}
      <MobileNavigation onAccount={onAccount} />
    </>
  );
}

function MobileMenuButton({ menu, setMenu }) {
  return (
    <button className="iconBtn mobile" aria-label="Open navigation" onClick={() => setMenu(!menu)}>
      {menu ? <X /> : <Menu />}
    </button>
  );
}

function TrustStrip({ gameCount }) {
  return (
    <section className="trust" aria-label="Platform facts">
      <span><ShieldCheck /> SERVER-VERIFIED PLAY</span>
      <span><Gift /> DAILY COLLECTIONS</span>
      <span><Gamepad2 /> {gameCount} PLAYABLE GAMES</span>
    </section>
  );
}

function Footer({ brand, theme, setHelp }) {
  return (
    <footer id="about">
      <a className="logo" href="#top"><Gamepad2 />{theme.name}</a>
      <p>Social arcade showcase. All games and balances are demonstrations only. No wagering or cash prizes.</p>
      <small>
        © 2026 {theme.name} · <a href={`./legal.html?brand=${brand}#privacy`}>Privacy</a> ·{" "}
        <a href={`./legal.html?brand=${brand}#responsible`}>Responsible play</a> ·{" "}
        <button className="helpLink" onClick={() => setHelp(true)}><HelpCircle />Help & fairness</button> · 18+
      </small>
    </footer>
  );
}

function AuroraShell(p) {
  return (
    <div className="brandExperience auroraExperience" data-layout="signal-control-room">
      <aside className="auroraRail" aria-label="Primary navigation">
        <a className="logo" href="#top"><Gamepad2 /><span>{p.theme.name}</span></a>
        <nav>
          <a href="#top">Home</a><a href="#games">Live now</a><a href="#games">Slots</a>
          <a href="#games">Instant</a><a href="#games">Table</a><a href="#rewards">Missions</a>
        </nav>
        <button className="navButton" onClick={() => p.setHelp(true)}>Fairness & limits</button>
      </aside>
      <div className="auroraWorkspace">
        <header className="auroraCommandBar">
          <a className="logo auroraMobileLogo" href="#top"><Gamepad2 /><span>{p.theme.name}</span></a>
          <a className="commandSearch" href="#games"><Search /><span>Search 200 games</span><kbd>/</kbd></a>
          <div className="actions"><AccountAction user={p.user} onAccount={p.onAccount} /><MobileMenuButton {...p} /></div>
        </header>
        <UtilityLayers {...p} />
        <section className="hero auroraStage" id="top">
          <div className="heroGlow" />
          <div className="heroCopy">
            <span className="eyebrow">{p.theme.tag}</span><h1>{p.theme.hero}</h1><p>{p.theme.copy}</p>
            <div className="heroCtas"><a className="join big" href="#games" onClick={p.onHeroPlay}>PLAY THE SIGNAL <ChevronRight /></a><a className="secondary howLink" href="#about">HOW IT WORKS</a></div>
            <span className="online"><i /> {p.theme.badge}</span>
          </div>
          <div className="heroVisual" data-module="featured-broadcast"><div className="orb"><span>7</span><span>★</span><span>♛</span></div></div>
          <aside className="auroraMission" aria-label="Daily mission"><small>DAILY SIGNAL</small><b>Discover three worlds</b><span>0 / 3 complete</span></aside>
        </section>
        <TrustStrip gameCount={p.gameCount} />
        <div className="auroraContinue" data-module="continue-rail"><span>01</span><b>Fast discovery</b><span>Server-verified virtual play</span></div>
        {p.library}{p.social}{p.reward}{!p.chromeOnly && <Footer {...p} />}
      </div>
    </div>
  );
}

function EmberShell(p) {
  return (
    <div className="brandExperience emberExperience" data-layout="afterdark-editorial">
      <header className="emberHeader">
        <a className="logo" href="#top"><span>{p.theme.name}</span></a>
        <nav><a href="#top">Tonight</a><a href="#games">Games</a><a href="#rewards">Drops</a><a href="#about">Club</a><button className="navButton" onClick={() => p.setHelp(true)}>Help</button></nav>
        <div className="actions"><AccountAction user={p.user} onAccount={p.onAccount} /><MobileMenuButton {...p} /></div>
      </header>
      <UtilityLayers {...p} />
      <section className="hero emberTakeover" id="top">
        <div className="heroVisual" data-module="tonight-takeover"><div className="orb"><span>7</span><span>★</span><span>♛</span></div></div>
        <div className="heroGlow" />
        <div className="heroCopy">
          <span className="eyebrow">TONIGHT / 001</span><h1>{p.theme.hero}</h1><p>{p.theme.copy}</p>
          <div className="heroCtas"><a className="join big" href="#games" onClick={p.onHeroPlay}>ENTER TONIGHT <ChevronRight /></a><a className="secondary howLink" href="#about">THE CLUB</a></div>
          <span className="online"><i /> {p.theme.badge}</span>
        </div>
      </section>
      <div className="emberTicker" aria-label="Tonight's programme"><span>TONIGHT</span><b>Original games</b><span>Virtual credits only</span><b>No purchase required</b></div>
      <section className="emberPosterIntro"><span className="eyebrow">THE POSTER WALL</span><h2>Pick your next obsession.</h2></section>
      {p.library}
      <div className="emberSocialChapter">{p.social}</div>
      <TrustStrip gameCount={p.gameCount} />
      {p.reward}
      <div className="emberMemberDock"><span>CLUB ACCESS</span><b>{p.user ? "Your night is saved" : "Join to save your streak"}</b><button className="join" onClick={p.onAccount}>{p.user ? "OPEN PROFILE" : "JOIN FREE"}</button></div>
      {!p.chromeOnly && <Footer {...p} />}
    </div>
  );
}

function RoyaleShell(p) {
  return (
    <div className="brandExperience royaleExperience" data-layout="private-games-house">
      <header className="royaleMasthead">
        <nav><a href="#games">Collection</a><a href="#games">Salon</a><a href="#rewards">New editions</a></nav>
        <a className="logo" href="#top"><span>{p.theme.name}</span></a>
        <div className="actions"><button className="navButton" onClick={() => p.setHelp(true)}>Journal</button><AccountAction user={p.user} onAccount={p.onAccount} /><MobileMenuButton {...p} /></div>
      </header>
      <UtilityLayers {...p} />
      <section className="hero royaleCover" id="top">
        <div className="heroCopy">
          <span className="eyebrow">ISSUE NO. 07 · {p.theme.tag}</span><h1>{p.theme.hero}</h1>
          <p className="royaleCuratorNote">A considered selection for unhurried play. {p.theme.copy}</p>
          <div className="heroCtas"><a className="join big" href="#games" onClick={p.onHeroPlay}>OPEN THE COLLECTION <ChevronRight /></a><a className="secondary howLink" href="#about">CURATOR'S NOTE</a></div>
          <span className="online"><i /> {p.theme.badge}</span>
        </div>
        <div className="heroVisual" data-module="curators-still-life"><div className="orb"><span>VII</span><span>♛</span><span>◆</span></div></div>
      </section>
      <section className="royaleSalons" aria-label="Curated salons"><article><span>01</span><b>The Salon of Chance</b></article><article><span>02</span><b>Modern Mechanisms</b></article><article><span>03</span><b>Games After Dark</b></article></section>
      {p.library}
      <div className="royaleJournal"><span className="eyebrow">FROM THE JOURNAL</span>{p.social}</div>
      {p.reward}
      <TrustStrip gameCount={p.gameCount} />
      {!p.chromeOnly && <Footer {...p} />}
    </div>
  );
}

export default function BrandExperience(props) {
  if (props.brand === "ember") return <EmberShell {...props} />;
  if (props.brand === "royale") return <RoyaleShell {...props} />;
  return <AuroraShell {...props} />;
}
