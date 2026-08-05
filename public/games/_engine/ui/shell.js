/**
 * ═══════════════════════════════════════════════════════════
 * GAME SHELL — the HTML/CSS chrome around the canvas board.
 *
 * The reels, particles and win animations are PIXI. Everything a player *reads
 * or operates* — balance, stake, buttons, paytable, language picker — is real
 * DOM. That split is deliberate: canvas text does not scale with the OS font
 * size, cannot be reached by a screen reader and cannot be tabbed to, and a
 * casino UI that fails those tests is not shippable.
 *
 * All colour comes from CSS custom properties written from the game's theme,
 * so a re-skin never touches a stylesheet.
 * ═══════════════════════════════════════════════════════════
 */

import { BETTING, AUTOPLAY } from '../config/engine.config.js';
import { LANGUAGE_NAMES } from '../core/i18n.js';

const hex = (v) => `#${(v >>> 0).toString(16).padStart(6, '0')}`;

const STYLE_ID = 'kz-slot-shell-style';

/** Injected once per document however many games are embedded. */
const CSS = `
.kz-shell{--kz-gap:12px;position:relative;width:100%;height:100%;display:flex;flex-direction:column;
  background:radial-gradient(120% 90% at 50% 0%,var(--kz-panel),var(--kz-bg-deep) 70%),var(--kz-bg);
  color:var(--kz-text);font-family:"Segoe UI",system-ui,-apple-system,sans-serif;overflow:hidden;
  -webkit-user-select:none;user-select:none}
.kz-shell *{box-sizing:border-box}
/* Reset only — deliberately no \`background\` here. A bare \`.kz-shell button\`
   rule outranks the single-class component rules below on specificity and
   would silently strip their backgrounds. */
.kz-shell button{font:inherit;color:inherit;cursor:pointer;border:0}
.kz-shell button:disabled{cursor:not-allowed;opacity:.45}
.kz-shell button:focus-visible,.kz-shell select:focus-visible{outline:2px solid var(--kz-accent);outline-offset:2px}

.kz-top{display:flex;align-items:center;gap:var(--kz-gap);padding:10px clamp(10px,2vw,20px);
  border-bottom:1px solid var(--kz-line);flex-wrap:wrap}
.kz-title{font-weight:800;letter-spacing:-.02em;font-size:clamp(14px,2.2vw,19px);margin-right:auto;
  display:flex;align-items:center;gap:8px}
.kz-title i{width:9px;height:9px;border-radius:50%;background:var(--kz-accent);
  box-shadow:0 0 10px var(--kz-accent);display:block}
.kz-stat{display:flex;flex-direction:column;line-height:1.15;min-width:78px}
.kz-stat small{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--kz-text-dim)}
.kz-stat b{font-size:clamp(13px,1.9vw,17px);font-variant-numeric:tabular-nums}
.kz-stat.kz-win b{color:var(--kz-accent)}

.kz-board{position:relative;flex:1;min-height:0;display:grid;place-items:center;padding:var(--kz-gap)}
.kz-board canvas{display:block;max-width:100%;max-height:100%;border-radius:14px}

.kz-banner{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:4;
  background:var(--kz-accent);color:#0b0c12;font-weight:800;font-size:12px;letter-spacing:.1em;
  padding:8px 16px;border-radius:999px;box-shadow:0 8px 24px #0007;white-space:nowrap}

.kz-bottom{display:flex;align-items:center;gap:var(--kz-gap);padding:12px clamp(10px,2vw,20px);
  border-top:1px solid var(--kz-line);flex-wrap:wrap;justify-content:center}
.kz-betgroup{display:flex;align-items:center;gap:6px;background:var(--kz-panel);border:1px solid var(--kz-line);
  border-radius:12px;padding:6px}
.kz-betgroup button{width:34px;height:34px;border-radius:8px;background:var(--kz-panel-lite);font-weight:800;font-size:17px}
.kz-betgroup button:not(:disabled):hover{background:var(--kz-accent);color:#0b0c12}
.kz-betval{min-width:74px;text-align:center;font-variant-numeric:tabular-nums;font-weight:700}
.kz-betval small{display:block;font-size:9px;letter-spacing:.12em;color:var(--kz-text-dim);text-transform:uppercase}

.kz-spin{width:clamp(76px,11vw,96px);aspect-ratio:1;border-radius:50%;background:var(--kz-accent);
  color:#0b0c12;font-weight:900;font-size:12px;letter-spacing:.12em;text-transform:uppercase;
  box-shadow:0 6px 26px color-mix(in srgb,var(--kz-accent) 45%,transparent);transition:transform .12s}
.kz-spin:not(:disabled):hover{transform:scale(1.05)}
.kz-spin:not(:disabled):active{transform:scale(.96)}
.kz-spin[data-busy="true"]{background:var(--kz-danger)}

.kz-tool{height:38px;padding:0 13px;border-radius:10px;background:var(--kz-panel);
  border:1px solid var(--kz-line);font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.kz-tool[aria-pressed="true"]{background:var(--kz-accent);color:#0b0c12;border-color:var(--kz-accent)}
.kz-tool:not(:disabled):hover{border-color:var(--kz-accent)}
.kz-shell select.kz-tool{-webkit-appearance:none;appearance:none;text-transform:none;letter-spacing:0;padding-right:26px;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 15px) 17px,calc(100% - 10px) 17px;background-size:5px 5px;background-repeat:no-repeat}

.kz-modal{position:absolute;inset:0;z-index:10;background:#04060bd9;backdrop-filter:blur(8px);
  display:grid;place-items:center;padding:16px}
.kz-modal[hidden]{display:none}
.kz-sheet{background:var(--kz-panel);border:1px solid var(--kz-line);border-radius:16px;
  width:min(660px,100%);max-height:100%;overflow:auto;padding:20px;box-shadow:0 30px 80px #000a}
.kz-sheet h2{margin:0 0 4px;font-size:19px}
.kz-sheet .kz-sub{margin:0 0 16px;color:var(--kz-text-dim);font-size:12px}
.kz-paytable{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.kz-pay{display:flex;gap:10px;align-items:center;background:var(--kz-cell);border:1px solid var(--kz-line);
  border-radius:11px;padding:9px}
.kz-pay canvas{width:46px;height:46px;flex:none}
.kz-pay div{min-width:0}
.kz-pay b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kz-pay span{display:block;font-size:11px;color:var(--kz-text-dim);font-variant-numeric:tabular-nums}
.kz-note{margin-top:14px;padding:11px;border-radius:10px;background:var(--kz-cell);font-size:11px;
  color:var(--kz-text-dim);line-height:1.6}
.kz-facts{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 14px;padding:0;list-style:none}
.kz-facts li{font-size:11px;color:var(--kz-text-dim)}
.kz-facts b{display:block;color:var(--kz-text);font-size:14px;font-variant-numeric:tabular-nums}
.kz-close{position:sticky;top:0;float:right;width:32px;height:32px;border-radius:8px;background:var(--kz-cell);font-size:16px}

.kz-toast{position:absolute;left:50%;bottom:18px;transform:translate(-50%,20px);z-index:8;
  background:var(--kz-panel);border:1px solid var(--kz-accent);border-radius:11px;padding:10px 16px;
  font-size:12px;font-weight:700;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;
  box-shadow:0 12px 40px #0009}
.kz-toast[data-show="true"]{opacity:1;transform:translate(-50%,0)}


/* ── Dice layout ─────────────────────────────────────────── */
.kz-dice-board{display:flex;flex-direction:column;gap:18px;width:100%;height:100%;padding:6px 0;
  align-items:center;justify-content:center}
.kz-dice-stage{flex:none;display:grid;place-items:center;width:100%}
.kz-dice-stage canvas{display:block;border-radius:14px;max-width:100%}
.kz-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;width:100%;
  max-width:940px;align-content:center}
.kz-cellbtn{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  background:var(--kz-cell);border:1px solid var(--kz-line);border-radius:11px;padding:9px 4px;transition:.15s}
.kz-cellbtn:hover:not(:disabled){border-color:var(--kz-accent);transform:translateY(-2px)}
.kz-cellbtn b{font-size:clamp(15px,2.4vw,20px);font-weight:800;line-height:1}
.kz-cellbtn span{font-size:10px;color:var(--kz-text-dim);font-variant-numeric:tabular-nums}
.kz-cellbtn[data-struck="true"]{border-color:var(--kz-accent);box-shadow:0 0 0 1px var(--kz-accent),0 0 22px -4px var(--kz-accent)}
.kz-cellbtn[data-struck="true"] span{color:var(--kz-accent);font-weight:800}
.kz-cellbtn[data-win="true"]{background:var(--kz-accent);color:#0b0c12}
.kz-cellbtn[data-win="true"] span{color:#0b0c12}
.kz-stakechip[hidden]{display:none}
.kz-stakechip{position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;
  background:var(--kz-accent);color:#0b0c12;font-size:10px;font-weight:800;display:grid;place-items:center;
  font-variant-numeric:tabular-nums}
@media (max-width:640px){.kz-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}

@media (max-width:560px){
  .kz-stat{min-width:62px}
  .kz-bottom{gap:8px}
  .kz-tool{height:34px;padding:0 10px;font-size:10px}
}
`;

