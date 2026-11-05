@echo off
title OtakuStream - Web Nonton Anime Bebas Iklan
echo ========================================================
echo   OtakuStream - Server & Cloudflare Online Tunnel
echo ========================================================
echo.

:: Start Node.js server in new window
start "OtakuStream Backend" cmd /k "node server.js"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak >nul

:: Start Cloudflare Tunnel
echo Membuka Akses Online Cloudflare...
.\cloudflared.exe tunnel --url http://localhost:3000

pause
