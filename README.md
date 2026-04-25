# TeamClickTracker

Professional Team Click Tracking & Earnings Dashboard.

**Stack:** Node.js (Express) + Firebase Admin (Firestore) + Static HTML/CSS/JS frontend.

## Local development

1. Create a local `.env` from `.env.example`.
2. Provide Firebase/GA credentials (pick one):
	- **Recommended for local:** place a service-account JSON at `config/google-analytics-key.json` (this file is gitignored)
	- **Recommended for hosted/serverless:** set `FIREBASE_SERVICE_ACCOUNT` to the full service-account JSON
3. Install & run:
	- `npm install`
	- `npm start`

Backend runs on `http://localhost:5000`.

## Deploy on Vercel

This repo is **Vercel-ready**:
- `api/index.js` exports the Express app as a Serverless Function
- `vercel.json` routes all requests to that function

### Steps

1. In Vercel: **Add New → Project → Import** the GitHub repo.
2. Set Environment Variables in Vercel (Project → Settings → Environment Variables):
	- `FIREBASE_SERVICE_ACCOUNT` (required)
	- `GA4_PROPERTY_ID`, `GA_LOOKBACK_DAYS`, `MEMBER_COMMISSION_RATE`, `ADMIN_COMMISSION_RATE` (optional)
	- `INTERNAL_API_KEY` (recommended — protects internal endpoints)
3. Deploy.

### Important note about scheduled jobs

Vercel Serverless Functions do **not** run the built-in `node-cron` scheduler in the background.

If you want daily automation on Vercel, trigger jobs via an external scheduler calling these endpoints:
- `POST /api/jobs/test/web_scraper`
- `POST /api/jobs/test/category_counter`
- `POST /api/jobs/test/ga_data_fetcher`

If `INTERNAL_API_KEY` is set, pass either:
- Header: `x-internal-api-key: <value>`
- Or query: `?internalApiKey=<value>` (less secure; use only if your scheduler can’t send headers)

## Documentation

- `README_MASTER_GUIDE.md` — complete system guide
- `QUICK_START.md` — fast setup
- `COMPLETE_SETUP_GUIDE.md` — full installation + Firebase setup