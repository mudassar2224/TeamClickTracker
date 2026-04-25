# TeamClickTracker - Complete System Test
# Tests: Signup -> Admin Approval -> Member Signin -> Earnings

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 TeamClickTracker - System Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$BASE_URL = "http://localhost:5000"
$ADMIN_EMAIL = "mudassar.admin@gmail.com"
$ADMIN_PASSWORD = "Mudassar@123"
$TEST_USER_EMAIL = "testuser_$(Get-Random)@test.com"
$TEST_USER_PASSWORD = "TestPass123"
$TEST_USER_NAME = "Test User $(Get-Random)"

Write-Host "✅ Test Configuration:" -ForegroundColor Green
Write-Host "  Backend: $BASE_URL"
Write-Host "  Admin Email: $ADMIN_EMAIL"
Write-Host "  Test User: $TEST_USER_NAME"
Write-Host ""

# Test 1: Admin Signin
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 1: Admin Signin" -ForegroundColor Yellow
Write-Host "=" * 50

$adminSigninBody = @{
    email = $ADMIN_EMAIL
    password = $ADMIN_PASSWORD
} | ConvertTo-Json

try {
    $adminResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/signin" -Method POST `
        -ContentType "application/json" -Body $adminSigninBody
    
    $adminData = $adminResponse.Content | ConvertFrom-Json
    
    if ($adminData.success) {
        Write-Host "✅ Admin signin successful" -ForegroundColor Green
        $adminToken = $adminData.token
        $adminUser = $adminData.user
        Write-Host "   Role: $($adminUser.role)"
        Write-Host "   Token: $($adminToken.Substring(0, 30))..."
    } else {
        Write-Host "❌ Admin signin failed: $($adminData.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during admin signin: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Member Signup
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 2: Member Signup" -ForegroundColor Yellow
Write-Host "=" * 50

$signupBody = @{
    name = $TEST_USER_NAME
    email = $TEST_USER_EMAIL
    password = $TEST_USER_PASSWORD
    confirmPassword = $TEST_USER_PASSWORD
} | ConvertTo-Json

try {
    $signupResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/signup" -Method POST `
        -ContentType "application/json" -Body $signupBody
    
    $signupData = $signupResponse.Content | ConvertFrom-Json
    
    if ($signupData.success) {
        Write-Host "✅ Member signup successful" -ForegroundColor Green
        Write-Host "   Email: $TEST_USER_EMAIL"
        Write-Host "   Status: $($signupData.user.status)"
        Write-Host "   Message: $($signupData.message)"
    } else {
        Write-Host "❌ Signup failed: $($signupData.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during signup: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 3: Admin fetch pending requests
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 3: Admin - Fetch Pending Requests" -ForegroundColor Yellow
Write-Host "=" * 50

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

try {
    $pendingResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/requests/pending" -Method GET `
        -Headers $headers
    
    $pendingData = $pendingResponse.Content | ConvertFrom-Json
    
    if ($pendingData.success) {
        Write-Host "✅ Fetched pending requests: $($pendingData.count) pending" -ForegroundColor Green
        
        if ($pendingData.requests -and $pendingData.requests.Count -gt 0) {
            $pendingData.requests | ForEach-Object {
                Write-Host "   - $($_.email) (Status: $($_.status))"
            }
            
            # Get the request ID for our test user
            $testRequest = $pendingData.requests | Where-Object { $_.email -eq $TEST_USER_EMAIL }
            if ($testRequest) {
                $requestId = $testRequest.id
                Write-Host "   ✅ Found test user request: $requestId" -ForegroundColor Green
            }
        } else {
            Write-Host "⚠️ No pending requests found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Failed to fetch pending requests: $($pendingData.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Error fetching pending requests: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Admin approve member
if ($requestId) {
    Write-Host "=" * 50 -ForegroundColor Yellow
    Write-Host "TEST 4: Admin - Approve Member" -ForegroundColor Yellow
    Write-Host "=" * 50
    
    try {
        $approveResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/requests/approve/$requestId" `
            -Method POST -Headers $headers
        
        $approveData = $approveResponse.Content | ConvertFrom-Json
        
        if ($approveData.success) {
            Write-Host "✅ Member approved successfully" -ForegroundColor Green
            Write-Host "   Message: $($approveData.message)"
        } else {
            Write-Host "❌ Approval failed: $($approveData.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error during approval: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Test 5: Member Signin (after approval)
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 5: Member Signin (After Approval)" -ForegroundColor Yellow
Write-Host "=" * 50

$memberSigninBody = @{
    email = $TEST_USER_EMAIL
    password = $TEST_USER_PASSWORD
} | ConvertTo-Json

try {
    $memberResponse = Invoke-WebRequest -Uri "$BASE_URL/api/auth/signin" -Method POST `
        -ContentType "application/json" -Body $memberSigninBody
    
    $memberData = $memberResponse.Content | ConvertFrom-Json
    
    if ($memberData.success) {
        Write-Host "✅ Member signin successful" -ForegroundColor Green
        $memberToken = $memberData.token
        $memberUser = $memberData.user
        Write-Host "   Role: $($memberUser.role)"
        Write-Host "   Status: $($memberUser.status)"
    } else {
        Write-Host "❌ Member signin failed: $($memberData.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️ Member signin might be pending or token fix needed: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 6: Member fetch earnings
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 6: Member - Fetch Earnings" -ForegroundColor Yellow
Write-Host "=" * 50

if ($memberToken) {
    $memberHeaders = @{
        "Authorization" = "Bearer $memberToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $earningsResponse = Invoke-WebRequest -Uri "$BASE_URL/api/member/earnings" -Method GET `
            -Headers $memberHeaders
        
        $earningsData = $earningsResponse.Content | ConvertFrom-Json
        
        if ($earningsData.success) {
            Write-Host "✅ Member earnings fetched" -ForegroundColor Green
            Write-Host "   Total Earned: $($earningsData.earnings.total)"
            Write-Host "   Total Clicks: $($earningsData.earnings.totalClicks)"
            Write-Host "   Average RPM: $($earningsData.earnings.averageRpm)"
        } else {
            Write-Host "⚠️ Failed to fetch earnings: $($earningsData.message)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Error fetching earnings: $_" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 7: Member fetch articles
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 7: Member - Fetch Articles & Categories" -ForegroundColor Yellow
Write-Host "=" * 50

if ($memberToken) {
    try {
        $articlesResponse = Invoke-WebRequest -Uri "$BASE_URL/api/member/articles" -Method GET `
            -Headers $memberHeaders
        
        $articlesData = $articlesResponse.Content | ConvertFrom-Json
        
        if ($articlesData.success) {
            Write-Host "✅ Articles fetched: $($articlesData.articles.Count) articles" -ForegroundColor Green
            if ($articlesData.articles.Count -gt 0) {
                $articlesData.articles | Select-Object -First 3 | ForEach-Object {
                    Write-Host "   - $($_.title) ($($_.category))"
                }
            }
        } else {
            Write-Host "⚠️ Failed to fetch articles" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Error fetching articles: $_" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 8: Admin fetch member list
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 8: Admin - Fetch Members List" -ForegroundColor Yellow
Write-Host "=" * 50

try {
    $membersResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/members" -Method GET `
        -Headers $headers
    
    $membersData = $membersResponse.Content | ConvertFrom-Json
    
    if ($membersData.success) {
        Write-Host "✅ Members fetched: $($membersData.count) members" -ForegroundColor Green
        $membersData.members | ForEach-Object {
            Write-Host "   - $($_.email) (Earned: \$$($_.totalEarned))"
        }
    } else {
        Write-Host "⚠️ Failed to fetch members: $($membersData.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Error fetching members: $_" -ForegroundColor Yellow
}

Write-Host ""

# Test 9: Admin fetch earnings
Write-Host "=" * 50 -ForegroundColor Yellow
Write-Host "TEST 9: Admin - Fetch Earnings Report" -ForegroundColor Yellow
Write-Host "=" * 50

try {
    $adminEarningsResponse = Invoke-WebRequest -Uri "$BASE_URL/api/admin/earnings" -Method GET `
        -Headers $headers
    
    $adminEarningsData = $adminEarningsResponse.Content | ConvertFrom-Json
    
    if ($adminEarningsData.success) {
        Write-Host "✅ Earnings report fetched" -ForegroundColor Green
        Write-Host "   Total Revenue: \$$($adminEarningsData.summary.totalRevenue)"
        Write-Host "   Total Clicks: $($adminEarningsData.summary.totalClicks)"
        Write-Host "   Average RPM: \$$($adminEarningsData.summary.averageRpm)"
        Write-Host "   Earning Records: $($adminEarningsData.count)"
    } else {
        Write-Host "⚠️ Failed to fetch admin earnings: $($adminEarningsData.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Error fetching admin earnings: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ System Test Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
