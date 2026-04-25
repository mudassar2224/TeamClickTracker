/**
 * SAMPLE DATA POPULATOR
 * Creates test data for dashboard verification
 * This is temporary - only for testing
 */

import { db, admin } from '../config/firebase-admin.js';

// Sample articles with realistic data
const SAMPLE_ARTICLES = [
  {
    title: "10 Best Hairstyles for 2026",
    description: "Discover the most trending hairstyles that will dominate 2026. From bold cuts to soft waves, find your perfect look.",
    url: "https://captionmood.com/hairstyles-2026",
    image: "https://via.placeholder.com/400x300?text=Hairstyles",
    category: "Hairstyles",
    active: true
  },
  {
    title: "Fashion Trends You Need to Know",
    description: "Stay ahead of the curve with these must-know fashion trends for spring 2026.",
    url: "https://captionmood.com/fashion-trends",
    image: "https://via.placeholder.com/400x300?text=Fashion",
    category: "Fashion",
    active: true
  },
  {
    title: "Makeup Tutorial: Natural Glow",
    description: "Learn how to achieve a natural, glowing complexion with these simple makeup tips.",
    url: "https://captionmood.com/makeup-natural",
    image: "https://via.placeholder.com/400x300?text=Makeup",
    category: "Makeup",
    active: true
  },
  {
    title: "Best Skincare Products for Oily Skin",
    description: "Find the perfect skincare routine for oily skin with our top product recommendations.",
    url: "https://captionmood.com/skincare-oily",
    image: "https://via.placeholder.com/400x300?text=Skincare",
    category: "Skincare",
    active: true
  },
  {
    title: "Celebrity Red Carpet Looks",
    description: "Recreate stunning red carpet looks from your favorite celebrities this season.",
    url: "https://captionmood.com/celebrity-looks",
    image: "https://via.placeholder.com/400x300?text=Celebrity",
    category: "Celebrity",
    active: true
  },
  {
    title: "Nail Art Designs for Every Occasion",
    description: "Express yourself with these creative nail art designs perfect for any event.",
    url: "https://captionmood.com/nail-art",
    image: "https://via.placeholder.com/400x300?text=Nails",
    category: "Beauty",
    active: true
  },
  {
    title: "How to Style a Perfect Summer Outfit",
    description: "Master the art of summer fashion with these expert styling tips.",
    url: "https://captionmood.com/summer-style",
    image: "https://via.placeholder.com/400x300?text=Summer",
    category: "Fashion",
    active: true
  },
  {
    title: "Hair Care Guide: Healthy Hair Secrets",
    description: "Achieve luscious, healthy hair with these professional care tips.",
    url: "https://captionmood.com/hair-care",
    image: "https://via.placeholder.com/400x300?text=HairCare",
    category: "Hairstyles",
    active: true
  },
  {
    title: "Dewy Skin Makeup Routine",
    description: "Get that coveted dewy skin look with this easy step-by-step makeup guide.",
    url: "https://captionmood.com/dewy-skin",
    image: "https://via.placeholder.com/400x300?text=Dewy",
    category: "Makeup",
    active: true
  },
  {
    title: "Designer Handbags on a Budget",
    description: "Look expensive without breaking the bank with these affordable designer alternatives.",
    url: "https://captionmood.com/designer-deals",
    image: "https://via.placeholder.com/400x300?text=Handbags",
    category: "Fashion",
    active: true
  },
  {
    title: "Anti-Aging Skincare Routine",
    description: "Combat signs of aging with this scientifically-backed skincare routine.",
    url: "https://captionmood.com/anti-aging",
    image: "https://via.placeholder.com/400x300?text=AntiAging",
    category: "Skincare",
    active: true
  },
  {
    title: "Workout Outfits That Actually Look Good",
    description: "Stay stylish while hitting the gym with these fashionable workout looks.",
    url: "https://captionmood.com/workout-style",
    image: "https://via.placeholder.com/400x300?text=Workout",
    category: "Fashion",
    active: true
  }
];

const SAMPLE_CATEGORIES = [
  "Hairstyles",
  "Fashion",
  "Makeup",
  "Skincare",
  "Celebrity",
  "Beauty"
];

/**
 * Populate sample data for testing
 */
export async function populateSampleData() {
  try {
    console.log('\n=====================================');
    console.log('📝 POPULATING SAMPLE DATA');
    console.log('=====================================\n');

    // Clear existing articles
    const articlesSnapshot = await db.collection('articles').get();
    const batch = db.batch();
    articlesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('🗑️  Cleared existing articles');

    // Add sample articles
    const articleBatch = db.batch();
    let articleCount = 0;

    for (const article of SAMPLE_ARTICLES) {
      const docRef = db.collection('articles').doc();
      articleBatch.set(docRef, {
        ...article,
        id: docRef.id,
        scrapedAt: admin.firestore.Timestamp.now(),
        scrapedDate: new Date().toISOString().split('T')[0],
        bookmarked: false,
        views: Math.floor(Math.random() * 1000),
        active: true
      });
      articleCount++;
    }

    await articleBatch.commit();
    console.log(`✅ Added ${articleCount} sample articles`);

    // Add sample categories
    const categoryBatch = db.batch();
    for (const category of SAMPLE_CATEGORIES) {
      const docRef = db.collection('categories').doc(category);
      categoryBatch.set(docRef, {
        name: category,
        displayName: category,
        createdAt: admin.firestore.Timestamp.now(),
        active: true
      }, { merge: true });
    }
    await categoryBatch.commit();
    console.log(`✅ Added ${SAMPLE_CATEGORIES.length} categories`);

    // Update metadata
    await db.collection('metadata').doc('scraper_status').set({
      lastRun: admin.firestore.Timestamp.now(),
      articlesCount: SAMPLE_ARTICLES.length,
      categoriesCount: SAMPLE_CATEGORIES.length,
      status: 'success',
      source: 'sample-data-populator',
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { merge: true });

    console.log('✅ Metadata updated');

    console.log('\n=====================================');
    console.log('✅ SAMPLE DATA POPULATED');
    console.log(`📊 ${articleCount} articles ready`);
    console.log('=====================================\n');

    return {
      success: true,
      articlesAdded: articleCount,
      categoriesAdded: SAMPLE_CATEGORIES.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  }
}

export default populateSampleData;
