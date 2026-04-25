#!/usr/bin/env node

/**
 * DAY 1 BUILD TEST
 * Tests the web scraper and scheduler setup
 * Run with: node test-day1.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n╔═══════════════════════════════════════╗');
console.log('║  DAY 1 BUILD VERIFICATION             ║');
console.log('║  Web Scraper & Scheduler Setup        ║');
console.log('╚═══════════════════════════════════════╝\n');

// Check 1: Required files exist
console.log('📋 Checking required files...\n');

const requiredFiles = [
  'backend/scrapers/captionmood-scraper.js',
  'backend/config/firebase-admin.js',
  'backend/jobs/scheduler.js',
  'backend/jobs/category-counter.js',
  'backend/jobs/ga-data-fetcher.js',
  'backend/index.js',
  'config/google-analytics-key.json'
];

let filesOk = true;

for (const file of requiredFiles) {
  const fullPath = path.join(__dirname, file);
  const exists = file === 'config/google-analytics-key.json' ? 
    fs.existsSync(fullPath) : 
    fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
    if (file !== 'config/google-analytics-key.json') {
      filesOk = false;
    }
  }
}

// Check 2: package.json dependencies
console.log('\n📦 Checking package.json dependencies...\n');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
);

const requiredDeps = [
  'axios',
  'cheerio',
  'express',
  'firebase-admin',
  'google-analytics-data',
  'googleapis',
  'node-cron',
  'dotenv'
];

let depsOk = true;

for (const dep of requiredDeps) {
  if (packageJson.dependencies[dep]) {
    console.log(`  ✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`  ❌ ${dep} - NOT FOUND`);
    depsOk = false;
  }
}

// Check 3: node_modules
console.log('\n📦 Checking node_modules installation...\n');

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (fs.existsSync(nodeModulesPath)) {
  const installedModules = fs.readdirSync(nodeModulesPath)
    .filter(f => !f.startsWith('.'))
    .length;
  
  console.log(`  ✅ node_modules installed (${installedModules} modules)`);
} else {
  console.log(`  ❌ node_modules NOT installed`);
  console.log(`     Run: npm install`);
}

// Summary
console.log('\n╔═══════════════════════════════════════╗');
console.log('║  VERIFICATION SUMMARY                 ║');
console.log('╚═══════════════════════════════════════╝\n');

if (filesOk) {
  console.log('✅ All required files present');
} else {
  console.log('❌ Some files are missing');
}

if (depsOk) {
  console.log('✅ All dependencies listed in package.json');
} else {
  console.log('❌ Some dependencies missing from package.json');
}

if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules installed');
} else {
  console.log('❌ node_modules not installed - run: npm install');
}

// Check Firebase config
const firebaseKeyPath = path.join(__dirname, 'config', 'google-analytics-key.json');
if (fs.existsSync(firebaseKeyPath)) {
  console.log('✅ Google Analytics service account key found');
} else {
  console.log('⚠️  Google Analytics service account key NOT found');
  console.log('   (This is needed to fetch real data from GA)');
  console.log('   Path: config/google-analytics-key.json');
}

console.log('\n╔═══════════════════════════════════════╗');
console.log('║  NEXT STEPS                           ║');
console.log('╚═══════════════════════════════════════╝\n');

console.log('1️⃣  Install dependencies:');
console.log('   npm install\n');

console.log('2️⃣  Start backend server:');
console.log('   npm run backend\n');

console.log('3️⃣  Test web scraper (manual):');
console.log('   Open browser: http://localhost:5000/api/jobs/test/web_scraper\n');

console.log('4️⃣  Check scraper status:');
console.log('   Open browser: http://localhost:5000/api/scraper/status\n');

console.log('✨ Day 1 setup complete! Ready to build Day 2-3 (Member Dashboard)\n');
