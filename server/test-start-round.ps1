# Test script for starting a round on the created table
$tableId = "table_93120821-772a-414f-9827-836512169e14"
$url = "http://127.0.0.1:8787/api/live-games/tables/$tableId/start"

Write-Host "Starting round on table: $tableId"
Write-Host "URL: $url"

try {
    $response = Invoke-WebRequest -Uri $url `
        -Method POST `
        -UseBasicParsing
        
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response:"
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
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