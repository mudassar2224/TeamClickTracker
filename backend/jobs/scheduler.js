/**
 * DAILY SCHEDULER (UTC)
 * Runs automated jobs every day:
 * - 2:00 AM: Web Scraper (fetch articles & categories)
 * - 2:15 AM: Category Counter (count articles per category)
 * - 3:00 AM: GA Data Fetcher (fetch GA data & calculate earnings) — SAFE MODE (every 24h)
 */

import cron from 'node-cron';
import { runScraper } from '../scrapers/captionmood-scraper.js';
import { updateCategoryCounts } from '../jobs/category-counter.js';
import { fetchGAData } from '../jobs/ga-data-fetcher.js';
import { populateSampleData } from '../jobs/populate-sample-data.js';
import { db, admin } from '../config/firebase-admin.js';

// Timezone: UTC (adjust for your timezone)
// 2:00 AM UTC = 0 2 * * *
// 2:15 AM UTC = 15 2 * * *
// 3:00 AM UTC = 0 3 * * *

let tasks = [];

// --------------------------------------------
// GA Fetcher Backoff (reduces failure spam)
// --------------------------------------------
let gaFetcherInFlight = false;
let gaFetcherCooldownUntilMs = 0;
let gaFetcherConsecutiveFailures = 0;
let gaFetcherLastErrorMessage = null;
let gaFetcherLastCooldownLogAtMs = 0;

function computeGaFetcherCooldownMs(errorMessage, consecutiveFailures) {
  const msg = String(errorMessage || '').toLowerCase();

  // Common configuration / enablement issues
  if (msg.includes('analyticsdata.googleapis.com')) {
    return 60 * 60 * 1000; // 1 hour
  }
  if (msg.includes('analytics data api') && (msg.includes('disabled') || msg.includes('not been used'))) {
    return 60 * 60 * 1000; // 1 hour
  }
  if (msg.includes('permission') || msg.includes('not authorized') || msg.includes('insufficient')) {
    return 30 * 60 * 1000; // 30 minutes
  }
  if (msg.includes('ga client not configured') || msg.includes('missing service account key')) {
    return 6 * 60 * 60 * 1000; // 6 hours
  }

  // Exponential backoff: 5m, 10m, 20m, 40m, 60m (cap)
  const base = 5 * 60 * 1000;
  const exp = Math.min(Math.max(0, Number(consecutiveFailures) || 0), 4);
  return Math.min(base * (2 ** exp), 60 * 60 * 1000);
}

function maybeLogGaCooldown(nowMs) {
  // Log at most once every 10 minutes while cooling down
  if (nowMs - gaFetcherLastCooldownLogAtMs < 10 * 60 * 1000) return;
  const untilIso = new Date(gaFetcherCooldownUntilMs).toISOString();
  console.warn(`⏳ GA Data Fetcher is in cooldown until ${untilIso}. Last error: ${gaFetcherLastErrorMessage || 'unknown'}`);
  gaFetcherLastCooldownLogAtMs = nowMs;
}

/**
 * JOB 1: Web Scraper (2:00 AM Daily)
 * - Fetches captionmood.com
 * - Extracts articles & categories
 * - Stores in Firestore
 */
function scheduleWebScraper() {
  console.log('📅 Scheduling Web Scraper for 2:00 AM daily...');
  
  // Run at 2:00 AM every day
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('\n🎬 [2:00 AM] Web Scraper triggered');

    try {
      const result = await runScraper();
      
      // Log successful run
      await db.collection('job_logs').add({
        jobName: 'web_scraper',
        status: 'success',
        result,
        timestamp: admin.firestore.Timestamp.now(),
        duration: result.duration || 0
      });
      
      console.log('✅ Web Scraper completed successfully');
    } catch (error) {
      console.error('❌ Web Scraper failed:', error.message);
      
      // Log failed run
      await db.collection('job_logs').add({
        jobName: 'web_scraper',
        status: 'failed',
        error: error.message,
        timestamp: admin.firestore.Timestamp.now()
      }).catch(e => console.error('Failed to log error:', e));
    }
  }, {
    timezone: 'UTC'
  });
  
  tasks.push({ name: 'web_scraper', task });
  console.log('✅ Web Scraper scheduled');
}

/**
 * JOB 2: Category Counter (2:15 AM Daily)
 * - Counts articles per category
 * - Updates Firebase
 */
