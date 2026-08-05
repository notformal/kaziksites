# 🎰 Playson Games Replica Plan

**Дата создания:** 2026-07-29
**Цель:** Репликация лучших игр Playson с полной логикой и механикой
**Статус:** 🟡 ПЛАН РАЗРАБОТКИ

---

## 📊 Анализ Playson

Playson — ведущий провайдер казино-игр с более чем 100+ играми. Их ключевые особенности:

### Ключевые фичи Playson:
1. **Mobile-first подход** — все игры оптимизированы для мобильных
2. **Быстрые сессии** — мгновенная игра без загрузки
3. **Инновативные механики** — Unique game features
4. **Турниры и турнирные системы**
5. **Прогрессивные бонусы**
6. **High quality graphics** — 2D/3D анимации
7. **Provably Fair** — для крипто-игр

---

## 🎯 Топ игры Playson для репликации

### PRIORITY 1 — Самые популярные (реплицировать первыми)

#### 1. 🎰 Hot Clicker (Crash Game)
**Статус:** 🟡 Crash Pro уже есть, но требует обновления
**Приоритет:** 🔴 КРИТИЧЕСКИЙ

**Механика Playson оригинала:**
- Crash multiplier с анимацией ракеты
- Auto cashout при заданном множителе
- Manual cashout с анимацией
- History предыдущих раундов
- Dual betting (2 ставки одновременно)
- Bet on loss — прогрессивная система ставок
- Turbo mode — ускоренные раунды
- Auto mode — автоматические раунды

**Что нужно добавить к текущему Crash Pro:**
```javascript
// Новые фичи для Crash Pro
const crashProEnhanced = {
  // Dual betting
  dualBet: true,  // 2 ставки одновременно
  
  // Bet on loss progression
  betOnLoss: {
    enabled: true,
    progression: 'martingale',  // или fibonacci
    baseBet: 10,
    maxBet: 1000,
    autoCashAt: 2.0,
  },
  
  // Turbo mode
  turboMode: {
    enabled: true,
    roundDuration: 3000,  // вместо 5000ms
  },
  
  // Auto mode
  autoMode: {
    enabled: true,
    rounds: 100,
    stopOnWin: true,
    stopOnLoss: false,
    stopOnAmount: 5000,
  },
  
  // History
  history: {
    rounds: 50,
    display: 'multiplier',
    colorCode: {
      green: '>= 2.0x',
      yellow: '1.5x - 1.99x',
      red: '< 1.5x',
    },
  },
  
  // Animations
  animations: {
    rocket: true,
    particleEffects: true,
    screenShake: true,
    soundEffects: true,
  },
};
```

**Техническая реализация:**
1. Добавить dual betting UI
2. Реализовать betOnLoss прогрессии
3. Добавить turbo/auto режимы
4. Улучшить анимации (particles, shake)
5. Добавить history panel

---

#### 2. 🎰 Fruit Shop (Slots)
**Приоритет:** 🔴 КРИТИЧЕСКИЙ

**Механика Playson оригинала:**
- 5 барабанов, 10 линий выплат
- 20 фиксировных wild символов
- Free spins с expanding wild
- Bet multiplier во время фриспинов
- Gamble feature (risk/gamble)
- Quick Spin анимации
- Wild на 2-3-4 барабанах (sticky during fs)

**Символы:**
```
High: Cherry, Strawberry, Blueberry, Plum, Lemon
Medium: Grape, Melon, Bell
Low: A, K, Q, J, 10
Wild: Fruit Shop logo
Scatter: Golden Star
```

**Free Spins механика:**
- 3+ scatter = 10 фриспинов
- Wild expanding на случайный барабан
- Sticky wild до конца фриспинов
- Multiplier bets x2/x3 во время фриспинов
- Retrigger — дополнительные фриспины

**Gamble feature:**
- После любой выигрышной комбинации
- Угадать цвет карты (red/black) — x2
- Угадать масть карты — x4
- Максимальный выигрыш x1000

