@echo off
title BC AUTO MANAGEMENT SYSTEM
cd /d "%~dp0"
color 0A
cls

echo.
echo  ==================================================================
echo.
echo    BBBBBB   CCCCC      AAA   UU   UU TTTTTTT  OOOOO
echo    BB   BB CC    C    AAAA   UU   UU   TTT   OO   OO
echo    BBBBBB  CC        AA  AA  UU   UU   TTT   OO   OO
echo    BB   BB CC    C  AAAAAAAA UU   UU   TTT   OO   OO
echo    BBBBBB   CCCCC  AA      AA UUUUU    TTT    OOOOO
echo.
echo  ==================================================================
echo          BC AUTO MANAGEMENT - UNIFIED SYSTEM READY
echo  ==================================================================
echo.
echo  [1] Start Local Server (Production)
echo  [2] Start Local Server (Development / Vite HMR)
echo  [3] Run Cloudflare Tunnel (Custom Domain)
echo.

set "code="
if exist "cf_token.txt" (
    echo  [ENTER] QUICK START: Launch Server + Cloudflare Tunnel
    set /p code="Select Option (1-3) or press ENTER for Quick Start: "
) else (
    set /p code="Select Option (1-3) or press ENTER for Local (1): "
)

if "%code%"=="" (
    if exist "cf_token.txt" goto QUICKSTART
    goto LOCAL
)
if "%code%"=="2" goto DEV
if "%code%"=="3" goto CLOUDFLARE
goto LOCAL

:QUICKSTART
cls
echo  ==================================================================
echo      QUICK START: SERVER + CLOUDFLARE TUNNEL
echo  ==================================================================
echo.
echo  [1/2] Starting PocketBase Server...
tasklist /FI "IMAGENAME eq pocketbase.exe" | find /i "pocketbase.exe" >nul
if %errorlevel% equ 0 (
    echo PocketBase is already running.
) else (
    start "BC AUTO Server" pocketbase.exe serve --http="0.0.0.0:8092"
    timeout /t 2 /nobreak >nul
)

echo  [2/2] Starting Cloudflare Tunnel...
set /p cf_token=<cf_token.txt
tasklist /FI "IMAGENAME eq cloudflared.exe" | find /i "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    taskkill /F /IM cloudflared.exe >nul 2>&1
)
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --logfile cloudflare.log run --token %cf_token% || pause"

echo.
echo  [3/3] Launching Browser (No Cache)...
start msedge --inprivate https://bcauto.work

echo.
echo  ==================================================================
echo  SUCCESS! Everything is launching.
echo  - Local Dashboard: http://localhost:8092/pages/main/index.html
echo  - Public URL: https://bcauto.work
echo  - Browser: Opened in InPrivate mode to prevent caching.
echo  ==================================================================
echo.
pause
exit

:DEV
cls
echo  ==================================================================
echo      DEVELOPMENT MODE (Vite HMR)
echo  ==================================================================
echo.
echo  [1/2] Starting PocketBase Backend...
start "PocketBase Backend" pocketbase.exe serve
    
echo  [2/2] Starting Vite Dev Server...
start "Vite Dev Server" cmd /c "npm run dev"
pause
exit

:CLOUDFLARE
cls
echo  ==================================================================
echo      CLOUDFLARE TUNNEL (CUSTOM DOMAIN)
echo  ==================================================================
echo.
echo  [1/3] Building Frontend...
call npm run build
echo.
echo  [2/3] Preparing Static Files...
echo  (Vite now builds directly to dist, so no manual copy is needed)
echo.
echo  [3/3] Starting Local Server...

:: Check if PocketBase is already running
tasklist /FI "IMAGENAME eq pocketbase.exe" | find /i "pocketbase.exe" >nul
if %errorlevel% equ 0 (
    echo PocketBase is already running.
) else (
    start "BC AUTO Server" pocketbase.exe serve --http="0.0.0.0:8092"
    timeout /t 3 /nobreak >nul
)

echo.
echo  ==================================================================
echo  Your Application is now securely running on Port 8092!
echo.
ipconfig | findstr /i "IPv4"
echo.
echo  ==================================================================
echo  CLOUDFLARE TUNNEL CONFIGURATION
echo  ==================================================================

set "cf_token="
if exist "cf_token.txt" (
    set /p cf_token=<cf_token.txt
    echo  [FOUND] Saved token detected: %cf_token:~0,8%...
    echo.
    echo  [1] Use saved token (Recommended)
    echo  [2] Enter a new token
    echo.
    set /p choice="Select Option (1-2) or press ENTER for Saved (1): "
    if "%choice%"=="2" (
        set "cf_token="
    )
)

if "%cf_token%"=="" (
    echo.
    set /p cf_token="Enter Cloudflare Token (ey...): "
    if not "%cf_token%"=="" (
        echo %cf_token%>cf_token.txt
    )
)

if "%cf_token%"=="" (
    echo.
    echo  Server is running in the other window. You can close this window.
    pause >nul
    exit
)

if not exist "cloudflared.exe" (
    echo Downloading cloudflared...
    curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
)

:: Check if cloudflared is already running and kill it to ensure fresh start with new token
tasklist /FI "IMAGENAME eq cloudflared.exe" | find /i "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    echo Restarting Cloudflare Tunnel...
    taskkill /F /IM cloudflared.exe >nul 2>&1
)

echo.
echo Starting Cloudflare Tunnel connection to your domain...
echo Errors will be logged to: cloudflare.log
:: Fix: --logfile is a global option and must come BEFORE the 'run' command
start "Cloudflare Tunnel" cmd /k "cloudflared.exe tunnel --logfile cloudflare.log run --token %cf_token% || pause"
echo.
echo Tunnel process started in a new window.
echo Please check your Cloudflare Dashboard for status.
pause
exit

:LOCAL
cls
echo  ==================================================================
echo      LOCAL PRODUCTION MODE
echo  ==================================================================
echo.
echo  [1/3] Building Frontend...
call npm run build
echo.
echo  [2/3] Preparing Static Files...
echo  (Vite now builds directly to dist, so no manual copy is needed)
echo.
echo  [3/3] Starting PocketBase Server...
echo  ---------------------------------------------------
echo  SUCCESS! Your dashboard is now online.
echo  Access it from: http://localhost:8092/pages/main/index.html
echo  ---------------------------------------------------
echo.
start http://localhost:8092/pages/main/index.html
pocketbase.exe serve --http="0.0.0.0:8092"
pause
