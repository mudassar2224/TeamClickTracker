import express from 'express';
import { admin } from '../config/firebase-admin.js';

const router = express.Router();
const db = admin.firestore();

// Middleware to verify admin token
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Decode base64 token
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const { uid } = JSON.parse(decoded);

    // Get user and check if admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userData = userDoc.data();
    if (userData.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    req.adminUid = uid;
    req.adminData = userData;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// GET pending member requests
router.get('/requests/pending', verifyAdmin, async (req, res) => {
  try {
    const querySnapshot = await db.collection('requests')
      .where('status', '==', 'pending')
      .get();

    const requests = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const displayName = data.name || data.fullname || data.full_name || 'N/A';
      requests.push({
        id: doc.id,
        name: displayName,
        fullname: displayName,
        email: data.email || 'N/A',
        reason: data.reason || 'No reason provided',
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        status: data.status || 'pending'
      });
    });

    // Sort by createdAt in descending order (newest first)
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, requests, count: requests.length });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: error.message });
  }
});

// GET active members
router.get('/members/active', verifyAdmin, async (req, res) => {
  try {
    const querySnapshot = await db.collection('users')
      .where('role', '==', 'member')
      .where('status', '==', 'approved')
      .get();

    const members = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      members.push({
        id: doc.id,
        email: data.email || 'N/A',
        name: data.name || 'N/A',
        createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        status: data.status || 'approved',
        earnings: data.earnings || 0
      });
    });

    // Sort by createdAt in descending order (newest first)
    members.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, members, count: members.length });
  } catch (error) {
    console.error('Error fetching active members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members', error: error.message });
  }
});

// GET dashboard stats
router.get('/dashboard/stats', verifyAdmin, async (req, res) => {
  try {
    // Total approved members
    const membersSnapshot = await db.collection('users')
      .where('role', '==', 'member')
      .where('status', '==', 'approved')
      .count()
      .get();
    const totalMembers = membersSnapshot.data().count;

    // Pending requests
    const pendingSnapshot = await db.collection('requests')
      .where('status', '==', 'pending')
      .count()
      .get();
    const pendingApprovals = pendingSnapshot.data().count;

    // Total articles
    const articlesSnapshot = await db.collection('articles')
      .count()
      .get();
    const totalArticles = articlesSnapshot.data().count;

    // Total categories
    const categoriesSnapshot = await db.collection('categories')
      .count()
      .get();
    const totalCategories = categoriesSnapshot.data().count;

    res.json({
      success: true,
      stats: {
        totalMembers,
        pendingApprovals,
        totalArticles,
        totalCategories
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

// APPROVE member
router.post('/requests/approve/:requestId', verifyAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;

    const requestDoc = await db.collection('requests').doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const requestData = requestDoc.data();
    const memberEmail = requestData.email;

    // Find and update corresponding user
    const userSnapshot = await db.collection('users')
      .where('email', '==', memberEmail)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    // Update user status to approved
    await db.collection('users').doc(userId).update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.adminUid
    });

    // Update request status to approved
    await db.collection('requests').doc(requestId).update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.adminUid
    });

    res.json({
      success: true,
      message: `Member ${memberEmail} approved successfully`
    });
  } catch (error) {
    console.error('Error approving member:', error);
    res.status(500).json({ success: false, message: 'Failed to approve member' });
  }
});

// REJECT member
router.post('/requests/reject/:requestId', verifyAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body || {};

    const requestDoc = await db.collection('requests').doc(requestId).get();
    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const requestData = requestDoc.data();
    const memberEmail = requestData.email;

    // Find and update corresponding user
    const userSnapshot = await db.collection('users')
      .where('email', '==', memberEmail)
      .get();

    if (!userSnapshot.empty) {
      const userId = userSnapshot.docs[0].id;
      
      // Update user status to rejected
      await db.collection('users').doc(userId).update({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: req.adminUid,
        rejectionReason: reason || 'No reason provided'
      });
    }

    // Update request status to rejected
    await db.collection('requests').doc(requestId).update({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.adminUid,
      rejectionReason: reason || 'No reason provided'
    });

    res.json({
      success: true,
      message: `Request for ${memberEmail} rejected`
    });
  } catch (error) {
    console.error('Error rejecting member:', error);
    res.status(500).json({ success: false, message: 'Failed to reject member' });
  }
});

// GET articles
router.get('/articles', verifyAdmin, async (req, res) => {
  try {
    let querySnapshot;
    try {
      querySnapshot = await db.collection('articles')
        // Articles are stored by the scraper using `scrapedAt`.
        // Ordering by a missing field will exclude documents from results.
        .orderBy('scrapedAt', 'desc')
        .limit(50)
        .get();
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed for articles, using simple query...');
      querySnapshot = await db.collection('articles')
        .limit(50)
        .get();
    }

    const articles = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        title: data.title || 'Untitled',
        category: data.category || 'Uncategorized',
        url: data.url || '',
        createdAt:
          (data.scrapedAt?.toDate?.() ? data.scrapedAt.toDate().toISOString() : null) ||
          (data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : null) ||
          (typeof data.scrapedDate === 'string' ? data.scrapedDate : null) ||
          new Date().toISOString()
      });
    });

    res.json({ success: true, articles, count: articles.length });
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch articles' });
  }
});

