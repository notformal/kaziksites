import React, { useEffect, useState } from "react";
import { ChevronRight, Clock, HelpCircle, X } from "lucide-react";
import { useT } from "./i18n";
import { UI } from "./ui.config";
import "./trust-ux.css";

const ONBOARDING = "casino_onboarding_v1",
  START = "casino_session_started",
  REMINDER = "casino_session_reminder_minutes";

// Шаги онбординга и интервалы напоминания — данные, не разметка. Тексты берутся
// из locales.js по ключам, поэтому шаг добавляется одной строкой здесь + ключами.
const ONBOARDING_STEPS = ["onboarding.step1", "onboarding.step2", "onboarding.step3"];
const REMINDER_MINUTES = [15, 30, 60];
const DEFAULT_REMINDER = "30";
const HELP_TOPICS = [1, 2, 3, 4, 5];

export function Onboarding({ onDone }) {
  const t = useT();
  const [step, setStep] = useState(0);
  const done = () => {
    localStorage.setItem(ONBOARDING, "done");
    onDone();
  };
  const total = ONBOARDING_STEPS.length;
  const last = step === total - 1;
  return (
    <div className="modal trustModal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="trustCard">
        <button className="close" onClick={done} aria-label={t("onboarding.skip")}>
          <X />
        </button>
        <small>{t("onboarding.welcome", { step: step + 1, total })}</small>
        <h2 id="onboarding-title">{t(`${ONBOARDING_STEPS[step]}.title`)}</h2>
        <p>{t(`${ONBOARDING_STEPS[step]}.copy`)}</p>
        <div className="stepDots" aria-label={t("onboarding.stepAria", { step: step + 1, total })}>
          {ONBOARDING_STEPS.map((key, i) => (
            <i key={key} className={i === step ? "active" : ""} />
          ))}
        </div>
        <button autoFocus className="join wide" onClick={() => (last ? done() : setStep((x) => x + 1))}>
          {last ? t("onboarding.start") : t("onboarding.next")}
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

export const needsOnboarding = () => localStorage.getItem(ONBOARDING) !== "done";

export function HelpCenter({ onClose }) {
  const t = useT();
  const [minutes, setMinutes] = useState(() => localStorage.getItem(REMINDER) || DEFAULT_REMINDER);
  const update = (e) => {
    setMinutes(e.target.value);
    localStorage.setItem(REMINDER, e.target.value);
    sessionStorage.setItem(START, String(Date.now()));
  };
  return (
    <div className="modal trustModal" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="trustCard helpCard">
        <button autoFocus className="close" onClick={onClose} aria-label={t("help.close")}>
          <X />
        </button>
        <HelpCircle className="trustIcon" />
        <small>{t("help.eyebrow")}</small>
        <h2 id="help-title">{t("help.title")}</h2>
        {HELP_TOPICS.map((n) => (
          <details key={n} open={n === 1}>
            <summary>{t(`help.q${n}`)}</summary>
            <p>{t(`help.a${n}`, { credits: UI.dailyRewardCredits })}</p>
          </details>
        ))}
        <label className="reminderSetting">
          <Clock />
          <span>
            <b>{t("help.reminder")}</b>
            <small>{t("help.reminderNote")}</small>
          </span>
          <select value={minutes} onChange={update} aria-label={t("help.reminderAria")}>
            {REMINDER_MINUTES.map((value) => (
              <option key={value} value={String(value)}>
                {t("help.minutes", { count: value })}
              </option>
            ))}
            <option value="off">{t("help.minutesOff")}</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function SessionReminder() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem(START)) sessionStorage.setItem(START, String(Date.now()));
    if (!localStorage.getItem(REMINDER)) localStorage.setItem(REMINDER, DEFAULT_REMINDER);
    const check = () => {
      const setting = localStorage.getItem(REMINDER);
      if (setting === "off") return;
      const elapsed = Date.now() - Number(sessionStorage.getItem(START) || Date.now());
      if (elapsed >= Number(setting) * 60_000) setVisible(true);
    };
    check();
    const timer = setInterval(check, 30_000);
    return () => clearInterval(timer);
  }, []);
  if (!visible) return null;
  const reset = () => {
    sessionStorage.setItem(START, String(Date.now()));
    setVisible(false);
  };
  return (
    <div className="modal trustModal" role="dialog" aria-modal="true" aria-labelledby="break-title">
      <div className="trustCard">
        <Clock className="trustIcon" />
        <small>{t("reminder.eyebrow")}</small>
        <h2 id="break-title">{t("reminder.title")}</h2>
        <p>{t("reminder.copy")}</p>
        <button autoFocus className="join wide" onClick={reset}>
          {t("reminder.continue")}
        </button>
        <button className="textBtn" onClick={() => location.assign("about:blank")}>
          {t("reminder.leave")}
        </button>
      </div>
    </div>
  );
}
