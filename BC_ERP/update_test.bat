@echo off
chcp 65001 >nul
echo ===================================================
echo   UPDATE TEST - Seed Data + Rebuild + Setup DB
echo ===================================================
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

:: Step 1: Stop test containers
echo.
echo [1/4] Stopping test containers...
docker compose -f docker-compose.test.yml down 2>nul

:: Step 2: Copy production data to test
echo.
echo [2/4] Seeding test data from production...
if not exist "Management\pb_data_test" mkdir "Management\pb_data_test"
if not exist "MungkhudShop\pb_data_test" mkdir "MungkhudShop\pb_data_test"

echo       Copying Management data...
xcopy /E /Y /Q "Management\pb_data\*" "Management\pb_data_test\" >nul

echo       Copying MungkhudShop data...
xcopy /E /Y /Q "MungkhudShop\pb_data\*" "MungkhudShop\pb_data_test\" >nul

echo       Data seeded OK.

:: Step 3: Build and start test containers
echo.
echo [3/4] Building and starting test containers...
docker compose -f docker-compose.test.yml up -d --build

:: Step 4: Ensure all PB collections exist
echo.
echo [4/4] Setting up database collections (waiting 8s for PB to start)...
timeout /t 8 /nobreak >nul

echo       Running MungkhudShop setup-db (port 9091)...
cd MungkhudShop
call node scripts/setup-db.js 9091
cd ..

echo.
echo       Running Management setup-db (port 9092)...
cd Management
call node scripts/setup-db.js 9092
cd ..

echo.
echo       Collections setup complete.

echo.
echo ===================================================
echo   TEST ENVIRONMENT READY
echo ===================================================
echo.
echo   MungkhudShop : http://localhost:9091
echo   Management   : http://localhost:9092
echo   PB Admin (M) : http://localhost:9091/_/
echo   PB Admin (G) : http://localhost:9092/_/
echo.
pause
