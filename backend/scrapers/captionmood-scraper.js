/**
 * CAPTIONMOOD WEB SCRAPER
 * Fetches articles and categories from captionmood.com
 * Runs automatically: Daily at 2:00 AM
 * 
 * This scraper:
 * 1. Fetches captionmood.com homepage
 * 2. Extracts all articles (title, description, URL, image)
 * 3. Extracts all categories
 * 4. Counts articles per category
 * 5. Stores everything in Firebase Firestore
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { db, admin } from '../config/firebase-admin.js';

const CAPTIONMOOD_URL = 'https://captionmood.com';
const WP_API_BASE = `${CAPTIONMOOD_URL}/wp-json/wp/v2`;
const ARTICLES_COLLECTION = 'articles';
const CATEGORIES_COLLECTION = 'categories';

const SCRAPER_MODE = String(process.env.SCRAPER_MODE || 'replace').toLowerCase(); // replace | append
const SCRAPER_ALLOW_PARTIAL_REPLACE = String(process.env.SCRAPER_ALLOW_PARTIAL_REPLACE || '').toLowerCase() === 'true';
const WP_MAX_POSTS = Number(process.env.SCRAPER_MAX_POSTS || 500);
const WP_API_TIMEOUT_MS = (() => {
  const n = Number(process.env.WP_API_TIMEOUT_MS || 60000);
  return Number.isFinite(n) && n > 0 ? n : 60000;
})();

function plainTextFromHtml(html) {
  try {
    return cheerio.load(String(html || '')).text().replace(/\s+/g, ' ').trim();
  } catch {
    return String(html || '').replace(/\s+/g, ' ').trim();
  }
}

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function safeCategoryDocId(name) {
  return String(name || '').trim().replace(/\//g, '-');
}

async function fetchWpPaged(endpoint, { params = {}, maxPages = 100 } = {}) {
  const perPage = Math.min(Math.max(Number(params.per_page || 100), 1), 100);
  const out = [];
  let page = Number(params.page || 1);

  for (let i = 0; i < maxPages; i += 1) {
    let response;
    try {
      response = await axios.get(`${WP_API_BASE}/${endpoint}`, {
        timeout: WP_API_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        params: {
          ...params,
          per_page: perPage,
          page
        }
      });
    } catch (err) {
      // WordPress returns 400 for out-of-range pages (e.g. rest_post_invalid_page_number)
      const status = err?.response?.status;
      const code = String(err?.response?.data?.code || '').toLowerCase();
      const message = String(err?.response?.data?.message || '').toLowerCase();

      if (status === 400 && (code.includes('invalid_page_number') || code.includes('invalid_page') || message.includes('page number'))) {
        break;
      }
      throw err;
    }

    const items = Array.isArray(response.data) ? response.data : [];
    out.push(...items);

    const totalPages = Number(response.headers?.['x-wp-totalpages'] || response.headers?.['x-wp-totalpages'.toLowerCase()] || 0);
    if (totalPages && page >= totalPages) break;
    // If X-WP-TotalPages is missing, we keep going until WP says the page is invalid.

    page += 1;
  }

  return out;
}

function chunkArray(arr, size) {
  const out = [];
  const n = Math.max(1, Number(size) || 1);
  for (let i = 0; i < arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}

function pickBestMediaUrl(media) {
  const sizes = media?.media_details?.sizes;
  return (
    sizes?.medium?.source_url ||
    sizes?.medium_large?.source_url ||
    sizes?.thumbnail?.source_url ||
    media?.source_url ||
    null
  );
}

async function fetchWpMediaMapByIds(mediaIds) {
  const ids = Array.from(
    new Set(
      (Array.isArray(mediaIds) ? mediaIds : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
  if (!ids.length) return new Map();

  const idToUrl = new Map();
  const chunks = chunkArray(ids, 100);

  for (const chunk of chunks) {
    const response = await axios.get(`${WP_API_BASE}/media`, {
      timeout: WP_API_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      params: {
        per_page: 100,
        include: chunk.join(','),
        _fields: 'id,source_url,media_details'
      }
    });

    const items = Array.isArray(response.data) ? response.data : [];
    for (const m of items) {
      const id = Number(m?.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      const url = pickBestMediaUrl(m);
      if (url) idToUrl.set(id, String(url));
    }
  }

  return idToUrl;
}

async function scrapeFromWordpressApi() {
  // Categories
  const wpCategories = await fetchWpPaged('categories', {
    params: {
      per_page: 100,
      page: 1,
      _fields: 'id,name,slug,count,link'
    }
  });
  const categoryIdToName = new Map();
  const categoryIdToObj = new Map();

  for (const c of wpCategories) {
    const name = plainTextFromHtml(c?.name);
    if (!name) continue;
    categoryIdToName.set(Number(c.id), name);
    categoryIdToObj.set(Number(c.id), {
      wpId: Number(c.id),
      name,
      slug: String(c.slug || ''),
      siteCount: Number(c.count || 0) || 0,
      link: String(c.link || '')
    });
  }

  // Posts (latest)
  const maxPosts = Number.isFinite(WP_MAX_POSTS) && WP_MAX_POSTS > 0 ? Math.min(WP_MAX_POSTS, 5000) : 500;
  const posts = await fetchWpPaged('posts', {
    params: {
      per_page: 100,
      page: 1,
      status: 'publish',
      orderby: 'date',
      order: 'desc',
      // Keep the payload small so it doesn't time out (avoid _embed).
      _fields: 'id,link,title,excerpt,categories,date_gmt,date,modified_gmt,modified,featured_media'
    },
    maxPages: 200
  });

  const postsLimited = posts.slice(0, maxPosts);
  const mediaIds = postsLimited
    .map((p) => Number(p?.featured_media))
    .filter((n) => Number.isFinite(n) && n > 0);
  const mediaIdToUrl = await fetchWpMediaMapByIds(mediaIds);

  const articles = [];
  const nowTs = admin.firestore.Timestamp.now();
  const scrapedDate = todayIsoDate();

  for (const post of postsLimited) {
    const title = plainTextFromHtml(post?.title?.rendered || post?.title);
    const description = plainTextFromHtml(post?.excerpt?.rendered || '').substring(0, 500);
    const url = String(post?.link || '').trim();
    if (!title || !url) continue;

    const categoryIds = Array.isArray(post?.categories) ? post.categories : [];
    const categoryNames = categoryIds
      .map((id) => categoryIdToName.get(Number(id)))
      .filter(Boolean);

    const primaryCategoryName = safeCategoryDocId(categoryNames[0] || 'General');

    // Featured image (fetched via /media include=...)
    const featuredMediaId = Number(post?.featured_media);
    const image = Number.isFinite(featuredMediaId) && featuredMediaId > 0 ? (mediaIdToUrl.get(featuredMediaId) || null) : null;

    articles.push({
      externalId: `wp_${post.id}`,
      wpId: Number(post.id),
      title,
      description,
      url,
      image,
      category: primaryCategoryName,
      categories: categoryNames.map(safeCategoryDocId),
      scrapedAt: nowTs,
      scrapedDate,
      publishedAt: post?.date_gmt || post?.date || null,
      modifiedAt: post?.modified_gmt || post?.modified || null,
      active: true
    });
  }

  // Use WP category list as the source of truth for categories.
  // Keep them in the same doc-id format as article.category so counting/filtering works.
  const categories = [];
  for (const c of wpCategories) {
    const name = plainTextFromHtml(c?.name);
    if (!name) continue;
    const docId = safeCategoryDocId(name);
    categories.push({
      id: docId,
      name: docId,
      displayName: name,
      slug: String(c.slug || ''),
      wpId: Number(c.id),
      siteCount: Number(c.count || 0) || 0,
      link: String(c.link || '')
    });
  }

  return {
    source: 'wp-api',
    articles,
    categories,
    scrapedAt: new Date().toISOString(),
    count: articles.length
  };
}

async function clearCollection(collectionName) {
  let totalDeleted = 0;
  while (true) {
    const snapshot = await db.collection(collectionName).limit(450).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
  }
  return totalDeleted;
}

/**
 * Scrape captionmood.com for articles
 * Returns array of articles with: title, description, url, image, category
 */
