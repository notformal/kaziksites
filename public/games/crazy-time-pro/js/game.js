/**
 * Crazy Time Pro — Complete Game Logic v2.0
 * Evolution Game Show Style Implementation with Bonus Games
 */

// ============================================
// GAME CONFIGURATION
// ============================================
var CRAZY_TIME_CONFIG = {
  wheelSegments: [
    { value: '1', type: 'number', payout: 1, count: 21 },
    { value: '2', type: 'number', payout: 2, count: 13 },
    { value: '5', type: 'number', payout: 5, count: 7 },
    { value: '10', type: 'number', payout: 10, count: 4 },
    { value: 'cashHunt', type: 'bonus', payout: 2, count: 2 },
    { value: 'pachinko', type: 'bonus', payout: 2, count: 2 },
    { value: 'coinFlip', type: 'bonus', payout: 2, count: 4 },
    { value: 'crazyTime', type: 'bonus', payout: 2, count: 1 }
  ],
  maxWin: 500000,
  betLimits: { min: 0.50, max: 10000 },
  bettingDuration: 15,
  spinDuration: 5000,
};

// ============================================
// GAME STATE
// ============================================
function CrazyTimeGame() {
  this.balance = 10000;
  this.currentChip = 0.50;
  this.bets = new Map();
  this.lastBets = new Map();
  this.history = [];
  this.roundActive = false;
  this.bettingActive = false;
  this.timer = null;
  this.timeLeft = 15;
  this.roundId = Math.floor(Math.random() * 999999);
  this.totalSpins = 0;
  this.bonusCount = 0;
  this.maxWinAmount = 0;
  this.totalWagered = 0;
  this.totalWon = 0;
  this.wheelRotation = 0;
  this.autoPlay = false;

  this.init();
}

CrazyTimeGame.prototype.init = function() {
  var self = this;
  this.setupEventListeners();
  this.renderNumberBetGrid();
  this.drawWheel();
  this.updateBalance();
  this.startNewRound();
};

