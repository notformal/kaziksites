/**
 * BetBy Sports — Ставки на спорт
 * Full sports betting interface with live odds and bet slip
 */

// ============================================
// SPORTS CONFIGURATION
// ============================================
var SPORTS_CONFIG = {
  football: {
    name: '⚽ Футбол',
    leagues: [
      { id: 'epl', name: 'Английская Премьер-Лига', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { id: 'laliga', name: 'Ла Лига', flag: '🇪🇸' },
      { id: 'bundesliga', name: 'Бундеслига', flag: '🇩🇪' },
      { id: 'seriea', name: 'Серия A', flag: '🇮🇹' },
      { id: 'ligue1', name: 'Лига 1', flag: '🇫🇷' },
      { id: 'ucl', name: 'Лига Чемпионов УЕФА', flag: '🇪🇺' }
    ]
  },
  basketball: {
    name: '🏀 Баскетбол',
    leagues: [
      { id: 'nba', name: 'NBA', flag: '🇺🇸' },
      { id: 'euroleague', name: 'Евролига', flag: '🇪🇺' },
      { id: 'acb', name: 'ACB (Испания)', flag: '🇪🇸' }
    ]
  },
  tennis: {
    name: '🎾 Теннис',
    leagues: [
      { id: 'atp', name: 'ATP Tour', flag: '🌍' },
      { id: 'wta', name: 'WTA Tour', flag: '🌍' },
      { id: 'grand_slam', name: 'Большой Шлем', flag: '🏆' }
    ]
  },
  hockey: {
    name: '🏒 Хоккей',
    leagues: [
      { id: 'nhl', name: 'NHL', flag: '🇺🇸' },
      { id: 'khl', name: 'КХЛ', flag: '🇷🇺' },
      { id: 'champions', name: 'SHL', flag: '🇸🇪' }
    ]
  }
};

// ============================================
// TEAM DATA
// ============================================
var TEAMS_DATA = {
  football: [
    { name: 'Manchester City', logo: '🔵' },
    { name: 'Arsenal', logo: '🔴' },
    { name: 'Liverpool', logo: '🔴' },
    { name: 'Chelsea', logo: '🔵' },
    { name: 'Manchester United', logo: '🔴' },
    { name: 'Tottenham', logo: '⚪' },
    { name: 'Real Madrid', logo: '⚪' },
    { name: 'Barcelona', logo: '🔵' },
    { name: 'Atletico Madrid', logo: '🔴' },
    { name: 'Bayern Munich', logo: '🔴' },
    { name: 'Borussia Dortmund', logo: '🟡' },
    { name: 'Juventus', logo: '⚪' },
    { name: 'AC Milan', logo: '🔴' },
    { name: 'Inter Milan', logo: '🔵' },
    { name: 'PSG', logo: '🔵' },
    { name: 'Napoli', logo: '🔵' }
  ],
  basketball: [
    { name: 'LA Lakers', logo: '💛' },
    { name: 'Boston Celtics', logo: '☘️' },
    { name: 'Golden State Warriors', logo: '💙' },
    { name: 'Chicago Bulls', logo: '🔴' },
    { name: 'Miami Heat', logo: '🔥' },
    { name: 'Real Madrid Baloncesto', logo: '⚪' }
  ],
  tennis: [
    { name: 'Player A', logo: '🎾' },
    { name: 'Player B', logo: '🎾' },
    { name: 'Player C', logo: '🎾' },
    { name: 'Player D', logo: '🎾' }
  ],
  hockey: [
    { name: 'Toronto Maple Leafs', logo: '🍁' },
    { name: 'Montreal Canadiens', logo: '🔴' },
    { name: 'CSKA Moscow', logo: '⭐' },
    { name: 'SKA St Petersburg', logo: '🐉' },
    { name: 'Detroit Red Wings', logo: '🔴' }
  ]
};

// ============================================
// GAME STATE
// ============================================
function BetBySports() {
  this.balance = 10000;
  this.currentSport = 'football';
  this.currentLeague = null;
  this.showLiveOnly = false;
  this.betSlip = [];
  this.betHistory = [];
  this.events = [];
  this.liveEvents = [];
  this.apiBase = '';
  this.liveSimulationInterval = null;

  this.init();
}

BetBySports.prototype.init = function() {
  var self = this;
  this.detectApiBase();
  this.setupEventListeners();
  this.updateBalance();
  this.renderLeagues();
  this.fetchEvents();
};

BetBySports.prototype.detectApiBase = function() {
  // Try to detect API base from current location
  var host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    this.apiBase = 'http://' + host + ':8787';
  } else {
    this.apiBase = window.location.origin;
  }
};

