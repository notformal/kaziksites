import React, { useEffect, useState } from "react";
import { Activity, Trophy } from "lucide-react";
import { api } from "./api";
import { games } from "./catalog";
import { useT } from "./i18n";
import { UI } from "./ui.config";
import "./social-proof.css";

const labels = new Map(games.map((g) => [g.id, g.title]));

export default function SocialProof() {
  const t = useT();
  const [period, setPeriod] = useState(UI.leaderboardPeriods[0].id),
    [activity, setActivity] = useState(null),
    [board, setBoard] = useState(null);
  useEffect(() => {
    let live = true;
    api
      .socialActivity()
      .then((x) => live && setActivity(x))
      .catch(() => live && setActivity({ available: false, games: [] }));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    let live = true;
    setBoard(null);
    api
      .leaderboard(period)
      .then((x) => live && setBoard(x))
      .catch(() => live && setBoard({ available: false, entries: [] }));
    return () => {
      live = false;
    };
  }, [period]);
  return (
    <section className="socialProof" id="community" aria-labelledby="community-title">
      <div className="sectionHead">
        <div>
          <span className="eyebrow">{t("social.eyebrow")}</span>
          <h2 id="community-title">{t("social.title")}</h2>
        </div>
        <p>{t("social.subtitle")}</p>
      </div>
      <div className="socialColumns">
        <article className="activityPanel">
          <header>
            <Activity />
            <div>
              <b>{t("social.last24")}</b>
              <small>{t("social.threshold", { count: UI.privacyThreshold })}</small>
            </div>
          </header>
          {activity?.available ? (
            <>
              <div className="activityTotals">
                <strong>{activity.rounds.toLocaleString()}</strong>
                <span>{t("social.settledRounds")}</span>
                <strong>{activity.players}</strong>
                <span>{t("social.anonPlayers")}</span>
              </div>
              <ul>
                {activity.games.map((g) => (
                  <li key={g.gameId}>
                    <span>{labels.get(g.gameId) || g.gameId}</span>
                    <b>{t("social.rounds", { count: g.rounds })}</b>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="privateEmpty">{t("social.activityEmpty")}</p>
          )}
        </article>
        <article className="leaderPanel">
          <header>
            <Trophy />
            <div>
              <b>{t("social.leaderboard")}</b>
              <small>{t("social.leaderSub")}</small>
            </div>
          </header>
          <div className="periodTabs" role="group" aria-label={t("social.period")}>
            {UI.leaderboardPeriods.map(({ id, labelKey }) => (
              <button key={id} className={period === id ? "active" : ""} onClick={() => setPeriod(id)}>
                {t(labelKey)}
              </button>
            ))}
          </div>
          {board?.available ? (
            <ol>
              {board.entries.slice(0, 5).map((x) => (
                <li key={x.alias}>
                  <i>{x.rank}</i>
                  <span>
                    {x.alias}
                    <small>{t("social.rounds", { count: x.rounds })}</small>
                  </span>
                  <b>{t("social.credits", { count: x.creditsWon.toLocaleString() })}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="privateEmpty">{t("social.leaderEmpty", { count: UI.privacyThreshold })}</p>
          )}
        </article>
      </div>
    </section>
  );
}
