/**
 * MEMBER API ROUTES
 * Handles member dashboard data and UTM link operations
 */

import express from 'express';
import { admin, db } from '../config/firebase-admin.js';

const router = express.Router();

function slugifyCampaignName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeHttpUrlInput(input) {
  let raw = String(input || '').trim();
  if (!raw) return null;

  // Fix a common paste mistake from the UI: leaving "https://captionmood.com/" in the box and
  // pasting a full URL after it, creating "https://captionmood.com/https://captionmood.com/post".
  // Only apply this fix when the *prefix* is captionmood.com to avoid unexpected behavior for other domains.
  const lower = raw.toLowerCase();
  if (
    lower.startsWith('https://captionmood.com/') ||
    lower.startsWith('http://captionmood.com/') ||
    lower.startsWith('https://www.captionmood.com/') ||
    lower.startsWith('http://www.captionmood.com/')
  ) {
    const idx = lower.indexOf('/https://');
    const idx2 = lower.indexOf('/http://');
    const cut = idx > 0 ? idx : (idx2 > 0 ? idx2 : -1);
    if (cut > 0) {
      raw = raw.slice(cut + 1).trim();
    }
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;

    // Reject concatenated URLs that still parse, e.g. https://captionmood.com/https://captionmood.com/post
    if (/https?:\/\//i.test(u.pathname)) return null;

    return u.toString();
  } catch {
    return null;
  }
}

function repairEmbeddedUrlIfPresent(inputUrl) {
  const raw = String(inputUrl || '').trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    const host = String(u.hostname || '').toLowerCase();
    const isCaptionmood = host === 'captionmood.com' || host === 'www.captionmood.com';
    if (!isCaptionmood) return raw;

    // If the path contains another full URL (common paste bug), extract and re-apply query params.
    // Example: https://captionmood.com/https://captionmood.com/post?utm_...
    const m = u.pathname.match(/^\/(https?:\/\/.*)$/i);
    if (!m) return raw;

    const embedded = m[1];
    const embeddedUrl = new URL(embedded);

    // Preserve original query params (utm_*) from the broken URL
    u.searchParams.forEach((value, key) => {
      embeddedUrl.searchParams.set(key, value);
    });

    return embeddedUrl.toString();
  } catch {
    return raw;
  }
}

// Middleware to verify member token and check approval
const verifyMember = async (req, res, next) => {
  try {
    // Get token from Authorization header or body
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      console.error('❌ No token provided in request');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    console.log(`🔍 Verifying member token (${token.length} chars)...`);

    // Decode base64 token
    let decoded;
    try {
      decoded = Buffer.from(token, 'base64').toString('utf-8');
      decoded = JSON.parse(decoded);
    } catch (e) {
      console.error('❌ Failed to decode token:', e.message);
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    const { uid } = decoded;
    if (!uid) {
      console.error('❌ No UID in token');
      return res.status(401).json({ success: false, message: 'Invalid token structure' });
    }

    console.log(`✅ Token decoded, UID: ${uid}`);

    // Get user and check if member & approved
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      console.error(`❌ User not found in Firestore: ${uid}`);
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userData = userDoc.data();
    console.log(`✅ User found:`, { email: userData.email, role: userData.role, status: userData.status });

    if (userData.role !== 'member') {
      console.error(`❌ Not a member account, role: ${userData.role}`);
      return res.status(403).json({ success: false, message: 'Not a member account' });
    }

    if (userData.status !== 'approved') {
      console.error(`❌ Member account not approved, status: ${userData.status}`);
      return res.status(403).json({ success: false, message: `Member account not approved (status: ${userData.status})` });
    }

    console.log(`✅ Member verified and approved: ${userData.email}`);
    
    req.memberId = uid;
    req.memberData = userData;
    next();
  } catch (error) {
    console.error('❌ Member verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token or verification failed' });
  }
};

// ============================================
// ARTICLES & CATEGORIES ENDPOINTS
// ============================================

/**
 * GET /api/member/articles
 * Get all articles with optional category filter
 */
