$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
New-Item -ItemType Directory -Force -Path 'runtime' | Out-Null
Copy-Item (Get-Command node.exe -ErrorAction Stop).Source 'runtime\node.exe' -Force
Push-Location 'desktop'
try { npm install --no-audit --no-fund; if($LASTEXITCODE -ne 0){throw 'npm install failed'}; npm start } finally { Pop-Location }
