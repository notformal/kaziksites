// ============================================
// Pragmatic Play Live — Live Dealer Games Engine
// ============================================

'use strict';

// ============================================
// GAME DATA CONFIGURATION
// ============================================
var GAMES_DATA = [
  // Blackjack
  {
    id: 'blackjack-b',
    name: 'Blackjack B',
    type: 'blackjack',
    category: 'blackjack',
    dealer: 'Anna',
    minBet: 5,
    maxBet: 5000,
    badge: 'popular',
    icon: '🃏',
    bgClass: 'blackjack-bg'
  },
  {
    id: 'vip-blackjack',
    name: 'VIP Blackjack',
    type: 'blackjack',
    category: 'blackjack',
    dealer: 'Maria',
    minBet: 25,
    maxBet: 10000,
    badge: 'live',
    icon: '🃏',
    bgClass: 'blackjack-bg'
  },
  {
    id: 'speed-blackjack',
    name: 'Speed Blackjack',
    type: 'blackjack',
    category: 'blackjack',
    dealer: 'Chris',
    minBet: 1,
    maxBet: 2000,
    badge: 'new',
    icon: '⚡',
    bgClass: 'blackjack-bg'
  },
  // Roulette
  {
    id: 'lightning-roulette',
    name: 'Lightning Roulette',
    type: 'roulette',
    category: 'roulette',
    dealer: 'Lucas',
    minBet: 0.5,
    maxBet: 2500,
    badge: 'popular',
    icon: '🎡',
    bgClass: 'roulette-bg'
  },
  {
    id: 'auto-roulette',
    name: 'Auto Roulette',
    type: 'roulette',
    category: 'roulette',
    dealer: 'AI Dealer',
    minBet: 0.2,
    maxBet: 1000,
    badge: null,
    icon: '🎯',
    bgClass: 'roulette-bg'
  },
  {
    id: 'vip-roulette',
    name: 'VIP Roulette',
    type: 'roulette',
    category: 'roulette',
    dealer: 'Sophia',
    minBet: 10,
    maxBet: 25000,
    badge: 'live',
    icon: '👑',
    bgClass: 'roulette-bg'
  },
  // Baccarat
  {
    id: 'baccarat-s',
    name: 'Baccarat S',
    type: 'baccarat',
    category: 'baccarat',
    dealer: 'Yuki',
    minBet: 3,
    maxBet: 5000,
    badge: 'popular',
    icon: '🎴',
    bgClass: 'baccarat-bg'
  },
  {
    id: 'vip-baccarat',
    name: 'VIP Baccarat',
    type: 'baccarat',
    category: 'baccarat',
    dealer: 'Mei',
    minBet: 20,
    maxBet: 15000,
    badge: 'live',
    icon: '🏮',
    bgClass: 'baccarat-bg'
  },
  // Game Shows
  {
    id: 'crazy-time',
    name: 'Crazy Time',
    type: 'game-show',
    category: 'game-show',
    dealer: 'Elena',
    minBet: 1,
    maxBet: 5000,
    badge: 'popular',
    icon: '🎪',
    bgClass: 'show-bg'
  },
  {
    id: 'monopoly-live',
    name: 'Monopoly Live',
    type: 'game-show',
    category: 'game-show',
    dealer: 'Tom',
    minBet: 0.5,
    maxBet: 2500,
    badge: 'live',
    icon: '🎩',
    bgClass: 'show-bg'
  },
  {
    id: 'dream-catcher',
    name: 'Dream Catcher',
    type: 'game-show',
    category: 'game-show',
    dealer: 'Jake',
    minBet: 0.5,
    maxBet: 1500,
    badge: null,
    icon: '🌀',
    bgClass: 'show-bg'
  },
  {
    id: 'cash-or-crash',
    name: 'Cash or Crash',
    type: 'game-show',
    category: 'game-show',
    dealer: 'Nina',
    minBet: 1,
    maxBet: 3000,
    badge: 'new',
    icon: '🚀',
    bgClass: 'show-bg'
  }
];

