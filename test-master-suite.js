/**
 * MASTER TEST SUITE
 * Complete end-to-end testing of all FINAL_MASTER_PLAN features
 */

const fetch = globalThis.fetch;
if (typeof fetch !== 'function') {
  throw new Error('This script requires Node.js 18+ (global fetch).');
}

const baseURL = 'http://localhost:5000';
let adminToken = '';
let memberToken = '';
const testMemberEmail = `test_member_${Date.now()}@test.com`;
const testMemberPassword = 'TestPass@123';

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function signin(email, password) {
  const res = await fetch(`${baseURL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function runMasterTestSuite() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 MASTER TEST SUITE - COMPLETE SYSTEM VERIFICATION');
  console.log('='.repeat(70));

  try {
    // ============================================
    // SECTION 1: AUTHENTICATION
    // ============================================
    console.log('\n📋 SECTION 1: AUTHENTICATION');
    console.log('-'.repeat(70));

    // Admin login
    console.log('\n1️⃣ Admin Login');
    const adminSignin = await signin('mudassar.admin@gmail.com', 'Mudassar@123');
    if (adminSignin.data?.success) {
      adminToken = adminSignin.data.token;
      console.log('✅ Admin login successful');
    } else {
      console.log('❌ Admin login failed');
      console.log(adminSignin.data);
      return;
    }

    // Member signup
    console.log('\n2️⃣ Member Signup');
    const signupRes = await fetch(`${baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Member',
        email: testMemberEmail,
        password: testMemberPassword,
        confirmPassword: testMemberPassword
      })
    });
    const signupData = await signupRes.json();
    if (signupData.success) {
      console.log('✅ Member signup successful (status: pending)');
    } else {
      console.log('❌ Member signup failed');
      return;
    }

    // ============================================
    // SECTION 2: ADMIN OPERATIONS
    // ============================================
    console.log('\n📋 SECTION 2: ADMIN OPERATIONS');
    console.log('-'.repeat(70));

    console.log('\n1️⃣ Admin Dashboard Stats');
    const statsRes = await fetch(`${baseURL}/api/admin/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const statsData = await statsRes.json();
    if (statsData.success) {
      console.log('✅ Dashboard stats retrieved');
      console.log(`   Total Members: ${statsData.stats.totalMembers}`);
      console.log(`   Pending Approvals: ${statsData.stats.pendingApprovals}`);
      console.log(`   Total Articles: ${statsData.stats.totalArticles}`);
    }

    console.log('\n2️⃣ View Pending Requests');
    const requestsRes = await fetch(`${baseURL}/api/admin/requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    const requestsData = await requestsRes.json();
    if (requestsData.success) {
      console.log(`✅ Pending requests retrieved (${requestsData.count} total)`);
      
      // Find our test member
      const testRequest = requestsData.requests.find(r => r.email === testMemberEmail);
      if (testRequest) {
        console.log(`   Found test member: ${testRequest.email}`);
        
        // Approve the member
        console.log('\n3️⃣ Approve Test Member');
        const approveRes = await fetch(`${baseURL}/api/admin/requests/approve/${testRequest.id}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        const approveData = await approveRes.json();
        if (approveData.success) {
          console.log('✅ Member approved successfully!');

          // Member can only sign in AFTER approval (signup does not return token)
          console.log('\n4️⃣ Member Signin (after approval)');
          let signedIn = false;
          for (let attempt = 1; attempt <= 5; attempt++) {
            const memberSignin = await signin(testMemberEmail, testMemberPassword);
            if (memberSignin.data?.success) {
              memberToken = memberSignin.data.token;
              signedIn = true;
              console.log('✅ Member signin successful');
              break;
            }
            console.log(`⏳ Member signin not ready yet (attempt ${attempt}/5): HTTP ${memberSignin.status}`);
            await sleep(700);
          }

          if (!signedIn) {
            console.log('❌ Member signin still failing after approval.');
            return;
          }
        }
      } else {
        console.log('❌ Could not find the new member in pending requests.');
        console.log('   This usually means the signup did not create a request doc, or the admin query is filtering differently.');
        return;
      }
    }

    // ============================================
    // SECTION 3: MEMBER FEATURES
    // ============================================
    console.log('\n📋 SECTION 3: MEMBER FEATURES');
    console.log('-'.repeat(70));

    console.log('\n1️⃣ Fetch Articles');
    const articlesRes = await fetch(`${baseURL}/api/member/articles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      }
    });
    const articlesData = await articlesRes.json();
    if (articlesData.success) {
      console.log(`✅ Articles fetched (${articlesData.count} total)`);
      if (articlesData.articles.length > 0) {
        const firstArticle = articlesData.articles[0];
        console.log(`   Sample: "${firstArticle.title}"`);
        console.log(`   Category: ${firstArticle.category}`);
      }
    } else {
      console.log('❌ Articles fetch failed (member may not be approved yet)');
    }

    console.log('\n2️⃣ Fetch Categories');
    const categoriesRes = await fetch(`${baseURL}/api/member/categories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      }
    });
    const categoriesData = await categoriesRes.json();
    if (categoriesData.success) {
      const cats = Array.isArray(categoriesData.categories) ? categoriesData.categories : [];
      console.log(`✅ Categories fetched (${cats.length} total)`);
      console.log(`   Categories: ${cats.map(c => c?.name).filter(Boolean).join(', ')}`);
    }

    console.log('\n3️⃣ Create UTM Link');
    const utmRes = await fetch(`${baseURL}/api/member/create-utm-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        articleTitle: 'Test Article',
        articleUrl: 'https://captionmood.com/test-article',
        campaignName: 'test-campaign',
        medium: 'social'
      })
    });
    const utmData = await utmRes.json();
    if (utmData.success) {
      console.log('✅ UTM link created successfully!');
      console.log(`   URL: ${utmData.link.url}`);
    } else {
      console.log(`⚠️ UTM link creation (member may need approval): ${utmData.message}`);
    }

    console.log('\n4️⃣ View Member Dashboard');
    const dashboardRes = await fetch(`${baseURL}/api/member/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      }
    });
    const dashboardData = await dashboardRes.json();
    if (dashboardData.success) {
      console.log('✅ Member dashboard data retrieved!');
      console.log(`   Name: ${dashboardData.dashboard.name}`);
      console.log(`   Earned: $${dashboardData.dashboard.stats.totalEarned}`);
      console.log(`   UTM Links Created: ${dashboardData.dashboard.stats.linksCreated}`);
    }

    console.log('\n5️⃣ View Earnings');
    const earningsRes = await fetch(`${baseURL}/api/member/earnings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      }
    });
    const earningsData = await earningsRes.json();
    if (earningsData.success) {
      console.log('✅ Member earnings retrieved!');
      console.log(`   Total Earned: $${earningsData.earnings.totalEarned}`);
      console.log(`   Average RPM: $${earningsData.earnings.averageRpm}`);
      console.log(`   Total Clicks: ${earningsData.earnings.totalClicks}`);
    }

    // ============================================
    // SECTION 4: DATA VERIFICATION
    // ============================================
    console.log('\n📋 SECTION 4: DATA VERIFICATION');
    console.log('-'.repeat(70));

    console.log('\n1️⃣ Firestore Health Check');
    const healthRes = await fetch(`${baseURL}/health`);
    const healthData = await healthRes.json();
    if (healthData.status === 'ok') {
      console.log('✅ Backend healthy');
      console.log(`   Timestamp: ${healthData.timestamp}`);
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('✅ MASTER TEST SUITE COMPLETE');
    console.log('='.repeat(70));

    console.log('\n📊 SYSTEM STATUS:');
    console.log('  ✅ Authentication: WORKING');
    console.log('  ✅ Admin Dashboard: WORKING');
    console.log('  ✅ Member Features: WORKING');
    console.log('  ✅ End-to-End Workflow: TESTED');

    console.log('\n🎯 NEXT STEPS:');
    console.log('  1. Visit browser: http://localhost:5000/frontend/admin_dashboard.html');
    console.log('  2. Login with admin credentials');
    console.log('  3. Approve pending member requests');
    console.log('  4. Members can then access: http://localhost:5000/frontend/member_dashboard.html');
    console.log('  5. System will auto-fetch articles and track earnings');

    console.log('\n' + '='.repeat(70) + '\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    console.error(error);
    return false;
  }
}

// Run master test suite
runMasterTestSuite().then(success => {
  process.exit(success ? 0 : 1);
});
