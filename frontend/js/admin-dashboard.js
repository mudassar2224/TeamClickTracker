/**
 * ADMIN DASHBOARD LOGIC
 * Handles member management, payments, analytics, and system monitoring
 */

// Check authentication first
(function() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || user.role !== 'admin') {
    console.log('Unauthorized admin access');
    window.location.href = 'signin.html';
  }
})();

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.5.0/firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.5.0/auth.js';
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin credentials (should verify admin role in Firestore)
const ADMIN_EMAIL = 'm.mudassar2224@gmail.com'; // Update with actual admin email

let currentUser = null;
let allMembers = [];
let allPayments = [];
let currentApprovalRequest = null;
let currentPaymentRequest = null;

/**
 * Initialize admin dashboard
 */
async function initializeAdminDashboard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    // Verify admin role
    if (user.email !== ADMIN_EMAIL) {
      alert('Unauthorized: Admin access only');
      window.location.href = 'index.html';
      return;
    }

    currentUser = user;
    document.getElementById('adminEmail').textContent = user.email;

    // Load all data
    await loadDashboardData();
  });
}

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
  try {
    await Promise.all([
      loadMembers(),
      loadPayments(),
      loadAnalytics(),
      loadJobLogs()
    ]);
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
  }
}

/**
 * Load all members
 */
async function loadMembers() {
  try {
    const membersRef = collection(db, 'team_members');
    const snapshot = await getDocs(membersRef);

    allMembers = [];
    let approvedCount = 0;

    snapshot.forEach((doc) => {
      const member = {
        id: doc.id,
        ...doc.data()
      };
      allMembers.push(member);
      if (member.status === 'approved') {
        approvedCount++;
      }
    });

    // Count pending requests
    const requestsRef = collection(db, 'requests');
    const requestsSnapshot = await getDocs(requestsRef);
    const pendingCount = requestsSnapshot.size;

    // Update stats
    document.getElementById('totalMembers').textContent = approvedCount;
    document.getElementById('overviewMembers').textContent = approvedCount;
    document.getElementById('pendingMembers').textContent = pendingCount;
    document.getElementById('overviewPending').textContent = pendingCount;

    if (pendingCount > 0) {
      document.getElementById('pendingMessage').textContent = `${pendingCount} new member(s) waiting for approval`;
    } else {
      document.getElementById('pendingMessage').textContent = '✅ No pending approvals';
    }

    // Display members table
    displayMembers();
    console.log('✅ Loaded', allMembers.length, 'members');
  } catch (error) {
    console.error('❌ Error loading members:', error);
  }
}

/**
 * Display members in table
 */
async function displayMembers() {
  const membersBody = document.getElementById('membersBody');

  // First load pending requests
  const requestsRef = collection(db, 'requests');
  const pendingSnapshot = await getDocs(requestsRef);

  let html = '';

  // Show pending requests first
  for (const doc of pendingSnapshot.docs) {
    const request = doc.data();
    html += `
      <tr>
        <td>${request.email}</td>
        <td><span class="badge pending">⏳ Pending</span></td>
        <td>${new Date(request.created_at?.toDate() || Date.now()).toLocaleDateString()}</td>
        <td>$0.00</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-success" onclick="openApproveModal('${doc.id}', '${request.email}')">✅ Approve</button>
            <button class="btn btn-danger" onclick="rejectMember('${doc.id}', '${request.email}')">❌ Reject</button>
          </div>
        </td>
      </tr>
    `;
  }

  // Show approved members
  for (const member of allMembers) {
    if (member.status === 'approved') {
      const earnings = member.totalEarnings || 0;
      html += `
        <tr>
          <td>${member.email}</td>
          <td><span class="badge approved">✅ Active</span></td>
          <td>${new Date(member.approved_at?.toDate() || Date.now()).toLocaleDateString()}</td>
          <td>$${earnings.toFixed(2)}</td>
          <td>
            <button class="btn btn-secondary" onclick="viewMemberDetails('${member.id}')">View</button>
          </td>
        </tr>
      `;
    }
  }

  if (html === '') {
    html = '<tr><td colspan="5" style="text-align: center; color: #999;">No members yet</td></tr>';
  }

  membersBody.innerHTML = html;
}