async function scrapeArticles() {
  // 1) Prefer WordPress REST API (accurate URLs + full category list)
  try {
    console.log('🔄 Starting article scraper (WordPress API mode)...');
    const wpData = await scrapeFromWordpressApi();
    if (wpData?.articles?.length) {
      console.log(`✅ WP API fetched ${wpData.articles.length} posts and ${wpData.categories.length} categories`);
      return wpData;
    }
    console.warn('⚠️ WP API returned no posts, falling back to HTML scraping...');
  } catch (error) {
    console.warn('⚠️ WP API scrape failed, falling back to HTML scraping:', error.message);
  }

  // 2) HTML fallback (best-effort)
  try {
    console.log('🔄 Starting article scraper (HTML fallback)...');
    console.log(`📡 Fetching: ${CAPTIONMOOD_URL}`);
    
    // Fetch HTML from captionmood.com
    const response = await axios.get(CAPTIONMOOD_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log('✅ HTML fetched successfully');
    
    // Parse HTML with Cheerio
    const $ = cheerio.load(response.data);
    const articles = [];
    const categories = new Set();
    
    // Extract articles - adjust selectors based on actual captionmood.com structure
    // Common selectors for article listings
    const articleSelectors = [
      'article',
      '.article',
      '.post',
      '[class*="article"]',
      '[class*="post"]'
    ];
    
    let found = false;
    
    for (const selector of articleSelectors) {
      $(selector).each((index, element) => {
        try {
          const $element = $(element);
          
          // Extract title (common selectors)
          let title = $element.find('h1, h2, h3, .title').first().text().trim();
          if (!title) {
            title = $element.find('a').first().text().trim();
          }
          
          // Extract description
          let description = $element.find('p, .description, .excerpt').first().text().trim();
          
          // Extract URL: prefer headline/permalink link (avoid category links)
          let url =
            $element.find('h1 a, h2 a, h3 a').first().attr('href') ||
            $element.find('a[href*="captionmood.com/"]').last().attr('href') ||
            $element.find('a').last().attr('href');
          if (url && !url.startsWith('http')) {
            url = new URL(url, CAPTIONMOOD_URL).href;
          }
          
          // Extract image
          let image = $element.find('img').first().attr('src');
          if (image && !image.startsWith('http')) {
            image = new URL(image, CAPTIONMOOD_URL).href;
          }
          
          // Extract category from text, URL, or data attributes
          let category = $element.find('a[href*="/category/"]').first().text().trim();
          if (!category) {
            category = $element.find('[class*="category"], .cat, .tag').first().text().trim();
          }
          if (!category) {
            // Try to extract from URL
            category = 'General';
          }
          
          // Normalize category
          category = category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ') || 'General';
          
          // Only add if we have at least title and URL
          if (title && (url || description)) {
            articles.push({
              title,
              description: description.substring(0, 500), // Limit description
              url: url || CAPTIONMOOD_URL,
              image: image || null,
              category: safeCategoryDocId(category),
              scrapedAt: admin.firestore.Timestamp.now(),
              scrapedDate: new Date().toISOString().split('T')[0],
              active: true
            });
            
            if (category) {
              categories.add(category);
            }
            
            found = true;
          }
        } catch (e) {
          console.error('Error parsing individual article:', e.message);
          // Continue with next article
        }
      });
      
      if (found && articles.length > 0) {
        console.log(`✅ Found ${articles.length} articles using selector: ${selector}`);
        break;
      }
    }
    
    // If no articles found with fancy selectors, try generic links extraction
    if (articles.length === 0) {
      console.log('📍 No articles found, trying generic link extraction...');
      $('a').each((index, element) => {
        if (index > 50) return; // Limit to first 50 links
        
        const $link = $(element);
        const href = $link.attr('href');
        const text = $link.text().trim();
        const $image = $link.find('img');
        const image = $image.attr('src');
        
        if (text && text.length > 3 && text.length < 200 && href && href !== '#') {
          articles.push({
            title: text,
            description: text.substring(0, 100),
            url: href.startsWith('http') ? href : new URL(href, CAPTIONMOOD_URL).href,
            image: image ? (image.startsWith('http') ? image : new URL(image, CAPTIONMOOD_URL).href) : null,
            category: 'Featured',
            scrapedAt: admin.firestore.Timestamp.now(),
            scrapedDate: new Date().toISOString().split('T')[0],
            active: true
          });
          
          categories.add('Featured');
        }
      });
    }
    
    console.log(`📊 Found ${articles.length} articles`);
    console.log(`📑 Found ${categories.size} categories: ${Array.from(categories).join(', ')}`);
    
    return {
      source: 'html',
      articles: articles,
      categories: Array.from(categories).map((name) => ({ id: safeCategoryDocId(name), name: safeCategoryDocId(name), displayName: name })),
      scrapedAt: new Date().toISOString(),
      count: articles.length
    };
    
  } catch (error) {
    console.error('❌ Scraper error:', error.message);
    throw error;
  }
}

/**
 * Store articles in Firebase Firestore
 */
async function storeArticles(data) {
  try {
    console.log('💾 Storing articles in Firestore...');
    
    let batch = db.batch();
    let ops = 0;
    let count = 0;
    
    // Store each article
    for (const article of data.articles) {
      const docId = article.externalId ? String(article.externalId) : null;
      const docRef = docId ? db.collection(ARTICLES_COLLECTION).doc(docId) : db.collection(ARTICLES_COLLECTION).doc();
      batch.set(docRef, {
        ...article,
        id: docRef.id,
        bookmarked: false,
        views: 0
      });
      count++;

      ops++;
      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }
    
    // Commit remaining
    if (ops > 0) {
      await batch.commit();
    }
    console.log(`✅ Stored ${count} articles`);
    
    // Store metadata
    await db.collection('metadata').doc('scraper_status').set({
      lastRun: admin.firestore.Timestamp.now(),
      articlesCount: data.articles.length,
      categoriesCount: data.categories.length,
      status: 'success',
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { merge: true });
    
    console.log('✅ Metadata updated');
    
  } catch (error) {
    console.error('❌ Error storing articles:', error.message);
    throw error;
  }
}

/**
 * Store categories in Firestore
 */
async function storeCategories(categories) {
  try {
    console.log('💾 Storing categories in Firestore...');
    
    const batch = db.batch();
    
    for (const category of categories) {
      const isObj = category && typeof category === 'object';
      const rawName = isObj ? (category.displayName || category.name || category.id) : category;
      const displayName = plainTextFromHtml(rawName);
      const docId = safeCategoryDocId(isObj ? (category.id || category.name || displayName) : displayName);

      const docRef = db.collection(CATEGORIES_COLLECTION).doc(docId);
      batch.set(docRef, {
        name: docId,
        displayName,
        slug: isObj ? (category.slug || null) : null,
        wpId: isObj ? (category.wpId || null) : null,
        siteCount: isObj ? (Number(category.siteCount || 0) || 0) : 0,
        link: isObj ? (category.link || null) : null,
        createdAt: admin.firestore.Timestamp.now(),
        active: true
      }, { merge: true });
    }
    
    await batch.commit();
    console.log(`✅ Stored ${categories.length} categories`);
    
  } catch (error) {
    console.error('❌ Error storing categories:', error.message);
    throw error;
  }
}

/**
 * Count articles per category
 */
async function updateCategoryCounts() {
  try {
    console.log('🔢 Updating category counts...');
    
    const categoriesSnapshot = await db.collection(CATEGORIES_COLLECTION).get();
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.id;
      const count = await db.collection(ARTICLES_COLLECTION)
        .where('category', '==', categoryName)
        .count()
        .get();
      
      await categoryDoc.ref.update({
        articleCount: count.data().count
      });
    }
    
    console.log('✅ Category counts updated');
    
  } catch (error) {
    console.error('❌ Error updating category counts:', error.message);
    throw error;
  }
}

/**
 * Main scraper function - called automatically at 2:00 AM
 */
export async function runScraper() {
  try {
    console.log('\n=====================================');
    console.log('🚀 CAPTIONMOOD SCRAPER STARTED');
    console.log('=====================================\n');
    
    // Scrape articles
    const scrapedData = await scrapeArticles();
    
    // Store in Firebase
    if (SCRAPER_MODE === 'replace') {
      const allowReplace = scrapedData?.source === 'wp-api' || SCRAPER_ALLOW_PARTIAL_REPLACE;
      if (allowReplace) {
        const deletedArticles = await clearCollection(ARTICLES_COLLECTION);
        const deletedCategories = await clearCollection(CATEGORIES_COLLECTION);
        console.log(`🧹 Cleared ${deletedArticles} old articles and ${deletedCategories} old categories (replace mode)`);
      } else {
        console.warn('⚠️ Replace mode requested, but scraper used HTML fallback. Skipping collection clear to avoid data loss. (Set SCRAPER_ALLOW_PARTIAL_REPLACE=true to override)');
      }
    }

    await storeArticles(scrapedData);
    await storeCategories(scrapedData.categories);
    
    // Update category counts
    await updateCategoryCounts();
    
    console.log('\n=====================================');
    console.log('✅ CAPTIONMOOD SCRAPER COMPLETED');
    console.log(`📊 ${scrapedData.articles.length} articles processed`);
    console.log('=====================================\n');
    
    return {
      success: true,
      articlesProcessed: scrapedData.articles.length,
      categoriesProcessed: scrapedData.categories.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('\n❌ SCRAPER FAILED:', error.message);
    
    // Log error to Firestore
    await db.collection('errors').add({
      type: 'scraper_error',
      message: error.message,
      stack: error.stack,
      timestamp: admin.firestore.Timestamp.now()
    }).catch(e => console.error('Failed to log error:', e));
    
    throw error;
  }
}

// Export for scheduled tasks
export default runScraper;