// ============================================
// EVENT LISTENERS
// ============================================
BetBySports.prototype.setupEventListeners = function() {
  var self = this;

  // Sport navigation buttons
  document.querySelectorAll('.sport-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sport-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      self.currentSport = btn.dataset.sport;
      self.currentLeague = null;
      self.renderLeagues();
      self.fetchEvents();
    });
  });

  // Live toggle
  var liveToggle = document.getElementById('liveToggle');
  if (liveToggle) {
    liveToggle.addEventListener('click', function() {
      self.showLiveOnly = !self.showLiveOnly;
      liveToggle.classList.toggle('active', self.showLiveOnly);
      if (self.showLiveOnly) {
        self.renderLiveEvents();
      } else {
        document.getElementById('liveSection').style.display = 'none';
      }
    });
  }

  // Place bet button
  var placeBetBtn = document.getElementById('placeBetBtn');
  if (placeBetBtn) {
    placeBetBtn.addEventListener('click', function() { self.submitAllBets(); });
  }

  // Clear bet slip button
  var clearBetslipBtn = document.getElementById('clearBetslipBtn');
  if (clearBetslipBtn) {
    clearBetslipBtn.addEventListener('click', function() { self.clearBetSlip(); });
  }
};

// ============================================
// LEAGUES RENDERING
// ============================================
BetBySports.prototype.renderLeagues = function() {
  var container = document.getElementById('leagueList');
  if (!container) return;

  container.innerHTML = '';

  var sportConfig = SPORTS_CONFIG[this.currentSport];
  if (!sportConfig) return;

  // "All" option
  var allItem = this.createLeagueItem('', 'Все лиги', '', 0);
  container.appendChild(allItem);

  sportConfig.leagues.forEach(function(league) {
    var item = this.createLeagueItem(league.id, league.name, league.flag, 0);
    container.appendChild(item);
  }.bind(this));
};

BetBySports.prototype.createLeagueItem = function(leagueId, name, flag, count) {
  var item = document.createElement('div');
  item.className = 'league-item' + (this.currentLeague === leagueId ? ' active' : '');
  item.dataset.league = leagueId;

  var flagEl = document.createElement('span');
  flagEl.className = 'league-flag';
  flagEl.textContent = flag || '🏆';

  var nameEl = document.createElement('span');
  nameEl.className = 'league-name';
  nameEl.textContent = name || 'Все';

  var countEl = document.createElement('span');
  countEl.className = 'league-count';
  countEl.textContent = count;

  item.appendChild(flagEl);
  item.appendChild(nameEl);
  item.appendChild(countEl);

  var self = this;
  item.addEventListener('click', function() {
    document.querySelectorAll('.league-item').forEach(function(li) { li.classList.remove('active'); });
    item.classList.add('active');
    self.currentLeague = leagueId;
    self.fetchEvents();
  });

  return item;
};

// ============================================
// API CALLS
// ============================================
BetBySports.prototype.fetchEvents = function() {
  var self = this;
  var url = this.apiBase + '/api/sports/events?sport=' + this.currentSport;

  if (this.currentLeague) {
    url += '&league=' + this.currentLeague;
  }

  fetch(url)
    .then(function(response) { return response.json(); })
    .then(function(data) {
      self.events = data.events || [];
      self.renderEvents();
      self.updateLeagueCounts();
    })
    .catch(function(err) {
      console.warn('API fetch failed, using mock data:', err);
      self.events = self.generateMockEvents();
      self.renderEvents();
    });
};

BetBySports.prototype.fetchLiveEvents = function() {
  var self = this;
  fetch(this.apiBase + '/api/sports/live')
    .then(function(response) { return response.json(); })
    .then(function(data) {
      self.liveEvents = data.events || [];
      self.renderLiveEvents();
    })
    .catch(function(err) {
      console.warn('Live fetch failed:', err);
    });
};

