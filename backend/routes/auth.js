/**
 * Authentication Routes
 * Handles user signin, signup, verification
 * Uses Firebase Admin SDK on backend
 */

import express from 'express';
import { admin, db } from '../config/firebase-admin.js';

const router = express.Router();

/**
 * POST /api/auth/signin
 * Sign in user with email and password
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    console.log(`🔐 Sign in attempt: ${email}`);

    // Get user from Firestore
    const userQuery = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (userQuery.empty) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Email address not found'
      });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Verify password (stored as plain text in this setup - in production use bcrypt)
    if (userData.password !== password) {
      console.log(`❌ Wrong password for: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Incorrect password'
      });
    }

    // Check account status
    if (userData.status === 'rejected') {
      console.log(`❌ Account rejected: ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Your account has been rejected. Please contact admin for details.'
      });
    }

    if (userData.status === 'pending' && userData.role === 'member') {
      console.log(`⏳ Account pending: ${email}`);
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval. Please check back later.'
      });
    }

    // Generate token (simple JWT-like token)
    const token = Buffer.from(JSON.stringify({
      uid: userId,
      email: userData.email,
      role: userData.role,
      timestamp: Date.now()
    })).toString('base64');

    console.log(`✅ Sign in successful: ${email} (${userData.role})`);

    res.json({
      success: true,
      token,
      user: {
        uid: userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status
      },
      message: 'Sign in successful'
    });

  } catch (error) {
    console.error('Sign in error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Sign in failed: ' + error.message
    });
  }
});

/**
 * POST /api/auth/signup
 * Create new member account
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    console.log(`📝 Sign up attempt: ${email}`);

    // Check if email already exists
    const existingUser = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingUser.empty) {
      console.log(`❌ Email already exists: ${email}`);
      return res.status(400).json({
        success: false,
        error: 'Email address already registered'
      });
    }

    // Create new user document
    const newUserId = email.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    
    const userData = {
      email: email.toLowerCase(),
      name: name.trim(),
      password: password, // In production, use bcrypt to hash
      role: 'member',
      status: 'pending', // Requires admin approval
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      earnings: 0,
      articles_shared: 0,
      profile_completed: false
    };

    // Save to Firestore
    await db.collection('users').doc(newUserId).set(userData);

    // Create approval request document
    await db.collection('requests').doc(newUserId).set({
      uid: newUserId,
      email: email.toLowerCase(),
      name: name.trim(),
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      approvedAt: null,
      approvedBy: null,
      rejectionReason: null
    });

    console.log(`✅ Sign up successful: ${email} (pending approval)`);

    res.json({
      success: true,
      message: 'Account created successfully! Please wait for admin approval.',
      user: {
        uid: newUserId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status
      }
    });

  } catch (error) {
    console.error('Sign up error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Sign up failed: ' + error.message
    });
  }
});

/**
 * POST /api/auth/verify-token
 * Verify authentication token
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    // Decode token
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userDoc.data();

    res.json({
      success: true,
      valid: true,
      user: {
        uid: decoded.uid,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        status: userData.status
      }
    });

  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({
      success: false,
      valid: false,
      error: 'Invalid token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (frontend just clears token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export default router;