// ============================================
// STATE MANAGEMENT
// ============================================
var state = {
  balance: 10000.00,
  currentFilter: 'all',
  activeGame: null,
  betSlip: [],
  history: [],
  selectedChip: 5,
  isLiveOnly: false
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎰 Pragmatic Play Live initialized');
  
  // Render initial state
  renderGameGrid();
  renderTableList();
  updateBalanceDisplay();
  
  // Setup event listeners
  setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Game category filters
  var gameBtns = document.querySelectorAll('.game-btn');
  gameBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      gameBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.currentFilter = btn.dataset.game;
      renderGameGrid();
    });
  });
  
  // Live toggle
  var liveToggle = document.getElementById('liveToggle');
  if (liveToggle) {
    liveToggle.addEventListener('click', function() {
      state.isLiveOnly = !state.isLiveOnly;
      this.classList.toggle('active', state.isLiveOnly);
      renderGameGrid();
    });
  }
  
  // Back button
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      closeActiveGame();
    });
  }
  
  // Place bet button
  var placeBetBtn = document.getElementById('placeBetBtn');
  if (placeBetBtn) {
    placeBetBtn.addEventListener('click', function() {
      placeBet();
    });
  }
  
  // Clear bet slip
  var clearBetslipBtn = document.getElementById('clearBetslipBtn');
  if (clearBetslipBtn) {
    clearBetslipBtn.addEventListener('click', function() {
      state.betSlip = [];
      renderBetSlip();
    });
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderGameGrid() {
  var grid = document.getElementById('gamesGrid');
  if (!grid) return;
  
  // Filter games
  var filtered = GAMES_DATA.filter(function(game) {
    if (state.currentFilter !== 'all' && game.category !== state.currentFilter) {
      return false;
    }
    if (state.isLiveOnly && !game.badge) {
      return false;
    }
    return true;
  });
  
  // Build HTML
  var html = '';
  filtered.forEach(function(game) {
    var badgeHtml = '';
    if (game.badge === 'live') {
      badgeHtml = '<span class="game-card-badge badge-live">LIVE</span>';
    } else if (game.badge === 'new') {
      badgeHtml = '<span class="game-card-badge badge-new">NEW</span>';
    } else if (game.badge === 'popular') {
      badgeHtml = '<span class="game-card-badge badge-popular">HIT</span>';
    }
    
    html += '<div class="game-card" data-game-id="' + game.id + '">' +
      '<div class="game-card-image ' + game.bgClass + '">' +
        game.icon +
        badgeHtml +
      '</div>' +
      '<div class="game-card-info">' +
        '<div class="game-card-title">' + game.name + '</div>' +
        '<div class="game-card-provider">Pragmatic Play Live</div>' +
        '<div class="game-card-limits">' +
          '<span>$' + game.minBet + '</span>' +
          '<span>$' + game.maxBet.toLocaleString() + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  });
  
  grid.innerHTML = html;
  
  // Add click listeners to game cards
  var cards = grid.querySelectorAll('.game-card');
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      openGame(this.dataset.gameId);
    });
  });
}

function renderTableList() {
  var tableList = document.getElementById('tableList');
  if (!tableList) return;
  
  // Group games by category
  var categories = {
    blackjack: { name: 'Blackjack', icon: '🃏' },
    roulette: { name: 'Рулетка', icon: '🎡' },
    baccarat: { name: 'Баккара', icon: '🎴' },
    'game-show': { name: 'Game Shows', icon: '🎪' }
  };
  
  var html = '';
  Object.keys(categories).forEach(function(key) {
    var cat = categories[key];
    var count = GAMES_DATA.filter(function(g) { return g.category === key; }).length;
    html += '<div class="table-item" data-category="' + key + '">' +
      '<span class="table-icon">' + cat.icon + '</span>' +
      '<div class="table-info">' +
        '<div class="table-name">' + cat.name + '</div>' +
        '<div class="table-limits">' + count + ' столов</div>' +
      '</div>' +
      '<span class="table-status"></span>' +
    '</div>';
  });
  
  tableList.innerHTML = html;
  
  // Add click listeners
  var items = tableList.querySelectorAll('.table-item');
  items.forEach(function(item) {
    item.addEventListener('click', function() {
      var category = this.dataset.category;
      document.querySelectorAll('.game-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.game === category);
      });
      state.currentFilter = category;
      renderGameGrid();
    });
  });
}