// ============================================
// MOCK DATA GENERATOR
// ============================================
BetBySports.prototype.generateMockEvents = function() {
  var self = this;
  var teams = TEAMS_DATA[this.currentSport] || TEAMS_DATA.football;
  var events = [];
  var numEvents = 6 + Math.floor(Math.random() * 5);

  for (var i = 0; i < numEvents; i++) {
    var homeIdx = Math.floor(Math.random() * teams.length);
    var awayIdx;
    do { awayIdx = Math.floor(Math.random() * teams.length); } while (awayIdx === homeIdx);

    var homeTeam = teams[homeIdx];
    var awayTeam = teams[awayIdx];

    events.push({
      id: 'evt_' + Date.now() + '_' + i,
      sport: this.currentSport,
      league: this.currentLeague || 'default',
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      homeLogo: homeTeam.logo,
      awayLogo: awayTeam.logo,
      startTime: new Date(Date.now() + Math.random() * 86400000 * 3).toISOString(),
      odds: {
        moneyline: {
          home: this.randomOdd(1.5, 4.5),
          draw: this.currentSport === 'football' ? this.randomOdd(2.8, 4.0) : null,
          away: this.randomOdd(1.5, 4.5)
        },
        overUnder: {
          line: this.currentSport === 'football' ? 2.5 : (this.currentSport === 'basketball' ? 215.5 : 22.5),
          over: this.randomOdd(1.8, 2.2),
          under: this.randomOdd(1.8, 2.2)
        },
        spread: {
          line: this.currentSport === 'football' ? (-1.5) : (this.currentSport === 'basketball' ? (-3.5) : -2.5),
          home: this.randomOdd(1.9, 2.1),
          away: this.randomOdd(1.9, 2.1)
        }
      }
    });
  }

  return events;
};

BetBySports.prototype.randomOdd = function(min, max) {
  return (min + Math.random() * (max - min)).toFixed(2);
};

// ============================================
// EVENTS RENDERING
// ============================================
BetBySports.prototype.renderEvents = function() {
  var container = document.getElementById('eventsList');
  if (!container) return;

  container.innerHTML = '';

  if (this.events.length === 0) {
    container.innerHTML = '<p style="color:var(--betby-text-muted);text-align:center;padding:2rem;">Нет доступных событий</p>';
    return;
  }

  var self = this;
  this.events.forEach(function(event) {
    var card = self.createEventCard(event);
    container.appendChild(card);
  });
};

