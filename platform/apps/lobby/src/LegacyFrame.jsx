import React from "react";
export default function LegacyFrame({ game, onLoad }) {
  const origin = import.meta.env.VITE_GAME_ORIGIN || location.origin;
  const path = game.url.replace(/^\.\//, "/");
  return (
    <iframe
      title={game.title}
      src={`${origin}${path}`}
      sandbox="allow-scripts allow-same-origin"
      onLoad={onLoad}
    />
  );
}
