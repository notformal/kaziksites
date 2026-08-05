// Floating public lobby chat. Reads over SSE for everyone; posting requires a
// session (input disabled otherwise). Collapsible dock, bottom-right.
import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { api, apiBase } from "./api";
import { useT } from "./i18n";
import "./chat.css";

const CHAT_MAX = 280;

export default function ChatPanel() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const seen = useRef(new Set());
  const listRef = useRef(null);
  const authed = api.hasSession();

  useEffect(() => {
    let es;
    const add = (raw) => {
      let m;
      try {
        m = JSON.parse(raw);
      } catch {
        return;
      }
      if (seen.current.has(m.id)) return;
      seen.current.add(m.id);
      setMessages((prev) => [...prev, m].slice(-100));
    };
    try {
      es = new EventSource(`${apiBase}/chat/feed`);
      es.addEventListener("message", (e) => add(e.data));
    } catch {
      /* SSE missing — fall back to a one-shot recent fetch */
      api.chatRecent().then((r) => r.messages.forEach((m) => add(JSON.stringify(m)))).catch(() => {});
    }
    return () => es && es.close();
  }, []);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { message } = await api.chatSend(body);
      if (message && !seen.current.has(message.id)) {
        seen.current.add(message.id);
        setMessages((prev) => [...prev, message].slice(-100));
      }
      setDraft("");
    } catch {
      /* keep the draft so the player can retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`chat${open ? " chat--open" : ""}`}>
      {open ? (
        <div className="chat__win" role="dialog" aria-label={t("chat.title")}>
          <header className="chat__head">
            <MessageCircle size={16} />
            <span>{t("chat.title")}</span>
            <button className="chat__close" aria-label="Close chat" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </header>
          <div className="chat__list" ref={listRef}>
            {messages.length === 0 && <p className="chat__empty">{t("chat.empty")}</p>}
            {messages.map((m) => (
              <div className="chat__msg" key={m.id}>
                <b className="chat__name">{m.name}</b>
                <span className="chat__text">{m.body}</span>
              </div>
            ))}
          </div>
          <form className="chat__form" onSubmit={send}>
            <input
              value={draft}
              maxLength={CHAT_MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={authed ? t("chat.placeholder") : t("chat.signin")}
              aria-label={t("chat.title")}
              disabled={!authed || sending}
            />
            <button type="submit" aria-label="Send" disabled={!authed || sending || !draft.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <button className="chat__fab" aria-label="Open lobby chat" onClick={() => setOpen(true)}>
          <MessageCircle />
        </button>
      )}
    </div>
  );
}
