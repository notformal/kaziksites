// Header language picker. Lists every locale from the catalog; switching is
// instant (context re-render) and persisted by the provider.
import React, { useState } from "react";
import { Globe } from "lucide-react";
import { LOCALES } from "./locales";
import { useI18n } from "./i18n";
import "./language-switcher.css";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const codes = Object.keys(LOCALES);
  return (
    <div className="lang">
      <button
        className="iconBtn lang__btn"
        aria-label={t("lang.label")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Globe />
        <span className="lang__code">{locale.toUpperCase()}</span>
      </button>
      {open && (
        <>
          <div className="lang__scrim" onClick={() => setOpen(false)} />
          <ul className="lang__menu" role="listbox" aria-label={t("lang.label")}>
            {codes.map((code) => (
              <li key={code}>
                <button
                  role="option"
                  aria-selected={code === locale}
                  className={`lang__opt${code === locale ? " lang__opt--active" : ""}`}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                >
                  <span className="lang__flag">{LOCALES[code].flag}</span>
                  {LOCALES[code].native}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
