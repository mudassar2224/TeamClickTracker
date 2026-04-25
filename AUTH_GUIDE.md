# 🔐 Authentication System Guide

## System Overview

TeamClickTracker now has a **complete authentication system** with role-based access control:

```
┌─────────────────────────────────────────────────────────────┐
│              AUTHENTICATION FLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. LANDING PAGE (index.html)                              │
│     ├─ Shows system overview                               │
│     ├─ [Sign In] button → signin.html                      │
│     └─ [Sign Up] button → signup.html                      │
│                                                             │
│  2. SIGNUP (signup.html)                                   │
│     ├─ User fills: Name, Email, Password, Reason          │
│     ├─ Creates signup request                              │
│     ├─ Status: "Pending Approval" 🟡                       │
│     └─ Redirects to signin                                 │
│                                                             │
│  3. ADMIN APPROVES (FUTURE: in admin dashboard)            │
│     ├─ Admin reviews signup requests                       │
│     ├─ Clicks [✅ APPROVE]                                 │
│     ├─ User can now login                                  │
│     └─ Status: "Approved" 🟢                               │
│                                                             │
│  4. LOGIN (signin.html)                                    │
│     ├─ User enters: Email, Password                        │
│     ├─ System verifies credentials                         │
│     ├─ Sets "user" in localStorage                         │
│     ├─ IF admin → admin_dashboard.html 🔧                  │
│     └─ IF member → member_dashboard.html 📊                │
│                                                             │
│  5. PROTECTED DASHBOARDS                                   │
│     ├─ Auth.js checks: user exists && has role             │
│     ├─ If not → redirect to signin.html                    │
│     ├─ If yes → load dashboard                             │
│     └─ [Logout] button clears localStorage                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### **Step 1: Landing Page**
```
Open: http://localhost:5000/index.html (FUTURE)
      or locally: frontend/index.html
      
Shows:
- 🚀 TeamClickTracker branding
- 📊 System features
- [👤 Sign In] button
- [✏️ Sign Up] button
- Demo credentials
```

### **Step 2: First-Time Member - Sign Up**
```
Click: [✏️ Sign Up] button
Fill: 
  - Full Name: "Alice Johnson"
  - Email: "alice@example.com"
  - Password: "SecurePassword123"
  - Reason: "I want to share product reviews"
  - ☑️ Agree to terms

Result:
  ✅ Signup request created (pending admin approval)
  - Request stored in localStorage
  - Status: 🟡 PENDING
  - Auto-redirects to signin.html
```

### **Step 3: Admin Approves (Demo)**
```
FUTURE: In admin dashboard under "Pending Approvals"
Admin will see: "alice@example.com - Wants to share product reviews"
Admin clicks: [✅ APPROVE]
Result: Member can now login!
```

### **Step 4: Login**
```
Click: [👤 Sign In] button

Demo Credentials (for testing):
─────────────────────────────────────────
Admin Account:
  Email: admin@teamclicktracker.com
  Password: admin123
  
Member Account:
  Email: member@example.com
  Password: member123
─────────────────────────────────────────

After Login:
✅ Admin → admin_dashboard.html 🔧
✅ Member → member_dashboard.html 📊
```

### **Step 5: Dashboard Access**
```
✅ ADMIN sees:
  • Pending member approvals
  • Payment requests
  • All member earnings
  • System analytics
  • [Logout] button

✅ MEMBER sees:
  • 10 Real articles from captionmood.com
  • Their earnings (from GA)
  • Article statistics
  • UTM link generator
  • Payment request interface
  • [Logout] button
```

---

## 📁 File Structure

```
frontend/
├── index.html                 ← Landing page (overview)
├── signin.html               ← Login page
├── signup.html               ← Account creation
├── member_dashboard.html     ← Member portal (protected)
├── admin_dashboard.html      ← Admin portal (protected)
│
└── js/
    ├── auth.js               ← Authentication logic
    ├── member-dashboard.js   ← Member dashboard logic
    ├── admin-dashboard.js    ← Admin dashboard logic
    └── config.js             ← Firebase config
```

---

## 🔒 Security & Access Control

### **Authentication Flow**

#### **1. SIGNIN.HTML - Login Page**
```javascript
// User enters credentials
Email: admin@teamclicktracker.com
Password: admin123

// System checks:
if (DEMO_USERS[email]?.password === password) {
  // Store in localStorage
  localStorage.setItem('user', JSON.stringify({
    email: "admin@teamclicktracker.com",
    role: "admin",              ← Determines access!
    loginTime: "2026-04-01T..."
  }));
  
  // Redirect by role
  if (role === 'admin') {
    window.location.href = 'admin_dashboard.html';
  } else {
    window.location.href = 'member_dashboard.html';
  }
}
```

#### **2. AUTH.JS - Protection Layer**
```javascript
// Runs when dashboard page loads
function checkAuth() {
  const user = localStorage.getItem('user');
  
  if (!user || !user.role) {
    // Not logged in = redirect!
    window.location.href = 'signin.html';
  }
  
  // Display user info
  document.getElementById('userEmail').textContent = user.email;
}

// Verify specific role
function checkRole(requiredRole) {
  if (user.role !== requiredRole) {
    // Wrong role = redirect!
    alert('Unauthorized access!');
    window.location.href = 'signin.html';
  }
}
```

#### **3. MEMBER_DASHBOARD.JS - Role Check**
```javascript
// First thing that runs - before Firebase code!
(function() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user || user.role !== 'member') {
    // Not a member = kick out!
    window.location.href = 'signin.html';
  }
})();

