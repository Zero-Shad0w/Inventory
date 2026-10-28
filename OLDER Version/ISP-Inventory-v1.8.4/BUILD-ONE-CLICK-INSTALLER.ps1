# Run on Windows 10/11 x64 with Node.js 22.5+ and internet access.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
$nodeVersion = (& node --version).TrimStart('v')
if ([version]$nodeVersion -lt [version]'22.5.0') { throw 'Node.js 22.5+ is required to build the installer.' }
# Use the exact local Node.js executable as the bundled runtime. The desktop app
# uses this runtime for node:sqlite, not Electron's internal Node version.
$runtimeDir = Join-Path $root 'runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
Copy-Item -LiteralPath $nodeExe -Destination (Join-Path $runtimeDir 'node.exe') -Force
Push-Location (Join-Path $root 'desktop')
try {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  npm run dist
  if ($LASTEXITCODE -ne 0) { throw 'Installer build failed' }
} finally { Pop-Location }
Write-Host 'Installer created in installer-output\ISP-Inventory-Setup-1.8.4.exe' -ForegroundColor Green