**Что нужно создать:**
```javascript
class FruitShopEngine extends PIXIGameEngine {
  constructor(options) {
    super({
      ...options,
      name: 'Fruit Shop',
      reels: 5,
      rows: 3,
      paylines: 10,
      rtpTarget: 0.96,
      volatility: 'medium-high',
    });
  }
  
  // Символы и их значения
  symbols = {
    wild: { value: 'WILD', color: '#FFD700' },
    scatter: { value: 'SCATTER', color: '#FF6B00' },
    high: ['Cherry', 'Strawberry', 'Blueberry', 'Plum', 'Lemon'],
    medium: ['Grape', 'Melon', 'Bell'],
    low: ['A', 'K', 'Q', 'J', '10'],
  };
  
  // Free spins логика
  freeSpins = {
    remaining: 0,
    triggeringSymbols: ['scatter', 'scatter', 'scatter'],
    expandingWild: true,
    stickyWild: true,
    multiplier: 1, // x2 или x3
  };
  
  // Gamble feature
  async gamble(winAmount) {
    // red/black guess (x2)
    // suit guess (x4)
  }
}
```

---

#### 3. 🎰 Lucky Streak: Hot Dice (Dice Crash)
**Приоритет:** 🟠 ВЫСОКИЙ

**Механика Playson оригинала:**
- 2 кубика для определения множителя
- Crash механика — множитель растёт пока кубики не "сломали"
- Ставка на конкретное число 2-12
- Auto play с настройками
- Quick play — мгновенный бросок

**Логика:**
```javascript
class LuckyStreakEngine {
  constructor(options) {
    super({
      ...options,
      name: 'Lucky Streak',
      diceCount: 2,
      range: 2-12,
    });
  }
  
  // Crash multiplier grows over time
  multiplier = 1.0;
  crashPoint = null;
  
  // Dice roll determines crash point
  rollDice() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return d1 + d2; // 2-12
  }
  
  // Bet on specific number
  placeBet(number, amount) {
    // If crash point === number, player wins
    // Multiplier based on probability
  }
}
```

---

#### 4. 🎰 Gold Caravan (Slots)
**Приоритет:** 🟠 ВЫСОКИЙ

**Механика Playson оригинала:**
- 5 барабанов, 3 ряда
- 10 линий выплат
- Wild символ (золотой караван)
- Free spins с special expanding wilds
- Bonus game — Pick and Win
- Bet levels x1-x10

**Символы:**
```
High: Camel, Horse, Scarab, Lamp
Medium: Papyrus, Ankh, Pyramid
Low: A, K, Q, J, 10
Wild: Gold Caravan
Scatter: Sphinx
```

**Bonus Game:**
- 3+ bonus symbols на барабанах 1, 3, 5
- 9 объектов для выбора (ящики, сундуки)
- Каждый объект содержит prize
- Collect all prizes = bonus win

---

#### 5. 🎰 Magic Crystal (Slots)
**Приоритет:** 🟡 СРЕДНИЙ

**Механика Playson оригинала:**
- 5 барабанов, 3 ряда
- 10 линий
- Wild символ — магический кристалл
- Free spins с random multipliers
- Bonus game — wheel of fortune
- Cascading reels (некоторые версии)

---

### PRIORITY 2 — Вторичные игры

#### 6. 🎰 Hot Navigator (Slots)
- 5x3 slots с expanding wilds
- Bonus game с выбором направления
- Free spins с multipliers

#### 7. 🎰 Book of Gold: Golden Elephant (Slots)
- Book of... механика
- 5x3 grid
- 10 paylines
- Expand symbol во время фриспинов
- Gamble feature

#### 8. 🎰 Lightning Dice (Crash/Dice)
- 3 кубика
- Crash multiplier
- Bet на конкретное число
- Live element — все ставки видны

#### 9. 🎰 Super Line: Fruit Bomb (Slots)
- 5x3 grid
- 20 линий
- Fruit theme с bomb бонусом
- Wild substitution
- Free spins

#### 10. 🎰 Coin Hold: Lucky Clover (Slots)
- 5x3 grid
- Coin collect механика
- Lucky theme
- Progressive jackpot potential

---

### PRIORITY 3 — Дополнительные игры

#### 11-20. Additional Playson Games:
11. Book of Gold: Golden Write
12. Fire Joker (аналог но с Playson фичами)
13. Lucky coins scratch
14. Sea's Treasure (fish/tower game)
15. Tower Power (tower climbing)
16. Wheel of Fortunes (wheel bonus)
17. Lucky Treasures (pick bonus)
18. Power of the Gods (mythology theme)
19. Dragon's Fire (dragon theme)
20. Lucky Star (celestial theme)

---

## 🏗️ Архитектура для репликации

### Базовый шаблон для slot игр:

```javascript
/**
 * Playson-style Slot Game Engine
 * 
 * Ключевые фичи:
 * - Mobile-first responsive design
 * - Smooth PIXI.js анимации
 * - Provably fair RNG
 * - RTP tracking
 * - Multiple bonus features
 */
class PlaysonSlotEngine {
  constructor(options) {
    // Core
    this.container = options.container;
    this.width = options.width;
    this.height = options.height;
    this.rtpTarget = options.rtpTarget ?? 0.96;
    
    // Reels
    this.reels = options.reels ?? 5;
    this.rows = options.rows ?? 3;
    this.paylines = options.paylines ?? 10;
    
    // Symbols
    this.symbols = this._defineSymbols(options.theme);
    
    // Bet
    this.bet = options.bet ?? 10;
    this.betLevels = options.betLevels ?? 10;
    this.coinValue = options.coinValue ?? 0.01;
    
    // Bonus features
    this.freeSpins = {
      enabled: true,
      triggerSymbols: [],
      count: 0,
      expandingWild: false,
      stickyWild: false,
      multiplier: 1,
    };
    
    this.bonusGame = {
      enabled: true,
      type: 'pick', // 'pick' | 'wheel' | 'tower'
      triggerConditions: {},
    };
    
    this.gamble = {
      enabled: true,
      maxMultiplier: 1000,
    };
    
    // Auto play
    this.autoPlay = {
      enabled: false,
      maxRounds: 100,
      stopOnWin: false,
      stopOnAmount: 0,
      betOnLoss: false,
      progression: 'flat', // 'flat' | 'martingale' | 'fibonacci'
    };
    
    // Animations
    this.animations = {
      quickSpin: false,
      turboMode: false,
      skipAnimation: false,
    };
    
    // History
    this.history = {
      maxRounds: 50,
      rounds: [],
    };
    
    // PIXI setup
    this.app = new PIXI.Application();
    this.reelContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();
    
    this._init();
  }
  
  _defineSymbols(theme) {
    const symbolMaps = {
      fruit: {
        high: [
          { id: 'cherry', value: 50, color: '#FF0000' },
          { id: 'strawberry', value: 40, color: '#DC143C' },
          { id: 'blueberry', value: 30, color: '#4169E1' },
          { id: 'plum', value: 25, color: '#8B008B' },
          { id: 'lemon', value: 20, color: '#FFD700' },
        ],
        medium: [
          { id: 'grape', value: 15, color: '#9370DB' },
          { id: 'melon', value: 10, color: '#006400' },
          { id: 'bell', value: 8, color: '#FFD700' },
        ],
        low: [
          { id: 'A', value: 5, color: '#FFFFFF' },
          { id: 'K', value: 4, color: '#FFFFFF' },
          { id: 'Q', value: 3, color: '#FFFFFF' },
          { id: 'J', value: 2, color: '#FFFFFF' },
          { id: '10', value: 1, color: '#FFFFFF' },
        ],
        wild: { id: 'wild', value: 0, color: '#FFD700', isWild: true },
        scatter: { id: 'scatter', value: 0, color: '#FF6B00', isScatter: true },
      },
      egypt: {
        high: [
          { id: 'camel', value: 50, color: '#D2691E' },
          { id: 'horse', value: 40, color: '#8B4513' },
          { id: 'scarab', value: 30, color: '#006400' },
          { id: 'lamp', value: 25, color: '#FFD700' },
        ],
        medium: [
          { id: 'papyrus', value: 15, color: '#F5DEB3' },
          { id: 'ankh', value: 10, color: '#FFD700' },
          { id: 'pyramid', value: 8, color: '#DAA520' },
        ],
        low: [
          { id: 'A', value: 5, color: '#FFFFFF' },
          { id: 'K', value: 4, color: '#FFFFFF' },
          { id: 'Q', value: 3, color: '#FFFFFF' },
          { id: 'J', value: 2, color: '#FFFFFF' },
          { id: '10', value: 1, color: '#FFFFFF' },
        ],
        wild: { id: 'caravan', value: 0, color: '#FFD700', isWild: true },
        scatter: { id: 'sphinx', value: 0, color: '#FF6B00', isScatter: true },
      },
    };
    
    return symbolMaps[theme] || symbolMaps.fruit;
  }
  
  _init() {
    // PIXI setup
    this.app.init({
      width: this.width,
      height: this.height,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
    });
    
    this.container.appendChild(this.app.canvas);
    
    // Create reels
    this._createReels();
    
    // Create UI
    this._createUI();
    
    // Setup events
    this._setupEvents();
    
    // Load history
    this._loadHistory();
  }
  
  _createReels() {
    const reelWidth = this.width / this.reels;
    const reelHeight = this.height;
    
    this.reelsContainer = [];
    
    for (let i = 0; i < this.reels; i++) {
      const reel = new PIXI.Container();
      reel.x = i * reelWidth;
      
      // Reel background
      const bg = new PIXI.Graphics();
      bg.beginFill(0x0a0a1a);
      bg.drawRect(0, 0, reelWidth, reelHeight);
      bg.endFill();
      reel.addChild(bg);
      
      // Reel strip (symbols)
      const strip = new PIXI.Container();
      strip.y = 0;
      reel.addChild(strip);
      
      this.reelsContainer.push({ container: reel, strip, x: i });
    }
    
    this.reelContainer.addChild(...this.reelsContainer.map(r => r.container));
    this.app.stage.addChild(this.reelContainer);
    
    // Paylines display
    this.paylineGraphics = new PIXI.Graphics();
    this.reelContainer.addChild(this.paylineGraphics);
  }
  
  _createUI() {
    // Bet controls
    const betContainer = new PIXI.Container();
    betContainer.y = this.height - 80;
    
    // Spin button
    const spinBtn = new PIXI.Container();
    spinBtn.x = this.width / 2 - 50;
    spinBtn.y = 10;
    
    const spinBg = new PIXI.Graphics();
    spinBg.beginFill(0xFFD700);
    spinBtn.drawRoundedRect(0, 0, 100, 50, 10);
    spinBg.endFill();
    spinBtn.addChild(spinBg);
    
    const spinText = new PIXI.Text('SPIN', {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: 'bold',
      fill: 0x000000,
    });
    spinText.x = 25;
    spinText.y = 15;
    spinBtn.addChild(spinText);
    
    betContainer.addChild(spinBtn);
    
    // Auto play button
    const autoBtn = new PIXI.Text('AUTO', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xFFFFFF,
    });
    autoBtn.x = 10;
    autoBtn.y = 10;
    betContainer.addChild(autoBtn);
    
    // Gamble button
    const gambleBtn = new PIXI.Text('GAMBLE', {
      fontFamily: 'Arial',
      fontSize: 14,
      fill: 0xFFFFFF,
    });
    gambleBtn.x = this.width - 120;
    gambleBtn.y = 10;
    betContainer.addChild(gambleBtn);
    
    // History panel
    this.historyPanel = new PIXI.Container();
    this.historyPanel.y = this.height - 80;
    this.historyPanel.visible = false;
    betContainer.addChild(this.historyPanel);
    
    this.uiContainer.addChild(betContainer);
    this.app.stage.addChild(this.uiContainer);
  }
  
  async spin() {
    // Validate bet
    if (this.balance < this.bet) {
      throw new Error('Insufficient balance');
    }
    
    // Deduct bet
    this.balance -= this.bet;
    
    // Generate result (provably fair)
    const result = this._generateResult();
    
    // Animate reels
    await this._animateSpin(result);
    
    // Check wins
    const wins = this._checkWins(result);
    
    // Calculate total win
    const totalWin = wins.reduce((sum, w) => sum + w.amount, 0);
    this.balance += totalWin;
    
    // Record history
    this.history.rounds.unshift({
      time: Date.now(),
      bet: this.bet,
      win: totalWin,
      winRate: totalWin / this.bet,
      result,
    });
    
    if (this.history.rounds.length > this.history.maxRounds) {
      this.history.rounds.pop();
    }
    
    // Check free spins
    if (this.freeSpins.count > 0) {
      this.freeSpins.count--;
      // Auto spin with free credit
      return { type: 'free_spin', wins, totalWin };
    }
    
    // Check bonus trigger
    if (this._checkBonusTrigger(result)) {
      return { type: 'bonus', wins, totalWin };
    }
    
    return { type: 'base', wins, totalWin };
  }
  
  _generateResult() {
    // Seeded RNG for provably fair
    const reelResults = [];
    
    for (let reel = 0; reel < this.reels; reel++) {
      const reelSymbols = [];
      
      for (let row = 0; row < this.rows; row++) {
        const symbol = this._getRandomSymbol();
        reelSymbols.push(symbol);
      }
      
      reelResults.push(reelSymbols);
    }
    
    return reelResults;
  }
  
  _getRandomSymbol() {
    // Weighted random based on symbol probability
    const allSymbols = [
      ...this.symbols.high.map(s => ({ ...s, weight: 5 })),
      ...this.symbols.medium.map(s => ({ ...s, weight: 10 })),
      ...this.symbols.low.map(s => ({ ...s, weight: 20 })),
      { ...this.symbols.wild, weight: 2 },
      { ...this.symbols.scatter, weight: 1 },
    ];
    
    const totalWeight = allSymbols.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const symbol of allSymbols) {
      random -= symbol.weight;
      if (random <= 0) return symbol;
    }
    
    return allSymbols[allSymbols.length - 1];
  }
  
  _checkWins(result) {
    const wins = [];
    
    // Convert reel results to grid
    const grid = [];
    for (let row = 0; row < this.rows; row++) {
      grid[row] = [];
      for (let reel = 0; reel < this.reels; reel++) {
        grid[row][reel] = result[reel][row];
      }
    }
    
    // Check each payline
    for (const payline of this.paylines) {
      const lineSymbols = [];
      
      for (let reel = 0; reel < this.reels; reel++) {
        const row = payline[reel];
        lineSymbols.push(grid[row][reel]);
      }
      
      // Check for matching symbols from left
      let matchCount = 1;
      let firstSymbol = lineSymbols[0];
      
      if (firstSymbol.isWild) {
        // Find first non-wild
        for (let i = 1; i < lineSymbols.length; i++) {
          if (!lineSymbols[i].isWild) {
            firstSymbol = lineSymbols[i];
            matchCount = 1;
            break;
          }
          matchCount++;
        }
      }
      
      for (let i = 1; i < lineSymbols.length; i++) {
        const matches = lineSymbols[i].isWild || 
          lineSymbols[i].id === firstSymbol.id;
        
        if (matches) {
          matchCount++;
        } else {
          break;
        }
      }
      
      if (matchCount >= 3 && !firstSymbol.isWild && !firstSymbol.isScatter) {
        const amount = firstSymbol.value * (matchCount - 2) * (this.bet / this.paylines);
        wins.push({
          payline,
          symbol: firstSymbol.id,
          count: matchCount,
          amount,
        });
      }
    }
    
    // Check scatter wins
    let scatterCount = 0;
    for (let reel = 0; reel < this.reels; reel++) {
      for (let row = 0; row < this.rows; row++) {
        if (result[reel][row].isScatter) scatterCount++;
      }
    }
    
    if (scatterCount >= 3) {
      const scatterWin = this.bet * scatterCount * 2;
      wins.push({
        type: 'scatter',
        symbol: 'scatter',
        count: scatterCount,
        amount: scatterWin,
      });
      
      // Trigger free spins
      this.freeSpins.count = scatterCount === 3 ? 10 : scatterCount === 4 ? 15 : 20;
    }
    
    return wins;
  }
  
  async _animateSpin(result) {
    const animationDuration = this.animations.turboMode ? 500 : 1000;
    
    // Start reel spins
    this.reelsContainer.forEach((reel, i) => {
      const strip = reel.strip;
      
      // Add symbol sprites
      result[i].forEach(symbol => {
        const sprite = this._createSymbolSprite(symbol);
        sprite.y = Math.random() * this.height;
        strip.addChild(sprite);
      });
      
      // Animate
      const targetY = i * 50; // stagger
      const tween = { y: strip.y };
      
      await this._animateTween(tween, { y: targetY }, animationDuration);
      strip.y = targetY;
    });
    
    // Show paylines
    if (this._hasWins(result)) {
      this._drawPaylines(result);
    }
  }
  
  _createSymbolSprite(symbol) {
    const graphics = new PIXI.Graphics();
    
    // Symbol background
    graphics.beginFill(symbol.color || 0xFFFFFF);
    graphics.drawRoundedRect(0, 0, 80, 80, 10);
    graphics.endFill();
    
    // Symbol text
    const text = new PIXI.Text(symbol.id, {
      fontFamily: 'Arial',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0x000000,
    });
    text.x = 15;
    text.y = 25;
    graphics.addChild(text);
    
    return graphics;
  }
  
  _animateTween(obj, target, duration) {
    return new Promise(resolve => {
      const start = Date.now();
      const startValues = Object.assign({}, obj);
      
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing
        const eased = 1 - Math.pow(1 - progress, 3);
        
        Object.keys(target).forEach(key => {
          obj[key] = startValues[key] + (target[key] - startValues[key]) * eased;
        });
        
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      
      tick();
    });
  }
  
  _drawPaylines(result) {
    this.paylineGraphics.clear();
    
    // Draw winning paylines
    this.paylines.forEach((payline, i) => {
      this.paylineGraphics.lineStyle(3, 0xFFD700, 0.8);
      
      for (let reel = 0; reel < this.reels; reel++) {
        const row = payline[reel];
        const x = reel * (this.width / this.reels) + (this.width / this.reels) / 2;
        const y = row * (this.height / this.rows) + (this.height / this.rows) / 2;
        
        if (reel === 0) {
          this.paylineGraphics.moveTo(x, y);
        } else {
          this.paylineGraphics.lineTo(x, y);
        }
      }
    });
  }
  
  _hasWins(result) {
    // Check if any winning combination exists
    return true; // Simplified
  }
  
  // Bonus game: Pick and Win
  async startBonusGame() {
    const bonusContainer = new PIXI.Container();
    
    // Show pickable objects
    const objects = [];
    for (let i = 0; i < 9; i++) {
      const obj = new PIXI.Graphics();
      obj.beginFill(0x8B4513);
      obj.drawRoundedRect(0, 0, 80, 80, 10);
      obj.endFill();
      
      obj.x = (i % 3) * 100 + 50;
      obj.y = Math.floor(i / 3) * 100 + 50;
      
      obj.interactive = true;
      obj.cursor = 'pointer';
      
      obj.on('pointerdown', async () => {
        // Reveal prize
        obj.beginFill(0xFFD700);
        obj.drawRoundedRect(0, 0, 80, 80, 10);
        obj.endFill();
        
        const prize = this._getBonusPrize();
        const text = new PIXI.Text(prize, {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0x000000,
        });
        text.x = 10;
        text.y = 30;
        obj.addChild(text);
        
        this.balance += prize;
        objects.splice(objects.indexOf(obj), 1);
        
        if (objects.length === 0) {
          // Bonus complete
          this.app.stage.removeChild(bonusContainer);
        }
      });
      
      objects.push(obj);
      bonusContainer.addChild(obj);
    }
    
    this.app.stage.addChild(bonusContainer);
  }
  
  _getBonusPrize() {
    const prizes = [10, 20, 30, 50, 75, 100, 150, 200, 500];
    return prizes[Math.floor(Math.random() * prizes.length)];
  }
  
  // Gamble feature
  async gamble() {
    const choices = ['red', 'black', 'hearts', 'diamonds', 'clubs', 'spades'];
    const actual = choices[Math.floor(Math.random() * choices.length)];
    
    // Show choice UI to player
    const playerChoice = await this._showGambleUI();
    
    const isRedBlack = ['red', 'black'].includes(playerChoice);
    const won = playerChoice === actual;
    
    if (won) {
      const multiplier = isRedBlack ? 2 : 4;
      this.gambleWin = (this.gambleWin || 0) * multiplier;
      return { won: true, multiplier, actual };
    }
    
    return { won: false, actual };
  }
  
  _showGambleUI() {
    return new Promise(resolve => {
      // Show gamble UI overlay
      // Wait for player choice
      // Return choice
    });
  }
  
  // Auto play logic
  updateAutoPlay() {
    if (!this.autoPlay.enabled) return;
    
    if (this.autoPlay.roundsPlayed >= this.autoPlay.maxRounds) {
      this.autoPlay.enabled = false;
      return;
    }
    
    // Check stop conditions
    if (this.autoPlay.stopOnWin && this.lastWin > 0) return;
    if (this.autoPlay.stopOnLoss && this.lastLoss > 0) return;
    if (this.autoPlay.stopOnAmount && this.balance >= this.autoPlay.stopOnAmount) return;
    
    // Adjust bet based on progression
    if (this.autoPlay.betOnLoss && this.lastLoss > 0) {
      this.bet = this._calculateProgressionBet();
    }
    
    this.autoPlay.roundsPlayed++;
    
    // Auto spin after delay
    setTimeout(() => this.spin(), 500);
  }
  
  _calculateProgressionBet() {
    switch (this.autoPlay.progression) {
      case 'martingale':
        return this.baseBet * Math.pow(2, this.consecutiveLosses);
      case 'fibonacci':
        const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
        return this.baseBet * fib[Math.min(this.consecutiveLosses, fib.length - 1)];
      default:
        return this.baseBet;
    }
  }
  
  getState() {
    return {
      balance: this.balance,
      bet: this.bet,
      freeSpins: this.freeSpins,
      history: this.history.rounds.slice(0, 10),
      rtp: this.getRTP(),
    };
  }
  
  getRTP() {
    if (this.history.rounds.length === 0) return 0;
    
    const totalBet = this.history.rounds.reduce((sum, r) => sum + r.bet, 0);
    const totalWin = this.history.rounds.reduce((sum, r) => sum + r.win, 0);
    
    return totalBet > 0 ? totalWin / totalBet : 0;
  }
  
  destroy() {
    this.app.destroy(true, { children: true });
  }
}
```