// ============================================
// WHEEL DRAWING (Canvas)
// ============================================
CrazyTimeGame.prototype.drawWheel = function() {
  var canvas = document.getElementById('crazyWheelCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  var radius = 230;

  // Build segment array
  var segments = [];
  var self = this;
  CRAZY_TIME_CONFIG.wheelSegments.forEach(function(seg) {
    for (var i = 0; i < seg.count; i++) {
      var color;
      switch(seg.type) {
        case 'number':
          switch(seg.value) {
            case '1': color = '#4caf50'; break;
            case '2': color = '#2196f3'; break;
            case '5': color = '#ff9800'; break;
            case '10': color = '#f44336'; break;
          }
          break;
        case 'bonus':
          switch(seg.value) {
            case 'cashHunt': color = '#ff6b35'; break;
            case 'pachinko': color = '#9c27b0'; break;
            case 'coinFlip': color = '#ffd700'; break;
            case 'crazyTime': color = '#ff1493'; break;
          }
          break;
      }
      segments.push(Object.assign({}, seg, { color: color }));
    }
  });

  var totalSegments = segments.length;
  var segmentAngle = (2 * Math.PI) / totalSegments;

  // Draw segments
  for (var i = 0; i < totalSegments; i++) {
    var startAngle = i * segmentAngle - Math.PI / 2;
    var endAngle = startAngle + segmentAngle;
    var seg = segments[i];

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = '#1a0a2e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + segmentAngle / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, sans-serif';

    var text = seg.type === 'bonus' ?
      seg.value.replace('cashHunt', '\uD83C\uDFAF').replace('pachinko', '\uD83D\uDD2E').replace('coinFlip', '\uD83E\uDD59').replace('crazyTime', '\uD83C\uDFEA') :
      seg.value;
    ctx.fillText(text, radius * 0.78, 5);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Store segments for spin calculation
  this._wheelSegments = segments;
  this._totalSegments = totalSegments;
};

CrazyTimeGame.prototype.spinWheel = function(resultSegment) {
  var self = this;
  return new Promise(function(resolve) {
    var canvas = document.getElementById('crazyWheelCanvas');
    var centerDisplay = document.getElementById('wheelCenterDisplay');

    if (!canvas) { resolve(); return; }

    // Find segment index
    var targetIndex = -1;
    self._wheelSegments.forEach(function(seg, i) {
      if (seg.value === resultSegment.value && !seg.spinned) {
        targetIndex = i;
        seg.spinned = true;
      }
    });

    // If not found, pick random matching
    if (targetIndex === -1) {
      self._wheelSegments.forEach(function(seg, i) {
        if (seg.value === resultSegment.value) targetIndex = i;
      });
    }

    if (targetIndex === -1) targetIndex = 0;

    var segmentAngle = 360 / self._totalSegments;
    var targetAngle = 360 - (targetIndex * segmentAngle) - (segmentAngle / 2);
    var fullRotations = 6 + Math.floor(Math.random() * 3);
    var totalRotation = self.wheelRotation + (fullRotations * 360) + targetAngle;

    canvas.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    canvas.style.transform = 'rotate(' + totalRotation + 'deg)';
    self.wheelRotation = totalRotation;

    // Animate center display
    var spinCount = 0;
    var spinInterval = setInterval(function() {
      var randomSeg = self._wheelSegments[Math.floor(Math.random() * self._wheelSegments.length)];
      if (centerDisplay) {
        var icon = randomSeg.type === 'bonus' ?
          randomSeg.value.replace('cashHunt', '\uD83C\uDFAF').replace('pachinko', '\uD83D\uDD2E').replace('coinFlip', '\uD83E\uDD59').replace('crazyTime', '\uD83C\uDFEA') :
          randomSeg.value;
        centerDisplay.textContent = icon;
      }
      spinCount++;
      if (spinCount > 50) clearInterval(spinInterval);
    }, 100);

    setTimeout(function() {
      var icon = resultSegment.type === 'bonus' ?
        resultSegment.value.replace('cashHunt', '\uD83C\uDFAF').replace('pachinko', '\uD83D\uDD2E').replace('coinFlip', '\uD83E\uDD59').replace('crazyTime', '\uD83C\uDFEA') :
        resultSegment.value;
      if (centerDisplay) centerDisplay.textContent = icon;
      resolve();
    }, 5200);
  });
};

// ============================================
// EVENT LISTENERS
// ============================================
CrazyTimeGame.prototype.setupEventListeners = function() {
  var self = this;

  // Chip selection
  document.querySelectorAll('.chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('active'); });
      chip.classList.add('active');
      self.currentChip = parseFloat(chip.dataset.value);
    });
  });

  // Number bet cells
  document.querySelectorAll('.number-bet-cell').forEach(function(cell) {
    cell.addEventListener('click', function() {
      var value = cell.dataset.value;
      self.placeBet('number', [value], parseInt(value));
    });
  });

  // Bonus game bets
  document.querySelectorAll('.bonus-option').forEach(function(option) {
    option.addEventListener('click', function() {
      var bonusType = option.dataset.bonus;
      self.placeBet('bonus', [bonusType], 2);
    });
  });

  // Control buttons
  var clearBtn = document.getElementById('clearBets');
  if (clearBtn) clearBtn.addEventListener('click', function() { self.clearBets(); });

  var repeatBtn = document.getElementById('repeatBets');
  if (repeatBtn) repeatBtn.addEventListener('click', function() { self.repeatBets(); });

  var autoBtn = document.getElementById('autoPlay');
  if (autoBtn) autoBtn.addEventListener('click', function() { self.toggleAutoPlay(); });

  this.createToastContainer();
};

CrazyTimeGame.prototype.createToastContainer = function() {
  if (!document.querySelector('.toast-container')) {
    var container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
};

CrazyTimeGame.prototype.showToast = function(message, type) {
  type = type || 'info';
  this.createToastContainer();
  var container = document.querySelector('.toast-container');
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function() { toast.remove(); }, 3000);
};

// ============================================
// NUMBER BET GRID
// ============================================
CrazyTimeGame.prototype.renderNumberBetGrid = function() {
  var grid = document.getElementById('numberBetGrid');
  if (!grid) return;

  var values = ['1', '2', '5', '10'];

  values.forEach(function(value) {
    var cell = document.createElement('div');
    cell.className = 'number-bet-cell';
    cell.dataset.value = value;
    cell.textContent = value;
    grid.appendChild(cell);
  });
};

