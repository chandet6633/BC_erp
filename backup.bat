@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   BC AUTO XPERIENCE — One-Click Backup
echo ═══════════════════════════════════════════════

set BACKUP_DIR=backups
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_PATH=%BACKUP_DIR%\backup_%TIMESTAMP%

echo.
echo Creating backup directory: %BACKUP_PATH%
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
mkdir "%BACKUP_PATH%" 2>nul

echo.
echo [1/3] Backing up MungkhudShop data...
xcopy /E /Y /Q "MungkhudShop\pb_data" "%BACKUP_PATH%\mungkhud_pb_data\" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: MungkhudShop data not found or copy failed
) else (
    echo   OK — MungkhudShop data backed up
)

echo.
echo [2/3] Backing up Management data...
xcopy /E /Y /Q "Management\pb_data" "%BACKUP_PATH%\management_pb_data\" >nul 2>&1
if errorlevel 1 (
    echo   WARNING: Management data not found or copy failed
) else (
    echo   OK — Management data backed up
)

echo.
echo [3/3] Saving backup info...
echo Backup Date: %date% %time% > "%BACKUP_PATH%\backup_info.txt"
echo Source: MungkhudShop\pb_data, Management\pb_data >> "%BACKUP_PATH%\backup_info.txt"

echo.
echo ═══════════════════════════════════════════════
echo   Backup Complete: %BACKUP_PATH%
echo ═══════════════════════════════════════════════
echo.
pause