BetBySports.prototype.createEventCard = function(event) {
  var self = this;
  var card = document.createElement('div');
  card.className = 'event-card';

  // Event header
  var header = document.createElement('div');
  header.className = 'event-header';

  var leagueInfo = document.createElement('div');
  leagueInfo.className = 'event-league';
  var sportConfig = SPORTS_CONFIG[this.currentSport];
  if (sportConfig) {
    var league = sportConfig.leagues.find(function(l) { return l.id === event.league; });
    if (league) {
      leagueInfo.innerHTML = '<span class="league-flag">' + league.flag + '</span> ' + league.name;
    } else {
      leagueInfo.textContent = sportConfig.name;
    }
  }

  var timeInfo = document.createElement('div');
  var eventDate = new Date(event.startTime);
  timeInfo.textContent = eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' +
                         eventDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  header.appendChild(leagueInfo);
  header.appendChild(timeInfo);
  card.appendChild(header);

  // Event body
  var body = document.createElement('div');
  body.className = 'event-body';

  // Teams display
  var teamsDisplay = document.createElement('div');
  teamsDisplay.className = 'teams-display';

  var homeDiv = document.createElement('div');
  homeDiv.className = 'team home';
  homeDiv.innerHTML = '<span class="team-logo">' + event.homeLogo + '</span><span class="team-name">' + event.homeTeam + '</span>';

  var awayDiv = document.createElement('div');
  awayDiv.className = 'team away';
  awayDiv.innerHTML = '<span class="team-name">' + event.awayTeam + '</span><span class="team-logo">' + event.awayLogo + '</span>';

  var divider = document.createElement('div');
  divider.className = 'vs-divider';
  divider.textContent = 'VS';

  teamsDisplay.appendChild(homeDiv);
  teamsDisplay.appendChild(divider);
  teamsDisplay.appendChild(awayDiv);
  body.appendChild(teamsDisplay);

  // Odds row (Moneyline)
  var oddsRow = document.createElement('div');
  oddsRow.className = 'odds-row';

  var betTypes = [
    { key: 'home', label: '1', isDraw: false },
    { key: 'draw', label: 'X', isDraw: true },
    { key: 'away', label: '2', isDraw: false }
  ];

  betTypes.forEach(function(betType) {
    var oddVal = event.odds.moneyline[betType.key];
    if (!oddVal && betType.isDraw) return; // Draw not available for some sports

    var btn = document.createElement('div');
    btn.className = 'odd-btn';
    btn.dataset.eventId = event.id;
    btn.dataset.selection = betType.key;
    btn.dataset.odds = oddVal;

    btn.innerHTML = '<span class="odd-label">' + betType.label + '</span><span class="odd-value">' + oddVal + '</span>';

    btn.addEventListener('click', function() {
      self.toggleBetInSlip(event, betType.key, betType.label, oddVal, event.homeTeam + ' vs ' + event.awayTeam);
    });

    oddsRow.appendChild(btn);
  });

  body.appendChild(oddsRow);

  // Over/Under
  var ouRow = document.createElement('div');
  ouRow.className = 'odds-row';

  var ouLine = event.odds.overUnder.line;
  var ouOverBtn = document.createElement('div');
  ouOverBtn.className = 'odd-btn';
  ouOverBtn.dataset.eventId = event.id;
  ouOverBtn.dataset.selection = 'over';
  ouOverBtn.dataset.odds = event.odds.overUnder.over;
  ouOverBtn.innerHTML = '<span class="odd-label">ТБ ' + ouLine + '</span><span class="odd-value">' + event.odds.overUnder.over + '</span>';

  var ouUnderBtn = document.createElement('div');
  ouUnderBtn.className = 'odd-btn';
  ouUnderBtn.dataset.eventId = event.id;
  ouUnderBtn.dataset.selection = 'under';
  ouUnderBtn.dataset.odds = event.odds.overUnder.under;
  ouUnderBtn.innerHTML = '<span class="odd-label">ТМ ' + ouLine + '</span><span class="odd-value">' + event.odds.overUnder.under + '</span>';

  ouOverBtn.addEventListener('click', function() {
    self.toggleBetInSlip(event, 'over', 'ТБ ' + ouLine, event.odds.overUnder.over, event.homeTeam + ' vs ' + event.awayTeam);
  });

  ouUnderBtn.addEventListener('click', function() {
    self.toggleBetInSlip(event, 'under', 'ТМ ' + ouLine, event.odds.overUnder.under, event.homeTeam + ' vs ' + event.awayTeam);
  });

  ouRow.appendChild(ouOverBtn);
  ouRow.appendChild(ouUnderBtn);

  // Spread button placeholder
  var spreadPlaceholder = document.createElement('div');
  spreadPlaceholder.className = 'odd-btn';
  spreadPlaceholder.innerHTML = '<span class="odd-label">Ф</span><span class="odd-value">' + event.odds.spread.line + '</span>';
  ouRow.appendChild(spreadPlaceholder);

  body.appendChild(ouRow);

  card.appendChild(body);

  return card;
};

// ============================================
// LIVE EVENTS
// ============================================
BetBySports.prototype.renderLiveEvents = function() {
  var section = document.getElementById('liveSection');
  var container = document.getElementById('liveEventsList');
  if (!section || !container) return;

  section.style.display = 'block';
  container.innerHTML = '';

  if (this.liveEvents.length === 0) {
    // Generate mock live events
    this.liveEvents = this.generateMockLiveEvents();
  }

  var self = this;
  this.liveEvents.forEach(function(event) {
    var card = self.createLiveEventCard(event);
    container.appendChild(card);
  });
};

