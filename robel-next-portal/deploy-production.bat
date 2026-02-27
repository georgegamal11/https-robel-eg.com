@echo off
echo ========================================================
echo   ROBEL PORTAL - PRODUCTION DEPLOYMENT SCRIPT
echo ========================================================

:: 1. Deploy API Worker
echo.
echo [1/3] Deploying API Worker...
call npx wrangler deploy worker/index.ts --name robel-api
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to deploy Worker.
    exit /b %ERRORLEVEL%
)
echo [SUCCESS] API Worker deployed!

:: (In a real scenario, we'd fetch the URL here, but for now we remind the user)
echo.
echo [IMPORTANT] Please ensure your Worker URL is set in Cloudflare Pages settings
echo as NEXT_PUBLIC_API_URL environment variable.
echo Example: https://robel-api.your-subdomain.workers.dev
echo.

:: 2. Build Next.js
echo.
echo [2/3] Building Next.js for Cloudflare Pages...
call npx @cloudflare/next-on-pages
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed.
    exit /b %ERRORLEVEL%
)

:: 3. Deploy Frontend
echo.
echo [3/3] Uploading to Cloudflare Pages...
call npx wrangler pages deploy .vercel/output/static --project-name robel-portal
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Deployment failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo   DEPLOYMENT COMPLETE! 🚀
echo ========================================================
pause
