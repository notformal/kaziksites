[CmdletBinding(SupportsShouldProcess)]
param([switch]$Apply)
$taskName='VirtualArcadeNativeRuntime';if(-not $Apply){Write-Host "Dry run only. Task '$taskName' would be removed. Re-run with -Apply to uninstall.";return}
if(Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue){if($PSCmdlet.ShouldProcess($taskName,'Unregister startup task')){Unregister-ScheduledTask -TaskName $taskName -Confirm:$false;Write-Host "Removed scheduled task '$taskName'."}}else{Write-Host "Task '$taskName' is not installed."}
