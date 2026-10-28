# Run in elevated PowerShell on the designated server PC.
# Allows incoming TCP 3000 from the local subnet only.
$ErrorActionPreference='Stop'
$rule='ISP Inventory Shared Server (Private LAN)'
if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
 New-NetFirewallRule -DisplayName $rule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet | Out-Null
}
Write-Host 'Private LAN firewall rule installed for TCP port 3000.' -ForegroundColor Green
