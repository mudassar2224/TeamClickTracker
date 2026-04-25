// Firebase Configuration
// Initialize Firebase with your project credentials
// Using Firebase SDK 7.24.0 (compatible with global <script> tags)

const firebaseConfig = {
  apiKey: "AIzaSyC-2-PG8CxO8Wp3SgDVXZCLxceDRaYeydM",
  authDomain: "utm-tracker-5802e.firebaseapp.com",
  projectId: "utm-tracker-5802e",
  storageBucket: "utm-tracker-5802e.firebasestorage.app",
  messagingSenderId: "934532935838",
  appId: "1:934532935838:web:d5b7d18fea82ccf77bcb8f",
  measurementId: "G-5Q160VETS8"
};

// Initialize Firebase - Wait for firebase global to be available
if (typeof firebase !== 'undefined') {
  try {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    
    // Get Firebase services using 7.x API
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    console.log('✅ Firebase initialized successfully');
    console.log('✅ Firebase version 7.24.0 loaded');
    console.log('✅ Auth service available');
    console.log('✅ Firestore database available');
    
    // Enable offline persistence - wrapped in try/catch
    try {
      db.enablePersistence({ experimentalTabSynchronization: true })
        .then(() => {
          console.log('✅ Offline persistence enabled');
        })
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.log('ℹ️ Offline persistence: Multiple tabs detected');
          } else if (err.code === 'unimplemented') {
            console.log('ℹ️ Offline persistence: Browser does not support');
          } else {
            console.log('ℹ️ Offline persistence error:', err.code);
          }
        });
    } catch (err) {
      console.log('ℹ️ Offline persistence not available');
    }
    
    // Export services globally
    window.firebaseService = {
      auth: auth,
      db: db,
      firebase: firebase
    };
    
    console.log('✅ FirebaseService exported to window');
    
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
} else {
  console.error('❌ Firebase SDK not loaded. Waiting...');
  
  // Retry after a delay
  setTimeout(() => {
    if (typeof firebase !== 'undefined') {
      console.log('✅ Firebase became available');
      // Run initialization again
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        const auth = firebase.auth();
        const db = firebase.firestore();
        window.firebaseService = { auth, db, firebase };
        console.log('✅ FirebaseService now available');
      } catch (error) {
        console.error('❌ Still unable to initialize:', error.message);
      }
    } else {
      console.error('❌ Firebase still not available after 2 second delay');
    }
  }, 2000);
}
