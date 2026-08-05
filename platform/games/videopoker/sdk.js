// Video Poker: stateful protocol (start -> draw); type-matched waits.
export class VideoPokerBridge {
  constructor() {
    this.origin = new URLSearchParams(location.search).get('parentOrigin') || location.origin;
    this.waiters = [];
    addEventListener('message', (e) => {
      if (e.source !== parent || e.origin !== this.origin) return;
      const { type, payload } = e.data || {};
      if (['INIT', 'BALANCE_UPDATE'].includes(type)) dispatchEvent(new CustomEvent('casino:balance', { detail: payload || {} }));
      const i = this.waiters.findIndex((w) => w.types.includes(type));
      if (i >= 0) { const w = this.waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(e.data); }
    });
  }
  start() { parent.postMessage({ type: 'GAME_READY', payload: { gameId: 'videopoker' } }, this.origin); }
  send(type, payload) { parent.postMessage({ type, payload: { gameId: 'videopoker', ...payload } }, this.origin); }
  wait(types) {
    return new Promise((resolve) => {
      const w = { types, resolve, timer: setTimeout(() => { const i = this.waiters.indexOf(w); if (i >= 0) this.waiters.splice(i, 1); resolve(null); }, 10000) };
      this.waiters.push(w);
    });
  }
  begin(bet) { this.send('VP_START', { bet }); return this.wait(['VP_STARTED', 'BET_REJECTED']); }
  draw(sessionId, hold) { this.send('VP_DRAW', { sessionId, hold }); return this.wait(['VP_ENDED', 'BET_REJECTED']); }
}