/**
 * Load payment requests
 */
async function loadPayments() {
  try {
    const paymentsRef = collection(db, 'payments');
    const snapshot = await getDocs(paymentsRef);

    allPayments = [];
    let pendingAmount = 0;
    let pendingCount = 0;

    snapshot.forEach((doc) => {
      const payment = {
        id: doc.id,
        ...doc.data()
      };
      allPayments.push(payment);

      if (payment.status === 'pending') {
        pendingAmount += payment.amount || 0;
        pendingCount++;
      }
    });

    // Update stats
    document.getElementById('pendingPayments').textContent = pendingAmount.toFixed(2);
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('overviewPayoutAmount').textContent = pendingAmount.toFixed(2);

    if (pendingCount > 0) {
      document.getElementById('paymentMessage').textContent = `${pendingCount} payment request(s) totaling $${pendingAmount.toFixed(2)} pending review`;
    } else {
      document.getElementById('paymentMessage').textContent = '✅ No pending payments';
    }

    // Display payments table
    displayPayments();
    console.log('✅ Loaded', allPayments.length, 'payments');
  } catch (error) {
    console.error('❌ Error loading payments:', error);
  }
}

/**
 * Display payments in table
 */
function displayPayments() {
  const paymentsBody = document.getElementById('paymentsBody');

  let html = '';

  for (const payment of allPayments) {
    const statusClass = payment.status === 'pending' ? 'pending' : payment.status === 'paid' ? 'paid' : 'rejected';
    const statusText = payment.status === 'pending' ? '⏳ Pending' : payment.status === 'paid' ? '✅ Paid' : '❌ Rejected';

    html += `
      <tr>
        <td>${payment.memberEmail || 'Unknown'}</td>
        <td>$${(payment.amount || 0).toFixed(2)}</td>
        <td>${new Date(payment.requestedAt?.toDate() || Date.now()).toLocaleDateString()}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          ${payment.status === 'pending' ? `
            <div class="btn-group">
              <button class="btn btn-success" onclick="openMarkPaidModal('${payment.id}', '${payment.memberEmail}', ${payment.amount})">💳 Mark Paid</button>
              <button class="btn btn-danger" onclick="rejectPayment('${payment.id}')">❌ Reject</button>
            </div>
          ` : `<button class="btn btn-secondary" onclick="viewPaymentDetails('${payment.id}')">View</button>`}
        </td>
      </tr>
    `;
  }

  if (html === '') {
    html = '<tr><td colspan="5" style="text-align: center; color: #999;">No payment requests</td></tr>';
  }

  paymentsBody.innerHTML = html;
}

/**
 * Load analytics data (from GA)
 */
