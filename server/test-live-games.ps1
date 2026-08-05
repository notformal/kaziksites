# Test script for Live Games API
$baseUrl = "http://127.0.0.1:8787"

Write-Host "=== Live Games API Test ===" -ForegroundColor Cyan

# Test 1: Status
Write-Host "`n[1] Testing /api/live-games/status ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/status" -UseBasicParsing
    Write-Host "✅ Status: $($response.Content)" -ForegroundColor Green
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
    Write-Host "✅ Table created: $($response.Content)" -ForegroundColor Green
    $tableId = ($response.Json).tableId
    Write-Host "   Table ID: $tableId" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $tableId = $null
}

# Test 3: Get Tables
Write-Host "`n[3] Getting tables list ..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/tables" -UseBasicParsing
    Write-Host "✅ Tables: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 4: Start Blackjack Round
if ($tableId) {
    Write-Host "`n[4] Starting blackjack round ..." -ForegroundColor Yellow
    $body2 = @{ tableId = $tableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/blackjack/deal" -Method POST -Body $body2 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Round result:" -ForegroundColor Green
        Write-Host "   Player Hand: $($result.playerHand | ConvertTo-Json)" -ForegroundColor Gray
        Write-Host "   Dealer Up: $($result.dealerUp.rank)$($result.dealerUp.suit)" -ForegroundColor Gray
        Write-Host "   Results count: $($result.results.Count)" -ForegroundColor Gray
        Write-Host "   Bots online: $($result.botsOnline)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 5: Create Roulette Table
Write-Host "`n[5] Creating Roulette table ..." -ForegroundColor Yellow
$rouletteBody = @{
    type = "roulette"
    minBet = 1
    maxBet = 5000
    name = "Evolution Lightning Roulette"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $rouletteBody -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Roulette table: $($response.Content)" -ForegroundColor Green
    $rouletteTableId = ($response.Json).tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $rouletteTableId = $null
}

# Test 6: Spin Roulette
if ($rouletteTableId) {
    Write-Host "`n[6] Spinning roulette ..." -ForegroundColor Yellow
    $body3 = @{ tableId = $rouletteTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/roulette/spin" -Method POST -Body $body3 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Roulette result:" -ForegroundColor Green
        Write-Host "   Number: $($result.number) ($($result.color))" -ForegroundColor Gray
        Write-Host "   Lightning numbers: $($result.lightningNumbers -join ', ')" -ForegroundColor Gray
        Write-Host "   Bots online: $($result.botsOnline)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 7: Create Baccarat Table
Write-Host "`n[7] Creating Baccarat table ..." -ForegroundColor Yellow
$baccaratBody = @{
    type = "baccarat"
    minBet = 1
    maxBet = 5000
    name = "Evolution Speed Baccarat"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $baccaratBody -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Baccarat table: $($response.Content)" -ForegroundColor Green
    $baccaratTableId = ($response.Json).tableId
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $baccaratTableId = $null
}

# Test 8: Play Baccarat
if ($baccaratTableId) {
    Write-Host "`n[8] Playing baccarat ..." -ForegroundColor Yellow
    $body4 = @{ tableId = $baccaratTableId } | ConvertTo-Json
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/baccarat/play" -Method POST -Body $body4 -ContentType "application/json" -UseBasicParsing
        $result = $response.Json
        Write-Host "✅ Baccarat result:" -ForegroundColor Green
        Write-Host "   Player value: $($result.playerValue)" -ForegroundColor Gray
        Write-Host "   Banker value: $($result.bankerValue)" -ForegroundColor Gray
        Write-Host "   Winner: $($result.result)" -ForegroundColor Gray
        Write-Host "   Lightning multiplier: $($result.lightningMultiplier)x" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

# Test 9: Create Game Show Table (Crazy Time)
Write-Host "`n[9] Creating Crazy Time table ..." -ForegroundColor Yellow
$gameShowBody = @{
    type = "gameshow"
    gameType = "crazy-time"
    minBet = 0.5
    maxBet = 1000
    name = "Evolution Crazy Time"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/create" -Method POST -Body $gameShowBody -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Crazy Time table: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Test 10: Spin Crazy Time
Write-Host "`n[10] Spinning Crazy Time ..." -ForegroundColor Yellow
try {
    $body5 = @{ gameType = "crazy-time" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/gameshow/spin" -Method POST -Body $body5 -ContentType "application/json" -UseBasicParsing
    $result = $response.Json
    Write-Host "✅ Crazy Time result:" -ForegroundColor Green
    Write-Host "   Main multiplier: $($result.mainMultiplier)x" -ForegroundColor Gray
    Write-Host "   Is double: $($result.isDouble)" -ForegroundColor Gray
    if ($result.bonusRound) {
        Write-Host "   Bonus round: $($result.bonusRound.type)" -ForegroundColor Gray
        $bonusVal = $null
        if ($result.bonusRound.finalMultiplier) { $bonusVal = $result.bonusRound.finalMultiplier }
        elseif ($result.bonusRound.prize) { $bonusVal = $result.bonusRound.prize }
        elseif ($result.bonusRound.multiplier) { $bonusVal = $result.bonusRound.multiplier }
        Write-Host "   Bonus multiplier: ${bonusVal}x" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# Final Status
Write-Host "`n=== Final Status ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/live-games/status" -UseBasicParsing
    Write-Host "✅ Final status: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan