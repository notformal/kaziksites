/**
 * Lightning Roulette Pro — Complete Game Logic v2.0
 * Evolution Gaming Style Implementation with Wheel Animation
 */

// ============================================
// GAME CONFIGURATION
// ============================================
const LIGHTNING_CONFIG = {
  minMultiplier: 50,
  maxMultiplier: 500,
  luckyNumbersCount: { min: 1, max: 5 },
  standardPayout: 35,
  maxWin: 500000,
  betLimits: { min: 0.50, max: 10000 },
  roundDuration: 20000,
  bettingDuration: 10000,
  spinDuration: 4000,
};

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

const PAYOUTS = {
  straight: 35, split: 17, street: 11, corner: 8,
  dozen: 2, column: 2, low: 1, high: 1, even: 1, odd: 1, red: 1, black: 1,
};

// European roulette number order for wheel positioning
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

// ============================================
// GAME STATE
// ============================================
class LightningRouletteGame {
  constructor() {
    this.balance = 10000;
    this.currentChip = 1;
    this.bets = new Map();
    this.lastBets = new Map();
    this.history = [];
    this.lightningNumbers = new Map();
    this.roundActive = false;
    this.bettingActive = false;
    this.timer = null;
    this.timeLeft = 10;
    this.roundId = Math.floor(Math.random() * 999999);
    this.stats = { red: 0, black: 0, green: 0, even: 0, odd: 0 };
    this.autoPlay = false;
    this.wheelRotation = 0;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderNumberGrid();
    this.createWheel();
    this.updateBalance();
    this.startNewRound();
  }

  // ============================================
  // WHEEL ANIMATION
  // ============================================
  createWheel() {
    const table = document.querySelector('.roulette-table');
    if (!table) return;

    const wheelContainer = document.createElement('div');
    wheelContainer.className = 'wheel-container';
    wheelContainer.id = 'wheelContainer';
    wheelContainer.innerHTML = `
      <div class="wheel-pointer"></div>
      <div class="wheel" id="rouletteWheel">
        ${this.generateWheelSegments()}
      </div>
      <div class="wheel-center" id="wheelCenter">?</div>
    `;

    // Insert at top of roulette table
    table.insertBefore(wheelContainer, table.firstChild);
  }

  generateWheelSegments() {
    const radius = 130;
    const segmentAngle = 360 / 37;
    let segments = '';

    WHEEL_ORDER.forEach((num, i) => {
      const angle = i * segmentAngle;
      const color = num === 0 ? '#27ae60' : RED_NUMBERS.includes(num) ? '#e74c3c' : '#2c3e50';
      segments += `<div class="wheel-segment" data-number="${num}" style="transform: rotate(${angle}deg);">
        <span class="segment-number" style="color: white; font-weight: 900; font-size: 11px;">${num}</span>
      </div>`;
    });

    return segments;
  }

  spinWheel(resultNumber) {
    return new Promise((resolve) => {
      const wheel = document.getElementById('rouletteWheel');
      const center = document.getElementById('wheelCenter');
      
      if (!wheel) { resolve(); return; }

      // Calculate target rotation
      const segmentAngle = 360 / 37;
      const resultIndex = WHEEL_ORDER.indexOf(resultNumber);
      const targetAngle = 360 - (resultIndex * segmentAngle) - (segmentAngle / 2);
      
      // Add multiple full rotations for dramatic effect
      const fullRotations = 5 + Math.floor(Math.random() * 3);
      const totalRotation = this.wheelRotation + (fullRotations * 360) + targetAngle;

      wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      wheel.style.transform = `rotate(${totalRotation}deg)`;
      this.wheelRotation = totalRotation;

      // Update center display with spinning numbers
      let spinCount = 0;
      const spinInterval = setInterval(() => {
        const randomNum = WHEEL_ORDER[Math.floor(Math.random() * 37)];
        if (center) center.textContent = randomNum;
        spinCount++;
        if (spinCount > 40) clearInterval(spinInterval);
      }, 100);

      setTimeout(() => {
        if (center) center.textContent = resultNumber;
        resolve();
      }, 4200);
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  setupEventListeners() {
    // Chip selection
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentChip = parseFloat(chip.dataset.value);
      });
    });

