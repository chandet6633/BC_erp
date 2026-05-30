@echo off
title BC ERP - Update
color 0A

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  BC ERP - Pulling Latest Images      ║
echo  ╚══════════════════════════════════════╝
echo.

echo [1/3] Pulling latest code...
git pull origin main
if %ERRORLEVEL% neq 0 (
    echo  ⚠ Git pull failed, continuing with image update...
)

echo.
echo [2/3] Pulling latest Docker images...
docker compose pull
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ❌ Failed to pull images.
    echo     Make sure you're logged into ghcr.io:
    echo     docker login ghcr.io -u chandet6633
    pause
    exit /b 1
)

echo.
echo [3/3] Restarting containers...
docker compose up -d --remove-orphans
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ❌ Failed to start containers.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  ✅ ERP updated successfully!        ║
echo  ╚══════════════════════════════════════╝
echo.
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo.
pause
