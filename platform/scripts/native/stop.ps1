$ErrorActionPreference='Stop';$root=Resolve-Path (Join-Path $PSScriptRoot '../..');$pids=Join-Path $root '.runtime/pids';$envFile=Join-Path $root '.env.native';if(Test-Path $envFile){Get-Content $envFile|Where-Object{$_ -match '^\s*[^#][^=]*='}|ForEach-Object{$key,$value=$_.Split('=',2);[Environment]::SetEnvironmentVariable($key.Trim(),$value.Trim(),'Process')}}
if(-not(Test-Path $pids)){Write-Host 'Runtime is not running.';exit 0}
try{Invoke-WebRequest "http://127.0.0.1:$($env:CONTROL_PORT)/stop" -Method Post -Headers @{Authorization="Bearer $($env:SESSION_SECRET)"} -UseBasicParsing|Out-Null}catch{}
$deadline=(Get-Date).AddSeconds(15);$supervisor=Join-Path $pids 'supervisor.pid';do{Start-Sleep -Milliseconds 250}while((Test-Path $supervisor)-and(Get-Date)-lt $deadline)
foreach($name in @('api.pid','lobby.pid','games.pid','supervisor.pid')){$file=Join-Path $pids $name;if(Test-Path $file){$processId=[int](Get-Content $file);$proc=Get-Process -Id $processId -ErrorAction SilentlyContinue;if($proc){Stop-Process -Id $processId -Force};Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue}}
Write-Host 'Native runtime stopped. Persistent PostgreSQL data was preserved.'
