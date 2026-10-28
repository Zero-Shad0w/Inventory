@echo off
setlocal
cd /d "%~dp0"
title ISP Inventory - Windows Launcher
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 22.5 or newer is required. Install from https://nodejs.org/
 pause
 exit /b 1
)
for /f "tokens=1 delims=.v" %%A in ('node --version') do set "NODE_MAJOR=%%A"
if %NODE_MAJOR% LSS 22 (
 echo Install Node.js 22.5 or newer.
 pause
 exit /b 1
)
if exist "ports.cmd" call "ports.cmd"
if not defined ISP_SERVER_PORT set "ISP_SERVER_PORT=3000"
if not defined ISP_FRONTEND_PORT set "ISP_FRONTEND_PORT=3001"
node -e "require('./server/config')" || (pause & exit /b 1)
echo Backend API: http://127.0.0.1:%ISP_SERVER_PORT%
echo Frontend UI: http://127.0.0.1:%ISP_FRONTEND_PORT%
echo Change ports using CONFIGURE-PORTS.bat. Keep both windows open.
start "ISP Inventory Backend" /D "%~dp0" cmd /k "RUN-SERVER.bat"
timeout /t 2 /nobreak >nul
start "ISP Inventory Frontend" /D "%~dp0" cmd /k "RUN-FRONTEND.bat"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:%ISP_FRONTEND_PORT%"
echo.
echo Launcher finished. Server windows should remain open.
echo If a server stops, its window shows the error and lets you restart it.
pause
exit /b 0
