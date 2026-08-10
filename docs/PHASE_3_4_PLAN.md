# Phase 3.4 — Live Casino Integration Plan

## 📋 STATUS: IN PROGRESS (Started: August 9, 2026)

### Completed Phases:
- ✅ Phase 1.3 Backend (Instant Games + Live Casino API)
- ✅ Phase 2 UI Components (7 React components)
- ✅ Phase 3.1-3.3 Integration Foundation (API Service + Auth + GameRoom)

---

## 🎯 OBJECTIVES — Phase 3.4

1. Connect CasinoBrowser to live API endpoints
2. Implement real-time round updates via polling
3. Add table selection flow with dealer info
4. Test provider-specific features (lightning, VIP)
5. Performance optimization and caching

---

## 📁 FILES TO CREATE/MODIFY

### New Files:
- `components/live-casino/CasinoRoom.jsx` — Full-screen room for active table
- `components/live-casino/TableCard.jsx` — Individual table card component
- `hooks/useLiveGames.js` — Hook for live games state
- `hooks/useTablePolling.js` — Polling hook for round updates

### Modified Files:
- `components/live-casino/CasinoBrowser.jsx` — Connect to API, add loading states

---

## 📝 IMPLEMENTATION STEPS

### Step 3.4.1 — Update CasinoBrowser (Day 1 AM)
- Import apiService and load games from backend on mount
- Add loading/error states during data fetch
- Test provider filtering with real data

### Step 3.4.2 — Create CasinoRoom (Day 1 PM)
- Build full-screen room layout for active table
- Display dealer info, player count, round status
- Add bet placement interface

### Step 3.4.3 — Implement Polling (Day 2 AM)
- Create useTablePolling hook
- Poll /api/live-games/tables/:id/history every 8s
- Update UI on new round completion

### Step 3.4.4 — Test Provider Features (Day 2 PM)
- Verify lightning multipliers in blackjack/roulette
- Check VIP table configurations
- Validate game show bonus rounds

### Step 3.4.5 — Performance Optimization (Day 2 Eve)
- Add React.memo to TableCard
- Implement data caching for static configs
- Debounce rapid API calls

---

## 📊 SUCCESS CRITERIA

- [ ] CasinoBrowser loads tables from live API
- [ ] Provider filtering works with real data
- [ ] Table selection opens CasinoRoom
- [ ] Real-time round updates display correctly
- [ ] Dealer info and player count shown
- [ ] Lightning/VIP features render properly
- [ ] Loading states during API calls
- [ ] Error handling for failed requests

---

## 📅 TIMELINE

| Time | Task | Status |
|------|------|--------|
| Day 1 AM (Aug 9) | Update CasinoBrowser to API | ⏳ Starting now |
| Day 1 PM (Aug 9) | Create CasinoRoom component | ⏳ Pending |
| Day 2 AM (Aug 10) | Implement polling hook | ⏳ Pending |
| Day 2 PM (Aug 10) | Test provider features | ⏳ Pending |
| Day 2 Eve (Aug 10) | Performance optimization | ⏳ Pending |

**Estimated Completion:** August 10, 2026 evening

