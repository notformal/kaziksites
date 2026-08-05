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
import LanguageSwitcher from "./LanguageSwitcher";
import NotificationBell from "./NotificationBell";
import { useT } from "./i18n";

// Оболочка бренда. Она же и есть страница: контентные секции приходят через
// проп `slots`, поэтому в DOM ровно один хедер, один hero и один футер.
// Все подписи идут через t() — в этом файле нет ни одной зашитой строки UI.

function HeaderActions({ user, onAccount, menu, setMenu }) {
  const t = useT();
  return (
    <div className="actions">
      <LanguageSwitcher />
      {user && <NotificationBell />}
      <button className="iconBtn" aria-label={t("action.account")} onClick={onAccount}>
        <UserRound />
      </button>
      <button className="join" onClick={onAccount}>
        {user ? t("action.profile") : t("action.join")}
      </button>
      <button
        className="iconBtn mobile"
        aria-label={t("nav.help")}
        aria-expanded={menu}
        onClick={() => setMenu(!menu)}
      >
        {menu ? <X /> : <Menu />}
      </button>
    </div>
  );
}

function MobileLayers({ menu, setMenu, setHelp, onAccount }) {
  const t = useT();
  return (
    <>
      {menu && (
        <div className="mobileNav">
          <a href="#games" onClick={() => setMenu(false)}>{t("nav.games")}</a>
          <a href="#rewards" onClick={() => setMenu(false)}>{t("nav.rewards")}</a>
          <a href="#about" onClick={() => setMenu(false)}>{t("nav.about")}</a>
          <button className="navButton" onClick={() => { setHelp(true); setMenu(false); }}>
            {t("nav.help")}
          </button>
        </div>
      )}
      <div className="bottomNav">
        <a href="#top"><Home />{t("nav.home")}</a>
        <a href="#games"><Gamepad2 />{t("nav.games")}</a>
        <a href="#rewards"><Gift />{t("nav.rewards")}</a>
        <button onClick={onAccount}><UserRound />{t("nav.profile")}</button>
      </div>
    </>
  );
}

function TrustStrip({ gameCount }) {
  const t = useT();
  return (
    <section className="trust" aria-label={t("trust.serverVerified")}>
      <span><ShieldCheck /> {t("trust.serverVerified")}</span>
      <span><Gift /> {t("trust.dailyCollections")}</span>
      <span><Gamepad2 /> {t("trust.playableGames", { count: gameCount })}</span>
    </section>
  );
}

function Footer({ brand, theme, setHelp }) {
  const t = useT();
  return (
    <footer id="about">
      <a className="logo" href="#top"><Gamepad2 />{theme.name}</a>
      <p>{t("footer.tagline")}</p>
      <small>
        © 2026 {theme.name} · <a href={`./legal.html?brand=${brand}#privacy`}>Privacy</a> ·{" "}
        <a href={`./legal.html?brand=${brand}#responsible`}>Responsible play</a> ·{" "}
        <button className="helpLink" onClick={() => setHelp(true)}>
          <HelpCircle />{t("footer.help")}
        </button>{" "}
        · {t("footer.age")}
      </small>
    </footer>
  );
}

function HeroCopy({ brand, t, eyebrow, cta, secondary, onHeroPlay, children }) {
  return (
    <div className="heroCopy">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{t(`brand.${brand}.hero`)}</h1>
      {children ?? <p>{t(`brand.${brand}.copy`)}</p>}
      <div className="heroCtas">
        <a className="join big" href="#games" onClick={onHeroPlay}>
          {cta} <ChevronRight />
        </a>
        <a className="secondary howLink" href="#about">{secondary}</a>
      </div>
      <span className="online"><i /> {t(`brand.${brand}.badge`)}</span>
    </div>
  );
}

function AuroraShell(p) {
  const t = useT();
  return (
    <div className="brandExperience auroraExperience" data-layout={p.theme.layout}>
      <aside className="auroraRail" aria-label={t("nav.games")}>
        <a className="logo" href="#top"><Gamepad2 /><span>{p.theme.name}</span></a>
        <nav>
          <a href="#top">{t("nav.home")}</a>
          <a href="#games">{t("shell.liveNow")}</a>
          <a href="#games">{t("shell.slots")}</a>
          <a href="#games">{t("shell.instant")}</a>
          <a href="#games">{t("shell.table")}</a>
          <a href="#rewards">{t("shell.missions")}</a>
        </nav>
        <button className="navButton" onClick={() => p.setHelp(true)}>{t("shell.fairness")}</button>
      </aside>
      <div className="auroraWorkspace">
        <header className="auroraCommandBar">
          <a className="logo auroraMobileLogo" href="#top"><Gamepad2 /><span>{p.theme.name}</span></a>
          <a className="commandSearch" href="#games">
            <Search /><span>{t("shell.search", { count: p.gameCount })}</span><kbd>/</kbd>
          </a>
          <HeaderActions {...p} />
        </header>
        <MobileLayers {...p} />
        <section className="hero auroraStage" id="top">
          <div className="heroGlow" />
          <HeroCopy
            brand={p.brand}
            t={t}
            eyebrow={t(`brand.${p.brand}.tag`)}
            cta={t("hero.playSignal")}
            secondary={t("hero.howItWorks")}
            onHeroPlay={p.onHeroPlay}
          />
          <div className="heroVisual" data-module="featured-broadcast">
            <div className="orb"><span>7</span><span>★</span><span>♛</span></div>
          </div>
          <aside className="auroraMission" aria-label={t("shell.dailyEyebrow")}>
            <small>{t("shell.dailyEyebrow")}</small>
            <b>{t("shell.dailyTitle")}</b>
            <span>{t("shell.dailyProgress", { done: p.dailyDone, total: p.dailyTotal })}</span>
          </aside>
        </section>
        <TrustStrip gameCount={p.gameCount} />
        <div className="auroraContinue" data-module="continue-rail">
          <span>01</span>
          <b>{t("shell.continueTitle")}</b>
          <span>{t("shell.continueCopy")}</span>
        </div>
        {p.slots.hub}
        {p.slots.liveFeed}
        {p.slots.library}
        {p.slots.social}
        {p.slots.reward}
        <Footer {...p} />
      </div>
    </div>
  );
}

