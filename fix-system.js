#!/usr/bin/env node

/**
 * SYSTEM FIX SCRIPT
 * Restores categories and fixes Firebase data
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, deleteDoc, doc } from 'firebase/firestore';

// Firebase config (same as frontend)
const firebaseConfig = {
  apiKey: "AIzaSyC-2-PG8CxO8Wp3SgDVXZCLxceDRaYeydM",
  authDomain: "utm-tracker-5802e.firebaseapp.com",
  projectId: "utm-tracker-5802e",
  storageBucket: "utm-tracker-5802e.firebasestorage.app",
  messagingSenderId: "934532935838",
  appId: "1:934532935838:web:d5b7d18fea82ccf77bcb8f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default categories (from common article sources)
const DEFAULT_CATEGORIES = [
  { name: 'Hairstyles', count: 0 },
  { name: 'Fashion', count: 0 },
  { name: 'Makeup', count: 0 },
  { name: 'Beauty Tips', count: 0 },
  { name: 'Skincare', count: 0 },
  { name: 'Jewelry', count: 0 },
  { name: 'Lifestyle', count: 0 },
  { name: 'Trending', count: 0 }
];

async function fixSystem() {
  console.log('🔧 Starting system fix...\n');
  
  try {
    // 1. Restore categories
    console.log('📂 Step 1: Restoring categories...');
    await restoreCategories();
    
    // 2. Create admin account
    console.log('\n👤 Step 2: Setting up admin account in Firestore...');
    await setupAdminAccount();
    
    // 3. Clean up bad data
    console.log('\n🧹 Step 3: Cleaning up invalid data...');
    await cleanupBadData();
    
    console.log('\n✅ System fix complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Update signin.html and signup.html with proper validation');
    console.log('2. Rebuild admin_dashboard.html with approval management');
    console.log('3. Test login with: mudassar.admin@gmail.com / Mudassar@123\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

async function restoreCategories() {
  const batch = writeBatch(db);
  const categoriesRef = collection(db, 'categories');
  
  // Clear existing categories
  const existing = await getDocs(categoriesRef);
  existing.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Add default categories
  DEFAULT_CATEGORIES.forEach((cat, idx) => {
    const docRef = doc(categoriesRef, cat.name.toLowerCase().replace(/\s+/g, '-'));
    batch.set(docRef, {
      name: cat.name,
      count: 0,
      order: idx + 1,
      createdAt: new Date().toISOString()
    });
  });
  
  await batch.commit();
  console.log(`✅ Restored ${DEFAULT_CATEGORIES.length} categories`);
}

async function setupAdminAccount() {
  const teamMembersRef = collection(db, 'team_members');
  const batch = writeBatch(db);
  
  // Create admin entry
  const adminDocRef = doc(teamMembersRef, 'admin_mudassar');
  batch.set(adminDocRef, {
    email: 'mudassar.admin@gmail.com',
    fullname: 'Mudassar (Admin)',
    role: 'admin',
    approved: true,
    status: 'active',
    createdAt: new Date().toISOString(),
    earnings: 0,
    totalPaid: 0,
    isFirstLogin: true
  });
  
  await batch.commit();
  console.log('✅ Admin account configured in Firestore');
  console.log('   Email: mudassar.admin@gmail.com');
  console.log('   Password: Use your Firebase password');
}

async function cleanupBadData() {
  // Delete the accidentally created "Mudassar" member
  try {
    const teamMembersRef = collection(db, 'team_members');
    const docs = await getDocs(teamMembersRef);
    
    let deleted = 0;
    for (const doc of docs.docs) {
      const data = doc.data();
      // Delete if it's the auto-created "Mudassar" user
      if (data.fullname === 'Mudassar' && data.email === 'newemail@gmail.com') {
        await deleteDoc(doc.ref);
        deleted++;
        console.log('✅ Removed auto-created user: Mudassar (newemail@gmail.com)');
      }
    }
    
    if (deleted === 0) {
      console.log('✅ No bad data found');
    }
  } catch (error) {
    console.log('ℹ️ Cleanup check completed:', error.message);
  }
}

// Run the script
fixSystem().catch(console.error);
