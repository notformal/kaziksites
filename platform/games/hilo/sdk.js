// Hi-Lo needs a stateful protocol (start -> guess* -> cashout); type-matched waits.
export class HiloBridge {
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
  start() { parent.postMessage({ type: 'GAME_READY', payload: { gameId: 'hilo' } }, this.origin); }
  send(type, payload) { parent.postMessage({ type, payload: { gameId: 'hilo', ...payload } }, this.origin); }
  wait(types) {
    return new Promise((resolve) => {
      const w = { types, resolve, timer: setTimeout(() => { const i = this.waiters.indexOf(w); if (i >= 0) this.waiters.splice(i, 1); resolve(null); }, 10000) };
      this.waiters.push(w);
    });
  }
  begin(bet) { this.send('HILO_START', { bet }); return this.wait(['HILO_STARTED', 'BET_REJECTED']); }
  guess(sessionId, direction) { this.send('HILO_GUESS', { sessionId, direction }); return this.wait(['HILO_UPDATE', 'BET_REJECTED']); }
  cashout(sessionId) { this.send('HILO_CASHOUT', { sessionId }); return this.wait(['HILO_ENDED', 'BET_REJECTED']); }
}
