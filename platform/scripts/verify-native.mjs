import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const edge = (process.env.NATIVE_EDGE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const api = (process.env.NATIVE_API_URL || `${edge}/api`).replace(/\/$/, '');
const games = (process.env.NATIVE_GAMES_URL || edge).replace(/\/$/, '');
const strictHeaders = process.env.NATIVE_STRICT_HEADERS !== 'false';
const stateFile = process.env.NATIVE_QA_STATE || path.join(root, '.native-qa-state.json');
const phase = process.argv.find(x => x.startsWith('--phase='))?.split('=')[1] || 'full';
const failures = [];
let cookie = '';

function check(value, message) { if (!value) failures.push(message); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
const roundPacingMs = Number(process.env.NATIVE_VERIFY_PACING_MS || 850);
async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('cookie', cookie);
  let response;
  try { response = await fetch(url, { ...options, headers, redirect: 'manual' }); }
  catch (error) { throw new Error(`${options.method || 'GET'} ${url} failed: ${error.cause?.message || error.message}`, { cause: error }); }
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  return response;
}
async function json(url, options = {}, expected = 200) {
  const response = await request(url, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  check(response.status === expected, `${options.method || 'GET'} ${url}: expected ${expected}, got ${response.status}`);
  return { response, body };
}
const post = (url, body, expected = 200) => json(url, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
}, expected);

async function loadCatalog() {
  const slots = await fs.readFile(path.join(root, 'apps/lobby/src/slot-titles.generated.json'), 'utf8').then(JSON.parse);
  // Портфель — только казино: серверные оригиналы + слот-титулы движка.
  const core = [
    '/games/slots-classic/index.html', '/games/crash/index.html', '/games/plinko/index.html',
    '/games/roulette/index.html', '/games/keno/index.html'
  ];
  const urls = [
    ...core,
    ...slots.map(x => `${games}/games/slots-studio/index.html?title=${encodeURIComponent(x.id)}`)
  ];
  return { slots, urls: urls.map(x => x.startsWith('http') ? x : `${games}${x}`) };
}

async function verifySurface(catalog) {
  for (const brand of ['aurora', 'ember', 'royale']) {
    const response = await request(`${edge}/?brand=${brand}`);
    const html = await response.text();
    check(response.status === 200, `brand ${brand} is unavailable`);
    check(/<div id="root"><\/div>/.test(html), `brand ${brand} does not return lobby shell`);
  }
  const edgeResponse = await request(`${edge}/?brand=aurora`);
  const required = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': null,
    'permissions-policy': null,
    'content-security-policy': null
  };
  if (strictHeaders) for (const [name, exact] of Object.entries(required)) {
    const value = edgeResponse.headers.get(name);
    check(value && (!exact || value.toLowerCase() === exact), `missing/invalid production header: ${name}`);
  }
  let ok = 0;
  for (const url of catalog.urls) {
    const response = await request(url);
    const type = response.headers.get('content-type') || '';
    if (response.status === 200 && type.includes('text/html')) ok++;
    else failures.push(`game URL failed: ${url} (${response.status}, ${type || 'no content-type'})`);
  }
  check(catalog.urls.length === 200, `expected exactly 200 catalog URLs, got ${catalog.urls.length}`);
  console.log(`Static games: ${ok}/${catalog.urls.length}; brands: 3/3`);
}

async function register() {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const credentials = { email: `native-${nonce}@example.invalid`, password: `Native-${nonce}-Qa!`, displayName: 'Native QA' };
  const result = await post(`${api}/auth/register`, credentials, 201);
  check(result.body?.token, 'registration did not return a token');
  const setCookie = result.response.headers.get('set-cookie') || '';
  check(/casino_session=/.test(setCookie), 'registration did not set casino_session cookie');
  check(/HttpOnly/i.test(setCookie), 'session cookie is not HttpOnly');
  check(/SameSite=Lax/i.test(setCookie), 'session cookie is not SameSite=Lax');
  const balance = await json(`${api}/wallet/balance`);
  check(balance.body?.balance === 5000, `welcome balance is ${balance.body?.balance}, expected 5000`);
  return credentials;
}

async function verifyRounds(catalog) {
  const registry = await json(`${api}/games/registry`);
  const registeredSlots = registry.body?.games?.filter(x => x.id?.startsWith('slot-original-')) || [];
  check(registeredSlots.length === 127, `API registry has ${registeredSlots.length} original slots, expected 127`);
  const serverGames = ['slots-classic', 'crash', 'plinko', 'roulette', 'keno', ...catalog.slots.map(x => x.id)];
  let passed = 0;
  for (const gameId of serverGames) {
    const roundId = `native_${gameId.replaceAll('-', '_')}_${Date.now()}_${passed}`.slice(0, 80);
    const choice = gameId === 'roulette'
      ? { type: 'red' }
      : gameId === 'keno'
        ? { numbers: [3, 17, 42, 68] }
        : undefined;
    const bet = { amount: 1, gameId, roundId, clientSeed: `native-${roundId}`, ...(choice ? { choice } : {}) };
    const first = await post(`${api}/wallet/bet`, bet, 201);
    const duplicate = await post(`${api}/wallet/bet`, bet, 200);
    check(duplicate.body?.idempotent === true, `${gameId}: duplicate bet is not idempotent`);
    const settled = await post(`${api}/wallet/settle`, { gameId, roundId });
    const again = await post(`${api}/wallet/settle`, { gameId, roundId });
    check(settled.body?.balance === again.body?.balance, `${gameId}: duplicate settlement changed balance`);
    check(settled.body?.proof?.serverSeed && settled.body?.proof?.serverSeedHash, `${gameId}: proof is incomplete`);
    if (gameId.startsWith('slot-original-')) {
      check(settled.body?.outcome?.grid?.length === 15, `${gameId}: invalid 5x3 grid`);
      check(settled.body?.mathVersion === 1, `${gameId}: unexpected math version`);
    }
    if (first.response.ok && settled.response.ok) passed++;
    // A complete round performs several API requests. Keep the default below
    // the production global limiter; CI may override this only when its API
    // instance has an explicitly controlled test limit.
    await sleep(roundPacingMs);
  }
  const history = await json(`${api}/history/rounds`);
  check((history.body?.rounds?.length || 0) >= 100, 'history endpoint did not return its expected 100-row page');
  console.log(`Server rounds: ${passed}/${serverGames.length}`);
}

async function verifyOriginPolicy() {
  const response = await fetch(`${api}/wallet/daily-reward`, {
    method: 'POST', headers: { origin: 'https://attacker.invalid', cookie }
  });
  check(response.status === 403, `foreign write Origin returned ${response.status}, expected 403`);
}

async function saveRestartState(credentials) {
  const balance = await json(`${api}/wallet/balance`);
  await fs.writeFile(stateFile, JSON.stringify({ credentials, balance: balance.body.balance }, null, 2), { mode: 0o600 });
  console.log(`Restart checkpoint saved to ${stateFile}. Restart API/PostgreSQL, then run --phase=resume.`);
}
async function verifyRestartState() {
  const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  cookie = '';
  await post(`${api}/auth/login`, state.credentials);
  const balance = await json(`${api}/wallet/balance`);
  check(balance.body?.balance === state.balance, `restart persistence failed: ${balance.body?.balance} != ${state.balance}`);
  const history = await json(`${api}/history/rounds`);
  check((history.body?.rounds?.length || 0) > 0, 'round history disappeared after restart');
  await fs.rm(stateFile, { force: true });
  console.log('Restart persistence: PASS');
}

try {
  const healthUrl = process.env.NATIVE_HEALTH_URL || (process.env.NATIVE_API_URL
    ? `${api.replace(/\/api$/, '')}/health`
    : `${edge}/api/health`);
  const health = await json(healthUrl);
  check(health.body?.ok && health.body?.database === 'postgresql', 'health does not confirm PostgreSQL');
  if (phase === 'resume') await verifyRestartState();
  else {
    const catalog = await loadCatalog();
    await verifySurface(catalog);
    const credentials = await register();
    await verifyOriginPolicy();
    await verifyRounds(catalog);
    if (phase === 'seed') await saveRestartState(credentials);
    else {
      await post(`${api}/auth/logout`, {} , 204);
      const afterLogout = await json(`${api}/profile`, {}, 401);
      check(afterLogout.response.status === 401, 'logout did not revoke session');
    }
  }
} catch (error) {
  failures.push(error.stack || String(error));
}

if (failures.length) {
  console.error(`\nNative production verification FAILED (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else console.log('\nNative production verification PASSED.');
