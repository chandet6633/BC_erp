@echo off
chcp 65001 >nul
echo ═══════════════════════════════════════════════
echo   BC AUTO XPERIENCE — PostgreSQL Backup
echo ═══════════════════════════════════════════════

set BACKUP_DIR=backups
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\bcauto_erp_%TIMESTAMP%.sql

echo.
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [1/2] Dumping PostgreSQL database...
docker exec bcauto-postgres pg_dump -U bcauto -d bcauto_erp > "%BACKUP_FILE%" 2>&1
if errorlevel 1 (
    echo   ERROR: pg_dump failed. Is the bcauto-postgres container running?
) else (
    echo   OK — Database dumped to %BACKUP_FILE%
)

echo.
echo [2/2] Saving backup info...
echo Backup Date: %date% %time% >> "%BACKUP_FILE%.info"
echo Source: PostgreSQL bcauto_erp via docker exec >> "%BACKUP_FILE%.info"
for %%A in ("%BACKUP_FILE%") do echo Size: %%~zA bytes >> "%BACKUP_FILE%.info"

echo.
echo ═══════════════════════════════════════════════
echo   Backup Complete: %BACKUP_FILE%
echo ═══════════════════════════════════════════════
echo.
echo   To restore:
echo     docker exec -i bcauto-postgres psql -U bcauto -d bcauto_erp ^< %BACKUP_FILE%
echo.
pause
