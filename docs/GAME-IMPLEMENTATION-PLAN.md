# KazikSites - Full Game Implementation Plan
## Status: IN PROGRESS | Last Updated: 2026-08-09

---

## PROJECT OVERVIEW

Total Games: 71
Brands: Aurora Play, Ember Club, Royale House
Providers: Self-hosted + Evolution + Pragmatic Play Live + Ezugi + Vivo Gaming + Endorphina

### Game Categories:
| Category | Count | Status |
|----------|-------|--------|
| Slots (Nova Reels) | 13 | PARTIAL - 9/13 have full specs |
| Table Games (Vertex Live) | 3 | NOT STARTED - No dedicated engine |
| Instant Games | 3 | PARTIAL - Crash OK, Plinko/Dice partial |
| Live Casino - Evolution | 12 | PARTIAL - Basic engine, needs API contracts |
| Live Casino - Pragmatic Play | 10 | NOT STARTED - Generic fallback only |
| Live Casino - Ezugi | 8 | NOT STARTED - Generic fallback only |
| Live Casino - Vivo Gaming | 5 | NOT STARTED - Generic fallback only |
| Live Casino - Endorphina | 5 | NOT STARTED - Generic fallback only |
| Themed/Platform Games | 9 | PARTIAL - Basic simulation |

---

## PHASE 1: CORE ENGINE (P0 - Critical)

### 1.1 Slot Engine - Complete All 13 Slots
Files to modify: src/game-math/specs.js
Status: IN PROGRESS

| # | Game ID | Title | Spec Status | Reel Strips | Paytable | Features |
|---|---------|-------|-------------|-------------|----------|----------|
| 1 | cosmic-queen | Cosmic Queen | DONE | MISSING | MISSING | Expanding Wild, Free Spins, Cosmic Meter |
| 2 | dragons-fortune | Dragon's Fortune | DONE | MISSING | MISSING | Fortune Meter, Multiplier Trail |
| 3 | pharaohs-treasure | Pharaoh's Treasure | DONE | MISSING | MISSING | Expanding Symbol, Gamble |
| 4 | slots-royal | Slots Royal | DONE | MISSING | MISSING | Progressive Jackpot |
| 5 | book-of-gold | Book of Gold | DONE | MISSING | MISSING | Expanding Symbol, Retrigger |
| 6 | gold-caravan | Gold Caravan | DONE | MISSING | MISSING | Pick and Win Bonus |
| 7 | magic-crystal | Magic Crystal | DONE | MISSING | MISSING | Wheel Bonus, Random Multiplier |
| 8 | hot-navigator | Hot Navigator | DONE | MISSING | MISSING | Direction Bonus |
| 9 | diamond-rush | Diamond Rush | DONE | MISSING | MISSING | Cascading Reels, Multiplier Ladder |
| 10 | wild-west-gold | Wild West Gold | MISSING | MISSING | MISSING | Sticky Wild, Multiplier Wild |
| 11 | super-line-fruit-bomb | Super Line: Fruit Bomb | MISSING | MISSING | MISSING | Bomb Wild |
| 12 | lucky-streak | Lucky Streak | MISSING | MISSING | MISSING | Streak Meter |
| 13 | fruit-shop | Fruit Market | DONE | MISSING | MISSING | Sticky Wild, Gamble |

Deliverables:
- [ ] Add game-math specs for games #10, #11, #12 (wild-west-gold, super-line-fruit-bomb, lucky-streak)
- [ ] Build reel strip generator using spec data
- [ ] Build paytable calculator per spec tuning parameters
- [ ] Implement feature triggers (expanding wild, free spins, etc.) per spec

### 1.2 Table Games Engine - Dedicated for BJ/Baccarat/Roulette
Files to create: src/engine/table-engine.js
Status: NOT STARTED

| # | Game ID | Title | Engine Status | Rules | Side Bets | Roadmaps |
|---|---------|-------|---------------|-------|-----------|----------|
| 1 | blackjack-pro | Blackjack Pro | GENERIC | 6-deck, S17, 3:2 BJ | Perfect Pairs, 21+3 | Running count |
| 2 | baccarat-pro | Baccarat Pro | GENERIC | 8-deck, 5% commission | Player/Banker/Tie | Bead plate, Big road |
| 3 | roulette-royale | Roulette Royale | GENERIC | European single-zero | Inside/Outside, Racetrack | Hot/Cold numbers |

Deliverables:
- [ ] Create src/engine/table-engine.js with full card shoe simulation
- [ ] Implement Blackjack: hit/stand/double/split/insurance, Perfect Pairs, 21+3 side bets
- [ ] Implement Baccarat: third-card rule, banker commission, roadmaps
- [ ] Implement Roulette: European wheel, racetrack bets, hot/cold stats
- [ ] Wire into game-gateway.js router

