@echo off
REM TeamClickTracker - System Test
REM Tests: Signup, Admin Approval, Earnings

echo.
echo ====================================================
echo TeamClickTracker - Complete System Test
echo ====================================================
echo.

setlocal enabledelayedexpansion

set "BASE_URL=http://localhost:5000"
set "ADMIN_EMAIL=mudassar.admin@gmail.com"
set "ADMIN_PASSWORD=Mudassar@123"

REM Generate random user
for /f %%A in ('powershell -Command "Get-Random"') do set "RANDOM_NUM=%%A"
set "TEST_EMAIL=testuser_%RANDOM_NUM%@test.com"
set "TEST_PASSWORD=TestPass123"
set "TEST_NAME=Test User %RANDOM_NUM%"

echo [TEST CONFIG]
echo Backend: %BASE_URL%
echo Admin Email: %ADMIN_EMAIL%
echo Test User: %TEST_EMAIL%
echo.

REM TEST 1: Admin Signin
echo [TEST 1] Admin Signin...
curl -s -X POST "%BASE_URL%/api/auth/signin" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"%ADMIN_EMAIL%\",\"password\":\"%ADMIN_PASSWORD%\"}" > admin_login.json

findstr /C:"\"success\":true" admin_login.json >nul
if errorlevel 1 (
    echo FAILED: Admin signin failed
    type admin_login.json
    goto end
)

echo SUCCESS: Admin signed in

REM Extract admin token using PowerShell
for /f %%i in ('powershell -Command "(Get-Content admin_login.json | ConvertFrom-Json).token"') do set "ADMIN_TOKEN=%%i"

echo Admin Token: %ADMIN_TOKEN:~0,30%...
echo.

REM TEST 2: Member Signup
echo [TEST 2] Member Signup...
curl -s -X POST "%BASE_URL%/api/auth/signup" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%TEST_NAME%\",\"email\":\"%TEST_EMAIL%\",\"password\":\"%TEST_PASSWORD%\",\"confirmPassword\":\"%TEST_PASSWORD%\"}" > signup.json

findstr /C:"\"success\":true" signup.json >nul
if errorlevel 1 (
    echo FAILED: Signup failed
    type signup.json
    goto end
)

echo SUCCESS: Member signed up
echo Email: %TEST_EMAIL%
echo.

REM TEST 3: Admin fetch pending requests
echo [TEST 3] Admin - Fetch Pending Requests...
curl -s -X GET "%BASE_URL%/api/admin/requests/pending" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" > pending.json

findstr /C:"\"success\":true" pending.json >nul
if errorlevel 1 (
    echo FAILED: Could not fetch pending requests
    type pending.json
    goto end
)

findstr /C:"%TEST_EMAIL%" pending.json >nul
if errorlevel 1 (
    echo WARNING: Test user not in pending requests
    type pending.json
) else (
    echo SUCCESS: Found test user in pending requests
    
    REM Extract request ID
    for /f %%i in ('powershell -Command "(Get-Content pending.json | ConvertFrom-Json).requests | Where-Object {$_.email -eq \"%TEST_EMAIL%\"} | Select-Object -First 1 | foreach {$_.id}"') do set "REQUEST_ID=%%i"
    echo Request ID: !REQUEST_ID!
    echo.
    
    REM TEST 4: Admin approve member
    echo [TEST 4] Admin - Approve Member...
    curl -s -X POST "%BASE_URL%/api/admin/requests/approve/!REQUEST_ID!" ^
      -H "Authorization: Bearer %ADMIN_TOKEN%" > approve.json
    
    findstr /C:"\"success\":true" approve.json >nul
    if errorlevel 1 (
        echo FAILED: Could not approve member
        type approve.json
    ) else (
        echo SUCCESS: Member approved
        echo.
        
        REM TEST 5: Member signin
        echo [TEST 5] Member Signin...
        curl -s -X POST "%BASE_URL%/api/auth/signin" ^
          -H "Content-Type: application/json" ^
          -d "{\"email\":\"%TEST_EMAIL%\",\"password\":\"%TEST_PASSWORD%\"}" > member_login.json
        
        findstr /C:"\"success\":true" member_login.json >nul
        if errorlevel 1 (
            echo FAILED: Member signin failed
            type member_login.json
        ) else (
            echo SUCCESS: Member signed in
            
            for /f %%i in ('powershell -Command "(Get-Content member_login.json | ConvertFrom-Json).token"') do set "MEMBER_TOKEN=%%i"
            echo Member Token: !MEMBER_TOKEN:~0,30%...
            echo.
            
            REM TEST 6: Member fetch articles
            echo [TEST 6] Member - Fetch Articles...
            curl -s -X GET "%BASE_URL%/api/member/articles" ^
              -H "Authorization: Bearer !MEMBER_TOKEN!" > articles.json
            
            findstr /C:"\"success\":true" articles.json >nul
            if errorlevel 1 (
                echo FAILED: Articles fetch failed
            ) else (
                echo SUCCESS: Articles fetched
                type articles.json | find "\"count\""
                echo.
            )
            
            REM TEST 7: Member fetch earnings
            echo [TEST 7] Member - Fetch Earnings...
            curl -s -X GET "%BASE_URL%/api/member/earnings" ^
              -H "Authorization: Bearer !MEMBER_TOKEN!" > earnings.json
            
            findstr /C:"\"success\":true" earnings.json >nul
            if errorlevel 1 (
                echo FAILED: Earnings fetch failed
            ) else (
                echo SUCCESS: Earnings fetched
                type earnings.json | find "\"total\""
                type earnings.json | find "\"averageRpm\""
                echo.
            )
            
            REM TEST 8: Member fetch statistics
            echo [TEST 8] Member - Fetch Statistics...
            curl -s -X GET "%BASE_URL%/api/member/statistics" ^
              -H "Authorization: Bearer !MEMBER_TOKEN!" > stats.json
            
            findstr /C:"\"success\":true" stats.json >nul
            if errorlevel 1 (
                echo FAILED: Statistics fetch failed
            ) else (
                echo SUCCESS: Statistics fetched
                type stats.json | find "\"totalLinks\""
                type stats.json | find "\"totalClicks\""
                type stats.json | find "\"averageRpm\""
                echo.
            )
        )
    )
)

REM TEST 9: Admin fetch members
echo [TEST 9] Admin - Fetch Members...
curl -s -X GET "%BASE_URL%/api/admin/members" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" > admin_members.json

findstr /C:"\"success\":true" admin_members.json >nul
if errorlevel 1 (
    echo FAILED: Admin could not fetch members
) else (
    echo SUCCESS: Admin fetched members
    type admin_members.json | find "\"count\""
    echo.
)

REM TEST 10: Admin fetch earnings
echo [TEST 10] Admin - Fetch Earnings...
curl -s -X GET "%BASE_URL%/api/admin/earnings" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" > admin_earnings.json

findstr /C:"\"success\":true" admin_earnings.json >nul
if errorlevel 1 (
    echo FAILED: Admin could not fetch earnings
) else (
    echo SUCCESS: Admin fetched earnings
    type admin_earnings.json | find "\"totalRevenue\""
    type admin_earnings.json | find "\"totalClicks\""
    type admin_earnings.json | find "\"averageRpm\""
    echo.
)

:end
echo ====================================================
echo Test Complete
echo ====================================================
echo.

REM Clean up
del admin_login.json signup.json pending.json approve.json member_login.json articles.json earnings.json stats.json admin_members.json admin_earnings.json 2>nul

pause
