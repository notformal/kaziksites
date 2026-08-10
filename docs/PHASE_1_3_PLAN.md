# Phase 1.3 — Instant Games Engine + Live Casino API

## Overview
This phase implements the remaining core game engines and extends the live casino system to support all cataloged titles.

## Current State Assessment

### ✅ Already Built
- **Slots Engine**: Math specs, procedural art, reel strips (via `npm run build:math`)
- **Table Games Engine**: Blackjack Pro, Baccarat Pro, Roulette Royale (`table-engine.js`)
- **Sound Engine**: Multi-channel audio with pitch/volume control
- **VFX Engine**: Particle systems, screen shake, flash effects
- **Landing Pages**: 3 brands (Aurora, Ember, Royale) with full CSS/JS
- **Live Games API Routes**: Basic endpoints for table management and simulation
- **Game Math Specs**: 12 slot games fully specified

### ⚠️ Needs Implementation — Instant Games
| Game ID | Features Needed | Priority |
|---------|----------------|----------|
| `crash-pro` | Auto cashout, dual bet, turbo mode, provably fair crash point | P0 |
| `lightning-dice` | Three dice totals, lightning multipliers (up to 100×), provably fair | P0 |
| `plinko-master` | Risk levels, row selection, real-time physics simulation | P0 |
| `fruit-shop` | Match-3 style mechanics, bonus rounds | P1 |
| `wheel-of-fortune` | Provably fair wheel spin mechanics | P1 |

### ⚠️ Needs Implementation — Live Casino (40+ games)
| Provider | Games Count | Priority |
|----------|-------------|----------|
| Evolution Gaming | 20 titles | P0 |
| Pragmatic Play Live | 9 titles | P0 |
| Ezugi | 6 titles | P1 |
| Vivo Gaming | 5 titles | P1 |
| Endorphina | 5 titles | P2 |

## Architecture Decisions

### Instant Games Engine Design
```
src/engine/
├── instant-engine.js      # Main orchestrator for all instant games
├── crash-engine.js        # Crash Pro implementation
├── dice-engine.js         # Lightning Dice implementation  
├── plinko-engine.js       # Plinko Master with physics
└── fruit-shop-engine.js   # Match-3 style game engine
```

### Live Casino Engine Extension
```
server/src/live-games/
├── engine.js              # Existing - extend with provider support
├── providers/
│   ├── evolution.js       # Evolution Gaming games
│   ├── pragmatic.js       # Pragmatic Play Live games
│   ├── ezugi.js           # Ezugi games
│   ├── vivo.js            # Vivo Gaming games
│   └── endorphina.js      # Endorphina games
├── tables/
│   ├── blackjack-table.js
│   ├── roulette-table.js
│   ├── baccarat-table.js
│   └── game-show-table.js
└── agents/
    └── agent-manager.js   # Existing - extend with provider-specific bots
```

## Implementation Plan

### Step 1: Instant Games Core Engine (`src/engine/instant-engine.js`)
- Game session management (balance, bets, history)
- Provably fair verification for all instant games
- Event system for game state changes
- Integration hooks for UI components

### Step 2: Crash Pro Engine (`src/engine/crash-engine.js`)
```javascript
class CrashEngine {
  generateCrashPoint(serverSeed, clientSeed, nonce): number
  placeBet(sessionId, amount, autoCashout?: number): betId
  cashOut(betId, currentMultiplier): payout
  getGameState(sessionId): gameState
}
```

### Step 3: Lightning Dice Engine (`src/engine/dice-engine.js`)
```javascript
class LightningDiceEngine {
  rollThreeDice(): {total, diceValues, lightningNumbers}
  calculatePayout(betAmount, chosenNumber, multiplier)
  applyLightningMultipliers(baseMultiplier): enhancedMultipliers
}
```

### Step 4: Plinko Master Engine (`src/engine/plinko-engine.js`)
```javascript
class PlinkoEngine {
  createBoard(rows: number, riskLevel: 'low'|'medium'|'high'): board
  dropBall(startX: number): ballTrajectory[]
  calculatePayout(multiplierBucket, betAmount)
}
```

### Step 5: Live Casino Provider Integration
- Extend existing `engine.js` with provider-specific game logic
- Implement table management for each game type
- Add agent simulation with realistic betting patterns

### Step 6: Game Page UI Components
- Create reusable game container component
- Implement crash game page with real-time multiplier graph
- Implement dice game page with lightning effects
- Implement plinko game page with physics visualization

## Testing Strategy
- Unit tests for each engine's math logic (vitest)
- Integration tests for API endpoints (server tests)
- E2E tests for game flows (Playwright)
- Provably fair verification tests

## Success Criteria
- [ ] All 5 instant games have working engines
- [ ] Live casino supports all 40+ cataloged titles
- [ ] Provably fair system verified and tested
- [ ] Game pages render correctly across all brands
- [ ] API endpoints return correct data structures
- [ ] All tests pass (vitest + Playwright)
