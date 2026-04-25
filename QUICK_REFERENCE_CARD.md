# ⚡ QUICK REFERENCE CARD
**Keep this open while building**

---

## 🎯 PHASES AT A GLANCE

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Prerequisites & Setup | 30 min | ⬜ |
| 2 | Start Backend | 5 min | ⬜ |
| 3 | Connect GA | 10 min | ⬜ |
| 4 | Connect Firebase | 10 min | ⬜ |
| 5 | Test APIs | 15 min | ⬜ |
| 6 | Populate Data | 20 min | ⬜ |
| 7 | Create Users | 15 min | ⬜ |
| 8 | Test Workflow | 30 min | ⬜ |

**Total: ~2 hours** ⏱️

---

## 🔧 ESSENTIAL COMMANDS

```powershell
# Check Node.js
node --version

# Navigate to project
cd c:\Web_development\TeamClickTracker

# Install dependencies
npm install

# Start backend
npm start

# On NEW Terminal: Test health
curl http://localhost:5000/health

# Test web scraper
curl -X POST http://localhost:5000/api/jobs/test/web_scraper

# Test GA fetcher
curl -X POST http://localhost:5000/api/jobs/test/ga_data_fetcher
```

---

## 📱 DASHBOARD URLS

```
Frontend: http://localhost:5000/frontend/signin.html
Admin DB: http://localhost:5000/frontend/admin_dashboard.html
Member DB: http://localhost:5000/frontend/member_dashboard.html
Articles: http://localhost:5000/frontend/articles.html
Health: http://localhost:5000/health
```

---

## 🔑 LOGIN CREDENTIALS

**Admin Account (Predefined):**
```
Email: mudassar.admin@gmail.com
Password: Mudassar@123
```

**Test Member (Create Own):**
```
Email: test_member_001@gmail.com
Password: Test@12345
(Admin must approve)
```

---

## 📊 FIREBASE COLLECTIONS

```
articles     → 50+ documents (auto-fetched daily)
categories   → All categories (auto-extracted)
earnings     → Member revenue (from Google Analytics)
payments     → Payout requests (pending/approved)
users        → Admin + Members (authentication)
utm_links    → Member-created tracking links
job_logs     → Job execution history
```

---

## 🤖 DAILY JOBS

```
2:00 AM UTC  → Web Scraper (fetch articles)
2:15 AM UTC  → Category Counter (count articles)
3:00 AM UTC  → GA Fetcher (calculate earnings)
```

**Manual trigger anytime:**
```powershell
curl -X POST http://localhost:5000/api/jobs/test/web_scraper
curl -X POST http://localhost:5000/api/jobs/test/category_counter
curl -X POST http://localhost:5000/api/jobs/test/ga_data_fetcher
```

---

## 🎖️ STATUS CHECKLIST

### Phase 1: Prerequisites
- [ ] Node.js v18+
- [ ] npm installed
- [ ] npm install completed
- [ ] Project structure verified

### Phase 2: Backend
- [ ] Backend starts
- [ ] Health check returns OK
- [ ] Terminal shows "Server listening on port 5000"

### Phase 3: Google Analytics
- [ ] Property ID found
- [ ] Service account created
- [ ] JSON credentials downloaded
- [ ] .env file updated with GA credentials

### Phase 4: Firebase
- [ ] Firebase project created
- [ ] Firestore database created
- [ ] Service account created
- [ ] .env file updated with Firebase credentials
- [ ] Backend restarted

### Phase 5: APIs
- [ ] Health endpoint working
- [ ] Admin login works
- [ ] Member API responds
- [ ] Admin API responds

### Phase 6: Data
- [ ] Web scraper completes
- [ ] 50+ articles in Firebase
- [ ] Categories extracted
- [ ] GA fetcher completes
- [ ] Earnings data synced

### Phase 7: Users
- [ ] Admin logs in successfully
- [ ] Test member account created
- [ ] Admin approves member
- [ ] Member logs in successfully

