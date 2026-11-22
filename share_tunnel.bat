@echo off
title TuneForge - Live Mobile Link Sharing
color 0B

echo ========================================================
echo                 T U N E F O R G E
echo        Mobile Link Sharing (iPhone / iPad / Android)
echo ========================================================
echo.

cd /d "%~dp0"

echo 1. Starting Local TuneForge Engine...
start "TuneForge Fastify Server" /min cmd /c "node backend\index.js"

timeout /t 2 /nobreak >nul

echo 2. Generating Secure HTTPS Link via Cloudflare...
echo.
echo ========================================================
echo LOOK BELOW FOR YOUR ".trycloudflare.com" LINK!
echo Copy that link and send it to your friend on WhatsApp.
echo They can open it on their iPhone, iPad, or Android phone!
echo ========================================================
echo.

set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"
if not exist "%CLOUDFLARED%" (
    set "CLOUDFLARED=cloudflared"
)

"%CLOUDFLARED%" tunnel --url http://127.0.0.1:8000

pause
