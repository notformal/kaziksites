$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$destination = 'apps/lobby/dist/games'
New-Item -ItemType Directory -Force $destination | Out-Null
foreach ($game in @('slots-classic','slots-studio','crash','plinko','roulette','keno')) {
  $source = "games/$game/dist"
  if (-not (Test-Path "$source/index.html")) { throw "Missing production build for $game" }
  Copy-Item -LiteralPath $source -Destination "$destination/$game" -Recurse -Force
}
foreach ($game in @('slots-classic','slots-studio','crash','plinko','roulette','keno')) {
  if (-not (Test-Path "$destination/$game/index.html")) { throw "Failed to stage $game" }
}
Write-Host 'Six production game bundles staged into lobby dist.'
