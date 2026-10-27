@echo off
setlocal
cd /d "%~dp0"
if exist "ports.cmd" call "ports.cmd"
title ISP Inventory - SERVER
:retry
echo.
echo Starting server\index.js at %date% %time%
node "server\index.js"
echo.
echo ************************************************************
echo server\index.js stopped with exit code %errorlevel%.
echo This window stays open so you can read the error.
echo ************************************************************
choice /c RQ /m "Press R to restart, or Q to keep this window open"
if errorlevel 2 goto stopped
goto retry
:stopped
echo Service stopped. Review errors above. Close this window manually.
pause
