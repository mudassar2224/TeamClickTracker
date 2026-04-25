/**
 * Remove sample/dummy data - keep only REAL scraped articles
 */
import { db, admin } from './backend/config/firebase-admin.js';

async function cleanupSampleData() {
  try {
    console.log('🧹 Cleaning up sample data...\n');
    
    // Get ALL articles
    const snapshot = await db.collection('articles').get();
    const allArticles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Total articles: ${allArticles.length}`);
    
    // Sample articles to remove (titles that are from demo/sample)
    const sampleTitles = [
      'Hair Care Guide: Healthy Hair Secrets',
      'Designer Handbags on a Budget',
      'Anti-Aging Skincare Routine',
      'Dewy Skin Makeup Routine',
      'Workout Outfits That Actually Look Good',
      'How to Style a Perfect Summer Outfit',
      'Best Skincare Products for Oily Skin',
      'Makeup Tutorial: Natural Glow',
      'Nail Art Designs for Every Occasion',
      'Celebrity Red Carpet Looks',
      'Fashion Trends You Need to Know',
      '10 Best Hairstyles for 2026'
    ];
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (sampleTitles.includes(data.title)) {
        await db.collection('articles').doc(doc.id).delete();
        console.log(`❌ Deleted: ${data.title}`);
        deletedCount++;
      } else {
        console.log(`✅ Kept: ${data.title}`);
        keptCount++;
      }
    }
    
    console.log(`\n✨ Cleanup Complete!`);
    console.log(`✅ Real articles kept: ${keptCount}`);
    console.log(`❌ Sample articles deleted: ${deletedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanupSampleData();