### 1.3 Instant Games Engine - Full Mechanics
Files to modify: server/src/casino-engine.js
Status: PARTIAL

| # | Game ID | Title | Current Status | Needed Work |
|---|---------|-------|---------------|-------------|
| 1 | crash-pro | Crash Pro | WORKING | Provably fair crash curve, cashout logic |
| 2 | plinko-master | Plinko Master | FALLBACK | Gravity physics, multiplier zones, ball trajectory |
| 3 | lightning-dice | Lightning Dice | FALLBACK | 3-dice roll, lightning multipliers, side bets |

Deliverables:
- [ ] Implement plinko physics engine (gravity, peg bouncing, zone Multipliers)
- [ ] Implement dice probability math with lightning multipliers
- [ ] Wire into game-gateway.js router

---

## PHASE 2: LIVE CASINO API CONTRACTS (P0 - Critical for Integration)

### 2.1 Provider API Specifications
Files to create: src/api/live-providers/
Status: NOT STARTED

Each provider needs a full API contract document + implementation:

#### Evolution Gaming (12 games)
| Game ID | Title | API Contract Status | Real-time Data |
|---------|-------|---------------------|----------------|
| lightning-blackjack | Lightning Blackjack | MISSING | Multipliers 2x-100x |
| mega-roulette | Mega Roulette | MISSING | Progressive jackpot |
| speed-baccarat | Speed Baccarat | MISSING | 15s rounds, no commission |
| crazy-time | Crazy Time | MISSING | 4 bonus rounds |
| monopoly-live | Monopoly Live | MISSING | Money wheel + bonus |
| dream-catcher | Dream Catcher | MISSING | Wheel multiplier |
| lightning-roulette | Lightning Roulette | MISSING | Lucky numbers 2x-500x |
| infinite-blackjack | Infinite Blackjack | MISSING | Unlimited seats |
| auto-roulette | Auto Roulette | MISSING | RNG-based wheel |
| casino-holdem | Casino Holdem | MISSING | Ante/play, jackpot |
| three-card-poker | Three Card Poker | MISSING | Pair plus, progressive |
| power-blackjack | Power Blackjack | MISSING | Double exposure |

#### Pragmatic Play Live (10 games)
| Game ID | Title | API Contract Status |
|---------|-------|---------------------|
| pragmatic-lightning-baccarat | Lightning Baccarat | MISSING |
| pragmatic-speed-roulette | Speed Roulette | MISSING |
| pragmatic-auto-roulette | Auto Roulette | MISSING |
| pragmatic-blackjack-vip | Blackjack VIP | MISSING |
| pragmatic-standard-blackjack | Standard BJ | MISSING |
| pragmatic-super-sic-bo | Super Sic Bo | MISSING |
| pragmatic-lucky-6-baccarat | Lucky 6 Baccarat | MISSING |
| pragmatic-dragon-tiger-pro | Dragon Tiger Pro | MISSING |
| pragmatic-cash-or-crash | Cash or Crash | MISSING |
| pragmatic-wheel-fortune | Wheel of Fortune | MISSING |

#### Ezugi (8 games)
| Game ID | Title | API Contract Status |
|---------|-------|---------------------|
| ezugi-lightning-sic-bo | Lightning Sic Bo | MISSING |
| ezugi-speed-baccarat | Speed Baccarat | MISSING |
| ezugi-asian-blackjack | Asian Blackjack | MISSING |
| ezugi-auto-roulette | Auto Roulette | MISSING |
| ezugi-super-and-bachet | Super And Bachet | MISSING |
| ezugi-casino-stud-poker | Casino Stud Poker | MISSING |
| ezugi-no-commission-baccarat | No Commission Baccarat | MISSING |
| ezugi-fast-play-roulette | Fast Play Roulette | MISSING |

#### Vivo Gaming (5 games)
| Game ID | Title | API Contract Status |
|---------|-------|---------------------|
| vivo-blackjack | Blackjack | MISSING |
| vivo-roulette | Roulette | MISSING |
| vivo-baccarat | Baccarat | MISSING |
| vivo-casino-poker | Casino Poker | MISSING |
| vivo-sic-bo | Sic Bo | MISSING |

#### Endorphina Live (5 games)
| Game ID | Title | API Contract Status |
|---------|-------|---------------------|
| endorphina-live-poker | Live Poker | MISSING |
| endorphina-lightning-dice | Lightning Dice | MISSING |
| endorphina-speed-roulette | Speed Roulette | MISSING |
| endorphina-baccarat-gold | Baccarat Gold | MISSING |
| endorphina-blackjack-vip | Blackjack VIP | MISSING |

Deliverables per provider:
- [ ] API contract JSON (request/response schemas)
- [ ] WebSocket protocol for real-time game state
- [ ] Dealer assignment logic
- [ ] Bot agent behavior per game type
- [ ] Integration tests

