# scripts/run-dev.ps1
param(
  [int]$ApiPort = 5000,
  [int]$DashboardPort = 5001
)

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host ".env created from .env.example — edit before running if needed"
}

if (-not (Test-Path logs)) { New-Item -ItemType Directory -Path logs | Out-Null }

Write-Host "Starting API server on port $ApiPort"
$env:PORT = $ApiPort
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "nodemon server.js"

Start-Sleep -Seconds 1
Write-Host "Starting Dashboard server on port $DashboardPort"
$env:PORT = $DashboardPort
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "dashboard-server.js"

Write-Host "Servers started. API: http://localhost:$ApiPort  Dashboard: http://localhost:$DashboardPort"
