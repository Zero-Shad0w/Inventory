@echo off
setlocal
cd /d "%~dp0"
title ISP Inventory - System Check
if exist "ports.cmd" call "ports.cmd"
if not defined ISP_SERVER_PORT set "ISP_SERVER_PORT=3000"
if not defined ISP_FRONTEND_PORT set "ISP_FRONTEND_PORT=3001"
echo.
echo Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
 echo ERROR: Node.js not found. Install Node.js 22.5+ from https://nodejs.org/
 goto done
)
node --version
echo.
echo Checking application configuration...
node -e "const c=require('./server/config');console.log('Backend:',c.port,'Frontend:',c.frontendPort,'Data folder:',c.dataDir)"
if errorlevel 1 goto done
echo.
echo Checking frontend connectivity...
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:%ISP_FRONTEND_PORT%/api/status' -TimeoutSec 3; Write-Host ('PASS: Frontend and API online ('+$r.StatusCode+')') } catch { Write-Host ('NOT ONLINE: '+$_.Exception.Message) }"
echo.
echo Note: This tool does not fix service crashes; read the RUN-SERVER and RUN-FRONTEND windows for errors.
:done
echo.
pause