---

## 📁 Структура новых игр

```
public/games/
├── fruit-shop/              # Fruit Shop (Playson)
│   └── index.html
├── lucky-streak/            # Lucky Streak: Hot Dice
│   └── index.html
├── gold-caravan/            # Gold Caravan (Playson)
│   └── index.html
├── magic-crystal/           # Magic Crystal (Playson)
│   └── index.html
├── hot-navigator/           # Hot Navigator (Playson)
│   └── index.html
├── book-of-gold/            # Book of Gold: Golden Elephant
│   └── index.html
├── lightning-dice/          # Lightning Dice (Playson)
│   └── index.html
├── super-line-fruit-bomb/   # Super Line: Fruit Bomb
│   └── index.html
├── coin-hold-clover/        # Coin Hold: Lucky Clover
│   └── index.html
└── ... (13+ more games)
```

---

## 📊 План реализации

### Phase 1: Топ 5 игр (2-3 недели)
1. [ ] Fruit Shop (slots) — 3 дня
2. [ ] Lucky Streak: Hot Dice (dice crash) — 2 дня
3. [ ] Gold Caravan (slots) — 3 дня
4. [ ] Magic Crystal (slots) — 2 дня
5. [ ] Hot Navigator (slots) — 2 дня

### Phase 2: Secondary games (2-3 недели)
6. [ ] Book of Gold: Golden Elephant — 3 дня
7. [ ] Lightning Dice — 2 дня
8. [ ] Super Line: Fruit Bomb — 2 дня
9. [ ] Coin Hold: Lucky Clover — 2 дня
10. [ ] Tower Power — 2 дня