function renderBetSlip() {
  var content = document.getElementById('betslipContent');
  var summary = document.getElementById('betslipSummary');
  
  if (!content || !summary) return;
  
  if (state.betSlip.length === 0) {
    content.innerHTML = '<p class="empty-betslip">Выберите игру и сделайте ставку</p>';
    summary.style.display = 'none';
    return;
  }
  
  var html = '';
  var totalStake = 0;
  var totalPotentialWin = 0;
  
  state.betSlip.forEach(function(bet, index) {
    totalStake += bet.stake || 0;
    totalPotentialWin += (bet.stake || 0) * (bet.payout || 1);
    
    html += '<div class="bet-slip-item">' +
      '<div class="bet-slip-header">' +
        '<span class="bet-slip-event">' + bet.gameName + '</span>' +
        '<button class="bet-slip-remove" data-index="' + index + '">✕</button>' +
      '</div>' +
      '<div class="bet-slip-selection">' + bet.selection + '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:0.3rem;">' +
        '<span>Ставка: $' + (bet.stake || 0).toFixed(2) + '</span>' +
        '<span class="bet-slip-odd">x' + (bet.payout || 1) + '</span>' +
      '</div>' +
    '</div>';
  });
  
  content.innerHTML = html;
  
  // Add remove listeners
  content.querySelectorAll('.bet-slip-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.betSlip.splice(parseInt(this.dataset.index), 1);
      renderBetSlip();
    });
  });
  
  summary.style.display = 'block';
  document.getElementById('totalStake').textContent = '$' + totalStake.toFixed(2);
  document.getElementById('potentialWin').textContent = '$' + totalPotentialWin.toFixed(2);
}

// ============================================
// GAME OPEN/CLOSE
// ============================================
function openGame(gameId) {
  var game = GAMES_DATA.find(function(g) { return g.id === gameId; });
  if (!game) return;
  
  state.activeGame = game;
  
  // Update UI
  document.getElementById('gamesSection').style.display = 'none';
  document.getElementById('activeGameSection').style.display = 'block';
  document.getElementById('activeGameTitle').textContent = game.name;
  document.getElementById('gameDealer').textContent = 'Дилер: ' + game.dealer;
  document.getElementById('gameMinBet').textContent = 'Мин: $' + game.minBet;
  document.getElementById('gameMaxBet').textContent = 'Макс: $' + game.maxBet;
  
  // Render game controls based on type
  renderGameControls(game);
}

function closeActiveGame() {
  state.activeGame = null;
  document.getElementById('gamesSection').style.display = 'block';
  document.getElementById('activeGameSection').style.display = 'none';
}

// ============================================
// RENDER GAME CONTROLS
// ============================================
function renderGameControls(game) {
  var controls = document.getElementById('gameControls');
  if (!controls) return;
  
  var html = '';
  
  // Chip selector (always shown)
  html += '<div class="chip-selector">';
  var chips = [0.5, 1, 5, 10, 25, 50, 100];
  chips.forEach(function(chip) {
    var activeClass = chip === state.selectedChip ? ' active' : '';
    html += '<div class="chip chip-' + chip + (chip >= 100 ? '' : '') + '"' +
            ' data-chip="' + chip + '"' +
            (chip >= 100 ? ' style="background:linear-gradient(135deg,var(--pragmatic-accent),#ccac00);color:var(--pragmatic-dark);"' : '') +
            '>' + '$' + chip + '</div>';
  });
  html += '</div>';
  
  // Game-specific controls
  if (game.type === 'roulette') {
    html += renderRouletteControls();
  } else if (game.type === 'blackjack') {
    html += renderBlackjackControls();
  } else if (game.type === 'baccarat') {
    html += renderBaccaratControls();
  } else if (game.type === 'game-show') {
    html += renderGameShowControls();
  }
  
  controls.innerHTML = html;
  
  // Setup chip selectors
  setupChipSelectors();
}