// ============================================
// BETTING SYSTEM
// ============================================
CrazyTimeGame.prototype.placeBet = function(category, values, payout) {
  var self = this;
  if (!this.bettingActive) {
    this.showToast('Ставки закрыты!', 'error');
    return;
  }

  if (this.balance < this.currentChip) {
    this.showToast('Недостаточно средств!', 'error');
    return;
  }

  var key = category + ':' + values.join(',');

  if (this.bets.has(key)) {
    var bet = this.bets.get(key);
    bet.amount += this.currentChip;
  } else {
    this.bets.set(key, { category: category, values: values, amount: this.currentChip, payout: payout });
  }

  this.balance -= this.currentChip;
  this.totalWagered += this.currentChip;
  this.updateBalance();
  this.updateBetsDisplay();
  this.highlightBetCell(category, values);
};

CrazyTimeGame.prototype.clearBets = function() {
  if (!this.bettingActive) return;

  var self = this;
  var totalRefund = 0;
  this.bets.forEach(function(bet) { totalRefund += bet.amount; });

  this.balance += totalRefund;
  this.bets.clear();
  this.updateBalance();
  this.updateBetsDisplay();
  this.showToast('Ставки очищены', 'info');
};

CrazyTimeGame.prototype.repeatBets = function() {
  var self = this;
  if (this.lastBets.size === 0) {
    this.showToast('Нечего повторить!', 'warning');
    return;
  }

  this.clearBets();

  var totalBet = 0;
  this.lastBets.forEach(function(bet, key) {
    if (self.balance >= bet.amount) {
      self.bets.set(key, Object.assign({}, bet));
      totalBet += bet.amount;
    }
  });

  this.balance -= totalBet;
  this.totalWagered += totalBet;
  this.updateBalance();
  this.updateBetsDisplay();
  this.showToast('Ставки повторены!', 'success');
};

CrazyTimeGame.prototype.highlightBetCell = function(category, values) {
  if (category === 'number') {
    document.querySelectorAll('.number-bet-cell').forEach(function(cell) {
      if (cell.dataset.value === values[0]) {
        cell.classList.add('placed');
        var bet = this.bets.get(category + ':' + values.join(','));
        if (bet) cell.setAttribute('data-bet-amount', '$' + bet.amount.toFixed(2));
      }
    }.bind(this));
  } else if (category === 'bonus') {
    document.querySelectorAll('.bonus-option').forEach(function(option) {
      if (option.dataset.bonus === values[0]) {
        option.classList.add('placed');
        var bet = this.bets.get(category + ':' + values.join(','));
        if (bet) option.setAttribute('data-bet-amount', '$' + bet.amount.toFixed(2));
      }
    }.bind(this));
  }
};

// ============================================
// ROUND MANAGEMENT
// ============================================
CrazyTimeGame.prototype.startNewRound = function() {
  var self = this;
  this.bettingActive = true;
  this.roundActive = true;
  this.timeLeft = CRAZY_TIME_CONFIG.bettingDuration;
  this.roundId = Math.floor(Math.random() * 999999);

  document.getElementById('roundId').textContent = 'Round #' + this.roundId;
  document.getElementById('timerDisplay').style.display = 'flex';

  // Reset wheel visual
  var canvas = document.getElementById('crazyWheelCanvas');
  if (canvas) {
    canvas.style.transition = 'none';
    this.wheelRotation = 0;
    canvas.style.transform = 'rotate(0deg)';
  }

  this.startTimer();
  this.showToast('Делайте ваши ставки!', 'info');
};

CrazyTimeGame.prototype.startTimer = function() {
  var self = this;
  if (this.timer) clearInterval(this.timer);

  var timeValue = document.getElementById('timeValue');
  if (timeValue) timeValue.textContent = this.timeLeft;

  this.timer = setInterval(function() {
    self.timeLeft--;

    if (timeValue) {
      timeValue.textContent = self.timeLeft;

      if (self.timeLeft <= 5) {
        timeValue.classList.add('warning');
      } else {
        timeValue.classList.remove('warning');
      }
    }

    if (self.timeLeft <= 0) {
      self.stopBetting();
    }
  }, 1000);
};

CrazyTimeGame.prototype.stopBetting = function() {
  var self = this;
  this.bettingActive = false;
  if (this.timer) clearInterval(this.timer);

  document.getElementById('timerDisplay').style.display = 'none';
  this.showToast('Ставки закрыты!', 'warning');

  // Save bets for repeat
  this.lastBets = new Map(this.bets);

  // Spin after short delay
  setTimeout(function() { self.spin(); }, 1500);
};