/**
 * Inject the shared chrome stylesheet, once per document.
 *
 * Exported because the dice game builds its own markup rather than the slot
 * layout, but wears exactly the same chrome — two stylesheets for one visual
 * language is how a product starts looking like two products.
 */
export function ensureShellStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

/** Write a theme's colours onto an element as CSS custom properties. */
export function applyThemeVars(root, theme) {
  root.style.setProperty('--kz-bg', hex(theme.background));
  root.style.setProperty('--kz-bg-deep', hex(theme.backgroundDeep));
  root.style.setProperty('--kz-panel', hex(theme.panel));
  root.style.setProperty('--kz-panel-lite', hex(theme.panelLight));
  root.style.setProperty('--kz-cell', hex(theme.cell));
  root.style.setProperty('--kz-accent', hex(theme.accent.base));
  root.style.setProperty('--kz-text', hex(theme.text));
  root.style.setProperty('--kz-text-dim', hex(theme.textDim));
  root.style.setProperty('--kz-danger', hex(theme.danger));
  root.style.setProperty('--kz-line', '#ffffff1f');
  return root;
}

const ensureStyle = ensureShellStyle;

/**
 * Build the shell.
 *
 * @param {object} args
 * @param {HTMLElement} args.parent
 * @param {object} args.theme       built theme (packed colours)
 * @param {string} args.title
 * @param {(k:string)=>string} args.t translator
 * @param {string} args.language
 * @returns {object} element handles plus update helpers
 */
