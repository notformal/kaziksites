import React, { useEffect, useMemo, useRef, useState } from "react";
import { GameHost } from "@nova/game-sdk/host";
import { api } from "./api";
import { track } from "./analytics";
import "./secure-game.css";
export default function GameFrame({ game, theme, locale = "en" }) {
  const iframeRef = useRef(null),
    hostRef = useRef(null),
    [status, setStatus] = useState("Loading secure game…");
  const gameOrigin = import.meta.env.VITE_GAME_ORIGIN || location.origin;
  const src = useMemo(() => {
    const query = new URLSearchParams({ parentOrigin: location.origin, locale });
    if (game.titleId) query.set("title", game.titleId);
    // Бандл может обслуживать несколько математических движков (slots-premium):
    // конкретный выбирается engineId, титул — titleId. Поля независимы, поэтому
    // slots-studio (только titleId) продолжает открываться ровно как раньше.
    if (game.engineId) query.set("engine", game.engineId);
    return `${gameOrigin}/games/${game.engineSlug || game.slug}/index.html?${query}`;
  }, [game.slug, game.engineSlug, game.titleId, game.engineId, gameOrigin, locale]);
  useEffect(() => {
    if (!iframeRef.current) return;
    const host = new GameHost({
      iframe: iframeRef.current,
      gameOrigin,
      api,
      gameId: game.slug,
      theme,
      locale,
    });
    hostRef.current = host;
    return () => {
      host.destroy();
      hostRef.current = null;
    };
  }, [game.slug, gameOrigin, theme, locale]);
  const loaded = async () => {
    const started=performance.now();
    try {
      await hostRef.current?.initialize();
      setStatus("");
      track("game_ready",{loadMs:Math.round(performance.now()-started)},{gameId:game.id||game.slug});
    } catch {
      setStatus("Sign in to play with virtual credits");
    }
  };
  return (
    <div className="secureGame">
      {status && <span>{status}</span>}
      <iframe
        ref={iframeRef}
        title={game.title}
        src={src}
        onLoad={loaded}
        sandbox="allow-scripts allow-same-origin"
        allow="fullscreen"
      />
    </div>
  );
}
