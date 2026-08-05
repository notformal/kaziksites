# Test script for creating a live game table
$json = @{
    gameId = "evolution-roulette"
    gameType = "roulette" 
    name = "Lightning Roulette Table 1"
    minBet = 0.5
    maxBet = 10000
} | ConvertTo-Json -Compress

Write-Host "Request body: $json"

try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/live-games/create' `
        -Method POST `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) `
        -ContentType 'application/json' `
        -UseBasicParsing
        
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response:"
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host "Response body:"
        Write-Host $reader.ReadToEnd()
    }
}