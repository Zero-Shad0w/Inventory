@echo off
setlocal
cd /d "%~dp0"
echo ISP Inventory port configuration
echo Enter separate ports for backend API and frontend website.
set /p "SERVER=Backend server port [3000]: "
if not defined SERVER set "SERVER=3000"
set /p "FRONTEND=Frontend website port [3001]: "
if not defined FRONTEND set "FRONTEND=3001"
echo(%SERVER%| findstr /r "^[0-9][0-9]*$" >nul || (echo Invalid server port. & pause & exit /b 1)
echo(%FRONTEND%| findstr /r "^[0-9][0-9]*$" >nul || (echo Invalid frontend port. & pause & exit /b 1)
set "ISP_SERVER_PORT=%SERVER%"
set "ISP_FRONTEND_PORT=%FRONTEND%"
node -e "require('./server/config')" || (echo Invalid ports. Nothing saved. & pause & exit /b 1)
>"ports.cmd" echo @echo off
>>"ports.cmd" echo set "ISP_SERVER_PORT=%SERVER%"
>>"ports.cmd" echo set "ISP_FRONTEND_PORT=%FRONTEND%"
echo Saved. Restart the software with START-ISP-INVENTORY.bat.
pause
