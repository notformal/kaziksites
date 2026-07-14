[CmdletBinding()]
param([ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$Name = "arcade-$(Get-Date -Format 'yyyyMMdd-HHmmss').json.gz")
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$envFile=Join-Path $root '.env.native';if(-not(Test-Path $envFile)){throw '.env.native is required'}
Get-Content $envFile|Where-Object{$_ -match '^\s*[^#][^=]*='}|ForEach-Object{$key,$value=$_.Split('=',2);[Environment]::SetEnvironmentVariable($key.Trim(),$value.Trim(),'Process')}
$backupRoot=Join-Path $root '.runtime/backups';New-Item -ItemType Directory -Force $backupRoot|Out-Null
$target=[IO.Path]::GetFullPath((Join-Path $backupRoot $Name));if(-not $target.StartsWith(([IO.Path]::GetFullPath($backupRoot)+[IO.Path]::DirectorySeparatorChar),[StringComparison]::OrdinalIgnoreCase)){throw 'Backup path must remain inside .runtime/backups'}
$url="postgres://$([Uri]::EscapeDataString($env:POSTGRES_USER)):$([Uri]::EscapeDataString($env:POSTGRES_PASSWORD))@127.0.0.1:$($env:NATIVE_PG_PORT)/$([Uri]::EscapeDataString($env:POSTGRES_DB))"
& node (Join-Path $PSScriptRoot 'logical-backup.mjs') backup $target $url
if($LASTEXITCODE -or -not(Test-Path $target) -or (Get-Item $target).Length -lt 100){Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue;throw 'Backup failed'}
$hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash;[IO.File]::WriteAllText("$target.sha256","$hash  $Name`r`n",[Text.Encoding]::ASCII)
Write-Host "Backup verified: $target ($((Get-Item $target).Length) bytes, SHA256 $hash)"