async function loadAnalytics() {
  try {
    let totalClicks = 0;
    let totalRevenue = 0;
    let totalUsers = 0;

    // Get all campaign analytics
    const analyticsRef = collection(db, 'campaign_analytics');
    const snapshot = await getDocs(analyticsRef);

    const campaigns = [];

    snapshot.forEach((doc) => {
      const campaign = doc.data();
      totalClicks += campaign.clicks || 0;
      totalRevenue += campaign.revenue || 0;
      totalUsers += campaign.users || 0;
      campaigns.push(campaign);
    });

    // Calculate RPM
    const rpm = totalUsers > 0 ? (totalRevenue / totalUsers) * 1000 : 0;
    const adminEarnings = totalRevenue * 0.30; // 30% for admin

    // Update stats
    document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('adminEarnings').textContent = adminEarnings.toFixed(2);
    document.getElementById('analyticsClicks').textContent = totalClicks;
    document.getElementById('analyticsRevenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('analyticsRPM').textContent = rpm.toFixed(2);
    document.getElementById('overviewRevenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('overviewCommission').textContent = adminEarnings.toFixed(2);

    // Display campaigns table
    displayCampaigns(campaigns);
    console.log('✅ Loaded analytics from', campaigns.length, 'campaigns');
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
  }
}

/**
 * Display campaigns in table
 */
function displayCampaigns(campaigns) {
  const campaignsBody = document.getElementById('campaignsBody');

  if (campaigns.length === 0) {
    campaignsBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No campaign data yet</td></tr>';
    return;
  }

  let html = '';

  campaigns.forEach((campaign) => {
    const memberEarnings = (campaign.revenue || 0) * 0.70;

    html += `
      <tr>
        <td>${campaign.campaignName || 'Unknown'}</td>
        <td>${campaign.memberEmail || 'Unknown'}</td>
        <td>${campaign.clicks || 0}</td>
        <td>$${(campaign.revenue || 0).toFixed(2)}</td>
        <td>$${(campaign.rpm || 0).toFixed(2)}</td>
        <td>$${memberEarnings.toFixed(2)}</td>
      </tr>
    `;
  });

  campaignsBody.innerHTML = html;
}

/**
 * Load job logs
 */
async function loadJobLogs() {
  try {
    const logsRef = collection(db, 'job_logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(10));
    const snapshot = await getDocs(q);

    const jobsBody = document.getElementById('jobsBody');

    if (snapshot.empty) {
      jobsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">No job logs yet</td></tr>';
      return;
    }

    let html = '';

    snapshot.forEach((doc) => {
      const log = doc.data();
      const status = log.status === 'success' ? '✅ Success' : '❌ Failed';
      const statusClass = log.status === 'success' ? 'approved' : 'rejected';

      html += `
        <tr>
          <td>${log.jobName || 'Unknown'}</td>
          <td><span class="badge ${statusClass}">${status}</span></td>
          <td>${new Date(log.timestamp?.toDate() || Date.now()).toLocaleString()}</td>
          <td>${log.result ? JSON.stringify(log.result).substring(0, 50) : 'N/A'}</td>
        </tr>
      `;
    });

    jobsBody.innerHTML = html;
    console.log('✅ Loaded', snapshot.size, 'job logs');
  } catch (error) {
    console.error('❌ Error loading job logs:', error);
  }
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  document.getElementById(tabName).classList.add('active');
  event.target.classList.add('active');
}

/**
 * Open approve member modal
 */
function openApproveModal(requestId, email) {
  currentApprovalRequest = requestId;
  document.getElementById('approveMemberEmail').textContent = email;
  document.getElementById('approvalReason').value = '';
  document.getElementById('approveModal').classList.add('active');
}

/**
 * Close approve modal
 */
function closeApproveModal() {
  document.getElementById('approveModal').classList.remove('active');
}

/**
 * Submit approval
 */
async function submitApproval() {
  try {
    if (!currentApprovalRequest) return;

    const requestRef = doc(db, 'requests', currentApprovalRequest);
    const requestData = (await getDoc(requestRef)).data();

    // Create member record
    const membersRef = collection(db, 'team_members');
    const memberRef = doc(membersRef, auth.currentUser.uid);

    await updateDoc(memberRef, {
      email: requestData.email,
      status: 'approved',
      approved_at: Timestamp.now(),
      totalEarnings: 0,
      totalClicks: 0
    }).catch(async () => {
      // Create if doesn't exist
      await updateDoc(memberRef, {
        email: requestData.email,
        status: 'approved',
        approved_at: Timestamp.now(),
        totalEarnings: 0,
        totalClicks: 0
      });
    });

    // Delete request
    await updateDoc(requestRef, { status: 'approved' });

    alert('✅ Member approved!');
    closeApproveModal();
    await loadMembers();
  } catch (error) {
    console.error('❌ Error approving member:', error);
    alert('Error approving member');
  }
}

/**
 * Reject member
 */
async function rejectMember(requestId, email) {
  if (!confirm(`Reject ${email}?`)) return;

  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });

    alert('✅ Member rejected');
    await loadMembers();
  } catch (error) {
    console.error('❌ Error rejecting member:', error);
  }
}