// GET categories
router.get('/categories', verifyAdmin, async (req, res) => {
  try {
    let querySnapshot;
    try {
      querySnapshot = await db.collection('categories')
        .orderBy('name', 'asc')
        .get();
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed for categories, using simple query...');
      querySnapshot = await db.collection('categories')
        .get();
    }

    const categories = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        name: data.name || 'Uncategorized',
        count: data.count || 0
      });
    });

    res.json({ success: true, categories, count: categories.length });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

// ============================================
// NEW ADMIN EARNINGS & PAYMENTS ENDPOINTS
// ============================================

/**
 * GET /admin/members
 * Get all members with their earnings totals
 */
router.get('/members', verifyAdmin, async (req, res) => {
  try {
    let membersSnapshot;
    
    try {
      // Try with orderBy first
      membersSnapshot = await db.collection('users')
        .where('role', '==', 'member')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .get();
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed for members, using simple query...');
      // Fallback to simple query without ordering
      membersSnapshot = await db.collection('users')
        .where('role', '==', 'member')
        .where('status', '==', 'approved')
        .get();
    }

    const members = [];
    
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      
      // Calculate total earnings for this member
      const earningsSnapshot = await db.collection('earnings')
        .where('memberId', '==', memberDoc.id)
        .get();
      
      let totalEarnings = 0;
      let totalClicks = 0;
      
      earningsSnapshot.forEach(doc => {
        const data = doc.data();
        if (!data.date) return; // ignore summary docs
        const earned = Number(data.memberEarnings ?? data.earnings ?? data.revenue ?? 0);
        totalEarnings += earned;
        totalClicks += Number(data.clicks || 0);
      });

      members.push({
        id: memberDoc.id,
        name: memberData.name || memberData.email,
        email: memberData.email,
        earnings: parseFloat(totalEarnings.toFixed(2)),
        clicks: totalClicks,
        joinedAt: memberData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        status: memberData.status
      });
    }

    // Sort by earnings descending
    members.sort((a, b) => b.earnings - a.earnings);

    res.json({ success: true, members, count: members.length });
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members', error: error.message });
  }
});

/**
 * GET /admin/earnings
 * Get all member earnings data with breakdown
 */
