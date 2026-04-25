/**
 * BACKEND APP - TEAMCLICKTRACKER
 * Express app instance (no app.listen()).
 *
 * This separation makes it easy to:
 * - run locally via `node backend/index.js` (starts server + scheduler)
 * - deploy on Vercel via a Serverless Function (exports the app handler)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { admin, db } from './config/firebase-admin.js';
import { testJob } from './jobs/scheduler.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import memberRoutes from './routes/member.js';

// Load environment variables (safe no-op if none exist)
dotenv.config();

// Get __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// HELPERS
// ========================================

function requireInternalApiKey(req, res, next) {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return next();

  const headerValue = req.headers['x-internal-api-key'];
  const provided = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  // Optional fallback for schedulers that can't send custom headers
  const queryProvided = req.query?.internalApiKey;

  if (String(provided || '') === String(expected)) return next();
  if (String(queryProvided || '') === String(expected)) return next();

  return res.status(401).json({
    success: false,
    error: 'Unauthorized'
  });
}

// ========================================
// ROUTES
// ========================================

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TeamClickTracker Backend'
  });
});

// ========================================
// AUTHENTICATION & ADMIN ROUTES
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/member', memberRoutes);

/**
 * Get admin dashboard data
 */
app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const stats = await db.collection('admin_stats').doc('latest').get();
    const memberCount = await db.collection('team_members').count().get();

    res.json({
      stats: stats.data() || {},
      memberCount: memberCount.data().count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get member earnings
 */
app.get('/api/member/:memberId/earnings', async (req, res) => {
  try {
    const { memberId } = req.params;
    const earnings = await db.collection('earnings').doc(memberId).get();

    res.json(earnings.data() || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all articles
 */
app.get('/api/articles', async (req, res) => {
  try {
    const { category, limit = 100, offset = 0 } = req.query;

    let query = db.collection('articles');

    // Only filter by active if articles exist
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query
      .orderBy('scrapedAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const articles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      articles,
      count: articles.length,
      message: articles.length === 0 ? 'No articles found. Run web scraper first.' : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If collection doesn't exist or error, return empty
    res.json({
      success: true,
      articles: [],
      count: 0,
      message: 'Articles collection empty. Scraper will populate this.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get all categories
 */
app.get('/api/categories', async (req, res) => {
  try {
    const snapshot = await db.collection('categories').get();

    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      categories,
      count: categories.length,
      message: categories.length === 0 ? 'No categories found. Run web scraper first.' : undefined,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If collection doesn't exist, return empty
    res.json({
      success: true,
      categories: [],
      count: 0,
      message: 'Categories collection empty. Scraper will populate this.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get scraper status
 */
app.get('/api/scraper/status', async (req, res) => {
  try {
    const status = await db.collection('metadata').doc('scraper_status').get();

    res.json({
      success: true,
      status: status.data() || {
        status: 'idle',
        message: 'Scraper has not run yet',
        articles_count: 0,
        categories_count: 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If document doesn't exist, return default status
    res.json({
      success: true,
      status: {
        status: 'idle',
        message: 'Scraper has not run yet',
        articles_count: 0,
        categories_count: 0
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get job logs
 */
app.get('/api/jobs/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const snapshot = await db.collection('job_logs')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If collection doesn't exist or no data, return empty
    res.json({
      success: true,
      logs: [],
      count: 0,
      message: 'No job logs yet. Jobs will log when they run.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Manual job testing endpoint (INTERNAL)
 *
 * To protect this endpoint in production, set:
 *   INTERNAL_API_KEY=<some-long-random-string>
 * and call with header:
 *   x-internal-api-key: <same-string>
 */
app.post('/api/jobs/test/:jobName', requireInternalApiKey, async (req, res) => {
  try {
    const { jobName } = req.params;

    console.log(`🧪 Manual test for job: ${jobName}`);

    if (jobName === 'web_scraper' || jobName === 'category_counter' || jobName === 'ga_data_fetcher') {
      const result = await testJob(jobName);

      res.json({
        status: 'completed',
        jobName,
        result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        error: 'Invalid job name',
        validJobs: ['web_scraper', 'category_counter', 'ga_data_fetcher']
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'failed',
      jobName: req.params.jobName,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Populate sample data endpoint (INTERNAL)
 */
app.post('/api/populate-sample-data', requireInternalApiKey, async (req, res) => {
  try {
    console.log('\n🎬 Populating sample data...\n');

    const sampleArticles = [
      { title: '10 Best Hairstyles for 2026', description: 'Discover trending hairstyles', url: 'https://captionmood.com/hairstyles', category: 'Hairstyles', image: 'https://via.placeholder.com/400x300?text=Hairstyles' },
      { title: 'Fashion Trends You Need to Know', description: 'Stay ahead with spring trends', url: 'https://captionmood.com/fashion', category: 'Fashion', image: 'https://via.placeholder.com/400x300?text=Fashion' },
      { title: 'Makeup Tutorial: Natural Glow', description: 'Achieve glowing complexion', url: 'https://captionmood.com/makeup', category: 'Makeup', image: 'https://via.placeholder.com/400x300?text=Makeup' },
      { title: 'Best Skincare for Oily Skin', description: 'Perfect skincare routine', url: 'https://captionmood.com/skincare', category: 'Skincare', image: 'https://via.placeholder.com/400x300?text=Skincare' },
      { title: 'Celebrity Red Carpet Looks', description: 'Recreate stunning looks', url: 'https://captionmood.com/celebrity', category: 'Celebrity', image: 'https://via.placeholder.com/400x300?text=Celebrity' },
      { title: 'Nail Art Designs', description: 'Creative nail designs', url: 'https://captionmood.com/nails', category: 'Beauty', image: 'https://via.placeholder.com/400x300?text=Nails' },
      { title: 'Summer Fashion Guide', description: 'Expert styling tips', url: 'https://captionmood.com/summer', category: 'Fashion', image: 'https://via.placeholder.com/400x300?text=Summer' },
      { title: 'Hair Care Secrets', description: 'Healthy hair tips', url: 'https://captionmood.com/hair', category: 'Hairstyles', image: 'https://via.placeholder.com/400x300?text=Hair' },
      { title: 'Dewy Skin Makeup', description: 'Step-by-step makeup guide', url: 'https://captionmood.com/dewy', category: 'Makeup', image: 'https://via.placeholder.com/400x300?text=Dewy' },
      { title: 'Designer Handbags on Budget', description: 'Affordable alternatives', url: 'https://captionmood.com/bags', category: 'Fashion', image: 'https://via.placeholder.com/400x300?text=Bags' },
      { title: 'Anti-Aging Skincare', description: 'Combat signs of aging', url: 'https://captionmood.com/antiaging', category: 'Skincare', image: 'https://via.placeholder.com/400x300?text=AntiAging' },
      { title: 'Workout Outfits', description: 'Stylish gym looks', url: 'https://captionmood.com/workout', category: 'Fashion', image: 'https://via.placeholder.com/400x300?text=Workout' }
    ];

    // Clear old articles
    const oldArticles = await db.collection('articles').get();
    const batch = db.batch();
    oldArticles.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Add sample articles
    const articleBatch = db.batch();
    for (const article of sampleArticles) {
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
    }
    await articleBatch.commit();

    // Add categories
    const categories = ['Hairstyles', 'Fashion', 'Makeup', 'Skincare', 'Celebrity', 'Beauty'];
    const categoryBatch = db.batch();
    for (const category of categories) {
      const docRef = db.collection('categories').doc(category);
      categoryBatch.set(docRef, {
        name: category,
        displayName: category,
        createdAt: admin.firestore.Timestamp.now(),
        active: true
      }, { merge: true });
    }
    await categoryBatch.commit();

    console.log(`✅ Added ${sampleArticles.length} articles`);
    console.log(`✅ Added ${categories.length} categories\n`);

    res.json({
      success: true,
      message: 'Sample data populated successfully',
      articlesAdded: sampleArticles.length,
      categoriesAdded: categories.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error populating sample data:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// SERVE FRONTEND STATIC FILES
// ========================================

// Serve frontend files at /frontend path (don't modify URLs)
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Serve frontend files at root for convenience (signin.html, etc)
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

export default app;
export { app };
