/**
 * TEST SUITE 1: WEB SCRAPER
 * Tests that articles are fetched correctly from captionmood.com
 */

import { runScraper } from './backend/scrapers/captionmood-scraper.js';
import { db } from './backend/config/firebase-admin.js';

async function testWebScraper() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SUITE 1: WEB SCRAPER');
  console.log('='.repeat(60));

  try {
    // TEST 1: Run scraper
    console.log('\n📝 TEST 1: Run Web Scraper');
    console.log('-'.repeat(60));
    const result = await runScraper();
    console.log('Result:', result);

    if (result.success) {
      console.log('✅ Web Scraper executed successfully');
      console.log(`   📰 Articles fetched: ${result.articlesCount || 0}`);
      console.log(`   📂 Categories found: ${result.categoriesCount || 0}`);
    } else {
      console.log('❌ Web Scraper failed:', result.message || 'Unknown error');
      return;
    }

    // TEST 2: Verify articles in Firestore
    console.log('\n📝 TEST 2: Verify Articles in Firestore');
    console.log('-'.repeat(60));
    const articlesSnapshot = await db.collection('articles').get();
    console.log(`✅ Total articles in Firestore: ${articlesSnapshot.size}`);
    
    if (articlesSnapshot.size > 0) {
      const firstArticle = articlesSnapshot.docs[0].data();
      console.log('  First article sample:');
      console.log(`    - Title: ${firstArticle.title}`);
      console.log(`    - Category: ${firstArticle.category}`);
      console.log(`    - Has URL: ${!!firstArticle.url}`);
      console.log(`    - Has Image: ${!!firstArticle.image}`);
    }

    // TEST 3: Verify categories in Firestore
    console.log('\n📝 TEST 3: Verify Categories in Firestore');
    console.log('-'.repeat(60));
    const categoriesSnapshot = await db.collection('categories').get();
    console.log(`✅ Total categories in Firestore: ${categoriesSnapshot.size}`);
    
    if (categoriesSnapshot.size > 0) {
      const categories = categoriesSnapshot.docs.map(d => ({
        name: d.data().name,
        count: d.data().count
      }));
      console.log('  First 5 categories:');
      categories.slice(0, 5).forEach((cat, idx) => {
        console.log(`    ${idx + 1}. ${cat.name} (${cat.count} articles)`);
      });
    }

    // TEST 4: Check article count is reasonable
    console.log('\n📝 TEST 4: Verify Article Count');
    console.log('-'.repeat(60));
    if (articlesSnapshot.size >= 5) {
      console.log(`✅ PASS: Found ${articlesSnapshot.size} articles (min 5 required)`);
    } else {
      console.log(`⚠️ WARNING: Only ${articlesSnapshot.size} articles found (expected 10+)`);
    }

    // TEST 5: Verify article structure
    console.log('\n📝 TEST 5: Verify Article Structure');
    console.log('-'.repeat(60));
    let validArticles = 0;
    articlesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const isValid = data.title && data.category && data.url && data.scrapedDate;
      if (isValid) validArticles++;
    });
    
    const percentage = Math.round((validArticles / articlesSnapshot.size) * 100);
    console.log(`✅ Articles with complete data: ${validArticles}/${articlesSnapshot.size} (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('✅ PASS: Article quality is good');
    } else {
      console.log('⚠️ WARNING: Some articles missing data');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ WEB SCRAPER TEST COMPLETE');
    console.log('='.repeat(60) + '\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    return false;
  }
}

// Run test
testWebScraper().then(success => {
  process.exit(success ? 0 : 1);
});
