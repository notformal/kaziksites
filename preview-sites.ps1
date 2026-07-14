$ErrorActionPreference = 'Stop'
if (-not (Test-Path 'dist/aurora/index.html')) { npm run build }
Write-Host 'Aurora: http://127.0.0.1:4173/aurora/'
Write-Host 'Ember:  http://127.0.0.1:4173/ember/'
Write-Host 'Royale: http://127.0.0.1:4173/royale/'
npx vite preview --host 127.0.0.1 --port 4173