// ============================================
// SPIN MECHANICS (Promise chain)
// ============================================
CrazyTimeGame.prototype.spin = function() {
  var self = this;
  this.roundActive = true;
  this.showToast('Крутим колесо...', 'info');

  // Weighted random selection
  var resultSegment = this.getRandomResult();

  // Animate wheel spin then resolve
  return this.spinWheel(resultSegment).then(function() {
    setTimeout(function() { self.resolveRound(resultSegment); }, 500);
  });
};

CrazyTimeGame.prototype.getRandomResult = function() {
  // Calculate total weight
  var self = this;
  var totalWeight = 0;
  CRAZY_TIME_CONFIG.wheelSegments.forEach(function(seg) {
    totalWeight += seg.count;
  });

  var random = Math.random() * totalWeight;

  for (var i = 0; i < CRAZY_TIME_CONFIG.wheelSegments.length; i++) {
    var seg = CRAZY_TIME_CONFIG.wheelSegments[i];
    random -= seg.count;
    if (random <= 0) {
      return Object.assign({}, seg);
    }
  }

  return Object.assign({}, CRAZY_TIME_CONFIG.wheelSegments[0]);
};

// ============================================
// RESOLVE ROUND (Promise chain)
// ============================================
CrazyTimeGame.prototype.resolveRound = function(resultSegment) {
  var self = this;
  this.roundActive = false;
  this.totalSpins++;

  // Calculate winnings
  var totalWin = 0;
  var bonusTriggered = false;
  var betsArray = [];
  this.bets.forEach(function(bet) { betsArray.push(bet); });

  // Process each bet sequentially with Promise chain
  var chain = Promise.resolve();

  betsArray.forEach(function(bet) {
    chain = chain.then(function() {
      return new Promise(function(resolve) {
        var win = 0;

        if (bet.category === 'number') {
          if (bet.values.indexOf(resultSegment.value) !== -1) {
            win = bet.amount * (resultSegment.payout + 1);
          }
        } else if (bet.category === 'bonus') {
          if (bet.values.indexOf(resultSegment.value) !== -1) {
            // Bonus game triggered!
            bonusTriggered = true;
            self.bonusCount++;

            // Play bonus game and get result
            self.playBonusGame(resultSegment.value, bet.amount).then(function(bonusWin) {
              win = bonusWin || (bet.amount * 2);
              resolve();
            });
          } else {
            resolve();
          }
        } else {
          resolve();
        }

        totalWin += win;
      });
    });
  });

  // After all bets resolved, update everything
  chain.then(function() {
    // Update balance
    if (totalWin > 0) {
      self.balance += totalWin;
      if (totalWin > CRAZY_TIME_CONFIG.maxWin) {
        totalWin = CRAZY_TIME_CONFIG.maxWin;
        self.balance = CRAZY_TIME_CONFIG.maxWin;
      }
      self.totalWon += totalWin;

      if (totalWin > self.maxWinAmount) {
        self.maxWinAmount = totalWin;
      }
    }

    self.updateBalance();

    // Update history
    var historyEntry = {
      type: resultSegment.type,
      value: resultSegment.value,
      payout: resultSegment.payout
    };
    self.history.unshift(historyEntry);
    if (self.history.length > 20) self.history.pop();

    // Display result
    self.displayResult(resultSegment, totalWin, bonusTriggered);

    // Update UI
    self.updateHistory();
    self.updateStats();
    self.clearBetsForNextRound();

    // Start new round after delay
    setTimeout(function() {
      self.startNewRound();
    }, 8000);
  });
};

// ============================================
// BONUS GAMES (all return Promises)
// ============================================
CrazyTimeGame.prototype.playBonusGame = function(bonusType, betAmount) {
  var self = this;
  return new Promise(function(resolve) {
    var overlay = document.getElementById('bonusOverlay');
    var container = document.getElementById('bonusGameContainer');

    overlay.classList.add('active');
    container.innerHTML = '';

    switch(bonusType) {
      case 'cashHunt':
        self.playCashHunt(container, betAmount).then(resolve);
        break;
      case 'pachinko':
        self.playPachinko(container, betAmount).then(resolve);
        break;
      case 'coinFlip':
        self.playCoinFlip(container, betAmount).then(resolve);
        break;
      case 'crazyTime':
        self.playCrazyTime(container, betAmount).then(resolve);
        break;
      default:
        resolve(betAmount * 2);
    }
  });
};

