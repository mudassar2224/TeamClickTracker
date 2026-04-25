@echo off
REM Simple Python Web Server for Team Click Tracker
REM This file starts a local server so you can test your app

cls
color 0A
echo.
echo ========================================
echo   Team Click Tracker - Local Web Server
echo ========================================
echo.
echo Starting server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    echo.
    pause
    exit /b 1
)

REM Start Python server on port 5000
echo Server will run on: http://localhost:5000/
echo.
echo Files available:
echo   - Welcome:  http://localhost:5000/welcome.html
echo   - Login:    http://localhost:5000/frontend/index.html
echo   - Signup:   http://localhost:5000/frontend/signup.html
echo   - Diagnostics: http://localhost:5000/diagnostics.html
echo.
echo Press CTRL+C to stop the server
echo.
echo ========================================
echo Launching server...
echo ========================================
echo.

cd /d %~dp0
python -m http.server 5000 --bind 127.0.0.1

pause
