/**
 * Sports Betting Engine — Система ставок на спорт (MVP)
 * 
 * Поддерживаемые виды спорта:
 * - ⚽ Футбол
 * - 🏀 Баскетбол
 * - 🎾 Теннис
 * - 🏒 Хоккей
 * 
 * Типы ставок:
 * - Moneyline (Победитель)
 * - Handicap (Фора)
 * - Over/Under (Тотал)
 * - BTTS (Обе забьют)
 */

import crypto from 'node:crypto';

// ─── Utility Functions ────────────────────────────────────────

function uuid() {
  return crypto.randomBytes(16).toString('hex');
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/** Convert decimal odds to implied probability */
function decimalToProbability(odds) {
  return 1 / odds;
}

/** Convert probability to decimal odds (with margin) */
function probabilityToOdds(probability, margin = 0.05) {
  return (1 / (probability + margin));
}

/** Calculate fair decimal odds from probabilities */
function calculateOdds(outcomes, margin = 0.05) {
  const totalProb = outcomes.reduce((sum, o) => sum + o.probability, 0);
  
  return outcomes.map(o => ({
    name: o.name,
    fairOdds: totalProb > 0 ? (o.probability / totalProb) : 0.33,
    adjustedOdds: totalProb > 0 ? (1 / ((o.probability / totalProb) * (1 - margin))) : 2.0
  }));
}

// ─── Sports Data ──────────────────────────────────────────────

const SPORTS = {
  football: {
    name: 'Football',
    icon: '⚽',
    leagues: [
      { id: 'epl', name: 'Premier League', country: 'England' },
      { id: 'laliga', name: 'La Liga', country: 'Spain' },
      { id: 'seriea', name: 'Serie A', country: 'Italy' },
      { id: 'bundesliga', name: 'Bundesliga', country: 'Germany' },
      { id: 'ucl', name: 'Champions League', country: 'Europe' }
    ]
  },
  basketball: {
    name: 'Basketball',
    icon: '🏀',
    leagues: [
      { id: 'nba', name: 'NBA', country: 'USA' },
      { id: 'euroleague', name: 'EuroLeague', country: 'Europe' }
    ]
  },
  tennis: {
    name: 'Tennis',
    icon: '🎾',
    leagues: [
      { id: 'atp', name: 'ATP Tour', country: 'International' },
      { id: 'wta', name: 'WTA Tour', country: 'International' },
      { id: 'wimbledon', name: 'Wimbledon', country: 'England' }
    ]
  },
  hockey: {
    name: 'Hockey',
    icon: '🏒',
    leagues: [
      { id: 'nhl', name: 'NHL', country: 'USA/Canada' },
      { id: 'khl', name: 'KHL', country: 'Russia' }
    ]
  }
};

const BET_TYPES = {
  moneyline: 'moneyline',
  spread: 'spread',
  overUnder: 'overUnder',
  btts: 'btts',
  correctScore: 'correctScore',
  firstScorer: 'firstScorer',
  parlay: 'parlay'
};

// ─── Sample Events Generator ──────────────────────────────────

class EventGenerator {
  constructor() {
    this.teams = {
      football: [
        'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Man City',
        'Barcelona', 'Real Madrid', 'Juventus', 'AC Milan', 'Bayern Munich',
        'PSG', 'Inter Milan', 'Dortmund', 'Atletico Madrid', 'Napoli'
      ],
      basketball: [
        'Lakers', 'Celtics', 'Warriors', 'Bulls', 'Heat',
        'Nets', 'Mavericks', '76ers', 'Knicks', 'Suns'
      ],
      tennis: [
        'Djokovic N.', 'Alcaraz C.', 'Sinner J.', 'Medvedev D.',
        'Rublev A.', 'Tsitsipas S.', 'Zverev A.', 'Rune H.'
      ],
      hockey: [
        'Edmonton', 'Colorado', 'Carolina', 'Boston', 'NY Rangers',
        'Toronto', 'Tampa Bay', 'Florida', 'Dallas', 'Vegas'
      ]
    };
    
    this.events = [];
    this.generateUpcomingEvents();
  }
  
  generateUpcomingEvents() {
    const now = Date.now();
    
    for (const [sport, teamList] of Object.entries(this.teams)) {
      const eventCount = Math.floor(Math.random() * 10) + 10;
      
      for (let i = 0; i < eventCount; i++) {
        const homeTeam = teamList[Math.floor(Math.random() * teamList.length)];
        let awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
        while (awayTeam === homeTeam) {
          awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
        }
        
        const eventTime = now + (Math.random() * 7 * 24 * 60 * 60 * 1000);
        
        this.events.push({
          id: `evt_${uuid().slice(0, 12)}`,
          sport,
          homeTeam,
          awayTeam,
          startTime: new Date(eventTime).toISOString(),
          status: 'upcoming',
          league: this.getLeagueForSport(sport),
          score: null
        });
      }
    }
  }
  
  getLeagueForSport(sport) {
    const sportData = SPORTS[sport];
    if (!sportData) return null;
    const league = sportData.leagues[Math.floor(Math.random() * sportData.leagues.length)];
    return league ? { id: league.id, name: league.name } : null;
  }
  
  getEvents(sport = null, status = 'upcoming') {
    let events = this.events;
    
    if (sport) {
      events = events.filter(e => e.sport === sport);
    }
    
    if (status) {
      events = events.filter(e => e.status === status);
    }
    
    return events.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }
  
  getEvent(eventId) {
    return this.events.find(e => e.id === eventId);
  }
}

// ─── Odds Engine ──────────────────────────────────────────────

class OddsEngine {
  constructor(margin = 0.05) {
    this.margin = margin;
    this.oddsCache = new Map();
  }
  
  generateOdds(event) {
    const cacheKey = `${event.id}_${event.status}`;
    
    if (this.oddsCache.has(cacheKey)) {
      return this.oddsCache.get(cacheKey);
    }
    
    const odds = {};
    
    switch (event.sport) {
      case 'football':
        Object.assign(odds, this.generateFootballOdds(event));
        break;
      case 'basketball':
        Object.assign(odds, this.generateBasketballOdds(event));
        break;
      case 'tennis':
        Object.assign(odds, this.generateTennisOdds(event));
        break;
      case 'hockey':
        Object.assign(odds, this.generateHockeyOdds(event));
        break;
    }
    
    this.oddsCache.set(cacheKey, odds);
    return odds;
  }
  
  generateFootballOdds(event) {
    const homeStrength = randomFloat(0.35, 0.55);
    const drawProb = randomFloat(0.2, 0.3);
    
    const outcomes = [
      { name: 'home', probability: homeStrength },
      { name: 'draw', probability: drawProb },
      { name: 'away', probability: 1 - homeStrength - drawProb }
    ];
    
    const calculated = calculateOdds(outcomes, this.margin);
    
    return {
      moneyline: calculated.map(o => ({
        selection: o.name === 'home' ? event.homeTeam : o.name === 'away' ? event.awayTeam : 'Draw',
        odds: parseFloat(o.adjustedOdds.toFixed(2)),
        outcome: o.name
      })),
      overUnder: [
        { line: 1.5, over: parseFloat(probabilityToOdds(randomFloat(0.3, 0.4)).toFixed(2)), under: parseFloat(probabilityToOdds(1 - randomFloat(0.3, 0.4)).toFixed(2)) },
        { line: 2.5, over: parseFloat(probabilityToOdds(randomFloat(0.45, 0.55)).toFixed(2)), under: parseFloat(probabilityToOdds(1 - randomFloat(0.45, 0.55)).toFixed(2)) },
        { line: 3.5, over: parseFloat(probabilityToOdds(randomFloat(0.6, 0.7)).toFixed(2)), under: parseFloat(probabilityToOdds(1 - randomFloat(0.6, 0.7)).toFixed(2)) }
      ],
      btts: [
        { selection: 'Yes', odds: parseFloat(probabilityToOdds(randomFloat(0.45, 0.55)).toFixed(2)) },
        { selection: 'No', odds: parseFloat(probabilityToOdds(1 - randomFloat(0.45, 0.55)).toFixed(2)) }
      ],
      spread: [
        { line: -1, selection: event.homeTeam, odds: parseFloat(probabilityToOdds(randomFloat(0.55, 0.65)).toFixed(2)) },
        { line: 1, selection: event.awayTeam, odds: parseFloat(probabilityToOdds(randomFloat(0.35, 0.45)).toFixed(2)) }
      ]
    };
  }
  
  generateBasketballOdds(event) {
    const homeStrength = randomFloat(0.45, 0.6);
    
    return {
      moneyline: [
        { selection: event.homeTeam, odds: parseFloat(probabilityToOdds(homeStrength).toFixed(2)) },
        { selection: event.awayTeam, odds: parseFloat(probabilityToOdds(1 - homeStrength).toFixed(2)) }
      ],
      spread: [
        { line: -3.5, selection: event.homeTeam, odds: 1.91 },
        { line: 3.5, selection: event.awayTeam, odds: 1.91 }
      ],
      overUnder: [
        { line: 210.5, over: 1.91, under: 1.91 },
        { line: 220.5, over: parseFloat(probabilityToOdds(randomFloat(0.4, 0.5)).toFixed(2)), under: parseFloat(probabilityToOdds(randomFloat(0.5, 0.6)).toFixed(2)) },
        { line: 230.5, over: parseFloat(probabilityToOdds(randomFloat(0.55, 0.65)).toFixed(2)), under: parseFloat(probabilityToOdds(randomFloat(0.35, 0.45)).toFixed(2)) }
      ]
    };
  }
  
  generateTennisOdds(event) {
    const playerStrength = randomFloat(0.4, 0.65);
    
    return {
      moneyline: [
        { selection: event.homeTeam, odds: parseFloat(probabilityToOdds(playerStrength).toFixed(2)) },
        { selection: event.awayTeam, odds: parseFloat(probabilityToOdds(1 - playerStrength).toFixed(2)) }
      ],
      overUnder: [
        { line: 22.5, over: 1.91, under: 1.91 },
        { line: 23.5, over: parseFloat(probabilityToOdds(randomFloat(0.4, 0.5)).toFixed(2)), under: parseFloat(probabilityToOdds(randomFloat(0.5, 0.6)).toFixed(2)) }
      ],
      spread: [
        { line: -2.5, selection: event.homeTeam, odds: 1.91 },
        { line: 2.5, selection: event.awayTeam, odds: 1.91 }
      ]
    };
  }
  
  generateHockeyOdds(event) {
    const homeStrength = randomFloat(0.45, 0.58);
    
    return {
      moneyline: [
        { selection: event.homeTeam, odds: parseFloat(probabilityToOdds(homeStrength).toFixed(2)) },
        { selection: event.awayTeam, odds: parseFloat(probabilityToOdds(1 - homeStrength).toFixed(2)) }
      ],
      overUnder: [
        { line: 5.5, over: parseFloat(probabilityToOdds(randomFloat(0.4, 0.5)).toFixed(2)), under: parseFloat(probabilityToOdds(randomFloat(0.5, 0.6)).toFixed(2)) },
        { line: 6.5, over: parseFloat(probabilityToOdds(randomFloat(0.55, 0.65)).toFixed(2)), under: parseFloat(probabilityToOdds(randomFloat(0.35, 0.45)).toFixed(2)) }
      ],
      spread: [
        { line: -1.5, selection: event.homeTeam, odds: parseFloat(probabilityToOdds(randomFloat(0.6, 0.7)).toFixed(2)) },
        { line: 1.5, selection: event.awayTeam, odds: parseFloat(probabilityToOdds(randomFloat(0.3, 0.4)).toFixed(2)) }
      ]
    };
  }
  
  updateLiveOdds(event, gameState) {
    const odds = this.generateOdds(event);
    
    if (gameState?.score) {
      const homeScore = gameState.score.home || 0;
      const awayScore = gameState.score.away || 0;
      
      if (odds.moneyline) {
        for (const bet of odds.moneyline) {
          if (bet.selection === event.homeTeam && homeScore > awayScore) {
            bet.odds = parseFloat((bet.odds * 0.7).toFixed(2));
          } else if (bet.selection === event.awayTeam && awayScore > homeScore) {
            bet.odds = parseFloat((bet.odds * 0.7).toFixed(2));
          }
        }
      }
    }
    
    return odds;
  }
}

// ─── Bet Slip ─────────────────────────────────────────────────

class BetSlip {
  constructor() {
    this.bets = [];
  }
  
  addBet(selection, eventId, odds, betType, stake) {
    const conflict = this.bets.find(b => 
      b.eventId === eventId && 
      b.betType === betType &&
      b.selection !== selection
    );
    
    if (conflict) {
      this.bets = this.bets.filter(b => b !== conflict);
    }
    
    const bet = {
      id: `bet_${uuid().slice(0, 10)}`,
      selection,
      eventId,
      odds: parseFloat(odds.toFixed(2)),
      betType,
      stake: Math.floor(stake * 100),
      potentialWin: Math.floor(stake * odds * 100),
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.bets.push(bet);
    return bet;
  }
  
  removeBet(betId) {
    this.bets = this.bets.filter(b => b.id !== betId);
  }
  
  clear() {
    this.bets = [];
  }
  
  getTotalStake() {
    return this.bets.reduce((sum, b) => sum + b.stake, 0);
  }
  
  getPotentialReturn() {
    return this.bets.reduce((sum, b) => sum + b.potentialWin, 0);
  }
  
  getParlayOdds() {
    if (this.bets.length === 0) return 0;
    
    let combinedOdds = 1;
    for (const bet of this.bets) {
      combinedOdds *= bet.odds;
    }
    
    return parseFloat(combinedOdds.toFixed(2));
  }
  
  getBets() {
    return [...this.bets];
  }
}

// ─── Bet Settlement Engine ────────────────────────────────────

class SettlementEngine {
  constructor() {
    this.settledBets = new Map();
    this.pendingEvents = new Set();
  }
  
  /**
   * Settle a single bet based on event result
   */
  settleBet(bet, eventResult) {
    const isWon = this.checkWin(bet, eventResult);
    const winAmount = isWon ? bet.potentialWin : 0;
    
    const settlement = {
      betId: bet.id,
      eventId: bet.eventId,
      selection: bet.selection,
      stake: bet.stake / 100,
      odds: bet.odds,
      isWon,
      winAmount: winAmount / 100,
      settledAt: new Date().toISOString(),
      status: isWon ? 'won' : 'lost'
    };
    
    this.settledBets.set(bet.id, settlement);
    return settlement;
  }
  
  /**
   * Check if a bet wins based on event result
   */
  checkWin(bet, eventResult) {
    switch (bet.betType) {
      case BET_TYPES.moneyline:
        return eventResult.winner === bet.selection;
        
      case BET_TYPES.overUnder:
        if (bet.selection === 'Over') {
          return eventResult.total > bet.line;
        }
        return eventResult.total < bet.line;
        
      case BET_TYPES.spread:
        const adjustedScore = eventResult.score.home + bet.line;
        if (bet.selection === eventResult.homeTeam) {
          return adjustedScore > eventResult.score.away;
        }
        return eventResult.score.home + bet.line < eventResult.score.away;
        
      case BET_TYPES.btts:
        if (bet.selection === 'Yes') {
          return eventResult.score.home > 0 && eventResult.score.away > 0;
        }
        return eventResult.score.home === 0 || eventResult.score.away === 0;
        
      default:
        return false;
    }
  }
  
  /**
   * Settle all bets for an event
   */
  settleEventBets(eventId, eventResult) {
    const settled = [];
    
    for (const [betId, settlement] of this.settledBets) {
      if (settlement.eventId === eventId && !settlement.isSettled) {
        settlement.isSettled = true;
        settled.push(settlement);
      }
    }
    
    this.pendingEvents.delete(eventId);
    return settled;
  }
  
  /**
   * Auto-settle all pending events that are finished
   */
  autoSettleFinishedEvents(finishedEvents) {
    const results = [];
    
    for (const eventId of finishedEvents) {
      if (this.pendingEvents.has(eventId)) {
        // Event is still pending - wait for manual result
        continue;
      }
      
      const eventSettlements = this.settleEventBets(eventId, finishedEvents[eventId]);
      results.push({ eventId, settlements: eventSettlements });
    }
    
    return results;
  }
  
  /**
   * Get all settled bets with optional user filter
   */
  getSettledBets(userId = null) {
    const bets = Array.from(this.settledBets.values());
    if (userId) {
      return bets.filter(b => b.userId === userId);
    }
    return bets;
  }
  
  /**
   * Get settlement statistics
   */
  getStats() {
    const allBets = Array.from(this.settledBets.values());
    
    const totalBets = allBets.length;
    const wonBets = allBets.filter(b => b.isWon).length;
    const lostBets = totalBets - wonBets;
    const totalStaked = allBets.reduce((sum, b) => sum + b.stake, 0);
    const totalWon = allBets.reduce((sum, b) => sum + b.winAmount, 0);
    
    return {
      totalBets,
      wonBets,
      lostBets,
      winRate: totalBets > 0 ? (wonBets / totalBets * 100).toFixed(1) + '%' : '0%',
      totalStaked: totalStaked.toFixed(2),
      totalWon: totalWon.toFixed(2),
      profit: (totalWon - totalStaked).toFixed(2)
    };
  }
}

// ─── Cash Out Engine ──────────────────────────────────────────

class CashOutEngine {
  calculateCashout(bet, currentOdds, houseEdge = 0.1) {
    if (bet.status !== 'pending') return null;
    
    const potentialWin = bet.stake * bet.odds;
    const currentValue = bet.stake * currentOdds;
    const cashoutValue = currentValue * (1 - houseEdge);
    
    return {
      available: currentOdds < bet.odds,
      value: Math.floor(cashoutValue),
      potentialWin: Math.floor(potentialWin),
      lostToHouse: Math.floor(currentValue - cashoutValue)
    };
  }
}

// ─── Live Event Simulator ─────────────────────────────────────

class LiveEventSimulator {
  constructor() {
    this.liveEvents = new Map();
    this.intervals = new Map();
  }
  
  startSimulation(eventsGenerator, oddsEngine) {
    const upcoming = eventsGenerator.getEvents(null, 'upcoming').slice(0, 5);
    
    for (const event of upcoming) {
      event.status = 'live';
      event.score = { home: 0, away: 0 };
      event.minute = 0;
      
      this.liveEvents.set(event.id, event);
      
      const interval = setInterval(() => {
        this.updateEvent(event, oddsEngine);
      }, 10000);
      
      this.intervals.set(event.id, interval);
    }
  }
  
  updateEvent(event, oddsEngine) {
    event.minute++;
    
    if (Math.random() < 0.08) {
      const scorer = Math.random() < 0.5 ? 'home' : 'away';
      event.score[scorer]++;
      
      console.log(`⚽ GOAL! ${event[scorer === 'home' ? 'homeTeam' : 'awayTeam']} scores in ${event.sport} (${event.minute}')`);
    }
    
    if (event.minute >= 90) {
      event.status = 'finished';
      this.stopEvent(event.id);
      
      console.log(`🏁 Event finished: ${event.homeTeam} ${event.score.home} - ${event.score.away} ${event.awayTeam}`);
    }
  }
  
  stopEvent(eventId) {
    const interval = this.intervals.get(eventId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(eventId);
    }
    this.liveEvents.delete(eventId);
  }
  
  getLiveEvents() {
    return Array.from(this.liveEvents.values());
  }
  
  stopAll() {
    for (const eventId of this.intervals.keys()) {
      this.stopEvent(eventId);
    }
  }
}

// ─── Factory Function ─────────────────────────────────────────

function createSportsBetting(config = {}) {
  const eventGenerator = new EventGenerator();
  const oddsEngine = new OddsEngine(config.margin || 0.05);
  const betSlip = new BetSlip();
  const settlementEngine = new SettlementEngine();
  const cashOutEngine = new CashOutEngine();
  const liveSimulator = new LiveEventSimulator();
  
  return {
    eventGenerator,
    oddsEngine,
    betSlip,
    settlementEngine,
    cashOutEngine,
    liveSimulator,
    
    getEvents: (sport, status) => eventGenerator.getEvents(sport, status),
    getEvent: (id) => eventGenerator.getEvent(id),
    getOdds: (eventId) => {
      const event = eventGenerator.getEvent(eventId);
      return event ? oddsEngine.generateOdds(event) : null;
    },
    getLiveEvents: () => liveSimulator.getLiveEvents(),
    startLiveSimulation: () => liveSimulator.startSimulation(eventGenerator, oddsEngine),
    stopLiveSimulation: () => liveSimulator.stopAll()
  };
}

// ─── SportsBettingEngine Class ────────────────────────────────

class SportsBettingEngine {
  constructor(config = {}) {
    this.eventGenerator = new EventGenerator();
    this.oddsEngine = new OddsEngine(config.margin || 0.05);
    this.settlementEngine = new SettlementEngine();
    this.cashOutEngine = new CashOutEngine();
    this.liveSimulator = new LiveEventSimulator();
    
    this.userBetSlips = new Map();
    this.userBets = new Map();
    
    this.config = config;
  }
  
  getEvents(sport = null, status = 'upcoming') {
    return this.eventGenerator.getEvents(sport, status);
  }
  
  getEvent(eventId) {
    return this.eventGenerator.getEvent(eventId);
  }
  
  getLiveEvents() {
    return this.liveSimulator.getLiveEvents();
  }
  
  startLiveSimulation() {
    this.liveSimulator.startSimulation(this.eventGenerator, this.oddsEngine);
  }
  
  stopLiveSimulation() {
    this.liveSimulator.stopAll();
  }
  
  getOdds(eventId) {
    const event = this.eventGenerator.getEvent(eventId);
    return event ? this.oddsEngine.generateOdds(event) : null;
  }
  
  getLiveOdds(eventId) {
    const event = this.eventGenerator.getEvent(eventId);
    if (!event || event.status !== 'live') return null;
    
    return this.oddsEngine.updateLiveOdds(event, { score: event.score });
  }
  
  getBetSlip(userId) {
    if (!this.userBetSlips.has(userId)) {
      this.userBetSlips.set(userId, new BetSlip());
    }
    return this.userBetSlips.get(userId);
  }
  
  addBetToSlip(userId, selection, eventId, odds, betType, stake) {
    const slip = this.getBetSlip(userId);
    return slip.addBet(selection, eventId, odds, betType, stake);
  }
  
  removeBetFromSlip(userId, betId) {
    const slip = this.getBetSlip(userId);
    slip.removeBet(betId);
  }
  
  clearBetSlip(userId) {
    const slip = this.getBetSlip(userId);
    slip.clear();
  }
  
  getSlipSummary(userId) {
    const slip = this.getBetSlip(userId);
    return {
      bets: slip.getBets(),
      totalStake: slip.getTotalStake() / 100,
      potentialReturn: slip.getPotentialReturn() / 100,
      parlayOdds: slip.getParlayOdds()
    };
  }
  
  submitBet(userId, betId, idempotencyKey) {
    const slip = this.getBetSlip(userId);
    const bet = slip.getBets().find(b => b.id === betId);
    
    if (!bet) {
      return { error: 'Bet not found in slip' };
    }
    
    bet.userId = userId;
    bet.submittedAt = Date.now();
    bet.idempotencyKey = idempotencyKey || `sub_${uuid().slice(0, 12)}`;
    bet.status = 'pending';
    
    this.userBets.set(bet.id, { bet, userId });
    slip.removeBet(betId);
    
    return {
      success: true,
      bet: {
        ...bet,
        stake: bet.stake / 100,
        potentialWin: bet.potentialWin / 100
      }
    };
  }
  
  settleEvent(eventId, result) {
    const settled = [];
    
    for (const [betId, data] of this.userBets) {
      if (data.bet.eventId === eventId && data.bet.status === 'pending') {
        const settlement = this.settlementEngine.settleBet(data.bet, result);
        settlement.userId = data.userId;
        data.bet.status = 'settled';
        settled.push(settlement);
      }
    }
    
    return settled;
  }
  
  getUserBets(userId) {
    const bets = [];
    for (const [betId, data] of this.userBets) {
      if (data.userId === userId) {
        bets.push({
          ...data.bet,
          stake: data.bet.stake / 100,
          potentialWin: data.bet.potentialWin / 100
        });
      }
    }
    return bets.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  }
  
  getCashoutValue(userId, betId, currentOdds) {
    const data = this.userBets.get(betId);
    if (!data || data.userId !== userId) return null;
    
    return this.cashOutEngine.calculateCashout(data.bet, currentOdds);
  }
  
  processCashout(userId, betId, currentOdds) {
    const data = this.userBets.get(betId);
    if (!data || data.userId !== userId) return { error: 'Bet not found' };
    
    const cashout = this.cashOutEngine.calculateCashout(data.bet, currentOdds);
    if (!cashout || !cashout.available) {
      return { error: 'Cashout not available' };
    }
    
    data.bet.status = 'cashed_out';
    data.bet.cashoutValue = cashout.value / 100;
    data.bet.cashedOutAt = new Date().toISOString();
    
    return {
      success: true,
      cashoutValue: cashout.value / 100,
      bet: data.bet
    };
  }
  
  getSports() {
    return SPORTS;
  }
  
  getLeagues(sport) {
    const sportData = SPORTS[sport];
    return sportData ? sportData.leagues : [];
  }
}

// ─── Exports ──────────────────────────────────────────────────

export {
  SportsBettingEngine,
  EventGenerator,
  OddsEngine,
  BetSlip,
  SettlementEngine,
  CashOutEngine,
  LiveEventSimulator,
  createSportsBetting,
  SPORTS,
  BET_TYPES,
  calculateOdds,
  decimalToProbability,
  probabilityToOdds
};

export default createSportsBetting;