router.get('/earnings', verifyAdmin, async (req, res) => {
  try {
    let earningsSnapshot;
    try {
      earningsSnapshot = await db.collection('earnings')
        .orderBy('date', 'desc')
        .limit(500)
        .get();
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed for earnings, using simple query...');
      earningsSnapshot = await db.collection('earnings')
        .limit(500)
        .get();
    }

    const allEarnings = [];
    let totalRevenue = 0;
    let totalClicks = 0;

    // Get member details for each earning record
    for (const doc of earningsSnapshot.docs) {
      const data = doc.data();

      // Ignore summary-style docs
      if (!data.date) continue;
      
      // Get member name
      const memberDoc = await db.collection('users').doc(data.memberId).get();
      const memberName = memberDoc.exists ? (memberDoc.data().name || memberDoc.data().email) : 'Unknown';

      allEarnings.push({
        id: doc.id,
        memberId: data.memberId,
        memberName,
        date: data.date,
        campaign: data.campaign || 'N/A',
        clicks: data.clicks || 0,
        revenue: parseFloat((data.revenue || 0).toFixed(2)),
        memberEarnings: parseFloat((data.memberEarnings ?? data.earnings ?? data.revenue ?? 0).toFixed(2)),
        adminEarnings: parseFloat((data.adminEarnings || 0).toFixed(2)),
        rpm: parseFloat((data.rpm || 0).toFixed(2)),
        memberRpm: parseFloat((data.memberRpm || 0).toFixed(2))
      });

      totalRevenue += data.revenue || 0;
      totalClicks += data.clicks || 0;
    }

    const avgRpm = totalClicks > 0 ? (totalRevenue / totalClicks * 1000) : 0;

    res.json({
      success: true,
      earnings: allEarnings,
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalClicks,
        averageRpm: parseFloat(avgRpm.toFixed(2))
      },
      count: allEarnings.length
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings', error: error.message });
  }
});

/**
 * GET /admin/payments
 * Get all payment requests (payout requests)
 */
router.get('/payments', verifyAdmin, async (req, res) => {
  try {
    let paymentsSnapshot;
    try {
      paymentsSnapshot = await db.collection('payments')
        .orderBy('createdAt', 'desc')
        .get();
    } catch (orderError) {
      console.warn('⚠️ OrderBy failed for payments, using simple query...');
      paymentsSnapshot = await db.collection('payments')
        .get();
    }

    const payments = [];

    for (const doc of paymentsSnapshot.docs) {
      const data = doc.data();
      const normalizedStatus = (data.status === 'completed') ? 'paid' : (data.status || 'pending');
      const requestedAtIso =
        (data.requestedAt?.toDate?.() ? data.requestedAt.toDate().toISOString() : null) ||
        (data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : null) ||
        (typeof data.requestDate === 'string' ? data.requestDate : null) ||
        new Date().toISOString();
      
      // Get member name
      const memberDoc = await db.collection('users').doc(data.memberId).get();
      const memberName = memberDoc.exists ? (memberDoc.data().name || memberDoc.data().email) : 'Unknown';
      const memberEmail = memberDoc.exists ? memberDoc.data().email : 'Unknown';

      payments.push({
        id: doc.id,
        memberId: data.memberId,
        memberName,
        memberEmail,
        amount: parseFloat((data.amount || 0).toFixed(2)),
        bankDetails: data.bankDetails || {},
        notes: data.notes || '',
        status: normalizedStatus, // pending, approved, paid, rejected
        requestDate: requestedAtIso,
        requestedAt: requestedAtIso,
        approvedAt: data.approvedAt?.toDate?.().toISOString() || data.approvedDate || null,
        paidAt: data.paidAt?.toDate?.().toISOString() || data.paidDate || null,
        rejectionReason: data.rejectionReason || null
      });
    }

    res.json({ success: true, payments, count: payments.length });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments', error: error.message });
  }
});

/**
 * PUT /admin/payments/:id/mark-paid
 * Mark a payout as paid/completed
 */
router.put('/payments/:id/mark-paid', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body || {};

    const paymentDoc = await db.collection('payments').doc(id).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    await db.collection('payments').doc(id).update({
      status: 'paid',
      paidAt: new Date(),
      paidBy: req.adminUid,
      transactionId: transactionId || paymentDoc.data()?.transactionId || null
    });

    res.json({ success: true, message: 'Payout marked as paid' });
  } catch (error) {
    console.error('Error marking payment as paid:', error);
    res.status(500).json({ success: false, message: 'Failed to mark payout as paid', error: error.message });
  }
});

/**
 * PUT /admin/payments/:id/approve
 * Approve a payment/payout request
 */
router.put('/payments/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const paymentDoc = await db.collection('payments').doc(id).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    // Update payment status
    await db.collection('payments').doc(id).update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: req.adminUid,
      transactionId: transactionId || null
    });

    const paymentData = paymentDoc.data();
    res.json({
      success: true,
      message: `Payment of $${paymentData.amount} approved for member ${paymentData.memberId}`
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ success: false, message: 'Failed to approve payment', error: error.message });
  }
});

/**
 * PUT /admin/payments/:id/reject
 * Reject a payment/payout request
 */
router.put('/payments/:id/reject', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const paymentDoc = await db.collection('payments').doc(id).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    // Update payment status
    await db.collection('payments').doc(id).update({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: req.adminUid,
      rejectionReason: rejectionReason || 'No reason provided'
    });

    const paymentData = paymentDoc.data();
    res.json({
      success: true,
      message: `Payment request rejected for member ${paymentData.memberId}`
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payment', error: error.message });
  }
});

/**
 * GET /admin/analytics
 * Get system-wide analytics
 */
router.get('/analytics', verifyAdmin, async (req, res) => {
  try {
    // Total earnings
    const earningsSnapshot = await db.collection('earnings').get();
    let totalRevenue = 0;
    let totalClicks = 0;

    earningsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.date) return; // ignore summary docs
      totalRevenue += data.revenue || 0;
      totalClicks += data.clicks || 0;
    });

    // Total payouts (paid)
    const paymentsSnapshot = await db.collection('payments')
      .where('status', '==', 'paid')
      .get();
    let totalPaidOut = 0;

    paymentsSnapshot.forEach(doc => {
      const data = doc.data();
      totalPaidOut += data.amount || 0;
    });

    // Pending payouts (pending + approved)
    const pendingSnapshot = await db.collection('payments')
      .where('status', 'in', ['pending', 'approved'])
      .get();
    let pendingAmount = 0;

    pendingSnapshot.forEach(doc => {
      const data = doc.data();
      pendingAmount += data.amount || 0;
    });

    const avgRpm = totalClicks > 0 ? (totalRevenue / totalClicks * 1000) : 0;

    res.json({
      success: true,
      analytics: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalClicks,
        averageRpm: parseFloat(avgRpm.toFixed(2)),
        totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
        pendingPayouts: parseFloat(pendingAmount.toFixed(2))
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
});

export default router;