export function createShell({ parent, theme, title, t, language }) {
  ensureStyle();

  const root = applyThemeVars(document.createElement('div'), theme);
  root.className = 'kz-shell';

  const langOptions = Object.entries(LANGUAGE_NAMES)
    .map(([code, name]) => `<option value="${code}"${code === language ? ' selected' : ''}>${name}</option>`)
    .join('');

  const betOptions = AUTOPLAY.roundOptions
    .map((n) => `<option value="${n}">${n}</option>`)
    .join('');

  root.innerHTML = `
    <header class="kz-top">
      <span class="kz-title"><i></i>${title}</span>
      <span class="kz-stat"><small data-i18n="balance"></small><b data-field="balance">0</b></span>
      <span class="kz-stat"><small data-i18n="bet"></small><b data-field="bet">0</b></span>
      <span class="kz-stat kz-win"><small data-i18n="win"></small><b data-field="win">0</b></span>
    </header>

    <div class="kz-board" data-role="board">
      <div class="kz-banner" data-role="banner" hidden></div>
    </div>

    <footer class="kz-bottom">
      <button class="kz-tool" data-action="paytable" data-i18n="paytable"></button>
      <button class="kz-tool" data-action="sound" aria-pressed="false" data-i18n="sound"></button>
      <div class="kz-betgroup">
        <button data-action="bet-down" aria-label="Decrease bet">−</button>
        <span class="kz-betval"><small data-i18n="bet"></small><span data-field="betValue">0</span></span>
        <button data-action="bet-up" aria-label="Increase bet">+</button>
      </div>
      <button class="kz-spin" data-action="spin" data-i18n="spin"></button>
      <button class="kz-tool" data-action="turbo" aria-pressed="false" data-i18n="turbo"></button>
      <button class="kz-tool" data-action="auto" aria-pressed="false" data-i18n="auto"></button>
      <select class="kz-tool" data-action="autoRounds" aria-label="Autoplay rounds">${betOptions}</select>
      <select class="kz-tool" data-action="language" aria-label="Language">${langOptions}</select>
    </footer>

    <div class="kz-modal" data-role="paytableModal" hidden role="dialog" aria-modal="true" aria-label="Paytable">
      <div class="kz-sheet">
        <button class="kz-close" data-action="closePaytable" aria-label="Close">✕</button>
        <h2 data-i18n="paytable"></h2>
        <p class="kz-sub" data-role="paytableSub"></p>
        <ul class="kz-facts" data-role="facts"></ul>
        <div class="kz-paytable" data-role="paytableGrid"></div>
        <div class="kz-note" data-role="paytableNote"></div>
      </div>
    </div>

    <div class="kz-toast" data-role="toast" role="status" aria-live="polite"></div>
  `;

  parent.appendChild(root);

  const $ = (sel) => root.querySelector(sel);
  const field = (name) => root.querySelector(`[data-field="${name}"]`);
  const el = {
    root,
    board: $('[data-role="board"]'),
    banner: $('[data-role="banner"]'),
    toast: $('[data-role="toast"]'),
    paytableModal: $('[data-role="paytableModal"]'),
    paytableGrid: $('[data-role="paytableGrid"]'),
    paytableSub: $('[data-role="paytableSub"]'),
    paytableNote: $('[data-role="paytableNote"]'),
    facts: $('[data-role="facts"]'),
    balance: field('balance'),
    bet: field('bet'),
    win: field('win'),
    betValue: field('betValue'),
    spin: $('[data-action="spin"]'),
    action: (name) => root.querySelector(`[data-action="${name}"]`),
  };

  /** Re-render every static label; called on start and on language change. */
  function applyLanguage(translate) {
    root.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = translate(node.dataset.i18n);
    });
  }
  applyLanguage(t);

  let toastTimer = null;
  return {
    el,
    applyLanguage,
    /** @param {Record<string,string>} values */
    setStats(values) {
      if (values.balance !== undefined) el.balance.textContent = values.balance;
      if (values.bet !== undefined) {
        el.bet.textContent = values.bet;
        el.betValue.textContent = values.bet;
      }
      if (values.win !== undefined) el.win.textContent = values.win;
    },
    setBanner(text) {
      el.banner.textContent = text || '';
      el.banner.hidden = !text;
    },
    toast(message, ms = 2200) {
      el.toast.textContent = message;
      el.toast.dataset.show = 'true';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        el.toast.dataset.show = 'false';
      }, ms);
    },
    setPressed(action, pressed) {
      const node = el.action(action);
      if (node) node.setAttribute('aria-pressed', String(pressed));
    },
    setBusy(busy, label) {
      el.spin.dataset.busy = String(busy);
      el.spin.textContent = label;
    },
    setBetLimits(index) {
      el.action('bet-down').disabled = index <= 0;
      el.action('bet-up').disabled = index >= BETTING.levels.length - 1;
    },
    openPaytable() {
      el.paytableModal.hidden = false;
    },
    closePaytable() {
      el.paytableModal.hidden = true;
    },
    destroy() {
      clearTimeout(toastTimer);
      root.remove();
    },
  };
}

export default createShell;
