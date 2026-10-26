@echo off
cd /d "%~dp0certflow-frontend"
where npm >nul 2>nul || (echo Node.js/npm not found. Install Node 18+ from https://nodejs.org and reopen this window. & pause & exit /b 1)
if not exist node_modules\.bin\vite.cmd call npm install
call npm run dev
pause
