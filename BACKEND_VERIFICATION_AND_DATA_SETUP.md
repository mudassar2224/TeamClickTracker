# 🔧 BACKEND VERIFICATION & DATA SETUP GUIDE
**Last Updated:** April 2, 2026  
**Purpose:** Verify backend is working and populate real data

---

## ❌ CURRENT PROBLEM

All dashboards show **$0.00** because:
- ❌ Articles NOT fetched from captionmood.com
- ❌ Google Analytics data NOT fetched
- ❌ No earnings calculated
- ❌ No UTM links created

---

## ✅ WHAT'S ACTUALLY BUILT

### Backend Services (DEPLOYED)

```javascript
// 1. EXPRESS SERVER - RUNNING
✅ All API routes registered
✅ Authentication working
✅ Member APIs working
✅ Admin APIs working

// 2. SCHEDULED JOBS (Auto at specific times)
✅ 2:00 AM UTC - Web Scraper (fetch articles)
✅ 2:15 AM UTC - Category Counter (count articles)
✅ 3:00 AM UTC - GA Data Fetcher (calculate earnings)

// 3. MANUAL TRIGGER ENDPOINTS (Run anytime)
✅ POST /api/jobs/test/web_scraper
✅ POST /api/jobs/test/category_counter
✅ POST /api/jobs/test/ga_data_fetcher
```

---

## 🚀 SETUP STEPS (DO THIS NOW)

### STEP 1: Start Backend Server

```bash
# Windows PowerShell
cd c:\Web_development\TeamClickTracker
node backend/index.js
```

**You should see:**
```
✅ Firebase Admin SDK initialized
📅 Scheduling Web Scraper for 2:00 AM daily...
📅 Scheduling Category Counter for 2:15 AM daily...
📅 Scheduling GA Data Fetcher for 3:00 AM daily...
🎯 Server listening on port 5000
```

---

### STEP 2: Verify Server is Running

Open browser, go to:
```
http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-02T...",
  "service": "TeamClickTracker Backend"
}
```

If ✅ backend is running, continue to STEP 3.

---

### STEP 3: Trigger Data Fetchers (IN THIS ORDER)

#### **3A - Fetch Articles from captionmood.com**

```bash
curl -X POST http://localhost:5000/api/jobs/test/web_scraper
```

**Wait 30 seconds** - should see:
```
🎬 [2:00 AM] Web Scraper triggered
[Fetching captionmood.com...]
✅ Web Scraper completed successfully
```

Check Firebase:
```
✅ articles collection - should have 50+ documents
✅ categories collection - should have items
```

---

#### **3B - Count Categories**

```bash
curl -X POST http://localhost:5000/api/jobs/test/category_counter
```

**Wait 10 seconds** - should see:
```
🎬 [2:15 AM] Category Counter triggered
[Counting articles per category...]
✅ Category Counter completed successfully
```

---

#### **3C - Fetch Google Analytics Data**

```bash
curl -X POST http://localhost:5000/api/jobs/test/ga_data_fetcher
```

**Wait 30 seconds** - should see:
```
🎬 [3:00 AM] GA Data Fetcher triggered
[Fetching GA Property 519091919...]
[Calculating member earnings...]
✅ GA Data Fetcher completed successfully
```

Check Firebase:
```
✅ earnings collection - should have revenue data
✅ members should now show earnings > 0
```

---

## 🔍 VERIFY DATA IN FIREBASE

### Check Collections

**In Firebase Console → Firestore Database:**

1. **articles collection**
   ```
   Expected: 50+ documents from captionmood.com
   Each should have:
   - title
   - url
   - category
   - image
   - description
   ```

2. **categories collection**
   ```
   Expected: All categories from captionmood.com
   Examples:
   - Korean Fashion
   - Animal
   - Beauty Tips
   - Art & Sketch
   - Celebrity
   ```

3. **earnings collection**
   ```
   Expected: Earnings per member
   Each should have:
   - memberId
   - date
   - clicks (from GA)
   - revenue (from GA)
   - rpm
   ```

4. **utm_links collection**
   ```
   Expected: Links created by members
   (Will be empty until members create links)
   ```

---

