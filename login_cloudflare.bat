@echo off
echo ===================================================
echo CLOUDFLARE LOGIN
echo ===================================================
echo.
echo Please wait for the browser to open...
echo.
call "C:\Program Files\nodejs\npx.cmd" wrangler login
echo.
echo If you see "Successfully logged in", you can close this window.
pause
