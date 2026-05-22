@echo off
SETLOCAL EnableDelayedExpansion
chcp 65001 >nul
:: ═══════════════════════════════════════════════
::   BC AUTO XPERIENCE — Auto Backup with Rotation
::   O1: Schedule via Windows Task Scheduler
::   Run daily: schtasks /create /tn "ERP_Backup" /tr "D:\path\to\auto_backup.bat" /sc daily /st 22:00
:: ═══════════════════════════════════════════════

set BACKUP_DIR=backups
set KEEP_DAILY=7
set KEEP_WEEKLY=4

:: Create timestamp
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set dt=%%a
set TIMESTAMP=%dt:~0,8%_%dt:~8,4%
set BACKUP_PATH=%BACKUP_DIR%\backup_%TIMESTAMP%

echo [%date% %time%] Starting backup...

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
mkdir "%BACKUP_PATH%" 2>nul

:: Backup MungkhudShop
xcopy /E /Y /Q "MungkhudShop\pb_data" "%BACKUP_PATH%\mungkhud_pb_data\" >nul 2>&1
if errorlevel 1 (echo   WARN: MungkhudShop data not found) else (echo   OK: MungkhudShop)

:: Backup Management
xcopy /E /Y /Q "Management\pb_data" "%BACKUP_PATH%\management_pb_data\" >nul 2>&1
if errorlevel 1 (echo   WARN: Management data not found) else (echo   OK: Management)

:: Save info
echo Backup: %date% %time% > "%BACKUP_PATH%\backup_info.txt"
for /f "tokens=*" %%s in ('dir /s /b "%BACKUP_PATH%" ^| find /c "\"') do echo Files: %%s >> "%BACKUP_PATH%\backup_info.txt"

:: ── Rotation: Keep last N daily backups ──
echo.
echo Rotating old backups (keeping last %KEEP_DAILY%)...
set count=0
for /f "delims=" %%d in ('dir /ad /b /o-n "%BACKUP_DIR%\backup_*" 2^>nul') do (
    set /a count+=1
    if !count! gtr %KEEP_DAILY% (
        echo   Removing: %%d
        rd /s /q "%BACKUP_DIR%\%%d" 2>nul
    )
)

echo.
echo ═══════════════════════════════════════════════
echo   Backup Complete: %BACKUP_PATH%
echo ═══════════════════════════════════════════════
