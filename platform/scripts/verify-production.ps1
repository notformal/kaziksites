$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path .env)) {
  throw 'Missing platform/.env. Copy .env.production.example and replace all CHANGE_ME values.'
}
if (Select-String -Path .env -Pattern 'CHANGE_ME' -Quiet) {
  throw 'platform/.env still contains CHANGE_ME placeholders.'
}

npm test
npm run build
npm audit --omit=dev
docker compose config --quiet
docker compose build
docker compose up -d --wait

$port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '8080' }
$edge = "http://127.0.0.1:$port"
$health = Invoke-RestMethod "$edge/healthz"
if (-not $health.ok) { throw 'Edge healthcheck failed.' }
Invoke-RestMethod "$edge/api/health" | Out-Null
$gamesPort = if ($env:GAMES_PORT) { $env:GAMES_PORT } else { '8081' }
$gamesOrigin = "http://127.0.0.1:$gamesPort"
Invoke-WebRequest "$gamesOrigin/healthz" -UseBasicParsing | Out-Null
foreach ($game in @('slots-classic','crash','plinko','roulette','keno')) {
  if ((Invoke-WebRequest "$gamesOrigin/games/$game/index.html" -UseBasicParsing).StatusCode -ne 200) { throw "Game $game is unavailable." }
}
if ((Invoke-WebRequest "$gamesOrigin/games/slots-studio/index.html?title=slot-original-001" -UseBasicParsing).StatusCode -ne 200) { throw 'Slots Studio renderer is unavailable.' }
$email = "canary-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.invalid"
$password = "Canary-$([Guid]::NewGuid().ToString('N'))!"
$register = Invoke-RestMethod "$edge/api/auth/register" -Method Post -ContentType 'application/json' -Body (@{email=$email;password=$password;displayName='Production Canary'} | ConvertTo-Json)
if (-not $register.token) { throw 'Registration did not return a session token.' }
$headers = @{ Authorization = "Bearer $($register.token)" }
if ((Invoke-RestMethod "$edge/api/wallet/balance" -Headers $headers).balance -ne 5000) { throw 'Unexpected welcome balance.' }
$registry = Invoke-RestMethod "$edge/api/games/registry"
$originalSlots = @($registry.games | Where-Object { $_.id -like 'slot-original-*' })
if ($originalSlots.Count -ne 127) { throw "Expected 127 original slots, got $($originalSlots.Count)." }
foreach ($game in @('slots-classic','crash','plinko','roulette','keno')) {
  $round = "canary_$($game.Replace('-','_'))_$([Guid]::NewGuid().ToString('N'))"
  $betBody = @{amount=100;gameId=$game;roundId=$round;clientSeed="canary-client-$round"} | ConvertTo-Json
  Invoke-RestMethod "$edge/api/wallet/bet" -Method Post -Headers $headers -ContentType 'application/json' -Body $betBody | Out-Null
  $again = Invoke-RestMethod "$edge/api/wallet/bet" -Method Post -Headers $headers -ContentType 'application/json' -Body $betBody
  if (-not $again.idempotent) { throw "Duplicate bet was not idempotent for $game." }
  $settleBody = @{gameId=$game;roundId=$round} | ConvertTo-Json
  $settled = Invoke-RestMethod "$edge/api/wallet/settle" -Method Post -Headers $headers -ContentType 'application/json' -Body $settleBody
  $settledAgain = Invoke-RestMethod "$edge/api/wallet/settle" -Method Post -Headers $headers -ContentType 'application/json' -Body $settleBody
  if ($settled.balance -ne $settledAgain.balance) { throw "Duplicate settlement changed balance for $game." }
  if (-not $settled.proof.serverSeed -or -not $settled.proof.serverSeedHash) { throw "Missing provably-fair proof for $game." }
}
foreach ($game in $originalSlots) {
  $round = "canary_$($game.id.Replace('-','_'))_$([Guid]::NewGuid().ToString('N'))"
  $betBody = @{amount=1;gameId=$game.id;roundId=$round;clientSeed="canary-client-$round"} | ConvertTo-Json
  Invoke-RestMethod "$edge/api/wallet/bet" -Method Post -Headers $headers -ContentType 'application/json' -Body $betBody | Out-Null
  $settleBody = @{gameId=$game.id;roundId=$round} | ConvertTo-Json
  $settled = Invoke-RestMethod "$edge/api/wallet/settle" -Method Post -Headers $headers -ContentType 'application/json' -Body $settleBody
  if ($settled.outcome.grid.Count -ne 15 -or $settled.mathVersion -ne 1) { throw "Invalid server outcome for $($game.id)." }
}
if ((Invoke-RestMethod "$edge/api/history/rounds" -Headers $headers).rounds.Count -lt 132) { throw 'History is missing canary rounds.' }
$firstDaily = Invoke-RestMethod "$edge/api/wallet/daily-reward" -Method Post -Headers $headers
$secondDaily = Invoke-RestMethod "$edge/api/wallet/daily-reward" -Method Post -Headers $headers
if (-not $firstDaily.claimed -or $secondDaily.claimed) { throw 'Daily reward idempotency failed.' }
Invoke-RestMethod "$edge/api/auth/logout" -Method Post -Headers $headers | Out-Null
Write-Host "Production smoke checks passed: edge=$edge games=$gamesOrigin all 132 server-authoritative games verified."
