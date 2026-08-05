export const GAME_MESSAGES=new Set(['GAME_READY','BET_PLACED','ROUND_RESULT','ROUND_STATUS_REQUEST','BONUS_SPIN','MINES_START','MINES_REVEAL','MINES_CASHOUT','HILO_START','HILO_GUESS','HILO_CASHOUT','BJ_START','BJ_ACTION','CH_START','CH_ACTION','VP_START','VP_DRAW']);
export const HOST_MESSAGES=new Set(['INIT','BALANCE_UPDATE','BET_REJECTED','BET_APPROVED','ROUND_SETTLED','ROUND_STATUS','BONUS_SETTLED','MINES_STARTED','MINES_UPDATE','MINES_ENDED','HILO_STARTED','HILO_UPDATE','HILO_ENDED','BJ_STARTED','BJ_UPDATE','CH_STARTED','CH_ENDED','VP_STARTED','VP_ENDED']);
export function isMessage(value,allowed){return Boolean(value&&typeof value==='object'&&typeof value.type==='string'&&allowed.has(value.type)&&(!('payload'in value)||value.payload&&typeof value.payload==='object'))}
// choice отсутствует ИЛИ равен undefined — оба варианта валидны: structured clone
// сохраняет ключ со значением undefined, и раньше это отклоняло каждую ставку
// в играх без выбора (wheel, plinko, crash, slots-classic).
export function validBet(p){return Boolean(p&&Number.isSafeInteger(p.amount)&&p.amount>0&&p.amount<=1_000_000&&typeof p.gameId==='string'&&/^[a-z0-9-]{1,40}$/.test(p.gameId)&&typeof p.roundId==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(p.roundId)&&(p.choice===undefined||p.choice&&typeof p.choice==='object'&&!Array.isArray(p.choice)))}
export function validBonusSpin(p){return Boolean(p&&typeof p.gameId==='string'&&/^[a-z0-9-]{1,40}$/.test(p.gameId)&&typeof p.roundId==='string'&&/^[a-zA-Z0-9_-]{8,80}$/.test(p.roundId)&&typeof p.sessionId==='string'&&/^bs_[a-zA-Z0-9_-]{8,83}$/.test(p.sessionId))}
export function validMinesStart(p){return Boolean(p&&Number.isSafeInteger(p.bet)&&p.bet>0&&p.bet<=1_000_000&&Number.isInteger(p.mines)&&p.mines>=1&&p.mines<=24)}
const minesSession=id=>typeof id==='string'&&/^mines_[a-z0-9-]{8,80}$/.test(id);
export function validMinesReveal(p){return Boolean(p&&minesSession(p.sessionId)&&Number.isInteger(p.tile)&&p.tile>=0&&p.tile<25)}
export function validMinesCashout(p){return Boolean(p&&minesSession(p.sessionId))}
export function validHiloStart(p){return Boolean(p&&Number.isSafeInteger(p.bet)&&p.bet>0&&p.bet<=1_000_000)}
const hiloSession=id=>typeof id==='string'&&/^hilo_[a-z0-9-]{8,80}$/.test(id);
export function validHiloGuess(p){return Boolean(p&&hiloSession(p.sessionId)&&(p.direction==='hi'||p.direction==='lo'))}
export function validHiloCashout(p){return Boolean(p&&hiloSession(p.sessionId))}
export function validBjStart(p){return Boolean(p&&Number.isSafeInteger(p.bet)&&p.bet>0&&p.bet<=1_000_000)}
export function validBjAction(p){return Boolean(p&&typeof p.sessionId==='string'&&/^bj_[a-z0-9-]{8,80}$/.test(p.sessionId)&&['hit','stand','double'].includes(p.move))}
export function validChStart(p){return Boolean(p&&Number.isSafeInteger(p.bet)&&p.bet>0&&p.bet<=1_000_000)}
export function validChAction(p){return Boolean(p&&typeof p.sessionId==='string'&&/^holdem_[a-z0-9-]{8,80}$/.test(p.sessionId)&&['call','fold'].includes(p.move))}
export function validVpStart(p){return Boolean(p&&Number.isSafeInteger(p.bet)&&p.bet>0&&p.bet<=1_000_000)}
export function validVpDraw(p){return Boolean(p&&typeof p.sessionId==='string'&&/^vp_[a-z0-9-]{8,80}$/.test(p.sessionId)&&Array.isArray(p.hold)&&p.hold.length<=5&&p.hold.every(i=>Number.isInteger(i)&&i>=0&&i<5)&&new Set(p.hold).size===p.hold.length)}
