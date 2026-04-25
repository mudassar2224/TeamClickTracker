# Fix Firebase Credentials - 5 Minute Guide

## The Issue
✅ Backend is ready to use  
✅ All dashboards are built  
✅ Scraper is ready to run  
❌ **BLOCKED**: Service account for wrong project, Firestore API not enabled  

## The Solution  (Choose ONE option below)

### OPTION 1: Use Your Friend's Project (RECOMMENDED)
Since your friend has GA Property ID 519091919 in project `utm-tracker-5802e`, they likely have Google Cloud access.

#### Steps:
1. **Ask your friend to generate a service account:**
   - Go to: https://console.firebase.google.com/project/utm-tracker-5802e/settings/serviceaccounts/adminsdk
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Replace the credentials:**
   - Copy the downloaded JSON
   - Save it as: `C:\Web_development\TeamClickTracker\config\google-analytics-key.json`
   - Restart backend: `npm start`

3. **That's it!** Everything will work.

---

### OPTION 2: Use Your Own Firebase Project
If you have a Firebase project you own:

#### Steps:
1. Go to: https://console.firebase.google.com
2. Create a new project OR select existing project
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Download JSON
6. Replace: `C:\Web_development\TeamClickTracker\config\google-analytics-key.json`
7. Update backend config if needed
8. Run: `npm start`

---

### OPTION 3: Enable API on socailgold (If you have access)
If you own the socailgold project:

1. Go to: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=socailgold
2. Click "Enable API"
3. Wait 2 minutes
4. Restart backend: `npm start`

---

## After Credentials Are Fixed

Run these commands to populate REAL data:

```bash
# Terminal 1 - Start backend
npm start

# Terminal 2 - Trigger scraper
curl -X POST http://localhost:5000/api/jobs/test/web_scraper

# Terminal 3 - Open dashboard
start frontend/member_dashboard.html
```

---

## What Will Happen Next

✅ Scraper will fetch 400+ articles from captionmood.com  
✅ All articles saved to Firebase Firestore  
✅ Dashboard loads REAL data instantly  
✅ Categories auto-extracted  
✅ Ready to deploy  

---

## Timeline

- **Before**: Random errors, dummy data, demo dashboards
- **After**: Everything works with REAL Firebase data

Estimated time to fix: **5 minutes**  
Estimated time for scraper to populate: **2 minutes**  
Estimated time to see everything working: **10 minutes total**

---

## Questions?

If you hit any errors:
1. Check that JSON credentials file is in: `C:\Web_development\TeamClickTracker\config\google-analytics-key.json`
2. Verify it has `"type": "service_account"` in it
3. Check that the backend logs say which project it's using
4. Run: `npm start` and share any error messages
