@echo off
cd /d "%~dp0certflow-frontend"
if not exist node_modules call npm install
call npm run dev
pause
