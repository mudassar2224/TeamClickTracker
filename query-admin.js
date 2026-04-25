/**
 * Query Firestore for admin account
 */

import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./config/google-analytics-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'utm-tracker-5802e'
});

const db = admin.firestore();

async function queryAdmin() {
  console.log('\n========================================');
  console.log('📋 QUERY ADMIN ACCOUNTS');
  console.log('========================================\n');

  try {
    // Query all admin accounts
    const adminQuery = await db.collection('users')
      .where('role', '==', 'admin')
      .get();

    console.log(`Found ${adminQuery.size} admin account(s):\n`);

    adminQuery.forEach(doc => {
      console.log(`UID: ${doc.id}`);
      console.log(`Data:`);
      console.log(JSON.stringify(doc.data(), null, 2));
      console.log('-----------------------------------\n');
    });

    // Query by email
    const emailQuery = await db.collection('users')
      .where('email', '==', 'mudassar.admin@gmail.com')
      .get();

    console.log(`\nQuery by email "mudassar.admin@gmail.com": Found ${emailQuery.size} account(s)\n`);

    if (emailQuery.size > 0) {
      emailQuery.forEach(doc => {
        console.log(`UID: ${doc.id}`);
        console.log(`Email: ${doc.data().email}`);
        console.log(`Role: ${doc.data().role}`);
        console.log(`Password stored: ${doc.data().password}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

queryAdmin();
