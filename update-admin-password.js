/**
 * Update Admin Account with Password
 */

import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./config/google-analytics-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'utm-tracker-5802e'
});

const db = admin.firestore();

async function updateAdminPassword() {
  console.log('\n========================================');
  console.log('🔐 UPDATE ADMIN PASSWORD');
  console.log('========================================\n');

  const adminUID = 'pBf6osxCjjd1XyQ5r8vdZ6FeYzs1';
  const newPassword = 'Mudassar@123';

  try {
    console.log(`Updating admin account: ${adminUID}`);
    console.log(`New password: ${newPassword}\n`);

    await db.collection('users').doc(adminUID).update({
      password: newPassword,
      name: 'Admin User',
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log('✅ Admin password updated successfully!\n');

    // Verify the update
    const updatedDoc = await db.collection('users').doc(adminUID).get();
    const data = updatedDoc.data();

    console.log('Updated admin account:');
    console.log(`  Email: ${data.email}`);
    console.log(`  Role: ${data.role}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Password: ${data.password}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

updateAdminPassword();
