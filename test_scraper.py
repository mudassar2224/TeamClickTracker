#!/usr/bin/env python3
"""Test scraper and verify data population"""

import urllib.request
import json
import time

print("\n" + "="*60)
print("🧪 TRIGGERING WEB SCRAPER TEST")
print("="*60 + "\n")

# Trigger scraper
try:
    req = urllib.request.Request(
        'http://localhost:5000/api/jobs/test/web_scraper',
        data=b'',
        method='POST'
    )
    response = urllib.request.urlopen(req, timeout=5)
    result = json.loads(response.read().decode())
    print(f"✅ Scraper triggered!")
    print(f"   Response: {json.dumps(result, indent=2)}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Wait for data to populate
print("⏳ Waiting for data to populate...")
time.sleep(3)

# Check articles
print("\n" + "-"*60)
print("📄 Checking Articles...")
print("-"*60 + "\n")

try:
    response = urllib.request.urlopen('http://localhost:5000/api/articles?limit=5', timeout=5)
    data = json.loads(response.read().decode())
    
    articles_count = data.get('count', 0)
    print(f"✅ Articles Found: {articles_count}")
    
    if articles_count > 0:
        print("\n📋 Sample Articles:")
        for i, article in enumerate(data.get('articles', [])[:2], 1):
            print(f"\n  Article {i}:")
            print(f"    Title: {article.get('title', 'N/A')}")
            print(f"    Category: {article.get('category', 'N/A')}")
            print(f"    URL: {article.get('url', 'N/A')}")
    else:
        print("⚠️  No articles found yet")
        
except Exception as e:
    print(f"❌ Error: {e}")

# Check categories
print("\n" + "-"*60)
print("📚 Checking Categories...")
print("-"*60 + "\n")

try:
    response = urllib.request.urlopen('http://localhost:5000/api/categories', timeout=5)
    data = json.loads(response.read().decode())
    
    categories_count = data.get('count', 0)
    print(f"✅ Categories Found: {categories_count}")
    
    if categories_count > 0:
        categories = data.get('categories', [])
        category_names = [c.get('name', c.get('displayName')) for c in categories[:6]]
        print(f"   Categories: {', '.join(category_names)}")
    else:
        print("⚠️  No categories found yet")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "="*60)
if articles_count > 0 and categories_count > 0:
    print("🎉 SUCCESS! Data population verified!")
    print(f"   {articles_count} articles ready for dashboard")
    print(f"   {categories_count} categories configured")
else:
    print("⚠️  Data still loading, try again in a moment")
print("="*60 + "\n")
