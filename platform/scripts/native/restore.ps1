[CmdletBinding()]
param([Parameter(Mandatory)][string]$BackupFile,[switch]$ConfirmRestore,[string]$TargetDatabase)
$ErrorActionPreference='Stop';if(-not $ConfirmRestore){throw 'Restore refused. Re-run with -ConfirmRestore after verifying the selected backup.'}
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path;$backupRoot=[IO.Path]::GetFullPath((Join-Path $root '.runtime/backups'))
$source=(Resolve-Path -LiteralPath $BackupFile).Path;if(-not $source.StartsWith(($backupRoot+[IO.Path]::DirectorySeparatorChar),[StringComparison]::OrdinalIgnoreCase)){throw 'Only backups inside .runtime/backups may be restored'}
$envFile=Join-Path $root '.env.native';Get-Content $envFile|Where-Object{$_ -match '^\s*[^#][^=]*='}|ForEach-Object{$key,$value=$_.Split('=',2);[Environment]::SetEnvironmentVariable($key.Trim(),$value.Trim(),'Process')}
$database=if($TargetDatabase){$TargetDatabase}else{$env:POSTGRES_DB};if($database -notmatch '^[A-Za-z][A-Za-z0-9_]{0,62}$'){throw 'Invalid target database name'}
$url="postgres://$([Uri]::EscapeDataString($env:POSTGRES_USER)):$([Uri]::EscapeDataString($env:POSTGRES_PASSWORD))@127.0.0.1:$($env:NATIVE_PG_PORT)/$([Uri]::EscapeDataString($database))"
& node (Join-Path $PSScriptRoot 'logical-backup.mjs') restore $source $url
if($LASTEXITCODE){throw 'Restore failed'};Write-Host "Restore completed into database '$database'."
