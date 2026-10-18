@echo off
rem Double-click to play Ασπρόγιαλος (greece-life). Needs Node.js (https://nodejs.org/).
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org/ and try again.
  echo Or open dist\greece-life.html directly in Microsoft Edge or Google Chrome.
  pause
  exit /b 1
)
call npm start
pause
