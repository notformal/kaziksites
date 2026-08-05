const BASE = 'http://127.0.0.1:8787';

async function test() {
  console.log('=== Live Games API Test ===\n');

  // 1. Check status
  console.log('1. GET /api/live-games/status');
  const status = await fetch(`${BASE}/api/live-games/status`).then(r => r.json());
  console.log(JSON.stringify(status, null, 2));


  // 2. Create Blackjack table
  console.log('\n2. POST /api/live-games/create (type=blackjack)');
  const createBody = JSON.stringify({
    type: 'blackjack',
    tableName: 'Main Blackjack Table',
    minBet: 5,
    maxBet: 500
  });
  const createRes = await fetch(`${BASE}/api/live-games/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: createBody
  });
  const created = await createRes.json();
  console.log(JSON.stringify(created, null, 2));

  if (created.tableId) {
    // 3. Check tables
    console.log('\n3. GET /api/live-games/tables');
    const tables = await fetch(`${BASE}/api/live-games/tables`).then(r => r.json());
    console.log(JSON.stringify(tables, null, 2));

    // 4. Check status again (should show 1 table)
    console.log('\n4. GET /api/live-games/status (after create)');
    const status2 = await fetch(`${BASE}/api/live-games/status`).then(r => r.json());
    console.log(JSON.stringify(status2, null, 2));

    // 5. Start blackjack round
    console.log('\n5. POST /api/live-games/blackjack/start');
    const startRes = await fetch(`${BASE}/api/live-games/blackjack/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: created.tableId })
    });
    const started = await startRes.json();
    console.log(JSON.stringify(started, null, 2));

    // 6. Place a bet
    console.log('\n6. POST /api/live-games/blackjack/deal (with bet)');
    const dealRes = await fetch(`${BASE}/api/live-games/blackjack/deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: created.tableId })
    });
    const dealt = await dealRes.json();
    console.log(JSON.stringify(dealt, null, 2));

    // 7. Check history
    console.log('\n7. GET /api/live-games/blackjack/history');
    const history = await fetch(`${BASE}/api/live-games/blackjack/history`).then(r => r.json());
    console.log(JSON.stringify(history, null, 2));
  }


  // 8. Create Roulette table
  console.log('\n8. POST /api/live-games/create (type=roulette)');
  const rouletteRes = await fetch(`${BASE}/api/live-games/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'roulette', tableName: 'Lightning Roulette', minBet: 10, maxBet: 1000 })
  });
  const roulette = await rouletteRes.json();
  console.log(JSON.stringify(roulette, null, 2));

  if (roulette.tableId) {
    // 9. Spin roulette
    console.log('\n9. POST /api/live-games/roulette/spin');
    const spinRes = await fetch(`${BASE}/api/live-games/roulette/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: roulette.tableId })
    });
    const spin = await spinRes.json();
    console.log(JSON.stringify(spin, null, 2));

    // 10. Get roulette history
    console.log('\n10. GET /api/live-games/roulette/history');
    const rHistory = await fetch(`${BASE}/api/live-games/roulette/history`).then(r => r.json());
    console.log(JSON.stringify(rHistory, null, 2));

    // 11. Get roulette stats
    console.log('\n11. GET /api/live-games/roulette/stats');
    const rStats = await fetch(`${BASE}/api/live-games/roulette/stats`).then(r => r.json());
    console.log(JSON.stringify(rStats, null, 2));
  }


  // 12. Create Baccarat table
  console.log('\n12. POST /api/live-games/create (type=baccarat)');
  const baccaratRes = await fetch(`${BASE}/api/live-games/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'baccarat', tableName: 'Speed Baccarat', minBet: 10, maxBet: 2500 })
  });
  const baccarat = await baccaratRes.json();
  console.log(JSON.stringify(baccarat, null, 2));

  if (baccarat.tableId) {
    // 13. Play baccarat round
    console.log('\n13. POST /api/live-games/baccarat/play');
    const playRes = await fetch(`${BASE}/api/live-games/baccarat/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: baccarat.tableId,
        bets: [
          { betType: 'player', amount: 100 },
          { betType: 'banker', amount: 100 }
        ]
      })
    });
    const play = await playRes.json();
    console.log(JSON.stringify(play, null, 2));
  }


  // 14. Create Game Show table
  console.log('\n14. POST /api/live-games/create (type=gameshow)');
  const gsRes = await fetch(`${BASE}/api/live-games/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'gameshow', tableName: 'Fortune Wheel', minBet: 1, maxBet: 100 })
  });
  const gs = await gsRes.json();
  console.log(JSON.stringify(gs, null, 2));

  if (gs.tableId) {
    // 15. Spin game show wheel
    console.log('\n15. POST /api/live-games/gameshow/spin');
    const spinRes = await fetch(`${BASE}/api/live-games/gameshow/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId: gs.tableId, betAmount: 10 })
    });
    const spin = await spinRes.json();
    console.log(JSON.stringify(spin, null, 2));
  }

  // Final status
  console.log('\n=== Final Status ===');
  const finalStatus = await fetch(`${BASE}/api/live-games/status`).then(r => r.json());
  console.log(JSON.stringify(finalStatus, null, 2));

  console.log('\n✅ All tests completed!');
}

test().catch(e => console.error('Error:', e.message));