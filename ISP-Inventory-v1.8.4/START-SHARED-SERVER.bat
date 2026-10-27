@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
 echo Node.js 22.5 or newer is required on the shared server computer.
 pause
 exit /b 1
)
set "ISP_LISTEN_HOST=0.0.0.0"
rem Server port is configured under Settings - Network & Ports. Default: 3000.
set "ISP_FRONTEND_PORT=3001"
if not defined ISP_DATA_DIR set "ISP_DATA_DIR=%~dp0data"
echo ============================================================
echo ISP Inventory shared network server
echo Server address: check the listening port displayed below.
echo Database location: %ISP_DATA_DIR%
echo Close this window to stop the shared server.
echo Do not share inventory.sqlite as a Windows network folder.
echo ============================================================
node server\index.js
echo Server stopped. Check messages above.
pause
