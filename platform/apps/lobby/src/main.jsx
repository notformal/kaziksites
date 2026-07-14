import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Menu,
  X,
  ChevronRight,
  Star,
  ShieldCheck,
  Gamepad2,
  Gift,
  UserRound,
  Volume2,
  VolumeX,
  Home,
  Heart,
  History,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { games, categories } from "./catalog";
import { themes } from "./themes";
import { consent, setConsent, track } from "./analytics";
import { api } from "./api";
import AccountPanel from "./AccountPanel";
import GameFrame from "./GameFrame";
import LegacyFrame from "./LegacyFrame";
import SocialProof from "./SocialProof";
import BrandExperience from "./BrandExperience";
import { HelpCenter, needsOnboarding, Onboarding, SessionReminder } from "./TrustUx";
import "./styles.css";
import "./game.css";
import "./account.css";
import "./mobile-nav.css";
import "./premium-redesign.css";
const brand =
  import.meta.env.VITE_BRAND ||
  new URLSearchParams(location.search).get("brand") ||
  "aurora";
const theme = themes[brand] || themes.aurora;
document.title = `${theme.name} — Social Arcade`;
function GameCard({ g, onPlay, onFavorite, favorite }) {
  return (
    <article className="game" style={{ "--h": g.hue }}>
      <button
        className="gameMain"
        onClick={() => onPlay(g)}
        aria-label={`Play ${g.title}`}
      >
        <span className="art">
          <img src={`/covers-v2/${g.id}.jpg`} alt="" loading="lazy" decoding="async" />
          {g.hot && <i>HOT</i>}
          {g.new && <em>NEW</em>}
        </span>
        <span className="gameMeta">
          <strong>{g.title}</strong>
          <small>
            {g.studio}
            <span>
              <Star size={11} fill="currentColor" /> {g.rating}
            </span>
          </small>
        </span>
        <span className="play">PLAY</span>
      </button>
      <button
        className={`favoriteBtn ${favorite ? "saved" : ""}`}
        onClick={() => onFavorite(g)}
        aria-label={`${favorite ? "Remove" : "Add"} ${g.title} ${favorite ? "from" : "to"} favorites`}
      >
        <Heart fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
function Demo({ game, onClose }) {
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(true);
  const real = game.url || game.serverGame;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className={`demo ${real ? "realGame" : ""}`}>
        <div className="demoHead">
          <div>
            <small>
              {game.serverGame
                ? "SERVER-AUTHORITATIVE"
                : game.url
                  ? "SELF-HOSTED GAME"
                  : "NOW PLAYING"}
            </small>
            <b>{game.title}</b>
          </div>
          {!real && (
            <button onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX /> : <Volume2 />}
            </button>
          )}
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {game.serverGame ? (
          <GameFrame
            game={game}
            theme={{ accent: theme.accent, accent2: theme.accent2 }}
          />
        ) : game.url ? (
          <>
          <LegacyFrame
            game={game}
            onLoad={() => track("game_ready", { loadMs: 0 }, {gameId:game.id})}
          />
            <small className="disclaimer">
              {game.license} licensed · Self-hosted · No real money or prizes
            </small>
          </>
        ) : (
          <>
            <div className="reels">
              {[0, 1, 2].map((n) => (
                <div key={n}>{games[(score + n * 13) % games.length].icon}</div>
              ))}
            </div>
            <p>
              Demo credits <b>{1000 + score * 25}</b>
            </p>
            <button
              className="spin"
              onClick={() => {
                setScore((s) => s + 1);
                track("demo_spin", { game: game.id });
              }}
            >
              SPIN
            </button>
            <small className="disclaimer">
              Interaction prototype · No real money · No prizes
            </small>
          </>
        )}
      </div>
    </div>
  );
}
function App() {
  const [cat, setCat] = useState("All"),
    [q, setQ] = useState(""),
    [studio, setStudio] = useState("All studios"),
    [sort, setSort] = useState("featured"),
    [limit, setLimit] = useState(24),
    [active, setActive] = useState(null),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(!consent()),
    [account, setAccount] = useState(false),
    [user, setUser] = useState(null),
    [favorites, setFavorites] = useState([]),
    [recents, setRecents] = useState([]),
    [help, setHelp] = useState(false),
    [onboarding, setOnboarding] = useState(needsOnboarding);
  useEffect(() => {
    track("page");
    track("brand",{selected:brand});
  }, []);
  useEffect(() => {
    const id=setTimeout(()=>track("search",{queryLength:q.length,resultCount:games.filter(matches).length}),400);
    return()=>clearTimeout(id);
  },[q]);
  useEffect(() => {
    track("filter",{category:cat.slice(0,64)});
  },[cat]);
  useEffect(() => {
    if (!api.hasSession()) return;
    let current = true;
    Promise.allSettled([api.profile(), api.favorites(), api.recents()]).then(
      ([profile, favoriteData, recentData]) => {
        if (!current || profile.status !== "fulfilled") return;
        setUser(profile.value.user);
        if (favoriteData.status === "fulfilled") setFavorites(favoriteData.value.games);
        if (recentData.status === "fulfilled") setRecents(recentData.value.games);
      },
    );
    return () => {
      current = false;
    };
  }, []);
  const favIds = new Set(favorites.map((x) => x.gameId)),
    recentIds = new Set(recents.map((x) => x.gameId));
  const studios = useMemo(
    () => ["All studios", ...Array.from(new Set(games.map((g) => g.studio))).sort()],
    [],
  );
  const studioStats = useMemo(
    () => studios.slice(1).map((name) => ({
      name,
      count: games.filter((g) => g.studio === name).length,
      featured: games.find((g) => g.studio === name),
    })).sort((a,b) => b.count - a.count).slice(0, 8),
    [studios],
  );
  const matches = (g) =>
    (cat === "All" ||
      (cat === "Popular" && g.hot) ||
      (cat === "Favorites" && favIds.has(g.id)) ||
      (cat === "Recent" && recentIds.has(g.id)) ||
      g.category === cat) &&
    (studio === "All studios" || g.studio === studio) &&
    g.title.toLowerCase().includes(q.toLowerCase());
  const shown = useMemo(
    () => games.filter(matches).sort((a,b) => {
      if (sort === "rating") return Number(b.rating) - Number(a.rating);
      if (sort === "new") return Number(Boolean(b.new)) - Number(Boolean(a.new));
      if (sort === "name") return a.title.localeCompare(b.title);
      return Number(Boolean(b.hot)) - Number(Boolean(a.hot));
    }).slice(0, limit),
    [cat, q, studio, sort, limit, favorites, recents],
  );
  const play = (g) => {
    track("game_open", { category: g.category }, {gameId:g.id});
    if (g.serverGame && !api.hasSession()) {
      setAccount(true);
      return;
    }
    if (api.hasSession())
      api
        .played(g.id)
        .then(() =>
          setRecents((r) => [
            { gameId: g.id },
            ...r.filter((x) => x.gameId !== g.id),
          ]),
        )
        .catch(() => {});
    setActive(g);
  };
  const toggleFavorite = async (g) => {
    if (!api.hasSession()) {
      setAccount(true);
      return;
    }
    const saved = favIds.has(g.id);
    try {
      saved ? await api.removeFavorite(g.id) : await api.addFavorite(g.id);
      setFavorites((xs) =>
        saved ? xs.filter((x) => x.gameId !== g.id) : [{ gameId: g.id }, ...xs],
      );
    } catch {}
  };
  const accountData = (next, data) => {
    setUser(next);
    setFavorites(data?.favorites || []);
    setRecents(data?.recents || []);
  };
  return (
    <main
      style={{ "--accent": theme.accent, "--accent2": theme.accent2 }}
      data-brand={brand}
    >
      <BrandExperience
        brand={brand}
        theme={theme}
        gameCount={games.length}
        menu={menu}
        setMenu={setMenu}
        setHelp={setHelp}
        user={user}
        onAccount={() => { track("join_click"); setAccount(true); }}
        onHeroPlay={() => track("hero_play")}
        chromeOnly
      />
      <header className="legacyChrome">
        <a className="logo" href="#top">
          <Gamepad2 />
          <span>{theme.name}</span>
        </a>
        <nav>
          <a href="#games">Games</a>
          <a href="#rewards">Rewards</a>
          <a href="#about">About</a>
          <button className="navButton" onClick={() => setHelp(true)}>Help</button>
        </nav>
        <div className="actions">
          <button
            className="iconBtn"
            aria-label="Account"
            onClick={() => setAccount(true)}
          >
            <UserRound />
          </button>
          <button
            className="join"
            onClick={() => {
              track("join_click");
              setAccount(true);
            }}
          >
            {user ? "PROFILE" : "JOIN FREE"}
          </button>
          <button
            className="iconBtn mobile"
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {menu && (
        <div className="mobileNav legacyChrome">
          <a href="#games">Games</a>
          <a href="#rewards">Rewards</a>
          <a href="#about">About</a>
          <button className="navButton" onClick={() => {setHelp(true);setMenu(false)}}>Help</button>
        </div>
      )}
      <div className="bottomNav legacyChrome">
        <a href="#top">
          <Home />
          Home
        </a>
        <a href="#games">
          <Gamepad2 />
          Games
        </a>
        <a href="#rewards">
          <Gift />
          Rewards
        </a>
        <button onClick={() => setAccount(true)}>
          <UserRound />
          Profile
        </button>
      </div>
      <section className="hero legacyChrome" aria-hidden="true">
        <div className="heroGlow" />
        <div className="heroCopy">
          <span className="eyebrow">{theme.tag}</span>
          <h1>{theme.hero}</h1>
          <p>{theme.copy}</p>
          <div className="heroCtas">
            <a
              className="join big"
              href="#games"
              onClick={() => track("hero_play")}
            >
              EXPLORE GAMES <ChevronRight />
            </a>
            <a className="secondary howLink" href="#about">
              HOW IT WORKS
            </a>
          </div>
          <span className="online">
            <i /> {theme.badge}
          </span>
        </div>
        <div className="heroVisual">
          <div className="orb">
            <span>7</span>
            <span>★</span>
            <span>♛</span>
          </div>
        </div>
      </section>
      <section className="trust legacyChrome" aria-hidden="true">
        <span>
          <ShieldCheck /> SERVER-VERIFIED PLAY
        </span>
        <span>
          <Gift /> DAILY COLLECTIONS
        </span>
        <span>
          <Gamepad2 /> {games.length} PLAYABLE GAMES
        </span>
      </section>
      <section className="platformHub" aria-labelledby="platform-heading">
        <header>
          <div><span className="eyebrow">GAME PLATFORMS</span><h2 id="platform-heading">Choose your studio</h2></div>
          <p>Browse self-hosted titles by game family. Every balance uses virtual credits only.</p>
        </header>
        <div className="platformRail">
          {studioStats.map((item) => <button key={item.name} onClick={() => { setStudio(item.name); setCat("All"); setLimit(24); document.querySelector("#games")?.scrollIntoView({behavior:"smooth"}); }}>
            <img src={`/covers-v2/${item.featured.id}.jpg`} alt="" loading="lazy" />
            <span><b>{item.name}</b><small>{item.count} playable titles</small></span>
            <ChevronRight />
          </button>)}
        </div>
      </section>
      <section className="library" id="games">
        <div className="sectionHead">
          <div>
            <span className="eyebrow">THE COLLECTION</span>
            <h2>Find your next favorite</h2>
          </div>
          <label className="search">
            <Search />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(24);
              }}
              placeholder="Search games..."
              aria-label="Search games"
            />
          </label>
        </div>
        <div className="filters">
          {categories.map((c) => (
            <button
              className={cat === c ? "active" : ""}
              onClick={() => {
                setCat(c);
                setLimit(24);
                track("category_select", { category: c });
              }}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="catalogTools" aria-label="Catalog controls">
          <span><SlidersHorizontal /> Browse the collection</span>
          <label>
            <span>Studio</span>
            <select value={studio} onChange={(e) => { setStudio(e.target.value); setLimit(24); }}>
              {studios.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="new">Newest</option>
              <option value="name">A–Z</option>
            </select>
          </label>
          <b>{games.filter(matches).length} games</b>
        </div>
        <div className="grid">
          {shown.map((g) => (
            <GameCard
              key={g.id}
              g={g}
              onPlay={play}
              onFavorite={toggleFavorite}
              favorite={favIds.has(g.id)}
            />
          ))}
        </div>
        {shown.length === 0 && (
          <div className="emptyState">
            <Heart />
            <h3>Nothing here yet</h3>
            <p>
              {cat === "Favorites"
                ? "Save games with the heart button to find them here."
                : cat === "Recent"
                  ? "Play a game and it will appear here."
                  : "Try another search or category."}
            </p>
          </div>
        )}
        {shown.length < games.filter(matches).length && (
          <button className="load" onClick={() => setLimit((x) => x + 24)}>
            LOAD MORE
          </button>
        )}
      </section>
      <SocialProof />
      <section className="reward" id="rewards">
        <div>
          <span className="eyebrow">MEMBER REWARDS</span>
          <h2>A better reason to come back.</h2>
          <p>
            Create a profile to collect 250 virtual credits every day. Credits
            have no cash value and cannot be purchased or withdrawn.
          </p>
          <button className="join big" onClick={() => setAccount(true)}>
            VIEW REWARDS <ChevronRight />
          </button>
        </div>
        <div className="rewardCards">
          <article>
            <b>01</b>
            <span>Daily discovery</span>
          </article>
          <article>
            <b>07</b>
            <span>Weekly streak</span>
          </article>
          <article>
            <b>∞</b>
            <span>Just for fun</span>
          </article>
        </div>
      </section>
      <footer id="about">
        <a className="logo" href="#top">
          <Gamepad2 />
          {theme.name}
        </a>
        <p>
          Social arcade showcase. All games and balances are demonstrations
          only. No wagering or cash prizes.
        </p>
        <small>
          © 2026 {theme.name} ·{" "}
          <a href={`./legal.html?brand=${brand}#privacy`}>Privacy</a> ·{" "}
          <a href={`./legal.html?brand=${brand}#responsible`}>
            Responsible play
          </a>{" "}
          · <button className="helpLink" onClick={() => setHelp(true)}><HelpCircle/>Help & fairness</button>{" "}
          · 18+
        </small>
      </footer>
      {active && <Demo game={active} onClose={() => setActive(null)} />}{" "}
      {account && (
        <AccountPanel onClose={() => setAccount(false)} onUser={accountData} />
      )}{" "}
      {onboarding && <Onboarding onDone={() => setOnboarding(false)}/>} {help && <HelpCenter onClose={() => setHelp(false)}/>} <SessionReminder/>{" "}
      {notice && !active && !account && !onboarding && !help && (
        <div className="consent">
          <div>
            <b>Privacy, by choice.</b>
            <p>
              Allow anonymous product analytics to help us improve this demo?
            </p>
          </div>
          <button
            onClick={() => {
              setConsent(false);
              setNotice(false);
            }}
          >
            No thanks
          </button>
          <button
            className="join"
            onClick={() => {
              setConsent(true);
              setNotice(false);
              track("consent_granted");
            }}
          >
            ALLOW
          </button>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
