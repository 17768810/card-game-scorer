@echo off
REM Start development servers for card-game-scorer

echo Starting development servers...
echo.

REM Start server
cd /d "%~dp0server"
start "Server" cmd /k "npm run dev"
echo Server started

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Start client
cd /d "%~dp0client"
start "Client" cmd /k "npm run dev"
echo Client started

REM Wait for client to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Both services are running
echo Server: http://localhost:3000
echo Client: http://localhost:5173
echo ========================================
echo.
echo Close the Server and Client windows to stop services
echo.
pause
