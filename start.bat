@echo off
title TuneForge (Fastify) - Car-Ready YouTube & Spotify MP3 Downloader
color 0B

echo ========================================================
echo                 T U N E F O R G E
echo            Fastify + React Audio Engine
echo ========================================================
echo.

cd /d "%~dp0"

echo Starting Fastify Server on http://127.0.0.1:8000 ...
echo Output directory: %USERPROFILE%\Downloads\TuneForge
echo.

:: Launch the browser after 2 seconds in background
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"

:: Start the Fastify backend server
node backend\index.js

pause