### Phase 3: Additional games (3-4 недели)
11-20. Остальные 10 игр по 2 дня каждая

---

## 🎨 Дизайн-паттерны Playson

### Ключевые визуальные элементы:
1. **Яркие цвета** — насыщенная палитра
2. **Smooth анимации** — 60fps transitions
3. **Particle effects** — для бонусов
4. **Glow эффекты** — для winning комбинаций
5. **Screen shake** — для big wins
6. **Zoom transitions** — между bonus rounds
7. **Golden accents** — премиум feel
8. **Dark backgrounds** — для контраста

### Типичная UI структура:
```
+----------------------------------+
|  Balance: 10,000.00    Bet: 10  |
+----------------------------------+
|                                  |
|     [Reel 1] [Reel 2] ...        |
|      [     GAME AREA     ]       |
|                                  |
+----------------------------------+
| [AUTO] [BET-] [SPIN] [BET+]     |
| [GAMBLE] [HISTORY] [MUTE]        |
+----------------------------------+
```

---

## 🔧 Технические требования

### PIXI.js оптимизации:
1. **Texture Atlas** — для symbol sprites
2. **Object pooling** — для анимированных объектов
3. **Batch rendering** — для paylines
4. **Cache as bitmap** — для static UI
5. **RequestAnimationFrame** — для smooth animations