CrazyTimeGame.prototype.playCashHunt = function(container, betAmount) {
  var self = this;
  return new Promise(function(resolve) {
    var title = document.createElement('h2');
    title.className = 'bonus-game-title';
    title.textContent = '\uD83C\uDFAF Cash Hunt';
    container.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.style.color = '#a0a3c4';
    subtitle.style.marginBottom = '1.5rem';
    subtitle.textContent = 'Выберите одну ячейку!';
    container.appendChild(subtitle);

    var grid = document.createElement('div');
    grid.className = 'cash-hunt-grid';

    var multipliers = [2, 5, 10, 20, 50, 100, 200, 500];
    var cells = [];

    for (var i = 0; i < 24; i++) {
      var cell = document.createElement('div');
      cell.className = 'cash-hunt-cell';
      cell.textContent = '?';

      var mult = multipliers[Math.floor(Math.random() * multipliers.length)];
      cell.dataset.multiplier = mult;

      cell.addEventListener('click', function() {
        if (cell.classList.contains('revealed')) return;

        // Reveal all cells
        cells.forEach(function(c) {
          c.classList.add('revealed');
          c.textContent = c.dataset.multiplier;
        });

        setTimeout(function() {
          var overlay = document.getElementById('bonusOverlay');
          if (overlay) overlay.classList.remove('active');
          resolve(betAmount * parseInt(cell.dataset.multiplier));
        }, 1500);
      });

      grid.appendChild(cell);
      cells.push(cell);
    }

    container.appendChild(grid);
  });
};

CrazyTimeGame.prototype.playPachinko = function(container, betAmount) {
  var self = this;
  return new Promise(function(resolve) {
    var title = document.createElement('h2');
    title.className = 'bonus-game-title';
    title.textContent = '\uD83D\uDD2E Pachinko';
    container.appendChild(title);

    var board = document.createElement('div');
    board.className = 'pachinko-board';
    board.style.position = 'relative';
    board.style.width = '400px';
    board.style.height = '500px';
    board.style.margin = '0 auto';

    // Create pegs
    for (var row = 0; row < 8; row++) {
      for (var col = 0; col < 6; col++) {
        var peg = document.createElement('div');
        peg.style.position = 'absolute';
        peg.style.width = '8px';
        peg.style.height = '8px';
        peg.style.borderRadius = '50%';
        peg.style.background = '#ffd700';
        peg.style.left = (40 + col * 60 + (row % 2 ? 30 : 0)) + 'px';
        peg.style.top = (40 + row * 50) + 'px';
        board.appendChild(peg);
      }
    }

    // Multiplier slots at bottom
    var multipliers = [10, 20, 50, 100, 200, 500];
    multipliers.forEach(function(mult, i) {
      var slot = document.createElement('div');
      slot.className = 'pachinko-multiplier';
      slot.style.position = 'absolute';
      slot.style.bottom = (i * 5 + 10) + 'px';
      slot.style.left = (30 + i * 60) + 'px';
      slot.style.width = '50px';
      slot.style.height = '40px';
      slot.style.borderRadius = '8px';
      slot.style.background = 'hsl(' + (i * 60) + ', 70%, 40%)';
      slot.style.color = '#fff';
      slot.style.textAlign = 'center';
      slot.style.lineHeight = '40px';
      slot.style.fontWeight = 'bold';
      slot.textContent = 'x' + mult;
      board.appendChild(slot);
    });

    container.appendChild(board);

    // Animate ball drop
    setTimeout(function() {
      var ball = document.createElement('div');
      ball.className = 'pachinko-ball';
      ball.style.position = 'absolute';
      ball.style.width = '16px';
      ball.style.height = '16px';
      ball.style.borderRadius = '50%';
      ball.style.background = 'radial-gradient(circle at 30% 30%, #fff, #ff6b35)';
      ball.style.boxShadow = '0 0 10px rgba(255, 107, 53, 0.8)';
      ball.style.left = '190px';
      ball.style.top = '10px';
      board.appendChild(ball);

      var y = 10;
      var x = 200;
      var speed = 0;
      var gravity = 0.5;

      function animate() {
        speed += gravity;
        y += speed;
        x += (Math.random() - 0.5) * 20;

        ball.style.top = y + 'px';
        ball.style.left = x + 'px';

        if (y < 440) {
          requestAnimationFrame(animate);
        } else {
          // Determine multiplier
          var slotIndex = Math.min(Math.floor(x / 50), 5);
          var selectedMult = multipliers[Math.max(0, slotIndex)];

          ball.style.background = 'radial-gradient(circle at 30% 30%, #fff, #ffd700)';
          ball.style.boxShadow = '0 0 20px rgba(255, 215, 0, 1)';

          setTimeout(function() {
            var overlay = document.getElementById('bonusOverlay');
            if (overlay) overlay.classList.remove('active');
            resolve(betAmount * selectedMult);
          }, 1000);
        }
      }

      requestAnimationFrame(animate);
    }, 500);
  });
};