function renderRouletteControls() {
  var html = '<div class="betting-area">';
  
  // Red/Black/Green
  html += '<div class="bet-zone red-zone" data-selection="red" data-payout="2">' +
    '<div class="bet-zone-label">Красное</div>' +
    '<div class="bet-zone-payout">x2</div>' +
  '</div>';
  html += '<div class="bet-zone black-zone" data-selection="black" data-payout="2">' +
    '<div class="bet-zone-label">Черное</div>' +
    '<div class="bet-zone-payout">x2</div>' +
  '</div>';
  html += '<div class="bet-zone green-zone" data-selection="green" data-payout="36">' +
    '<div class="bet-zone-label">Зеро</div>' +
    '<div class="bet-zone-payout">x36</div>' +
  '</div>';
  
  // Odd/Even
  html += '<div class="bet-zone gold-zone" data-selection="odd" data-payout="2">' +
    '<div class="bet-zone-label">Нечетное</div>' +
    '<div class="bet-zone-payout">x2</div>' +
  '</div>';
  html += '<div class="bet-zone gold-zone" data-selection="even" data-payout="2">' +
    '<div class="bet-zone-label">Четное</div>' +
    '<div class="bet-zone-payout">x2</div>' +
  '</div>';
  
  html += '</div>';
  
  // Game actions
  html += '<div class="game-actions">' +
    '<button class="action-btn deal-btn" id="dealBtn">Крутить</button>' +
  '</div>';
  
  return html;
}

function renderBlackjackControls() {
  var html = '<div class="game-actions">' +
    '<button class="action-btn hit-btn" id="hitBtn" disabled>Еще</button>' +
    '<button class="action-btn stand-btn" id="standBtn" disabled>Хватит</button>' +
    '<button class="action-btn deal-btn" id="dealBtn">Раздать</button>' +
  '</div>';
  return html;
}

function renderBaccaratControls() {
  var html = '<div class="betting-area">';
  
  html += '<div class="bet-zone red-zone" data-selection="player" data-payout="2">' +
    '<div class="bet-zone-label">Игрок</div>' +
    '<div class="bet-zone-payout">x2</div>' +
  '</div>';
  html += '<div class="bet-zone black-zone" data-selection="banker" data-payout="1.95">' +
    '<div class="bet-zone-label">Банкир</div>' +
    '<div class="bet-zone-payout">x1.95</div>' +
  '</div>';
  html += '<div class="bet-zone green-zone" data-selection="tie" data-payout="9">' +
    '<div class="bet-zone-label">Ничья</div>' +
    '<div class="bet-zone-payout">x9</div>' +
  '</div>';
  
  html += '</div>';
  
  html += '<div class="game-actions">' +
    '<button class="action-btn deal-btn" id="dealBtn">Раздать</button>' +
  '</div>';
  
  return html;
}

function renderGameShowControls() {
  var html = '<div class="betting-area">';
  
  // Generic bet zones for game shows
  html += '<div class="bet-zone gold-zone" data-selection="win" data-payout="5">' +
    '<div class="bet-zone-label">Выигрыш</div>' +
    '<div class="bet-zone-payout">x5</div>' +
  '</div>';
  html += '<div class="bet-zone red-zone" data-selection="bonus" data-payout="20">' +
    '<div class="bet-zone-label">Бонус</div>' +
    '<div class="bet-zone-payout">x20</div>' +
  '</div>';
  html += '<div class="bet-zone green-zone" data-selection="jackpot" data-payout="100">' +
    '<div class="bet-zone-label">Джекпот</div>' +
    '<div class="bet-zone-payout">x100</div>' +
  '</div>';
  
  html += '</div>';
  
  html += '<div class="game-actions">' +
    '<button class="action-btn deal-btn" id="dealBtn">Запустить</button>' +
  '</div>';
  
  return html;
}

// ============================================
// CHIP SELECTORS
// ============================================
function setupChipSelectors() {
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      chips.forEach(function(c) { c.classList.remove('active'); });
      this.classList.add('active');
      state.selectedChip = parseFloat(this.dataset.chip);
    });
  });
  
  // Bet zone selectors
  var zones = document.querySelectorAll('.bet-zone');
  zones.forEach(function(zone) {
    zone.addEventListener('click', function() {
      addBetToSlip(
        state.activeGame.name,
        this.dataset.selection,
        parseFloat(this.dataset.payout)
      );
    });
  });
  
  // Deal button
  var dealBtn = document.getElementById('dealBtn');
  if (dealBtn) {
    dealBtn.addEventListener('click', function() {
      simulateGameResult();
    });
  }
}

