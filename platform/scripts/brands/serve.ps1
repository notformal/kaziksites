param(
  [ValidateSet('aurora','ember','royale')][string]$Brand='aurora',
  [ValidateRange(1,65535)][int]$Port=8080
)
$ErrorActionPreference='Stop'
$root=Resolve-Path (Join-Path $PSScriptRoot "../../apps/lobby/dist/$Brand") -ErrorAction Stop
$env:STATIC_ROOT=$root.Path
$env:STATIC_PORT="$Port"
$env:STATIC_ROLE='lobby'
Write-Host "Serving fixed $Brand bundle at http://127.0.0.1:$Port/"
& node (Join-Path $PSScriptRoot '../native/static-server.mjs')
