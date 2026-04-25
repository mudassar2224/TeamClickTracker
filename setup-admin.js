// Script to create admin account in Firebase
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Try to find service account
let serviceAccount;
try {
    const keyPath = resolve('./config/google-analytics-key.json');
    serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    console.log('Using service account from: config/google-analytics-key.json');
} catch (e) {
    try {
        const keyPath = resolve('./backend/functions/serviceAccountKey.json');
        serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
        console.log('Using service account from: backend/functions/serviceAccountKey.json');
    } catch (e2) {
        console.error('Service account key not found!');
        console.error('Expected: config/google-analytics-key.json or backend/functions/serviceAccountKey.json');
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function setupAdmin() {
    console.log('Setting up admin account...\n');

    try {
        // Admin credentials
        const adminEmail = 'mudassar.admin@gmail.com';
        const adminPassword = 'Mudassar@123';

        // Check if user already exists
        try {
            const existingUser = await auth.getUserByEmail(adminEmail);
            console.log('Admin account already exists with UID:', existingUser.uid);
            console.log('Verifying Firestore record...');
            
            // Check Firestore
            const userDoc = await db.collection('users').doc(existingUser.uid).get();
            if (userDoc.exists) {
                console.log('Firestore record exists:', userDoc.data());
            } else {
                console.log('Creating Firestore record...');
            }
            
            // Update/Create Firestore with admin data
            await db.collection('users').doc(existingUser.uid).set({
                email: adminEmail,
                fullname: 'System Admin',
                role: 'admin',
                status: 'approved',
                createdAt: new Date(),
                approvedAt: new Date()
            }, { merge: true });
            
            console.log('Admin Firestore record verified/updated!');
            console.log('\nAdmin account is ready to use!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('Email: ' + adminEmail);
            console.log('Password: ' + adminPassword);
            console.log('UID: ' + existingUser.uid);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        } catch (error) {
            if (error.code !== 'auth/user-not-found') {
                throw error;
            }
            console.log('Admin account does not exist, creating new...');
        }

        // Create new user in Firebase Auth
        const userRecord = await auth.createUser({
            email: adminEmail,
            password: adminPassword,
            displayName: 'System Admin'
        });

        console.log('Firebase Auth user created:', userRecord.uid);

        // Store in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: adminEmail,
            fullname: 'System Admin',
            role: 'admin',
            status: 'approved',
            createdAt: new Date(),
            approvedAt: new Date(),
            createdBy: 'system'
        });

        console.log('Firestore document created');

        console.log('\nAdmin account setup COMPLETE!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email: ' + adminEmail);
        console.log('Password: ' + adminPassword);
        console.log('UID: ' + userRecord.uid);
        console.log('Role: admin');
        console.log('Status: approved');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }

    process.exit(0);
}

setupAdmin();

setupAdmin();
