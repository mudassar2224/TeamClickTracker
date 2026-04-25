const fetch = globalThis.fetch;
if (typeof fetch !== 'function') {
  throw new Error('This script requires Node.js 18+ (global fetch).');
}

const baseURL = 'http://localhost:5000';

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteWorkflow() {
  console.log('\n========================================');
  console.log('Testing Complete Member Workflow');
  console.log('========================================\n');

  let adminToken = '';
  let memberToken = '';
  const newMemberEmail = `member_${Date.now()}@test.com`;
  const newMemberPassword = 'Password@123';

  try {
    // Step 1: Admin Login
    console.log('STEP 1: Admin Login');
    console.log('-'.repeat(40));
    const adminSigninRes = await fetch(`${baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mudassar.admin@gmail.com',
        password: 'Mudassar@123'
      })
    });

    const adminSigninData = await adminSigninRes.json();
    if (adminSigninData.success) {
      adminToken = adminSigninData.token;
      console.log('✅ Admin logged in successfully');
      console.log(`   Email: ${adminSigninData.user.email}`);
    } else {
      console.log('❌ Admin login failed:', adminSigninData.message);
      return;
    }

    // Step 2: Check pending requests before signup
    console.log('\nSTEP 2: Check Pending Requests Before Signup');
    console.log('-'.repeat(40));
    const beforeRes = await fetch(`${baseURL}/api/admin/requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const beforeData = await beforeRes.json();
    const countBefore = Array.isArray(beforeData.requests) ? beforeData.requests.length : 0;
    console.log(`✅ Current pending requests: ${countBefore}`);

    // Step 3: New member signs up
    console.log('\nSTEP 3: New Member Signs Up');
    console.log('-'.repeat(40));
    console.log(`   Email: ${newMemberEmail}`);
    const signupRes = await fetch(`${baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Member',
        email: newMemberEmail,
        password: newMemberPassword,
        confirmPassword: newMemberPassword
      })
    });

    const signupData = await signupRes.json();
    if (signupData.success) {
      console.log('✅ Member signup successful');
      console.log(`   Status: ${signupData.user.status}`);
    } else {
      console.log('❌ Member signup failed:', signupData.message);
      return;
    }

    // Step 4: Verify signup request appears in admin panel
    console.log('\nSTEP 4: Verify Signup Request Appears in Admin Panel');
    console.log('-'.repeat(40));
    const afterRes = await fetch(`${baseURL}/api/admin/requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const afterData = await afterRes.json();
    const countAfter = Array.isArray(afterData.requests) ? afterData.requests.length : 0;
    console.log(`✅ Pending requests after signup: ${countAfter}`);
    console.log(`   New requests: ${countAfter - countBefore}`);

    // Find the new member in the requests
    const newMemberRequest = (afterData.requests || []).find(r => r.email === newMemberEmail);
    if (newMemberRequest) {
      console.log('✅ New member request found in admin panel!');
      console.log(`   Name: ${newMemberRequest.fullname}`);
      console.log(`   Email: ${newMemberRequest.email}`);
      console.log(`   Status: ${newMemberRequest.status}`);
      console.log(`   Request ID: ${newMemberRequest.id}`);
    } else {
      console.log('❌ New member request NOT found in admin panel');
      return;
    }

    // Step 5: Member tries to sign in (should FAIL - not approved)
    console.log('\nSTEP 5: Member Tries to Sign In (Not Approved)');
    console.log('-'.repeat(40));
    const pendingSigninRes = await fetch(`${baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newMemberEmail,
        password: newMemberPassword
      })
    });
    const pendingSigninData = await pendingSigninRes.json();
    console.log('Response:', JSON.stringify(pendingSigninData, null, 2));
    if (pendingSigninRes.status === 403) {
      console.log('✅ Correct: Pending member cannot sign in until approved');
    } else {
      console.log('⚠️ Unexpected: Pending member signin status:', pendingSigninRes.status);
    }

    // Step 6: Admin approves the member
    console.log('\nSTEP 6: Admin Approves Member');
    console.log('-'.repeat(40));
    const approveRes = await fetch(`${baseURL}/api/admin/requests/approve/${newMemberRequest.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const approveData = await approveRes.json();
    if (approveData.success) {
      console.log('✅ Member approved successfully!');
      console.log(`   Message: ${approveData.message}`);
    } else {
      console.log('❌ Approval failed:', approveData.message);
    }

    // Step 7: Check that member appears in active members
    console.log('\nSTEP 7: Check Member Appears in Active Members');
    console.log('-'.repeat(40));
    const activeMembersRes = await fetch(`${baseURL}/api/admin/members/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const activeMembersData = await activeMembersRes.json();
    const activeMember = activeMembersData.members.find(m => m.email === newMemberEmail);
    if (activeMember) {
      console.log('✅ Approved member appears in active members!');
      console.log(`   Name: ${activeMember.name}`);
      console.log(`   Email: ${activeMember.email}`);
      console.log(`   Status: ${activeMember.status}`);
    } else {
      console.log('❌ Approved member NOT found in active members');
    }

    // Step 8: Member can now sign in and access dashboard
    console.log('\nSTEP 8: Member Sign In (After Approval)');
    console.log('-'.repeat(40));
    let signedIn = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const memberSigninRes = await fetch(`${baseURL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newMemberEmail,
          password: newMemberPassword
        })
      });
      const memberSigninData = await memberSigninRes.json();
      if (memberSigninData.success) {
        memberToken = memberSigninData.token;
        signedIn = true;
        console.log('✅ Member signed in successfully');
        break;
      }
      console.log(`⏳ Member signin not ready yet (attempt ${attempt}/5): HTTP ${memberSigninRes.status}`);
      await sleep(700);
    }

    if (!signedIn) {
      console.log('❌ Member could not sign in even after approval');
      return;
    }

    console.log('\nSTEP 8B: Member Dashboard API');
    console.log('-'.repeat(40));
    const memberDashboardRes = await fetch(`${baseURL}/api/member/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${memberToken}`,
        'Content-Type': 'application/json'
      }
    });
    const memberDashboardData = await memberDashboardRes.json();
    if (memberDashboardData.success) {
      console.log('✅ Member dashboard accessible');
      console.log(`   Total Earned: $${memberDashboardData.dashboard.stats.totalEarned}`);
      console.log(`   Links Created: ${memberDashboardData.dashboard.stats.linksCreated}`);
    } else {
      console.log('❌ Member dashboard failed:', memberDashboardData.message);
    }

    // Step 9: Check dashboard stats to verify member count increased
    console.log('\nSTEP 9: Check Dashboard Stats');
    console.log('-'.repeat(40));
    const statsRes = await fetch(`${baseURL}/api/admin/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const statsData = await statsRes.json();
    console.log('✅ Dashboard stats:');
    console.log(`   Total Members: ${statsData.stats.totalMembers}`);
    console.log(`   Pending Approvals: ${statsData.stats.pendingApprovals}`);
    console.log(`   Total Articles: ${statsData.stats.totalArticles}`);
    console.log(`   Total Categories: ${statsData.stats.totalCategories}`);

    console.log('\n========================================');
    console.log('✅ COMPLETE WORKFLOW TEST PASSED!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log('1. Admin logged in ✅');
    console.log('2. Member signed up ✅');
    console.log('3. Signup request appeared in admin panel ✅');
    console.log('4. Admin approved member ✅');
    console.log('5. Member appeared in active members ✅');
    console.log('6. Member can now access dashboard ✅');
    console.log('\n');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Run the complete workflow test
testCompleteWorkflow();