### Phase 8: Workflow
- [ ] Member sees articles
- [ ] Member creates UTM link
- [ ] Member views statistics
- [ ] Member requests payout
- [ ] Admin approves payout
- [ ] Payment history shows

---

## ⚠️ COMMON ERRORS & FIXES

### "Backend won't start"
```
Fix:
1. Kill process: Get-Process node | Stop-Process -Force
2. Reinstall: npm install
3. Start: npm start
```

### "Firebase not initialized"
```
Fix:
1. Check .env exists: ls backend\.env
2. Check credentials: cat backend\.env
3. Restart backend
```

### "No articles showing"
```
Fix:
1. Run web scraper: curl -X POST http://localhost:5000/api/jobs/test/web_scraper
2. Wait 30 seconds
3. Check Firebase console → articles collection
```

### "Admin dashboard blank"
```
Fix:
1. Open F12 (browser console)
2. Look for errors
3. Check if data was populated
4. Clear cache: Ctrl+Shift+Delete
```

### "Member can't log in"
```
Fix:
1. Verify member exists in Firebase users collection
2. Check if admin approved member
3. Try different password
4. Create new test account
```

---

## 📞 QUICK SUPPORT

**Backend Error?** → Check Terminal 1 logs  
**Frontend Error?** → Check Browser Console (F12)  
**Data Missing?** → Check Firebase Console  
**API Not Working?** → Test with curl commands  
**Firebase issue?** → Check console.firebase.google.com  
**GA issue?** → Check analytics.google.com  

---

## 🔄 EVERYDAY OPERATIONS

### Daily (Automatic)
```
✅ 2:00 AM: Articles auto-fetch
✅ 2:15 AM: Categories auto-count
✅ 3:00 AM: GA data auto-sync
```

### When Member Signs Up
```
1. Member creates account
2. Admin receives notification
3. Admin approves in dashboard
4. Member gets email
5. Member can log in
```

### When Member Requests Payout
```
1. Member clicks: Request Payout
2. Admin sees pending payment
3. Admin clicks: Approve
4. System updates status
5. Payment processed
```

### When New Articles Available
```
1. Scraper fetches from captionmood.com
2. Firebase updates
3. Members see in dashboard
4. Members can create UTM links
```

---

## 📈 SYSTEM STATS

After full setup:
```
✅ 50+ articles available
✅ 10+ categories
✅ 1-1000 members (scalable)
✅ Real-time earnings
✅ Unlimited UTM links
✅ Complete audit trail
```

---

## 🎯 SUCCESS INDICATORS

```
✅ Backend running (port 5000)
✅ Firebase connected
✅ Google Analytics synced
✅ 50+ articles in database
✅ Members can sign up
✅ Admin can approve members
✅ Members see earnings
✅ Payments working
✅ Everything in real-time
```

If ALL ✅: **System is fully operational!**

---

## 📚 DOCUMENTATION FILES

```
STEP_BY_STEP_BUILD_GUIDE.md    ← You are here
README_MASTER_GUIDE.md         ← Overview
QUICK_START.md                 ← 5-minute start
COMPLETE_SETUP_GUIDE.md        ← Full details
BACKEND_VERIFICATION_AND_DATA_SETUP.md ← Troubleshooting
```

---

## ⏰ TIME ESTIMATES

| Task | Time |
|------|------|
| Prerequisites | 30 min |
| Backend Setup | 5 min |
| GA Connection | 10 min |
| Firebase Connection | 10 min |
| API Testing | 15 min |
| Data Population | 20 min |
| User Setup | 15 min |
| Workflow Testing | 30 min |
| **TOTAL** | **~2 hours** |

---

## 🚀 YOU'RE READY!

**Start Phase 1, Step 1.1 in STEP_BY_STEP_BUILD_GUIDE.md**

**Questions?** Refer to this card or check documentation.

**Good luck! 🎉**