CrazyTimeGame.prototype.playCoinFlip = function(container, betAmount) {
  var self = this;
  return new Promise(function(resolve) {
    var title = document.createElement('h2');
    title.className = 'bonus-game-title';
    title.textContent = '\uD83E\uDD59 Coin Flip';
    container.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.style.color = '#a0a3c4';
    subtitle.style.marginBottom = '2rem';
    subtitle.textContent = 'Орёл или решка? Множители случайны!';
    container.appendChild(subtitle);

    var flipContainer = document.createElement('div');
    flipContainer.className = 'coin-flip-container';
    flipContainer.style.textAlign = 'center';

    var coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.width = '150px';
    coin.style.height = '150px';
    coin.style.margin = '0 auto';
    coin.style.position = 'relative';
    coin.style.transformStyle = 'preserve-3d';
    coin.style.transition = 'transform 2s';
    coin.innerHTML = '<div class="coin-face coin-front" style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#ffd700,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:3rem;">\uD83E\uDD59</div><div class="coin-face coin-back" style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#2196f3,#9c27b0);display:flex;align-items:center;justify-content:center;font-size:3rem;">\uD83D\uDCB0</div>';

    flipContainer.appendChild(coin);
    container.appendChild(flipContainer);

    // Animate coin flip
    setTimeout(function() {
      coin.style.transform = 'rotateY(1800deg)';

      var redMult = [2, 5, 10, 25, 50, 100, 500][Math.floor(Math.random() * 7)];
      var blueMult = [2, 5, 10, 25, 50, 100, 500][Math.floor(Math.random() * 7)];

      setTimeout(function() {
        var isHeads = Math.random() > 0.5;
        var selectedMult = isHeads ? redMult : blueMult;
        var resultText = isHeads ? 'Орёл: x' + redMult : 'Решка: x' + blueMult;

        coin.innerHTML = '<div class="coin-face coin-front" style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#ffd700,#ff6b35);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:bold;">x' + redMult + '</div><div class="coin-face coin-back" style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#2196f3,#9c27b0);display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:bold;">x' + blueMult + '</div>';

        var result = document.createElement('p');
        result.style.color = '#ffd700';
        result.style.fontSize = '1.5rem';
        result.style.fontWeight = '900';
        result.style.marginTop = '2rem';
        result.style.textAlign = 'center';
        result.textContent = resultText + ' — Выигрыш: $' + (betAmount * selectedMult).toFixed(2);

        flipContainer.appendChild(result);

        setTimeout(function() {
          var overlay = document.getElementById('bonusOverlay');
          if (overlay) overlay.classList.remove('active');
          resolve(betAmount * selectedMult);
        }, 2000);
      }, 2000);
    }, 500);
  });
};

