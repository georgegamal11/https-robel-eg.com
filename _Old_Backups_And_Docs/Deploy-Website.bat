@echo off
echo ==================================================
echo         ROBEL REAL ESTATE - DEPLOYMENT TOOL
echo ==================================================
echo.

echo [1/2] Updating Files Version (Cache Busting)...
powershell -ExecutionPolicy Bypass -File deploy-cache-bust.ps1
echo.

echo [2/2] Uploading to Cloudflare (Deploying)...
call npm run deploy:frontend
echo.

echo ==================================================
echo   DONE! Your Website is Updated Successfully.
echo ==================================================
pause
