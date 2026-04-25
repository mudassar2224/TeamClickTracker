/**
 * CATEGORY COUNTER JOB
 * Runs at 2:15 AM daily
 * Counts articles per category and updates Firebase
 */

import { db, admin } from '../config/firebase-admin.js';

export async function updateCategoryCounts() {
  try {
    console.log('🔢 Starting category counter...');
    
    const categoriesSnapshot = await db.collection('categories').get();
    
    if (categoriesSnapshot.empty) {
      console.log('⚠️ No categories found');
      return { categoriesUpdated: 0 };
    }
    
    let updated = 0;
    const batch = db.batch();
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.id;
      
      // Count articles in this category
      const countSnapshot = await db.collection('articles')
        .where('category', '==', categoryName)
        .where('active', '==', true)
        .count()
        .get();
      
      const count = countSnapshot.data().count;
      
      // Update category with new count
      batch.update(categoryDoc.ref, {
        articleCount: count,
        lastCounted: admin.firestore.Timestamp.now()
      });
      
      console.log(`  📑 ${categoryName}: ${count} articles`);
      updated++;
    }
    
    // Commit all updates
    await batch.commit();
    
    console.log(`✅ Updated ${updated} categories`);
    
    return {
      success: true,
      categoriesUpdated: updated,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Category counter error:', error.message);
    throw error;
  }
}

export default updateCategoryCounts;
