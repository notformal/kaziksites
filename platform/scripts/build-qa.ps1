$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:VITE_API_URL = if ($env:QA_API_URL) { $env:QA_API_URL } else { 'http://127.0.0.1:8790/api' }
$env:VITE_GAME_ORIGIN = if ($env:QA_GAME_ORIGIN) { $env:QA_GAME_ORIGIN } else { 'http://127.0.0.1:4191' }
npm run build -w @arcade/lobby
foreach ($game in @('slots-classic','slots-studio','crash','plinko','roulette','keno')) { npm run build -w "@arcade/$game" }
& "$PSScriptRoot/stage-local.ps1"
Write-Host "QA build ready: API=$env:VITE_API_URL games=$env:VITE_GAME_ORIGIN"