BetBySports.prototype.generateMockLiveEvents = function() {
  var teams = TEAMS_DATA[this.currentSport] || TEAMS_DATA.football;
  var events = [];

  for (var i = 0; i < 3; i++) {
    var homeIdx = Math.floor(Math.random() * teams.length);
    var awayIdx;
    do { awayIdx = Math.floor(Math.random() * teams.length); } while (awayIdx === homeIdx);

    events.push({
      id: 'live_' + Date.now() + '_' + i,
      sport: this.currentSport,
      league: 'Live',
      homeTeam: teams[homeIdx].name,
      awayTeam: teams[awayIdx].name,
      homeLogo: teams[homeIdx].logo,
      awayLogo: teams[awayIdx].logo,
      score: { home: Math.floor(Math.random() * 4), away: Math.floor(Math.random() * 3) },
      minute: 15 + Math.floor(Math.random() * 70),
      odds: {
        moneyline: {
          home: this.randomOdd(1.3, 3.5),
          draw: this.currentSport === 'football' ? this.randomOdd(2.5, 4.0) : null,
          away: this.randomOdd(1.8, 5.0)
        },
        overUnder: {
          line: this.currentSport === 'football' ? 2.5 : 215.5,
          over: this.randomOdd(1.7, 2.3),
          under: this.randomOdd(1.7, 2.3)
        }
      }
    });
  }

  return events;
};

BetBySports.prototype.createLiveEventCard = function(event) {
  var self = this;
  var card = document.createElement('div');
  card.className = 'event-card live';

  // Header with live badge
  var header = document.createElement('div');
  header.className = 'event-header';
  header.innerHTML = '<span class="live-badge">LIVE ' + event.minute + "\'" + '</span><span>' + event.league + '</span>';
  card.appendChild(header);

  // Body
  var body = document.createElement('div');
  body.className = 'event-body';

  // Teams with scores
  var teamsDisplay = document.createElement('div');
  teamsDisplay.className = 'teams-display';

  teamsDisplay.innerHTML =
    '<div class="team home"><span class="team-logo">' + event.homeLogo + '</span><span class="team-name">' + event.homeTeam + '</span><span class="team-score">' + (event.score ? event.score.home : '-') + '</span></div>' +
    '<div class="vs-divider">:</div>' +
    '<div class="team away"><span class="team-score">' + (event.score ? event.score.away : '-') + '</span><span class="team-name">' + event.awayTeam + '</span><span class="team-logo">' + event.awayLogo + '</span></div>';

  body.appendChild(teamsDisplay);

  // Odds
  var oddsRow = document.createElement('div');
  oddsRow.className = 'odds-row';

  var betTypes = [
    { key: 'home', label: '1' },
    { key: 'draw', label: 'X' },
    { key: 'away', label: '2' }
  ];

  betTypes.forEach(function(betType) {
    var oddVal = event.odds.moneyline[betType.key];
    if (!oddVal && betType.isDraw) return;

    var btn = document.createElement('div');
    btn.className = 'odd-btn';
    btn.dataset.eventId = event.id;
    btn.dataset.selection = betType.key;
    btn.dataset.odds = oddVal;
    btn.innerHTML = '<span class="odd-label">' + betType.label + '</span><span class="odd-value">' + oddVal + '</span>';

    btn.addEventListener('click', function() {
      self.toggleBetInSlip(event, betType.key, betType.label, oddVal, event.homeTeam + ' vs ' + event.awayTeam);
    });

    oddsRow.appendChild(btn);
  });

  body.appendChild(oddsRow);
  card.appendChild(body);

  return card;
};

// ============================================
// BET SLIP MANAGEMENT
// ============================================
BetBySports.prototype.toggleBetInSlip = function(event, selection, label, odds, matchName) {
  var existingIndex = -1;
  for (var i = 0; i < this.betSlip.length; i++) {
    if (this.betSlip[i].eventId === event.id && this.betSlip[i].selection === selection) {
      existingIndex = i;
      break;
    }
  }

  if (existingIndex >= 0) {
    // Remove bet
    this.betSlip.splice(existingIndex, 1);
  } else {
    // Add bet
    this.betSlip.push({
      eventId: event.id,
      event: matchName,
      selection: selection,
      selectionLabel: label,
      odds: parseFloat(odds),
      stake: 0
    });
  }

  this.renderBetSlip();
  this.updateOddButtons(event.id);
};

BetBySports.prototype.updateOddButtons = function(eventId) {
  document.querySelectorAll('.odd-btn').forEach(function(btn) {
    if (btn.dataset.eventId === eventId) {
      var isSelected = false;
      for (var i = 0; i < this.betSlip.length; i++) {
        if (this.betSlip[i].eventId === eventId && this.betSlip[i].selection === btn.dataset.selection) {
          isSelected = true;
          break;
        }
      }
      btn.classList.toggle('selected', isSelected);
    }
  }.bind(this));
};