### Аудио система:
```javascript
class GameAudio {
  constructor() {
    this.muted = false;
    this.sounds = {};
    this.music = null;
  }
  
  play(soundName) {
    if (this.muted) return;
    const audio = this.sounds[soundName];
    if (audio) audio.play();
  }
  
  playSpin() { this.play('spin'); }
  playWin(amount) { 
    if (amount > this.bet * 10) this.play('big_win');
    else this.play('win');
  }
  playFreeSpin() { this.play('free_spin'); }
  playBonus() { this.play('bonus_start'); }
}
```

---

## 📅 Timeline

| Неделя | Задачи |
|--------|--------|
| 1-2 | Fruit Shop + Lucky Streak |
| 3-4 | Gold Caravan + Magic Crystal |
| 5-6 | Hot Navigator + Book of Gold |
| 7-8 | Lightning Dice + Super Line |
| 9-10 | Coin Hold + Tower Power |
| 11-12 | Остальные 10 игр |

---

## 🔗 Связанные документы

- [PIXI.js Engine](platform/games/engine/pixi-game-engine.js)
- [Migration Backlog](docs/MIGRATION-BACKLOG.md)
- [QA Framework](docs/QA_FRAMEWORK.md)
- [Game Licenses](docs/GAME_LICENSES.md)

---

*Последнее обновление: 2026-07-29*
*Следующий шаг: Начать реализацию Fruit Shop*