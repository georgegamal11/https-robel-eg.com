@echo off
echo ===================================================
echo DEPLOYING APPLICATION...
echo ===================================================
echo.
echo 1. Deploying Worker Script...
call "C:\Program Files\nodejs\npx.cmd" wrangler deploy
if %ERRORLEVEL% NEQ 0 (
    echo Deployment Failed! Please make sure you ran login_cloudflare.bat first.
    pause
    exit /b
)
echo.
echo 2. Uploading Data (Projects & Buildings)...
call "C:\Program Files\nodejs\npx.cmd" wrangler d1 execute robel --file seed_data.sql --remote
echo.
echo ===================================================
echo DONE! Application should now be working.
echo ===================================================
pause