BetBySports.prototype.renderBetSlip = function() {
  var content = document.getElementById('betslipContent');
  var summary = document.getElementById('betslipSummary');
  if (!content) return;

  content.innerHTML = '';

  if (this.betSlip.length === 0) {
    content.innerHTML = '<p class="empty-betslip">Добавьте события в купон для размещения ставки</p>';
    if (summary) summary.style.display = 'none';
    return;
  }

  var self = this;
  this.betSlip.forEach(function(bet, index) {
    var slipItem = document.createElement('div');
    slipItem.className = 'bet-slip-item';

    slipItem.innerHTML =
      '<div class="bet-slip-header">' +
        '<span class="bet-slip-event">' + bet.event + '</span>' +
        '<button class="bet-slip-remove" data-index="' + index + '">✕</button>' +
      '</div>' +
      '<div class="bet-slip-selection">' + bet.selectionLabel + '</div>' +
      '<div class="bet-slip-odd">Коэф: ' + bet.odds.toFixed(2) + '</div>' +
      '<div class="bet-slip-stake">' +
        '<input type="number" class="stake-input" data-index="' + index + '" placeholder="Ставка" min="0.50" step="0.50" value="' + (bet.stake || '') + '">' +
        '<div class="stake-presets">' +
          '<button class="stake-preset" data-index="' + index + '" data-amount="5">$5</button>' +
          '<button class="stake-preset" data-index="' + index + '" data-amount="10">$10</button>' +
          '<button class="stake-preset" data-index="' + index + '" data-amount="25">$25</button>' +
          '<button class="stake-preset" data-index="' + index + '" data-amount="50">$50</button>' +
        '</div>' +
      '</div>';

    content.appendChild(slipItem);
  }.bind(this));

  // Event listeners for stake inputs
  content.querySelectorAll('.stake-input').forEach(function(input) {
    input.addEventListener('input', function() {
      var idx = parseInt(this.dataset.index);
      this.betSlip[idx].stake = parseFloat(this.value) || 0;
      self.updateBetSlipSummary();
    }.bind(self));
  });

  // Event listeners for remove buttons
  content.querySelectorAll('.bet-slip-remove').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.index);
      self.betSlip.splice(idx, 1);
      self.renderBetSlip();
    });
  });

  // Event listeners for stake presets
  content.querySelectorAll('.stake-preset').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var idx = parseInt(btn.dataset.index);
      var amount = parseFloat(btn.dataset.amount);
      self.betSlip[idx].stake = amount;
      var input = content.querySelector('.stake-input[data-index="' + idx + '"]');
      if (input) input.value = amount;
      self.updateBetSlipSummary();
    });
  });

  if (summary) summary.style.display = 'block';
  this.updateBetSlipSummary();
};

BetBySports.prototype.updateBetSlipSummary = function() {
  var summary = document.getElementById('betslipSummary');
  var totalStakeEl = document.getElementById('totalStake');
  var potentialWinEl = document.getElementById('potentialWin');

  if (!summary || !totalStakeEl || !potentialWinEl) return;

  var totalStake = 0;
  var totalPotentialWin = 0;

  for (var i = 0; i < this.betSlip.length; i++) {
    var bet = this.betSlip[i];
    totalStake += bet.stake || 0;
    totalPotentialWin += (bet.stake || 0) * bet.odds;
  }

  totalStakeEl.textContent = '$' + totalStake.toFixed(2);
  potentialWinEl.textContent = '$' + totalPotentialWin.toFixed(2);
};

BetBySports.prototype.clearBetSlip = function() {
  this.betSlip = [];
  this.renderBetSlip();
  document.querySelectorAll('.odd-btn.selected').forEach(function(btn) {
    btn.classList.remove('selected');
  });
  this.showToast('Купон очищен', 'info');
};

