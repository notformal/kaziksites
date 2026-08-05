/**
 * ═══════════════════════════════════════════════════════════
 * LOCALISATION
 *
 * Ten interface languages, resolved once at start-up from (in order) an
 * explicit option, the `?lang=` query parameter, the host page's `lang`
 * attribute, and finally the browser. Symbol names stay in English — that is
 * industry convention and avoids inventing translations for coined names like
 * "Ringworld".
 *
 * Missing keys fall back to English rather than rendering a raw key, so a
 * half-finished translation degrades gracefully instead of looking broken.
 * ═══════════════════════════════════════════════════════════
 */

import { LANGUAGES } from '../config/engine.config.js';

export const STRINGS = Object.freeze({
  en: {
    balance: 'Balance', bet: 'Bet', win: 'Win', spin: 'Spin', stop: 'Stop',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Paytable', close: 'Close',
    freeSpins: 'Free Spins', freeSpinsLeft: 'Free spins left', bigWin: 'Big Win!',
    megaWin: 'Mega Win!', totalWin: 'Total win', insufficientFunds: 'Not enough balance',
    lines: 'Lines', rtp: 'RTP', volatility: 'Volatility', maxWin: 'Max win',
    sound: 'Sound', language: 'Language', autoplayRounds: 'Autoplay rounds',
    wild: 'Wild — substitutes for all symbols except Scatter',
    scatter: 'Scatter — pays anywhere and awards free spins',
    loading: 'Loading', demoNotice: 'Demo credits only — no real money play',
    history: 'History', provablyFair: 'Provably fair',
  },
  ru: {
    balance: 'Баланс', bet: 'Ставка', win: 'Выигрыш', spin: 'Крутить', stop: 'Стоп',
    auto: 'Авто', turbo: 'Турбо', paytable: 'Таблица выплат', close: 'Закрыть',
    freeSpins: 'Фриспины', freeSpinsLeft: 'Осталось фриспинов', bigWin: 'Крупный выигрыш!',
    megaWin: 'Мега-выигрыш!', totalWin: 'Общий выигрыш', insufficientFunds: 'Недостаточно средств',
    lines: 'Линии', rtp: 'RTP', volatility: 'Волатильность', maxWin: 'Макс. выигрыш',
    sound: 'Звук', language: 'Язык', autoplayRounds: 'Раундов автоигры',
    wild: 'Wild — заменяет все символы, кроме Scatter',
    scatter: 'Scatter — платит в любом месте и даёт фриспины',
    loading: 'Загрузка', demoNotice: 'Только демо-кредиты — игра не на деньги',
    history: 'История', provablyFair: 'Честная игра',
  },
  uk: {
    balance: 'Баланс', bet: 'Ставка', win: 'Виграш', spin: 'Крутити', stop: 'Стоп',
    auto: 'Авто', turbo: 'Турбо', paytable: 'Таблиця виплат', close: 'Закрити',
    freeSpins: 'Фриспіни', freeSpinsLeft: 'Залишилось фриспінів', bigWin: 'Великий виграш!',
    megaWin: 'Мега-виграш!', totalWin: 'Загальний виграш', insufficientFunds: 'Недостатньо коштів',
    lines: 'Лінії', rtp: 'RTP', volatility: 'Волатильність', maxWin: 'Макс. виграш',
    sound: 'Звук', language: 'Мова', autoplayRounds: 'Раундів автогри',
    wild: 'Wild — замінює всі символи, крім Scatter',
    scatter: 'Scatter — платить будь-де та дає фриспіни',
    loading: 'Завантаження', demoNotice: 'Лише демо-кредити — гра не на гроші',
    history: 'Історія', provablyFair: 'Чесна гра',
  },
  de: {
    balance: 'Guthaben', bet: 'Einsatz', win: 'Gewinn', spin: 'Drehen', stop: 'Stopp',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Gewinntabelle', close: 'Schließen',
    freeSpins: 'Freispiele', freeSpinsLeft: 'Freispiele übrig', bigWin: 'Großer Gewinn!',
    megaWin: 'Mega-Gewinn!', totalWin: 'Gesamtgewinn', insufficientFunds: 'Guthaben zu niedrig',
    lines: 'Linien', rtp: 'RTP', volatility: 'Volatilität', maxWin: 'Max. Gewinn',
    sound: 'Ton', language: 'Sprache', autoplayRounds: 'Autoplay-Runden',
    wild: 'Wild — ersetzt alle Symbole außer Scatter',
    scatter: 'Scatter — zahlt überall und vergibt Freispiele',
    loading: 'Wird geladen', demoNotice: 'Nur Demo-Guthaben — kein Echtgeldspiel',
    history: 'Verlauf', provablyFair: 'Nachweislich fair',
  },
  es: {
    balance: 'Saldo', bet: 'Apuesta', win: 'Ganancia', spin: 'Girar', stop: 'Parar',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Tabla de pagos', close: 'Cerrar',
    freeSpins: 'Giros gratis', freeSpinsLeft: 'Giros gratis restantes', bigWin: '¡Gran premio!',
    megaWin: '¡Mega premio!', totalWin: 'Ganancia total', insufficientFunds: 'Saldo insuficiente',
    lines: 'Líneas', rtp: 'RTP', volatility: 'Volatilidad', maxWin: 'Premio máx.',
    sound: 'Sonido', language: 'Idioma', autoplayRounds: 'Rondas automáticas',
    wild: 'Wild — sustituye a todos los símbolos excepto Scatter',
    scatter: 'Scatter — paga en cualquier posición y otorga giros gratis',
    loading: 'Cargando', demoNotice: 'Solo créditos de demostración — sin dinero real',
    history: 'Historial', provablyFair: 'Justo comprobable',
  },
  pt: {
    balance: 'Saldo', bet: 'Aposta', win: 'Ganho', spin: 'Girar', stop: 'Parar',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Tabela de pagamentos', close: 'Fechar',
    freeSpins: 'Giros grátis', freeSpinsLeft: 'Giros grátis restantes', bigWin: 'Grande prémio!',
    megaWin: 'Mega prémio!', totalWin: 'Ganho total', insufficientFunds: 'Saldo insuficiente',
    lines: 'Linhas', rtp: 'RTP', volatility: 'Volatilidade', maxWin: 'Ganho máx.',
    sound: 'Som', language: 'Idioma', autoplayRounds: 'Rodadas automáticas',
    wild: 'Wild — substitui todos os símbolos exceto Scatter',
    scatter: 'Scatter — paga em qualquer posição e dá giros grátis',
    loading: 'A carregar', demoNotice: 'Apenas créditos demo — sem dinheiro real',
    history: 'Histórico', provablyFair: 'Comprovadamente justo',
  },
  tr: {
    balance: 'Bakiye', bet: 'Bahis', win: 'Kazanç', spin: 'Çevir', stop: 'Durdur',
    auto: 'Oto', turbo: 'Turbo', paytable: 'Ödeme tablosu', close: 'Kapat',
    freeSpins: 'Bedava dönüş', freeSpinsLeft: 'Kalan bedava dönüş', bigWin: 'Büyük kazanç!',
    megaWin: 'Mega kazanç!', totalWin: 'Toplam kazanç', insufficientFunds: 'Yetersiz bakiye',
    lines: 'Hatlar', rtp: 'RTP', volatility: 'Oynaklık', maxWin: 'Maks. kazanç',
    sound: 'Ses', language: 'Dil', autoplayRounds: 'Otomatik tur',
    wild: 'Wild — Scatter dışındaki tüm sembollerin yerine geçer',
    scatter: 'Scatter — her yerde öder ve bedava dönüş verir',
    loading: 'Yükleniyor', demoNotice: 'Yalnızca demo kredi — gerçek para yok',
    history: 'Geçmiş', provablyFair: 'Kanıtlanabilir adil',
  },
  pl: {
    balance: 'Saldo', bet: 'Zakład', win: 'Wygrana', spin: 'Zakręć', stop: 'Stop',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Tabela wypłat', close: 'Zamknij',
    freeSpins: 'Darmowe spiny', freeSpinsLeft: 'Pozostałe darmowe spiny', bigWin: 'Duża wygrana!',
    megaWin: 'Mega wygrana!', totalWin: 'Wygrana łącznie', insufficientFunds: 'Za małe saldo',
    lines: 'Linie', rtp: 'RTP', volatility: 'Zmienność', maxWin: 'Maks. wygrana',
    sound: 'Dźwięk', language: 'Język', autoplayRounds: 'Rundy autogry',
    wild: 'Wild — zastępuje wszystkie symbole oprócz Scatter',
    scatter: 'Scatter — płaci wszędzie i przyznaje darmowe spiny',
    loading: 'Ładowanie', demoNotice: 'Tylko kredyty demo — gra bez prawdziwych pieniędzy',
    history: 'Historia', provablyFair: 'Uczciwość weryfikowalna',
  },
  fr: {
    balance: 'Solde', bet: 'Mise', win: 'Gain', spin: 'Lancer', stop: 'Arrêt',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Table des gains', close: 'Fermer',
    freeSpins: 'Tours gratuits', freeSpinsLeft: 'Tours gratuits restants', bigWin: 'Gros gain !',
    megaWin: 'Méga gain !', totalWin: 'Gain total', insufficientFunds: 'Solde insuffisant',
    lines: 'Lignes', rtp: 'RTP', volatility: 'Volatilité', maxWin: 'Gain max.',
    sound: 'Son', language: 'Langue', autoplayRounds: 'Tours automatiques',
    wild: 'Wild — remplace tous les symboles sauf le Scatter',
    scatter: 'Scatter — paie partout et offre des tours gratuits',
    loading: 'Chargement', demoNotice: 'Crédits de démonstration uniquement — pas d’argent réel',
    history: 'Historique', provablyFair: 'Équité vérifiable',
  },
  it: {
    balance: 'Saldo', bet: 'Puntata', win: 'Vincita', spin: 'Gira', stop: 'Stop',
    auto: 'Auto', turbo: 'Turbo', paytable: 'Tabella pagamenti', close: 'Chiudi',
    freeSpins: 'Giri gratis', freeSpinsLeft: 'Giri gratis rimasti', bigWin: 'Grande vincita!',
    megaWin: 'Mega vincita!', totalWin: 'Vincita totale', insufficientFunds: 'Saldo insufficiente',
    lines: 'Linee', rtp: 'RTP', volatility: 'Volatilità', maxWin: 'Vincita max.',
    sound: 'Audio', language: 'Lingua', autoplayRounds: 'Giri automatici',
    wild: 'Wild — sostituisce tutti i simboli tranne lo Scatter',
    scatter: 'Scatter — paga ovunque e assegna giri gratis',
    loading: 'Caricamento', demoNotice: 'Solo crediti demo — nessun denaro reale',
    history: 'Cronologia', provablyFair: 'Equità verificabile',
  },
});

