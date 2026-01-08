@echo off
echo Creating team users...
cd /d "%~dp0"
node create-team-users.js
pause