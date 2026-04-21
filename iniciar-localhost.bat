@echo off
cd /d "%~dp0"
taskkill /F /IM node.exe >nul 2>nul
start "" http://localhost:5500
node server.js
