@echo off
echo ========================================
echo Starting MungkhudShop System...
echo ========================================

cd /d "%~dp0"

echo [1/2] Starting PocketBase Database (Port 8091)...
start "Mungkhud Database" cmd /c "pocketbase.exe serve --http=127.0.0.1:8091"

timeout /t 2 /nobreak > NUL

echo [2/2] Starting Web Application (Vite on Port 4000)...
start "Mungkhud Web App" cmd /c "npm run dev"

echo.
echo ========================================
echo MungkhudShop is now running!
echo The database and web server are running in separate background windows.
echo.
echo Please open your browser and go to:
echo Frontend: http://localhost:4000
echo Backend:  http://127.0.0.1:8091/_/
echo ========================================
echo.
pause
