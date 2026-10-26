@echo off
cd /d "%~dp0"
echo Starting CertFlow backend and frontend in two windows...
start "CertFlow backend" /D "%~dp0" cmd /k run-backend-local.bat
start "CertFlow frontend" /D "%~dp0" cmd /k run-frontend-local.bat
echo Wait until the backend window says "Started CertFlowApiApplication" (first run downloads Maven packages, a few minutes).
timeout /t 25 >nul
start "" http://localhost:5173