// ============================================
// BET SLIP FUNCTIONS
// ============================================
function addBetToSlip(gameName, selection, payout) {
  state.betSlip.push({
    gameName: gameName,
    selection: selection,
    payout: payout,
    stake: state.selectedChip
  });
  
  renderBetSlip();
  showToast('Ставка добавлена: ' + selection + ' ($' + state.selectedChip + ')', 'info');
}

function placeBet() {
  if (state.betSlip.length === 0) return;
  
  var totalStake = state.betSlip.reduce(function(sum, bet) {
    return sum + (bet.stake || 0);
  }, 0);
  
  if (totalStake > state.balance) {
    showToast('Недостаточно средств!', 'error');
    return;
  }
  
  // Deduct balance
  state.balance -= totalStake;
  updateBalanceDisplay();
  
  // Move to history
  state.betSlip.forEach(function(bet) {
    state.history.unshift({
      game: bet.gameName,
      selection: bet.selection,
      stake: bet.stake,
      payout: bet.payout,
      result: 'pending',
      timestamp: new Date()
    });
  });
  
  // Clear bet slip
  state.betSlip = [];
  renderBetSlip();
  renderHistory();
  
  showToast('Ставки размещены! Ожидание результата...', 'success');
}

// ============================================
// GAME SIMULATION
// ============================================
function simulateGameResult() {
  if (!state.activeGame) return;
  
  // Simulate random result
  var isWin = Math.random() > 0.5;
  var winAmount = isWin ? state.selectedChip * 2 : 0;
  
  if (isWin) {
    state.balance += winAmount;
    updateBalanceDisplay();
    
    // Add to history
    state.history.unshift({
      game: state.activeGame.name,
      selection: 'win',
      stake: state.selectedChip,
      payout: 2,
      result: 'win',
      amount: winAmount,
      timestamp: new Date()
    });
    
    showToast('Выигрыш: $' + winAmount.toFixed(2) + ' 🎉', 'success');
  } else {
    state.balance -= state.selectedChip;
    updateBalanceDisplay();
    
    state.history.unshift({
      game: state.activeGame.name,
      selection: 'loss',
      stake: state.selectedChip,
      payout: 0,
      result: 'loss',
      timestamp: new Date()
    });
    
    showToast('Проигрыш: $' + state.selectedChip.toFixed(2), 'error');
  }
  
  renderHistory();
}

// ============================================
// HISTORY RENDERING
// ============================================
function renderHistory() {
  var list = document.getElementById('betHistoryList');
  if (!list) return;
  
  if (state.history.length === 0) {
    list.innerHTML = '<p class="empty-betslip">История пуста</p>';
    return;
  }
  
  var html = '';
  state.history.slice(0, 10).forEach(function(item) {
    var resultClass = item.result === 'win' ? 'win' : (item.result === 'loss' ? 'loss' : 'push');
    var amountHtml = '';
    
    if (item.result === 'win') {
      amountHtml = '<span class="history-amount win">+$' + (item.amount || 0).toFixed(2) + '</span>';
    } else if (item.result === 'loss') {
      amountHtml = '<span class="history-amount loss">-$' + (item.stake || 0).toFixed(2) + '</span>';
    } else {
      amountHtml = '<span class="history-amount push">$' + (item.stake || 0).toFixed(2) + '</span>';
    }
    
    html += '<div class="history-item ' + resultClass + '">' +
      '<span class="history-game">' + item.game + '</span>' +
      amountHtml +
    '</div>';
  });
  
  list.innerHTML = html;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function updateBalanceDisplay() {
  var balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = '$' + state.balance.toFixed(2);
  }
}

function showToast(message, type) {
  var container = document.querySelector('.toast-container');
  if (!container) return;
  
  var toast = document.createElement('div');
  toast.className = 'toast ' + (type || 'info');
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Remove after animation
  setTimeout(function() {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}