#!/usr/bin/env node
/**
 * POPULATE FIRESTORE WITH SAMPLE DATA
 * Run this script: node populate-data.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load service account
const keyPath = path.join(__dirname, 'config', 'google-analytics-key.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = admin.firestore();

// Sample data
const SAMPLE_ARTICLES = [
  { title: "10 Best Hairstyles for 2026", description: "Discover trending hairstyles", url: "https://captionmood.com/hairstyles", category: "Hairstyles", image: "https://via.placeholder.com/400x300?text=Hairstyles" },
  { title: "Fashion Trends You Need to Know", description: "Stay ahead with spring trends", url: "https://captionmood.com/fashion", category: "Fashion", image: "https://via.placeholder.com/400x300?text=Fashion" },
  { title: "Makeup Tutorial: Natural Glow", description: "Achieve glowing complexion", url: "https://captionmood.com/makeup", category: "Makeup", image: "https://via.placeholder.com/400x300?text=Makeup" },
  { title: "Best Skincare for Oily Skin", description: "Perfect skincare routine", url: "https://captionmood.com/skincare", category: "Skincare", image: "https://via.placeholder.com/400x300?text=Skincare" },
  { title: "Celebrity Red Carpet Looks", description: "Recreate stunning looks", url: "https://captionmood.com/celebrity", category: "Celebrity", image: "https://via.placeholder.com/400x300?text=Celebrity" },
  { title: "Nail Art Designs", description: "Creative nail designs", url: "https://captionmood.com/nails", category: "Beauty", image: "https://via.placeholder.com/400x300?text=Nails" },
  { title: "Summer Fashion Guide", description: "Expert styling tips", url: "https://captionmood.com/summer", category: "Fashion", image: "https://via.placeholder.com/400x300?text=Summer" },
  { title: "Hair Care Secrets", description: "Healthy hair tips", url: "https://captionmood.com/hair", category: "Hairstyles", image: "https://via.placeholder.com/400x300?text=Hair" },
  { title: "Dewy Skin Makeup", description: "Step-by-step makeup guide", url: "https://captionmood.com/dewy", category: "Makeup", image: "https://via.placeholder.com/400x300?text=Dewy" },
  { title: "Designer Handbags on Budget", description: "Affordable alternatives", url: "https://captionmood.com/bags", category: "Fashion", image: "https://via.placeholder.com/400x300?text=Bags" },
  { title: "Anti-Aging Skincare", description: "Combat signs of aging", url: "https://captionmood.com/antiaging", category: "Skincare", image: "https://via.placeholder.com/400x300?text=AntiAging" },
  { title: "Workout Outfits", description: "Stylish gym looks", url: "https://captionmood.com/workout", category: "Fashion", image: "https://via.placeholder.com/400x300?text=Workout" }
];

const CATEGORIES = ["Hairstyles", "Fashion", "Makeup", "Skincare", "Celebrity", "Beauty"];

async function populate() {
  try {
    console.log('\n=====================================');
    console.log('📝 POPULATING FIRESTORE WITH SAMPLE DATA');
    console.log('=====================================\n');

    // Clear old articles
    console.log('🗑️  Clearing old articles...');
    const oldArticles = await db.collection('articles').get();
    const batch1 = db.batch();
    oldArticles.docs.forEach(doc => batch1.delete(doc.ref));
    if (oldArticles.docs.length > 0) {
      await batch1.commit();
      console.log(`   Deleted ${oldArticles.docs.length} old articles`);
    }

    // Add articles
    console.log('\n📄 Adding new articles...');
    const batch2 = db.batch();
    for (const article of SAMPLE_ARTICLES) {
      const docRef = db.collection('articles').doc();
      batch2.set(docRef, {
        ...article,
        id: docRef.id,
        scrapedAt: admin.firestore.Timestamp.now(),
        scrapedDate: new Date().toISOString().split('T')[0],
        bookmarked: false,
        views: Math.floor(Math.random() * 1000),
        active: true
      });
    }
    await batch2.commit();
    console.log(`   ✅ Added ${SAMPLE_ARTICLES.length} articles`);

    // Add categories
    console.log('\n📚 Adding categories...');
    const batch3 = db.batch();
    for (const category of CATEGORIES) {
      const docRef = db.collection('categories').doc(category);
      batch3.set(docRef, {
        name: category,
        displayName: category,
        createdAt: admin.firestore.Timestamp.now(),
        active: true
      }, { merge: true });
    }
    await batch3.commit();
    console.log(`   ✅ Added ${CATEGORIES.length} categories`);

    console.log('\n=====================================');
    console.log('✅ SAMPLE DATA READY!');
    console.log('=====================================\n');
    console.log('🎉 Dashboards are now ready to view!\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

// Run immediately
populate();
