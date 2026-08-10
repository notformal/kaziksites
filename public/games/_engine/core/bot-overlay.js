/**
 * BOT OVERLAY SYSTEM — Simulated Live Player Display on every game screen.
 * Connects to /api/bots/ endpoints, polls for live players, shows activity feed.
 */
const API_BASE = '/api';
const BOT_PREFIXES = ["Lucky","Win","Gold","Star","Royal","Mega","Super","Pro","Ace","Diamond"];
const BOT_SUFFIXES = ["Player","Gamer","Pro","Master","King","Queen","Chaser","Hunter","Boss","Champ"];
const BOT_AVATARS = [{emoji:"🎰",hue:280},{emoji:"🎲",hue:160},{emoji:"🃏",hue:350},{emoji:"♠️",hue:220},{emoji:"👑",hue:45},{emoji:"💎",hue:200},{emoji:"🔥",hue:15},{emoji:"⚡",hue:60},{emoji:"🌟",hue:290},{emoji:"🦁",hue:35},{emoji:"🐉",hue:120},{emoji:"🎯",hue:0}];
const STATUS_MESSAGES = ["is betting...","just won big!","on a streak 🔥","increasing bets","feeling lucky 🍀","chasing the jackpot","hot hand ⚡","in the zone 🎯"];
const WIN_MESSAGES = ["{name} won {amount} on {game} 🎉","{name} hit a {multiplier}x win!","🔥 {name} cashes out {amount} from {game}!","{name} scored big — {amount} on {game} 💰"];
function generateBotName(){const p=BOT_PREFIXES[Math.floor(Math.random()*BOT_PREFIXES.length)];const s=BOT_SUFFIXES[Math.floor(Math.random()*BOT_SUFFIXES.length)];return`${p}${s}${Math.floor(Math.random()*999)+1}`}
function getBotAvatar(){const a=BOT_AVATARS[Math.floor(Math.random()*BOT_AVATARS.length)];return{...a}}
function formatMoney(a,d=2){return new Intl.NumberFormat("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}).format(a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function formatBotFeedMessage(f){if(!f)return"";const win=f.win||0,bet=f.bet||0;if(win>bet*100){const m=Math.floor(win/(bet*100));return`${f.botName||"Player"} hit ${m}x on ${f.gameId}!`}if(win>0)return`${f.botName||"Player"} won $${formatMoney(win/100)} on ${f.gameId}`;return`${f.botName||"Player"} bet on ${f.gameId}`}
/* ── CSS (injected once per page) ── */
const OVERLAY_CSS = `
.kz-bot-overlay{position:fixed;bottom:80px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;width:100%}
.kz-bot-panel{background:rgba(10,10,35,0.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(168,85,247,0.2);border-radius:16px;padding:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 20px rgba(168,85,247,0.1)}
.kz-bot-panel-header{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);margin-bottom:8px}
.kz-bot-panel-title{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8}
.kz-bot-live-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.6);animation:kzBotPulse 2s ease-in-out infinite}
@keyframes kzBotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(.85)}}
.kz-bot-count{font-size:11px;font-weight:700;color:#22c55e;background:rgba(34,197,94,0.1);padding:2px 8px;border-radius:99px}
.kz-bot-players{display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto}
.kz-bot-player{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,0.03);animation:kzBotSlideIn .3s ease-out}
.kz-bot-player.just-won{background:rgba(34,197,94,0.08);border-left:2px solid rgba(34,197,94,0.5)}
.kz-bot-player.bet-active{border-left:2px solid rgba(168,85,247,0.5)}
@keyframes kzBotSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.kz-bot-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);flex-shrink:0}
.kz-bot-info{flex:1;min-width:0}
.kz-bot-name{font-size:11px;font-weight:600;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kz-bot-status{font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kz-bot-bet{font-size:11px;font-weight:700;color:#a78bfa;background:rgba(168,85,247,0.1);padding:2px 6px;border-radius:6px;white-space:nowrap;flex-shrink:0}
.kz-bot-win{font-size:11px;font-weight:700;color:#4ade80;background:rgba(34,197,94,0.1);padding:2px 6px;border-radius:6px;white-space:nowrap;flex-shrink:0}
.kz-bot-feed{display:flex;flex-direction:column;gap:4px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)}
.kz-bot-feed-title{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#475569;margin-bottom:2px}
.kz-bot-feed-item{font-size:10px;color:#94a3b8;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,0.02)}
.kz-bot-feed-item.win-highlight{color:#4ade80;background:rgba(34,197,94,0.06)}
.kz-bot-stats-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(168,85,247,0.06);border-radius:8px;margin-top:8px}
.kz-bot-stat{text-align:center;flex:1}
.kz-bot-stat-value{font-size:13px;font-weight:700;color:#e2e8f0}
.kz-bot-stat-label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
.kz-bot-toggle{display:none;position:fixed;bottom:20px;right:16px;z-index:9998;width:44px;height:44px;border-radius:50%;background:rgba(168,85,247,0.8);backdrop-filter:blur(8px);border:1px solid rgba(168,85,247,0.3);color:white;font-size:18px;cursor:pointer;align-items:center;justify-content:center}
.kz-bot-overlay.collapsed .kz-bot-panel{display:none}.kz-bot-overlay.collapsed .kz-bot-toggle{display:flex}
@media(max-width:640px){.kz-bot-overlay{bottom:70px;right:8px;max-width:260px}.kz-bot-avatar{width:28px;height:28px;font-size:14px}}
`;

/**
 * BotOverlay — renders simulated live players on any game screen.
 * @param {object} opts - container, apiUrl, refreshInterval, gameName, maxPlayers
 */
class BotOverlay {
  constructor({ container, apiUrl = API_BASE, refreshInterval = 3000, gameName = "the game", autoStart = true, maxPlayers = 8, maxFeedItems = 5 } = {}) {
    this.container = typeof container === "string" ? document.querySelector(container) : container;
    this.apiUrl = apiUrl.replace(/\/+$/, "");
    this.refreshInterval = refreshInterval;
    this.gameName = gameName;
    this.maxPlayers = maxPlayers;
    this.maxFeedItems = maxFeedItems;
    this.cachedPlayers = [];
    this.feedItems = [];
    this.totalBetVolume = 0;
    this.totalWinVolume = 0;
    this.liveCount = 0;
    this.isRunning = false;
    this.pollTimer = null;
    this.root = null;
    if (autoStart) this.start();
    if (!document.getElementById("kz-bot-overlay-css")) {
      const s = document.createElement("style");
      s.id = "kz-bot-overlay-css";
      s.textContent = OVERLAY_CSS;
      document.head.appendChild(s);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._buildUI();
    this._poll();
    this.pollTimer = setInterval(() => this._poll(), this.refreshInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  destroy() {
    this.stop();
    if (this.root && this.root.parentNode) this.root.remove();
  }
  _buildUI() {
    const root = document.createElement("div");
    root.className = "kz-bot-overlay";
    root.innerHTML = `<button class="kz-bot-toggle" aria-label="Show live players">👥</button>
      <div class="kz-bot-panel">
        <div class="kz-bot-panel-header"><span class="kz-bot-panel-title"><span class="kz-bot-live-dot"></span>LIVE PLAYERS</span><span class="kz-bot-count">0 online</span></div>
        <div class="kz-bot-players" data-role="players"></div>
        <div class="kz-bot-stats-bar"><div class="kz-bot-stat"><div class="kz-bot-stat-value" id="kz-bot-bet-vol">0</div><div class="kz-bot-stat-label">Total Bets</div></div><div class="kz-bot-stat"><div class="kz-bot-stat-value" id="kz-bot-win-vol" style="color:#4ade80">0</div><div class="kz-bot-stat-label">Total Won</div></div><div class="kz-bot-stat"><div class="kz-bot-stat-value" id="kz-bot-feed-count">0</div><div class="kz-bot-stat-label">Activity</div></div></div>
        <div class="kz-bot-feed"><div class="kz-bot-feed-title">📊 Activity Feed</div><div data-role="feed-content"></div></div>
      </div>`;
    this.root = root;
    const toggle = root.querySelector(".kz-bot-toggle");
    toggle.addEventListener("click", () => { root.classList.remove("collapsed"); this.container.appendChild(root); });
    this.playersEl = root.querySelector('[data-role="players"]');
    this.feedContentEl = root.querySelector('[data-role="feed-content"]');
    this.container.appendChild(root);
  }

  async _poll() {
    try {
      const [botsRes, statsRes] = await Promise.all([fetch(`${this.apiUrl}/bots/live`).catch(() => null), fetch(`${this.apiUrl}/bots/stats`).catch(() => null)]);
      if (botsRes?.ok) { const data = await botsRes.json(); this.cachedPlayers = data.players || []; this.liveCount = data.count || 0; const ce = this.root?.querySelector(".kz-bot-count"); if (ce) ce.textContent = `${this.liveCount} online`; }
      if (statsRes?.ok) { const stats = await statsRes.json(); if (stats.stats?.totalSimulatedBets !== undefined) { this.totalBetVolume = stats.stats.totalSimulatedBets; const ve = document.getElementById("kz-bot-bet-vol"); if (ve) ve.textContent = formatMoney(this.totalBetVolume / 100); } if (stats.stats?.totalSimulatedWinnings !== undefined) { this.totalWinVolume = stats.stats.totalSimulatedWinnings; const we = document.getElementById("kz-bot-win-vol"); if (we) we.textContent = formatMoney(this.totalWinVolume / 100); } }
      this._renderPlayers();
      this._refreshFeed();
    } catch (e) { /* silent fail */ }
  }
  _renderPlayers() {
    if (!this.playersEl) return;
    const players = this.cachedPlayers.slice(0, this.maxPlayers);
    if (players.length === 0) { this._generatePlaceholderPlayers(); return; }
    this.playersEl.innerHTML = players.map(p => {
      const betD = p.currentBet ? formatMoney(p.currentBet / 100) : null;
      const winD = p.lastWin && p.lastWin > 0 ? `+${formatMoney(p.lastWin)}` : null;
      return `<div class="kz-bot-player ${winD ? "just-won" : ""} ${betD ? "bet-active" : ""}"><div class="kz-bot-avatar">${p.avatar || "🎰"}</div><div class="kz-bot-info"><div class="kz-bot-name">${this._esc(p.name)}</div><div class="kz-bot-status">${betD ? `Betting ${betD}...` : pick(STATUS_MESSAGES)}</div></div>${winD ? `<span class="kz-bot-win">${winD}</span>` : (betD ? `<span class="kz-bot-bet">${betD}</span>` : "")}</div>`;
    }).join("");
  }

  _renderFeed() { return this.feedItems.slice(0, this.maxFeedItems).map(f => `<div class="kz-bot-feed-item ${f.isWin ? "win-highlight" : ""}">${this._esc(f.text)}</div>`).join(""); }

  _refreshFeed() {
    if (!this.root) return;
    fetch(`${this.apiUrl}/bots/feed?limit=${this.maxFeedItems}`).then(r => r.ok ? r.json() : null).then(data => {
      if (data?.feed) {
        this.feedItems = data.feed.map(f => ({ text: formatBotFeedMessage(f), isWin: f.win && f.win > 0 }));
        const fc = this.root.querySelector('[data-role="feed-content"]');
        if (fc) fc.innerHTML = this._renderFeed();
        const ce = document.getElementById("kz-bot-feed-count"); if (ce) ce.textContent = this.feedItems.length;
      }
    }).catch(() => {});
  }

  _generatePlaceholderPlayers() {
    this.cachedPlayers = [];
    const count = Math.floor(Math.random() * 12) + 8;
    for (let i = 0; i < count; i++) {
      const av = getBotAvatar(); const name = generateBotName(); const bet = (Math.random() * 500 + 10) * 100;
      this.cachedPlayers.push({ id: `ph_${i}`, name, avatar: av.emoji, profile: pick(["casual","regular","highRoller"]), currentBet: bet, lastWin: Math.random() < 0.3 ? (Math.random() * 2000 + 100) * 100 : 0, online: true });
    }
    for (let i = 0; i < this.maxFeedItems; i++) {
      const pl = this.cachedPlayers[Math.floor(Math.random() * this.cachedPlayers.length)];
      if (pl) {
        const msg = pick(WIN_MESSAGES).replace("{name}", pl.name).replace("{game}", this.gameName).replace("{amount}", `$${formatMoney(Math.random() * 100 + 5)}`).replace("{multiplier}", `${Math.floor(Math.random() * 20 + 2)}x`);
        this.feedItems.push({ text: msg, isWin: true });
      }
    }
    this._renderPlayers();
  }

  _esc(str) { const d = document.createElement("div"); d.textContent = str; return d.innerHTML; }
}

/** Setup bot overlay on any game container. Returns BotOverlay instance. */
function setupBotOverlay(container, options = {}) {
  const root = typeof container === "string" ? document.querySelector(container) : container;
  if (!root) { console.warn("[BotOverlay] Container not found:", container); return null; }
  root.style.position = "relative";
  root.style.paddingRight = Math.max(parseInt(root.style.paddingRight || 0), 340) + "px";
  const overlay = new BotOverlay({ container: root, gameName: options.gameName || "the game", refreshInterval: options.refreshInterval || 3000, maxPlayers: options.maxPlayers || 8 });
  return overlay;
}

export { BotOverlay, setupBotOverlay };
export default BotOverlay;
