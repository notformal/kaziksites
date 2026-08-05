// Mines needs a stateful protocol (start -> reveal* -> cashout) instead of the
// single-round BET_PLACED flow, so it uses its own bridge with type-matched waits.
export class MinesBridge {
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
  start() { parent.postMessage({ type: 'GAME_READY', payload: { gameId: 'mines' } }, this.origin); }
  send(type, payload) { parent.postMessage({ type, payload: { gameId: 'mines', ...payload } }, this.origin); }
  wait(types) {
    return new Promise((resolve) => {
      const w = { types, resolve, timer: setTimeout(() => { const i = this.waiters.indexOf(w); if (i >= 0) this.waiters.splice(i, 1); resolve(null); }, 10000) };
      this.waiters.push(w);
    });
  }
  begin(bet, mines) { this.send('MINES_START', { bet, mines }); return this.wait(['MINES_STARTED', 'BET_REJECTED']); }
  reveal(sessionId, tile) { this.send('MINES_REVEAL', { sessionId, tile }); return this.wait(['MINES_UPDATE', 'BET_REJECTED']); }
  cashout(sessionId) { this.send('MINES_CASHOUT', { sessionId }); return this.wait(['MINES_ENDED', 'BET_REJECTED']); }
}
