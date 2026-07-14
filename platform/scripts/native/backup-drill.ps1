[CmdletBinding()]
param([string]$BackupFile)
$ErrorActionPreference='Stop';$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$envFile=Join-Path $root '.env.native';Get-Content $envFile|Where-Object{$_ -match '^\s*[^#][^=]*='}|ForEach-Object{$key,$value=$_.Split('=',2);[Environment]::SetEnvironmentVariable($key.Trim(),$value.Trim(),'Process')}
if(-not $BackupFile){$name="drill-$(Get-Date -Format 'yyyyMMdd-HHmmss').json.gz";& (Join-Path $PSScriptRoot 'backup.ps1') -Name $name;$BackupFile=Join-Path $root ".runtime/backups/$name"}
$drill="arcade_restore_drill_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())";$bin='C:\Program Files\PostgreSQL\16\bin';$env:PGPASSWORD=$env:POSTGRES_PASSWORD
if(-not(Test-Path (Join-Path $bin 'createdb.exe'))){throw 'PostgreSQL client tools are required for the drill'}
try{
  & (Join-Path $bin 'createdb.exe') --host=127.0.0.1 --port=$env:NATIVE_PG_PORT --username=$env:POSTGRES_USER $drill;if($LASTEXITCODE){throw 'Unable to create isolated drill database'}
  & (Join-Path $PSScriptRoot 'restore.ps1') -BackupFile $BackupFile -TargetDatabase $drill -ConfirmRestore
  $count=& (Join-Path $bin 'psql.exe') --host=127.0.0.1 --port=$env:NATIVE_PG_PORT --username=$env:POSTGRES_USER --dbname=$drill --tuples-only --no-align --command='SELECT count(*) FROM information_schema.tables WHERE table_schema=''public'';'
  if($LASTEXITCODE -or [int]$count -lt 5){throw "Drill validation failed: only $count public tables"}
  Write-Host "Backup/restore drill passed in isolated database ($count public tables)."
}finally{
  & (Join-Path $bin 'dropdb.exe') --host=127.0.0.1 --port=$env:NATIVE_PG_PORT --username=$env:POSTGRES_USER --if-exists $drill 2>$null
}
