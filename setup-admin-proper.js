/**
 * Setup and Verify Admin Account
 */

import { admin, db } from './config/firebase-admin.js';

async function setupAdmin() {
  console.log('\n========================================');
  console.log('🔐 ADMIN ACCOUNT SETUP');
  console.log('========================================\n');

  const adminEmail = 'mudassar.admin@gmail.com';
  const adminPassword = 'Mudassar@123';

  try {
    // Check if admin exists
    console.log('Checking Firestore for admin account...');
    const existingAdmin = await db.collection('users')
      .where('email', '==', adminEmail.toLowerCase())
      .limit(1)
      .get();

    if (!existingAdmin.empty) {
      const adminDoc = existingAdmin.docs[0];
      console.log('✅ Admin account exists!');
      console.log(`   UID: ${adminDoc.id}`);
      console.log(`   Email: ${adminDoc.data().email}`);
      console.log(`   Role: ${adminDoc.data().role}`);
      console.log(`   Status: ${adminDoc.data().status}`);
      return;
    }

    // Create admin account
    console.log('❌ Admin account not found!');
    console.log('Creating admin account in Firestore...\n');

    const adminUID = 'admin_' + Date.now();

    const adminData = {
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      status: 'approved',
      createdAt: admin.firestore.Timestamp.now(),
      earnings: 0,
      articles_shared: 0,
      profile_completed: true
    };

    await db.collection('users').doc(adminUID).set(adminData);

    console.log('✅ Admin account created successfully!');
    console.log(`\n📋 Admin Credentials:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   UID: ${adminUID}`);
    console.log(`   Role: admin`);
    console.log(`   Status: approved\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupAdmin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
