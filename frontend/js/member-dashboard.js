/**
 * MEMBER DASHBOARD LOGIC
 * Handles articles, statistics, payments, and UTM link generation
 * Real-time data from Firebase Firestore & Google Analytics
 */

// Check authentication first
(function() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || user.role !== 'member') {
    console.log('Unauthorized member access');
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
  addDoc,
  updateDoc,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.5.0/firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.5.0/auth.js';
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentArticle = null;
let allArticles = [];
let allCategories = [];
let userEarnings = null;

/**
 * Initialize dashboard
 */
async function initializeDashboard() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    currentUser = user;
    document.getElementById('userEmail').textContent = user.email;

    // Load data
    await loadCategories();
    await loadArticles();
    await loadUserEarnings();
    await loadStatistics();
    await loadPayments();
  });
}

/**
 * Load categories for filter dropdown
 */
async function loadCategories() {
  try {
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);

    allCategories = [];

    const categorySelect = document.getElementById('categoryFilter');
    categorySelect.innerHTML = '<option value="">📁 All Categories</option>';

    snapshot.forEach((doc) => {
      const category = doc.data();
      allCategories.push({
        id: doc.id,
        name: doc.id,
        count: category.articleCount || 0
      });

      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${doc.id} (${category.articleCount || 0})`;
      categorySelect.appendChild(option);
    });

    console.log('✅ Loaded', allCategories.length, 'categories');
  } catch (error) {
    console.error('❌ Error loading categories:', error);
  }
}

/**
 * Load articles from Firestore
 */
async function loadArticles() {
  try {
    const articlesRef = collection(db, 'articles');
    const q = query(articlesRef, where('active', '==', true));
    const snapshot = await getDocs(q);

    allArticles = [];

    snapshot.forEach((doc) => {
      allArticles.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ Loaded', allArticles.length, 'articles');
    displayArticles(allArticles);
  } catch (error) {
    console.error('❌ Error loading articles:', error);
    document.getElementById('articlesList').innerHTML =
      '<div class="empty-state"><p>Error loading articles. Please refresh.</p></div>';
  }
}

/**
 * Display articles in grid
 */
function displayArticles(articles) {
  const container = document.getElementById('articlesList');
  const noArticles = document.getElementById('noArticles');

  if (articles.length === 0) {
    container.innerHTML = '';
    noArticles.style.display = 'block';
    return;
  }

  noArticles.style.display = 'none';
  container.innerHTML = articles
    .map((article) => `
      <div class="article-card">
        <div class="article-image">
          ${article.image ? `<img src="${article.image}" alt="${article.title}">` : 'No Image'}
        </div>
        <div class="article-content">
          <div class="article-category">${article.category || 'General'}</div>
          <div class="article-title">${article.title}</div>
          <div class="article-description">${article.description?.substring(0, 100) || 'No description'}...</div>
          <div class="article-actions">
            <button class="btn btn-primary" onclick="openUTMModal('${article.id}', '${article.title.replace(/'/g, "\\'")}')">
              🔗 Create Link
            </button>
            <button class="btn btn-secondary" onclick="window.open('${article.url}', '_blank')">
              📖 Read
            </button>
          </div>
        </div>
      </div>
    `)
    .join('');
}

/**
 * Filter articles by search and category
 */
function filterArticles() {
  const searchText = document.getElementById('searchBox').value.toLowerCase();
  const selectedCategory = document.getElementById('categoryFilter').value;

  const filtered = allArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchText) ||
      article.description?.toLowerCase().includes(searchText);

    const matchesCategory = !selectedCategory || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  displayArticles(filtered);
}

/**
 * Load user earnings from Firebase
 */
async function loadUserEarnings() {
  try {
    const earningsRef = doc(db, 'earnings', currentUser.uid);
    const snapshot = await getDoc(earningsRef);

    userEarnings = snapshot.data() || {
      totalEarnings: 0,
      totalClicks: 0,
      averageRPM: 0,
      totalRevenue: 0
    };

    // Update stats display
    document.getElementById('totalEarnings').textContent = userEarnings.totalEarnings.toFixed(2);
    document.getElementById('totalClicks').textContent = userEarnings.totalClicks;
    document.getElementById('averageRPM').textContent = userEarnings.averageRPM.toFixed(2);
    document.getElementById('balanceAmount').textContent = userEarnings.totalEarnings.toFixed(2);

    document.getElementById('lastUpdate').textContent =
      `Last updated: ${new Date().toLocaleTimeString()}`;

    console.log('✅ Loaded user earnings:', userEarnings);
  } catch (error) {
    console.error('❌ Error loading earnings:', error);
  }
}

/**
 * Load statistics for statistics tab
 */
async function loadStatistics() {
  try {
    const analyticsRef = collection(db, 'campaign_analytics');
    const q = query(analyticsRef, where('memberId', '==', currentUser.uid));
    const snapshot = await getDocs(q);

    const statsBody = document.getElementById('statsBody');

    if (snapshot.empty) {
      statsBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #999;">
            No campaigns yet. Create UTM links to start earning.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';

    snapshot.forEach((doc) => {
      const data = doc.data();
      const memberEarnings = data.revenue * 0.7; // 70% commission

      html += `
        <tr>
          <td>${data.campaignName}</td>
          <td>${data.clicks || 0}</td>
          <td>$${(data.revenue || 0).toFixed(2)}</td>
          <td>$${memberEarnings.toFixed(2)}</td>
        </tr>
      `;
    });

    statsBody.innerHTML = html;
    console.log('✅ Loaded statistics for', snapshot.size, 'campaigns');
  } catch (error) {
    console.error('❌ Error loading statistics:', error);
    document.getElementById('statsBody').innerHTML =
      '<tr><td colspan="4">Error loading statistics</td></tr>';
  }
}

/**
 * Load payment requests
 */
async function loadPayments() {
  try {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where('memberId', '==', currentUser.uid));
    const snapshot = await getDocs(q);

    const paymentsBody = document.getElementById('paymentsBody');

    if (snapshot.empty) {
      paymentsBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #999;">
            No payment requests yet
          </td>
        </tr>
      `;
      return;
    }

    let html = '';

    snapshot.forEach((doc) => {
      const data = doc.data();
      const status =
        data.status === 'paid'
          ? '✅ Paid'
          : data.status === 'pending'
            ? '⏳ Pending'
            : '❌ Rejected';

      html += `
        <tr>
          <td>$${data.amount.toFixed(2)}</td>
          <td>${status}</td>
          <td>${new Date(data.requestedAt?.toDate() || Date.now()).toLocaleDateString()}</td>
          <td>${data.paidAt ? new Date(data.paidAt.toDate()).toLocaleDateString() : '-'}</td>
        </tr>
      `;
    });

    paymentsBody.innerHTML = html;
    console.log('✅ Loaded', snapshot.size, 'payment requests');
  } catch (error) {
    console.error('❌ Error loading payments:', error);
    document.getElementById('paymentsBody').innerHTML =
      '<tr><td colspan="4">Error loading payments</td></tr>';
  }
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach((tab) => {
    tab.classList.remove('active');
  });

  // Deactivate all buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');

  // Activate button
  event.target.classList.add('active');
}

