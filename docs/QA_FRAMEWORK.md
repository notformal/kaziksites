# 🛡️ Project QA Framework — Multi-Role Validation System

## 📋 Overview

This framework defines validation checkpoints across 4 roles for every development branch. Each checkpoint must pass before merging.

---

## 🔧 Role 1: Engineering QA (Architecture & Code Quality)

### Checklist
- [ ] **Code Structure**: All files < 300 lines, functions < 30 lines
- [ ] **Naming Conventions**: camelCase (variables/functions), PascalCase (classes/components), UPPER_SNAKE (constants)
- [ ] **Security**: No hardcoded secrets, input validation on all user inputs, bet validation, balance protection
- [ ] **Performance**: No memory leaks, proper cleanup on unmount, requestAnimationFrame properly managed
- [ ] **Type Safety**: All exports documented with JSDoc, no `any` types
- [ ] **Dependencies**: Only PIXI.js (v8+) for games, zero other runtime dependencies
- [ ] **Game Engine**: All games use PIXI.js application, sprites, containers, ticker
- [ ] **RTP Accuracy**: Theoretical RTP matches documented RTP within ±2%
- [ ] **Anti-Cheat**: Server-side verification patterns documented (for real-money readiness)

### Gates
- **G1**: Code must score ≥ 90/100 on quality matrix
- **G2**: All security checks must pass (0 critical, 0 high)
- **G3**: All games must use PIXI.js rendering

---

## 👨‍💻 Role 2: Developer QA (Functionality & Logic)

### Checklist
- [ ] **Game Logic**: All game rules implemented correctly per specification
- [ ] **RNG Quality**: Seeded RNG passes basic statistical tests (distribution uniformity)
- [ ] **Bet Validation**: Min/max bets enforced, balance checks before every action
- [ ] **Win Calculation**: All payout formulas verified against spec
- [ ] **State Management**: No state mutations without proper immutability
- [ ] **Error Handling**: All async operations have try/catch, no unhandled promises
- [ ] **Edge Cases**: Zero balance, max bet, rapid clicks all handled gracefully
- [ ] **Persistence**: High scores, balance saved/restored correctly

### Gates
- **G4**: All game mechanics tested with ≥ 100 spins/hands
- **G5**: RTP converges to theoretical within ±5% after 1000 rounds
- **G6**: Zero unhandled exceptions in console

---

## 🎨 Role 3: Design QA (UI/UX & Visual)

### Checklist
- [ ] **Visual Consistency**: All games follow project design system (colors, typography, spacing)
- [ ] **Responsive Design**: Works at 320px, 768px, 1024px, 1920px widths
- [ ] **Animation Quality**: All animations use requestAnimationFrame, no jank at 60fps
- [ ] **Accessibility**: 
  - [ ] Keyboard navigation (Tab, Enter, Space, Escape)
  - [ ] ARIA labels on all interactive elements
  - [ ] Focus indicators visible
  - [ ] Color contrast WCAG AA (4.5:1)
  - [ ] prefers-reduced-motion respected
- [ ] **Mobile Experience**: Touch targets ≥ 44px, no hover-only states, D-pad for mobile
- [ ] **Dark Theme**: All games use dark theme, no white backgrounds
- [ ] **Loading States**: All async operations show loading indicator
- [ ] **Win Feedback**: Clear visual feedback for wins/losses with animation

### Gates
- **G7**: Lighthouse accessibility ≥ 90
- **G8**: Lighthouse performance ≥ 80 (mobile)
- **G9**: Zero layout shifts during gameplay
- **G10**: All animations respect prefers-reduced-motion

---

## 🖥️ Role 4: Browser QA (End-to-End Testing)

### Checklist
- [ ] **Game Launch**: All 17 games launch from catalog without errors
- [ ] **Game Play**: Each game fully playable for ≥ 10 rounds
- [ ] **Balance Flow**: Balance updates correctly across all games
- [ ] **Navigation**: Back from game → catalog works correctly
- [ ] **Cross-Browser**: Tested on Chrome, Firefox, Safari, Edge
- [ ] **Mobile Browser**: iOS Safari and Android Chrome tested
- [ ] **Performance**: 60fps during gameplay on mid-range device
- [ ] **Memory**: No memory leaks after 50 game sessions
- [ ] **Network**: No failed network requests, no CORS errors
- [ ] **Storage**: localStorage read/write works correctly