function scheduleCategoryCounter() {
  console.log('📅 Scheduling Category Counter for 2:15 AM daily...');
  
  // Run at 2:15 AM every day
  const task = cron.schedule('15 2 * * *', async () => {
    console.log('\n🎬 [2:15 AM] Category Counter triggered');
    
    try {
      const result = await updateCategoryCounts();
      
      await db.collection('job_logs').add({
        jobName: 'category_counter',
        status: 'success',
        result,
        timestamp: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ Category Counter completed successfully');
      
    } catch (error) {
      console.error('❌ Category Counter failed:', error.message);
      
      await db.collection('job_logs').add({
        jobName: 'category_counter',
        status: 'failed',
        error: error.message,
        timestamp: admin.firestore.Timestamp.now()
      }).catch(e => console.error('Failed to log error:', e));
    }
  }, {
    timezone: 'UTC'
  });
  
  tasks.push({ name: 'category_counter', task });
  console.log('✅ Category Counter scheduled');
}

/**
 * JOB 3: GA Data Fetcher (Every 24 Hours - SAFE MODE)
 * - Connects to Google Analytics
 * - Fetches clicks, revenue, users
 * - Calculates earnings
 * - Updates dashboards
 *
 * SAFE MODE: Runs once per day to reduce load/complexity.
 */
function scheduleGADataFetcher() {
  console.log('📅 Scheduling GA Data Fetcher for 3:00 AM UTC daily (SAFE MODE - every 24h)...');
  
  // Run at 3:00 AM every day (UTC)
  const task = cron.schedule('0 3 * * *', async () => {
    const nowMs = Date.now();

    // Avoid overlapping runs
    if (gaFetcherInFlight) {
      return;
    }

    // Backoff when repeatedly failing (e.g. API disabled)
    if (gaFetcherCooldownUntilMs && nowMs < gaFetcherCooldownUntilMs) {
      maybeLogGaCooldown(nowMs);
      return;
    }

    console.log('\n🎬 [3:00 AM] GA Data Fetcher triggered (SAFE MODE)');
    gaFetcherInFlight = true;

    try {
      const result = await fetchGAData();

      // Reset backoff state on success
      gaFetcherConsecutiveFailures = 0;
      gaFetcherCooldownUntilMs = 0;
      gaFetcherLastErrorMessage = null;
      gaFetcherLastCooldownLogAtMs = 0;
      
      await db.collection('job_logs').add({
        jobName: 'ga_data_fetcher',
        status: 'success',
        result,
        timestamp: admin.firestore.Timestamp.now()
      });
      
      console.log('✅ GA Data Fetcher completed successfully');
      
    } catch (error) {
      const msg = error?.message || String(error);
      console.error('❌ GA Data Fetcher failed:', msg);

      gaFetcherLastErrorMessage = msg;
      const cooldownMs = computeGaFetcherCooldownMs(msg, gaFetcherConsecutiveFailures);
      gaFetcherConsecutiveFailures += 1;
      gaFetcherCooldownUntilMs = Date.now() + cooldownMs;
      gaFetcherLastCooldownLogAtMs = 0; // allow immediate cooldown log
      maybeLogGaCooldown(Date.now());
      
      await db.collection('job_logs').add({
        jobName: 'ga_data_fetcher',
        status: 'failed',
        error: msg,
        cooldownMs,
        timestamp: admin.firestore.Timestamp.now()
      }).catch(e => console.error('Failed to log error:', e));

      // Extra hint for the most common issue
      if (String(msg).toLowerCase().includes('analyticsdata.googleapis.com')) {
        console.warn('👉 Fix needed: Enable the "Google Analytics Data API" in your Google Cloud project, and grant this service account access to the GA4 property.');
      }
    } finally {
      gaFetcherInFlight = false;
    }
  }, {
    timezone: 'UTC'
  });
  
  tasks.push({ name: 'ga_data_fetcher', task });
  console.log('✅ GA Data Fetcher scheduled');
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
  console.log('\n===================================');
  console.log('🚀 Initializing Daily Scheduler');
  console.log('===================================\n');
  
  scheduleWebScraper();
  scheduleCategoryCounter();
  scheduleGADataFetcher();
  
  console.log('\n===================================');
  console.log('✅ All jobs scheduled successfully');
  console.log('===================================\n');
  
  console.log('📅 UPDATED SCHEDULE:');
  console.log('  2:00 AM - Web Scraper        (fetch articles & categories - DAILY)');
  console.log('  2:15 AM - Category Counter   (count articles per category - DAILY)');
  console.log('  3:00 AM - GA Data Fetcher     (fetch GA data & calculate earnings - DAILY / SAFE MODE)');
  console.log('');
  
  // Optional: run once on startup (useful for manual verification)
  const runOnStartup = String(process.env.GA_FETCH_ON_STARTUP || '').toLowerCase() === 'true';
  if (runOnStartup) {
    console.log('⚡ GA_FETCH_ON_STARTUP=true → running GA Data Fetcher once on startup...\n');
    setTimeout(async () => {
      try {
        await fetchGAData();
        console.log('✅ Startup GA fetch completed\n');
      } catch (error) {
        console.error('⚠️ Startup GA fetch warning:', error.message);
      }
    }, 2000); // Wait 2 seconds to ensure Firebase is ready
  }
  
  return tasks;
}

/**
 * Stop all scheduled tasks
 */
export function stopScheduler() {
  console.log('⛔ Stopping scheduler...');
  
  tasks.forEach(({ name, task }) => {
    task.stop();
    console.log(`✅ Stopped: ${name}`);
  });
  
  tasks = [];
  console.log('✅ Scheduler stopped');
}

/**
 * Manually test a job
 */
export async function testJob(jobName) {
  console.log(`\n🧪 Testing job: ${jobName}\n`);

  if (jobName === 'web_scraper') {
    // Run the REAL scraper to fetch from captionmood.com
    const result = await runScraper();
    console.log(`\n✅ Test completed: ${jobName}\n`);
    return result;
  }

  if (jobName === 'category_counter') {
    const result = await updateCategoryCounts();
    console.log(`\n✅ Test completed: ${jobName}\n`);
    return result;
  }

  if (jobName === 'ga_data_fetcher') {
    const result = await fetchGAData();
    console.log(`\n✅ Test completed: ${jobName}\n`);
    return result;
  }

  // Ensure callers see a proper failure
  throw new Error(`Unknown job: ${jobName}`);
}

export default initializeScheduler;
