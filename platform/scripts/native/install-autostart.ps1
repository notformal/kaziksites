[CmdletBinding(SupportsShouldProcess)]
param([switch]$Apply)
$ErrorActionPreference='Stop';$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path;$taskName='VirtualArcadeNativeRuntime'
if(-not(Test-Path (Join-Path $root '.env.native'))){throw '.env.native must be configured before autostart installation'}
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$root\scripts\native\start.ps1`" -SkipBuild" -WorkingDirectory $root
$trigger=New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME";$settings=New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
if(-not $Apply){Write-Host "Dry run only. Task '$taskName' would start the native runtime at logon. Re-run with -Apply to install.";return}
if($PSCmdlet.ShouldProcess($taskName,'Register current-user startup task')){Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Virtual Arcade native runtime' -Force|Out-Null;Write-Host "Installed scheduled task '$taskName'."}
