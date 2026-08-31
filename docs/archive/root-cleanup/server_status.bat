@echo off
SETLOCAL EnableDelayedExpansion
chcp 65001 >nul
:: ═══════════════════════════════════════════════════════════════
::   UNIFIED SERVER STATUS — All Docker Containers
::   Shows health, resources, and recent errors at a glance
:: ═══════════════════════════════════════════════════════════════

title Server Status Dashboard

:menu
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║          SERVER STATUS DASHBOARD                         ║
echo  ║          %date% %time%                  ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Check Docker
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [FAIL] Docker is not running!
    echo         Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo  ─── CONTAINER STATUS ────────────────────────────────────────
echo.
docker ps -a --format "  {{.Names}}	{{.Status}}	{{.Ports}}"
echo.

echo  ─── HEALTH CHECKS ──────────────────────────────────────────
echo.
for %%c in (bc-portal bc-mungkhud uvgard-app) do (
    for /f "tokens=*" %%h in ('docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}" %%c 2^>nul') do (
        if "%%h"=="healthy" (
            echo   %%c	: ✅ %%h
        ) else if "%%h"=="unhealthy" (
            echo   %%c	: ❌ %%h
        ) else if "%%h"=="no-healthcheck" (
            echo   %%c	: ⚠️  %%h
        ) else (
            echo   %%c	: 🔄 %%h
        )
    )
)
echo.

echo  ─── RESOURCE USAGE ─────────────────────────────────────────
echo.
docker stats --no-stream --format "  {{.Name}}	CPU: {{.CPUPerc}}	MEM: {{.MemUsage}} ({{.MemPerc}})" 2>nul
echo.

echo  ─── RECENT ERRORS (last 50 lines per container) ────────────
echo.
for %%c in (bc-portal bc-mungkhud uvgard-app) do (
    set "errors=0"
    for /f %%n in ('docker logs --tail 50 %%c 2^>^&1 ^| findstr /i /c:"error" /c:"fail" /c:"malformed" ^| find /c /v ""') do set "errors=%%n"
    if !errors! GTR 0 (
        echo   %%c	: ⚠️  !errors! error(s) in last 50 log lines
    ) else (
        echo   %%c	: ✅ No errors
    )
)
echo.

echo  ─── DISK USAGE ──────────────────────────────────────────────
echo.
docker system df --format "  {{.Type}}	{{.Size}}	(Reclaimable: {{.Reclaimable}})"
echo.

echo  ═════════════════════════════════════════════════════════════
echo.
echo   [1] Restart ALL containers
echo   [2] View logs (bc-portal)
echo   [3] View logs (bc-mungkhud)
echo   [4] View logs (uvgard-app)
echo   [5] Run ERP backup
echo   [6] Run warranty backup
echo   [7] Refresh status
echo   [0] Exit
echo.
set /p choice="  Select option: "

if "%choice%"=="1" (
    echo.
    echo  Restarting all containers...
    docker restart bc-portal bc-mungkhud uvgard-app
    timeout /t 5 /nobreak >nul
    goto menu
)
if "%choice%"=="2" (
    echo.
    docker logs --tail 30 bc-portal
    echo.
    pause
    goto menu
)
if "%choice%"=="3" (
    echo.
    docker logs --tail 30 bc-mungkhud
    echo.
    pause
    goto menu
)
if "%choice%"=="4" (
    echo.
    docker logs --tail 30 uvgard-app
    echo.
    pause
    goto menu
)
if "%choice%"=="5" (
    echo.
    pushd "D:\Work(viriyah desk)\ERP\ERP"
    call auto_backup.bat
    popd
    pause
    goto menu
)
if "%choice%"=="6" (
    echo.
    pushd "D:\Work(viriyah desk)\UV gard films\Warranty"
    call backup.bat
    popd
    pause
    goto menu
)
if "%choice%"=="7" goto menu
if "%choice%"=="0" exit /b 0

echo  Invalid option.
timeout /t 2 /nobreak >nul
goto menu