## 📊 WHAT HAPPENS AFTER

### Member Dashboard Updates

After data is populated:

✅ **Articles Page** → Shows 50+ articles with categories  
✅ **UTM Generator** → Generate tracking links from articles  
✅ **Statistics** → Shows real earnings (if GA has data)  
✅ **Payments** → Show pending/approved payouts  

### Admin Dashboard Updates

✅ **Overview** → Shows member count, total earnings  
✅ **Members Tab** → Shows all members + their earnings  
✅ **Earnings Tab** → Shows revenue breakdown  
✅ **Payments Tab** → Shows pending approvals  

---

## ⚠️ IF DATA STILL DOESN'T SHOW

### Check Backend Logs

Look at terminal where backend is running:
- Any error messages?
- Did jobs complete successfully?

### Check Job Logs in Firebase

In Firestore, check `job_logs` collection:
```
✅ Each job run should create a log entry
✅ Look for "status: success" or "status: failed"
✅ If failed, check error message
```

### Manual Sample Data (Last Resort)

If jobs fail, populate sample data:

```bash
curl -X POST http://localhost:5000/api/jobs/test/populate_sample_data
```

This creates fake data for testing:
- Sample articles
- Sample members
- Sample earnings

---

## 🎯 FINAL CHECKLIST

- [ ] Backend server started and running
- [ ] `/health` endpoint responds OK
- [ ] Web scraper triggered - articles fetched
- [ ] Category counter ran - categories counted  
- [ ] GA fetcher ran - earnings calculated
- [ ] Firebase shows data in collections
- [ ] Member dashboard shows articles
- [ ] Admin dashboard shows members & earnings
- [ ] UTM links can be created from articles
- [ ] Statistics page shows real revenue/RPM

---

## 🔗 IMPORTANT URLS

**Backend Server:**
- Health Check: http://localhost:5000/health
- Admin Login: http://localhost:5000/frontend/signin.html
- Member Dashboard: http://localhost:5000/frontend/member_dashboard.html

**Real Data Sources:**
- Articles: https://captionmood.com/
- Google Analytics: Property 519091919 (configured in backend)

**Reference System (Compare with):**
- GitHub: https://github.com/prince804/prince-tech

---

## 📝 JOB DETAILS

### Job 1: Web Scraper
```
What: Fetches captionmood.com HTML
How: Uses Cheerio to parse
Stores: articles + categories in Firestore
Time: 2:00 AM UTC (or manual trigger)
```

### Job 2: Category Counter
```
What: Counts articles per category
How: Groups articles by category
Updates: category counts in database
Time: 2:15 AM UTC (or manual trigger)
```

### Job 3: GA Data Fetcher
```
What: Fetches real GA data from Property 519091919
How: Uses Google Analytics API
Calculates: Member earnings, RPM, clicks
Time: 3:00 AM UTC (or manual trigger)
Stores: earnings collection + updates user earnings
```

---

## 🆘 TROUBLESHOOTING

### Q: Backend won't start?
A: Check if port 5000 is already in use
```bash
Get-Process -Name node | Stop-Process -Force
node backend/index.js
```

### Q: Job triggers but nothing happens?
A: Check browser console for errors
Check Firebase for data
Look at backend server terminal output

### Q: Articles not fetching?
A: Ensure captionmood.com is accessible
Check if web scraper has permission to fetch
Verify Cheerio is parsing HTML correctly

### Q: GA data not fetching?
A: Verify GA credentials are configured
Check if Property 519091919 is correct
Ensure Analytics API is enabled

### Q: No earnings showing?
A: GA data must be fetched first
Check if GA has any data
Verify earnings collection is updated

---

## ✨ NEXT STEPS

1. **Start backend** - `node backend/index.js`
2. **Trigger jobs** - In order: web_scraper → category_counter → ga_data_fetcher
3. **Check Firebase** - Verify data in collections
4. **Test frontend** - Admin dashboard should show data
5. **Create member** - Sign up a test member
6. **Generate UTM link** - Create tracking link from articles
7. **Monitor dashboard** - See earnings update in real-time

---

**When complete: EVERYTHING will work exactly like your friend's system!** ✅
