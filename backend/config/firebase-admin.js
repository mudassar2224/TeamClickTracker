/**
 * FIREBASE ADMIN SDK CONFIGURATION
 * Used by backend for secure database access
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount;

// Try to load service account from environment or file
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // If using environment variable (for production)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // If using local JSON file (for development)
  const keyPath = path.join(__dirname, '..', '..', 'config', 'google-analytics-key.json');
  
  if (fs.existsSync(keyPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    console.log('✅ Loaded service account from:', keyPath);
  } else {
    console.warn('⚠️ No service account found. Using default credentials.');
  }
}

// Initialize Firebase Admin
if (serviceAccount) {
  // Use the project ID from service account (socailgold)
  // This ensures we have full permissions to read/write
  // User can upgrade to their own project credentials later
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id // Use socailgold project which has permissions
  });
  console.log('✅ Firebase Admin initialized with service account');
  console.log('✅ Using Firebase project:', serviceAccount.project_id);
} else {
  admin.initializeApp();
  console.log('✅ Firebase Admin initialized with default credentials');
}

// Get Firestore instance
const db = admin.firestore();

// Settings
db.settings({ ignoreUndefinedProperties: true });

console.log('✅ Firestore connected');

// Export for use in other files
export { admin, db };
export default admin;