### Gates
- **G11**: All games pass manual playtest (10+ rounds each)
- **G12**: Zero console errors during normal gameplay
- **G13**: Balance correctly tracks across all games
- **G14**: Cross-browser compatibility verified

---

## 🔄 Validation Pipeline

```
Code Commit → Engineering QA → Developer QA → Design QA → Browser QA → Merge
     ↓              ↓                ↓             ↓             ↓
   G1, G2, G3   G4, G5, G6     G7-G10       G11-G14      Merge
```

### Automated Checks
```bash
# Run all checks
npm run qa:check

# Individual checks
npm run qa:engineering    # Code quality, security
npm run qa:developer      # Game logic, RTP
npm run qa:design         # Accessibility, responsive
npm run qa:browser        # Playtest, cross-browser
```

### Manual Checkmarks
Each PR must have all gates marked ✓ by at least one reviewer per role.

---

## 📊 Quality Matrix Scoring

| Category | Weight | Score (0-100) | Weighted |
|----------|--------|---------------|----------|
| Architecture | 20% | | |
| Code Quality | 20% | | |
| Security | 15% | | |
| Performance | 10% | | |
| Accessibility | 10% | | |
| Design | 10% | | |
| Testing | 10% | | |
| **Total** | **100%** | | **≥ 90** |

---

## 🎮 PIXI.js Migration Checklist

Every game must be migrated from raw Canvas API to PIXI.js:

- [ ] PIXI.Application initialized properly
- [ ] All rendering via PIXI.Graphics, PIXI.Sprite, PIXI.Text
- [ ] PIXI.Ticker used for game loop (not requestAnimationFrame directly)
- [ ] Proper container hierarchy (PIXI.Container)
- [ ] Event listeners via PIXI.js (interactive, pointerdown, etc.)
- [ ] Responsive resize handling
- [ ] DPR (device pixel ratio) support
- [ ] No raw canvas context usage (ctx.fillStyle, ctx.fillRect, etc.)
- [ ] PIXI.TilingSprite for repeating backgrounds
- [ ] PIXI.Filter for effects (glow, blur, etc.)

### Migration Benefits
- **Performance**: GPU-accelerated rendering
- **Consistency**: Unified rendering API across all games
- **Maintainability**: Shared utilities, components, effects
- **Cross-platform**: Better mobile support via WebGL fallback
- **Ecosystem**: Access to PIXI.js plugins (particles, tweening, etc.)

---

## 📝 Game-Specific Checklists

### Slots Games
- [ ] Seeded RNG (mulberry32 or similar)
- [ ] Symbol weight system working
- [ ] Payline evaluation correct for all line patterns
- [ ] Free spins trigger on correct scatter count
- [ ] Bonus game state machine correct
- [ ] RTP matches theoretical within ±2%

### Crash Games
- [ ] Provably fair algorithm (HMAC-SHA256)
- [ ] Crash point calculation correct
- [ ] Auto-cashout at correct multiplier
- [ ] Manual cashout at exact frame
- [ ] Graph rendering smooth at 60fps
- [ ] Server seed verifiable

### Plinko
- [ ] Physics constants (gravity, friction, bounce) tuned
- [ ] Peg collision detection accurate
- [ ] Ball trajectory deterministic with same seed
- [ ] Bucket multipliers correct
- [ ] Risk levels produce correct variance

### Card Games (Blackjack, Baccarat)
- [ ] Deck shuffling (Fisher-Yates) correct
- [ ] Hand evaluation per official rules
- [ ] Third card rules exactly per specification
- [ ] Payout formulas verified
- [ ] Card rendering via PIXI.js
- [ ] Animation smooth at 60fps

### Roulette
- [ ] Wheel spin animation smooth
- [ ] Ball landing position correct
- [ ] All bet types evaluated correctly
- [ ] Payout multipliers verified
- [ ] History tracking accurate

---

## 🚀 Pre-Launch Checklist

- [ ] All 17 games pass all 14 gates
- [ ] All games use PIXI.js rendering
- [ ] Security audit complete (0 critical, 0 high)
- [ ] RTP verified for all casino games
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)
- [ ] Mobile tested (iOS Safari, Android Chrome)
- [ ] Accessibility audit ≥ 90
- [ ] Performance audit ≥ 80 (mobile)
- [ ] All documentation updated
- [ ] License credits verified for all assets