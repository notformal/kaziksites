// Header notification bell: unread badge + dropdown, live over SSE. Only mounted
// for signed-in players (the feed is auth-gated). Silent no-op if SSE is missing.
import React, { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { api, apiBase } from "./api";
import { useT } from "./i18n";
import { pushSupported, pushState, enablePush, disablePush } from "./push";
import "./notifications.css";

const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell() {
  const t = useT();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [push, setPush] = useState({ supported: false, enabled: false });
  const [pushBusy, setPushBusy] = useState(false);
  const seen = useRef(new Set());

  useEffect(() => {
    if (pushSupported()) pushState().then(setPush).catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (push.enabled) await disablePush();
      else await enablePush();
      setPush(await pushState());
    } catch {
      /* denied / unsupported — leave state as-is */
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    let closed = false;
    api
      .notifications()
      .then((r) => {
        if (closed) return;
        r.notifications.forEach((n) => seen.current.add(n.id));
        setItems(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => {});
    let es;
    try {
      es = new EventSource(`${apiBase}/notifications/feed`, { withCredentials: true });
      es.addEventListener("notification", (e) => {
        let n;
        try {
          n = JSON.parse(e.data);
        } catch {
          return;
        }
        if (seen.current.has(n.id)) return;
        seen.current.add(n.id);
        setItems((prev) => [n, ...prev].slice(0, 50));
        setUnread((u) => u + 1);
      });
    } catch {
      /* EventSource unavailable — the list still loads once via fetch above */
    }
    return () => {
      closed = true;
      es && es.close();
    };
  }, []);

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    try {
      await api.notificationsRead();
    } catch {
      /* optimistic; a reload reconciles */
    }
  };

  return (
    <div className="notif">
      <button
        className="iconBtn notif__btn"
        aria-label={`${t("notif.title")}${unread ? `, ${unread}` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell />
        {unread > 0 && <span className="notif__badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="notif__scrim" onClick={() => setOpen(false)} />
          <div className="notif__panel" role="dialog" aria-label={t("notif.title")}>
            <header className="notif__head">
              <strong>{t("notif.title")}</strong>
              {unread > 0 && (
                <button className="notif__markall" onClick={markAll}>
                  <Check size={14} /> {t("notif.markAll")}
                </button>
              )}
            </header>
            <div className="notif__list">
              {items.length === 0 && <p className="notif__empty">{t("notif.empty")}</p>}
              {items.map((n) => (
                <div className={`notif__item${n.read ? "" : " notif__item--unread"}`} key={n.id}>
                  <div className="notif__title">{n.title}</div>
                  {n.body && <div className="notif__body">{n.body}</div>}
                  <div className="notif__time">{ago(n.at)}</div>
                </div>
              ))}
            </div>
            {push.supported && !push.denied && (
              <button className="notif__push" onClick={togglePush} disabled={pushBusy}>
                <BellRing size={14} /> {push.enabled ? t("push.disable") : t("push.enable")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
