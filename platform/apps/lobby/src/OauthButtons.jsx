// Social-login buttons on the auth form. Fetches the configured providers and
// renders one button each; renders nothing when none are configured (the default
// deployment), so it is invisible until an operator wires a provider.
import React, { useEffect, useState } from "react";
import { LogIn } from "lucide-react";
import { api, apiBase } from "./api";
import { useT } from "./i18n";
import "./oauth.css";

export default function OauthButtons() {
  const t = useT();
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let live = true;
    api
      .oauthProviders()
      .then((r) => live && setProviders(r.providers || []))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!providers.length) return null;
  return (
    <div className="oauth">
      <div className="oauth__divider"><span>or</span></div>
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          className="oauth__btn"
          onClick={() => {
            window.location.href = `${apiBase}/auth/oauth/${encodeURIComponent(p.id)}/start`;
          }}
        >
          <LogIn size={16} /> {t("oauth.continue", { provider: p.label })}
        </button>
      ))}
    </div>
  );
}
