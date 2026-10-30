@echo off
echo Starting SQL Server Execution Plan Visualizer...
cd /d "%~dp0"
start "" "http://localhost:3000"
npm run dev
pause
