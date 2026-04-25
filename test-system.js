/**
 * System Testing Script
 * Tests backend API endpoints
 */

const fetch = globalThis.fetch;
if (typeof fetch !== 'function') {
  throw new Error('This script requires Node.js 18+ (global fetch).');
}

const BASE_URL = 'http://localhost:5000';

console.log('\n========================================');
console.log('🧪 TEAMCLICKTRACKER SYSTEM TEST');
console.log('========================================\n');

async function test(name, fn) {
  try {
    console.log(`Testing: ${name}...`);
    await fn();
    console.log(`✅ PASS: ${name}\n`);
    return true;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function testHealthCheck() {
  const response = await fetch(`${BASE_URL}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data.status || data.status !== 'ok') throw new Error('Invalid health response');
  console.log(`  Response: ${JSON.stringify(data)}`);
}

async function testSigninAdmin() {
  const response = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mudassar.admin@gmail.com',
      password: 'Mudassar@123'
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  
  if (!data.success) throw new Error(data.error || 'Signin failed');
  if (!data.user || data.user.role !== 'admin') throw new Error('Not admin role');
  if (!data.token) throw new Error('No token returned');
  
  console.log(`  Admin Email: ${data.user.email}`);
  console.log(`  Admin Role: ${data.user.role}`);
  console.log(`  Token: ${data.token.substring(0, 50)}...`);
}

async function testSignupNewMember() {
  const timestamp = Date.now();
  const testEmail = `testmember${timestamp}@example.com`;
  
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Test Member ${timestamp}`,
      email: testEmail,
      password: 'TestPass@123',
      confirmPassword: 'TestPass@123'
    })
  });
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  
  if (!data.success) throw new Error(data.error || 'Signup failed');
  if (!data.user || data.user.status !== 'pending') throw new Error('Not pending status');
  
  console.log(`  New Member Email: ${data.user.email}`);
  console.log(`  New Member Status: ${data.user.status}`);
  console.log(`  New Member UID: ${data.user.uid}`);
}

async function testVerifyToken() {
  // First signin
  const signinResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mudassar.admin@gmail.com',
      password: 'Mudassar@123'
    })
  });
  
  const signinData = await signinResponse.json();
  const token = signinData.token;
  
  // Verify token
  const verifyResponse = await fetch(`${BASE_URL}/api/auth/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  if (!verifyResponse.ok) throw new Error(`HTTP ${verifyResponse.status}`);
  const verifyData = await verifyResponse.json();
  
  if (!verifyData.valid) throw new Error('Token not valid');
  
  console.log(`  Token Valid: ${verifyData.valid}`);
  console.log(`  Verified User: ${verifyData.user.email}`);
}

// Run all tests
async function runAllTests() {
  const results = [];
  
  results.push(await test('Health Check Endpoint', testHealthCheck));
  results.push(await test('Admin Signin', testSigninAdmin));
  results.push(await test('New Member Signup', testSignupNewMember));
  results.push(await test('Token Verification', testVerifyToken));
  
  console.log('========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('System is ready for use.\n');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed.\n`);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
