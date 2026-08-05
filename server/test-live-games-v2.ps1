# Test script for Live Games API v2 - Fixed
$baseUrl = "http://127.0.0.1:8787"

Write-Host "`n=== Live Games API Test v2 ===" -ForegroundColor Cyan

# Test 1: Status
Write-Host "`n[1] Testing /api/live-games/status ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/status" -UseBasicParsing
    $status = $response.Json
    Write-Host "✅ Status: running, Tables: $($status.totalTables)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 2: Create Blackjack Table
Write-Host "`n[2] Creating Blackjack table ..." -ForegroundColor Yellow
$body = @{
    type = "blackjack"
    minBet = 0.5
    maxBet = 100
    name = "Evolution Lightning Blackjack"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $tableData = $response.Json
    Write-Host "✅ Table created: $($tableData.tableId)" -ForegroundColor Green
    $blackjackTableId = $tableData.tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $blackjackTableId = $null
}

# Test 3: Deal Blackjack
if ($blackjackTableId) {
    Write-Host "`n[3] Dealing blackjack ..." -ForegroundColor Yellow
    $body2 = @{ tableId = $blackjackTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/blackjack/deal" -Method POST -Body $body2 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Blackjack dealt!" -ForegroundColor Green
        Write-Host "   Player hand count: $($result.playerHand.Count)" -ForegroundColor Gray
        Write-Host "   Dealer up: $($result.dealerUp.rank)$($result.dealerUp.suit)" -ForegroundColor Gray
        Write-Host "   Results: $($result.results.Count) hands" -ForegroundColor Gray
        Write-Host "   Bots online: $($result.botsOnline)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 4: Create Roulette Table
Write-Host "`n[4] Creating Roulette table ..." -ForegroundColor Yellow
$rouletteBody = @{
    type = "roulette"
    minBet = 1
    maxBet = 5000
    name = "Evolution Lightning Roulette"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $rouletteBody -ContentType "application/json" -UseBasicParsing
    $tableData = $response.Json
    Write-Host "✅ Roulette table: $($tableData.tableId)" -ForegroundColor Green
    $rouletteTableId = $tableData.tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $rouletteTableId = $null
}

# Test 5: Spin Roulette
if ($rouletteTableId) {
    Write-Host "`n[5] Spinning roulette ..." -ForegroundColor Yellow
    $body3 = @{ tableId = $rouletteTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/roulette/spin" -Method POST -Body $body3 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Roulette spun!" -ForegroundColor Green
        Write-Host "   Number: $($result.number) ($($result.color))" -ForegroundColor Gray
        if ($result.lightningNumbers -and $result.lightningNumbers.Count -gt 0) {
            Write-Host "   Lightning numbers: $($result.lightningNumbers -join ', ')" -ForegroundColor Gray
        } else {
            Write-Host "   No lightning numbers this spin" -ForegroundColor Gray
        }
        Write-Host "   Bots online: $($result.botsOnline)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 6: Create Baccarat Table
Write-Host "`n[6] Creating Baccarat table ..." -ForegroundColor Yellow
$baccaratBody = @{
    type = "baccarat"
    minBet = 1
    maxBet = 5000
    name = "Evolution Speed Baccarat"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $baccaratBody -ContentType "application/json" -UseBasicParsing
    $tableData = $response.Json
    Write-Host "✅ Baccarat table: $($tableData.tableId)" -ForegroundColor Green
    $baccaratTableId = $tableData.tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $baccaratTableId = $null
}

# Test 7: Play Baccarat
if ($baccaratTableId) {
    Write-Host "`n[7] Playing baccarat ..." -ForegroundColor Yellow
    $body4 = @{ tableId = $baccaratTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/baccarat/play" -Method POST -Body $body4 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Baccarat dealt!" -ForegroundColor Green
        Write-Host "   Player value: $($result.playerValue)" -ForegroundColor Gray
        Write-Host "   Banker value: $($result.bankerValue)" -ForegroundColor Gray
        Write-Host "   Winner: $($result.result)" -ForegroundColor Gray
        Write-Host "   Lightning multiplier: $($result.lightningMultiplier)x" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 8: Create Crazy Time Table & Play
Write-Host "`n[8] Creating Crazy Time table ..." -ForegroundColor Yellow
$gameShowBody = @{
    gameId = "crazy-time-main"
    gameType = "crazy-time"
    minBet = 0.5
    maxBet = 1000
    name = "Evolution Crazy Time"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $gameShowBody -ContentType "application/json" -UseBasicParsing
    $tableData = $response.Json
    Write-Host "✅ Crazy Time table: $($tableData.tableId)" -ForegroundColor Green
    $crazyTimeTableId = $tableData.tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $crazyTimeTableId = $null
}

# Test 9: Play Crazy Time (using tableId directly)
if ($crazyTimeTableId) {
    Write-Host "`n[9] Playing Crazy Time ..." -ForegroundColor Yellow
    $body5 = @{ tableId = $crazyTimeTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/tables/$crazyTimeTableId/start" -Method POST -Body $body5 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Crazy Time played!" -ForegroundColor Green
        if ($result.mainMultiplier) {
            Write-Host "   Main multiplier: $($result.mainMultiplier)x" -ForegroundColor Gray
        } elseif ($result.bonusRound) {
            Write-Host "   Bonus round: $($result.bonusRound.type)" -ForegroundColor Gray
        } else {
            Write-Host "   Result received (check history)" -ForegroundColor Gray
        }
        Write-Host "   Bots online: $($result.botsOnline)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 10: Get Tables List
Write-Host "`n[10] Getting all tables ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/tables" -UseBasicParsing
    $tables = $response.Json
    Write-Host "✅ Total tables: $($tables.tables.Count)" -ForegroundColor Green
    foreach ($t in $tables.tables) {
        Write-Host "   - $($t.name) ($($t.type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 11: Get Providers
Write-Host "`n[11] Getting providers ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/providers" -UseBasicParsing
    $providers = $response.Json
    Write-Host "✅ Providers:" -ForegroundColor Green
    foreach ($p in $providers.providers) {
        Write-Host "   - $($p.name): $($p.gameCount) games" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 12: Get Games List
Write-Host "`n[12] Getting games list ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/games" -UseBasicParsing
    $games = $response.Json
    Write-Host "✅ Total games: $($games.games.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Final Status
Write-Host "`n=== Final Status ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/status" -UseBasicParsing
    $finalStatus = $response.Json
    Write-Host "✅ Status: $($finalStatus.status)" -ForegroundColor Green
    Write-Host "   Total tables: $($finalStatus.totalTables)" -ForegroundColor Gray
    Write-Host "   Online agents: $($finalStatus.onlineAgents)" -ForegroundColor Gray
    Write-Host "   Total rounds: $($finalStatus.totalRounds)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan