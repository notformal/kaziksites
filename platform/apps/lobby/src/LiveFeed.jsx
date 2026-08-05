// Live wins ticker — subscribes to the SSE feed (/api/live/feed) and shows a
// marquee of recent aliased wins. Public social proof: renders for everyone,
// silently renders nothing until the first win arrives or if SSE is unavailable.
import React, { useEffect, useRef, useState } from "react";
import { useT } from "./i18n";
import "./live-feed.css";

const API = import.meta.env.VITE_API_URL || "/api";
const LABELS = {
  dice: "Dice",
  limbo: "Limbo",
  wheel: "Wheel of Fortune",
  mines: "Mines",
  hilo: "Hi-Lo",
  sicbo: "Sic Bo",
  baccarat: "Baccarat",
  "roulette-us": "Roulette",
  roulette: "Roulette",
  blackjack: "Blackjack",
  holdem: "Hold'em",
  videopoker: "Video Poker",
  crash: "Crash",
  plinko: "Plinko",
  keno: "Keno",
  "slots-classic": "Slots",
};
const label = (id) => LABELS[id] || "a game";
const fmt = (n) => Number(n || 0).toLocaleString("en-US");

export default function LiveFeed() {
  const t = useT();
  const [wins, setWins] = useState([]);
  const seen = useRef(new Set());

  useEffect(() => {
    let es;
    const add = (raw) => {
      let w;
      try {
        w = JSON.parse(raw);
      } catch {
        return;
      }
      if (!w || seen.current.has(w.id)) return;
      seen.current.add(w.id);
      setWins((prev) => [w, ...prev].slice(0, 15));
    };
    try {
      es = new EventSource(`${API}/live/feed`);
      es.addEventListener("win", (e) => add(e.data));
    } catch {
      /* EventSource unavailable (SSR / old browser) — ticker stays hidden */
    }
    return () => es && es.close();
  }, []);

  if (!wins.length) return null;
  // Duplicate the list so the marquee scrolls seamlessly.
  const items = [...wins, ...wins];
  return (
    <div className="liveFeed" role="log" aria-label={t("live.title")} aria-live="off">
      <span className="liveFeed__badge">
        <span className="liveFeed__dot" /> {t("live.title")}
      </span>
      <div className="liveFeed__viewport">
        <div className="liveFeed__track">
          {items.map((w, i) => (
            <span className="liveFeed__item" key={`${w.id}-${i}`}>
              {t("live.won", { name: w.alias, amount: fmt(w.win), game: label(w.gameId) })}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