router.get('/articles', verifyMember, async (req, res) => {
  try {
    const { category } = req.query;
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 200;

    let query = db.collection('articles');
    
    if (category && category !== 'All') {
      query = query.where('category', '==', category);
    }

    let querySnapshot;
    try {
      querySnapshot = await query
        .orderBy('scrapedAt', 'desc')
        .limit(limit)
        .get();
    } catch (orderError) {
      // Some deployments may not have the composite index for (category + scrapedAt).
      console.warn('⚠️ Articles orderBy failed, using simple query...', orderError.message);
      querySnapshot = await query.limit(limit).get();
    }
    const articles = [];

    querySnapshot.forEach(doc => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        url: data.url,
        image: data.image,
        category: data.category,
        createdAt: data.scrapedAt?.toDate?.().toISOString() || new Date().toISOString()
      });
    });

    res.json({
      success: true,
      articles,
      count: articles.length,
      category: category || 'All'
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch articles' });
  }
});

/**
 * GET /api/member/articles/:articleId
 * Get a single article by ID
 */
router.get('/articles/:articleId', verifyMember, async (req, res) => {
  try {
    const { articleId } = req.params;
    if (!articleId) {
      return res.status(400).json({ success: false, message: 'Missing articleId' });
    }

    const doc = await db.collection('articles').doc(articleId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const data = doc.data() || {};
    return res.json({
      success: true,
      article: {
        id: doc.id,
        title: data.title,
        description: data.description,
        url: data.url,
        image: data.image,
        category: data.category,
        createdAt: data.scrapedAt?.toDate?.().toISOString() || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch article' });
  }
});

// ============================================
// UTM LINK GENERATION
// ============================================

/**
 * POST /api/member/create-utm-link
 * Create a UTM tracking link for sharing
 */
router.post('/create-utm-link', verifyMember, async (req, res) => {
  try {
    const { articleTitle, articleUrl, campaignName, medium } = req.body;

    if (!articleTitle || !articleUrl || !campaignName || !medium) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: articleTitle, articleUrl, campaignName, medium'
      });
    }

    // Validate medium (keep list broad to match UI options)
    const validMedia = ['social', 'email', 'direct', 'referral', 'display', 'organic', 'paid'];
    const normalizedMedium = String(medium).toLowerCase();
    if (!validMedia.includes(normalizedMedium)) {
      return res.status(400).json({
        success: false,
        message: `Invalid medium. Must be one of: ${validMedia.join(', ')}`
      });
    }

    // Create campaign slug from name
    const campaignSlug = slugifyCampaignName(campaignName);

    // Pre-generate doc ID so we can embed it in utm_term (unique, GA-friendly)
    const linkRef = db.collection('utm_links').doc();
    const utmTerm = linkRef.id;

    // Build UTM URL
    const url = new URL(articleUrl);
    url.searchParams.set('utm_source', 'captionmood');
    url.searchParams.set('utm_medium', normalizedMedium);
    url.searchParams.set('utm_campaign', campaignSlug);
    url.searchParams.set('utm_term', utmTerm);
    // Keep member ID as a transparent custom param (GA attribution uses utm_term)
    url.searchParams.set('utm_member', req.memberId);
    
    const trackingUrl = url.toString();

    // Store link in Firestore for tracking
    await linkRef.set({
      memberId: req.memberId,
      memberEmail: req.memberData.email,
      articleTitle,
      articleUrl,
      campaignName,
      campaignSlug,
      source: 'captionmood',
      medium: normalizedMedium,
      content: '',
      utmTerm,
      trackingUrl,
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      clicks: 0,
      revenue: 0
    });

    res.json({
      success: true,
      message: 'UTM link created successfully',
      link: {
        id: linkRef.id,
        campaignName,
        medium: normalizedMedium,
        url: trackingUrl,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating UTM link:', error);
    res.status(500).json({ success: false, message: 'Failed to create UTM link' });
  }
});

/**
 * GET /api/member/utm-links
 * Get all UTM links created by member
 */
router.get('/utm-links', verifyMember, async (req, res) => {
  try {
    let querySnapshot;
    try {
      // Try with orderBy first
      querySnapshot = await db.collection('utm_links')
        .where('memberId', '==', req.memberId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    } catch (orderError) {
      // Fallback: get without ordering
      console.warn('⚠️ OrderBy failed, using simple query...');
      querySnapshot = await db.collection('utm_links')
        .where('memberId', '==', req.memberId)
        .limit(50)
        .get();
    }

    const links = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();

      const rawTrackingUrl = data.trackingUrl || data.url || null;
      const rawArticleUrl = data.articleUrl || data.article_url || null;

      const repairedTrackingUrl = repairEmbeddedUrlIfPresent(rawTrackingUrl) || rawTrackingUrl;
      const repairedArticleUrl = repairEmbeddedUrlIfPresent(rawArticleUrl) || rawArticleUrl;

      links.push({
        id: doc.id,
        campaignName: data.campaignName || data.campaign_name,
        medium: data.medium,
        articleTitle: data.articleTitle || data.article_title || null,
        articleUrl: repairedArticleUrl,
        url: repairedTrackingUrl,
        clicks: data.clicks || 0,
        revenue: data.revenue || 0,
        createdAt:
          (data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : null) ||
          (typeof data.createdAt === 'string' ? data.createdAt : null) ||
          (typeof data.created_at === 'string' ? data.created_at : null) ||
          (data.created_at?.toDate?.() ? data.created_at.toDate().toISOString() : null) ||
          null,
        status: data.status || (data.active === true ? 'active' : undefined),
        source: data.source,
        content: data.content,
        utmTerm: data.utmTerm
      });
    });

    // Always return newest first (even if Firestore orderBy is unavailable)
    const toMs = (v) => {
      const ms = Date.parse(String(v || ''));
      return Number.isFinite(ms) ? ms : 0;
    };
    links.sort((a, b) => {
      const diff = toMs(b.createdAt) - toMs(a.createdAt);
      if (diff !== 0) return diff;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    res.json({
      success: true,
      links,
      count: links.length
    });
  } catch (error) {
    console.error('Error fetching UTM links:', error);
    // Return empty list instead of error if collection doesn't exist
    res.json({
      success: true,
      links: [],
      count: 0,
      message: 'No UTM links yet'
    });
  }
});

// ============================================
// EARNINGS & STATISTICS
// ============================================

/**
 * GET /api/member/earnings
 * Get member earnings and statistics
 */
router.get('/earnings', verifyMember, async (req, res) => {
  try {
    // Get earnings records for this member (daily/campaign rows)
    let earningsSnapshot;
    try {
      earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', req.memberId)
        .orderBy('date', 'desc')
        .limit(90)
        .get();
    } catch (orderError) {
      console.warn('⚠️ Earnings orderBy failed, using simple query...');
      earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', req.memberId)
        .limit(90)
        .get();
    }

    const history = [];
    let totalEarned = 0;
    let totalClicks = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    earningsSnapshot.forEach(doc => {
      const data = doc.data();

      // Ignore summary-style docs that don't include a date
      if (!data.date) return;

      const clicks = Number(data.clicks || 0);
      const earned = Number(data.memberEarnings ?? data.earnings ?? data.revenue ?? 0);

      totalEarned += earned;
      totalClicks += clicks;

      const d = new Date(data.date);
      if (!Number.isNaN(d.getTime())) {
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          thisMonth += earned;
        }
        if (d >= weekStart) {
          thisWeek += earned;
        }
      }

      history.push({
        date: data.date,
        event: data.campaign || 'Earnings',
        amount: Math.round(earned * 100) / 100,
        clicks,
        rpm: Number(data.memberRpm ?? data.rpm ?? 0),
        status: 'Updated'
      });
    });

    // Calculate average RPM
    const avgRpm = totalClicks > 0 ? (totalEarned / totalClicks * 1000) : 0;

    // Calculate available balance (earned - paid - pending)
    const paymentsSnapshot = await db.collection('payments')
      .where('memberId', '==', req.memberId)
      .get();

    let totalPaid = 0;
    let pendingPayouts = 0;
    paymentsSnapshot.forEach(doc => {
      const p = doc.data();
      const amt = Number(p.amount || 0);
      const status = (p.status === 'completed') ? 'paid' : (p.status || 'pending');
      if (status === 'paid') totalPaid += amt;
      if (status === 'pending' || status === 'approved') pendingPayouts += amt;
    });

    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts);

    res.json({
      success: true,
      earnings: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        thisWeek: Math.round(thisWeek * 100) / 100,
        thisMonth: Math.round(thisMonth * 100) / 100,
        averageRpm: Math.round(avgRpm * 100) / 100,
        totalClicks,
        availableBalance: Math.round(availableBalance * 100) / 100
      },
      history
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
  }
});

/**
 * GET /api/member/dashboard
 * Get complete member dashboard data
 */
router.get('/dashboard', verifyMember, async (req, res) => {
  try {
    console.log(`📊 Fetching dashboard for member: ${req.memberId}`);

    let earningsSnapshot;
    try {
      // Try with orderBy (requires composite index)
      earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', req.memberId)
        .orderBy('date', 'desc')
        .limit(7)
        .get();
      console.log(`✅ Earnings query with orderBy succeeded`);
    } catch (orderByError) {
      console.warn(`⚠️ Earnings orderBy failed (missing index), trying without ordering:`, orderByError.message);
      // Fallback: get without ordering
      earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', req.memberId)
        .limit(7)
        .get();
      console.log(`✅ Earnings query without orderBy succeeded`);
    }

    let totalEarnings = 0;
    earningsSnapshot.forEach(doc => {
      const d = doc.data();
      totalEarnings += Number(d.memberEarnings ?? d.earnings ?? d.revenue ?? 0);
    });
    console.log(`✅ Total earnings calculated: ${totalEarnings}`);

    // Get UTM links
    const linksSnapshot = await db.collection('utm_links')
      .where('memberId', '==', req.memberId)
      .get();
    console.log(`✅ UTM links found: ${linksSnapshot.size}`);

    let totalClicks = 0;
    linksSnapshot.forEach(doc => {
      totalClicks += doc.data().clicks || 0;
    });
    console.log(`✅ Total clicks calculated: ${totalClicks}`);

    // Get member profile
    const memberDoc = await db.collection('users').doc(req.memberId).get();
    if (!memberDoc.exists) {
      console.error(`❌ Member document not found for ID: ${req.memberId}`);
      return res.status(404).json({ success: false, message: 'Member profile not found' });
    }

    const memberData = memberDoc.data();
    console.log(`✅ Member profile loaded: ${memberData.email}`);

    res.json({
      success: true,
      dashboard: {
        name: memberData.name || 'Member',
        email: memberData.email,
        stats: {
          totalEarned: Math.round(totalEarnings * 100) / 100,
          linksCreated: linksSnapshot.size,
          totalClicks,
          averageRpm: totalClicks > 0 ? Math.round((totalEarnings / totalClicks * 1000) * 100) / 100 : 0
        },
        recentActivity: 'Your dashboard has loaded successfully'
      }
    });
    console.log(`✅ Dashboard response sent successfully`);
  } catch (error) {
    console.error('❌ Error fetching dashboard:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard', error: error.message });
  }
});

/**
 * GET /api/member/categories
 * Get all categories
 */
router.get('/categories', verifyMember, async (req, res) => {
  try {
    console.log(`📂 Fetching categories...`);

    const categoriesSnapshot = await db.collection('categories').get();
    const categories = categoriesSnapshot.docs.map(doc => {
      const data = doc.data() || {};
      const count = Number(data.articleCount ?? data.count ?? data.article_count ?? 0) || 0;
      return {
        id: doc.id,
        name: data.name || doc.id,
        count,
        articleCount: count,
        siteCount: Number(data.siteCount ?? data.wpCount ?? 0) || 0,
        slug: data.slug || null,
        description: data.description || null
      };
    });

    console.log(`✅ Categories fetched: ${categories.length}`);
    res.json({ success: true, categories });
  } catch (error) {
    console.error('❌ Error fetching categories:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/member/statistics
 * Get member statistics with optional date range
 */
router.get('/statistics', verifyMember, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log(`📊 Fetching statistics for member: ${req.memberId}`, { startDate, endDate });

    // Link count (informational)
    const linksSnapshot = await db.collection('utm_links')
      .where('memberId', '==', req.memberId)
      .get();

    // Get earnings with optional date filtering
    let earningsQuery = db.collection('earnings').where('memberId', '==', req.memberId);
    
    if (startDate) {
      earningsQuery = earningsQuery.where('date', '>=', startDate);
    }
    if (endDate) {
      earningsQuery = earningsQuery.where('date', '<=', endDate);
    }

    let earningsSnapshot;
    try {
      earningsSnapshot = await earningsQuery.get();
    } catch (queryError) {
      const msg = String(queryError?.message || '');
      const needsIndex = msg.includes('requires an index') || queryError?.code === 9;
      if (!needsIndex) throw queryError;

      // Firestore may require a composite index for (memberId + date range).
      // To keep the app usable out-of-the-box, fall back to fetching by memberId
      // and filtering dates in memory.
      console.warn('⚠️ Earnings date-range query requires an index; falling back to in-memory filtering.', msg);
      earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', req.memberId)
        .get();
    }
    
    let totalEarnings = 0;
    let totalClicks = 0;
    const dailyData = {};

    const campaignMap = {};

    earningsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.date) return;

      // Apply date filter in memory as well (works both for indexed and fallback queries)
      if (startDate && String(data.date) < String(startDate)) return;
      if (endDate && String(data.date) > String(endDate)) return;

      const clicks = Number(data.clicks || 0);
      const earned = Number(data.memberEarnings ?? data.earnings ?? data.revenue ?? 0);
      const grossRevenue = Number(data.revenue || 0);

      totalEarnings += earned;
      totalClicks += clicks;
      
      const date = data.date;
      if (!dailyData[date]) {
        dailyData[date] = { clicks: 0, revenue: 0, activeUsers: 0 };
      }
      dailyData[date].clicks += clicks;
      dailyData[date].revenue += earned;
      dailyData[date].activeUsers = Math.max(dailyData[date].activeUsers, data.activeUsers || 0);

      const campaignName = data.campaign || data.campaignName || 'Campaign';
      if (!campaignMap[campaignName]) {
        campaignMap[campaignName] = { name: campaignName, clicks: 0, earnings: 0, revenue: 0, ctr: 0 };
      }
      campaignMap[campaignName].clicks += clicks;
      campaignMap[campaignName].earnings += earned;
      campaignMap[campaignName].revenue += grossRevenue;
    });

    // Convert to array and sort
    const dailyStats = Object.entries(dailyData).map(([date, stats]) => ({
      date,
      ...stats,
      rpm: stats.clicks > 0 ? Math.round((stats.revenue / stats.clicks * 1000) * 100) / 100 : 0
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    const campaigns = Object.values(campaignMap)
      .map(c => ({
        ...c,
        clicks: Math.round(c.clicks),
        earnings: Math.round(c.earnings * 100) / 100,
        revenue: Math.round(c.revenue * 100) / 100
      }))
      .sort((a, b) => b.clicks - a.clicks);

    console.log(`✅ Statistics generated: ${Object.keys(dailyData).length} days`);
    res.json({
      success: true,
      stats: {
        totalLinks: linksSnapshot.size,
        totalClicks,
        totalRevenue: Math.round(totalEarnings * 100) / 100,
        averageRpm: totalClicks > 0 ? Math.round(((totalEarnings / totalClicks) * 1000) * 100) / 100 : 0,
        topCampaign: campaigns[0]?.name || 'No campaigns yet',
        conversionRate: 0
      },
      topCampaigns: campaigns.slice(0, 5),
      statistics: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalClicks,
        averageRpm: totalClicks > 0 ? Math.round((totalEarnings / totalClicks * 1000) * 100) / 100 : 0,
        dailyStats
      }
    });
  } catch (error) {
    console.error('❌ Error fetching statistics:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
});

/**
 * POST /api/member/create-utm
 * Create a new UTM tracking link
 */
router.post('/create-utm', verifyMember, async (req, res) => {
  try {
    const { campaignName, medium, source, content } = req.body;
    const destinationUrlInput =
      req.body.destinationUrl ||
      req.body.destination ||
      req.body.url ||
      req.body.articleUrl ||
      null;

    console.log(`🔗 Creating UTM link for member: ${req.memberId}`, {
      campaignName,
      medium,
      destinationUrl: destinationUrlInput ? String(destinationUrlInput).slice(0, 200) : undefined
    });

    if (!campaignName) {
      return res.status(400).json({ success: false, message: 'Campaign name is required' });
    }

    const normalizedMedium = String(medium || 'social').toLowerCase();
    const normalizedSource = String(source || 'captionmood').toLowerCase();
    const normalizedContent = String(content || '');
    const campaignSlug = slugifyCampaignName(campaignName);

    const linkRef = db.collection('utm_links').doc();
    const utmTerm = linkRef.id;

    const fallbackBaseUrl = 'https://captionmood.com/';

    const destinationUrlProvided = Boolean(String(destinationUrlInput || '').trim());
    const normalizedDestinationUrl = normalizeHttpUrlInput(destinationUrlInput);
    if (destinationUrlProvided && !normalizedDestinationUrl) {
      return res.status(400).json({
        success: false,
        message: 'Invalid destination URL. Please paste a single full URL like https://captionmood.com/some-article (remove any extra default text).' 
      });
    }

    const destinationUrl = normalizedDestinationUrl || fallbackBaseUrl;
    const url = new URL(destinationUrl);
    url.searchParams.set('utm_source', normalizedSource);
    url.searchParams.set('utm_medium', normalizedMedium);
    url.searchParams.set('utm_campaign', campaignSlug);
    url.searchParams.set('utm_term', utmTerm);
    if (normalizedContent) {
      url.searchParams.set('utm_content', normalizedContent);
    }
    url.searchParams.set('utm_member', req.memberId);

    const trackingUrl = url.toString();

    const destinationHost = (() => {
      try {
        return new URL(destinationUrl).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();

    const titleFromBody = String(req.body.articleTitle || req.body.title || '').trim();
    const articleTitle =
      titleFromBody ||
      (destinationHost.includes('captionmood') ? 'CaptionMood (Custom Link)' : (destinationHost ? `Custom Link (${destinationHost})` : 'Custom Link'));

    const utmLink = {
      memberId: req.memberId,
      memberEmail: req.memberData.email,
      articleTitle,
      articleUrl: destinationUrl,
      campaignName,
      campaignSlug,
      medium: normalizedMedium,
      source: normalizedSource,
      content: normalizedContent,
      utmTerm,
      trackingUrl,
      createdAt: admin.firestore.Timestamp.now(),
      status: 'active',
      clicks: 0,
      revenue: 0
    };

    await linkRef.set(utmLink);
    console.log(`✅ UTM link created: ${linkRef.id}`);

    res.json({
      success: true,
      link: {
        id: linkRef.id,
        campaignName,
        medium: normalizedMedium,
        source: normalizedSource,
        content: normalizedContent,
        url: trackingUrl,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error creating UTM link:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create UTM link', error: error.message });
  }
});

/**
 * GET /api/member/payments
 * Get member's payment history
 */
router.get('/payments', verifyMember, async (req, res) => {
  try {
    console.log(`💰 Fetching payments for member: ${req.memberId}`);

    let paymentsSnapshot;
    try {
      // Try with orderBy first
      paymentsSnapshot = await db.collection('payments')
        .where('memberId', '==', req.memberId)
        .orderBy('requestDate', 'desc')
        .get();
    } catch (orderError) {
      // Fallback: get without ordering
      console.warn('⚠️ OrderBy failed, using simple query...');
      paymentsSnapshot = await db.collection('payments')
        .where('memberId', '==', req.memberId)
        .get();
    }

    const payments = paymentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const status = (data.status === 'completed') ? 'paid' : (data.status || 'pending');
      const requestedAtIso =
        (data.requestedAt?.toDate?.() ? data.requestedAt.toDate().toISOString() : null) ||
        (data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : null) ||
        (typeof data.requestDate === 'string' ? data.requestDate : null) ||
        new Date().toISOString();

      return {
        id: doc.id,
        memberId: data.memberId,
        amount: Number(data.amount || 0),
        status, // pending | approved | paid | rejected
        requestDate: requestedAtIso,
        requestedAt: requestedAtIso,
        approvedAt: data.approvedAt?.toDate?.().toISOString() || data.approvedDate || null,
        paidAt: data.paidAt?.toDate?.().toISOString() || data.paidDate || null,
        notes: data.notes || '',
        rejectionReason: data.rejectionReason || null
      };
    });

    // Calculate payout totals
    let totalPaid = 0;
    let pending = 0;
    payments.forEach(payment => {
      const amt = Number(payment.amount || 0);
      if (payment.status === 'paid') {
        totalPaid += amt;
      } else if (payment.status === 'pending' || payment.status === 'approved') {
        pending += amt;
      }
    });

    // Calculate total earned from earnings records
    const earningsSnapshot = await db.collection('earnings')
      .where('memberId', '==', req.memberId)
      .get();

    let totalEarned = 0;
    earningsSnapshot.forEach(doc => {
      const e = doc.data();
      if (!e.date) return; // ignore summary docs
      const memberEarnings = Number(e.memberEarnings ?? e.earnings ?? e.revenue ?? 0);
      totalEarned += memberEarnings;
    });

    const available = Math.max(0, totalEarned - totalPaid - pending);

    console.log(`✅ Payments fetched: ${payments.length}`);
    res.json({
      success: true,
      payments,
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        pending: Math.round(pending * 100) / 100,
        available: Math.round(available * 100) / 100
      }
    });
  } catch (error) {
    console.error('❌ Error fetching payments:', error.message);
    // Return empty payments instead of error
    res.json({
      success: true,
      payments: [],
      summary: {
        totalEarned: 0,
        totalPaid: 0,
        pending: 0,
        available: 0
      },
      message: 'No payments yet'
    });
  }
});

/**
 * POST /api/member/request-payout
 * Request a payout
 */
router.post('/request-payout', verifyMember, async (req, res) => {
  try {
    const { amount, notes } = req.body;
    console.log(`💰 Payout request for member: ${req.memberId}, amount: $${amount}`);

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Server-side available balance check (earned - paid - pending/approved)
    const earningsSnapshot = await db.collection('earnings')
      .where('memberId', '==', req.memberId)
      .get();

    let totalEarned = 0;
    earningsSnapshot.forEach(doc => {
      const e = doc.data();
      if (!e.date) return;
      totalEarned += Number(e.memberEarnings ?? e.earnings ?? e.revenue ?? 0);
    });

    const paymentsSnapshot = await db.collection('payments')
      .where('memberId', '==', req.memberId)
      .get();

    let totalPaid = 0;
    let pendingPayouts = 0;
    paymentsSnapshot.forEach(doc => {
      const p = doc.data();
      const status = (p.status === 'completed') ? 'paid' : (p.status || 'pending');
      const amt = Number(p.amount || 0);
      if (status === 'paid') totalPaid += amt;
      if (status === 'pending' || status === 'approved') pendingPayouts += amt;
    });

    const availableBalance = Math.max(0, totalEarned - totalPaid - pendingPayouts);
    if (Number(amount) > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds available balance ($${availableBalance.toFixed(2)})`
      });
    }

    const now = admin.firestore.Timestamp.now();

    const payoutRequest = {
      memberId: req.memberId,
      memberEmail: req.memberData.email,
      amount: Number(amount),
      status: 'pending',
      notes: notes || '',
      requestedAt: now,
      requestDate: new Date().toISOString(),
      createdAt: now,
      approvedAt: null,
      paidAt: null,
      rejectionReason: null
    };

    const docRef = await db.collection('payments').add(payoutRequest);
    console.log(`✅ Payout request created: ${docRef.id}`);

    res.json({
      success: true,
      request: {
        id: docRef.id,
        ...payoutRequest
      }
    });
  } catch (error) {
    console.error('❌ Error requesting payout:', error.message);
    res.status(500).json({ success: false, message: 'Failed to request payout', error: error.message });
  }
});

/**
 * GET /api/member/profile
 * Get member's profile
 */
router.get('/profile', verifyMember, async (req, res) => {
  try {
    console.log(`👤 Fetching profile for member: ${req.memberId}`);

    const userDoc = await db.collection('users').doc(req.memberId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const userData = userDoc.data();
    console.log(`✅ Profile loaded: ${userData.email}`);

    res.json({
      success: true,
      profile: {
        id: req.memberId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        joinDate: userData.joinDate,
        approvalDate: userData.approvalDate,
        bank: userData.bank || '',
        accountHolder: userData.accountHolder || '',
        notes: userData.notes || ''
      }
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: error.message });
  }
});

/**
 * PUT /api/member/profile
 * Update member's profile
 */
router.put('/profile', verifyMember, async (req, res) => {
  try {
    const { name, bank, accountHolder, notes } = req.body;
    console.log(`👤 Updating profile for member: ${req.memberId}`);

    const updates = {};
    if (name) updates.name = name;
    if (bank) updates.bank = bank;
    if (accountHolder) updates.accountHolder = accountHolder;
    if (notes !== undefined) updates.notes = notes;

    await db.collection('users').doc(req.memberId).update(updates);
    console.log(`✅ Profile updated successfully`);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('❌ Error updating profile:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

export default router;
