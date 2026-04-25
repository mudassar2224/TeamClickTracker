/**
 * Vercel Serverless Function entrypoint.
 *
 * This exports the Express app (no listen) so Vercel can handle requests.
 */

import app from '../backend/app.js';

export default app;