    // Number grid clicks
    document.querySelectorAll('.number-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const number = parseInt(cell.dataset.number);
        this.placeBet('straight', [number]);
      });
    });

    // Zero click
    document.querySelector('.zero')?.addEventListener('click', () => {
      this.placeBet('straight', [0]);
    });

    // Outside bets
    document.querySelectorAll('.bet-cell[data-bet]').forEach(cell => {
      cell.addEventListener('click', () => {
        const betType = cell.dataset.bet;
        this.handleOutsideBet(betType);
      });
    });

    // Side bets
    document.querySelectorAll('.side-bet-option').forEach(option => {
      option.addEventListener('click', () => {
        const betType = option.dataset.bet;
        this.placeSideBet(betType);
      });
    });

    // Control buttons
    document.getElementById('clearBets')?.addEventListener('click', () => this.clearBets());
    document.getElementById('repeatBets')?.addEventListener('click', () => this.repeatBets());
    document.getElementById('autoPlay')?.addEventListener('click', () => this.toggleAutoPlay());

    // Create toast container
    this.createToastContainer();
  }

  createToastContainer() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  showToast(message, type = 'info') {
    this.createToastContainer();
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  // ============================================
  // NUMBER GRID RENDERING
  // ============================================
  renderNumberGrid() {
    const grid = document.getElementById('numberGrid');
    if (!grid) return;

    const column1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const column2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    const column3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

    grid.innerHTML = '';
    
    for (let row = 0; row < 12; row++) {
      const rowDiv = document.createElement('div');
      rowDiv.style.display = 'contents';
      rowDiv.className = 'number-row-grid';

      [column3[row], column2[row], column1[row]].forEach(num => {
        const cell = document.createElement('div');
        cell.className = `number-cell ${RED_NUMBERS.includes(num) ? 'red' : 'black'}`;
        cell.dataset.number = num;
        cell.innerHTML = `
          <span class="cell-number">${num}</span>
          <span class="lightning-badge" style="display:none;">⚡<span class="multiplier-value"></span></span>
        `;
        cell.addEventListener('click', () => this.placeBet('straight', [num]));
        rowDiv.appendChild(cell);
      });

      grid.appendChild(rowDiv);
    }
  }

  // ============================================
  // BETTING SYSTEM
  // ============================================
  placeBet(type, numbers) {
    if (!this.bettingActive) {
      this.showToast('Ставки закрыты!', 'error');
      return;
    }

    if (this.balance < this.currentChip) {
      this.showToast('Недостаточно средств!', 'error');
      return;
    }

    const key = `${type}:${numbers.join(',')}`;
    
    if (this.bets.has(key)) {
      const bet = this.bets.get(key);
      bet.amount += this.currentChip;
    } else {
      this.bets.set(key, { type, numbers, amount: this.currentChip });
    }

    this.balance -= this.currentChip;
    this.updateBalance();
    this.updateBetsDisplay();
    this.highlightBetCell(type, numbers);
  }

  handleOutsideBet(betType) {
    let numbers = [];
    
    switch (betType) {
      case 'low': numbers = Array.from({length: 18}, (_, i) => i + 1); break;
      case 'high': numbers = Array.from({length: 18}, (_, i) => i + 19); break;
      case 'even': numbers = Array.from({length: 18}, (_, i) => (i + 1) * 2); break;
      case 'odd': numbers = Array.from({length: 18}, (_, i) => (i + 1) * 2 - 1); break;
      case 'red': numbers = [...RED_NUMBERS]; break;
      case 'black': numbers = [...BLACK_NUMBERS]; break;
      case 'dozen1': numbers = Array.from({length: 12}, (_, i) => i + 1); break;
      case 'dozen2': numbers = Array.from({length: 12}, (_, i) => i + 13); break;
      case 'dozen3': numbers = Array.from({length: 12}, (_, i) => i + 25); break;
      case 'col2to1-1': numbers = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]; break;
      case 'col2to1-2': numbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]; break;
      case 'col2to1-3': numbers = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]; break;
      default: return;
    }

    this.placeBet(betType, numbers);
  }

  placeSideBet(betType) {
    if (!this.bettingActive) return;
    
    const sideBetAmounts = { anyCriss: 0.50, redHot: 1, luckyNumber: 2 };
    const amount = sideBetAmounts[betType] || this.currentChip;
    
    if (this.balance < amount) {
      this.showToast('Недостаточно средств!', 'error');
      return;
    }

    this.bets.set(`side:${betType}`, { type: 'side', sideType: betType, amount, numbers: [] });
    this.balance -= amount;
    this.updateBalance();
    this.updateBetsDisplay();
  }

  clearBets() {
    if (!this.bettingActive) return;
    
    let totalRefund = 0;
    this.bets.forEach(bet => { totalRefund += bet.amount; });
    
    this.balance += totalRefund;
    this.bets.clear();
    this.updateBalance();
    this.updateBetsDisplay();
    this.showToast('Ставки очищены', 'info');
  }

  repeatBets() {
    if (this.lastBets.size === 0) {
      this.showToast('Нечего повторить!', 'warning');
      return;
    }
    
    this.clearBets();
    
    let totalBet = 0;
    this.lastBets.forEach((bet, key) => {
      if (this.balance >= bet.amount) {
        this.bets.set(key, { ...bet });
        totalBet += bet.amount;
      }
    });

    this.balance -= totalBet;
    this.updateBalance();
    this.updateBetsDisplay();
    this.showToast('Ставки повторены!', 'success');
  }

  highlightBetCell(type, numbers) {
    // Highlight number cells
    document.querySelectorAll('.number-cell').forEach(cell => {
      if (numbers.some(n => parseInt(cell.dataset.number) === n)) {
        cell.classList.add('placed');
        const bet = this.bets.get(`${type}:${numbers.join(',')}`);
        if (bet) cell.setAttribute('data-bet-amount', `$${bet.amount.toFixed(2)}`);
      }
    });

    // Highlight outside bet cells
    document.querySelectorAll('.bet-cell[data-bet]').forEach(cell => {
      if (cell.dataset.bet === type) {
        cell.classList.add('placed');
        const bet = this.bets.get(`${type}:${numbers.join(',')}`);
        if (bet) cell.setAttribute('data-bet-amount', `$${bet.amount.toFixed(2)}`);
      }
    });
  }

  // ============================================
  // ROUND MANAGEMENT
  // ============================================
  startNewRound() {
    this.bettingActive = true;
    this.roundActive = true;
    this.timeLeft = LIGHTNING_CONFIG.bettingDuration / 1000;
    this.roundId = Math.floor(Math.random() * 999999);
    
    document.getElementById('roundId').textContent = `Round #${this.roundId}`;
    document.getElementById('timerDisplay').style.display = 'flex';
    
    // Reset wheel visual
    const wheel = document.getElementById('rouletteWheel');
    if (wheel) {
      wheel.style.transition = 'none';
      this.wheelRotation = 0;
      wheel.style.transform = 'rotate(0deg)';
    }

    this.assignLightningMultipliers();
    this.startTimer();
    this.showToast('Делайте ваши ставки!', 'info');
  }

  assignLightningMultipliers() {
    this.lightningNumbers.clear();
    
    const count = Math.floor(
      Math.random() * (LIGHTNING_CONFIG.luckyNumbersCount.max - LIGHTNING_CONFIG.luckyNumbersCount.min + 1)
    ) + LIGHTNING_CONFIG.luckyNumbersCount.min;

    const available = Array.from({length: 36}, (_, i) => i + 1);
    
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * available.length);
      const number = available.splice(idx, 1)[0];
      const multiplier = [50, 75, 100, 150, 200, 300, 500][Math.floor(Math.random() * 7)];
      this.lightningNumbers.set(number, multiplier);
    }

    this.displayLightningNumbers();
  }

  displayLightningNumbers() {
    document.querySelectorAll('.number-cell').forEach(cell => {
      const num = parseInt(cell.dataset.number);
      const badge = cell.querySelector('.lightning-badge');
      
      if (this.lightningNumbers.has(num)) {
        const multiplier = this.lightningNumbers.get(num);
        badge.style.display = 'block';
        badge.querySelector('.multiplier-value').textContent = `x${multiplier}`;
        cell.classList.add('glowing');
      } else {
        badge.style.display = 'none';
        cell.classList.remove('glowing');
      }
    });

    // Show lightning display panel
    const display = document.getElementById('lightningDisplay');
    const grid = document.getElementById('multiplierGrid');
    
    if (display && grid && this.lightningNumbers.size > 0) {
      display.style.display = 'block';
      grid.innerHTML = '';

      this.lightningNumbers.forEach((multiplier, number) => {
        const item = document.createElement('div');
        item.className = 'multiplier-item';
        item.innerHTML = `
          <span class="multiplier-number">${number}</span>
          <span class="multiplier-value-display">x${multiplier}</span>
        `;
        grid.appendChild(item);
      });
    }
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.timeLeft--;
      
      const timeValue = document.getElementById('timeValue');
      if (timeValue) {
        timeValue.textContent = this.timeLeft;
        
        if (this.timeLeft <= 5) {
          timeValue.classList.add('warning');
        } else {
          timeValue.classList.remove('warning');
        }
      }

      if (this.timeLeft <= 0) {
        this.stopBetting();
      }
    }, 1000);
  }

  stopBetting() {
    this.bettingActive = false;
    if (this.timer) clearInterval(this.timer);
    
    document.getElementById('timerDisplay').style.display = 'none';
    this.showToast('Ставки закрыты!', 'warning');
    
    // Save bets for repeat
    this.lastBets = new Map(this.bets);
    
    // Spin after short delay
    setTimeout(() => this.spin(), 1500);
  }

  // ============================================
  // SPIN MECHANICS
  // ============================================
  async spin() {
    this.roundActive = true;
    this.showToast('Крутим колесо...', 'info');

    const result = Math.floor(Math.random() * 37);
    const color = result === 0 ? 'green' : RED_NUMBERS.includes(result) ? 'red' : 'black';

    // Animate wheel spin
    await this.spinWheel(result);

    // Resolve round after wheel animation
    setTimeout(() => this.resolveRound(result, color), 500);
  }

  // ============================================
  // RESOLVE ROUND
  // ============================================
  resolveRound(result, color) {
    this.roundActive = false;
    
    // Update stats
    if (color === 'red') this.stats.red++;
    else if (color === 'black') this.stats.black++;
    else this.stats.green++;

    if (result !== 0) {
      if (result % 2 === 0) this.stats.even++;
      else this.stats.odd++;
    }

    // Calculate winnings
    let totalWin = 0;
    let lightningHit = false;

    this.bets.forEach(bet => {
      let win = 0;

      if (bet.type === 'side') {
        win = this.calculateSideBetWin(bet, result);
      } else {
        if (bet.numbers.includes(result)) {
          const payout = PAYOUTS[bet.type] || 35;
          
          // Check for lightning multiplier
          if (bet.type === 'straight' && this.lightningNumbers.has(result)) {
            const multiplier = this.lightningNumbers.get(result);
            win = bet.amount * (multiplier + 1);
            lightningHit = true;
          } else {
            win = bet.amount * (payout + 1);
          }
        }
      }

      totalWin += win;
    });

    // Update balance
    if (totalWin > 0) {
      this.balance += totalWin;
      if (totalWin > LIGHTNING_CONFIG.maxWin) {
        totalWin = LIGHTNING_CONFIG.maxWin;
        this.balance = LIGHTNING_CONFIG.maxWin;
      }
    }

    this.updateBalance();
    
    // Update history
    this.history.unshift({ number: result, color });
    if (this.history.length > 20) this.history.pop();

    // Display result
    this.displayResult(result, color, totalWin, lightningHit);
    
    // Update UI
    this.updateHistory();
    this.updateStats();
    this.clearBetsForNextRound();
    
    // Start new round after delay
    setTimeout(() => {
      this.startNewRound();
    }, 6000);
  }

  calculateSideBetWin(bet, result) {
    switch (bet.sideType) {
      case 'anyCriss':
        const crosses = [
          [1,2,3], [2,3,4], [3,4,5], [4,5,6], [7,8,9], [8,9,10],
          [9,10,11], [10,11,12], [13,14,15], [14,15,16], [15,16,17],
          [16,17,18], [19,20,21], [20,21,22], [21,22,23], [22,23,24],
          [25,26,27], [26,27,28], [27,28,29], [28,29,30], [31,32,33],
          [32,33,34], [33,34,35], [34,35,36]
        ];
        return crosses.some(c => c.includes(result)) ? bet.amount * 8 : 0;
      
      case 'redHot':
        return RED_NUMBERS.includes(result) ? bet.amount * 51 : 0;
      
      case 'luckyNumber':
        if (this.lightningNumbers.has(result)) {
          return bet.amount * (this.lightningNumbers.get(result) + 1);
        }
        return 0;
      
      default:
        return 0;
    }
  }

  // ============================================
  // UI UPDATES
  // ============================================
  displayResult(number, color, win, lightningHit = false) {
    const popup = document.getElementById('resultPopup');
    const resultNumber = document.getElementById('resultNumber');
    const resultMessage = document.getElementById('resultMessage');
    const resultAmount = document.getElementById('resultAmount');

    if (!popup || !resultNumber) return;

    resultNumber.textContent = number;
    resultNumber.className = `result-number ${color}`;
    
    if (win > 0) {
      let message = '🎉 ВЫ ВЫИГРАЛИ! 🎉';
      if (lightningHit) message = '⚡ МОЛНИЯ! ⚡ МЕГА ВЫИГРЫШ! ⚡';
      
      resultMessage.textContent = message;
      resultMessage.className = 'result-message win';
      resultAmount.textContent = `$${win.toFixed(2)}`;
      resultAmount.style.color = lightningHit ? '#f5c518' : 'var(--evolution-success)';
    } else {
      resultMessage.textContent = 'В этот раз не повезло';
      resultMessage.className = 'result-message loss';
      resultAmount.textContent = '$0.00';
      resultAmount.style.color = 'var(--evolution-text-muted)';
    }

    popup.classList.add('active');

    setTimeout(() => {
      popup.classList.remove('active');
    }, 4000);
  }

  updateHistory() {
    const container = document.getElementById('numberHistory');
    if (!container) return;

    container.innerHTML = '';
    
    this.history.forEach(item => {
      const num = document.createElement('div');
      num.className = `history-number ${item.color}`;
      num.textContent = item.number;
      container.appendChild(num);
    });
  }

  updateStats() {
    document.getElementById('redCount').textContent = this.stats.red;
    document.getElementById('blackCount').textContent = this.stats.black;
    document.getElementById('greenCount').textContent = this.stats.green;
    document.getElementById('evenCount').textContent = this.stats.even;
    document.getElementById('oddCount').textContent = this.stats.odd;
  }

  updateBalance() {
    const balanceEl = document.getElementById('balance');
    if (balanceEl) {
      balanceEl.textContent = `$${this.balance.toFixed(2)}`;
    }
  }

  updateBetsDisplay() {
    const list = document.getElementById('betsList');
    const total = document.getElementById('totalBet');
    
    if (!list || !total) return;

    list.innerHTML = '';
    let totalBet = 0;

    this.bets.forEach(bet => {
      totalBet += bet.amount;
      
      const item = document.createElement('div');
      item.className = 'bet-item';
      item.innerHTML = `
        <span class="bet-type">${this.formatBetType(bet.type)}</span>
        <span class="bet-amount-display">$${bet.amount.toFixed(2)}</span>
      `;
      list.appendChild(item);
    });

    total.textContent = `$${totalBet.toFixed(2)}`;
  }

  formatBetType(type) {
    const labels = {
      straight: 'Число', low: '1-18', high: '19-36', even: 'Чёт', odd: 'Нечёт',
      red: 'Красное', black: 'Чёрное', dozen1: '1-е 12', dozen2: '2-е 12',
      dozen3: '3-е 12', 'col2to1-1': 'Колонка 1', 'col2to1-2': 'Колонка 2', 'col2to1-3': 'Колонка 3'
    };
    return labels[type] || type;
  }

  clearBetsForNextRound() {
    this.bets.clear();
    document.querySelectorAll('.bet-cell.placed, .number-cell.placed').forEach(cell => {
      cell.classList.remove('placed');
      cell.removeAttribute('data-bet-amount');
    });
    this.updateBetsDisplay();
  }

  toggleAutoPlay() {
    this.autoPlay = !this.autoPlay;
    const btn = document.getElementById('autoPlay');
    if (btn) {
      btn.textContent = this.autoPlay ? 'Стоп' : 'Авто';
      btn.style.background = this.autoPlay ? 'var(--evolution-success)' : '';
    }
    this.showToast(this.autoPlay ? 'Авто-игра включена' : 'Авто-игра выключена', 'info');
  }
}

// ============================================
// INITIALIZE GAME
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  window.game = new LightningRouletteGame();
});