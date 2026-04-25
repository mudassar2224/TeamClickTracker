/**
 * Debug Signin API
 */

const fetch = globalThis.fetch;
if (typeof fetch !== 'function') {
  throw new Error('This script requires Node.js 18+ (global fetch).');
}

async function testSignin() {
  console.log('\n========================================');
  console.log('🔍 SIGNIN API DEBUG TEST');
  console.log('========================================\n');

  const payload = {
    email: 'mudassar.admin@gmail.com',
    password: 'Mudassar@123'
  };

  console.log('Sending signin request...');
  console.log(`URL: http://localhost:5000/api/auth/signin`);
  console.log(`Payload: ${JSON.stringify(payload)}\n`);

  try {
    const response = await fetch('http://localhost:5000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
    console.log(`Response:\n${JSON.stringify(data, null, 2)}\n`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSignin();
