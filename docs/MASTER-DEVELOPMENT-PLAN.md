# 🚀 MASTER DEVELOPMENT PLAN — Casino Platform v4.0

**Дата создания:** 2026-08-05
**Версия:** 4.0.0 Planning
**Статус:** 🔴 ПЛАН РАЗРАБОТКИ

---

## 📋 СОДЕРЖАНИЕ

1. [Текущее состояние платформы](#текущее-состояние-платформы)
2. [Evolution Live Dealer Games](#evolution-live-dealer-games)
3. [Pragmatic Live Dealer Games](#pragmatic-live-dealer-games)
4. [SportBetBy Sports Betting](#sportbetby-sports-betting)
5. [Analytics Systems Integration](#analytics-systems-integration)
6. [Bot Simulation System](#bot-simulation-system)
7. [Roadmap & Timeline](#roadmap--timeline)
8. [Resource Requirements](#resource-requirements)

---

## ТЕКУЩЕЕ СОСТОЯНИЕ ПЛАТФОРМЫ

### ✅ Что уже реализовано:
| Компонент | Статус | Детали |
|-----------|--------|--------|
| Core Game Logic | ✅ | Math.js, RNG, Provably Fair |
| Slot Engine | ✅ | Pixi.js-based, config-driven |
| Crash Games | ✅ | Crash Pro v4 with autoPlay/martingale |
| Table Games | ✅ | Blackjack, Baccarat, Roulette |
| Instant Games | ✅ | Plinko, Lightning Dice |
| Sound Engine | ✅ | Web Audio API |
| VFX Engine | ✅ | Particles, Shake, Flash |
| Config System | ✅ | casino-config.js (654 lines) |
| Catalog | ✅ | 48 playable games |
| Server | ✅ | Express + SQLite + JWT |
| CI/CD | ✅ | GitHub Actions |

### 📊 Текущая статистика:
- **240 игр в каталоге** (конфигурация)
- **48 playable игр** (фактически реализованы)
- **9 v3 Premium игр** (с полной анимацией и VFX)
- **8 провайдеров** в каталоге

---

## EVOLUTION LIVE DEALER GAMES

### ⚠️ ВАЖНОЕ ПРИМЕЧАНИЕ О ЛИЦЕНЗИЯХ

Evolution — зарегистрированный товарный знак Evolution AB. Точные копии их игр требуют:
1. **Лицензия провайдера** — коммерческое соглашение с Evolution AB
2. **White-label лицензия казино** — юридическая лицензия на работу (Malta, Curacao, UKGC)
3. **API доступ** — платный доступ к их проприетарному ПО

**Легальная альтернатива:** Создать ОРИГИНАЛЬНЫЕ live dealer игры с ПОХОЖЕЙ механикой, но уникальным дизайном и названием. Это стандартная практика в индустрии.

### 🎯 Список игр для разработки (оригинальные версии)

#### 1. 🎥 Live Blackjack Original
**Механика на основе Evolution Lightning Blackjack:**
- 8 колод (казино стандарт)
- Side bets: 21+3, Perfect Pairs
- Multiplier cards (2×-100×) на случайных картах
- Auto-cam switching между столами
- Bet range: $0.50 - $10,000

**Технический стек:**
```javascript
// Frontend
- WebRTC streaming (live dealer video)
- Canvas overlay для карт и UI
- Pixi.js для анимаций
- WebSocket для real-time данных

// Backend
- Node.js + Socket.io для real-time коммуникации
- MediaServer (LiveKit или Janus) для WebRTC
- PostgreSQL для истории игр
- Redis для сессий
```

**Компоненты:**
```javascript
class LiveBlackjackEngine {
  // Core game state
  tables: Array<Table>        // 10+ столов одновременно
  players: Map<sessionId, Player>
  dealer: Dealer              // AI или real video feed
  
  // Game flow
  deal()                      // Раздача карт
  hit()                       // Ещё карта
  stand()                     // Хватит
  doubleDown()                // Удвоение ставки
  split()                     // Разделение пар
  
  // Side bets
  check21Plus3()              // Blackjack + first 2 cards vs dealer
  checkPerfectPairs()         // Pair types (mixed, colored, perfect)
  
  // Multipliers (Lightning feature)
  assignMultipliers()         // Random 2×-100× на 5 картах
}

class Table {
  id: string
  name: string                // "Table 1", "VIP Room A"
  minBet: number
  maxBet: number
  dealer: Dealer              // Video stream URL
  playersAtTable: number      // Max 7 + dealer
  gameStage: 'betting' | 'dealing' | 'settling' | 'next'
  bettingTimer: number        // Countdown seconds
}

class Player {
  sessionId: string
  bets: Array<Bet>            // Main bet + side bets
  hand: Card[]                // Player's cards
  standing: boolean           // Already stood?
  splitHands?: Card[][]       // If split was made
}
```

**UI/UX требования:**
- Full-screen video stream (dealer camera)
- Overlay UI для ставок (полупрозрачный)
- Chat с дилером и другими игроками
- History panel (предыдущие результаты)
- Statistics dashboard (win/loss ratio, streaks)

**Анимации:**
- Card dealing with real physics
- Chip placement animation
- Win celebration (particles + sound)
- Multiplier reveal (dramatic zoom)

---

#### 2. 🎥 Live Roulette Original
**Механика на основе Evolution Lightning Roulette:**
- European roulette (0-36)
- 1-5 random multipliers (50×-500×) на числах
- Auto-bet presets
- Statistics: hot/cold numbers, sectors

**Компоненты:**
```javascript
class LiveRouletteEngine {
  wheel: Wheel                  // European (single zero)
  ball: Ball                    // Physics simulation
  table: RouletteTable          // All betting positions
  
  spin()                        // Start spin animation
  settle()                      // Determine winning number
  applyMultipliers()            // Lightning multipliers
  payout(bet: Bet): number      // Calculate winnings
}

// Betting layout (all standard bets)
const BET_TYPES = {
  straight: 36,              // Single number ×35
  split: 18,                 // Two numbers ×17
  street: 12,                // Three numbers ×11
  corner: 9,                 // Four numbers ×8
  sixLine: 6,                // Six numbers ×5
  column: 3,                 // Column bet ×2
  dozen: 3,                  // Dozen bet ×2
  redBlack: 2,               // Color ×1
  oddEven: 2,                // Odd/Even ×1
  highLow: 2,                // 1-18/19-36 ×1
}
```

**Physics simulation:**
```javascript
class RoulettePhysics {
  wheelSpeed: number          // Radians per second
  ballSpeed: number           // Initial velocity
  friction: number            // Deceleration rate
  
  simulate(): WinningNumber {
    // Real physics-based spin animation
    // Ball decelerates and lands in random pocket
    // Visual matches actual result (server-determined)
  }
}
```

---

#### 3. 🎥 Live Baccarat Original
**Механика на основе Evolution Speed Baccarat:**
- Fast dealing (15-second rounds)
- Commission 5% on Banker wins
- Side bets: Pair, Perfect Pair, Super 6
- Multiplier side bet (up to 25×)

**Компоненты:**
```javascript
class LiveBaccaratEngine {
  decks: number                 // 8 decks standard
  shoe: CardShoe
  
  deal() {
    // Player and Banker receive 2 cards
    // Third card rules applied automatically
    // Winner determined
  }
  
  applyThirdCardRules(hand: Hand): boolean {
    // Natural (8 or 9) — no third card
    // Player draws on 0-5, stands on 6-7
    // Banker draw depends on Player's third card
  }
}
```

---

#### 4. 🎥 Live Game Shows Original
**Механика на основе Evolution Crazy Time / Monopoly Live:**
- Wheel-based game with bonus rounds
- Main wheel: 54 segments (numbers + bonuses)
- 4 bonus games: Cash Hunt, Pachinko, Coin Flip, Crazy Time

**Компоненты:**
```javascript
class GameShowEngine {
  wheel: PrizeWheel             // 54 segments
  topSlot: TopSlot              // Multiplier slot machine
  
  spin() {
    // Determine result first (server-side)
    // Animate wheel to land on result
    // Trigger bonus if landed on bonus segment
  }
  
  async playCashHunt() {          // Pick-and-click bonus
    // Grid of hidden multipliers
    // Player selects one
  }
  
  async playPachinko() {          // Drop puck down board
    // Puck bounces through pegs
    // Lands in multiplier column
  }
  
  async playCoinFlip() {          // Simple coin toss
    // Red vs Blue side
  }
  
  async playCrazyTime() {         // Ultimate bonus
    // Double wheel with escalating multipliers
  }
}
```

---

#### 5. 🎥 Live Poker Original (Casino Hold'em)
**Механика на основе Evolution Casino Hold'em:**
- Player vs House (not player vs player)
- Ante + Raise betting structure
- Community cards (Texas Hold'em style)
- Bonus bets: Pair Plus, AA Plus

---

### 📐 Архитектура Live Dealer системы

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                  │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Video    │  │ Canvas   │  │  WebSocket       │  │
│  │ Stream   │  │ Overlay  │  │  Game Data       │  │
│  │ (WebRTC) │  │ (Pixi.js)│  │  Real-time       │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│              MEDIA SERVER (LiveKit/Janus)            │
│  ┌──────────────────────────────────────────────┐   │
│  │  Dealer Camera → Encoder → WebRTC Stream     │   │
│  └──────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│              APPLICATION SERVER (Node.js)            │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Game       │  │ Socket.io  │  │ WebSocket    │  │
│  │ Engine     │  │ Handler    │  │ Broadcasting │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Provably   │  │ Rate       │  │ Session      │  │
│  │ Fair RNG   │  │ Limiter    │  │ Manager      │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────┤
│                   DATABASE LAYER                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Postgres │  │  Redis   │  │  S3/Cloud Storage│  │
│  │ (Games)  │  │ (Cache)  │  │  (Video Record)  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 🎮 Реализация — Фаза 1: Live Blackjack

**Этап 1.1: Backend (2 недели)**
```javascript
// server/src/live-games/blackjack/engine.js
class LiveBlackjackEngine {
  constructor(config) {
    this.decks = config.decks || 8;
    this.shoe = new CardShoe(this.decks);
    this.tables = new Map(); // tableId -> Table instance
    this.rng = new ProvablyFairRng();
  }
  
  createTable(tableConfig) {
    // Create new table with betting limits
  }
  
  placeBet(sessionId, betData) {
    // Validate and record player bet
  }
  
  dealRound(tableId) {
    // Deal cards to all players and dealer
  }
  
  resolveRound(tableId) {
    // Calculate winnings for all players
  }
}

// server/src/live-games/blackjack/routes.js
router.post('/tables', createTable);
router.post('/tables/:id/bet', placeBet);
router.post('/tables/:id/deal', dealRound);
router.post('/tables/:id/hit', hit);
router.post('/tables/:id/stand', stand);
router.get('/tables/:id/history', getHistory);
```

**Этап 1.2: Frontend (3 недели)**
```javascript
// public/games/live-blackjack/index.html
// Single-file game client with:
// - Video stream integration
// - Canvas overlay for cards
// - Betting UI
// - Chat system
// - Statistics panel

// Core components:
class LiveBlackjackClient {
  videoPlayer;           // WebRTC stream
  canvas;                // Pixi.js overlay
  socket;                // WebSocket connection
  
  async connect(streamUrl) {
    // Connect to video stream
    // Connect to game data WebSocket
    // Initialize UI
  }
  
  placeBet(amount, position) {
    // Send bet to server
    // Animate chips on canvas
  }
  
  onCardDeal(cards) {
    // Animate card dealing on canvas
  }
  
  onResult(result) {
    // Show win/loss animation
    // Update balance
  }
}
```

**Этап 1.3: Video Integration (2 недели)**
```javascript
// Для MVP используем:
// 1. Pre-recorded dealer videos (looped animations)
// 2. SVG/CSS анимации для карт
// 3. Real-time WebSocket data overlay

// Позже можно добавить:
// - Real dealer camera feed
// - AI-generated dealer avatar
// - Full WebRTC implementation
```

---

## PRAGMATIC LIVE DEALER GAMES

### 🎯 Список игр для разработки

#### 1. 🎥 Sweet Bonanza Candy Crash (Pragmatic style)
**Механика на основе Pragmatic Drop + Crash:**
- Candy-themed crash game
- Falling candy multipliers
- Multiplier ladder with progressive wins
- Double chance feature

#### 2. 🎥 Lucky Wheel Pragmatic
**Механика на основе Pragmatic Lucky Wheel:**
- Spinning wheel with 54 segments
- Top Slot multiplier system
- Bonus: Coin Flip, Pachinko
- History and statistics

#### 3. 🎥 Dragon Tiger Live
**Механика на основе Evolution Dragon Tiger (Pragmatic version):**
- Fast card comparison game
- Side bets: Suited Result, Tie, Big/Small
- Multiplier cards up to 25×

#### 4. 🎥 Baccarat Super Sic Bo
**Оригинальная игра с механикой костей:**
- 3 dice with multipliers
- Bet on specific combinations
- Lightning multipliers on random numbers
- Fast rounds (10 seconds)

---

## SPORTBETBY SPORTS BETTING

### 📐 Архитектура Sports Betting Platform

```
┌─────────────────────────────────────────────────────┐
│              SPORTS BETTING PLATFORM                 │
├─────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Live       │  │ Pre-Match  │  │  Cash Out    │  │
│  │ Betting    │  │ Betting    │  │  Engine      │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Odds       │  │ Bet        │  │  Settlement  │  │
│  │ Engine     │  │ Slip       │  │  Engine      │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────┤
│              EXTERNAL ODDS PROVIDERS                 │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Bet367     │  │ Sportradar │  │  OddsPortal  │  │
│  │ API        │  │ API        │  │  (Scraping)  │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────┤
│              SPORTS DATA FEEDS                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │ Live       │  │ Results    │  │  Statistics  │  │
│  │ Scores     │  │ Feed       │  │  API         │  │
│  └────────────┘  └────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 🏆 Поддерживаемые виды спорта (Фаза 1)

| Вид спорта | Лиги | Live поддержка |
|------------|------|:--------------:|
| ⚽ Футбол | Premier League, La Liga, Serie A, Bundesliga, Champions League | ✅ |
| 🏀 Баскетбол | NBA, EuroLeague | ✅ |
| 🎾 Теннис | ATP, WTA, Grand Slams | ✅ |
| 🏒 Хоккей | NHL, KHL | ✅ |
| ⚾ Бейсбол | MLB | ✅ |
| 🏐 Волейбол | FIVB | ❌ |
| 🥊 Бокс/MMA | UFC, Boxing Majors | ❌ (events only) |

### 💰 Типы ставок

```javascript
const BET_TYPES = {
  // Moneyline / Match Winner
  moneyline: 'moneyline',
  
  // Handicap
  spread: 'spread',
  
  // Total points/goals
  overUnder: 'overUnder',
  
  // Both teams to score
  btts: 'btts',
  
  // Correct score
  correctScore: 'correctScore',
  
  // First scorer
  firstScorer: 'firstScorer',
  
  // Parlay / Accumulator
  parlay: 'parlay',
  
  // System bets (2/3, 2/4, etc.)
  system: 'system',
  
  // Live in-play bets
  live: 'live',
  
  // Virtual sports
  virtual: 'virtual',
};
```

### 📐 Компоненты Sports Betting

**1. Odds Engine:**
```javascript
class OddsEngine {
  constructor(provider) {
    this.provider = provider;  // Bet367 API, Sportradar, etc.
    this.margin = 0.05;        // 5% bookmaker margin
    this.updateInterval = 30000; // 30 seconds
  }
  
  fetchOdds(sport, league, eventId) {
    // Fetch from external provider
    // Apply margin
    // Convert to desired format (decimal/fractional/American)
  }
  
  calculateProbability(odds) {
    // Implied probability = 1 / decimal_odds
    // Include overround
  }
  
  updateLiveOdds(event) {
    // Real-time odds adjustment based on game state
    // Score, time remaining, possession, etc.
  }
}
```

**2. Bet Slip:**
```javascript
class BetSlip {
  bets: Array<Bet>;
  totalStake: number;
  potentialReturn: number;
  
  addBet(selection, odds, stake) {
    // Validate bet
    // Calculate potential return
    // Check for conflicts (same event, different outcomes)
  }
  
  calculateParlayOdds(bets) {
    // Combined odds = product of individual decimal odds
    // Apply parlay bonus if applicable
  }
  
  submit() {
    // Send to server for validation
    // Wait for settlement
  }
}
```

**3. Settlement Engine:**
```javascript
class SettlementEngine {
  async settleBet(betId, result) {
    // Verify bet status
    // Calculate winnings
    // Update user balance
    // Trigger notifications
  }
  
  async cashOut(betId, currentOdds) {
    // Calculate cashout value
    // Check if cashout is available
    // Process cashout
  }
}
```

---

## ANALYTICS SYSTEMS INTEGRATION

### 📊 Рекомендуемые системы аналитики

#### 1. **Google Analytics 4 (GA4)** — Базовая аналитика
```javascript
// Installation
const gtagScript = document.createElement('script');
gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
document.head.appendChild(gtagScript);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

// Custom events for casino
gtag('event', 'spin_complete', {
  game_id: 'book-of-gold',
  bet_amount: 10,
  win_amount: 50,
  rtp: 5.0,
  session_id: sessionId
});

gtag('event', 'bet_placed', {
  sport: 'football',
  league: 'premier_league',
  bet_type: 'moneyline',
  stake: 25,
  potential_return: 47.5
});
```

#### 2. **Mixpanel** — Event-based analytics
```javascript
import mixpanel from 'mixpanel-browser';
mixpanel.init('TOKEN');

// Track player journey
mixpanel.track('Game Started', {
  game_id: 'crash-pro',
  bet_amount: S.betAmount,
  balance: S.balance,
  device: navigator.userAgent,
  platform: navigator.platform
});

mixpanel.track('Session End', {
  duration: Date.now() - sessionStart,
  total_bets: roundsPlayed,
  net_win: totalWon - totalBet,
  rtp: totalWon / totalBet
});
```

#### 3. **Amplitude** — Behavioral analytics
```javascript
// User segmentation and funnel analysis
amplitude.track({
  event_type: 'big_win',
  event_properties: {
    amount: winAmount,
    game: gameId,
    multiplier: winAmount / betAmount
  }
});
```

#### 4. **Custom Analytics Engine** — Платформенная аналитика
```javascript
// server/src/analytics/index.js
class PlatformAnalytics {
  constructor(db) {
    this.db = db;
    this.events = new EventStream();
  }
  
  async trackEvent(event) {
    // Store in PostgreSQL (analytics schema)
    // Push to Redis for real-time dashboards
    // Forward to external services (GA4, Mixpanel)
  }
  
  getRealTimeStats() {
    // Active players
    // Total bets per minute
    // Total wagered
    // Total paid out
    // RTP (live)
  }
  
  getPlayerProfile(playerId) {
    // Session history
    // Game preferences
    // Win/loss patterns
    // VIP level progression
  }
}

// Analytics dashboard endpoints
router.get('/analytics/realtime', getRealTimeStats);
router.get('/analytics/players/:id', getPlayerProfile);
router.get('/analytics/games/:id', getGameAnalytics);
router.get('/analytics/revenue', getRevenueReport);
```

#### 5. **Heatmap & Session Recording** — Hotjar / Microsoft Clarity
```javascript
// Hotjar installation for UX analysis
<!-- Hotjar Tracking Code -->
<script>
  (function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:XXXXXXXX,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

#### 6. **Fraud Detection** — Custom ML Pipeline
```javascript
// server/src/analytics/fraud-detection.js
class FraudDetection {
  constructor(model) {
    this.model = model; // Trained on historical data
  }
  
  async analyzeBehavior(playerId) {
    const behavior = await this.getPlayerBehavior(playerId);
    const riskScore = this.model.predict(behavior);
    
    return {
      riskLevel: riskScore > 0.8 ? 'high' : riskScore > 0.5 ? 'medium' : 'low',
      flags: this.detectAnomalies(behavior),
      recommendations: this.getRecommendations(riskScore)
    };
  }
  
  detectAnomalies(behavior) {
    const flags = [];
    
    // Unusual betting patterns
    if (behavior.betVelocity > threshold) {
      flags.push('HIGH_BET_VELOCITY');
    }
    
    // Bonus abuse detection
    if (behavior.bonusUsageRate > threshold) {
      flags.push('POTENTIAL_BONUS_ABUSE');
    }
    
    // Chip dumping detection (multiplayer games)
    if (this.detectChipDumping(behavior)) {
      flags.push('CHIP_DUMPING_SUSPECTED');
    }
    
    return flags;
  }
}
```

#### 7. **A/B Testing Framework**
```javascript
// server/src/analytics/ab-testing.js
class ABTesting {
  constructor() {
    this.experiments = new Map();
  }
  
  async assignVariant(userId, experimentId) {
    // Consistent assignment using hash
    const variantHash = crypto.createHash('md5')
      .update(`${userId}-${experimentId}`)
      .digest('hex');
    
    const variantIndex = parseInt(variantHash, 16) % 100;
    return this.getVariantForPercentile(variantIndex);
  }
  
  async trackConversion(experimentId, variantId, conversionEvent) {
    // Store conversion data
    // Calculate statistical significance
    // Determine winner when n > threshold
  }
}
```

---

## BOT SIMULATION SYSTEM

### 🤖 Архитектура Bot System

**Цель:** Имитировать активность реальных игроков для создания живого сообщества

#### Компоненты ботов:

```javascript
// server/src/bots/index.js
class BotManager {
  constructor(config) {
    this.bots = new Map(); // botId -> Bot instance
    this.config = config;
    this.stats = {
      totalBots: 0,
      activeBots: 0,
      simulatedPlayers: 0
    };
  }
  
  async initialize() {
    // Load bot configurations
    // Create bot instances
    // Start simulation loops
  }
  
  getSimulatedState(gameId) {
    // Return fake player data for display
    // Include bot names, avatars, bet amounts
  }
}

class BotPlayer {
  constructor(config) {
    this.id = `bot_${uuid()}`;
    this.name = this.generateName();
    this.avatar = config.avatar || this.randomAvatar();
    this.playStyle = config.playStyle || 'balanced'; // aggressive, conservative, balanced
    this.sessionDuration = this.randomSessionDuration();
    this.balance = this.randomBalance();
    this.favoriteGames = this.selectFavoriteGames();
    this.currentGame = null;
    this.currentBet = 0;
    this.winningsHistory = [];
    this.isOnline = true;
    this.lastActive = Date.now();
  }
  
  generateName() {
    const prefixes = ['Lucky', 'Win', 'Gold', 'Star', 'Royal', 'Mega', 'Super'];
    const suffixes = ['Player', 'Gamer', 'Pro', 'Master', 'King', 'Queen', 'Ace'];
    return `${prefixes[random(0,prefixes.length)]}${random(1,999)}`;
  }
  
  async playGame(gameId) {
    this.currentGame = gameId;
    
    switch (this.playStyle) {
      case 'aggressive':
        this.currentBet = this.randomAggressiveBet();
        break;
      case 'conservative':
        this.currentBet = this.randomConservativeBet();
        break;
      case 'balanced':
      default:
        this.currentBet = this.randomBalancedBet();
        break;
    }
    
    // Simulate game result (using real math, not random)
    const result = await this.simulateGameResult(gameId, this.currentBet);
    
    this.balance += result.win;
    this.winningsHistory.push(result);
    this.lastActive = Date.now();
    
    return {
      botId: this.id,
      name: this.name,
      avatar: this.avatar,
      gameId,
      bet: this.currentBet,
      win: result.win,
      multiplier: result.multiplier,
      timestamp: Date.now()
    };
  }
  
  async simulateGameResult(gameId, betAmount) {
    // Use actual game math (not pure random)
    // This ensures RTP is maintained
    const mathResult = await callMathEngine(gameId, betAmount);
    
    return {
      win: mathResult.totalWin,
      multiplier: mathResult.totalWin / betAmount
    };
  }
  
  getRandomSessionDuration() {
    // 5 minutes to 4 hours (realistic distribution)
    return random(300000, 14400000);
  }
  
  getRandomBalance() {
    // $100 - $50,000 (weighted toward lower amounts)
    const tier = random(0, 100);
    if (tier < 60) return random(100, 1000);       // 60%: $100-$1000
    if (tier < 85) return random(1000, 5000);      // 25%: $1000-$5000
    if (tier < 95) return random(5000, 20000);     // 10%: $5000-$20000
    return random(20000, 50000);                    // 5%: $20000-$50000
  }
}
```

#### Bot Behavior Profiles:

```javascript
const BOT_PROFILES = {
  // 30% of bots — Casual players
  casual: {
    playStyle: 'conservative',
    betRange: [1, 50],
    sessionDuration: [30, 120] + 'min',
    games: ['slots', 'simple_games'],
    behavior: {
      takeBreaks: true,
      breakInterval: [5, 30] + 'min',
      changeGames: true,
      chatFrequency: 'low'
    }
  },
  
  // 40% of bots — Regular players
  regular: {
    playStyle: 'balanced',
    betRange: [5, 200],
    sessionDuration: [15, 240] + 'min',
    games: ['all'],
    behavior: {
      takeBreaks: true,
      breakInterval: [10, 60] + 'min',
      changeGames: true,
      chatFrequency: 'medium'
    }
  },
  
  // 20% of bots — High rollers
  highRoller: {
    playStyle: 'aggressive',
    betRange: [100, 5000],
    sessionDuration: [30, 180] + 'min',
    games: ['live_games', 'crash', 'poker'],
    behavior: {
      takeBreaks: false,
      changeGames: false,
      chatFrequency: 'high'
    }
  },
  
  // 10% of bots — Bonus hunters
  bonusHunter: {
    playStyle: 'varied',
    betRange: [10, 100],
    sessionDuration: [10, 60] + 'min',
    games: ['high_rtp_slots'],
    behavior: {
      claimBonuses: true,
      wagerRequirements: true,
      changeGames: true,
      chatFrequency: 'low'
    }
  }
};
```

#### Real-time Simulation Feed:

```javascript
// server/src/bots/simulation.js
class SimulationFeed {
  constructor(botManager) {
    this.bots = botManager.bots;
    this.feed = new EventStream(); // For broadcasting to clients
  }
  
  async start() {
    // Main simulation loop
    setInterval(async () => {
      const activeBots = Array.from(this.bots.values())
        .filter(bot => bot.isOnline && !bot.currentGame);
      
      for (const bot of activeBots) {
        if (Math.random() < 0.3) { // 30% chance to start playing
          const gameId = bot.selectFavoriteGames()[random(0, 2)];
          const result = await bot.playGame(gameId);
          this.feed.emit('bot_action', result);
        }
      }
    }, 5000); // Check every 5 seconds
  }
  
  getLivePlayers() {
    // Return list of "online" players for display
    return Array.from(this.bots.values())
      .filter(bot => bot.isOnline)
      .map(bot => ({
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        lastWin: bot.winningsHistory[0]?.win || 0,
        gamesPlayed: bot.winningsHistory.length,
        online: true
      }));
  }
}
```

#### Client-side Integration:

```javascript
// public/games/_components/live-players.js
class LivePlayersWidget {
  constructor(container) {
    this.container = container;
    this.socket = new WebSocket('ws://localhost:3000/bots/feed');
    this.players = [];
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.updatePlayerList(data);
    };
  }
  
  updatePlayerList(botAction) {
    // Add bot to live players list
    // Show toast notification: "LuckyPlayer123 won $50 on Book of Gold"
    // Update leaderboard
  }
}

// Example toast notifications from bots:
// ✅ "Alex_Win777 just won $125 on Crash Pro (12.5×)"
// ✅ "Maria_Lucky joined Live Blackjack Table 3"
// ✅ "GoldMiner42 placed $50 bet on Roulette"
// ✅ "ProGamer999 cashed out at 3.2× in Crash Pro (+$64)"
```

#### Bot Configuration:

```javascript
// config/bots.js
module.exports = {
  enabled: true,
  
  // Number of simulated players
  maxBots: 500,
  
  // Growth over time (based on real player count)
  botToRealRatio: 3, // 3 bots per 1 real player (max)
  
  // Bot profiles distribution
  profiles: {
    casual: 0.30,
    regular: 0.40,
    highRoller: 0.20,
    bonusHunter: 0.10
  },
  
  // Realism settings
  realism: {
    variableSessionLengths: true,
    realisticBetPatterns: true,
    emotionalBehavior: true, // Tilt after losses, chase wins
    socialInteraction: true, // Chat messages
    deviceVariation: true     // Different devices/browsers
  },
  
  // Chat simulation (optional)
  chat: {
    enabled: false, // Disable by default to avoid moderation issues
    messages: [
      "Nice win!", "Anyone hitting big lately?", "This game is fun",
      "Just hit a 50× on slots! 🎉", "Going for it!", "GG"
    ],
    frequency: 'low' // low/medium/high
  }
};
```

---

## ROADMAP & TIMELINE

### 📅 Phase 1: Foundation (Weeks 1-4)

| Неделя | Задача | Приоритет | Результат |
|--------|--------|-----------|-----------|
| 1 | Analytics Integration (GA4, Mixpanel, Custom) | 🔴 P0 | Полная система аналитики |
| 2 | Bot System — Core Engine | 🔴 P0 | Базовые боты для симуляции |
| 3 | Bot System — Behavior Profiles | 🟡 P1 | Разные типы игроков |
| 4 | Live Game Infrastructure | 🔴 P0 | WebSocket + Media Server |

### 📅 Phase 2: Live Dealer Games (Weeks 5-12)

| Неделя | Задача | Приоритет | Результат |
|--------|--------|-----------|-----------|
| 5-6 | Live Blackjack Original | 🔴 P0 | Полная реализация |
| 7-8 | Live Roulette Original | 🔴 P0 | Полная реализация |
| 9 | Live Baccarat Original | 🟡 P1 | Базовая реализация |
| 10 | Live Game Show (Wheel) | 🟡 P1 | Базовая реализация |
| 11-12 | Video Integration | 🟡 P1 | Pre-recorded dealer videos |

### 📅 Phase 3: Sports Betting (Weeks 13-20)

| Неделя | Задача | Приоритет | Результат |
|--------|--------|-----------|-----------|
| 13-14 | Odds Engine + External APIs | 🔴 P0 | Получение коэффициентов |
| 15-16 | Bet Slip + Settlement | 🔴 P0 | Основная система ставок |
| 17-18 | Live Betting Engine | 🔴 P0 | Real-time ставки |
| 19 | Sports UI/UX | 🟡 P1 | Интерфейс ставок |
| 20 | Cash Out System | 🟡 P1 | Функция кэшаута |

### 📅 Phase 4: Pragmatic Games (Weeks 21-24)

| Неделя | Задача | Приоритет | Результат |
|--------|--------|-----------|-----------|
| 21-22 | Sweet Bonanza Crash | 🟡 P1 | Оригинальная игра |
| 23-24 | Lucky Wheel + Dragon Tiger | 🟢 P2 | Базовая реализация |

### 📅 Phase 5: Polish & Launch (Weeks 25-28)

| Неделя | Задача | Приоритет | Результат |
|--------|--------|-----------|-----------|
| 25-26 | Advanced Analytics Dashboard | 🟡 P1 | Real-time dashboard |
| 27 | Fraud Detection | 🟡 P1 | ML-based detection |
| 28 | QA + Performance + Launch | 🔴 P0 | Production ready |

---

## RESOURCE REQUIREMENTS

### 👥 Команда разработки

| Роль | Кол-во | Ответственность |
|------|--------|-----------------|
| Lead Developer | 1 | Архитектура, core systems |
| Backend Developer | 2 | API, database, odds engine |
| Frontend Developer | 2 | Game clients, UI/UX |
| Game Developer | 2 | Game mechanics, animations |
| DevOps Engineer | 1 | Infrastructure, deployment |
| QA Engineer | 2 | Testing, automation |
| Data Analyst | 1 | Analytics, ML models |
| UX Designer | 1 | Design, prototyping |

**Итого: 12 человек** (минимум для старта)

### 💻 Инфраструктура

| Компонент | Решение | Стоимость/мес |
|-----------|---------|:-------------:|
| Application Server | AWS EC2 (t3.large) | ~$150 |
| Database | AWS RDS (PostgreSQL) | ~$200 |
| Cache | AWS ElastiCache (Redis) | ~$100 |
| Media Server | LiveKit Cloud / Self-hosted | ~$300-$500 |
| CDN | CloudFront / Cloudflare | ~$50-$200 |
| Odds API Provider | Bet367 / Sportradar | ~$1,000-$5,000 |
| Analytics | GA4 (free), Mixpanel (free tier) | $0-$200 |
| Monitoring | Datadog / New Relic | ~$200-$500 |
| **Итого** | | **~$2,000-$7,000/мес** |

### 🔧 Технологический стек

```yaml
Frontend:
  Framework: React 19 + Vite
  Game Engine: Pixi.js (slots), Canvas API (table games)
  Real-time: WebSocket (Socket.io)
  Video: WebRTC (LiveKit SDK)
  State: Zustand / Redux Toolkit
  Styling: CSS Modules + Tailwind

Backend:
  Runtime: Node.js 20+
  Framework: Express.js + Fastify
  Database: PostgreSQL 16 + Redis 7
  Real-time: Socket.io + LiveKit
  Queue: Bull (Redis-based)
  Scheduler: node-cron

Infrastructure:
  Cloud: AWS / DigitalOcean
  CI/CD: GitHub Actions
  Container: Docker + Kubernetes (optional)
  Monitoring: Prometheus + Grafana
  Logging: ELK Stack

Analytics:
  Event Tracking: Custom + Mixpanel
  Dashboard: Metabase / Custom React
  ML: Python (scikit-learn, TensorFlow)
  A/B Testing: Custom framework
```

---

## ⚖️ ЮРИДИЧЕСКИЕ РАЗРЕШЕНИЯ И ЛИЦЕНЗИИ

### Обязательные лицензии:

1. **Лицензия на азартные игры:**
   - Curacao eGaming License (~$25,000)
   - Malta Gaming Authority (MGA) License (~$50,000+)
   - UK Gambling License (~£400,000+)

2. **Партнёрские соглашения с провайдерами:**
   - Evolution White-label Agreement
   - Pragmatic Play Partner Program
   - Sportradar API License

3. **Правовое соответствие:**
   - GDPR (европейские пользователи)
   - PCI DSS (платежные данные)
   - AML/KYC compliance (противодействие отмыванию)
   - Responsible Gaming policies

### ⚠️ ВАЖНО:
Без соответствующих лицензий возможно использование ТОЛЬКО:
- **Social Casino Mode** (без реальных денег, только виртуальная валюта)
- **White-label решения** от лицензированных провайдеров
- **Open-source игры** с собственным дизайном

---

## 📊 KPI & METRICS

### Игровые метрики:
| Метрика | Целевое значение |
|---------|-----------------|
| DAU/MAU Ratio | > 20% |
| Average Session Duration | > 25 minutes |
| Bets Per User Per Day | > 50 |
| Player Retention (Day 7) | > 30% |
| Player Retention (Day 30) | > 15% |
| Average RTP (actual) | 95-97% |

### Бизнес метрики:
| Метрика | Целевое значение |
|---------|-----------------|
| House Edge | 2-5% |
| Daily Revenue | Target-based |
| LTV (Player Lifetime Value) | > CAC |
| Churn Rate | < 5% monthly |
| Bonus ROI | > 3× |

---

## 📝 СЛЕДУЮЩИЕ ШАГИ

### Немедленные действия:
1. [ ] Определить бюджет и юрисдикцию лицензирования
2. [ ] Выбрать tech stack и инфраструктуру
3. [ ] Начать разработку Analytics System (P0)
4. [ ] Создать Bot System MVP (P0)
5. [ ] Запланировать спринты для Phase 1

### Краткосрочные (1 месяц):
1. [ ] Интегрировать GA4 + Mixpanel
2. [ ] Реализовать базовый Bot System
3. [ ] Настроить WebSocket infrastructure
4. [ ] Начать разработку Live Blackjack

### Среднесрочные (3 месяца):
1. [ ] Запустить Live Blackjack и Roulette
2. [ ] Интегрировать Odds API для Sports Betting
3. [ ] Реализовать Bet Slip систему
4. [ ] Запустить Advanced Analytics Dashboard

---

*Документ создан: 2026-08-05*
*Версия: 1.0*
*Статус: На рассмотрении*