/**
 * Open UTM link generator modal
 */
function openUTMModal(articleId, articleTitle) {
  currentArticle = allArticles.find((a) => a.id === articleId);
  document.getElementById('selectedArticleTitle').textContent = articleTitle;
  document.getElementById('utmLinkDisplay').textContent = 'Link will appear once generated...';
  document.getElementById('campaignName').value = '';
  document.getElementById('campaignMedium').value = '';
  document.getElementById('utmModal').classList.add('active');
}

/**
 * Generate UTM link
 */
function generateUTMLink() {
  const campaignName = document.getElementById('campaignName').value.trim();
  const campaignMedium = document.getElementById('campaignMedium').value;

  if (!campaignName || !campaignMedium) {
    alert('Please fill in all fields');
    return;
  }

  if (!/^[a-z0-9\-]+$/.test(campaignName)) {
    alert('Campaign name must only contain lowercase letters, numbers, and hyphens');
    return;
  }

  const baseUrl = currentArticle.url || 'https://captionmood.com';
  const separator = baseUrl.includes('?') ? '&' : '?';

  const utmLink = `${baseUrl}${separator}utm_source=captionmood&utm_medium=${campaignMedium}&utm_campaign=${campaignName}`;

  document.getElementById('utmLinkDisplay').textContent = utmLink;

  // Save link to Firebase
  saveUTMLink(campaignName, campaignMedium, utmLink);
}

/**
 * Save UTM link to Firestore
 */
async function saveUTMLink(campaignName, medium, link) {
  try {
    const linksRef = collection(db, 'utm_links');
    const docRef = await addDoc(linksRef, {
      memberId: currentUser.uid,
      articleId: currentArticle.id,
      campaign_name: campaignName,
      medium,
      url: link,
      category: currentArticle.category || 'General',
      created_at: Timestamp.now(),
      active: true,
      clicks: 0
    });

    console.log('✅ Saved UTM link:', docRef.id);
  } catch (error) {
    console.error('❌ Error saving UTM link:', error);
  }
}

/**
 * Copy UTM link to clipboard
 */
function copyUTMLink() {
  const link = document.getElementById('utmLinkDisplay').textContent;

  if (link.includes('Link will appear')) {
    alert('Please generate a link first');
    return;
  }

  navigator.clipboard.writeText(link).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.textContent = '📋 Copy Link';
    }, 2000);
  });
}

/**
 * Close UTM modal
 */
function closeUTMModal() {
  document.getElementById('utmModal').classList.remove('active');
}

/**
 * Open payment modal
 */
function openPaymentModal() {
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentModal').classList.add('active');
}

/**
 * Submit payment request
 */
async function submitPaymentRequest() {
  const amount = parseFloat(document.getElementById('paymentAmount').value);

  if (!amount || amount < 10) {
    alert('Minimum payment is $10');
    return;
  }

  if (amount > (userEarnings?.totalEarnings || 0)) {
    alert('Insufficient balance');
    return;
  }

  try {
    const paymentsRef = collection(db, 'payments');
    await addDoc(paymentsRef, {
      memberId: currentUser.uid,
      amount,
      status: 'pending',
      requestedAt: Timestamp.now(),
      paidAt: null
    });

    alert('Payment request submitted! Admin will review shortly.');
    closePaymentModal();
    await loadPayments();
  } catch (error) {
    console.error('❌ Error submitting payment:', error);
    alert('Error submitting payment request');
  }
}

/**
 * Close payment modal
 */
function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('active');
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
window.addEventListener('DOMContentLoaded', initializeDashboard);

// Export functions for HTML onclick handlers
window.switchTab = switchTab;
window.openUTMModal = openUTMModal;
window.generateUTMLink = generateUTMLink;
window.copyUTMLink = copyUTMLink;
window.closeUTMModal = closeUTMModal;
window.openPaymentModal = openPaymentModal;
window.submitPaymentRequest = submitPaymentRequest;
window.closePaymentModal = closePaymentModal;
window.handleLogout = handleLogout;
window.filterArticles = filterArticles;
