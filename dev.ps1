# Run this instead of "shopify app dev"
# It starts ngrok automatically and passes the tunnel URL to Shopify.

Write-Host "Stopping any existing tunnel processes..." -ForegroundColor Cyan
Get-Process -Name "cloudflared","ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

Write-Host "Starting ngrok tunnel on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "ngrok" -ArgumentList "http 3000" -WindowStyle Hidden
Start-Sleep -Seconds 4

Write-Host "Fetching tunnel URL..." -ForegroundColor Cyan
$maxTries = 5
$url = $null
for ($i = 0; $i -lt $maxTries; $i++) {
  try {
    $resp = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 3
    $url = ($resp.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
    if ($url) { break }
  } catch {}
  Start-Sleep -Seconds 2
}

if (-not $url) {
  Write-Host "ERROR: Could not get ngrok URL. Make sure ngrok is installed and no firewall is blocking port 4040." -ForegroundColor Red
  exit 1
}

Write-Host "Tunnel ready: $url" -ForegroundColor Green
Write-Host ""
Write-Host "Starting Shopify dev server..." -ForegroundColor Cyan
shopify app dev --tunnel-url $url