function EmberShell(p) {
  const t = useT();
  return (
    <div className="brandExperience emberExperience" data-layout={p.theme.layout}>
      <header className="emberHeader">
        <a className="logo" href="#top"><span>{p.theme.name}</span></a>
        <nav>
          <a href="#top">{t("ember.tonight")}</a>
          <a href="#games">{t("nav.games")}</a>
          <a href="#rewards">{t("ember.drops")}</a>
          <a href="#about">{t("ember.club")}</a>
          <button className="navButton" onClick={() => p.setHelp(true)}>{t("nav.help")}</button>
        </nav>
        <HeaderActions {...p} />
      </header>
      <MobileLayers {...p} />
      <section className="hero emberTakeover" id="top">
        <div className="heroVisual" data-module="tonight-takeover">
          <div className="orb"><span>7</span><span>★</span><span>♛</span></div>
        </div>
        <div className="heroGlow" />
        <HeroCopy
          brand={p.brand}
          t={t}
          eyebrow={t("ember.heroEyebrow")}
          cta={t("ember.enter")}
          secondary={t("ember.theClub")}
          onHeroPlay={p.onHeroPlay}
        />
      </section>
      <div className="emberTicker" aria-label={t("ember.tonight")}>
        <span>{t("ember.tonight")}</span>
        <b>{t("ember.tickerOriginals")}</b>
        <span>{t("ember.tickerCredits")}</span>
        <b>{t("ember.tickerNoPurchase")}</b>
      </div>
      {p.slots.hub}
      <section className="emberPosterIntro">
        <span className="eyebrow">{t("ember.posterEyebrow")}</span>
        <h2>{t("ember.posterTitle")}</h2>
      </section>
      {p.slots.liveFeed}
      {p.slots.library}
      <div className="emberSocialChapter">{p.slots.social}</div>
      <TrustStrip gameCount={p.gameCount} />
      {p.slots.reward}
      <div className="emberMemberDock">
        <span>{t("ember.clubAccess")}</span>
        <b>{p.user ? t("ember.nightSaved") : t("ember.joinStreak")}</b>
        <button className="join" onClick={p.onAccount}>
          {p.user ? t("ember.openProfile") : t("action.join")}
        </button>
      </div>
      <Footer {...p} />
    </div>
  );
}

function RoyaleShell(p) {
  const t = useT();
  return (
    <div className="brandExperience royaleExperience" data-layout={p.theme.layout}>
      <header className="royaleMasthead">
        <nav>
          <a href="#games">{t("royale.collection")}</a>
          <a href="#games">{t("royale.salon")}</a>
          <a href="#rewards">{t("royale.newEditions")}</a>
        </nav>
        <a className="logo" href="#top"><span>{p.theme.name}</span></a>
        <div className="mastheadActions">
          <button className="navButton" onClick={() => p.setHelp(true)}>{t("royale.journal")}</button>
          <HeaderActions {...p} />
        </div>
      </header>
      <MobileLayers {...p} />
      <section className="hero royaleCover" id="top">
        <HeroCopy
          brand={p.brand}
          t={t}
          eyebrow={`${t("royale.issue")} · ${t(`brand.${p.brand}.tag`)}`}
          cta={t("royale.openCollection")}
          secondary={t("royale.curatorsNote")}
          onHeroPlay={p.onHeroPlay}
        >
          <p className="royaleCuratorNote">
            {t("royale.curatorIntro")} {t(`brand.${p.brand}.copy`)}
          </p>
        </HeroCopy>
        <div className="heroVisual" data-module="curators-still-life">
          <div className="orb"><span>VII</span><span>♛</span><span>◆</span></div>
        </div>
      </section>
      <section className="royaleSalons" aria-label={t("royale.salon")}>
        <article><span>01</span><b>{t("royale.salonChance")}</b></article>
        <article><span>02</span><b>{t("royale.salonMechanisms")}</b></article>
        <article><span>03</span><b>{t("royale.salonAfterDark")}</b></article>
      </section>
      {p.slots.hub}
      {p.slots.liveFeed}
      {p.slots.library}
      <div className="royaleJournal">
        <span className="eyebrow">{t("royale.journalEyebrow")}</span>
        {p.slots.social}
      </div>
      {p.slots.reward}
      <TrustStrip gameCount={p.gameCount} />
      <Footer {...p} />
    </div>
  );
}

const SHELLS = { aurora: AuroraShell, ember: EmberShell, royale: RoyaleShell };

export default function BrandExperience(props) {
  const Shell = SHELLS[props.brand] || AuroraShell;
  return <Shell {...props} />;
}
