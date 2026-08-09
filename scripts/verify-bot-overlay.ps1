$ok = 0; $bad = 0; $results = @()
Get-ChildItem "f:\Kaziksites\public\games" -Directory | Where-Object { $_.Name -ne "_engine" -and $_.Name -ne "_live-engine" } | ForEach-Object {
    $c = Get-Content "$($_.FullName)\index.html" -Raw
    $imp = ([regex]::Matches($c, "import.*bot-overlay")).Count
    $call = ([regex]::Matches($c, "setupBotOverlay\s*\(")).Count
    $total = $imp + $call
    if ($imp -eq 1 -and $call -eq 1) {
        $ok++
    } else {
        Write-Host "BAD: $($_.Name) imports=$imp calls=$call total=$total"
        $bad++
    }
}
Write-Host "`n========================================="
Write-Host "VERIFICATION COMPLETE"
Write-Host "========================================="
Write-Host "Correctly configured: $ok / 71"
Write-Host "Issues remaining: $bad / 71"