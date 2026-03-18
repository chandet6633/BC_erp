@echo off
chcp 65001 >nul
echo ===================================================
echo   SEED TEST DATA - Copy Production to Test
echo ===================================================
echo.
echo This copies production database files to test directories.
echo Production data will NOT be modified.
echo.

:: Check production data exists
if not exist "Management\pb_data" (
    echo [ERROR] Management\pb_data not found.
    echo         Run production containers first to initialize data.
    pause
    exit /b 1
)
if not exist "MungkhudShop\pb_data" (
    echo [ERROR] MungkhudShop\pb_data not found.
    echo         Run production containers first to initialize data.
    pause
    exit /b 1
)

:: Stop test containers if running
echo [1/3] Stopping test containers...
docker compose -f docker-compose.test.yml down 2>nul

:: Create test data directories
echo [2/3] Creating test data directories...
if not exist "Management\pb_data_test" mkdir "Management\pb_data_test"
if not exist "MungkhudShop\pb_data_test" mkdir "MungkhudShop\pb_data_test"

:: Copy production data to test
echo [3/3] Copying data...
echo       Management...
xcopy /E /Y /Q "Management\pb_data\*" "Management\pb_data_test\" >nul

echo       MungkhudShop...
xcopy /E /Y /Q "MungkhudShop\pb_data\*" "MungkhudShop\pb_data_test\" >nul

echo.
echo [OK] Test data seeded successfully.
echo     Management\pb_data_test\  - Ready
echo     MungkhudShop\pb_data_test\ - Ready
echo.
echo Next: docker compose -f docker-compose.test.yml up -d --build
echo.
pause