---

## PHASE 3: DESIGN AND UI (P1 - Visual Polish)

### 3.1 Game Page Designs
Files to modify: public/games/*/index.html + CSS
Status: ALL GENERIC - All 70 game pages use same minimal template.

Each page needs:
- [ ] Unique hero background matching game theme
- [ ] Custom control panel (spin/bet/cashout buttons styled per game)
- [ ] Game-specific animations (reel spin, card deal, wheel rotate, crash graph)
- [ ] Win celebration effects (particles, confetti, screen shake for big wins)
- [ ] Sound engine integration placeholders

Priority order (by popularity in catalog):
1. cosmic-queen (featured + popular)
2. slots-royal (featured + popular)
3. blackjack-pro (featured + popular)
4. roulette-royale (featured + popular)
5. dragons-fortune (popular)
6. diamond-rush (popular + new)
7. book-of-gold (popular + new)
8. crazy-time (featured + new, live)
9. mega-roulette (featured + new, live)
10. crash-pro (instant, popular)

### 3.2 Brand-Specific Design Overrides
Files to modify: src/themes.js + CSS variables
Status: PARTIAL - colors defined but not fully applied per-brand across all pages

- [ ] Aurora: Green/cyan gradient theme fully applied to game pages
- [ ] Ember: Red/orange fire theme with aggressive animations
- [ ] Royale: Gold/green luxury theme with serif typography

### 3.3 Mobile Responsive Design
Status: PARTIAL - basic breakpoints exist but need polish
- [ ] Game card grid: 6-to-4-to-2 columns (done)
- [ ] Live players widget: responsive positioning
- [ ] Game page controls: touch-friendly sizing

---

## PHASE 4: BOT INTEGRATION AND QA (P0 - Verification)

### 4.1 Bot Simulation Enhancement
Files to modify: server/src/bots/index.js, server/src/live-games/engine.js
Status: PARTIAL - bots exist but need game-specific behavior

| Enhancement | Status | Description |
|-------------|--------|-------------|
| Game-specific betting patterns | MISSING | Each game has different min/max bet ranges |
| Emotional state machine | DONE | happy/cautious/excited/tired/greedy moods |
| Session duration per game type | PARTIAL | Slots=longer, Live=medium, Instant=shorter |
| Win/loss reaction animations | MISSING | Bot chat messages on big wins/losses |
| Multi-game switching logic | DONE | Bots switch between 1-3 favorite games |

### 4.2 QA Verification - Visual Checks (as specialists at computers)
Files to create: test/playwright/tests/game-qa/*.spec.js
Status: NOT STARTED

For each of the 71 games, verify visually:
- [ ] Game page loads without JS errors
- [ ] Cover art renders correctly (or fallback glyph shows)
- [ ] RTP badge displays correct value from catalog
- [ ] Volatility dots match volatility setting
- [ ] Studio tag shows correct studio name on hover
- [ ] Play button triggers game start flow
- [ ] Favorite button toggles correctly
- [ ] Mobile responsive layout works

### 4.3 QA Verification - API Contract Tests
Status: NOT STARTED

For each game's API endpoint:
- [ ] GET /api/gw/:gameId/info returns correct metadata
- [ ] POST /api/gw/:gameId/session creates valid session
- [ ] POST /api/gw/:gameId/round processes round correctly
- [ ] Wallet updates reflect bet/win correctly
- [ ] Provably fair verification works (for non-live games)
- [ ] Error handling returns proper error codes

### 4.4 QA Verification - Bot Integration Tests
Status: NOT STARTED

- [ ] /api/bots/live returns bots playing correct game types
- [ ] Bot names are brand-appropriate (Aurora/Ember/Royale)
- [ ] Bot avatars match brand palette
- [ ] Bot bet amounts within game-specific min/max ranges
- [ ] Live players widget displays correctly on frontend
- [ ] Auto-refresh every 5 seconds works

---

## EXECUTION TRACKER

### Status Legend:
- DONE - Fully implemented and tested
- PARTIAL - Partially done, needs work
- NOT STARTED - Not yet begun
- IN PROGRESS - Currently being worked on

### Priority Matrix:
| Priority | Criteria | Actions |
|----------|----------|---------|
| P0 Critical | Blocks integration or core gameplay | Slot specs, Table engine, Live API contracts, Bot QA |
| P1 High | Major UX impact | Game page designs, Brand overrides, Mobile polish |
| P2 Medium | Nice to have | Sound effects, Advanced animations, Leaderboards |

---

## COMMIT HISTORY REFERENCE

- 4a8ce1f - feat: Game Gateway API for all 71 games + LivePlayers widget + premium GameCard design
- c00986c - Refactor code structure for improved readability and maintainability

---

*This plan will be updated as work progresses. Each section tracks individual game/item status.*