// ============================================
// SUBMIT BETS
// ============================================
BetBySports.prototype.submitAllBets = function() {
  var self = this;

  // Validate bets
  var validBets = this.betSlip.filter(function(bet) { return bet.stake > 0; });
  if (validBets.length === 0) {
    this.showToast('Укажите суммы ставок!', 'error');
    return;
  }

  var totalStake = 0;
  for (var i = 0; i < validBets.length; i++) {
    totalStake += validBets[i].stake;
  }

  if (totalStake > this.balance) {
    this.showToast('Недостаточно средств!', 'error');
    return;
  }

  // Submit each bet via API
  var submitPromises = [];
  validBets.forEach(function(bet) {
    var promise = fetch(this.apiBase + '/api/sports/bets/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: bet.eventId,
        selection: bet.selection,
        odds: bet.odds,
        stake: bet.stake
      })
    }).then(function(response) { return response.json(); })
      .catch(function(err) { return null; });
    submitPromises.push(promise);
  }.bind(this));

  Promise.all(submitPromises).then(function(results) {
    // Update balance
    this.balance -= totalStake;
    this.updateBalance();

    // Add to history
    for (var i = 0; i < validBets.length; i++) {
      this.betHistory.unshift({
        event: validBets[i].event,
        selection: validBets[i].selectionLabel,
        odds: validBets[i].odds,
        stake: validBets[i].stake,
        status: 'pending',
        time: new Date().toLocaleString('ru-RU')
      });
    }

    this.renderBetHistory();
    this.clearBetSlip();
    this.showToast('Ставки приняты! Удачи! 🍀', 'success');
  }.bind(this));
};

// ============================================
// BET HISTORY
// ============================================
BetBySports.prototype.renderBetHistory = function() {
  var container = document.getElementById('betHistoryList');
  if (!container) return;

  container.innerHTML = '';

  if (this.betHistory.length === 0) {
    container.innerHTML = '<p style="color:var(--betby-text-muted);font-size:0.8rem;text-align:center;padding:1rem;">Нет истории ставок</p>';
    return;
  }

  var self = this;
  this.betHistory.slice(0, 20).forEach(function(bet) {
    var item = document.createElement('div');
    item.className = 'bet-history-item ' + bet.status;

    var resultText = '';
    var resultClass = bet.status === 'won' ? 'win' : (bet.status === 'lost' ? 'loss' : 'pending-text');

    if (bet.status === 'won') {
      resultText = '+$' + (bet.stake * bet.odds).toFixed(2);
    } else if (bet.status === 'lost') {
      resultText = '-$' + bet.stake.toFixed(2);
    } else {
      resultText = 'Ожидание';
    }

    item.innerHTML =
      '<div class="bet-history-event">' + bet.event + '</div>' +
      '<div class="bet-history-details">' +
        '<span class="bet-history-stake">' + bet.selection + ' @ ' + bet.odds.toFixed(2) + ' | Ставка: $' + bet.stake.toFixed(2) + '</span>' +
        '<span class="bet-history-result ' + resultClass + '">' + resultText + '</span>' +
      '</div>';

    container.appendChild(item);
  });
};

// ============================================
// BALANCE
// ============================================
BetBySports.prototype.updateBalance = function() {
  var el = document.getElementById('balance');
  if (el) {
    el.textContent = '$' + this.balance.toFixed(2);
  }
};

// ============================================
// TOAST NOTIFICATIONS
// ============================================
BetBySports.prototype.showToast = function(message, type) {
  type = type || 'info';
  var container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function() { toast.remove(); }, 3000);
};

// ============================================
// LEAGUE COUNTS UPDATE
// ============================================
BetBySports.prototype.updateLeagueCounts = function() {
  var items = document.querySelectorAll('.league-item');
  items.forEach(function(item) {
    var leagueId = item.dataset.league;
    var countEl = item.querySelector('.league-count');
    if (countEl && this.events.length > 0) {
      var count = leagueId ? this.events.filter(function(e) { return e.league === leagueId; }).length : this.events.length;
      countEl.textContent = count;
    }
  }.bind(this));
};

// ============================================
// INITIALIZE GAME
// ============================================
console.log('⚽ BetBy Sports - Script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOMContentLoaded fired for BetBy Sports');
  try {
    window.sportsGame = new BetBySports();
    console.log('🎮 BetBy Sports instance created successfully');
  } catch(e) {
    console.error('❌ BetBy Sports initialization error:', e);
  }
});

// Debug: check elements after 2 seconds
setTimeout(function() {
  console.log('🔍 Debug check for BetBy Sports:');
  console.log('  - sports-container:', document.querySelector('.sports-container'));
  console.log('  - eventsList:', document.getElementById('eventsList'));
  console.log('  - leagueList:', document.getElementById('leagueList'));
  console.log('  - betslipContent:', document.getElementById('betslipContent'));
  console.log('  - balance:', document.getElementById('balance'));
}, 2000);
