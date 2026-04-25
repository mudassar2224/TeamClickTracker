#!/usr/bin/env python3
"""
Automated Testing Suite for TeamClickTracker Backend
Tests all API endpoints and reports results
"""

import urllib.request
import json

tests = [
    ('🏥 Health Check', 'http://localhost:5000/health'),
    ('📄 Get Articles', 'http://localhost:5000/api/articles?limit=5'),
    ('📚 Get Categories', 'http://localhost:5000/api/categories'),
    ('📊 Get Scraper Status', 'http://localhost:5000/api/scraper/status'),
    ('📋 Get Job Logs', 'http://localhost:5000/api/jobs/logs'),
]

print("\n" + "="*70)
print("🧪 TEAMCLICKTRACKER - AUTOMATED TESTING SUITE")
print("="*70 + "\n")

passed = 0
failed = 0
results = []

for test_name, url in tests:
    try:
        response = urllib.request.urlopen(url, timeout=5)
        data = json.loads(response.read().decode())
        
        print(f"✅ {test_name}")
        print(f"   Status Code: {response.status}")
        print(f"   Message: {data.get('message', 'No message')}")
        
        # Extract specific info based on endpoint
        if 'articles' in url:
            print(f"   Articles Count: {data.get('count', 0)}")
        elif 'categories' in url:
            print(f"   Categories Count: {data.get('count', 0)}")
        elif 'logs' in url:
            print(f"   Job Logs Count: {data.get('count', 0)}")
        
        print()
        passed += 1
        results.append((test_name, True, None))
        
    except Exception as e:
        print(f"❌ {test_name}")
        print(f"   Error: {str(e)[:150]}")
        print()
        failed += 1
        results.append((test_name, False, str(e)))

print("="*70)
print(f"📊 FINAL TEST SUMMARY")
print("="*70)
print(f"✅ Passed:  {passed}/{len(tests)}")
print(f"❌ Failed:  {failed}/{len(tests)}")
print(f"📈 Pass Rate: {(passed/len(tests)*100):.0f}%")
print("="*70 + "\n")

if failed == 0:
    print("🎉 ALL TESTS PASSED! Backend is working correctly!")
    print("\n📝 NEXT STEPS:")
    print("  1. Run web scraper manually: /api/jobs/test/web_scraper")
    print("  2. Test member dashboard: http://localhost:5000/frontend/member_dashboard.html")
    print("  3. Test admin dashboard: http://localhost:5000/frontend/admin_dashboard.html")
else:
    print(f"⚠️  {failed} test(s) failed. Check errors above.")

print("\n")
