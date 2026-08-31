@echo off
chcp 65001 >nul
echo ===================================================
echo   SEED TEST DATA - Express + NocoDB
echo ===================================================
echo.
node api-server/scripts/seed-test-data.mjs
echo.
pause
