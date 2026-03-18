@echo off
chcp 65001 >nul
echo ===================================================
echo   PROMOTE TO PRODUCTION
echo ===================================================
echo.
echo This will:
echo   1. Stop test containers
echo   2. Stop production containers
echo   3. Rebuild production with latest code
echo   4. Start production containers
echo   5. Run health checks
echo.
echo WARNING: Production DATA is preserved (only code changes).
echo.
set /p confirm="Proceed? (y/n): "
if /i not "%confirm%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo [1/5] Stopping test containers...
docker compose -f docker-compose.test.yml down 2>nul
echo       Done.

echo.
echo [2/5] Stopping production containers...
docker compose down
echo       Done.

echo.
echo [3/5] Rebuilding production images...
docker compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Build failed. Production NOT updated.
    echo         Fix the errors above and try again.
    pause
    exit /b 1
)
echo       Build complete.

echo.
echo [4/5] Starting production containers...
docker compose up -d
echo       Containers starting...

echo.
echo [5/5] Health checks (waiting 15s for startup)...
timeout /t 15 /nobreak >nul

:: Check Management
curl -s -o nul -w "%%{http_code}" http://localhost:8092/api/health > %TEMP%\hc_mgmt.txt 2>nul
set /p mgmt_status=<%TEMP%\hc_mgmt.txt
if "%mgmt_status%"=="200" (
    echo       Management (8092) - HEALTHY
) else (
    echo       Management (8092) - Status: %mgmt_status% (may still be starting)
)

:: Check MungkhudShop
curl -s -o nul -w "%%{http_code}" http://localhost:8091/api/health > %TEMP%\hc_mung.txt 2>nul
set /p mung_status=<%TEMP%\hc_mung.txt
if "%mung_status%"=="200" (
    echo       MungkhudShop (8091) - HEALTHY
) else (
    echo       MungkhudShop (8091) - Status: %mung_status% (may still be starting)
)

echo.
echo ===================================================
echo   PROMOTION COMPLETE
echo ===================================================
echo.
echo   Management:   http://localhost:8092
echo   MungkhudShop: http://localhost:8091
echo.
pause
