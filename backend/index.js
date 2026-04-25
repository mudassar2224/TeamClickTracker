/**
 * BACKEND SERVER - TEAMCLICKTRACKER
 * Node.js entry point
 *
 * Starts:
 * - Express server
 * - (optionally) Daily schedulers (scraper, GA fetcher, etc)
 *
 * NOTE: The Express app is defined in `backend/app.js` so it can be reused
 * by serverless runtimes (e.g. Vercel) without calling `app.listen()`.
 */

import app from './app.js';
import { initializeScheduler } from './jobs/scheduler.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n=================================');
  console.log('🚀 TEAMCLICKTRACKER BACKEND');
  console.log('=================================\n');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);

  const disableScheduler =
    String(process.env.DISABLE_SCHEDULER || '').toLowerCase() === 'true' ||
    Boolean(process.env.VERCEL);

  if (disableScheduler) {
    console.log('⏭️ Scheduler disabled (DISABLE_SCHEDULER=true or VERCEL detected).');
  } else {
    // Initialize daily schedulers
    setTimeout(() => {
      initializeScheduler();
    }, 1000);
  }

  console.log('\n✅ Backend ready!\n');
});

export default app;
