import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, X, ChevronRight, Star, Heart, SlidersHorizontal } from "lucide-react";
import { games, categories } from "./catalog";
import { themes, resolveBrand } from "./themes";
import { UI } from "./ui.config";
import { consent, setConsent, track } from "./analytics";
import { api } from "./api";
import AccountPanel from "./AccountPanel";
import GameFrame from "./GameFrame";
import SocialProof from "./SocialProof";
import LiveFeed from "./LiveFeed";
import ChatPanel from "./ChatPanel";
import { I18nProvider, useI18n, useT } from "./i18n";
import BrandExperience from "./BrandExperience";
import { HelpCenter, needsOnboarding, Onboarding, SessionReminder } from "./TrustUx";
import "./styles.css";
import "./game.css";
import "./account.css";
import "./mobile-nav.css";
import "./premium-redesign.css";

const brand = resolveBrand();
const theme = themes[brand];
document.title = `${theme.name} — Social Casino`;

function GameCard({ g, onPlay, onFavorite, favorite }) {
  const t = useT();
  return (
    <article className="game" style={{ "--h": g.hue }} data-game-id={g.id} data-game-slug={g.slug || ""} data-engine-slug={g.engineSlug || g.slug || ""}>
      <button className="gameMain" onClick={() => onPlay(g)} aria-label={t("catalog.play", { title: g.title })}>
        <span className="art">
          <img
            src={`${UI.coverPath}/${g.id}.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
          {g.hot && <i>{t("catalog.hot")}</i>}
          {g.new && <em>{t("catalog.new")}</em>}
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
        <span className="play" aria-hidden="true">
          ▶
        </span>
      </button>
      <button
        className={`favoriteBtn ${favorite ? "saved" : ""}`}
        onClick={() => onFavorite(g)}
        aria-label={t(favorite ? "catalog.removeFavorite" : "catalog.addFavorite", { title: g.title })}
      >
        <Heart fill={favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function Demo({ game, onClose }) {
  const t = useT();
  const { locale } = useI18n();
  // Портфель — только серверные казино-игры: одна ветка, один iframe.
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="demo realGame">
        <div className="demoHead">
          <div>
            <small>{t("trust.serverVerified")}</small>
            <b>{game.title}</b>
          </div>
          <button onClick={onClose} aria-label={t("consent.deny")}>
            <X />
          </button>
        </div>
        <GameFrame game={game} locale={locale} theme={{ accent: theme.accent, accent2: theme.accent2 }} />
      </div>
    </div>
  );
}

function App() {
  const t = useT();
  const [cat, setCat] = useState("All"),
    [q, setQ] = useState(""),
    [studio, setStudio] = useState("All studios"),
    [sort, setSort] = useState(UI.sortOptions[0].value),
    [limit, setLimit] = useState(UI.pageSize),
    [active, setActive] = useState(null),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(!consent()),
    [account, setAccount] = useState(false),
    [user, setUser] = useState(null),
    [favorites, setFavorites] = useState([]),
    [recents, setRecents] = useState([]),
    [help, setHelp] = useState(false),
    [onboarding, setOnboarding] = useState(needsOnboarding);
  const favIds = new Set(favorites.map((x) => x.gameId)),
    recentIds = new Set(recents.map((x) => x.gameId));
  const matches = (g) =>
    (cat === "All" ||
      (cat === "Popular" && g.hot) ||
      (cat === "Favorites" && favIds.has(g.id)) ||
      (cat === "Recent" && recentIds.has(g.id)) ||
      g.category === cat) &&
    (studio === "All studios" || g.studio === studio) &&
    g.title.toLowerCase().includes(q.toLowerCase());
  const matching = useMemo(() => games.filter(matches), [cat, q, studio, favorites, recents]);
  useEffect(() => {
    track("page");
    track("brand", { selected: brand });
  }, []);
  useEffect(() => {
    const id = setTimeout(
      () => track("search", { queryLength: q.length, resultCount: matching.length }),
      UI.searchTrackDelayMs,
    );
    return () => clearTimeout(id);
  }, [q, matching.length]);
  useEffect(() => {
    track("filter", { category: cat.slice(0, 64) });
  }, [cat]);
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
  const studios = useMemo(
    () => ["All studios", ...Array.from(new Set(games.map((g) => g.studio))).sort()],
    [],
  );
  const studioStats = useMemo(
    () =>
      studios
        .slice(1)
        .map((name) => ({
          name,
          count: games.filter((g) => g.studio === name).length,
          featured: games.find((g) => g.studio === name),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, UI.studioRailLimit),
    [studios],
  );
  const shown = useMemo(
    () =>
      [...matching]
        .sort((a, b) => {
          if (sort === "rating") return Number(b.rating) - Number(a.rating);
          if (sort === "new") return Number(Boolean(b.new)) - Number(Boolean(a.new));
          if (sort === "name") return a.title.localeCompare(b.title);
          return Number(Boolean(b.hot)) - Number(Boolean(a.hot));
        })
        .slice(0, limit),
    [matching, sort, limit],
  );
  const play = (g) => {
    track("game_open", { category: g.category }, { gameId: g.id });
    if (g.serverGame && !api.hasSession()) {
      setAccount(true);
      return;
    }
    if (api.hasSession())
      api
        .played(g.id)
        .then(() => setRecents((r) => [{ gameId: g.id }, ...r.filter((x) => x.gameId !== g.id)]))
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
      setFavorites((xs) => (saved ? xs.filter((x) => x.gameId !== g.id) : [{ gameId: g.id }, ...xs]));
    } catch {}
  };
  const accountData = (next, data) => {
    setUser(next);
    setFavorites(data?.favorites || []);
    setRecents(data?.recents || []);
  };
  const openStudio = (name) => {
    setStudio(name);
    setCat("All");
    setLimit(UI.pageSize);
    document.querySelector("#games")?.scrollIntoView({ behavior: "smooth" });
  };

  const hub = (
    <section className="platformHub" aria-labelledby="platform-heading">
      <header>
        <div>
          <span className="eyebrow">{t("hub.eyebrow")}</span>
          <h2 id="platform-heading">{t("hub.title")}</h2>
        </div>
        <p>{t("hub.subtitle")}</p>
      </header>
      <div className="platformRail">
        {studioStats.map((item) => (
          <button key={item.name} onClick={() => openStudio(item.name)}>
            <img src={`${UI.coverPath}/${item.featured.id}.jpg`} alt="" loading="lazy" />
            <span>
              <b>{item.name}</b>
              <small>{t("hub.titles", { count: item.count })}</small>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </section>
  );

  const library = (
    <section className="library" id="games">
      <div className="sectionHead">
        <div>
          <span className="eyebrow">{t("collection.eyebrow")}</span>
          <h2>{t("collection.title")}</h2>
        </div>
        <label className="search">
          <Search />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(UI.pageSize);
            }}
            placeholder={t("collection.search")}
            aria-label={t("collection.search")}
          />
        </label>
      </div>
      <div className="filters">
        {categories.map((c) => (
          <button
            className={cat === c ? "active" : ""}
            onClick={() => {
              setCat(c);
              setLimit(UI.pageSize);
              track("category_select", { category: c });
            }}
            key={c}
          >
            {t(`category.${c}`)}
          </button>
        ))}
      </div>
      <div className="catalogTools" aria-label={t("catalog.browse")}>
        <span>
          <SlidersHorizontal /> {t("catalog.browse")}
        </span>
        <label>
          <span>{t("catalog.studio")}</span>
          <select
            value={studio}
            onChange={(e) => {
              setStudio(e.target.value);
              setLimit(UI.pageSize);
            }}
          >
            {studios.map((name) => (
              <option key={name} value={name}>
                {name === "All studios" ? t("catalog.allStudios") : name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("catalog.sort")}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {UI.sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <b>{t("catalog.count", { count: matching.length })}</b>
      </div>
      <div className="grid">
        {shown.map((g) => (
          <GameCard key={g.id} g={g} onPlay={play} onFavorite={toggleFavorite} favorite={favIds.has(g.id)} />
        ))}
      </div>
      {shown.length === 0 && (
        <div className="emptyState">
          <Heart />
          <h3>{t("catalog.emptyTitle")}</h3>
          <p>
            {cat === "Favorites"
              ? t("catalog.emptyFavorites")
              : cat === "Recent"
                ? t("catalog.emptyRecent")
                : t("catalog.emptyDefault")}
          </p>
        </div>
      )}
      {shown.length < matching.length && (
        <button className="load" onClick={() => setLimit((x) => x + UI.pageSize)}>
          {t("catalog.loadMore")}
        </button>
      )}
    </section>
  );

  const reward = (
    <section className="reward" id="rewards">
      <div>
        <span className="eyebrow">{t("rewards.eyebrow")}</span>
        <h2>{t("rewards.title")}</h2>
        <p>{t("rewards.copy", { credits: UI.dailyRewardCredits })}</p>
        <button className="join big" onClick={() => setAccount(true)}>
          {t("rewards.cta")} <ChevronRight />
        </button>
      </div>
      <div className="rewardCards">
        <article>
          <b>01</b>
          <span>{t("rewards.daily")}</span>
        </article>
        <article>
          <b>07</b>
          <span>{t("rewards.streak")}</span>
        </article>
        <article>
          <b>∞</b>
          <span>{t("rewards.fun")}</span>
        </article>
      </div>
    </section>
  );

  return (
    <main style={{ "--accent": theme.accent, "--accent2": theme.accent2 }} data-brand={brand}>
      <BrandExperience
        brand={brand}
        theme={theme}
        gameCount={games.length}
        dailyDone={Math.min(recents.length, UI.dailyMissionTarget)}
        dailyTotal={UI.dailyMissionTarget}
        menu={menu}
        setMenu={setMenu}
        setHelp={setHelp}
        user={user}
        onAccount={() => {
          track("join_click");
          setAccount(true);
        }}
        onHeroPlay={() => track("hero_play")}
        slots={{ hub, liveFeed: <LiveFeed />, library, social: <SocialProof />, reward }}
      />
      {active && <Demo game={active} onClose={() => setActive(null)} />}
      {account && <AccountPanel onClose={() => setAccount(false)} onUser={accountData} />}
      {onboarding && <Onboarding onDone={() => setOnboarding(false)} />}
      {help && <HelpCenter onClose={() => setHelp(false)} />}
      <SessionReminder />
      <ChatPanel />
      {notice && !active && !account && !onboarding && !help && (
        <div className="consent">
          <div>
            <b>{t("consent.title")}</b>
            <p>{t("consent.copy")}</p>
          </div>
          <button
            onClick={() => {
              setConsent(false);
              setNotice(false);
            }}
          >
            {t("consent.deny")}
          </button>
          <button
            className="join"
            onClick={() => {
              setConsent(true);
              setNotice(false);
              track("consent_granted");
            }}
          >
            {t("consent.allow")}
          </button>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <I18nProvider>
    <App />
  </I18nProvider>,
);