CrazyTimeGame.prototype.playCrazyTime = function(container, betAmount) {
  var self = this;
  return new Promise(function(resolve) {
    var title = document.createElement('h2');
    title.className = 'bonus-game-title';
    title.textContent = '\uD83C\uDFEA Crazy Time';
    container.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.style.color = '#a0a3c4';
    subtitle.style.marginBottom = '2rem';
    subtitle.textContent = 'Финальный бонус! Крутите двойное колесо!';
    container.appendChild(subtitle);

    // Simple wheel representation
    var wheel = document.createElement('div');
    wheel.style.width = '300px';
    wheel.style.height = '300px';
    wheel.style.borderRadius = '50%';
    wheel.style.margin = '0 auto';
    wheel.style.border = '4px solid #ffd700';
    wheel.style.position = 'relative';
    wheel.style.overflow = 'hidden';
    wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)';

    // Create segments using conic gradient
    var colors = ['#ff1493', '#ff6b35', '#ffd700', '#9c27b0', '#2196f3', '#4caf50'];
    wheel.style.background = 'conic-gradient(' + colors.map(function(c, i) { return c + ' ' + (i * 60) + 'deg ' + ((i + 1) * 60) + 'deg'; }).join(', ') + ')';

    container.appendChild(wheel);

    // Pointer
    var pointer = document.createElement('div');
    pointer.style.position = 'absolute';
    pointer.style.top = '-15px';
    pointer.style.left = '50%';
    pointer.style.transform = 'translateX(-50%)';
    pointer.style.width = '0';
    pointer.style.height = '0';
    pointer.style.borderLeft = '15px solid transparent';
    pointer.style.borderRight = '15px solid transparent';
    pointer.style.borderTop = '30px solid #ffd700';
    pointer.style.zIndex = '10';
    container.appendChild(pointer);

    // Spin
    setTimeout(function() {
      var rotation = 1800 + Math.floor(Math.random() * 360);
      wheel.style.transform = 'rotate(' + rotation + 'deg)';

      setTimeout(function() {
        var segmentIndex = Math.floor(((rotation % 360) / 60)) % 6;
        var maxMultipliers = [500, 1000, 2000, 5000, 10000, 20000];
        var selectedMult = maxMultipliers[segmentIndex];

        var result = document.createElement('p');
        result.style.color = '#ffd700';
        result.style.fontSize = '2rem';
        result.style.fontWeight = '900';
        result.style.marginTop = '2rem';
        result.style.textAlign = 'center';
        result.textContent = 'MEGA WIN: x' + selectedMult + ' — $' + (betAmount * selectedMult).toFixed(2);

        container.appendChild(result);

        setTimeout(function() {
          var overlay = document.getElementById('bonusOverlay');
          if (overlay) overlay.classList.remove('active');
          resolve(betAmount * selectedMult);
        }, 2500);
      }, 3200);
    }, 500);
  });
};

// ============================================
// UI UPDATES
// ============================================
CrazyTimeGame.prototype.displayResult = function(segment, win, bonusTriggered) {
  var popup = document.getElementById('resultPopup');
  var resultNumber = document.getElementById('resultNumber');
  var resultMessage = document.getElementById('resultMessage');
  var resultAmount = document.getElementById('resultAmount');

  if (!popup || !resultNumber) return;

  var displayText, colorClass;

  if (segment.type === 'number') {
    displayText = segment.value;
    switch(segment.value) {
      case '1': colorClass = 'number-1'; break;
      case '2': colorClass = 'number-2'; break;
      case '5': colorClass = 'number-5'; break;
      case '10': colorClass = 'number-10'; break;
    }
  } else {
    var icons = { cashHunt: '\uD83C\uDFAF', pachinko: '\uD83D\uDD2E', coinFlip: '\uD83E\uDD59', crazyTime: '\uD83C\uDFEA' };
    displayText = icons[segment.value] || '?';
    colorClass = 'bonus-' + segment.value;
  }

  resultNumber.textContent = displayText;
  resultNumber.className = 'result-number ' + colorClass;

  if (win > 0) {
    var message = bonusTriggered ? '\uD83C\uDF89 \u0411\u041E\u041D\u0423\u0421 \u0418\u0413\u0420\u0410! \u0412\u042b\u0418\u0413\u0420\u042b\u0428! \uD83C\uDF89' : '\uD83C\uDF89 \u0412\u042b \u0412\u042B\u0418\u0413\u0420\u0410\u041B\u0418! \uD83C\uDF89';
    resultMessage.textContent = message;
    resultMessage.className = 'result-message win';
    resultAmount.textContent = '$' + win.toFixed(2);
  } else {
    resultMessage.textContent = bonusTriggered ? 'Бонус активирован!' : 'В этот раз не повезло';
    resultMessage.className = 'result-message loss';
    resultAmount.textContent = '$0.00';
    resultAmount.style.color = 'var(--crazy-text-muted)';
  }

  popup.classList.add('active');

  setTimeout(function() {
    popup.classList.remove('active');
  }, 5000);
};

CrazyTimeGame.prototype.updateHistory = function() {
  var container = document.getElementById('numberHistory');
  if (!container) return;

  container.innerHTML = '';

  var self = this;
  this.history.forEach(function(item) {
    var num = document.createElement('div');
    var colorClass = '';

    if (item.type === 'number') {
      colorClass = 'number-' + item.value;
    } else {
      colorClass = 'bonus-' + item.value;
    }

    num.className = 'history-number ' + colorClass;

    var icons = { cashHunt: '\uD83C\uDFAF', pachinko: '\uD83D\uDD2E', coinFlip: '\uD83E\uDD59', crazyTime: '\uD83C\uDFEA' };
    num.textContent = item.type === 'bonus' ? icons[item.value] : item.value;

    container.appendChild(num);
  });
};