/** Human-readable language names, for the in-game picker. */
export const LANGUAGE_NAMES = Object.freeze({
  en: 'English', ru: 'Русский', uk: 'Українська', de: 'Deutsch', es: 'Español',
  pt: 'Português', tr: 'Türkçe', pl: 'Polski', fr: 'Français', it: 'Italiano',
});

/** Resolve the language to start in. */
export function detectLanguage(preferred) {
  const candidates = [
    preferred,
    new URLSearchParams(globalThis.location?.search || '').get('lang'),
    globalThis.document?.documentElement?.lang,
    ...(globalThis.navigator?.languages || []),
    globalThis.navigator?.language,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const code = String(c).slice(0, 2).toLowerCase();
    if (LANGUAGES.supported.includes(code)) return code;
  }
  return LANGUAGES.default;
}

export class Translator {
  constructor(preferred) {
    this.language = detectLanguage(preferred);
    this.listeners = new Set();
  }

  /** Translate a key, falling back to English and then to the key itself. */
  t(key) {
    return STRINGS[this.language]?.[key] ?? STRINGS[LANGUAGES.default][key] ?? key;
  }

  setLanguage(code) {
    if (!LANGUAGES.supported.includes(code) || code === this.language) return false;
    this.language = code;
    for (const fn of this.listeners) fn(code);
    return true;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get isRtl() {
    return LANGUAGES.rtl.includes(this.language);
  }
}

export default { STRINGS, LANGUAGE_NAMES, detectLanguage, Translator };
