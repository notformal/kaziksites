# Phase 2 — UI Components Development Plan

## 📋 OVERVIEW
**Start Date:** August 9, 2026  
**Status:** IN PROGRESS  
**Goal:** Build React components for all game types with provider branding

---

## 🎯 PHASE 2 OBJECTIVES

### Primary Goals:
1. ✅ Create reusable Game Container component (shared layout)
2. ✅ Implement Crash Pro game page with real-time multiplier graph
3. ✅ Implement Lightning Dice game page with lightning effects
4. ✅ Implement Plinko Master game page with physics visualization
5. ✅ Build Live Casino table browser interface
6. ✅ Add provider-branded styling system

### Secondary Goals:
- Responsive design (mobile-first)
- Accessibility compliance (WCAG 2.1 AA)
- Performance optimization (< 100ms render time)
- i18n support for all UI strings

---

## 📁 COMPONENT ARCHITECTURE

```
src/components/
├── game/
│   ├── GameContainer.jsx          # Shared layout wrapper
│   ├── GameHeader.jsx             # Title, balance, settings
│   ├── GameFooter.jsx             # Bet controls, history
│   └── GameCanvas.jsx             # PIXI.js canvas wrapper
│
├── instant-games/
│   ├── crash/
│   │   ├── CrashGame.jsx          # Main crash game component
│   │   ├── CrashGraph.jsx         # Multiplier graph visualization
│   │   └── CrashBetsPanel.jsx     # Active bets display
│   │
│   ├── dice/
│   │   ├── DiceGame.jsx           # Main dice game component
│   │   ├── DiceBoard.jsx          # Number selection board
│   │   └── LightningEffects.jsx   # Lightning animation overlay
│   │
│   └── plinko/
│       ├── PlinkoGame.jsx         # Main plinko game component
│       ├── PlinkoBoard.jsx        # Physics-based ball drop
│       └── RiskSelector.jsx       # Risk level picker
│
├── live-casino/
│   ├── CasinoBrowser.jsx          # Table browser grid
│   ├── CasinoTableCard.jsx        # Individual table card
│   ├── CasinoRoom.jsx             # Game room interface
│   └── DealerInfo.jsx             # Dealer details panel
│
└── shared/
    ├── BetInput.jsx               # Reusable bet amount input
    ├── ChipSelector.jsx           # Chip denomination selector
    ├── HistoryPanel.jsx           # Recent results display
    └── LoadingSpinner.jsx         # Universal loading state
```

---

## 🎨 DESIGN SYSTEM

### Color Palette (per provider):
| Provider | Primary | Secondary | Accent |
|----------|---------|-----------|--------|
| Evolution | #1a1a2e | #16213e | #0f3460 |
| Pragmatic | #ff6b35 | #f7931e | #ffd23f |
| Ezugi | #2d4059 | #ea5455 | #f07b3f |
| Vivo | #0c2461 | #1e3799 | #4a69bd |
| Endorphina | #6c5ce7 | #a29bfe | #fd79a8 |

### Typography:
- Headings: 'Space Grotesk', sans-serif (matches landing pages)
- Body: 'Inter', system-ui, sans-serif
- Numbers/Monospace: 'JetBrains Mono', monospace (for multipliers, balances)

---

## 📝 IMPLEMENTATION PHASES

### Phase 2.1 — Foundation (Day 1-2)
- [ ] Create GameContainer component with responsive layout
- [ ] Implement GameHeader with balance display and settings
- [ ] Build BetInput and ChipSelector shared components
- [ ] Set up PIXI.js canvas wrapper for game rendering

### Phase 2.2 — Crash Pro (Day 3-4)
- [ ] Create CrashGame main component
- [ ] Implement CrashGraph with real-time multiplier line
- [ ] Add CrashBetsPanel for active bets display
- [ ] Integrate with crash-engine.js backend

### Phase 2.3 — Lightning Dice (Day 5-6)
- [ ] Create DiceGame main component
- [ ] Build DiceBoard with number selection grid
- [ ] Implement LightningEffects animation overlay
- [ ] Connect to dice-engine.js backend

### Phase 2.4 — Plinko Master (Day 7-8)
- [ ] Create PlinkoGame main component
- [ ] Build PlinkoBoard with physics simulation visualization
- [ ] Add RiskSelector for low/medium/high settings
- [ ] Integrate with plinko-engine.js backend

### Phase 2.5 — Live Casino (Day 9-10)
- [ ] Create CasinoBrowser grid layout
- [ ] Build CasinoTableCard with provider branding
- [ ] Implement CasinoRoom interface for active games
- [ ] Add DealerInfo panel with dealer details

### Phase 2.6 — Polish & Testing (Day 11-12)
- [ ] Responsive design adjustments
- [ ] Accessibility audit and fixes
- [ ] Performance optimization
- [ ] Cross-browser testing

---

## 🔧 TECHNICAL REQUIREMENTS

### Dependencies:
- pixi.js ^8.19.0 (already in package.json)
- lucide-react (already installed for icons)
- framer-motion (for animations — to be added)

### State Management:
- React hooks (useState, useEffect, useCallback)
- Custom hooks for game engine integration
- Context API for global state (balance, user info)

### Performance Targets:
- Initial load: < 2 seconds
- Component render: < 100ms
- Animation frame rate: 60 FPS
- Bundle size increase: < 50KB gzipped per game

---

## 📊 SUCCESS CRITERIA

- [ ] All 3 instant games have fully functional UI components
- [ ] Live Casino browser displays all 47 cataloged games
- [ ] Components are responsive (mobile, tablet, desktop)
- [ ] Accessibility score: WCAG 2.1 AA compliant
- [ ] Performance metrics met (load time, render time, FPS)
- [ ] Cross-browser tested (Chrome, Firefox, Safari, Edge)

---

## 📅 TIMELINE ESTIMATE

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| 2.1 Foundation | 2 days | GameContainer, shared components |
| 2.2 Crash Pro | 2 days | Complete crash game UI |
| 2.3 Lightning Dice | 2 days | Complete dice game UI |
| 2.4 Plinko Master | 2 days | Complete plinko game UI |
| 2.5 Live Casino | 2 days | Browser + room interfaces |
| 2.6 Polish & Testing | 2 days | Final QA, optimizations |
| **TOTAL** | **12 days** | **Complete Phase 2 deliverables** |

---

## 🚀 STARTING NOW — Phase 2.1: Foundation

Let's begin with the foundation components that all games will share.

