@echo off
chcp 65001 >nul
echo.
echo 🚀 جاري نشر الموقع (Frontend) على Cloudflare Pages...
echo =====================================================
echo.

call npm run deploy:frontend
if errorlevel 1 (
    echo ❌ حدث خطأ أثناء النشر.
    pause
    exit /b 1
)

echo.
echo ✅ تم نشر الموقع بنجاح!
echo.
pause
