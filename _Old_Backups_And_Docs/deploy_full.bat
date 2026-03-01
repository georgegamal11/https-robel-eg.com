@echo off
chcp 65001 >nul
echo.
echo 🚀 جاري نشر النظام بالكامل (Backend + Frontend)...
echo =====================================================
echo buffer size increased to handle large output...

REM 1. Backend
echo 1️⃣ نشر API Worker (Backend)...
call npm run deploy
if errorlevel 1 (
    echo ❌ فشل نشر Worker
    pause
    exit /b 1
)
echo ✅ تم نشر Worker

echo.
REM 2. Frontend
echo 2️⃣ نشر واجهة المستخدم (Frontend)...
call npm run deploy:frontend
if errorlevel 1 (
    echo ❌ فشل نشر الموقع
    pause
    exit /b 1
)
echo ✅ تم نشر الموقع

echo.
echo ✅ اكتمل النشر بالكامل!
pause