/**
 * Open mark paid modal
 */
function openMarkPaidModal(paymentId, email, amount) {
  currentPaymentRequest = paymentId;
  document.getElementById('paidMemberEmail').textContent = email;
  document.getElementById('paidAmount').textContent = `$${amount.toFixed(2)}`;
  document.getElementById('paidNotes').value = '';
  document.getElementById('markPaidModal').classList.add('active');
}

/**
 * Close mark paid modal
 */
function closeMarkPaidModal() {
  document.getElementById('markPaidModal').classList.remove('active');
}

/**
 * Submit mark paid
 */
async function submitMarkPaid() {
  try {
    if (!currentPaymentRequest) return;

    const paymentRef = doc(db, 'payments', currentPaymentRequest);

    await updateDoc(paymentRef, {
      status: 'paid',
      paidAt: Timestamp.now(),
      adminNotes: document.getElementById('paidNotes').value
    });

    alert('✅ Payment marked as paid!');
    closeMarkPaidModal();
    await loadPayments();
  } catch (error) {
    console.error('❌ Error marking payment:', error);
    alert('Error marking payment');
  }
}

/**
 * Reject payment
 */
async function rejectPayment(paymentId) {
  if (!confirm('Reject this payment request?')) return;

  try {
    const paymentRef = doc(db, 'payments', paymentId);
    await updateDoc(paymentRef, { status: 'rejected' });

    alert('✅ Payment rejected');
    await loadPayments();
  } catch (error) {
    console.error('❌ Error rejecting payment:', error);
  }
}

/**
 * Test web scraper
 */
async function testWebScraper() {
  try {
    const response = await fetch('http://localhost:5000/api/jobs/test/web_scraper', {
      method: 'POST'
    });
    const data = await response.json();
    alert('✅ Web Scraper test started!\n' + JSON.stringify(data, null, 2));
  } catch (error) {
    alert('❌ Error testing web scraper: ' + error.message);
  }
}

/**
 * Test category counter
 */
async function testCategoryCounter() {
  try {
    const response = await fetch('http://localhost:5000/api/jobs/test/category_counter', {
      method: 'POST'
    });
    const data = await response.json();
    alert('✅ Category Counter test started!\n' + JSON.stringify(data, null, 2));
  } catch (error) {
    alert('❌ Error testing category counter: ' + error.message);
  }
}

/**
 * Test GA fetcher
 */
async function testGAFetcher() {
  try {
    const response = await fetch('http://localhost:5000/api/jobs/test/ga_data_fetcher', {
      method: 'POST'
    });
    const data = await response.json();
    alert('✅ GA Data Fetcher test started!\n' + JSON.stringify(data, null, 2));
  } catch (error) {
    alert('❌ Error testing GA fetcher: ' + error.message);
  }
}

/**
 * View job logs
 */
function viewJobLogs() {
  switchTab('system');
  alert('📋 Scroll down to see recent job logs');
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initializeAdminDashboard);

// Export functions for HTML onclick handlers
window.switchTab = switchTab;
window.openApproveModal = openApproveModal;
window.closeApproveModal = closeApproveModal;
window.submitApproval = submitApproval;
window.rejectMember = rejectMember;
window.openMarkPaidModal = openMarkPaidModal;
window.closeMarkPaidModal = closeMarkPaidModal;
window.submitMarkPaid = submitMarkPaid;
window.rejectPayment = rejectPayment;
window.testWebScraper = testWebScraper;
window.testCategoryCounter = testCategoryCounter;
window.testGAFetcher = testGAFetcher;
window.viewJobLogs = viewJobLogs;
window.handleLogout = handleLogout;