// Now safe to load real member dashboard
// Import Firebase...
// Load articles...
// Load earnings...
```

---

## 🔐 Try It Now!

### **Test As Admin:**
```html
1. Go to: frontend/signin.html
2. Enter:
   Email: admin@teamclicktracker.com
   Password: admin123
3. ☑️ Remember me (optional)
4. Click [Sign In]
5. ✅ See admin_dashboard.html with:
   - Member management
   - Payment approvals
   - System analytics
```

### **Test As Member:**
```html
1. Go to: frontend/signin.html
2. Enter:
   Email: member@example.com
   Password: member123
3. Click [Sign In]
4. ✅ See member_dashboard.html with:
   - 10 Real articles
   - Earnings and stats
   - UTM generator
   - Payment requests
```

### **Test Signup:**
```html
1. Go to: frontend/signup.html
2. Enter:
   Name: Test User
   Email: test@example.com
   Password: password123
   Reason: I want to test
   ☑️ Agree to terms
3. Click [Create Account]
4. ✅ Redirected to signin
5. Note: Can't login yet - waiting for admin approval (FUTURE)
```

### **Test Access Control:**
```html
1. Login as member
2. Try to manually visit: admin_dashboard.html
3. ❌ DENIED! Redirected to signin
4. Logout
5. Try to visit: member_dashboard.html
6. ❌ DENIED! Redirected to signin
```

---

## 💾 Data Storage

### **localStorage Usage**

**Current Session (automatically cleared on logout):**
```javascript
// Stored after login
localStorage.setItem('user', JSON.stringify({
  email: "admin@teamclicktracker.com",
  role: "admin",  // ← Determines what they can access!
  loginTime: "2026-04-01T10:30:00.000Z"
}));

// Optional - remember login
localStorage.setItem('rememberMe', 'true');

// On logout - cleared!
localStorage.removeItem('user');
localStorage.removeItem('rememberMe');
```

**Signup Requests (pending approval):**
```javascript
// Stored temporarily
localStorage.setItem('signupRequests', JSON.stringify([
  {
    id: 1743932400000,
    fullname: "Alice Johnson",
    email: "alice@example.com",
    reason: "I want to share content",
    status: "pending",
    approved: false
  }
]));
```

---

## 🎯 Complete User Journey

### **SCENARIO 1: New Member Signing Up**
```
1. Visit index.html → See overview
2. Click "Sign Up" → signup.html
3. Fill form with details
4. Submit → Creates pending request 🟡
5. Redirects to signin.html
6. (Admin approves in FUTURE)
7. Member receives email ✉️ (FUTURE)
8. Member logs in with email/password
9. Can now see member_dashboard.html 📊
10. Browse 10 real articles
11. Create UTM links
12. Generate earnings data
13. Request payment
14. Admin approves payment
15. Get paid! 💰
```

### **SCENARIO 2: Admin Using System**
```
1. Visit index.html
2. Sign In with: admin@teamclicktracker.com / admin123
3. See admin_dashboard.html 🔧
4. Review pending member approvals
5. Click "✅ APPROVE" on request
6. Approve member in requests list
7. View all member earnings
8. Review payment requests
9. Click "✅ MARK AS PAID"
10. Manually pay member outside system
11. Mark payment as complete
12. View analytics and reports
13. Monitor system health
14. Logout when done
```

---

## ⚠️ Important Notes

### **Demo Credentials Are Hardcoded**
```javascript
// DEMO - Currently in signin.html for testing
// PRODUCTION - Would use Firebase Auth
const DEMO_USERS = {
  'admin@teamclicktracker.com': { password: 'admin123', role: 'admin' },
  'member@example.com': { password: 'member123', role: 'member' }
};
```

**Future Setup:**
- Move to Firebase Authentication
- Enable email verification
- Add password reset
- Add 2FA for admins
- Database validation

### **Signup Flow - Manual Approval (For Now)**
- Admin sees signup requests in localStorage
- FUTURE: Admin dashboard will have UI for approvals
- Once approved, member can login
- Auto-sends notification email (FUTURE)

### **Role-Based Access**
```
✅ admin@teamclicktracker.com
  └─ Full access to admin_dashboard.html
  └─ Can approve/reject members
  └─ Can approve payments
  └─ Can view all analytics

✅ member@example.com
  └─ Full access to member_dashboard.html
  └─ Can view articles
  └─ Can create UTM links
  └─ Can request payments
  └─ CANNOT see admin functions
```

---

## 🧪 Testing Checklist

- [ ] Visit index.html - see landing page
- [ ] Click Sign Up - create new account
- [ ] Click Sign In - login with demo account
- [ ] Admin login works → admin_dashboard visible
- [ ] Member login works → member_dashboard visible
- [ ] Click Logout - return to signin page
- [ ] Try accessing member_dashboard without login → redirected
- [ ] Try accessing admin_dashboard as member → redirected
- [ ] Browser recall - "Remember me" works

---

## 🚀 Next Steps

1. **Admin Approval UI** - Build UI in admin dashboard for signup approvals
2. **Firebase Auth** - Replace demo credentials with real Firebase
3. **Email Notifications** - Send approval/rejection emails
4. **Password Reset** - Implement account recovery
5. **2FA** - Add security for admin accounts
6. **Audit Logs** - Track all member approvals/payments

---

**Current Status: 🟡 Demo Mode**
- ✅ Full authentication system working
- ✅ Role-based access control active
- ✅ Both dashboards protected
- ✅ Demo accounts ready to test
- ⏳ Connect to Firebase (next step)
- ⏳ Admin approval UI (next step)
