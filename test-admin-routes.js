const fetch = globalThis.fetch;
if (typeof fetch !== 'function') {
  throw new Error('This script requires Node.js 18+ (global fetch).');
}

const baseURL = 'http://localhost:5000';
let adminToken = '';

async function testAdminRoutes() {
  console.log('\n========================================');
  console.log('Testing Admin Routes');
  console.log('========================================\n');

  try {
    // Step 1: Admin signin to get token
    console.log('1. Testing Admin Signin...');
    const signinRes = await fetch(`${baseURL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mudassar.admin@gmail.com',
        password: 'Mudassar@123'
      })
    });

    const signinData = await signinRes.json();
    if (signinData.success) {
      adminToken = signinData.token;
      console.log('✅ Admin signin successful');
      console.log(`   Email: ${signinData.user.email}`);
      console.log(`   Role: ${signinData.user.role}`);
    } else {
      console.log('❌ Admin signin failed:', signinData.message);
      return;
    }

    // Step 2: Test dashboard stats endpoint
    console.log('\n2. Testing Dashboard Stats Endpoint...');
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
      console.log(`   Total Categories: ${statsData.stats.totalCategories}`);
    } else {
      console.log('❌ Dashboard stats failed:', statsData.message);
    }

    // Step 3: Test pending requests endpoint
    console.log('\n3. Testing Pending Requests Endpoint...');
    const requestsRes = await fetch(`${baseURL}/api/admin/requests/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const requestsData = await requestsRes.json();
    if (requestsData.success) {
      console.log('✅ Pending requests retrieved');
      console.log(`   Count: ${requestsData.count}`);
      if (requestsData.requests.length > 0) {
        console.log('   Requests:');
        requestsData.requests.forEach((req, idx) => {
          console.log(`     ${idx + 1}. ${req.email} (${req.fullname}) - ${req.status}`);
        });
      } else {
        console.log('   (No pending requests)');
      }
    } else {
      console.log('❌ Pending requests failed:', requestsData.message);
    }

    // Step 4: Test active members endpoint
    console.log('\n4. Testing Active Members Endpoint...');
    const membersRes = await fetch(`${baseURL}/api/admin/members/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const membersData = await membersRes.json();
    if (membersData.success) {
      console.log('✅ Active members retrieved');
      console.log(`   Count: ${membersData.count}`);
      if (membersData.members.length > 0) {
        console.log('   Members:');
        membersData.members.forEach((member, idx) => {
          console.log(`     ${idx + 1}. ${member.email} (${member.name})`);
        });
      } else {
        console.log('   (No active members)');
      }
    } else {
      console.log('❌ Active members failed:', membersData.message);
    }

    // Step 5: Test articles endpoint
    console.log('\n5. Testing Articles Endpoint...');
    const articlesRes = await fetch(`${baseURL}/api/admin/articles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const articlesData = await articlesRes.json();
    if (articlesData.success) {
      console.log('✅ Articles retrieved');
      console.log(`   Count: ${articlesData.count}`);
      if (articlesData.articles.length > 0) {
        console.log(`   (Showing first 3 of ${articlesData.articles.length})`);
        articlesData.articles.slice(0, 3).forEach((article, idx) => {
          console.log(`     ${idx + 1}. ${article.title} (${article.category})`);
        });
      }
    } else {
      console.log('❌ Articles failed:', articlesData.message);
    }

    // Step 6: Test categories endpoint
    console.log('\n6. Testing Categories Endpoint...');
    const categoriesRes = await fetch(`${baseURL}/api/admin/categories`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });

    const categoriesData = await categoriesRes.json();
    if (categoriesData.success) {
      console.log('✅ Categories retrieved');
      console.log(`   Count: ${categoriesData.count}`);
      if (categoriesData.categories.length > 0) {
        console.log(`   (Showing first 5 of ${categoriesData.categories.length})`);
        categoriesData.categories.slice(0, 5).forEach((cat, idx) => {
          console.log(`     ${idx + 1}. ${cat.name} (${cat.count} articles)`);
        });
      }
    } else {
      console.log('❌ Categories failed:', categoriesData.message);
    }

    console.log('\n========================================');
    console.log('✅ All admin route tests completed');
    console.log('========================================\n');

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

// Run tests
testAdminRoutes();
