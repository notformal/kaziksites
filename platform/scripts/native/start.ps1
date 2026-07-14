[CmdletBinding()]
param([switch]$SkipBuild)
$ErrorActionPreference='Stop';$root=Resolve-Path (Join-Path $PSScriptRoot '../..');Set-Location $root
$runtime=Join-Path $root '.runtime';$pids=Join-Path $runtime 'pids';$logs=Join-Path $runtime 'logs';New-Item -ItemType Directory -Force $pids,$logs|Out-Null
$pidFile=Join-Path $pids 'supervisor.pid';if(Test-Path $pidFile){$running=Get-Process -Id ([int](Get-Content $pidFile)) -ErrorAction SilentlyContinue;if($running){throw "Runtime already running (PID $($running.Id))"}}
$envFile=Join-Path $root '.env.native';if(-not(Test-Path $envFile)){Copy-Item (Join-Path $root '.env.native.example') $envFile;throw 'Created .env.native. Replace CHANGE_ME values and run start again.'}
Get-Content $envFile|Where-Object{$_ -match '^\s*[^#][^=]*='}|ForEach-Object{$key,$value=$_.Split('=',2);[Environment]::SetEnvironmentVariable($key.Trim(),$value.Trim(),'Process')}
if($env:POSTGRES_PASSWORD -like '*CHANGE_ME*' -or $env:POSTGRES_PASSWORD.Length -lt 16){throw 'Set a strong POSTGRES_PASSWORD (16+ chars) in .env.native'}
if($env:SESSION_SECRET -like '*CHANGE_ME*' -or $env:SESSION_SECRET.Length -lt 32){throw 'Set SESSION_SECRET (32+ chars) in .env.native'}
foreach($port in @($env:NATIVE_PG_PORT,$env:PORT,$env:CONTROL_PORT,$env:LOBBY_PORT,$env:GAMES_PORT)){if(-not $port -or [int]$port -lt 1){throw 'All runtime ports must be valid'};if(Get-NetTCPConnection -LocalPort ([int]$port) -State Listen -ErrorAction SilentlyContinue){throw "Port $port is already in use"}}
if(-not $SkipBuild){
  $env:VITE_API_URL=if($env:PUBLIC_API_URL){$env:PUBLIC_API_URL}else{"http://127.0.0.1:$($env:PORT)/api"}
  $env:VITE_GAME_ORIGIN=if($env:PUBLIC_GAME_ORIGIN){$env:PUBLIC_GAME_ORIGIN}else{"http://127.0.0.1:$($env:GAMES_PORT)"}
  & npm run build;if($LASTEXITCODE){throw 'Build failed'};& npm run stage:local;if($LASTEXITCODE){throw 'Game staging failed'}
}
$out=Join-Path $logs 'launcher.log';$proc=Start-Process -FilePath (Get-Command node).Source -ArgumentList 'scripts/native/supervisor.mjs' -WorkingDirectory $root -RedirectStandardOutput $out -RedirectStandardError (Join-Path $logs 'launcher-error.log') -WindowStyle Hidden -PassThru
$deadline=(Get-Date).AddSeconds(60);do{Start-Sleep -Milliseconds 500;try{$health=Invoke-RestMethod "http://127.0.0.1:$($env:PORT)/health" -TimeoutSec 2}catch{$health=$null};if($proc.HasExited){throw "Runtime exited. See $logs"}}while(-not $health.ok -and (Get-Date)-lt $deadline)
if(-not $health.ok){throw "Runtime health timeout. See $logs"};Write-Host "Native runtime ready: lobby http://127.0.0.1:$($env:LOBBY_PORT) games http://127.0.0.1:$($env:GAMES_PORT) API http://127.0.0.1:$($env:PORT)"