CrazyTimeGame.prototype.updateStats = function() {
  document.getElementById('totalSpins').textContent = this.totalSpins;
  document.getElementById('bonusCount').textContent = this.bonusCount;
  document.getElementById('maxWin').textContent = '$' + this.maxWinAmount.toFixed(0);

  var rtp = this.totalWagered > 0 ? ((this.totalWon / this.totalWagered) * 100).toFixed(1) : '95.5';
  document.getElementById('rtp').textContent = rtp + '%';

  // Update bead plate
  var beadPlate = document.getElementById('beadPlate');
  if (beadPlate) {
    beadPlate.innerHTML = '';
    var self = this;
    this.history.slice(0, 30).forEach(function(item) {
      var bead = document.createElement('div');
      var colorClass = '';

      if (item.type === 'number') {
        colorClass = 'number-' + item.value;
      } else {
        colorClass = 'bonus-' + item.value;
      }

      bead.className = 'bead ' + colorClass;
      var icons = { cashHunt: '\uD83C\uDFAF', pachinko: '\uD83D\uDD2E', coinFlip: '\uD83E\uDD59', crazyTime: '\uD83C\uDFEA' };
      bead.textContent = item.type === 'bonus' ? icons[item.value] : item.value;
      beadPlate.appendChild(bead);
    });
  }

  // Update multiplier history
  var multHistory = document.getElementById('multiplierHistory');
  if (multHistory) {
    multHistory.innerHTML = '';
    var self = this;
    this.history.slice(0, 10).forEach(function(item) {
      var itemEl = document.createElement('div');
      itemEl.className = 'mult-history-item';

      if (item.type === 'number') {
        itemEl.textContent = 'x' + item.payout;
      } else {
        itemEl.textContent = '\uD83C\uDF81 ' + item.value;
      }

      multHistory.appendChild(itemEl);
    });
  }
};

CrazyTimeGame.prototype.updateBalance = function() {
  var balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = '$' + this.balance.toFixed(2);
  }
};

CrazyTimeGame.prototype.updateBetsDisplay = function() {
  var list = document.getElementById('betsList');
  var total = document.getElementById('totalBet');

  if (!list || !total) return;

  list.innerHTML = '';
  var totalBet = 0;
  var self = this;

  this.bets.forEach(function(bet) {
    totalBet += bet.amount;

    var item = document.createElement('div');
    item.className = 'bet-item';

    var typeLabel = '';
    if (bet.category === 'number') {
      typeLabel = 'Число: ' + bet.values[0];
    } else {
      var bonusNames = { cashHunt: '\uD83C\uDFAF Cash Hunt', pachinko: '\uD83D\uDD2E Pachinko', coinFlip: '\uD83E\uDD59 Coin Flip', crazyTime: '\uD83C\uDFEA Crazy Time' };
      typeLabel = bonusNames[bet.values[0]] || bet.values[0];
    }

    item.innerHTML = '<span class="bet-type">' + typeLabel + '</span><span class="bet-amount-display">$' + bet.amount.toFixed(2) + '</span>';
    list.appendChild(item);
  });

  total.textContent = '$' + totalBet.toFixed(2);
};

CrazyTimeGame.prototype.clearBetsForNextRound = function() {
  var self = this;
  this.bets.clear();
  document.querySelectorAll('.number-bet-cell.placed, .bonus-option.placed').forEach(function(cell) {
    cell.classList.remove('placed');
    cell.removeAttribute('data-bet-amount');
  });
  this.updateBetsDisplay();

  // Update last win display
  var lastWinEl = document.getElementById('lastWin');
  if (lastWinEl) lastWinEl.textContent = '$0.00';
};

CrazyTimeGame.prototype.toggleAutoPlay = function() {
  var btn = document.getElementById('autoPlay');
  if (!btn) return;

  this.autoPlay = !this.autoPlay;
  btn.textContent = this.autoPlay ? 'Стоп' : 'Авто';
  btn.style.background = this.autoPlay ? 'var(--crazy-green)' : '';
  this.showToast(this.autoPlay ? 'Авто-игра включена' : 'Авто-игра выключена', 'info');
};

// ============================================
// INITIALIZE GAME
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  window.game = new CrazyTimeGame();
});
