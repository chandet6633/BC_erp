@echo off
setlocal EnableDelayedExpansion

REM ===================================================================
REM  BC AUTO XPERIENCE - Production Update Script
REM ===================================================================
REM
REM  This script safely updates both containers (Management and
REM  MungkhudShop) WITHOUT touching the database volumes.
REM
REM  What it does:
REM    1. Stops running containers gracefully
REM    2. Kills any leftover local processes (ports 8091/8092)
REM    3. Rebuilds container images with latest code
REM    4. Starts containers with existing database volumes
REM
REM  What it does NOT do:
REM    - Delete or modify database files (pb_data)
REM    - Remove Docker volumes
REM    - Affect any data stored in PocketBase
REM ===================================================================

title BC Auto - Production Update

echo.
echo  ===================================================================
echo   BC AUTO XPERIENCE - Production Update
echo   Safe rebuild: code only, database untouched
echo  ===================================================================
echo.

REM --- Step 1: Pre-flight checks ---
echo  [1/5] Pre-flight checks...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] Docker is not installed or not in PATH.
    echo    Please install Docker Desktop and try again.
    pause
    exit /b 1
)

docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] Docker daemon is not running.
    echo    Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo  [OK] Docker is ready.

REM --- Step 2: Show current volume info ---
echo.
echo  [2/5] Checking database directories...
if exist "%~dp0Management\pb_data\data.db" (
    echo  [OK] Management database exists.
) else (
    echo  [INFO] Management database will be created on first run.
)
if exist "%~dp0MungkhudShop\pb_data\data.db" (
    echo  [OK] MungkhudShop database exists.
) else (
    echo  [INFO] MungkhudShop database will be created on first run.
)
echo  [INFO] Database directories will NOT be modified during this update.

REM --- Step 3: Stop containers gracefully ---
echo.
echo  [3/5] Stopping current containers...
docker compose down 2>nul
echo  [OK] Containers stopped.

REM Kill any leftover local processes
taskkill /F /IM pocketbase.exe /T >nul 2>&1

REM --- Step 4: Rebuild images ---
echo.
echo  [4/5] Rebuilding container images (this may take a few minutes)...
echo        Building Management...
docker compose build --no-cache management
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] Management build failed.
    pause
    exit /b 1
)
echo        Building MungkhudShop...
docker compose build --no-cache mungkhudshop
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] MungkhudShop build failed.
    pause
    exit /b 1
)
echo  [OK] Both images rebuilt successfully.

REM --- Step 5: Start containers ---
echo.
echo  [5/5] Starting containers...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] Failed to start containers.
    pause
    exit /b 1
)

REM Wait for health checks
echo        Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

REM --- Done ---
echo.
echo  ===================================================================
echo   UPDATE COMPLETE
echo.
echo   Management:   http://localhost:8092
echo   MungkhudShop: http://localhost:8091
echo.
echo   Database directories preserved:
echo     - Management\pb_data\
echo     - MungkhudShop\pb_data\
echo.
echo   View logs: docker compose logs -f
echo  ===================================================================
echo.
pause
